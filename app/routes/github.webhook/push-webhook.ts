import { json } from "@remix-run/node";
import { z } from "zod";
import { PushJob } from "~/jobs/push-job.server";
import { upsertBranch } from "~/models/branch.server";
import type { Repository } from "~/models/repository.server";

type GithubPushEvent = z.infer<typeof GithubPushEventSchema>;

const DEFAULT_BRANCH_NAME = "master";

export async function processPushWebhook(
  webhook: GithubPushEvent,
  repository: Repository
) {
  if (!isBranchCommit()) return json({ message: "No action taken" });

  if (repository.deployOnlyOnPullRequest && !isDefaultBranch())
    return json({ message: "No action taken" });

  await deploy();
  return json({ message: `Started branch "${branchName()}" deployment` });

  async function deploy() {
    await upsertBranch({
      branchName: branchName(),
      cloneUrl: webhook.payload.repository.clone_url,
      dockerComposeDirectory: repository.dockerComposeDirectory,
      repositoryId: repository.id,
    });
    await PushJob.performLater({
      branch: branchName(),
    });
  }

  function isBranchCommit() {
    return (
      !webhook.payload.deleted && webhook.payload.ref.startsWith("refs/heads/")
    );
  }

  function branchName() {
    return webhook.payload.ref.replace("refs/heads/", "");
  }

  function isDefaultBranch() {
    return branchName() === DEFAULT_BRANCH_NAME;
  }
}

export const GithubPushEventSchema = z.object({
  event: z.literal("push"),
  payload: z.object({
    ref: z.string(),
    deleted: z.boolean(),
    pusher: z.object({
      name: z.string(),
    }),
    repository: z.object({
      name: z.string(),
      full_name: z.string(),
      clone_url: z.string(),
      owner: z.object({
        name: z.string(),
      }),
    }),
  }),
});
