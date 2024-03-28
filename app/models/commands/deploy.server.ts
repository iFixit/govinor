import fs from "fs/promises";
import getPort from "get-port";
import invariant from "tiny-invariant";
import {
  DEPLOYMENTS_DIRECTORY,
  DEPLOY_DOMAIN,
  STRAPI_ADMIN_BACKEND_URL,
  STRAPI_ADMIN_PASSWORD,
  STRAPI_TRANSFER_TOKEN_SALT,
} from "~/../config/env.server";
import { isPresent } from "~/helpers/application-helpers";
import { getRepoDeployPath } from "~/helpers/deployment-helpers";
import { Logger } from "~/lib/logger";
import { Shell, SpawnCommand } from "~/lib/shell.server";
import { Branch } from "../branch.server";
import { cloneRepoCommand } from "./clone-repo";
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
  invariant(branch.repository, "Branch must have a repository to deploy.");
  const info = createInfo(logger);
  const shell = new Shell(logger);
  try {
    await shell.run(dockerSystemPruneCommand());
  } catch (error) {
    // If pruning fails we don't want to stop the deployment process.
    if (error instanceof Error) {
      await info(error.message);
    } else {
      await info("Pruning failed with unknown error. Continuing..");
    }
  }
  const deploymentExists = await doesDeploymentWithHandleExist(branch.handle);
  if (deploymentExists) {
    await info(
      `Deployment for branch "${branch.name}" already exists. Pulling latest changes to update.`
    );
    await shell.run(
      fetchLatestChangesCommand({
        branchName: branch.name,
        repositoryId: branch.repository.id,
      })
    );
    await shell.run(
      resetLocalBranchCommand({
        branchName: branch.name,
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
    await shell.run(
      addStrapiEnvVariableCommand({
        variable: {
          name: "HOST_PORT",
          value: port,
        },
        branchHandle: branch.handle,
        rootDirectory: branch.dockerComposeDirectory,
      })
    );
  }
  if (isPresent(STRAPI_ADMIN_PASSWORD)) {
    await shell.run(
      addStrapiEnvVariableCommand({
        variable: {
          name: "ADMIN_PASS",
          value: STRAPI_ADMIN_PASSWORD,
        },
        branchHandle: branch.handle,
        rootDirectory: branch.dockerComposeDirectory,
      })
    );
  }
  if (isPresent(STRAPI_TRANSFER_TOKEN_SALT)) {
    await shell.run(
      addStrapiEnvVariableCommand({
        variable: {
          name: "TRANSFER_TOKEN_SALT",
          value: STRAPI_TRANSFER_TOKEN_SALT,
        },
        branchHandle: branch.handle,
        rootDirectory: branch.dockerComposeDirectory,
      })
    );
  }
  await shell.run(
    addStrapiEnvVariableCommand({
      variable: {
        name: "STRAPI_ADMIN_BACKEND_URL",
        value: STRAPI_ADMIN_BACKEND_URL,
      },
      branchHandle: branch.handle,
      rootDirectory: branch.dockerComposeDirectory,
    })
  );
  await info("Starting deployment..");
  await shell.run(
    dockerComposeUpCommand({
      branchHandle: branch.handle,
      rootDirectory: branch.dockerComposeDirectory,
    })
  );
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
  branch: Branch;
}

/**
 * Destroy a deployment
 * @param options Details about the deployment to destroy.
 */
export async function destroy({
  logger,
  branch,
}: DestroyOptions): Promise<void> {
  const info = createInfo(logger);
  const shell = new Shell(logger);
  const hasDomainRoute = await hasDomainRouteForHandle(branch.handle);
  if (hasDomainRoute) {
    await info("Removing domain from deployment..");
    await shell.run(
      removeCaddyRouteCommand({
        branchHandle: branch.handle,
      })
    );
  }
  const branchFolderExists = await hasBranchFolder(branch.handle);
  if (branchFolderExists) {
    await info("Stopping deployment..");
    try {
      await shell.run(
        dockerComposeDownCommand({
          branchHandle: branch.handle,
          rootDirectory: branch.dockerComposeDirectory,
        })
      );
    } catch (error) {
      await info("Docker compose down failed..");
      if (error instanceof Error) {
        await info(`Reason: ${error.message}`);
      }
    }
  }
  await info("Prune unused docker stuff..");
  try {
    await shell.run(dockerSystemPruneCommand());
  } catch (error) {
    // If pruning fails we don't want to stop the deployment process.
    if (error instanceof Error) {
      await info(error.message);
    } else {
      await info("Pruning failed with unknown error. Continuing..");
    }
  }
  if (branchFolderExists) {
    await info("Destroying deployment assets..");
    await shell.run(removeDeploymentFolder({ branchHandle: branch.handle }));
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

interface AddStrapiEnvVariableCommandOptions {
  variable: {
    name: string;
    value: string | number;
  };
  branchHandle: string;
  rootDirectory?: string;
}

function addStrapiEnvVariableCommand({
  variable,
  branchHandle,
  rootDirectory,
}: AddStrapiEnvVariableCommandOptions): SpawnCommand {
  const workingDirectory = getRepoDeployPath({
    rootDirectory,
    branchHandle,
  });
  return {
    type: "spawn-command",
    command: `echo "\n${variable.name}=${variable.value}" >> .env`,
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
    args: ["compose", "-p", branchHandle, "up", "--no-deps", "--build", "-d"],
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
    args: ["compose", "-p", branchHandle, "down"],
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
