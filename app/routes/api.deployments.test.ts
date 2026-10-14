import { beforeEach, describe, expect, it, vi } from "vitest";
import { PushJob } from "~/jobs/push-job.server";
import { upsertBranch } from "~/models/branch.server";
import { findRepository } from "~/models/repository.server";
import { action } from "./api.deployments";

// vi.mock is hoisted above the imports, so the route sees these fakes.
vi.mock("~/jobs/push-job.server", () => ({
  PushJob: { performLater: vi.fn(async () => ({ id: "42" })) },
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
    expect(PushJob.performLater).toHaveBeenCalledWith({ branch: "claude/Fix_Seed" });
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
