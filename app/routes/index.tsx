import React from "react";
import { LoaderFunction, MetaFunction, useLoaderData } from "remix";
import { classNames } from "~/helpers/ui-helpers";
import { getDeployments } from "~/models/deployment.server";
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
  stat: string;
}

interface Deployment {
  handle: string;
  url: string;
}

interface LoaderData {
  stats: Stat[];
  deployments: Deployment[];
}

export let loader: LoaderFunction = async (): Promise<LoaderData> => {
  const systemStats = await getSystemStats();
  const deployments = await getDeployments();
  return {
    stats: [
      { name: "Free Disk Space", stat: systemStats.availableDiskSpace },
      { name: "Available memory", stat: systemStats.availableMemory },
      { name: "Deployments count", stat: deployments.length.toString() },
    ],
    deployments: deployments.map<Deployment>((deployment) => ({
      handle: deployment.handle,
      url: deployment.url,
    })),
  };
};

export default function Index() {
  const { stats, deployments } = useLoaderData<LoaderData>();
  return (
    <>
      <header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">
            Dashboard
          </h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="px-4 py-8 sm:px-0">
            <Stats>
              {stats.map((item) => (
                <div
                  key={item.name}
                  className="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6"
                >
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {item.name}
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {item.stat}
                  </dd>
                </div>
              ))}
            </Stats>
          </div>
          {deployments.length > 0 && <Deployments deployments={deployments} />}
        </div>
      </main>
    </>
  );
}

function Stats({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <dl
      className={classNames(
        "mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3",
        className
      )}
    >
      {children}
    </dl>
  );
}

interface DeploymentsProps {
  deployments: Deployment[];
}

function Deployments({ deployments }: DeploymentsProps) {
  return (
    <div className="flex flex-col">
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
          <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Branch handle
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Edit</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {deployments.map((deployment, index) => (
                  <tr
                    key={deployment.handle}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {deployment.handle}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a
                        href={`${deployment.url}/admin`}
                        target="_blank"
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
