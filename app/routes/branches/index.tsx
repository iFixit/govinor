import { Menu, Transition } from "@headlessui/react";
import {
  ArrowPathRoundedSquareIcon,
  EllipsisVerticalIcon,
  TrashIcon,
} from "@heroicons/react/20/solid";
import { ActionArgs, redirect } from "@remix-run/node";
import { Form } from "@remix-run/react";
import { Fragment } from "react";
import invariant from "tiny-invariant";
import { MessageType } from "~/components/global-notification";
import { classNames } from "~/helpers/ui-helpers";
import { DeleteDeploymentJob } from "~/jobs/delete-deployment-job.server";
import { PushJob } from "~/jobs/push-job.server";
import { flashMessage } from "~/lib/flash";
import { commitSession, getSession } from "~/lib/session.server";
import type { BranchItem } from "~/models/branch.server";

enum Intent {
  Redeploy = "redeploy",
  Delete = "delete",
}

export const action = async ({ request }: ActionArgs) => {
  const formData = await request.formData();
  const intent = formData.get("intent");
  const session = await getSession(request.headers.get("Cookie"));
  switch (intent) {
    case Intent.Redeploy: {
      const branchName = requireBranchName(formData);
      try {
        await PushJob.performLater({
          branch: branchName,
        });
        flashMessage(session, {
          type: MessageType.Success,
          text: `Started a deploy for "${branchName}"`,
        });
        throw redirect("/", {
          headers: {
            "Set-Cookie": await commitSession(session),
          },
        });
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        flashMessage(session, {
          type: MessageType.Error,
          text: errorMessage,
        });
        throw redirect("/", {
          headers: {
            "Set-Cookie": await commitSession(session),
          },
        });
      }
    }
    case Intent.Delete: {
      const branchName = requireBranchName(formData);
      try {
        await DeleteDeploymentJob.performLater({
          branch: branchName,
        });
        flashMessage(session, {
          type: MessageType.Success,
          text: `Removing branch "${branchName}"`,
        });
        throw redirect("/", {
          headers: {
            "Set-Cookie": await commitSession(session),
          },
        });
      } catch (error) {
        const errorMessage = getErrorMessage(error);
        flashMessage(session, {
          type: MessageType.Error,
          text: errorMessage,
        });
        throw redirect("/", {
          headers: {
            "Set-Cookie": await commitSession(session),
          },
        });
      }
    }
    default: {
      throw new Error(`Unknown intent: ${intent}`);
    }
  }
};

function requireBranchName(data: FormData): string {
  const branchName = data.get("branch-name");
  invariant(typeof branchName === "string", "branch-name is required");
  return branchName;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Response) {
    throw error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "unknown error";
}

interface BranchActionsProps {
  branch: BranchItem;
}

export function BranchActions({ branch }: BranchActionsProps) {
  return (
    <Menu as="div" className="relative flex-none">
      <Menu.Button className="-m-2.5 block rounded p-2.5 text-gray-500 hover:text-gray-50 hover:bg-gray-500/10">
        <span className="sr-only">Open options</span>
        <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-10 mt-2 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none">
          <Menu.Item>
            {({ active }) => (
              <Form
                action="/branches"
                method="post"
                reloadDocument
                className={classNames(
                  active ? "bg-gray-100" : "",
                  "text-sm leading-6 text-gray-900 cursor-pointer"
                )}
              >
                <input type="hidden" name="branch-name" value={branch.name} />
                <button
                  type="submit"
                  name="intent"
                  value={Intent.Redeploy}
                  className="group flex items-center px-4 py-2 text-sm"
                >
                  <ArrowPathRoundedSquareIcon
                    className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500"
                    aria-hidden="true"
                  />
                  Redeploy<span className="sr-only">, {branch.name}</span>
                </button>
              </Form>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <Form
                action="/branches"
                method="post"
                reloadDocument
                className={classNames(
                  active ? "bg-red-100" : "",
                  "text-sm leading-6 text-red-600 cursor-pointer"
                )}
              >
                <input type="hidden" name="branch-name" value={branch.name} />
                <button
                  type="submit"
                  name="intent"
                  value={Intent.Delete}
                  className="group flex items-center px-4 py-2 text-sm"
                >
                  <TrashIcon
                    className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500"
                    aria-hidden="true"
                  />
                  Remove<span className="sr-only">, {branch.name}</span>
                </button>
              </Form>
            )}
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
