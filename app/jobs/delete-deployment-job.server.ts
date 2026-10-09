import { Job } from "bullmq";
import { BaseJob } from "~/lib/jobs.server";
import { JobProgressLogger } from "~/lib/logger";
import {
  deleteBranch,
  findBranch,
  setBranchActivity,
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

  protected async perform(job: Job<DeleteDeploymentPayload>) {
    const branchName = job.data.branch;
    const logger = new JobProgressLogger(job);
    const branch = await findBranch(branchName);
    if (branch) {
      // The memory recycler only stops idle branches. Without this it could
      // stop the branch mid-delete, racing our `docker compose down`.
      await setBranchActivity(branchName, "deleting");
      try {
        await destroy({
          branch,
          logger,
        });
      } catch (error) {
        await setBranchActivity(branchName, "idle");
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
