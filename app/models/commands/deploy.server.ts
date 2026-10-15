import fs from "fs/promises";
import getPort from "get-port";
import invariant from "tiny-invariant";
import { parse, stringify } from "envfile";
import path from "path";
import {
  DEEPL_API_KEY,
  DEPLOYMENTS_DIRECTORY,
  DEPLOY_DOMAIN,
  STRAPI_ADMIN_BACKEND_URL,
  STRAPI_ADMIN_PASSWORD,
  STRAPI_TRANSFER_TOKEN_SALT,
} from "~/../config/env.server";
import { isPresent } from "~/helpers/application-helpers";
import {
  getRepoDeployPath,
  isReservedHandle,
} from "~/helpers/deployment-helpers";
import { Logger } from "~/lib/logger";
import { Shell, SpawnCommand } from "~/lib/shell.server";
import {
  Branch,
  releaseBranchActivity,
  waitToClaimBranchActivity,
  updateBranchContainerStatus,
} from "../branch.server";
import { cloneRepoCommand } from "./clone-repo";
import { ensureMemoryAvailable } from "./ensure-memory.server";
import { fetchLatestChangesCommand } from "./fetch-latest-changes";
import { resetLocalBranchCommand } from "./reset-local-branch";

interface BaseOptions {
  logger?: Logger;
}

export interface Deployment {
  handle: string;
  url: string;
}

interface DeployOptions extends BaseOptions {
  branch: Branch;
}

/**
 * Idempotently deploy a new branch.
 * @param options Options for the deployment.
 */
export async function deploy({ logger, branch }: DeployOptions): Promise<void> {
  await waitToClaimBranchActivity(branch.name, "deploying");
  try {
    await ensureMemoryAvailable({
      logger,
      excludeBranches: [branch.name],
    });
    if (process.env.NODE_ENV !== "production") {
      await simulateDeploy({ logger, branch });
    } else {
      await runDeploy({ logger, branch });
    }
  } finally {
    // Clear activity regardless of outcome. containerStatus is
    // owned by runDeploy()/stop() and already reflects reality — a
    // failed redeploy of a live branch stays "running", a failed
    // fresh deploy stays "stopped" unless its cleanup `down` failed too.
    await releaseBranchActivity(branch.name, "deploying");
  }
}

