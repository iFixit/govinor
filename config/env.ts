import invariant from "tiny-invariant";

export const DEPLOY_DOMAIN = process.env.DEPLOY_DOMAIN || "govinor.com";
export const DEPLOYMENTS_DIRECTORY =
  process.env.DEPLOYMENTS_DIRECTORY || "/home/ubuntu/deployments";

invariant(process.env.ADMIN_USERNAME, "ADMIN_USERNAME is required");
export const ADMIN_USERNAME = process.env.ADMIN_USERNAME;

invariant(process.env.ADMIN_PASSWORD, "ADMIN_PASSWORD is required");
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

invariant(
  process.env.GITHUB_WEBHOOK_SECRET,
  "GITHUB_WEBHOOK_SECRET is required"
);
export const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
