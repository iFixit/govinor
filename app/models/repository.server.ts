import { Prisma } from "@prisma/client";
import { prisma } from "~/lib/db.server";

export async function findAllRepositories() {
  return prisma.repository.findMany({
    take: 20,
    orderBy: {
      fullName: Prisma.SortOrder.asc,
    },
  });
}

export type Repository = NonNullable<
  Awaited<ReturnType<typeof findRepository>>
>;

export async function findRepository(where: Prisma.RepositoryWhereUniqueInput) {
  return prisma.repository.findUnique({
    where,
  });
}

type CreateRepositoryInput = {
  owner: string;
  name: string;
  dockerComposeDirectory: string;
};

export async function createRepository(input: CreateRepositoryInput) {
  return prisma.repository.create({
    data: {
      owner: input.owner,
      name: input.name,
      fullName: generateFullName(input.owner, input.name),
      dockerComposeDirectory: input.dockerComposeDirectory,
    },
  });
}

type UpdateRepositoryInput = {
  id: string;
  owner: string;
  name: string;
  dockerComposeDirectory: string;
};

export function updateRepository(input: UpdateRepositoryInput) {
  return prisma.repository.update({
    where: {
      id: input.id,
    },
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
  return prisma.repository.delete({
    where,
  });
}
