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
      activity: true,
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
      activity: true,
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

export type BranchContainerStatus = "running" | "stopped";
export type BranchActivity = "idle" | "deploying" | "deleting" | "stopping";

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

/**
 * Moves an idle branch to `activity` and returns true, or returns false when
 * another job holds it (or the row is gone). It is one UPDATE ... WHERE
 * activity = 'idle', so two jobs can never both claim the same branch. The
 * push and delete workers run at the same time, and without this a delete,
 * a deploy, and the memory recycler could all run `docker compose` against
 * one branch at once.
 */
export async function claimBranchActivity(
  branchName: string,
  activity: Exclude<BranchActivity, "idle">
): Promise<boolean> {
  const { count } = await prisma.branch.updateMany({
    where: { name: branchName, activity: "idle" },
    data: { activity },
  });
  return count === 1;
}

/**
 * Waits for the branch to be idle, then claims it. A delete that arrives
 * while the same branch is building waits for the build instead of racing
 * it. Throws if the row disappears or the wait passes `timeoutMs`.
 */
export async function waitToClaimBranchActivity(
  branchName: string,
  activity: Exclude<BranchActivity, "idle">,
  timeoutMs = 20 * 60 * 1000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!(await claimBranchActivity(branchName, activity))) {
    if ((await findBranch(branchName)) == null) {
      throw new Error(`Branch "${branchName}" not found`);
    }
    if (Date.now() > deadline) {
      throw new Error(
        `Branch "${branchName}" stayed busy for ${timeoutMs / 60000} minutes`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

/**
 * Sets the branch back to idle, but only if `activity` is still what it is
 * doing, so one job's cleanup never clears another job's claim.
 */
export async function releaseBranchActivity(
  branchName: string,
  activity: Exclude<BranchActivity, "idle">
) {
  return prisma.branch.updateMany({
    where: { name: branchName, activity },
    data: { activity: "idle" },
  });
}

export async function resetAllBranchesToIdle() {
  return prisma.branch.updateMany({
    where: { activity: { not: "idle" } },
    data: { activity: "idle" },
  });
}

export async function findOldestRunningBranches(options?: {
  exclude?: string[];
}) {
  return prisma.branch.findMany({
    where: {
      containerStatus: "running",
      // Never recycle a branch that has work in flight — a redeploy
      // of a running branch should not be torn down mid-flight.
      activity: "idle",
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
      activity: true,
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
