import { beforeEach, describe, expect, it, vi } from "vitest";
import { PushJob } from "~/jobs/push-job.server";
import { upsertBranch } from "~/models/branch.server";
import { findRepository } from "~/models/repository.server";
import { action } from "./api.deployments";

// vi.mock is hoisted above the imports, so the route sees these fakes.
vi.mock("~/jobs/push-job.server", () => ({
  PushJob: {
    performLater: vi.fn(async (_: unknown, options?: { jobId?: string }) => ({
      id: options?.jobId ?? "42",
    })),
    find: vi.fn(),
  },
}));
vi.mock("~/models/branch.server", () => ({ upsertBranch: vi.fn() }));
vi.mock("~/models/repository.server", () => ({ findRepository: vi.fn() }));

const repository = {
  id: "repo-1",
  fullName: "iFixit/ifixit",
  dockerComposeDirectory: "apps/strapi",
};

function post(body: unknown, token = "test-api-token") {
  const request = new Request("http://localhost/api/deployments", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return action({ request, params: {}, context: {} }).catch((r: Response) => r);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findRepository).mockResolvedValue(repository as any);
});

describe("POST /api/deployments", () => {
  it("upserts the branch, queues a push job, and returns where it will be", async () => {
    const response = await post({ repository: "iFixit/ifixit", branch: "claude/Fix_Seed" });

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      jobId: "42",
      branch: "claude/Fix_Seed",
      handle: "claude-fix-seed",
      url: "https://claude-fix-seed.govinor.com",
    });
    expect(findRepository).toHaveBeenCalledWith({ fullName: "iFixit/ifixit" });
    expect(upsertBranch).toHaveBeenCalledWith({
      branchName: "claude/Fix_Seed",
      cloneUrl: "https://github.com/iFixit/ifixit.git",
      dockerComposeDirectory: "apps/strapi",
      repositoryId: "repo-1",
    });
    expect(PushJob.performLater).toHaveBeenCalledWith({ branch: "claude/Fix_Seed" }, undefined);
  });

  it("rejects a bad token before reading the body", async () => {
    const response = await post({ repository: "iFixit/ifixit", branch: "x" }, "wrong");
    expect(response.status).toBe(401);
    expect(findRepository).not.toHaveBeenCalled();
  });

  it.each([
    ["no body", "not json"],
    ["a missing branch", { repository: "iFixit/ifixit" }],
    ["an option-like branch", { repository: "iFixit/ifixit", branch: "--upload-pack=x" }],
    ["a range-like branch", { repository: "iFixit/ifixit", branch: "a..b" }],
    ["whitespace in the branch", { repository: "iFixit/ifixit", branch: "a b" }],
    ["Govinor's own handle", { repository: "iFixit/ifixit", branch: "Govinor" }],
    ["a short sha", { repository: "iFixit/ifixit", branch: "x", sha: "abc123" }],
    ["a branch with an empty handle", { repository: "iFixit/ifixit", branch: "___" }],
  ])("answers 400 for %s", async (_, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(PushJob.performLater).not.toHaveBeenCalled();
  });

  it("answers 404 for a repository Govinor doesn't know", async () => {
    vi.mocked(findRepository).mockResolvedValue(null);
    const response = await post({ repository: "iFixit/other", branch: "x" });
    expect(response.status).toBe(404);
    expect(PushJob.performLater).not.toHaveBeenCalled();
  });
});

describe("POST /api/deployments with a commit sha", () => {
  const sha = "0123456789abcdef0123456789abcdef01234567";
  const jobId = `claude-fix-seed-${sha}`;

  function existingJob(state: string) {
    return { id: jobId, getState: async () => state, remove: vi.fn() };
  }

  it("queues the deploy under a job id made from the handle and sha", async () => {
    vi.mocked(PushJob.find).mockResolvedValue(undefined);
    const response = await post({ repository: "iFixit/ifixit", branch: "claude/Fix_Seed", sha });
    expect((await response.json()).jobId).toBe(jobId);
    expect(PushJob.performLater).toHaveBeenCalledWith({ branch: "claude/Fix_Seed" }, { jobId });
  });

  it.each(["waiting", "delayed", "active"])(
    "hands back the same deploy while it is %s",
    async (state) => {
      vi.mocked(PushJob.find).mockResolvedValue(existingJob(state) as any);
      const response = await post({ repository: "iFixit/ifixit", branch: "claude/Fix_Seed", sha });
      expect(response.status).toBe(202);
      expect((await response.json()).jobId).toBe(jobId);
      expect(PushJob.performLater).not.toHaveBeenCalled();
    }
  );

  it.each(["completed", "failed"])("replaces a %s deploy so a re-run deploys again", async (state) => {
    const job = existingJob(state);
    vi.mocked(PushJob.find).mockResolvedValue(job as any);
    await post({ repository: "iFixit/ifixit", branch: "claude/Fix_Seed", sha });
    expect(job.remove).toHaveBeenCalled();
    expect(PushJob.performLater).toHaveBeenCalledWith({ branch: "claude/Fix_Seed" }, { jobId });
  });
});
