import { Job } from "bullmq";
import { BaseJob } from "~/lib/jobs.server";
import { JobProgressLogger } from "~/lib/logger";
import {
  findBranch,
  setBranchActivity,
  touchBranch,
} from "~/models/branch.server";
import { deploy } from "~/models/commands/deploy.server";
import { ensureMemoryAvailable } from "~/models/commands/ensure-memory.server";

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
    await touchBranch(branchName);
    const branch = await findBranch(branchName);
    if (branch == null) {
      throw new Error(`Branch "${branchName}" not found`);
    }
    await setBranchActivity(branchName, "deploying");
    try {
      await ensureMemoryAvailable({
        logger,
        excludeBranches: [branchName],
      });
      await deploy({
        branch,
        logger,
      });
      return `Deployed branch "${branchName}"`;
    } finally {
      // Clear activity regardless of outcome. containerStatus is
      // owned by deploy()/stop() and already reflects reality — a
      // failed redeploy of a live branch stays "running", a failed
      // fresh deploy stays "stopped".
      await setBranchActivity(branchName, "idle");
    }
  }

  protected getJobName(payload: PushJobPayload): string {
    return `Deploy branch "${payload.branch}"`;
  }
}
