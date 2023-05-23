import { DEPLOYMENTS_DIRECTORY } from "~/../config/env.server";
import { SpawnCommand } from "~/lib/shell.server";

interface CreateSSHKeyCommandOptions {
  keyDir: string;
  keyName: string;
  keyComment: string;
}

export function createSSHKeyCommand(
  options: CreateSSHKeyCommandOptions
): SpawnCommand {
  return {
    type: "spawn-command",
    command: "ssh-keygen",
    args: [
      "-t",
      "rsa",
      "-b",
      "4096",
      "-C",
      options.keyComment,
      "-f",
      `${options.keyDir}/${options.keyName}`,
      "-N",
      "",
    ],
    workingDirectory: DEPLOYMENTS_DIRECTORY,
  };
}
