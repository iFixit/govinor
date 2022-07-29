import dayjs from "dayjs";
import { LoaderFunction } from "@remix-run/node";
import { JobStatusBadge } from "~/components/JobStatusBadge";
import { PushJob } from "~/jobs/push-job.server";
import {
  getHumanReadableDateTime,
  getHumanReadableDuration,
} from "~/helpers/date-helpers";
import { Link, useLoaderData } from "@remix-run/react";

interface JobData {
  id?: string;
  name: string;
  status: string;
  timestamp: string;
  attempts: number;
  failedReason: string;
  processedOn: string;
  finishedOn: string;
  returnValue: any;
}

interface LoaderData {
  jobs: JobData[];
}

export let loader: LoaderFunction = async (): Promise<LoaderData> => {
  const rawJobs = await PushJob.findMany(100);
  const jobs = await Promise.all(
    rawJobs.map(async (job): Promise<JobData> => {
      const status = await job.getState();
      return {
        id: job.id,
        name: job.name,
        status,
        attempts: job.attemptsMade,
        failedReason: job.failedReason,
        timestamp: new Date(job.timestamp).toISOString(),
        processedOn: job.processedOn
          ? new Date(job.processedOn).toISOString()
          : "",
        finishedOn: job.finishedOn
          ? new Date(job.finishedOn).toISOString()
          : "",
        returnValue: job.returnvalue,
      };
    })
  );
  return {
    jobs,
  };
};

export default function Jobs() {
  let data = useLoaderData<LoaderData>();
  return (
    <>
      <header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">
            Deployments
          </h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="px-4 py-8 sm:px-0">
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
                            Name
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Status
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Created
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Duration
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Attempts
                          </th>
                          <th
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            Result
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {data.jobs.map((job) => (
                          <JobRow key={job.id} job={job} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

interface JobRowProps {
  job: JobData;
}

function JobRow({ job }: JobRowProps) {
  const timestamp = dayjs(job.timestamp);
  const processedOn = dayjs(job.processedOn);
  const finishedOn = dayjs(job.finishedOn);
  let duration = getHumanReadableDuration(processedOn, finishedOn);
  return (
    <tr>
      <td className="px-6 py-4 w-52">
        <div className="flex items-center">
          <div className="text-sm font-medium text-gray-900">
            <Link
              to={job.id || "#"}
              className="text-indigo-600 hover:text-indigo-900"
            >
              {job.name}
            </Link>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <JobStatusBadge status={job.status} />
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-xs text-gray-500">
          {getHumanReadableDateTime(timestamp)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-xs text-gray-500">{duration}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{job.attempts}</div>
      </td>
      <td className="px-6 py-4 text-sm text-gray-500">
        {job.status === "completed" ? job.returnValue : job.failedReason}
      </td>
    </tr>
  );
}
