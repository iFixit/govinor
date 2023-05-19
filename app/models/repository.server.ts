import { Prisma } from "@prisma/client";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import {
  createDirectory,
  deleteDirectory,
  repositorySSHKeyDirectory,
} from "~/helpers/fs-helpers";
import { prisma } from "~/lib/db.server";
import { ConsoleLogger } from "~/lib/logger";
import { Shell } from "~/lib/shell.server";
import { createSSHKeyCommand } from "./commands/createSSHKey.server";

const SSH_KEY_NAME = "ssh-key";

export type RepositoryListItem = NonNullable<
  Awaited<ReturnType<typeof findAllRepositories>>
>[number];

export async function findAllRepositories() {
  return prisma.repository.findMany({
    take: 20,
    select: {
      id: true,
      fullName: true,
      name: true,
    },
    orderBy: {
      fullName: Prisma.SortOrder.asc,
    },
  });
}

export type Repository = NonNullable<
  Awaited<ReturnType<typeof findRepository>>
>;

export async function findRepository(where: Prisma.RepositoryWhereUniqueInput) {
  const repo = await prisma.repository.findUnique({
    where,
  });
  if (repo == null) return null;
  const deployKey = await getRepoPublicKey(repo.owner, repo.name);
  return {
    ...repo,
    deployKey,
  };
}

async function getRepoPublicKey(
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

export const CreateRepositoryInputSchema = z.object({
  owner: z.string().trim().min(1, "owner must be present"),
  name: z.string().trim().min(1, "name must be present"),
  dockerComposeDirectory: z
    .string()
    .trim()
    .min(1, "docker compose directory must be present"),
});

export type CreateRepositoryInput = z.infer<typeof CreateRepositoryInputSchema>;

export async function createRepository(input: CreateRepositoryInput) {
  const repository = await prisma.repository.create({
    data: {
      owner: input.owner,
      name: input.name,
      fullName: generateFullName(input.owner, input.name),
      dockerComposeDirectory: input.dockerComposeDirectory,
    },
  });
  await createRepositorySSHKey(repository.owner, repository.name);
  const deployKey = await getRepoPublicKey(repository.owner, repository.name);
  return {
    ...repository,
    deployKey,
  };
}

async function createRepositorySSHKey(repoOwner: string, repoName: string) {
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

export const UpdateRepositoryInputSchema = z.object({
  owner: z.string().trim().min(1, "owner must be present"),
  name: z.string().trim().min(1, "name must be present"),
  dockerComposeDirectory: z
    .string()
    .trim()
    .min(1, "docker compose directory must be present"),
});

export type UpdateRepositoryInput = z.infer<typeof UpdateRepositoryInputSchema>;

export function updateRepository(id: string, input: UpdateRepositoryInput) {
  return prisma.repository.update({
    where: { id },
    data: {
      owner: input.owner,
      name: input.name,
      fullName: generateFullName(input.owner, input.name),
      dockerComposeDirectory: input.dockerComposeDirectory,
    },
  });
}

function generateFullName(owner: string, name: string) {
  return `${owner}/${name}`;
}

export async function deleteRepository(
  where: Prisma.RepositoryWhereUniqueInput
) {
  const deletedRepo = await prisma.repository.delete({
    where,
  });
  await deleteSSHKeys(deletedRepo.owner, deletedRepo.name);
  return deletedRepo;
}

async function deleteSSHKeys(repoOwner: string, repoName: string) {
  const keysDirectory = repositorySSHKeyDirectory(repoOwner, repoName);
  await deleteDirectory(keysDirectory);
}
