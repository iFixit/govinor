import { json } from "@remix-run/node";
import { z } from "zod";
import { getRepoDirectory } from "~/helpers/deployment-helpers";
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
  const relevantChanges = hasChangesInDeployedDirectory();

  if (!branch && !relevantChanges) {
    return json({
      status: "skipped",
      message: "No action taken",
      reason: `There isn't a built branch and there aren't any changes in ${repository.dockerComposeDirectory}`,
      filesChanged: files.map((file) => file.filename),
      pullRequest: webhook.payload.number,
      repository: repository.id
    });
  }

  switch (webhook.payload.action) {
    case "opened":
    case "synchronize": {
      // A branch deployed under the old rule keeps its preview until the
      // pull request closes, but isn't redeployed for unrelated pushes.
      if (!relevantChanges) {
        return json({
          status: "skipped",
          message: "No action taken",
          reason: `No changes in ${repository.dockerComposeDirectory}`,
          pullRequest: webhook.payload.number,
          branch: branchName(),
          repository: repository.id
        });
      }
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
      // The payload type here is "never". We're casting it to any so we're able to log some properties for debug purposes
      const unknownPayload = webhook.payload as any;
      return json({
        status: "skipped",
        message: "No action taken",
        reason: `Unhandled pull request action: ${unknownPayload?.action}`,
        pullRequest: unknownPayload?.number,
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

  // Only pull requests that change what Govinor deploys get a preview.
  // dockerComposeDirectory is the Repository column (prisma/schema.prisma)
  // set under "Docker compose directory" on the repository's edit page, and
  // the same directory deploy.server.ts runs `docker compose` in. For
  // iFixit/ifixit it's `apps/strapi`. iFixit's wait-for-strapi workflow
  // checks the same prefix and points every other preview at master's
  // Strapi. The prefix ends in "/", so apps/strapi-tools/ doesn't match, and
  // a directory at the repo root matches every file.
  function hasChangesInDeployedDirectory() {
    const directory = getRepoDirectory(repository.dockerComposeDirectory);
    const prefix = directory === "" ? "" : `${directory}/`;
    return files.some((file) => file.filename.startsWith(prefix));
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
