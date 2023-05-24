import { CheckIcon } from "@heroicons/react/20/solid";
import {
  ArrowPathRoundedSquareIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import {
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/solid";
import {
  ActionArgs,
  LoaderArgs,
  redirect,
  SerializeFrom,
} from "@remix-run/node";
import { Form, useCatch } from "@remix-run/react";
import dayjs from "dayjs";
import calendar from "dayjs/plugin/calendar";
import invariant from "tiny-invariant";
import { DEPLOY_DOMAIN } from "~/../config/env.server";
import { badRequest } from "~/helpers/application-helpers";
import { getHumanReadableDateTime } from "~/helpers/date-helpers";
import {
  branchPreviewUrl,
  deploymentPath,
  deploymentsPath,
} from "~/helpers/path-helpers";
import { classNames } from "~/helpers/ui-helpers";
import { PushJob } from "~/jobs/push-job.server";
import { flashMessage, MessageType } from "~/lib/flash";
import { useSWRData } from "~/lib/hooks";
import { BreadcrumbItem } from "~/lib/hooks/use-breadcrumbs";
import { commitSession, getSession } from "~/lib/session.server";
import { Branch, findBranch } from "~/models/branch.server";
import { Deployment, findDeployment } from "~/models/deployment.server";

dayjs.extend(calendar);

export type Loader = typeof loader;

export let loader = async ({ params }: LoaderArgs) => {
  invariant(params.id, "Expected params.id");

  const deployment = await findDeployment(params.id);
  if (deployment == null) {
    throw new Response("Deployment not Found", {
      status: 404,
      statusText: "Deployment not found",
    });
  }

  const branch = await findBranch(deployment.data.branch);

  return {
    branch,
    deployment,
    deployDomain: DEPLOY_DOMAIN,
  };
};

enum ActionType {
  Redeploy = "redeploy",
}

export const action = async ({ request, params }: ActionArgs) => {
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
      const session = await getSession(request.headers.get("Cookie"));
      if (isFailed) {
        await rawJob.retry();
        flashMessage(session, {
          type: MessageType.Success,
          text: "Deploy is being retried",
        });
        throw redirect(deploymentPath(rawJob), {
          headers: {
            "Set-Cookie": await commitSession(session),
          },
        });
      }
      const job = await PushJob.performLater(rawJob.data);
      flashMessage(session, {
        type: MessageType.Success,
        text: "Started a new deploy",
      });
      throw redirect(deploymentPath(job), {
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
        id: "activities",
        name: "Activities",
        to: deploymentsPath(),
      },
      {
        id: data.deployment.id ?? "#",
        name: data.deployment.name,
      },
    ];
  },
};

export default function DeploymentPage() {
  let { deployment, branch, deployDomain } = useSWRData<Loader>();

  return (
    <>
      <DeploymentHeader
        deployment={deployment}
        branch={branch}
        deployDomain={deployDomain}
      />
      <main>
        <div className="">
          {branch == null && (
            <div className="bg-yellow-700/10 p-8">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon
                    className="h-5 w-5 text-yellow-500"
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-700">
                    Deployment not available
                  </h3>
                  <div className="mt-2 text-sm text-yellow-800">
                    <p>
                      The deployment has been deleted or has yet to be created
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <h2 className="p-4 text-base font-semibold leading-7 text-white sm:px-6 lg:px-8">
            Logs
          </h2>
          <div className="px-4 py-5 sm:p-6 min-h-[200px] bg-gray-700/10 text-gray-300 overflow-scroll border-y border-white/10">
            {deployment.progress?.lines.map((line, index) => (
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

interface DeploymentHeaderProps {
  deployment: Deployment;
  branch: Branch | null;
  deployDomain: string;
}

export function DeploymentHeader({
  deployment,
  branch,
  deployDomain,
}: DeploymentHeaderProps) {
  const timestamp = dayjs(deployment.timestamp);
  const processedOn = dayjs(deployment.processedOn);
  const finishedOn = dayjs(deployment.finishedOn);
  const shouldViewLink =
    branch != null && finishedOn.isValid() && deployment.status === "completed";
  const canRedeploy = ["failed", "completed"].includes(deployment.status);

  return (
    <div className="lg:flex lg:items-center lg:justify-between p-8">
      <div className="min-w-0 flex-1">
        <h2 className="mt-2 text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
          {deployment.name}
        </h2>
        <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
          <div className="mt-2 flex items-center text-sm text-gray-300">
            <ArrowDownTrayIcon
              className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-500"
              aria-hidden="true"
            />
            Created: {getHumanReadableDateTime(timestamp)}
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-300">
            <RocketLaunchIcon
              className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-500"
              aria-hidden="true"
            />
            Processed: {getHumanReadableDateTime(processedOn)}
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-300">
            <CheckIcon
              className="mr-1.5 h-5 w-5 flex-shrink-0 text-gray-500"
              aria-hidden="true"
            />
            Completed: {getHumanReadableDateTime(finishedOn)}
          </div>
        </div>
      </div>
      <div className="mt-5 flex lg:ml-4 lg:mt-0 space-x-3">
        {shouldViewLink && (
          <span className="">
            <a
              href={branchPreviewUrl({ handle: branch.handle, deployDomain })}
              target="_blank"
              className="inline-flex items-center rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-white/20"
            >
              <EyeIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
              View
            </a>
          </span>
        )}
        {canRedeploy && <DeployButton disabled={!canRedeploy} />}
      </div>
    </div>
  );
}

interface DeployButtonProps {
  disabled?: boolean;
}

function DeployButton({ disabled }: DeployButtonProps) {
  return (
    <Form method="post" className="">
      <button
        type="submit"
        name="_action"
        value={ActionType.Redeploy}
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
        Deploy again
      </button>
    </Form>
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
