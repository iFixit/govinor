import { LoaderFunctionArgs, json } from "@remix-run/node";
import { DEPLOY_DOMAIN } from "~/../config/env.server";
import { getBranchHandle } from "~/helpers/deployment-helpers";
import { PushJob } from "~/jobs/push-job.server";
import { requireApiToken } from "~/lib/api-auth.server";

/**
 * GET /api/deployments/jobs/:id: the state of a deploy job queued through
 * POST /api/deployments. "completed" means `docker compose up` finished; the
 * preview may still be booting, so CI keeps checking the preview URL.
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  requireApiToken(request);

  const job = params.id ? await PushJob.find(params.id) : undefined;
  if (job == null) {
    return json({ message: "Job not found" }, 404);
  }
  const state = await job.getState();
  const handle = getBranchHandle(job.data.branch);

  return json({
    jobId: job.id,
    state,
    failedReason: state === "failed" ? job.failedReason : null,
    branch: job.data.branch,
    url: `https://${handle}.${DEPLOY_DOMAIN}`,
  });
}
