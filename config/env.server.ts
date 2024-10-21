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

export const STRAPI_ADMIN_PASSWORD = process.env.STRAPI_ADMIN_PASSWORD;

export const STRAPI_TRANSFER_TOKEN_SALT =
  process.env.STRAPI_TRANSFER_TOKEN_SALT;

export const STRAPI_ADMIN_BACKEND_URL =
  process.env.STRAPI_ADMIN_BACKEND_URL ?? "";

export const GITHUB_API_TOKEN = process.env.GITHUB_API_TOKEN;

export const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
