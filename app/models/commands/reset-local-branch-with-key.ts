import { getRepoPath } from "~/helpers/deployment-helpers";
import { getGitCommandEnv } from "~/helpers/repository-helpers";
import { SpawnCommand } from "~/lib/shell.server";

interface ResetLocalBranchCommandOptions {
  branchName: string;
  repositoryId: string;
}

export function resetLocalBranchWithKeyCommand(
  options: ResetLocalBranchCommandOptions
): SpawnCommand {
  const repoDirectory = getRepoPath(options.branchName);

  return {
    type: "spawn-command",
    command: "git",
    args: ["reset", "--hard", `origin/${options.branchName}`],
    env: getGitCommandEnv(options.repositoryId),
    workingDirectory: repoDirectory,
  };
}
