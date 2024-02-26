import { json } from "@remix-run/node";
import { z } from "zod";
import { DeleteDeploymentJob } from "~/jobs/delete-deployment-job.server";
import type { Repository } from "~/models/repository.server";

type GithubDeleteEvent = z.infer<typeof GithubDeleteEventSchema>;

export async function processDeleteWebhook(
  webhook: GithubDeleteEvent,
  repository: Repository
) {
  if (webhook.payload.ref_type !== "branch")
    return json({ message: "No action taken" });

  if (repository.deployOnlyOnPullRequest)
    return json({ message: "No action taken" });

  await DeleteDeploymentJob.performLater({ branch: webhook.payload.ref });

  return json({ message: `Deleting branch "${webhook.payload.ref}"` });
}

export const GithubDeleteEventSchema = z.object({
  event: z.literal("delete"),
  payload: z.object({
    ref: z.string(),
    ref_type: z.string(),
    repository: z.object({
      full_name: z.string(),
      clone_url: z.string(),
    }),
  }),
});
