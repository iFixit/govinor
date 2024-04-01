import crypto from "crypto";
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

const MAX_DOMAIN_LENGTH = 63;
const BRANCH_HASH_LENGTH = 8;

export function getBranchHandle(branchName: string) {
  const handle = branchName.replace(/[^a-zA-Z0-9]/g, "-");
  const hash = crypto
    .createHash("sha1")
    .update(branchName)
    .digest("hex")
    .substring(0, BRANCH_HASH_LENGTH);

  if (handle.length <= MAX_DOMAIN_LENGTH) {
    return handle;
  }
  const truncatedHandle = handle.substring(
    0,
    MAX_DOMAIN_LENGTH - BRANCH_HASH_LENGTH
  );
  return `${truncatedHandle}${hash}`;
}
