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
  const files = await octokit.pulls.listFiles({
    owner: repository.owner,
    repo: repository.name,
    pull_number: prNumber,
  });
  return files.data;
}
