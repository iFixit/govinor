import crypto from 'crypto';
import { DEPLOYMENTS_DIRECTORY } from '~/../config/env.server';

interface GetRepoDeployPathOptions {
   branchHandle: string;
   rootDirectory?: string;
}

export function getRepoDeployPath(options: GetRepoDeployPathOptions) {
   const repoPath = getRepoPath(options.branchHandle);
   const deployPath = options.rootDirectory ? getRelativePath(options.rootDirectory) : '';
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
   return path.replace(/\/$/g, '').replace(/^\//g, '');
}

const MAX_DOMAIN_LENGTH = 63;
const BRANCH_HASH_LENGTH = 8;

// The handle becomes the branch's preview subdomain, i.e. a single DNS label.
// It must be lowercase, contain only [a-z0-9-], have no leading/trailing dash,
// and no "--" (which collides with the reserved xn-- punycode prefix and makes
// ACME refuse to issue a cert). Normalize to a guaranteed-valid label rather
// than assuming the branch name is already clean.
export function getBranchHandle(branchName: string) {
   const handle = branchName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-') // collapse runs of invalid chars to one dash
      .replace(/^-+|-+$/g, ''); // trim leading/trailing dashes

   // Hash the raw branch name so distinct branches never collide on a handle.
   const hash = crypto
      .createHash('sha1')
      .update(branchName)
      .digest('hex')
      .substring(0, BRANCH_HASH_LENGTH);

   if (handle.length <= MAX_DOMAIN_LENGTH) {
      return handle;
   }
   const truncatedHandle = handle
      .substring(0, MAX_DOMAIN_LENGTH - BRANCH_HASH_LENGTH - 1)
      .replace(/-+$/g, ''); // don't leave a trailing dash before the hash join
   return `${truncatedHandle}-${hash}`;
}
