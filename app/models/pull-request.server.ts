import { octokit } from "~/lib/octokit.server";

interface Repository {
  owner: string;
  name: string;
}

interface FindPullRequestFilesArgs {
  repository: Repository;
  prNumber: number;
}
export async function findPullRequestFiles({
  repository,
  prNumber,
}: FindPullRequestFilesArgs) {
  const files = await octokit.paginate(
    octokit.rest.pulls.listFiles,
    { owner: repository.owner, repo: repository.name, pull_number: prNumber, per_page: 100 },
    response => response.data
  );
  return files;
}
