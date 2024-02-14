import { Link } from "@remix-run/react";
import dayjs from "dayjs";
import { StatusIndicator } from "~/components/status-indicator";
import {
  getHumanReadableDateTime,
  getHumanReadableDuration,
} from "~/helpers/date-helpers";

export interface JobTableRowProps {
  job: JobTableRowItem;
}

export interface JobTableRowItem {
  id?: string;
  name: string;
  status: string;
  timestamp: string;
  attempts: number;
  failedReason: string;
  processedOn: string;
  finishedOn: string;
  returnValue?: any;
}

export function JobTableRow({ job }: JobTableRowProps) {
  const timestamp = dayjs(job.timestamp);
  const processedOn = dayjs(job.processedOn);
  const finishedOn = dayjs(job.finishedOn);
  let duration = getHumanReadableDuration(processedOn, finishedOn);
  return (
    <tr key={job.id} className="relative hover:bg-gray-700/10">
      <td className="py-4 pl-4 pr-8 sm:pl-6 lg:pl-8">
        <Link
          to={job.id ?? "#"}
          className="text-sm font-medium leading-6 text-white"
        >
          {job.name}
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
          <time className="text-gray-400 sm:hidden" dateTime={job.timestamp}>
            {timestamp.fromNow()}
          </time>
          <StatusIndicator status={job.status} />
          <div className="hidden text-white sm:block">{job.status}</div>
        </div>
      </td>
      <td className="hidden py-4 pl-0 pr-8 text-sm leading-6 text-gray-400 md:table-cell lg:pr-20">
        {duration}
      </td>
      <td className="hidden py-4 pl-0 pr-4 text-right text-sm leading-6 text-gray-400 sm:table-cell sm:pr-6 lg:pr-8">
        <div>{job.attempts}</div>
      </td>
      <td className="hidden py-4 pl-0 pr-4 text-right text-sm leading-6 text-gray-400 sm:table-cell sm:pr-6 lg:pr-8">
        {job.status === "completed" ? job.returnValue : job.failedReason}
      </td>
    </tr>
  );
}
