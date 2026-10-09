import { Job } from "bullmq";
import { BaseJob } from "~/lib/jobs.server";
import { JobProgressLogger } from "~/lib/logger";
import {
  deleteBranch,
  findBranch,
  releaseBranchActivity,
  waitToClaimBranchActivity,
} from "~/models/branch.server";
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
    // No row, nothing to do: closing a PR and deleting its branch each
    // queue a delete, and the second finds the row already gone. Don't clean
    // up by a handle derived from the name: getBranchHandle maps
    // "feature/foo" and "feature-foo" to the same handle, so that would tear
    // down a different branch's live preview.
    return `No deployment found for branch "${branchName}"`;
  }

  protected getJobName(payload: DeleteDeploymentPayload): string {
    return `Remove deployment for branch "${payload.branch}"`;
  }
}
