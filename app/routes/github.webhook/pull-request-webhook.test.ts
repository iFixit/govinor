import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteDeploymentJob } from "~/jobs/delete-deployment-job.server";
import { findBranch } from "~/models/branch.server";
import { processPullRequestWebhook } from "./pull-request-webhook";

// vi.mock is hoisted above the imports, so the handler sees these fakes.
vi.mock("~/jobs/delete-deployment-job.server", () => ({
  DeleteDeploymentJob: { performLater: vi.fn() },
}));
vi.mock("~/models/branch.server", () => ({ findBranch: vi.fn() }));

const repository = { id: "repo-1", deployOnlyOnPullRequest: true } as any;

function webhook(action: "opened" | "synchronize" | "closed") {
  return {
    event: "pull_request" as const,
    payload: {
      action,
      number: 7,
      pull_request: { url: "", head: { ref: "claude/fix" } },
      repository: { full_name: "iFixit/ifixit", clone_url: "" },
    },
  } as any;
}

beforeEach(() => vi.clearAllMocks());

describe("processPullRequestWebhook", () => {
  it.each(["opened", "synchronize"] as const)(
    "doesn't deploy on %s, since CI starts deploys",
    async (action) => {
      vi.mocked(findBranch).mockResolvedValue({ name: "claude/fix" } as any);
      const body = await (await processPullRequestWebhook(webhook(action), repository)).json();
      expect(body.status).toBe("skipped");
      expect(DeleteDeploymentJob.performLater).not.toHaveBeenCalled();
    }
  );

  it("deletes the preview when a pull request with one is closed", async () => {
    vi.mocked(findBranch).mockResolvedValue({ name: "claude/fix" } as any);
    const body = await (await processPullRequestWebhook(webhook("closed"), repository)).json();
    expect(body.status).toBe("success");
    expect(DeleteDeploymentJob.performLater).toHaveBeenCalledWith({ branch: "claude/fix" });
  });

  it("does nothing when a pull request without a preview is closed", async () => {
    vi.mocked(findBranch).mockResolvedValue(null);
    const body = await (await processPullRequestWebhook(webhook("closed"), repository)).json();
    expect(body.status).toBe("skipped");
    expect(DeleteDeploymentJob.performLater).not.toHaveBeenCalled();
  });
});
