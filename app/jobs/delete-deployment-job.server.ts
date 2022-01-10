import { Job } from "bullmq";
import { DEPLOYMENT_DOCKER_COMPOSE_ROOT_DIRECTORY } from "~/../config/env";
import { BaseJob } from "~/lib/jobs.server";
import { JobProgressLogger } from "~/lib/logger";
import { destroy, getDeploymentByBranch } from "~/models/deployment.server";

const queueName = "delete_deployment";

export interface DeleteDeploymentPayload {
  branch: string;
  sender: {
    login: string;
    avatar_url: string;
  };
}

export type DeleteDeploymentResult = string;

export class DeleteDeploymentJob extends BaseJob<
  DeleteDeploymentPayload,
  DeleteDeploymentResult
> {
  readonly queueName = queueName;

  protected async perform(job: Job<DeleteDeploymentPayload>) {
    const branch = job.data.branch;
    const logger = new JobProgressLogger(job);
    const deployment = await getDeploymentByBranch(branch);
    if (deployment) {
      await destroy({
        branch,
        rootDirectory: DEPLOYMENT_DOCKER_COMPOSE_ROOT_DIRECTORY,
        logger,
      });
      return `Removed deployment for branch "${branch}"`;
    }
    throw new Error(`No deployment found for branch "${branch}"`);
  }

  protected getJobName(payload: DeleteDeploymentPayload): string {
    return `Remove deployment for branch "${payload.branch}"`;
  }
}
