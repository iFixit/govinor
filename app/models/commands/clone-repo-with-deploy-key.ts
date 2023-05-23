import { DEPLOYMENTS_DIRECTORY } from "~/../config/env.server";
import { repositorySSHKeyPath } from "~/helpers/repository-helpers";
import { SpawnCommand } from "~/lib/shell.server";

interface clonePrivateRepoCommandOptions {
  branchName: string;
  path: string;
  repoOwner: string;
  repoName: string;
}

export function cloneRepoWithDeployKey(
  options: clonePrivateRepoCommandOptions
): SpawnCommand {
  const cloneUrl = `git@github.com:${options.repoOwner}/${options.repoName}.git`;

  return {
    type: "spawn-command",
    command: "git",
    args: ["clone", "-b", options.branchName, cloneUrl, options.path],
    env: {
      ...process.env,
      GIT_SSH_COMMAND: `ssh -i ${repositorySSHKeyPath(
        options.repoOwner,
        options.repoName
      )} -F /dev/null`,
    },
    workingDirectory: DEPLOYMENTS_DIRECTORY,
  };
}
