import { getRepoPath } from "~/helpers/deployment-helpers";
import { getGitCommandEnv } from "~/helpers/repository-helpers";
import { SpawnCommand } from "~/lib/shell.server";

interface FetchLatestChangesCommandOptions {
  branchName: string;
  repositoryId: string;
}

export function fetchLatestChangesWithKeyCommand(
  options: FetchLatestChangesCommandOptions
): SpawnCommand {
  const workingDirectory = getRepoPath(options.branchName);

  return {
    type: "spawn-command",
    command: "git",
    args: ["fetch", "origin"],
    env: getGitCommandEnv(options.repositoryId),
    workingDirectory,
  };
}
