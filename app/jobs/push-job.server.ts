import { Job } from "bullmq";
import { BaseJob } from "~/lib/jobs.server";
import { JobProgressLogger } from "~/lib/logger";
import {
  findBranch,
  touchBranch,
  updateBranchContainerStatus,
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
    await updateBranchContainerStatus(branchName, "deploying");
    try {
      await ensureMemoryAvailable({
        logger,
        excludeBranches: [branchName],
      });
      await deploy({
        branch,
        logger,
      });
    } catch (error) {
      // Any failure before deploy() marks the branch running leaves
      // the row stuck in "deploying". Caddy-rollback failures are
      // already flipped to "stopped" by stop(); this is the safety
      // net for everything else (clone, compose up, memory checks).
      await updateBranchContainerStatus(branchName, "stopped");
      throw error;
    }
    return `Deployed branch "${branchName}"`;
  }

  protected getJobName(payload: PushJobPayload): string {
    return `Deploy branch "${payload.branch}"`;
  }
}
