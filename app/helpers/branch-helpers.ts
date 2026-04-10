const PROTECTED_BRANCHES = ["main", "master"];

export function isProtectedBranch(branchName: string): boolean {
  return PROTECTED_BRANCHES.includes(branchName);
}
