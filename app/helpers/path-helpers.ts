interface BranchPreviewUrlArgs {
  handle: string;
  deployDomain: string;
}

export function branchPreviewUrl({
  handle,
  deployDomain,
}: BranchPreviewUrlArgs) {
  return `https://${handle}.${deployDomain}/admin`;
}

export function deploymentPath<T extends { id?: string }>(deployment: T) {
  return `/deployments/${deployment.id}`;
}
