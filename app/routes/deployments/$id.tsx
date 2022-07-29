import { Menu, Transition } from "@headlessui/react";
import {
  CalendarIcon,
  ChevronDownIcon,
  ExclamationIcon,
  LightningBoltIcon,
  LinkIcon,
} from "@heroicons/react/solid";
import { ActionFunction, LoaderFunction, redirect } from "@remix-run/node";
import { Form, useCatch } from "@remix-run/react";
import dayjs from "dayjs";
import calendar from "dayjs/plugin/calendar";
import { Fragment } from "react";
import invariant from "tiny-invariant";
import { DEPLOY_DOMAIN } from "~/../config/env.server";
import { JobStatusBadge } from "~/components/JobStatusBadge";
import { badRequest } from "~/helpers/application-helpers";
import { getHumanReadableDateTime } from "~/helpers/date-helpers";
import { classNames } from "~/helpers/ui-helpers";
import { PushJob, PushJobPayload } from "~/jobs/push-job.server";
import { useSWRData } from "~/lib/hooks";
import { JobProgressLogger, ProgressLog } from "~/lib/logger";
import { Branch, findBranch } from "~/models/branch.server";

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
  branch: Branch | null;
  job: JobData;
  deployDomain: string;
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

  const branch = await findBranch(rawJob.data.branch);

  return {
    branch,
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
    deployDomain: DEPLOY_DOMAIN,
  };
};

interface ActionData {}

enum ActionType {
  Redeploy = "redeploy",
}

export const action: ActionFunction = async ({
  request,
  params,
}): Promise<ActionData> => {
  invariant(params.id, "Expected params.id");
  const formData = await request.formData();
  const action = formData.get("_action");

  const rawJob = await PushJob.find(params.id);

  if (rawJob == null) {
    throw new Response("Deployment not Found", {
      status: 404,
      statusText: "Deployment not found",
    });
  }

  switch (action) {
    case ActionType.Redeploy: {
      const isFailed = await rawJob.isFailed();
      if (isFailed) {
        await rawJob.retry();
      } else {
        const job = await PushJob.performLater(rawJob.data);
        throw redirect(`/deployments/${job.id}`);
      }
      return {};
    }
  }
  throw badRequest({});
};

export default function Job() {
  let { job, branch, deployDomain } = useSWRData<LoaderData>();
  const timestamp = dayjs(job.timestamp);
  const processedOn = dayjs(job.processedOn);
  const finishedOn = dayjs(job.finishedOn);

  const shouldViewLink =
    branch != null && finishedOn.isValid() && job.status === "completed";
  const canRedeploy = ["failed", "completed"].includes(job.status);

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
              {shouldViewLink && (
                <span className="hidden xl:block ml-3">
                  <a
                    href={`https://${branch?.handle}.${deployDomain}/admin`}
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

              <Form method="post" className="hidden xl:block sm:ml-3">
                <button
                  type="submit"
                  name="_action"
                  value={ActionType.Redeploy}
                  disabled={!canRedeploy}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <LightningBoltIcon
                    className="-ml-1 mr-2 h-5 w-5"
                    aria-hidden="true"
                  />
                  Deploy again
                </button>
              </Form>

              {/* Dropdown */}
              {(canRedeploy || shouldViewLink) && (
                <Menu as="span" className="relative xl:hidden">
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
                    <Menu.Items className="origin-top-left md:origin-top-right absolute left-0 md:left-auto md:right-0 mt-2 -mr-1 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                      {shouldViewLink && (
                        <Menu.Item>
                          {({ active }) => (
                            <a
                              href={`https://${branch?.handle}.${deployDomain}/admin`}
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
                      )}
                      {canRedeploy && (
                        <Menu.Item>
                          {({ active }) => (
                            <Form method="post">
                              <button
                                type="submit"
                                name="_action"
                                value={ActionType.Redeploy}
                                className={classNames(
                                  active ? "bg-gray-100" : "",
                                  "w-full block px-4 py-2 text-left text-sm text-gray-700"
                                )}
                              >
                                Deploy again
                              </button>
                            </Form>
                          )}
                        </Menu.Item>
                      )}
                    </Menu.Items>
                  </Transition>
                </Menu>
              )}
            </div>
          </div>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 mt-10 space-y-6">
          {branch == null && (
            <div className="rounded-md bg-yellow-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationIcon
                    className="h-5 w-5 text-yellow-400"
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Deployment not available
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      The deployment has been deleted or has yet to be created
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Logs */}
          <div className="flex flex-col">
            <div className="bg-white overflow-hidden shadow sm:rounded-lg divide-y divide-gray-100">
              <div className="px-4 py-5 sm:px-6">
                <span className="text-xl font-medium">Logs</span>
              </div>
              <div className="px-4 py-5 sm:p-6 min-h-[200px] bg-gray-800 text-gray-300 overflow-scroll">
                {job.progress?.lines.map((line, index) => (
                  <pre key={index} className="whitespace-pre-wrap">
                    {line}
                  </pre>
                ))}
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
