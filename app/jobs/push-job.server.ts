import { Job } from "bullmq";
import { BaseJob } from "~/lib/jobs.server";
import { JobProgressLogger } from "~/lib/logger";
import { findBranch } from "~/models/branch.server";
import { deploy } from "~/models/commands/deploy.server";

const queueName = "push";

export interface PushJobPayload {
  branch: string;
}

export type PushJobResult = string;

export class PushJob extends BaseJob<PushJobPayload, PushJobResult> {
  readonly queueName = queueName;

  protected async perform(job: Job<PushJobPayload>) {
    const branchName = job.data.branch;
    const logger = new JobProgressLogger(job);
    const branch = await findBranch(branchName);
    if (branch == null) {
      throw new Error(`Branch "${branchName}" not found`);
    }
    await deploy({
      branch,
      logger,
    });
    return `Deployed branch "${branchName}"`;
  }

  protected getJobName(payload: PushJobPayload): string {
    return `Deploy branch "${payload.branch}"`;
  }
}
