import { Link } from "@remix-run/react";
import dayjs from "dayjs";
import {
  getHumanReadableDuration,
  useHumanReadableDateTime,
} from "~/helpers/date-helpers";
import { deploymentPath } from "~/helpers/path-helpers";
import type { DeploymentItem } from "~/models/deployment.server";
import { StatusIndicator } from "./status-indicator";

interface DeploymentListProps {
  deployments: DeploymentItem[];
}

export function DeploymentList({ deployments }: DeploymentListProps) {
  return (
    <ul role="list" className="divide-y divide-white/5">
      {deployments.map((deployment) => (
        <DeploymentListItem key={deployment.id} deployment={deployment} />
      ))}
    </ul>
  );
}

interface DeploymentListItemProps {
  deployment: DeploymentItem;
}

function DeploymentListItem({ deployment }: DeploymentListItemProps) {
  const timestamp = dayjs(deployment.timestamp);
  const processedOn = dayjs(deployment.processedOn);
  const finishedOn = dayjs(deployment.finishedOn);
  let duration = getHumanReadableDuration(processedOn, finishedOn);
  return (
    <li
      key={deployment.id}
      className="relative px-4 py-4 sm:px-6 lg:px-8 hover:bg-gray-700/10"
    >
      <div className="flex items-center gap-x-3">
        <StatusIndicator status={deployment.status} />
        <Link
          to={deploymentPath(deployment)}
          className="flex-auto text-sm font-semibold leading-6 text-white"
        >
          {deployment.name}
          <span className="absolute inset-0" />
        </Link>
        {duration && (
          <span className="flex-none text-xs text-gray-600">{duration}</span>
        )}
      </div>
      <p className="mt-3 truncate text-xs text-gray-500">
        Pushed {useHumanReadableDateTime(timestamp)}
      </p>
    </li>
  );
}
