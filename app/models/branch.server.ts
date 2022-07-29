import { Prisma } from "@prisma/client";
import { getBranchHandle } from "~/helpers/deployment-helpers";
import { prisma } from "~/lib/db.server";

export async function findAllBranches() {
  return prisma.branch.findMany({
    take: 250,
    select: {
      name: true,
      handle: true,
      cloneUrl: true,
      dockerComposeDirectory: true,
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
    },
  });
}

type CreateBranchInput = {
  branchName: string;
  cloneUrl: string;
  dockerComposeDirectory: string;
};

export async function createBranch(input: CreateBranchInput) {
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
    },
    update: {
      cloneUrl: input.cloneUrl,
      dockerComposeDirectory: input.dockerComposeDirectory,
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