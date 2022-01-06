import { GITHUB_WEBHOOK_SECRET } from "~/../config/env";
import crypto from "crypto";
import { ActionFunction, json } from "remix";
import { DeleteDeploymentJob } from "~/jobs/delete-deployment-job.server";
import { PushJob } from "~/jobs/push-job.server";

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ message: "Method not allowed" }, 405);
  }
  const payload = await request.json();
  const signature = request.headers.get("X-Hub-Signature");
  const generatedSignature = `sha1=${crypto
    .createHmac("sha1", GITHUB_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest("hex")}`;
  if (signature !== generatedSignature) {
    return json({ message: "Signature mismatch" }, 401);
  }
  const event = request.headers.get("X-GitHub-Event");
  const response: any = {
    message: `Webhook received: ${event}`,
    event,
  };

  if (event === "push" && payload.deleted === false) {
    const branch = payload.ref.replace("refs/heads/", "");
    response.branch = branch;
    response.pusher = payload.pusher.name;
    await PushJob.performLater({
      branch,
      cloneUrl: payload.repository.clone_url,
    });
  } else if (event === "delete" && payload.ref_type === "branch") {
    const branch = payload.ref;
    response.branch = branch;
    await DeleteDeploymentJob.performLater({
      branch,
      sender: {
        login: payload.sender.login,
        avatar_url: payload.sender.avatar_url,
      },
    });
  }
  return json(response, 200);
};
