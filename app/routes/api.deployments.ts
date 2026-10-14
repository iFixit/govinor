import { ActionFunctionArgs, json } from "@remix-run/node";
import { z } from "zod";
import { DEPLOY_DOMAIN } from "~/../config/env.server";
import {
  getBranchHandle,
  isReservedHandle,
} from "~/helpers/deployment-helpers";
import { PushJob } from "~/jobs/push-job.server";
import { requireApiToken } from "~/lib/api-auth.server";
import { upsertBranch } from "~/models/branch.server";
import { findRepository } from "~/models/repository.server";

const DeploymentRequestSchema = z.object({
  repository: z.string().min(1),
  branch: z
    .string()
    .min(1)
    .max(255)
    // Branch names reach git as arguments: refuse anything git could read
    // as an option or a range, and whitespace or control characters.
    .refine(
      (name) => !name.startsWith("-") && !name.includes("..") && !/[\s\x00-\x1f\x7f]/.test(name),
      "Invalid branch name"
    ),
  // The commit CI is testing. With it, every caller that asks for the same
  // branch and commit while a deploy is queued or running gets that deploy.
  sha: z.string().regex(/^[0-9a-f]{40}$/).optional(),
});

const IN_PROGRESS_STATES = ["waiting", "delayed", "active"];

/** POST /api/deployments: queue a deploy of a repository branch, for CI. */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ message: "Method not allowed" }, 405);
  }
  requireApiToken(request);

  const body = DeploymentRequestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!body.success) {
    return json({ message: "Invalid request", issues: body.error.issues }, 400);
  }
  const { branch } = body.data;
  const handle = getBranchHandle(branch);
  if (isReservedHandle(handle)) {
    return json({ message: `Branch "${branch}" maps to a reserved handle` }, 400);
  }

  const repository = await findRepository({ fullName: body.data.repository });
  if (repository == null) {
    return json({ message: "Repository not found" }, 404);
  }

  await upsertBranch({
    branchName: branch,
    cloneUrl: `https://github.com/${repository.fullName}.git`,
    dockerComposeDirectory: repository.dockerComposeDirectory,
    repositoryId: repository.id,
  });
  const job = await queueDeploy(branch, body.data.sha && `${handle}-${body.data.sha}`);

  return json(
    { jobId: job.id, branch, handle, url: `https://${handle}.${DEPLOY_DOMAIN}` },
    202
  );
}

/**
 * Two workflows test each push to a Strapi PR, and both ask for its deploy.
 * A job id made from the branch and commit gives them the same job while it
 * is queued or running. A finished one is replaced, so a re-run deploys
 * again (the preview may have been stopped since).
 */
async function queueDeploy(branch: string, jobId?: string) {
  if (jobId) {
    const existing = await PushJob.find(jobId);
    if (existing && IN_PROGRESS_STATES.includes(await existing.getState())) {
      return existing;
    }
    await existing?.remove();
  }
  return PushJob.performLater({ branch }, jobId ? { jobId } : undefined);
}
