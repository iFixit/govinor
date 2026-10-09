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
  // Retries come 1, then 2 minutes later.
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
      } catch (error) {
        await releaseBranchActivity(branchName, "deleting");
        throw error;
      }
      await deleteBranch(branchName);
      return `Removed deployment for branch "${branchName}"`;
    }
    throw new Error(`No deployment found for branch "${branchName}"`);
  }

  protected getJobName(payload: DeleteDeploymentPayload): string {
    return `Remove deployment for branch "${payload.branch}"`;
  }
}
