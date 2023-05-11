import invariant from "tiny-invariant";

export const DEPLOY_DOMAIN = process.env.DEPLOY_DOMAIN || "govinor.com";
export const DEPLOYMENTS_DIRECTORY =
  process.env.DEPLOYMENTS_DIRECTORY || "/home/ubuntu/deployments";

/*
  This represents the directory where the docker compose of Strapi is located.
  It is hardcoded to "backend" because for now we only would serve Strapi from
  react-commerce repo. Ideally this should be configurable from the dashboard and
  on a per project basis (much like "Root Directory" in Vercel project settings).
*/
export const DEPLOYMENT_DOCKER_COMPOSE_ROOT_DIRECTORY =
  process.env.DEPLOYMENT_DOCKER_COMPOSE_ROOT_DIRECTORY || "backend";

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
