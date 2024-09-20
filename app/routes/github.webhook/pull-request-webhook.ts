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
    return json({ message: "No action taken" });

  const [files, branch] = await findPullRequestData();

  if (!branch && !hasChangesAffectingNextjsApp())
    return json({ message: "No action taken" });

  switch (webhook.payload.action) {
    case "opened":
    case "synchronize": {
      await deploy();
      return json({ message: `Started branch "${branchName()}" deployment` });
    }
    case "closed": {
      await removeDeployment();
      return json({ message: `Deleting branch "${branchName()}"` });
    }
    default:
      return json({ message: "No action taken" });
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
        file.filename.startsWith("packages/") ||
        file.filename === ".github/workflows/nextjs-deploy-nextjs.yml"
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
