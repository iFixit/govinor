import { Menu, Transition } from "@headlessui/react";
import {
  CalendarIcon,
  ChevronDownIcon,
  LinkIcon,
} from "@heroicons/react/solid";
import dayjs from "dayjs";
import calendar from "dayjs/plugin/calendar";
import { Fragment } from "react";
import { LoaderFunction, useCatch } from "remix";
import invariant from "tiny-invariant";
import { JobStatusBadge } from "~/components/JobStatusBadge";
import { getHumanReadableDateTime } from "~/helpers/date-helpers";
import { classNames } from "~/helpers/ui-helpers";
import { PushJob, PushJobPayload } from "~/jobs/push-job.server";
import { useSWRData } from "~/lib/hooks";
import { JobProgressLogger, ProgressLog } from "~/lib/logger";
import { Deployment, getDeploymentByBranch } from "~/models/deployment.server";

dayjs.extend(calendar);

interface JobData {
  id?: string;
  name: string;
  data: PushJobPayload;
  status: string;
  timestamp: string;
  attempts: number;
  failedReason: string;
  processedOn: string;
  finishedOn: string;
  returnValue: any;
  progress?: ProgressLog;
}

interface LoaderData {
  deployment: Deployment;
  job: JobData;
}

export let loader: LoaderFunction = async ({ params }): Promise<LoaderData> => {
  invariant(params.id, "Expected params.id");
  const rawJob = await PushJob.find(params.id);
  if (rawJob == null) {
    throw new Response("Deployment not Found", {
      status: 404,
      statusText: "Deployment not found",
    });
  }
  let progress = JobProgressLogger.isProgressLog(rawJob.progress)
    ? rawJob.progress
    : undefined;

  const deployment = await getDeploymentByBranch(rawJob.data.branch);

  if (deployment == null) {
    throw new Response("Deployment has not been created", {
      status: 404,
      statusText: "Deployment has not been created",
    });
  }

  return {
    deployment,
    job: {
      id: params.id,
      name: rawJob.name,
      data: rawJob.data,
      status: await rawJob.getState(),
      timestamp: new Date(rawJob.timestamp).toISOString(),
      attempts: rawJob.attemptsMade,
      failedReason: rawJob.failedReason,
      processedOn: rawJob.processedOn
        ? new Date(rawJob.processedOn).toISOString()
        : "",
      finishedOn: rawJob.finishedOn
        ? new Date(rawJob.finishedOn).toISOString()
        : "",
      returnValue: rawJob.returnvalue,
      progress,
    },
  };
};

export default function Job() {
  let { job, deployment } = useSWRData<LoaderData>();
  const timestamp = dayjs(job.timestamp);
  const processedOn = dayjs(job.processedOn);
  const finishedOn = dayjs(job.finishedOn);

  return (
    <>
      <header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:flex lg:items-center lg:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                  {" "}
                  {job.name}{" "}
                </h1>
                <span className="ml-4 text-2xl text-gray-500">#{job.id}</span>
                <JobStatusBadge
                  status={job.status}
                  className="ml-4 text-base py-1"
                />
              </div>
              <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <CalendarIcon
                    className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                  Created on {getHumanReadableDateTime(timestamp)}
                </div>
                {processedOn.isValid() && (
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <CalendarIcon
                      className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                    Processed on {getHumanReadableDateTime(processedOn)}
                  </div>
                )}
                {finishedOn.isValid() && (
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <CalendarIcon
                      className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                    Completed on {getHumanReadableDateTime(finishedOn)}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 flex lg:mt-0 lg:ml-4">
              {finishedOn.isValid() && job.status === "completed" && (
                <span className="hidden sm:block ml-3">
                  <a
                    href={`${deployment.url}/admin`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    target="_blank"
                  >
                    <LinkIcon
                      className="-ml-1 mr-2 h-5 w-5 text-gray-500"
                      aria-hidden="true"
                    />
                    View
                  </a>
                </span>
              )}

              {/* Dropdown */}
              <Menu as="span" className="relative sm:hidden">
                <Menu.Button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  More
                  <ChevronDownIcon
                    className="-mr-1 ml-2 h-5 w-5 text-gray-500"
                    aria-hidden="true"
                  />
                </Menu.Button>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-200"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="origin-top-left absolute left-0 mt-2 -mr-1 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <Menu.Item>
                      {({ active }) => (
                        <a
                          href={`${deployment.url}/admin`}
                          target="_blank"
                          className={classNames(
                            active ? "bg-gray-100" : "",
                            "block px-4 py-2 text-sm text-gray-700"
                          )}
                        >
                          View
                        </a>
                      )}
                    </Menu.Item>
                  </Menu.Items>
                </Transition>
              </Menu>
            </div>
          </div>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="px-4 sm:px-0">
            {/* Logs */}
            <div className="flex flex-col mt-10">
              <div className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-100">
                <div className="px-4 py-5 sm:px-6">
                  <span className="text-xl font-medium">Logs</span>
                </div>
                <div className="px-4 py-5 sm:p-6 min-h-[200px] bg-gray-800 text-gray-300">
                  {job.progress?.lines.map((line, index) => (
                    <pre key={index} className="whitespace-pre-wrap">
                      {line}
                    </pre>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export function CatchBoundary() {
  const caught = useCatch();
  return (
    <div className="w-[500px] py-10 mx-auto text-center">
      <h1 className="text-4xl leading-tight font-bold">{caught.status}</h1>
      <p>{caught.statusText}</p>
    </div>
  );
}
