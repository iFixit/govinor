import { beforeEach, describe, expect, it, vi } from "vitest";
import { PushJob } from "~/jobs/push-job.server";
import { loader } from "./api.deployments.jobs.$id";

// vi.mock is hoisted above the imports, so the route sees this fake.
vi.mock("~/jobs/push-job.server", () => ({ PushJob: { find: vi.fn() } }));

function fakeJob(state: string, failedReason = "") {
  return {
    id: "42",
    data: { branch: "claude/Fix_Seed" },
    failedReason,
    getState: async () => state,
  };
}

function get(id: string, token = "test-api-token") {
  const request = new Request(`http://localhost/api/deployments/jobs/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return loader({ request, params: { id }, context: {} }).catch((r: Response) => r);
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/deployments/jobs/:id", () => {
  it("reports the job's state and the preview URL", async () => {
    vi.mocked(PushJob.find).mockResolvedValue(fakeJob("active") as any);
    const response = await get("42");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      jobId: "42",
      state: "active",
      failedReason: null,
      branch: "claude/Fix_Seed",
      url: "https://claude-fix-seed.govinor.com",
    });
  });

  it("includes why a failed job failed", async () => {
    vi.mocked(PushJob.find).mockResolvedValue(
      fakeJob("failed", "`docker compose up` exited with code 1") as any
    );
    const body = await (await get("42")).json();
    expect(body.state).toBe("failed");
    expect(body.failedReason).toBe("`docker compose up` exited with code 1");
  });

  it("answers 404 for an unknown job", async () => {
    vi.mocked(PushJob.find).mockResolvedValue(undefined);
    expect((await get("999")).status).toBe(404);
  });

  it("rejects a bad token without looking the job up", async () => {
    expect((await get("42", "wrong")).status).toBe(401);
    expect(PushJob.find).not.toHaveBeenCalled();
  });
});
