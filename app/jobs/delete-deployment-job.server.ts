import { Job } from "bullmq";
import { BaseJob } from "~/lib/jobs.server";
import { JobProgressLogger } from "~/lib/logger";
import {
  deleteBranch,
  findBranch,
  releaseBranchActivity,
  waitToClaimBranchActivity,
} from "~/models/branch.server";
import {
  getBranchHandle,
  isReservedHandle,
} from "~/helpers/deployment-helpers";
import { destroy } from "~/models/commands/deploy.server";

const queueName = "delete_deployment";

export interface DeleteDeploymentPayload {
  branch: string;
}

export type DeleteDeploymentResult = string;

export class DeleteDeploymentJob extends BaseJob<
  DeleteDeploymentPayload,
  DeleteDeploymentResult
> {
  readonly queueName = queueName;
  // A failed delete keeps the folder and row, so trying again is safe.
  // BullMQ's exponential backoff is (2^attemptsMade - 1) * delay, counted
  // after the failure, so retries come 1, then 3 minutes after a failure.
  protected readonly jobOptions = {
    attempts: 3,
    backoff: { type: "exponential", delay: 60 * 1000 },
  };

  protected async perform(job: Job<DeleteDeploymentPayload>) {
    const branchName = job.data.branch;
    const logger = new JobProgressLogger(job);
    const branch = await findBranch(branchName);
    if (branch) {
      // Wait for any deploy of this branch to finish, and keep the memory
      // recycler away while our `docker compose down` runs.
      await waitToClaimBranchActivity(branchName, "deleting");
      try {
        await destroy({
          branch,
          logger,
        });
        // Inside the try: if this throws, the claim must be released too,
        // or every retry and push for the branch waits 20 minutes and fails.
        await deleteBranch(branchName);
      } catch (error) {
        await releaseBranchActivity(branchName, "deleting");
        throw error;
      }
      return `Removed deployment for branch "${branchName}"`;
    }
    // No row: either the delete already ran (closing a PR and deleting its
    // branch each queue one), or an older Govinor dropped the row and left
    // containers behind. destroy() works from the handle alone and every
    // step is a no-op when nothing is there, so clean up whatever is left.
    const handle = getBranchHandle(branchName);
    if (isReservedHandle(handle)) {
      return `Branch "${branchName}" maps to a reserved handle; nothing to delete`;
    }
    await destroy({ branch: { name: branchName, handle }, logger });
    return `No deployment row for branch "${branchName}"; removed anything left under its handle`;
  }

  protected getJobName(payload: DeleteDeploymentPayload): string {
    return `Remove deployment for branch "${payload.branch}"`;
  }
}
