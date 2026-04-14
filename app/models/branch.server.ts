import { Prisma } from "@prisma/client";
import { getBranchHandle } from "~/helpers/deployment-helpers";
import { prisma } from "~/lib/db.server";

export type BranchSortField = "name" | "updatedAt";

export type BranchItem = NonNullable<
  Awaited<ReturnType<typeof findAllBranches>>
>[number];

export async function findAllBranches(sort: BranchSortField = "updatedAt") {
  const orderBy =
    sort === "updatedAt"
      ? { updatedAt: Prisma.SortOrder.desc }
      : { name: Prisma.SortOrder.asc };

  return prisma.branch.findMany({
    take: 250,
    select: {
      name: true,
      handle: true,
      cloneUrl: true,
      dockerComposeDirectory: true,
      containerStatus: true,
      createdAt: true,
      updatedAt: true,
      repository: {
        select: {
          id: true,
          fullName: true,
        },
      },
    },
    orderBy,
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
      containerStatus: true,
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

export async function touchBranch(branchName: string) {
  return prisma.branch.update({
    where: { name: branchName },
    data: { updatedAt: new Date() },
  });
}

export async function deleteBranch(branchName: string) {
  return prisma.branch.delete({
    where: {
      name: branchName,
    },
  });
}

export type BranchContainerStatus = "running" | "stopped" | "deploying";

export async function updateBranchContainerStatus(
  branchName: string,
  containerStatus: BranchContainerStatus
) {
  // updateMany is used here (instead of update) so the call silently
  // no-ops if the row was deleted concurrently — e.g. a delete-deployment
  // job racing with the post-stop status write in ensureMemoryAvailable.
  return prisma.branch.updateMany({
    where: { name: branchName },
    data: { containerStatus },
  });
}

export async function resetDeployingBranchesToStopped() {
  return prisma.branch.updateMany({
    where: { containerStatus: "deploying" },
    data: { containerStatus: "stopped" },
  });
}

export async function findOldestRunningBranches(options?: {
  exclude?: string[];
}) {
  return prisma.branch.findMany({
    where: {
      containerStatus: "running",
      ...(options?.exclude?.length
        ? { name: { notIn: options.exclude } }
        : {}),
    },
    select: {
      name: true,
      handle: true,
      cloneUrl: true,
      dockerComposeDirectory: true,
      containerStatus: true,
      repository: {
        select: {
          id: true,
          name: true,
          owner: true,
          fullName: true,
        },
      },
    },
    orderBy: { updatedAt: "asc" },
  });
}
