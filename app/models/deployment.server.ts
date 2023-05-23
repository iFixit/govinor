import { PushJob, PushJobPayload } from "~/jobs/push-job.server";
import { JobProgressLogger, ProgressLog } from "~/lib/logger";

export interface DeploymentItem {
  id?: string;
  name: string;
  status: string;
  timestamp: string;
  attempts: number;
  failedReason: string;
  processedOn: string;
  finishedOn: string;
  returnValue?: any;
}

interface FindAllDeploymentsOptions {
  limit?: number;
}

export async function findAllDeployments(
  options: FindAllDeploymentsOptions
): Promise<DeploymentItem[]> {
  const rawJobs = await PushJob.findMany(options.limit ?? 100);
  const deployments = await Promise.all(
    rawJobs.map(async (job): Promise<DeploymentItem> => {
      const status = await job.getState();
      return {
        id: job.id,
        name: job.name,
        status,
        attempts: job.attemptsMade,
        failedReason: job.failedReason,
        timestamp: new Date(job.timestamp).toISOString(),
        processedOn: job.processedOn
          ? new Date(job.processedOn).toISOString()
          : "",
        finishedOn: job.finishedOn
          ? new Date(job.finishedOn).toISOString()
          : "",
        returnValue: job.returnvalue,
      };
    })
  );
  return deployments;
}

export interface Deployment {
  id?: string;
  name: string;
  data: PushJobPayload;
  status: string;
  timestamp: string;
  attempts: number;
  failedReason: string;
  processedOn: string;
  finishedOn: string;
  returnValue?: any;
  progress?: ProgressLog;
}

export async function findDeployment(id: string): Promise<Deployment | null> {
  const rawJob = await PushJob.find(id);
  if (rawJob == null) {
    return null;
  }
  let progress = JobProgressLogger.isProgressLog(rawJob.progress)
    ? rawJob.progress
    : undefined;

  return {
    id,
    name: rawJob.name,
    data: rawJob.data,
    status: await rawJob.getState(),
    timestamp: new Date(rawJob.timestamp).toISOString(),
    attempts: rawJob.attemptsMade,
    failedReason: rawJob.failedReason,
    processedOn: rawJob.processedOn
      ? new Date(rawJob.processedOn).toISOString()
      : "",
    finishedOn: rawJob.finishedOn
      ? new Date(rawJob.finishedOn).toISOString()
      : "",
    returnValue: rawJob.returnvalue,
    progress,
  };
}
