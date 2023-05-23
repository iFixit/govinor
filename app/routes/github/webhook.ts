import { ActionFunction, json } from "@remix-run/node";
import crypto from "crypto";
import { z } from "zod";
import { GITHUB_WEBHOOK_SECRET } from "~/../config/env.server";
import { DeleteDeploymentJob } from "~/jobs/delete-deployment-job.server";
import { PushJob } from "~/jobs/push-job.server";
import { createBranch } from "~/models/branch.server";
import { findRepository } from "~/models/repository.server";

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ message: "Method not allowed" }, 405);
  }
  const webhook = await verifyGithubPayload(request);

  const event = request.headers.get("X-GitHub-Event");
  const response: any = {
    message: `Webhook received: ${event}`,
    event,
  };

  if (webhook.event === "push" && webhook.payload.deleted === false) {
    const payload = webhook.payload;
    const branch = payload.ref.replace("refs/heads/", "");
    response.branch = branch;
    response.pusher = payload.pusher.name;
    const repository = await findRepository({
      fullName: payload.repository.full_name,
    });
    if (repository == null) {
      throw json({ message: "Repository not found" }, 404);
    }
    await createBranch({
      branchName: branch,
      cloneUrl: payload.repository.clone_url,
      dockerComposeDirectory: repository.dockerComposeDirectory,
      repositoryId: repository.id,
    });
    await PushJob.performLater({
      branch,
    });
  } else if (
    webhook.event === "delete" &&
    webhook.payload.ref_type === "branch"
  ) {
    // The delete event ref is the branch name
    const branch = webhook.payload.ref;
    response.branch = branch;
    await DeleteDeploymentJob.performLater({
      branch,
    });
  }
  return json(response, 200);
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

const GithubDeleteEventSchema = z.object({
  event: z.literal("delete"),
  payload: z.object({
    ref: z.string(),
    ref_type: z.string(),
  }),
});

const GithubEventSchema = z.union([
  GithubPushEventSchema,
  GithubDeleteEventSchema,
]);

type GithubEvent = z.infer<typeof GithubEventSchema>;
