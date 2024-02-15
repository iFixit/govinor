import { CheckIcon } from "@heroicons/react/20/solid";
import { ArrowPathRoundedSquareIcon } from "@heroicons/react/24/outline";
import { ArrowDownTrayIcon, RocketLaunchIcon } from "@heroicons/react/24/solid";
import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  SerializeFrom,
  redirect,
} from "@remix-run/node";
import { Form, isRouteErrorResponse, useRouteError } from "@remix-run/react";
import dayjs from "dayjs";
import calendar from "dayjs/plugin/calendar";
import invariant from "tiny-invariant";
import Spinner from "~/components/spinner";
import { badRequest } from "~/helpers/application-helpers";
import { useHumanReadableDateTime } from "~/helpers/date-helpers";
import {
  deleteDeploymentJobPath,
  deleteDeploymentJobsPath,
} from "~/helpers/path-helpers";
import { classNames } from "~/helpers/ui-helpers";
import {
  DeleteDeploymentJob,
  DeleteDeploymentPayload,
} from "~/jobs/delete-deployment-job.server";
import { MessageType, flashMessage } from "~/lib/flash";
import { useSWRData } from "~/lib/hooks";
import { BreadcrumbItem } from "~/lib/hooks/use-breadcrumbs";
import { JobProgressLogger, ProgressLog } from "~/lib/logger";
import { commitSession, getSession } from "~/lib/session.server";

dayjs.extend(calendar);

export type Loader = typeof loader;

export interface DeleteJob {
  id?: string;
  name: string;
  data: DeleteDeploymentPayload;
  status: string;
  timestamp: string;
  attempts: number;
  failedReason: string;
  processedOn: string;
  finishedOn: string;
  returnValue?: any;
  progress?: ProgressLog;
}

export let loader = async ({ params }: LoaderFunctionArgs) => {
  invariant(params.id, "Expected params.id");

  const job = await findDeleteDeploymentJob(params.id);
  if (job == null) {
    throw new Response("Deployment not Found", {
      status: 404,
      statusText: "Deployment not found",
    });
  }

  return {
    job,
  };

  async function findDeleteDeploymentJob(
    id: string
  ): Promise<DeleteJob | null> {
    const rawJob = await DeleteDeploymentJob.find(id);
    if (rawJob == null) {
      return null;
    }
    let progress = JobProgressLogger.isProgressLog(rawJob.progress)
      ? rawJob.progress
      : undefined;

    return {
      id,
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
    };
  }
};

enum ActionType {
  Retry = "retry",
}

export const action = async ({ request, params }: ActionFunctionArgs) => {
  invariant(params.id, "Expected params.id");
  const formData = await request.formData();
  const action = formData.get("_action");

  const rawJob = await DeleteDeploymentJob.find(params.id);

  if (rawJob == null) {
    throw new Response("Deployment not Found", {
      status: 404,
      statusText: "Deployment not found",
    });
  }

  switch (action) {
    case ActionType.Retry: {
      const isFailed = await rawJob.isFailed();
      const session = await getSession(request.headers.get("Cookie"));
      if (isFailed) {
        await rawJob.retry();
        flashMessage(session, {
          type: MessageType.Success,
          text: "Deploy is being retried",
        });
        throw redirect(deleteDeploymentJobPath(rawJob), {
          headers: {
            "Set-Cookie": await commitSession(session),
          },
        });
      }
      const job = await DeleteDeploymentJob.performLater(rawJob.data);
      flashMessage(session, {
        type: MessageType.Success,
        text: "Started a new deploy",
      });
      throw redirect(deleteDeploymentJobPath(job), {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    }
  }
  throw badRequest({});
};

export const handle = {
  getBreadcrumbs: (data: SerializeFrom<Loader>): BreadcrumbItem[] => {
    return [
      {
        id: "delete-jobs",
        name: "Delete Jobs",
        to: deleteDeploymentJobsPath(),
      },
      data?.job
        ? {
            id: data.job.id ?? "#",
            name: data.job.name,
          }
        : {
            id: "#404",
            name: "Deployment not found",
          },
    ];
  },
};

export default function DeleteJobPage() {
  let { job } = useSWRData<Loader>();

  return (
    <>
      <JobHeader job={job} />
      <main>
        <div className="">
          <h2 className="p-4 text-base font-semibold leading-7 text-white sm:px-6 lg:px-8">
            Logs
          </h2>
          <div className="px-4 py-5 sm:p-6 min-h-[200px] bg-gray-700/10 text-gray-300 overflow-scroll border-y border-white/10">
            {job.progress?.lines.map((line, index) => (
              <pre key={index} className="whitespace-pre-wrap">
                {line}
              </pre>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

interface JobHeaderProps {
  job: DeleteJob;
}

export function JobHeader({ job }: JobHeaderProps) {
  const timestamp = dayjs(job.timestamp);
  const processedOn = dayjs(job.processedOn);
  const finishedOn = dayjs(job.finishedOn);
  const canRetry = ["failed"].includes(job.status);

  return (
    <div className="lg:flex lg:items-center lg:justify-between p-8">
      <div className="min-w-0 flex-1">
        <h2 className="mt-2 text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
          {job.name}
        </h2>
        <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
          <div className="mt-2 flex items-center text-sm text-gray-300">
            <ArrowDownTrayIcon
              className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-500"
              aria-hidden="true"
            />
            Created: {useHumanReadableDateTime(timestamp)}
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-300">
            <RocketLaunchIcon
              className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-500"
              aria-hidden="true"
            />
            Processed: {useHumanReadableDateTime(processedOn)}
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-300">
            {finishedOn.isValid() ? (
              <>
                <CheckIcon
                  className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-500"
                  aria-hidden="true"
                />
                Completed: {useHumanReadableDateTime(finishedOn)}
              </>
            ) : (
              <>
                <Spinner />
                <span className="text-gray-500">Deploying...</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="mt-5 flex lg:ml-4 lg:mt-0 space-x-3">
        {canRetry && <RetryButton disabled={!canRetry} />}
      </div>
    </div>
  );
}

interface RetryButtonProps {
  disabled?: boolean;
}

function RetryButton({ disabled }: RetryButtonProps) {
  return (
    <Form method="POST" className="">
      <button
        type="submit"
        name="_action"
        value={ActionType.Retry}
        disabled={disabled}
        className={classNames(
          "inline-flex items-center rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
          disabled
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-indigo-400 cursor-pointer"
        )}
      >
        <ArrowPathRoundedSquareIcon
          className="-ml-0.5 mr-1.5 h-5 w-5"
          aria-hidden="true"
        />
        Retry
      </button>
    </Form>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div className="w-[500px] py-10 mx-auto text-center text-white">
        <h1 className="text-4xl leading-tight font-bold">{error.status}</h1>
        <p>{error.statusText}</p>
      </div>
    );
  }
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  return (
    <div className="w-[500px] py-10 mx-auto text-center text-white">
      <h1 className="text-4xl leading-tight font-bold">Uh oh...</h1>
      <p>Something went wrong</p>
      <pre>{errorMessage}</pre>
    </div>
  );
}
