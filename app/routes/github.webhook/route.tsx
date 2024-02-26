import { ActionFunction, json } from "@remix-run/node";
import crypto from "crypto";
import { z } from "zod";
import { GITHUB_WEBHOOK_SECRET } from "~/../config/env.server";
import { findRepository } from "~/models/repository.server";
import {
  GithubDeleteEventSchema,
  processDeleteWebhook,
} from "./delete-webhook";
import {
  GithubPullRequestEventSchema,
  processPullRequestWebhook,
} from "./pull-request-webhook";
import { GithubPushEventSchema, processPushWebhook } from "./push-webhook";

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ message: "Method not allowed" }, 405);
  }
  const webhook = await verifyGithubPayload(request);

  const repository = await requireRepository();

  switch (webhook.event) {
    case "push":
      return processPushWebhook(webhook, repository);
    case "delete":
      return processDeleteWebhook(webhook, repository);
    case "pull_request":
      return processPullRequestWebhook(webhook, repository);
    default:
      return json({ message: "Event ignored" });
  }

  async function requireRepository() {
    const repo = await findRepository({
      fullName: webhook.payload.repository.full_name,
    });
    if (repo == null) throw json({ message: "Repository not found" }, 404);
    return repo;
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

const GithubEventSchema = z.union([
  GithubPushEventSchema,
  GithubDeleteEventSchema,
  GithubPullRequestEventSchema,
]);

type GithubEvent = z.infer<typeof GithubEventSchema>;
