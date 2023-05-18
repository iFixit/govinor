import * as fs from "fs/promises";
import * as path from "path";

export function sshKeysDirectory(): string {
  return path.join(storageDirectory(), "ssh-keys");
}

export function repositorySSHKeyDirectory(owner: string, name: string): string {
  return path.join(sshKeysDirectory(), owner, name);
}

export function storageDirectory(): string {
  return path.join(process.cwd(), "storage");
}

export async function createDirectory(dirPath: string): Promise<void> {
  dirPath = path.resolve(dirPath); // Normalize the directory path and make sure it's absolute
  await fs.mkdir(dirPath, { recursive: true });
}

export async function deleteFile(filePath: string): Promise<void> {
  filePath = path.resolve(filePath); // Normalize the file path and make sure it's absolute

  await fs.unlink(filePath);
}

export async function deleteDirectory(dirPath: string): Promise<void> {
  dirPath = path.resolve(dirPath); // Normalize the directory path and make sure it's absolute

  await fs.rm(dirPath, { recursive: true, force: true });
}
