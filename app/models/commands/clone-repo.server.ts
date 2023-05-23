import { DEPLOYMENTS_DIRECTORY } from "~/../config/env.server";
import { SpawnCommand } from "~/lib/shell.server";

interface CloneRepoCommandOptions {
  branchName: string;
  path: string;
  cloneUrl: string;
}

export function cloneRepoCommand(
  options: CloneRepoCommandOptions
): SpawnCommand {
  return {
    type: "spawn-command",
    command: "git",
    args: ["clone", "-b", options.branchName, options.cloneUrl, options.path],
    workingDirectory: DEPLOYMENTS_DIRECTORY,
  };
}