async function runDeploy({ logger, branch }: DeployOptions): Promise<void> {
  invariant(branch.repository, "Branch must have a repository to deploy.");
  const info = createInfo(logger);
  const shell = new Shell(logger);
  // Disk cleanup before the build, so a full disk can still free space.
  // Only push jobs prune, one at a time, and none of these touches a
  // container with a compose label, so this can't race a `docker compose
  // down`. A failure here is not worth failing the deploy over.
  for (const command of [
    dockerBuildContainerPruneCommand(),
    dockerDanglingImagePruneCommand(),
    dockerBuilderPruneCommand(),
  ]) {
    try {
      await shell.run(command);
    } catch (error) {
      await info(
        error instanceof Error
          ? `Cleanup failed: ${error.message}. Continuing..`
          : "Cleanup failed. Continuing.."
      );
    }
  }
  const deploymentExists = await doesDeploymentWithHandleExist(branch.handle);
  if (deploymentExists) {
    await info(
      `Deployment for branch "${branch.name}" already exists. Pulling latest changes to update.`
    );
    await shell.run(
      fetchLatestChangesCommand({
        branchHandle: branch.handle,
        repositoryId: branch.repository.id,
      })
    );
    await shell.run(
      resetLocalBranchCommand({
        branchName: branch.name,
        branchHandle: branch.handle,
        repositoryId: branch.repository.id,
      })
    );
  } else {
    await info(`Creating deployment assets for branch "${branch.name}".`);
    await shell.run(
      cloneRepoCommand({
        branchName: branch.name,
        path: branch.handle,
        repository: branch.repository,
      })
    );
  }
  const envFileExists = await checkEnvFileExists(
    branch.handle,
    branch.dockerComposeDirectory
  );
  if (!envFileExists) {
    await shell.run(
      addEnvFileCommand({
        branchHandle: branch.handle,
        rootDirectory: branch.dockerComposeDirectory,
      })
    );
  }
  let port = await getDeploymentPort(
    branch.handle,
    branch.dockerComposeDirectory
  );
  if (port == null) {
    await info("No port found. Getting a new one..");
    port = await getPort();
    await upsertEnvVariable({
      variable: {
        name: "HOST_PORT",
        value: port,
      },
      branchHandle: branch.handle,
      rootDirectory: branch.dockerComposeDirectory,
    });
  }
  if (isPresent(STRAPI_ADMIN_PASSWORD)) {
    await upsertEnvVariable({
      variable: {
        name: "ADMIN_PASS",
        value: STRAPI_ADMIN_PASSWORD,
      },
      branchHandle: branch.handle,
      rootDirectory: branch.dockerComposeDirectory,
    });
  }
  if (isPresent(STRAPI_TRANSFER_TOKEN_SALT)) {
    await upsertEnvVariable({
      variable: {
        name: "TRANSFER_TOKEN_SALT",
        value: STRAPI_TRANSFER_TOKEN_SALT,
      },
      branchHandle: branch.handle,
      rootDirectory: branch.dockerComposeDirectory,
    });
  }
  if (isPresent(DEEPL_API_KEY)) {
    await upsertEnvVariable({
      variable: {
        name: "DEEPL_API_KEY",
        value: DEEPL_API_KEY,
      },
      branchHandle: branch.handle,
      rootDirectory: branch.dockerComposeDirectory,
    });
  }
  await upsertEnvVariable({
    variable: {
      name: "STRAPI_ADMIN_BACKEND_URL",
      value: STRAPI_ADMIN_BACKEND_URL,
    },
    branchHandle: branch.handle,
    rootDirectory: branch.dockerComposeDirectory,
  });
  if (branch.handle !== MASTER_HANDLE) {
    try {
      await shell.run(
        restoreMasterDatabaseCommand({
          branchHandle: branch.handle,
          rootDirectory: branch.dockerComposeDirectory,
        })
      );
    } catch (error) {
      // The copy is one transaction, so the database is still empty and
      // Strapi seeds it from scratch, as before the copy existed.
      await info(
        error instanceof Error
          ? `Copying master's database failed: ${error.message}. Strapi will seed from scratch..`
          : "Copying master's database failed. Strapi will seed from scratch.."
      );
    }
  }
  await info("Starting deployment..");
  try {
    await shell.run(
      dockerComposeUpCommand({
        branchHandle: branch.handle,
        rootDirectory: branch.dockerComposeDirectory,
      })
    );
  } catch (error) {
    // A fresh deploy that fails here leaves Postgres running under a row
    // marked "stopped" that nothing ever picks again: the copy of master's
    // database started it before the build, and a container that fails to
    // start (a port conflict, say) leaves it too. Remove what started. Only for a branch that wasn't running: on a redeploy a
    // failed build leaves the old containers serving, and `down` would kill
    // a working preview.
    if (branch.containerStatus !== "running") {
      await info("Deploy failed, removing any containers that started..");
      try {
        await shell.run(
          dockerComposeDownCommand({ branchHandle: branch.handle })
        );
      } catch (cleanupError) {
        await info(
          cleanupError instanceof Error
            ? `Cleanup failed: ${cleanupError.message}`
            : "Cleanup failed with unknown error"
        );
        // Containers may still be up: mark the row running so the recycler
        // and a later delete can find them, even though it has no route.
        // Findable matters more than the running-means-reachable rule here.
        try {
          await updateBranchContainerStatus(branch.name, "running");
        } catch (statusError) {
          // Keep the original deploy error as the job's failure reason.
          await info("Could not mark the branch running after cleanup failed");
        }
      }
    }
    throw error;
  }
  await waitForHealthCheck({
    port,
    info,
    shell,
    branchHandle: branch.handle,
    rootDirectory: branch.dockerComposeDirectory,
  });
  // Only mark running once the preview route is in place, so the
  // dashboard invariant holds: containerStatus === "running" ⟺ the
  // preview is actually reachable. If route assignment fails we tear
  // the containers back down so we don't leak memory on a branch the
  // UI can no longer show.
  try {
    const hasDomainRoute = await hasDomainRouteForHandle(branch.handle);
    if (!hasDomainRoute) {
      await info("Assigning domain to deployment..");
      await shell.run(
        addCaddyRouteCommand({
          port,
          branchHandle: branch.handle,
          rootDirectory: branch.dockerComposeDirectory,
        })
      );
    }
  } catch (error) {
    await info("Route assignment failed, rolling back containers..");
    // The containers are up, so the row says so until stop() has actually
    // removed them. stop() marks it stopped right after `down` succeeds,
    // so a failed `down` leaves it running, where the recycler and a later
    // delete can still find it.
    await updateBranchContainerStatus(branch.name, "running");
    try {
      await stop({ logger, branch });
    } catch (rollbackError) {
      await info(
        rollbackError instanceof Error
          ? `Rollback failed: ${rollbackError.message}`
          : "Rollback failed with unknown error"
      );
    }
    throw error;
  }
  await updateBranchContainerStatus(branch.name, "running");
}

