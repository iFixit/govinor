import { describe, expect, it } from "vitest";
import { getBranchHandle, isReservedHandle } from "./deployment-helpers";

describe("getBranchHandle", () => {
  it("turns a branch name into a lowercase DNS label", () => {
    expect(getBranchHandle("claude/Fix_Strapi-Seed")).toBe("claude-fix-strapi-seed");
  });

  it("collapses runs of invalid characters and trims dashes", () => {
    expect(getBranchHandle("--feature//two__words--")).toBe("feature-two-words");
  });

  it("shortens long names to 63 characters with a hash suffix", () => {
    const handle = getBranchHandle("a".repeat(80));
    expect(handle).toHaveLength(63);
    expect(handle).toMatch(/^a+-[0-9a-f]{8}$/);
  });

  it("gives different long names different handles", () => {
    expect(getBranchHandle("a".repeat(80) + "1")).not.toBe(
      getBranchHandle("a".repeat(80) + "2")
    );
  });
});

describe("isReservedHandle", () => {
  it("reserves Govinor's own Compose project", () => {
    expect(isReservedHandle("govinor")).toBe(true);
    expect(isReservedHandle("master")).toBe(false);
  });
});
