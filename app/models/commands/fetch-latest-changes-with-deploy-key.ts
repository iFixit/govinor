import { getRepoPath } from "~/helpers/deployment-helpers";
import { repositorySSHKeyPath } from "~/helpers/repository-helpers";
import { SpawnCommand } from "~/lib/shell.server";

interface FetchLatestChangesCommandOptions {
  branchName: string;
  repoOwner: string;
  repoName: string;
}

export function fetchLatestChangesWithKeyCommand(
  options: FetchLatestChangesCommandOptions
): SpawnCommand {
  const workingDirectory = getRepoPath(options.branchName);

  return {
    type: "spawn-command",
    command: "git",
    args: ["fetch", "origin"],
    env: {
      ...process.env,
      GIT_SSH_COMMAND: `ssh -i ${repositorySSHKeyPath(
        options.repoOwner,
        options.repoName
      )} -F /dev/null`,
    },
    workingDirectory,
  };
}
