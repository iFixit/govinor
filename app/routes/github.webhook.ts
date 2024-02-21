import { ActionFunction, json } from "@remix-run/node";
import crypto from "crypto";
import { z } from "zod";
import { GITHUB_WEBHOOK_SECRET } from "~/../config/env.server";
import { DeleteDeploymentJob } from "~/jobs/delete-deployment-job.server";
import { PushJob } from "~/jobs/push-job.server";
import { upsertBranch } from "~/models/branch.server";
import { findRepository } from "~/models/repository.server";

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ message: "Method not allowed" }, 405);
  }
  const webhook = await verifyGithubPayload(request);

  const repository = await findRepository({
    fullName: webhook.payload.repository.full_name,
  });

  if (repository == null) {
    throw json({ message: "Repository not found" }, 404);
  }

  if (repository.deployOnlyOnPullRequest) {
    if (webhook.event !== "pull_request") return webhookResponse();

    switch (webhook.payload.action) {
      case "opened":
      case "synchronize": {
        const branchName = webhook.payload.pull_request.head.ref;
        await upsertBranch({
          branchName,
          cloneUrl: webhook.payload.repository.clone_url,
          dockerComposeDirectory: repository.dockerComposeDirectory,
          repositoryId: repository.id,
        });
        await PushJob.performLater({
          branch: branchName,
        });
        return webhookResponse({ branch: branchName });
      }
      case "closed": {
        const branch = webhook.payload.pull_request.head.ref;
        await DeleteDeploymentJob.performLater({
          branch,
        });
        return webhookResponse({ branch });
      }
      default:
        return webhookResponse();
    }
  }

  switch (webhook.event) {
    case "push": {
      if (
        webhook.payload.deleted ||
        !webhook.payload.ref.startsWith("refs/heads/")
      )
        return webhookResponse();
      const branchName = webhook.payload.ref.replace("refs/heads/", "");
      await upsertBranch({
        branchName,
        cloneUrl: webhook.payload.repository.clone_url,
        dockerComposeDirectory: repository.dockerComposeDirectory,
        repositoryId: repository.id,
      });
      await PushJob.performLater({
        branch: branchName,
      });
      return webhookResponse({
        branch: branchName,
        pusher: webhook.payload.pusher.name,
      });
    }
    case "delete": {
      if (webhook.payload.ref_type !== "branch") return webhookResponse();

      const branch = webhook.payload.ref;
      await DeleteDeploymentJob.performLater({
        branch,
      });
      return webhookResponse({ branch });
    }
    default:
      return webhookResponse();
  }

  function webhookResponse(details: Record<string, unknown> = {}) {
    return json(
      {
        message: `Webhook received: ${webhook.event}`,
        event: webhook.event,
        ...details,
      },
      200
    );
  }
};

async function verifyGithubPayload(request: Request): Promise<GithubEvent> {
  const event = request.headers.get("X-GitHub-Event");
  const payload = await request.json();
  const signature = request.headers.get("X-Hub-Signature");
  const generatedSignature = `sha1=${crypto
    .createHmac("sha1", GITHUB_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest("hex")}`;
  if (signature !== generatedSignature) {
    throw json({ message: "Signature mismatch" }, 401);
  }
  const validation = GithubEventSchema.safeParse({ event, payload });
  if (!validation.success) {
    throw json({ message: "skipped", validation: validation.error }, 200);
  }

  return validation.data;
}

const RepositorySchema = z.object({
  full_name: z.string(),
  clone_url: z.string(),
});

const GithubPushEventSchema = z.object({
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

const GithubPullRequestEventSchema = z.object({
  event: z.literal("pull_request"),
  payload: PullRequestPayloadSchema,
});

const GithubDeleteEventSchema = z.object({
  event: z.literal("delete"),
  payload: z.object({
    ref: z.string(),
    ref_type: z.string(),
    repository: z.object({
      full_name: z.string(),
    }),
  }),
});

const GithubEventSchema = z.union([
  GithubPushEventSchema,
  GithubDeleteEventSchema,
  GithubPullRequestEventSchema,
]);

type GithubEvent = z.infer<typeof GithubEventSchema>;
