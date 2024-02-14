type IdResource = { id?: string } | string;

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
  const id = createIdFromResource(deployment);
  return `${deploymentsPath()}/${id}`;
}

export function newRepositoryPath() {
  return "/repositories/new";
}

export function repositoryPath<T extends IdResource>(repository: T) {
  const id = createIdFromResource(repository);
  return `/repositories/${id}`;
}

export function editRepositoryPath<T extends IdResource>(repository: T) {
  return `${repositoryPath(repository)}/edit`;
}

export function branchesPath<T extends IdResource>(repository: T) {
  return `${repositoryPath(repository)}/branches`;
}

export function branchPath<R extends IdResource, B extends { name: string }>(
  repository: R,
  branch: B
) {
  return `${branchesPath(repository)}/${branch.name}`;
}

export function newBranchPath<T extends IdResource>(repository: T) {
  return `${branchesPath(repository)}/new`;
}

export function deleteJobsPath() {
  return "/delete-jobs";
}

// Utils

const createIdFromResource = (resource: IdResource) => {
  if (typeof resource === "string") {
    return resource;
  } else {
    return resource.id;
  }
};
