import { Prisma } from "@prisma/client";
import { getBranchHandle } from "~/helpers/deployment-helpers";
import { prisma } from "~/lib/db.server";

export type BranchItem = NonNullable<
  Awaited<ReturnType<typeof findAllBranches>>
>[number];

export async function findAllBranches() {
  return prisma.branch.findMany({
    take: 250,
    select: {
      name: true,
      handle: true,
      cloneUrl: true,
      dockerComposeDirectory: true,
      repository: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
    orderBy: {
      name: Prisma.SortOrder.asc,
    },
  });
}

export type Branch = NonNullable<Awaited<ReturnType<typeof findBranch>>>;

export async function findBranch(branchName: string) {
  return prisma.branch.findUnique({
    where: {
      name: branchName,
    },
    select: {
      name: true,
      handle: true,
      cloneUrl: true,
      dockerComposeDirectory: true,
      repository: {
        select: {
          id: true,
          name: true,
          owner: true,
          fullName: true,
        },
      },
    },
  });
}

type UpsertBranchInput = {
  branchName: string;
  cloneUrl: string;
  dockerComposeDirectory: string;
  repositoryId: string;
};

export async function upsertBranch(input: UpsertBranchInput) {
  const branchHandle = getBranchHandle(input.branchName);
  return prisma.branch.upsert({
    where: {
      name: input.branchName,
    },
    create: {
      name: input.branchName,
      handle: branchHandle,
      cloneUrl: input.cloneUrl,
      dockerComposeDirectory: input.dockerComposeDirectory,
      repositoryId: input.repositoryId,
    },
    update: {
      cloneUrl: input.cloneUrl,
      dockerComposeDirectory: input.dockerComposeDirectory,
      repositoryId: input.repositoryId,
    },
    select: {
      name: true,
      handle: true,
      cloneUrl: true,
      dockerComposeDirectory: true,
    },
  });
}

export async function deleteBranch(branchName: string) {
  return prisma.branch.delete({
    where: {
      name: branchName,
    },
  });
}
