import { Job } from "bullmq";
import { BaseJob } from "~/lib/jobs.server";
import { JobProgressLogger } from "~/lib/logger";
import { deleteBranch, findBranch } from "~/models/branch.server";
import { destroy } from "~/models/deployment.server";

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
      await destroy({
        branch,
        logger,
      });
      await deleteBranch(branchName);
      return `Removed deployment for branch "${branchName}"`;
    }
    throw new Error(`No deployment found for branch "${branchName}"`);
  }

  protected getJobName(payload: DeleteDeploymentPayload): string {
    return `Remove deployment for branch "${payload.branch}"`;
  }
}
