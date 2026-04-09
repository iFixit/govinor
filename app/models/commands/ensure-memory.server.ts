import { DEPLOY_MEMORY_THRESHOLD_BYTES } from "~/../config/env.server";
import { Logger } from "~/lib/logger";
import {
  findOldestRunningBranches,
  updateBranchContainerStatus,
} from "~/models/branch.server";
import { getAvailableMemoryBytes } from "~/models/system.server";
import { stop } from "./deploy.server";

interface EnsureMemoryOptions {
  logger?: Logger;
  excludeBranches?: string[];
}

export async function ensureMemoryAvailable({
  logger,
  excludeBranches = [],
}: EnsureMemoryOptions): Promise<void> {
  let availableMemory = await getAvailableMemoryBytes();

  if (availableMemory >= DEPLOY_MEMORY_THRESHOLD_BYTES) {
    await logger?.info(
      `Memory OK: ${formatMB(availableMemory)} available, threshold is ${formatMB(DEPLOY_MEMORY_THRESHOLD_BYTES)}`
    );
    return;
  }

  await logger?.info(
    `Low memory: ${formatMB(availableMemory)} available, need ${formatMB(DEPLOY_MEMORY_THRESHOLD_BYTES)}. Starting recycling..`
  );

  const candidates = await findOldestRunningBranches({
    exclude: excludeBranches,
  });

  for (const candidate of candidates) {
    if (availableMemory >= DEPLOY_MEMORY_THRESHOLD_BYTES) {
      break;
    }

    await logger?.info(`Stopping branch "${candidate.name}" to free memory..`);
    await stop({ logger, branch: candidate });
    await updateBranchContainerStatus(candidate.name, "stopped");

    availableMemory = await getAvailableMemoryBytes();
    await logger?.info(
      `After stopping "${candidate.name}": ${formatMB(availableMemory)} available`
    );
  }

  if (availableMemory < DEPLOY_MEMORY_THRESHOLD_BYTES) {
    throw new Error(
      `Insufficient memory: ${formatMB(availableMemory)} available after stopping all eligible branches. ` +
        `Required: ${formatMB(DEPLOY_MEMORY_THRESHOLD_BYTES)}.`
    );
  }
}

function formatMB(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}
