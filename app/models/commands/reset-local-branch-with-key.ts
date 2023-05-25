import { getRepoPath } from "~/helpers/deployment-helpers";
import { repositorySSHKeyPath } from "~/helpers/repository-helpers";
import { SpawnCommand } from "~/lib/shell.server";

interface ResetLocalBranchCommandOptions {
  branchName: string;
  repositoryId: string;
}

export function resetLocalBranchWithKeyCommand(
  options: ResetLocalBranchCommandOptions
): SpawnCommand {
  const repoDirectory = getRepoPath(options.branchName);
  const repoSSHKeyPath = repositorySSHKeyPath(options.repositoryId);

  return {
    type: "spawn-command",
    command: "git",
    args: ["reset", "--hard", `origin/${options.branchName}`],
    env: {
      ...process.env,
      GIT_SSH_COMMAND: `ssh -i ${repoSSHKeyPath} -F /dev/null`,
    },
    workingDirectory: repoDirectory,
  };
}