async function simulateDeploy({
  logger,
  branch,
}: DeployOptions): Promise<void> {
  const info = createInfo(logger);
  await info(`[dev] Simulating deploy for "${branch.name}"..`);
  await info("[dev] Simulating build..");
  await sleep(2000);
  await info("[dev] Simulating container start..");
  await sleep(1000);
  await info("[dev] Deploy complete");
  await updateBranchContainerStatus(branch.name, "running");
}

interface WaitForHealthCheckOptions {
  port: number;
  info: (message: string) => Promise<void>;
  shell: Shell;
  branchHandle: string;
  rootDirectory?: string;
}

/**
 * Waits for Strapi's `/_health` to answer, so a branch marked running can
 * serve requests instead of 502s. Gives up after 3 minutes without failing
 * the deploy: a preview seeding from scratch takes about 13.
 */
async function waitForHealthCheck({
  port,
  info,
  shell,
  branchHandle,
  rootDirectory,
}: WaitForHealthCheckOptions): Promise<void> {
  await info("Waiting for the preview to answer its health check..");
  const deadline = Date.now() + 3 * 60 * 1000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://localhost:${port}/_health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        return;
      }
    } catch (error) { }
    await sleep(2000);
  }
  // Strapi that can't boot on master's data exits here, and so would
  // production. Its logs say why.
  await info(
    "The preview isn't answering after 3 minutes. It may still be seeding, or it failed to start. Its latest logs:"
  );
  try {
    await shell.run({
      type: "spawn-command",
      command: "docker",
      args: ["compose", "-p", composeProjectName(branchHandle), "logs", "--tail", "40"],
      workingDirectory: getRepoDeployPath({ branchHandle, rootDirectory }),
    });
  } catch (error) { }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createInfo(
  logger: Logger | undefined
): (message: string) => Promise<void> {
  return async (message) => {
    if (logger) {
      return logger.info(message);
    }
  };
}

interface DestroyOptions extends BaseOptions {
  branch: Pick<Branch, "name" | "handle">;
}

/**
 * Destroy a deployment
 * @param options Details about the deployment to destroy.
 */
export async function destroy({
  logger,
  branch,
}: DestroyOptions): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    await logger?.info(`[dev] Simulating destroy for "${branch.name}"`);
    return;
  }
  const info = createInfo(logger);
  const shell = new Shell(logger);
  await info("Stopping deployment..");
  // Let a failed `down` fail the job. Carrying on would delete the folder
  // and the branch row while containers are still running, and nothing
  // would ever clean them up. It runs even when the folder is already
  // gone, because `down -p` finds containers by their project label.
  await shell.run(dockerComposeDownCommand({ branchHandle: branch.handle }));
  // The route goes only after `down` succeeds. Removing it first meant a
  // failed `down` left a row still marked running with no preview link.
  const hasDomainRoute = await hasDomainRouteForHandle(branch.handle);
  if (hasDomainRoute) {
    await info("Removing domain from deployment..");
    await shell.run(
      removeCaddyRouteCommand({
        branchHandle: branch.handle,
      })
    );
  }
  // With BuildKit this only untags the image: its layers stay in the build
  // cache until the next deploy's `builder prune` trims it.
  const images = await findBranchImages(branch.handle);
  if (images.length > 0) {
    await shell.run(removeImagesCommand(images));
  }
  const branchFolderExists = await hasBranchFolder(branch.handle);
  if (branchFolderExists) {
    await info("Destroying deployment assets..");
    await shell.run(removeDeploymentFolder({ branchHandle: branch.handle }));
  }
}

