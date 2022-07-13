import { DEPLOYMENTS_DIRECTORY } from "~/../config/env.server";

interface GetRepoDeployPathOptions {
  branchHandle: string;
  rootDirectory?: string;
}

export function getRepoDeployPath(options: GetRepoDeployPathOptions) {
  const repoPath = getRepoPath(options.branchHandle);
  const deployPath = options.rootDirectory
    ? getRelativePath(options.rootDirectory)
    : "";
  let cwd = repoPath;
  if (deployPath.length > 0) {
    cwd += `/${deployPath}`;
  }
  return cwd;
}

export function getRepoPath(branchHandle: string) {
  return `${DEPLOYMENTS_DIRECTORY}/${branchHandle}`;
}

function getRelativePath(path: string) {
  return path.replace(/\/$/g, "").replace(/^\//g, "");
}

export function getBranchHandle(branch: string) {
  return branch.replace(/\//g, "-").replace(/_/g, "-");
}
