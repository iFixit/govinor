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
  // Sign the body exactly as received. Re-encoding parsed JSON doesn't always
  // reproduce GitHub's bytes (escaped "/" or non-ASCII characters), so valid
  // deliveries would fail verification.
  const body = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get("X-Hub-Signature-256");
  if (signature == null || !isValidSignature(body, signature)) {
    throw json({ message: "Signature mismatch" }, 401);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(body.toString("utf8"));
  } catch {
    throw json({ message: "Invalid JSON" }, 400);
  }
  const validation = GithubEventSchema.safeParse({ event, payload });
  if (!validation.success) {
    throw json({ message: "skipped", validation: validation.error }, 200);
  }

  return validation.data;
}

function isValidSignature(body: Buffer, signature: string) {
  const expected = Buffer.from(
    `sha256=${crypto
      .createHmac("sha256", GITHUB_WEBHOOK_SECRET)
      .update(body)
      .digest("hex")}`
  );
  const received = Buffer.from(signature);
  // timingSafeEqual throws on different lengths; the length isn't secret.
  return (
    received.length === expected.length &&
    crypto.timingSafeEqual(received, expected)
  );
}

const GithubEventSchema = z.union([
  GithubPushEventSchema,
  GithubDeleteEventSchema,
  GithubPullRequestEventSchema,
]);

type GithubEvent = z.infer<typeof GithubEventSchema>;