interface StopOptions extends BaseOptions {
  branch: Pick<Branch, "name" | "handle" | "dockerComposeDirectory">;
}

/**
 * Remove a deployment's containers and database volume, keeping its files,
 * image, and DB record. Lighter than destroy — allows fast restart on next
 * deploy.
 */
export async function stop({ logger, branch }: StopOptions): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    const info = createInfo(logger);
    const shell = new Shell(logger);

    // Runs even when the folder is gone: `down -p` finds containers by
    // their project label, and skipping it would leave containers running
    // under a row marked "stopped", which the recycler never picks again.
    // `down --volumes`, not `stop`: a stopped branch keeps no containers
    // and no database volume (about 164 MB each on 2026-10-09), and the
    // next deploy reseeds it. The box-wide prune used to do this to every
    // stopped branch. The image stays, so the restart reuses its cache.
    await info(`Stopping containers for "${branch.name}"..`);
    await shell.run(dockerComposeDownCommand({ branchHandle: branch.handle }));
    // The containers are gone, so record it now: if a later step throws,
    // the row must not still claim a running preview.
    await updateBranchContainerStatus(branch.name, "stopped");
    // Route last, as in destroy(): a failed `down` keeps the route.
    const hasDomainRoute = await hasDomainRouteForHandle(branch.handle);
    if (hasDomainRoute) {
      await info("Removing domain route for stopped branch..");
      await shell.run(removeCaddyRouteCommand({ branchHandle: branch.handle }));
    }
    if (await hasBranchFolder(branch.handle)) {
      // Release the host port so it can't collide with another deployment
      // that grabs it while this branch is stopped. The next deploy will
      // allocate a fresh free port.
      await removeEnvVariable({
        name: "HOST_PORT",
        branchHandle: branch.handle,
        rootDirectory: branch.dockerComposeDirectory,
      });
    }
  } else {
    await logger?.info(`[dev] Simulating stop for "${branch.name}"`);
    await updateBranchContainerStatus(branch.name, "stopped");
  }
}

async function doesDeploymentWithHandleExist(handle: string): Promise<boolean> {
  const handles = await getBranchFolderNames();
  return handles.includes(handle);
}

async function getDeploymentPort(
  branchHandle: string,
  rootDirectory?: string
): Promise<number | undefined> {
  const deployPath = getRepoDeployPath({
    rootDirectory,
    branchHandle,
  });
  try {
    const result = await fs.readFile(`${deployPath}/.env`, "utf8");
    if (result == null) {
      return undefined;
    }
    const env = parse(result);
    const value = env["HOST_PORT"];
    if (value == null) {
      return undefined;
    }
    const port = parseInt(String(value), 10);
    if (!Number.isFinite(port)) {
      return undefined;
    }
    return port;
  } catch (error) { }
  return undefined;
}

async function upsertEnvVariable({
  variable,
  branchHandle,
  rootDirectory,
}: UpsertEnvVariableCommandOptions): Promise<void> {
  const workingDirectory = getRepoDeployPath({
    rootDirectory,
    branchHandle,
  });
  const envPath = `${workingDirectory}/.env`;

  let result: string | undefined;
  try {
    result = await fs.readFile(envPath, "utf8");
  } catch (error) { }

  const env = result ? parse(result) : {};
  env[variable.name] = String(variable.value);
  await fs.writeFile(envPath, stringify(env), "utf8");
}

interface RemoveEnvVariableOptions {
  name: string;
  branchHandle: string;
  rootDirectory?: string;
}

async function removeEnvVariable({
  name,
  branchHandle,
  rootDirectory,
}: RemoveEnvVariableOptions): Promise<void> {
  const workingDirectory = getRepoDeployPath({
    rootDirectory,
    branchHandle,
  });
  const envPath = `${workingDirectory}/.env`;

  let result: string | undefined;
  try {
    result = await fs.readFile(envPath, "utf8");
  } catch (error) {
    return;
  }

  const env = parse(result);
  if (!(name in env)) {
    return;
  }
  delete env[name];
  await fs.writeFile(envPath, stringify(env), "utf8");
}

async function hasDomainRouteForHandle(handle: string): Promise<boolean> {
  const response = await fetch(`http://localhost:2019/id/${handle}`);
  if (response.ok) {
    const json = await response.json();
    return json?.["@id"] === handle;
  }
  return false;
}

