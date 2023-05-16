import { LoaderFunction, MetaFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { DEPLOY_DOMAIN } from "~/../config/env.server";
import { BranchPreviews } from "~/components/branch-previews";
import { DeploymentList } from "~/components/deployment-list";
import { StatsSection } from "~/components/stats-section";
import { findAllBranches } from "~/models/branch.server";
import { DeploymentItem, findAllDeployments } from "~/models/deployment.server";
import { getSystemStats } from "~/models/system.server";

export let meta: MetaFunction = () => {
  return {
    title: "Govinor",
    description:
      "Govinor is a platform to deploy and preview docker containers.",
  };
};

interface Stat {
  name: string;
  value: string;
}

interface LoaderData {
  stats: Stat[];
  branches: Branch[];
  deployDomain: string;
  deployments: DeploymentItem[];
}

type Branch = Awaited<ReturnType<typeof findAllBranches>>[0];

export let loader: LoaderFunction = async (): Promise<LoaderData> => {
  const [systemStats, branches, deployments] = await Promise.all([
    getSystemStats(),
    findAllBranches(),
    findAllDeployments({ limit: 25 }),
  ]);
  return {
    stats: [
      { name: "Free Disk Space", value: systemStats.availableDiskSpace },
      { name: "Available memory", value: systemStats.availableMemory },
      { name: "Deployments count", value: branches.length.toString() },
    ],
    branches,
    deployments,
    deployDomain: DEPLOY_DOMAIN,
  };
};

export default function Index() {
  const { stats, branches, deployDomain, deployments } =
    useLoaderData<LoaderData>();
  return (
    <>
      <div className="relative">
        <main className="lg:pr-96">
          <StatsSection stats={stats} />
          <header className="flex items-center justify-between border-b border-white/5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
            <h1 className="text-base font-semibold leading-7 text-white">
              Branch previews
            </h1>
          </header>
          <BranchPreviews branches={branches} deployDomain={deployDomain} />
        </main>
        <aside className="bg-black/10 lg:fixed lg:bottom-0 lg:right-0 lg:top-16 lg:w-96 lg:overflow-y-auto lg:border-l lg:border-white/5">
          <header className="flex items-center justify-between border-b border-white/5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
            <h2 className="text-base font-semibold leading-7 text-white">
              Recent activities
            </h2>
            <Link
              to="/deployments"
              className="text-sm font-semibold leading-6 text-indigo-400"
            >
              View all
            </Link>
          </header>
          <DeploymentList deployments={deployments} />
        </aside>
      </div>
    </>
  );
}
