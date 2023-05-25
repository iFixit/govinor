import { Repository } from "@prisma/client";
import { DEPLOYMENTS_DIRECTORY } from "~/../config/env.server";
import { getGitCommandEnv } from "~/helpers/repository-helpers";
import { SpawnCommand } from "~/lib/shell.server";

interface clonePrivateRepoCommandOptions {
  branchName: string;
  path: string;
  repository: {
    id: Repository["id"];
    fullName: Repository["fullName"];
  };
}

export function cloneRepoWithDeployKey(
  options: clonePrivateRepoCommandOptions
): SpawnCommand {
  const cloneUrl = `git@github.com:${options.repository.fullName}.git`;

  return {
    type: "spawn-command",
    command: "git",
    args: ["clone", "-b", options.branchName, cloneUrl, options.path],
    env: getGitCommandEnv(options.repository.id),
    workingDirectory: DEPLOYMENTS_DIRECTORY,
  };
}
