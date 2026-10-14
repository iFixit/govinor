import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "~": path.resolve(__dirname, "app") },
  },
  test: {
    environment: "node",
    // config/env.server.ts requires these at import time
    env: {
      ADMIN_USERNAME: "test-admin",
      ADMIN_PASSWORD: "test-password",
      GITHUB_WEBHOOK_SECRET: "test-webhook-secret",
      GOVINOR_API_TOKEN: "test-api-token",
    },
  },
});
