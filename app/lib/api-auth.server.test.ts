import { describe, expect, it } from "vitest";
import { requireApiToken } from "./api-auth.server";

function request(authorization?: string) {
  return new Request("http://localhost/api/deployments", {
    headers: authorization ? { Authorization: authorization } : {},
  });
}

async function statusOf(fn: () => void) {
  try {
    fn();
  } catch (response) {
    return (response as Response).status;
  }
  return "allowed";
}

describe("requireApiToken", () => {
  it("allows the configured bearer token", async () => {
    expect(await statusOf(() => requireApiToken(request("Bearer test-api-token")))).toBe("allowed");
  });

  it("rejects a missing, wrong, or non-bearer token", async () => {
    expect(await statusOf(() => requireApiToken(request()))).toBe(401);
    expect(await statusOf(() => requireApiToken(request("Bearer nope")))).toBe(401);
    expect(await statusOf(() => requireApiToken(request("Bearer test-api-token-longer")))).toBe(401);
    expect(await statusOf(() => requireApiToken(request("Basic test-api-token")))).toBe(401);
  });

  it("answers 503 when no token is configured, even with an empty bearer", async () => {
    expect(await statusOf(() => requireApiToken(request("Bearer "), ""))).toBe(503);
  });
});
