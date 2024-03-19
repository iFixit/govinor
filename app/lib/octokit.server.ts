import { Octokit } from "@octokit/rest";
import { GITHUB_API_TOKEN } from "config/env.server";

export const octokit = new Octokit({ auth: GITHUB_API_TOKEN });