/**
 * Removes the stopped intermediate containers the legacy builder leaves
 * behind. Compose v2.2.2 doesn't pass `Remove` to the build (v2.2.3 does),
 * so each build step that runs leaves one, holding its layer. They have no
 * compose label, which is how this tells them apart from a branch's own
 * containers.
 */
function dockerBuildContainerPruneCommand(): SpawnCommand {
  return {
    type: "spawn-command",
    command: "docker",
    args: [
      "container",
      "prune",
      "-f",
      "--filter",
      "label!=com.docker.compose.project",
    ],
  };
}

/**
 * Removes images with no tag left, which each rebuild leaves behind when it
 * retags `<handle>_strapi`. Unlike `docker system prune -a`, it never touches
 * containers, volumes, or the layers tagged images still use as build cache.
 */
function dockerDanglingImagePruneCommand(): SpawnCommand {
  return {
    type: "spawn-command",
    command: "docker",
    args: ["image", "prune", "-f"],
  };
}

/**
 * BuildKit's cache is not garbage collected on Docker 20.10 unless daemon.json
 * turns it on, so it only grows. Layers a tagged image still uses are never
 * counted or removed here: the cap only covers layers no image uses any more,
 * from rebuilt or deleted branches once the dangling-image prune above has run,
 * plus each branch's build-context snapshot (a few MB; master's is ~180 MB).
 * Keeps the most recently used 5 GiB of those ("5GB" parses as binary units).
 * The build that follows can add to it, so it peaks above this until the next
 * prune.
 */
const BUILDKIT_CACHE_KEEP_STORAGE = "5GB";

function dockerBuilderPruneCommand(): SpawnCommand {
  return {
    type: "spawn-command",
    command: "docker",
    args: ["builder", "prune", "-f", "--keep-storage", BUILDKIT_CACHE_KEEP_STORAGE],
  };
}

async function checkEnvFileExists(
  branchHandle: string,
  rootDirectory?: string
): Promise<boolean> {
  const deployPath = getRepoDeployPath({
    rootDirectory,
    branchHandle,
  });
  try {
    await fs.access(`${deployPath}/.env`);
    return true;
  } catch (error) {
    return false;
  }
}

interface AddEnvFileCommandOptions {
  branchHandle: string;
  rootDirectory?: string;
}

function addEnvFileCommand({
  branchHandle,
  rootDirectory,
}: AddEnvFileCommandOptions): SpawnCommand {
  const workingDirectory = getRepoDeployPath({
    rootDirectory,
    branchHandle,
  });
  return {
    type: "spawn-command",
    command: "cp",
    args: [".env.example", ".env"],
    workingDirectory,
  };
}

interface UpsertEnvVariableCommandOptions {
  variable: {
    name: string;
    value: string | number;
  };
  branchHandle: string;
  rootDirectory?: string;
}

interface AddCaddyRouteCommandOptions {
  port: number;
  branchHandle: string;
  rootDirectory?: string;
}

function addCaddyRouteCommand({
  port,
  branchHandle,
}: AddCaddyRouteCommandOptions): SpawnCommand {
  return {
    type: "spawn-command",
    command: `curl localhost:2019/config/apps/http/servers/dashboard/routes -X POST -H "Content-Type: application/json" -d '{ "@id": "${branchHandle}", "handle": [ { "handler": "reverse_proxy", "transport": { "protocol": "http" }, "upstreams": [ { "dial": "localhost:${port}" } ] } ], "match": [ { "host": [ "${branchHandle}.${DEPLOY_DOMAIN}" ] } ] }'`,
    useShellSyntax: true,
  };
}

interface DockerComposeUpCommandOptions {
  branchHandle: string;
  rootDirectory?: string;
}

function dockerComposeUpCommand({
  branchHandle,
  rootDirectory,
}: DockerComposeUpCommandOptions): SpawnCommand {
  const workingDirectory = getRepoDeployPath({
    branchHandle,
    rootDirectory,
  });
  return {
    type: "spawn-command",
    command: "docker",
    args: ["compose", "-p", composeProjectName(branchHandle), "up", "--no-deps", "--build", "-d"],
    workingDirectory,
    // Compose v2.2.2 builds with BuildKit only when the docker CLI's
    // DOCKER_BUILDKIT is set. Plain progress keeps job logs line-based.
    env: { ...process.env, DOCKER_BUILDKIT: "1", BUILDKIT_PROGRESS: "plain" },
  };
}

