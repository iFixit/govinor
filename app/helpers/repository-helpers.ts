import fs from "fs/promises";
import path from "path";
import {
  createDirectory,
  deleteDirectory,
  storageDirectory,
} from "~/helpers/fs-helpers";
import { ConsoleLogger } from "~/lib/logger";
import { Shell } from "~/lib/shell.server";
import { createSSHKeyCommand } from "~/models/commands/createSSHKey.server";

const SSH_KEY_NAME = "ssh-key";

export function sshKeysDirectory(): string {
  return path.join(storageDirectory(), "ssh-keys");
}

export function repositorySSHKeyDirectory(owner: string, name: string): string {
  return path.join(sshKeysDirectory(), owner, name);
}

export function repositorySSHKeyPath(owner: string, name: string): string {
  return path.join(repositorySSHKeyDirectory(owner, name), SSH_KEY_NAME);
}

export async function getRepositorySSHPublicKey(
  repoOwner: string,
  repoName: string
): Promise<string | null> {
  const keysDirectory = repositorySSHKeyDirectory(repoOwner, repoName);
  const publicKeyPath = path.join(keysDirectory, `${SSH_KEY_NAME}.pub`);

  try {
    const data = await fs.readFile(publicKeyPath, "utf-8");
    return data;
  } catch (err) {
    console.error(`Error reading key: ${err}`);
    return null;
  }
}

export async function createRepositorySSHKey(
  repoOwner: string,
  repoName: string
) {
  const keyDir = repositorySSHKeyDirectory(repoOwner, repoName);

  await createDirectory(keyDir);

  const logger = new ConsoleLogger();
  const shell = new Shell(logger);

  await shell.run(
    createSSHKeyCommand({
      keyDir,
      keyName: SSH_KEY_NAME,
      keyComment: `github deploy key for ${repoOwner}/${repoName}`,
    })
  );
}

export async function deleteSSHKeys(repoOwner: string, repoName: string) {
  const keysDirectory = repositorySSHKeyDirectory(repoOwner, repoName);
  await deleteDirectory(keysDirectory);
}
