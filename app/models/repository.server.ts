import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  createRepositorySSHKey,
  deleteSSHKeys,
  getRepositorySSHPublicKey,
} from "~/helpers/repository-helpers";
import { prisma } from "~/lib/db.server";

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
  const deployKey = await getRepositorySSHPublicKey(repo.owner, repo.name);
  return {
    ...repo,
    deployKey,
  };
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
  const deployKey = await getRepositorySSHPublicKey(
    repository.owner,
    repository.name
  );
  return {
    ...repository,
    deployKey,
  };
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
