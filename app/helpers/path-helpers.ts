type IdResource = { id?: string };

export function homePath() {
  return "/";
}
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

export function deploymentsPath() {
  return "/deployments";
}

export function deploymentPath<T extends IdResource>(deployment: T) {
  return `${deploymentsPath()}/${deployment.id}`;
}

export function newRepositoryPath() {
  return "/repositories/new";
}

export function repositoryPath<T extends IdResource>(repository: T) {
  return `/repositories/${repository.id}`;
}

export function editRepositoryPath<T extends IdResource>(repository: T) {
  return `${repositoryPath(repository)}/edit`;
}
