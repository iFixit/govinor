import type { LoaderFunction } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import dayjs from "dayjs";
import { StatusIndicator } from "~/components/status-indicator";
import {
  getHumanReadableDateTime,
  getHumanReadableDuration,
} from "~/helpers/date-helpers";
import { DeploymentItem, findAllDeployments } from "~/models/deployment.server";

interface LoaderData {
  deployments: DeploymentItem[];
}

export let loader: LoaderFunction = async (): Promise<LoaderData> => {
  const deployments = await findAllDeployments({ limit: 100 });
  return {
    deployments,
  };
};

export default function DeploymentsPage() {
  const { deployments } = useLoaderData<LoaderData>();
  return (
    <main className="">
      <div className="pt-11">
        <h2 className="px-4 text-base font-semibold leading-7 text-white sm:px-6 lg:px-8">
          Activities
        </h2>
        <table className="mt-6 w-full text-left">
          <colgroup className="">
            <col className="w-full sm:w-3/12" />
            <col className="lg:w-2/12" />
            <col className="lg:w-1/12" />
            <col className="lg:w-1/12" />
            <col className="lg:w-1/12" />
            <col className="lg:w-4/12" />
          </colgroup>
          <thead className="border-b border-white/10 text-sm leading-6 text-white">
            <tr>
              <th
                scope="col"
                className="py-2 pl-4 pr-8 font-semibold sm:pl-6 lg:pl-8"
              >
                Name
              </th>
              <th
                scope="col"
                className="hidden py-2 pl-0 pr-8 font-semibold sm:table-cell"
              >
                Created
              </th>
              <th
                scope="col"
                className="py-2 pl-0 pr-4 text-right font-semibold sm:pr-8 sm:text-left lg:pr-20"
              >
                Status
              </th>
              <th
                scope="col"
                className="hidden py-2 pl-0 pr-8 font-semibold md:table-cell lg:pr-20"
              >
                Duration
              </th>
              <th
                scope="col"
                className="hidden py-2 pl-0 pr-4 text-right font-semibold sm:table-cell sm:pr-6 lg:pr-8"
              >
                Attempts
              </th>
              <th
                scope="col"
                className="hidden py-2 pl-0 pr-4 text-right font-semibold sm:table-cell sm:pr-6 lg:pr-8"
              >
                Result
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {deployments.map((deployment) => (
              <DeploymentTableRow key={deployment.id} deployment={deployment} />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

interface DeploymentTableRowProps {
  deployment: DeploymentItem;
}

function DeploymentTableRow({ deployment }: DeploymentTableRowProps) {
  const timestamp = dayjs(deployment.timestamp);
  const processedOn = dayjs(deployment.processedOn);
  const finishedOn = dayjs(deployment.finishedOn);
  let duration = getHumanReadableDuration(processedOn, finishedOn);
  return (
    <tr key={deployment.id} className="relative hover:bg-gray-700/10">
      <td className="py-4 pl-4 pr-8 sm:pl-6 lg:pl-8">
        <Link
          to={deployment.id ?? "#"}
          className="text-sm font-medium leading-6 text-white"
        >
          {deployment.name}
          <span className="absolute inset-0" />
        </Link>
      </td>
      <td className="hidden py-4 pl-0 pr-4 sm:table-cell sm:pr-8 whitespace-nowrap">
        <div className="flex gap-x-3">
          <div className="text-sm leading-6 text-gray-400">
            {getHumanReadableDateTime(timestamp)}
          </div>
        </div>
      </td>
      <td className="py-4 pl-0 pr-4 text-sm leading-6 sm:pr-8 lg:pr-20">
        <div className="flex items-center justify-end gap-x-2 sm:justify-start">
          <time
            className="text-gray-400 sm:hidden"
            dateTime={deployment.timestamp}
          >
            {timestamp.fromNow()}
          </time>
          <StatusIndicator status={deployment.status} />
          <div className="hidden text-white sm:block">{deployment.status}</div>
        </div>
      </td>
      <td className="hidden py-4 pl-0 pr-8 text-sm leading-6 text-gray-400 md:table-cell lg:pr-20">
        {duration}
      </td>
      <td className="hidden py-4 pl-0 pr-4 text-right text-sm leading-6 text-gray-400 sm:table-cell sm:pr-6 lg:pr-8">
        <div>{deployment.attempts}</div>
      </td>
      <td className="hidden py-4 pl-0 pr-4 text-right text-sm leading-6 text-gray-400 sm:table-cell sm:pr-6 lg:pr-8">
        {deployment.status === "completed"
          ? deployment.returnValue
          : deployment.failedReason}
      </td>
    </tr>
  );
}
