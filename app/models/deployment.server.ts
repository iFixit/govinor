import fs from "fs/promises";
import getPort from "get-port";
import { DEPLOYMENTS_DIRECTORY, DEPLOY_DOMAIN } from "~/../config/env";
import {
  getBranchHandle,
  getRepoDeployPath,
  getRepoPath,
} from "~/helpers/deployment-helpers";
import { Logger } from "~/lib/logger";
import { Shell, SpawnCommand } from "~/lib/shell.server";

interface BaseOptions {
  logger?: Logger;
}

export interface Deployment {
  handle: string;
  url: string;
}

/**
 * Get a deployment by its handle.
 */
export async function getDeploymentByHandle(
  handle: string
): Promise<Deployment | null> {
  const handles = await getDeploymentHandles();
  if (!handles.includes(handle)) {
    return null;
  }
  return { handle, url: `https://${handle}.${DEPLOY_DOMAIN}` };
}

/**
 * Get a deployment by its branch.
 */
export async function getDeploymentByBranch(
  branch: string
): Promise<Deployment | null> {
  const handle = getBranchHandle(branch);
  return getDeploymentByHandle(handle);
}

/**
 * Get all deployments.
 */
export async function getDeployments(): Promise<Deployment[]> {
  const handles = await getDeploymentHandles();
  return handles.map((handle) => {
    return {
      handle,
      url: `https://${handle}.${DEPLOY_DOMAIN}`,
    };
  });
}

async function getDeploymentHandles(): Promise<string[]> {
  try {
    const handles = await fs.readdir(DEPLOYMENTS_DIRECTORY);
    return handles;
  } catch (error) {
    return [];
  }
}

interface DeployOptions extends BaseOptions {
  branch: string;
  cloneUrl: string;
  // The path where the docker compose file is located within the repo.
  rootDirectory?: string;
}

/**
 * Idempotently deploy a new branch.
 * @param options Options for the deployment.
 */
export async function deploy(options: DeployOptions): Promise<void> {
  const info = createInfo(options.logger);
  const shell = new Shell(options.logger);
  const handle = getBranchHandle(options.branch);
  await shell.run(dockerSystemPruneCommand());
  const deploymentExists = await doesDeploymentWithHandleExist(options.branch);
  if (deploymentExists) {
    await info(
      `Deployment for branch "${options.branch}" already exists. Pulling latest changes to update.`
    );
    await shell.run(pullLatestChangesCommand({ branchHandle: handle }));
  } else {
    await info(`Creating deployment assets for branch "${options.branch}".`);
    await shell.run(
      cloneRepoCommand({
        branch: options.branch,
        cloneUrl: options.cloneUrl,
        path: handle,
      })
    );
  }
  let port = await getDeploymentPort(options.branch, options.rootDirectory);
  if (port == null) {
    await info("No port found. Getting a new one..");
    port = await getPort();
    await shell.run(
      addPortToEnvFileCommand({
        port,
        branchHandle: handle,
        rootDirectory: options.rootDirectory,
      })
    );
  }
  await info("Starting deployment..");
  await shell.run(
    dockerComposeUpCommand({
      branchHandle: handle,
      rootDirectory: options.rootDirectory,
    })
  );
  const hasDomainRoute = await hasDomainRouteForHandle(handle);
  if (!hasDomainRoute) {
    await info("Assigning domain to deployment..");
    await shell.run(
      addCaddyRouteCommand({
        port,
        branchHandle: handle,
        rootDirectory: options.rootDirectory,
      })
    );
  }
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
  branch: string;
  // The path where the docker compose file is located within the repo.
  rootDirectory?: string;
}

/**
 * Destroy a deployment
 * @param options Details about the deployment to destroy.
 */
export async function destroy(options: DestroyOptions): Promise<void> {
  const info = createInfo(options.logger);
  const shell = new Shell(options.logger);
  const handle = getBranchHandle(options.branch);
  const hasDomainRoute = await hasDomainRouteForHandle(handle);
  if (hasDomainRoute) {
    await info("Removing domain from deployment..");
    await shell.run(
      removeCaddyRouteCommand({
        branchHandle: handle,
      })
    );
  }
  await info("Stopping deployment..");
  await shell.run(
    dockerComposeDownCommand({
      branchHandle: handle,
      rootDirectory: options.rootDirectory,
    })
  );
  await info("Prune unused docker stuff..");
  await shell.run(dockerSystemPruneCommand());
  await info("Destroying deployment assets..");
  await shell.run(removeDeploymentFolder({ branchHandle: handle }));
}

async function doesDeploymentWithHandleExist(handle: string): Promise<boolean> {
  const handles = await getDeploymentHandles();
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
    const match = result.match(/HOST_PORT=(\d+)/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  } catch (error) {}
  return undefined;
}

async function hasDomainRouteForHandle(handle: string): Promise<boolean> {
  const response = await fetch(`http://localhost:2019/id/${handle}`);
  if (response.ok) {
    const json = await response.json();
    return json?.["@id"] === handle;
  }
  return false;
}

function dockerSystemPruneCommand(): SpawnCommand {
  return {
    type: "spawn-command",
    command: "docker",
    args: ["system", "prune", "-a", "--volumes", "-f"],
  };
}

interface CloneRepoCommandOptions {
  branch: string;
  path: string;
  cloneUrl: string;
}

function cloneRepoCommand(options: CloneRepoCommandOptions): SpawnCommand {
  return {
    type: "spawn-command",
    command: "git",
    args: ["clone", "-b", options.branch, options.cloneUrl, options.path],
    workingDirectory: DEPLOYMENTS_DIRECTORY,
  };
}

interface AddPortToEnvFileCommandOptions {
  port: number;
  branchHandle: string;
  rootDirectory?: string;
}

function addPortToEnvFileCommand({
  port,
  branchHandle,
  rootDirectory,
}: AddPortToEnvFileCommandOptions): SpawnCommand {
  const workingDirectory = getRepoDeployPath({
    rootDirectory,
    branchHandle,
  });
  return {
    type: "spawn-command",
    command: `echo "HOST_PORT=${port}" >> .env`,
    useShellSyntax: true,
    workingDirectory,
  };
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

interface PullLatestChangesCommandOptions {
  branchHandle: string;
}

function pullLatestChangesCommand({
  branchHandle,
}: PullLatestChangesCommandOptions): SpawnCommand {
  const workingDirectory = getRepoPath(branchHandle);
  return {
    type: "spawn-command",
    command: "git",
    args: ["pull"],
    workingDirectory,
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
    args: ["compose", "up", "--no-deps", "--build", "-d"],
    workingDirectory,
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

interface DockerComposeDownCommandOptions {
  branchHandle: string;
  rootDirectory?: string;
}

function dockerComposeDownCommand({
  branchHandle,
  rootDirectory,
}: DockerComposeDownCommandOptions): SpawnCommand {
  const workingDirectory = getRepoDeployPath({
    branchHandle,
    rootDirectory,
  });
  return {
    type: "spawn-command",
    command: "docker",
    args: ["compose", "down"],
    workingDirectory,
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