// Master's preview is the source the others copy their database from.
const MASTER_HANDLE = "master";

interface RestoreMasterDatabaseCommandOptions {
  branchHandle: string;
  rootDirectory?: string;
}

function restoreMasterDatabaseCommand({
  branchHandle,
  rootDirectory,
}: RestoreMasterDatabaseCommandOptions): SpawnCommand {
  return {
    type: "spawn-command",
    command: path.join(process.cwd(), "scripts", "restore-master-db.sh"),
    args: [
      composeProjectName(branchHandle),
      MASTER_HANDLE,
      `https://${MASTER_HANDLE}.${DEPLOY_DOMAIN}`,
    ],
    workingDirectory: getRepoDeployPath({ branchHandle, rootDirectory }),
  };
}

interface RemoveCaddyRouteCommandOptions {
  branchHandle: string;
}

function removeCaddyRouteCommand({
  branchHandle,
}: RemoveCaddyRouteCommandOptions): SpawnCommand {
  return {
    type: "spawn-command",
    command: `curl -X DELETE localhost:2019/id/${branchHandle}`,
    useShellSyntax: true,
  };
}

function composeProjectName(branchHandle: string): string {
  // Last line of defense; upsertBranch already refuses these handles.
  if (isReservedHandle(branchHandle)) {
    throw new Error(
      `Branch handle "${branchHandle}" is Govinor's own Compose project; refusing to run docker compose for it`
    );
  }
  return branchHandle;
}

interface DockerComposeDownCommandOptions {
  branchHandle: string;
}

/**
 * With `-p`, Compose v2 rebuilds the project from container labels and never
 * reads the compose file, so this works from any directory, including after
 * the branch folder is gone. --volumes removes the branch's database volume,
 * which a box-wide `docker system prune` used to clean up.
 */
function dockerComposeDownCommand({
  branchHandle,
}: DockerComposeDownCommandOptions): SpawnCommand {
  return {
    type: "spawn-command",
    command: "docker",
    args: ["compose", "-p", composeProjectName(branchHandle), "down", "--volumes"],
    workingDirectory: DEPLOYMENTS_DIRECTORY,
  };
}

/**
 * The images Compose built for this branch (`<handle>_strapi`), by name.
 * They stay tagged after `down`, so `docker image prune` never removes them.
 * Matching on the project prefix covers whatever services the compose file
 * builds and never matches pulled images such as postgres:17. Handles never
 * contain `_`, so `<handle>_*` can't match another branch. The handle is a
 * DNS label ([a-z0-9-]), so it is safe in the shell string.
 */
async function findBranchImages(branchHandle: string): Promise<string[]> {
  const result = await new Shell().run({
    type: "command",
    command: `docker images --filter "reference=${branchHandle}_*" --format "{{.Repository}}:{{.Tag}}"`,
  });
  return (result?.output ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

// By name, not ID: `docker image rm <id>` refuses an ID tagged in more
// than one repository.
function removeImagesCommand(images: string[]): SpawnCommand {
  return {
    type: "spawn-command",
    command: "docker",
    args: ["image", "rm", ...images],
  };
}

interface RemoveDeploymentFolderOptions {
  branchHandle: string;
}

function removeDeploymentFolder({
  branchHandle,
}: RemoveDeploymentFolderOptions): SpawnCommand {
  return {
    type: "spawn-command",
    command: `rm -rf ${branchHandle}`,
    useShellSyntax: true,
    workingDirectory: DEPLOYMENTS_DIRECTORY,
  };
}

async function getBranchFolderNames(): Promise<string[]> {
  try {
    const names = await fs.readdir(DEPLOYMENTS_DIRECTORY);
    return names;
  } catch (error) {
    return [];
  }
}

async function getBranchFolderName(branchHandle: string) {
  const names = await getBranchFolderNames();
  return names.find((name) => name === branchHandle);
}

async function hasBranchFolder(branchHandle: string) {
  const name = await getBranchFolderName(branchHandle);
  return name != null;
}

