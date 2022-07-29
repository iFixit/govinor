import { Menu, Transition } from "@headlessui/react";
import {
  ChevronDownIcon,
  DuplicateIcon,
  EyeIcon,
  PencilAltIcon,
} from "@heroicons/react/solid";
import {
  ActionFunction,
  json,
  LoaderFunction,
  MetaFunction,
  redirect,
} from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import React, { Fragment } from "react";
import ReactDOM from "react-dom";
import invariant from "tiny-invariant";
import { DEPLOY_DOMAIN } from "~/../config/env.server";
import { classNames } from "~/helpers/ui-helpers";
import { PushJob } from "~/jobs/push-job.server";
import { commitSession, getSession } from "~/lib/session.server";
import { findAllBranches } from "~/models/branch.server";
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

interface LoaderData {
  stats: Stat[];
  branches: Branch[];
  deployDomain: string;
}

type Branch = Awaited<ReturnType<typeof findAllBranches>>[0];

export let loader: LoaderFunction = async (): Promise<LoaderData> => {
  const systemStats = await getSystemStats();
  const branches = await findAllBranches();
  return {
    stats: [
      { name: "Free Disk Space", stat: systemStats.availableDiskSpace },
      { name: "Available memory", stat: systemStats.availableMemory },
      { name: "Deployments count", stat: branches.length.toString() },
    ],
    branches,
    deployDomain: DEPLOY_DOMAIN,
  };
};

type ActionData = {
  error: string;
};

enum Intent {
  Redeploy = "redeploy",
  Delete = "delete",
}

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const intent = formData.get("intent");
  switch (intent) {
    case Intent.Redeploy: {
      const branchName = formData.get("branch-name");
      invariant(typeof branchName === "string", "branch-name is required");
      try {
        await PushJob.performLater({
          branch: branchName,
        });
        const session = await getSession(request.headers.get("Cookie"));
        session.flash("globalMessage", `Started a deploy for "${branchName}"`);
        throw redirect("/", {
          headers: {
            "Set-Cookie": await commitSession(session),
          },
        });
      } catch (error) {
        if (error instanceof Response) {
          throw error;
        }
        if (error instanceof Error) {
          return json<ActionData>({
            error: error.message,
          });
        }
        return json<ActionData>(
          {
            error: "unknown error",
          },
          {
            status: 500,
          }
        );
      }
    }
    default: {
      throw new Error(`Unknown intent: ${intent}`);
    }
  }
};

export default function Index() {
  const { stats, branches, deployDomain } = useLoaderData<LoaderData>();
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
          {branches.length > 0 && (
            <BranchList branches={branches} deployDomain={deployDomain} />
          )}
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

interface BranchListProps {
  branches: Branch[];
  deployDomain: string;
}

function BranchList({ branches, deployDomain }: BranchListProps) {
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
                {branches.map((branch, index) => (
                  <tr
                    key={branch.handle}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <a
                        href={`https://${branch.handle}.${deployDomain}/admin`}
                        target="_blank"
                        className="hover:text-blue-500"
                      >
                        {branch.handle}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end space-x-4 items-center">
                      <a
                        href={`https://${branch.handle}.${deployDomain}/admin`}
                        target="_blank"
                        className="inline-flex items-center px-3.5 py-2 border border-transparent text-sm leading-4 font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <EyeIcon
                          className="mr-2 h-4 w-4 text-blue-50 group-hover:text-gray-500"
                          aria-hidden="true"
                        />
                        View
                      </a>
                      <Form method="post" reloadDocument>
                        <input
                          type="hidden"
                          name="branch-name"
                          value={branch.name}
                        />
                        <button
                          type="submit"
                          name="intent"
                          value={Intent.Redeploy}
                          className="rounded-full inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          Redeploy
                        </button>
                      </Form>
                      {/* <DeploymentActions /> */}
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

export function DeploymentActions() {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <div>
        <Menu.Button className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500">
          Options
          <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
        </Menu.Button>
      </div>

      <Portal>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-none">
            <div className="py-1">
              <Menu.Item>
                {({ active }) => (
                  <a
                    href="#"
                    className={classNames(
                      active ? "bg-gray-100 text-gray-900" : "text-gray-700",
                      "group flex items-center px-4 py-2 text-sm"
                    )}
                  >
                    <PencilAltIcon
                      className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                      aria-hidden="true"
                    />
                    Edit
                  </a>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <a
                    href="#"
                    className={classNames(
                      active ? "bg-gray-100 text-gray-900" : "text-gray-700",
                      "group flex items-center px-4 py-2 text-sm"
                    )}
                  >
                    <DuplicateIcon
                      className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                      aria-hidden="true"
                    />
                    Duplicate
                  </a>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Portal>
    </Menu>
  );
}

type PortalProps = React.PropsWithChildren<{}>;

function Portal({ children }: PortalProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    containerRef.current = document.createElement("div");
    document.body.appendChild(containerRef.current);
    return () => {
      if (containerRef.current) {
        document.body.removeChild(containerRef.current);
      }
    };
  }, []);

  if (containerRef.current == null) {
    return null;
  }

  return ReactDOM.createPortal(children, containerRef.current);
}
