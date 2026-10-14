import { json } from "@remix-run/node";
import { z } from "zod";
import { DeleteDeploymentJob } from "~/jobs/delete-deployment-job.server";
import { findBranch } from "~/models/branch.server";
import { type Repository } from "~/models/repository.server";

type GithubPullRequestEvent = z.infer<typeof GithubPullRequestEventSchema>;

// Deploys come from iFixit's CI through POST /api/deployments, which decides
// which pull requests need a preview. This webhook only removes a preview
// once its pull request is closed.
export async function processPullRequestWebhook(
  webhook: GithubPullRequestEvent,
  repository: Repository
) {
  if (!repository.deployOnlyOnPullRequest)
    return json({
      status: "skipped",
      message: "No action taken",
      reason: "Repository deploys on every push, therefore deploying on pull request events is redundant",
      repository: repository.id
    });

  const branchName = webhook.payload.pull_request.head.ref;

  if (webhook.payload.action !== "closed") {
    return json({
      status: "skipped",
      message: "No action taken",
      reason: "Deployments are started by CI through /api/deployments",
      action: webhook.payload.action,
      pullRequest: webhook.payload.number,
      repository: repository.id
    });
  }

  if (!(await findBranch(branchName))) {
    return json({
      status: "skipped",
      message: "No action taken",
      reason: "Pull request was closed and has no deployment",
      pullRequest: webhook.payload.number,
      branch: branchName,
      repository: repository.id
    });
  }

  await DeleteDeploymentJob.performLater({ branch: branchName });
  return json({
    status: "success",
    message: `Deleting branch "${branchName}" deployment`,
    reason: "Pull request was closed",
    pullRequest: webhook.payload.number,
    branch: branchName,
    repository: repository.id
  });
}

const RepositorySchema = z.object({
  full_name: z.string(),
  clone_url: z.string(),
});

const PullRequestOpenedPayloadSchema = z.object({
  action: z.literal("opened"),
  number: z.number(),
  pull_request: z.object({
    url: z.string(),
    head: z.object({
      ref: z.string(), // The branch name
    }),
  }),
  repository: RepositorySchema,
});

const PullRequestClosedPayloadSchema = z.object({
  action: z.literal("closed"),
  number: z.number(),
  pull_request: z.object({
    url: z.string(),
    head: z.object({
      ref: z.string(), // The branch name
    }),
  }),
  repository: RepositorySchema,
});

const PullRequestSynchronizePayloadSchema = z.object({
  action: z.literal("synchronize"),
  number: z.number(),
  pull_request: z.object({
    url: z.string(),
    head: z.object({
      ref: z.string(), // The branch name
    }),
  }),
  repository: RepositorySchema,
});

const PullRequestPayloadSchema = z.union([
  PullRequestOpenedPayloadSchema,
  PullRequestClosedPayloadSchema,
  PullRequestSynchronizePayloadSchema,
]);

export const GithubPullRequestEventSchema = z.object({
  event: z.literal("pull_request"),
  payload: PullRequestPayloadSchema,
});
