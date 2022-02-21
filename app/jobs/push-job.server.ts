import { Job } from "bullmq";
import { DEPLOYMENT_DOCKER_COMPOSE_ROOT_DIRECTORY } from "~/../config/env.server";
import { BaseJob } from "~/lib/jobs.server";
import { JobProgressLogger } from "~/lib/logger";
import { deploy } from "~/models/deployment.server";

const queueName = "push";

export interface PushJobPayload {
  branch: string;
  cloneUrl: string;
}

export type PushJobResult = string;

export class PushJob extends BaseJob<PushJobPayload, PushJobResult> {
  readonly queueName = queueName;

  protected async perform(job: Job<PushJobPayload>) {
    const branch = job.data.branch;
    const cloneUrl = job.data.cloneUrl;
    const logger = new JobProgressLogger(job);
    await deploy({
      branch,
      cloneUrl,
      rootDirectory: DEPLOYMENT_DOCKER_COMPOSE_ROOT_DIRECTORY,
      logger,
    });
    return `Deployed branch "${branch}"`;
  }

  protected getJobName(payload: PushJobPayload): string {
    return `Deploy branch ${payload.branch}`;
  }
}
