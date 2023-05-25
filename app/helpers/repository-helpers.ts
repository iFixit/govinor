import fs from "fs/promises";
import path from "path";
import {
  createDirectory,
  deleteDirectory,
  storageDirectory,
} from "~/helpers/fs-helpers";
import { ConsoleLogger } from "~/lib/logger";
import { Shell } from "~/lib/shell.server";
import { createSSHKeyCommand } from "~/models/commands/create-ssh-key.server";

const SSH_KEY_NAME = "ssh-key";

export function sshKeysDirectory(): string {
  return path.join(storageDirectory(), "ssh-keys");
}

export function repositorySSHKeyDirectory(repositoryId: string): string {
  return path.join(sshKeysDirectory(), repositoryId);
}

export function repositorySSHKeyPath(repositoryId: string): string {
  return path.join(repositorySSHKeyDirectory(repositoryId), SSH_KEY_NAME);
}

export async function getRepositorySSHPublicKey(
  repositoryId: string
): Promise<string | null> {
  const keysDirectory = repositorySSHKeyDirectory(repositoryId);
  const publicKeyPath = path.join(keysDirectory, `${SSH_KEY_NAME}.pub`);

  try {
    const data = await fs.readFile(publicKeyPath, "utf-8");
    return data;
  } catch (err) {
    console.error(`Error reading key: ${err}`);
    return null;
  }
}

export async function createRepositorySSHKey(repositoryId: string) {
  const keyDir = repositorySSHKeyDirectory(repositoryId);

  await createDirectory(keyDir);

  const logger = new ConsoleLogger();
  const shell = new Shell(logger);

  await shell.run(
    createSSHKeyCommand({
      keyDir,
      keyName: SSH_KEY_NAME,
      keyComment: `github deploy key for ${repositoryId}`,
    })
  );
}

export async function deleteSSHKeys(repositoryId: string) {
  const keysDirectory = repositorySSHKeyDirectory(repositoryId);
  await deleteDirectory(keysDirectory);
}

export const getGitCommandEnv = (repositoryId: string) => {
  const repoSSHKeyPath = repositorySSHKeyPath(repositoryId);
  return {
    ...process.env,
    GIT_SSH_COMMAND: `ssh -i ${repoSSHKeyPath} -o UserKnownHostsFile=~/.ssh/known_hosts`,
  };
};
