import { json } from "@remix-run/node";
import { z } from "zod";
import { DeleteDeploymentJob } from "~/jobs/delete-deployment-job.server";
import { PushJob } from "~/jobs/push-job.server";
import { findBranch, upsertBranch } from "~/models/branch.server";
import { findPullRequestFiles } from "~/models/pull-request.server";
import { type Repository } from "~/models/repository.server";

type GithubPullRequestEvent = z.infer<typeof GithubPullRequestEventSchema>;

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

  const [files, branch] = await findPullRequestData();
  const relevantChanges = hasChangesAffectingNextjsApp();

  if (!branch && !relevantChanges) {
    return json({
      status: "skipped",
      message: "No action taken",
      reason: "There isn't a built branch and there aren't any changes affecting Nextjs",
      filesChanged: files.map((file) => file.filename),
      pullRequest: webhook.payload.number,
      repository: repository.id
    });
  }

  switch (webhook.payload.action) {
    case "opened":
    case "synchronize": {
      await deploy();
      return json({
        status: "success",
        message: `Started branch "${branchName()}" deployment`,
        action: webhook.payload.action,
        pullRequest: webhook.payload.number,
        branch: branchName(),
        repository: repository.id
      });
    }
    case "closed": {
      await removeDeployment();
      return json({
        status: "success",
        message: `Deleting branch "${branchName()}" deployment`,
        reason: "Pull request was closed",
        pullRequest: webhook.payload.number,
        branch: branchName(),
        repository: repository.id
      });
    }
    default:
      return json({
        status: "skipped",
        message: "No action taken",
        reason: `Unhandled pull request action: ${webhook.payload.action}`,
        pullRequest: webhook.payload.number,
        repository: repository.id
      });
  }

  function findPullRequestData() {
    return Promise.all([
      findPullRequestFiles({
        repository,
        prNumber: webhook.payload.number,
      }),
      findBranch(branchName()),
    ]);
  }

  function hasChangesAffectingNextjsApp() {
    return files.some(
      (file) =>
        file.filename.startsWith("apps/") ||
        file.filename.startsWith("packages/")
    );
  }

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

  async function removeDeployment() {
    await DeleteDeploymentJob.performLater({
      branch: branchName(),
    });
  }

  function branchName() {
    return webhook.payload.pull_request.head.ref;
  }
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
