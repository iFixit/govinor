import { CheckIcon, ClipboardIcon } from "@heroicons/react/20/solid";
import { ActionFunction, LoaderArgs, redirect } from "@remix-run/node";
import { Form, Link, useLoaderData, useNavigation } from "@remix-run/react";
import invariant from "tiny-invariant";
import { homePath } from "~/helpers/path-helpers";
import { prisma } from "~/lib/db.server";
import { flashMessage, MessageType } from "~/lib/flash";
import { useClipboard } from "~/lib/hooks/use-copy-to-clipboard";
import { commitSession, getSession } from "~/lib/session.server";
import { deleteRepository, findRepository } from "~/models/repository.server";

export type Loader = typeof loader;

export let loader = async ({ params }: LoaderArgs) => {
  invariant(params.id, "Expected a repository id");
  const repository = await findRepository({
    id: params.id,
  });
  if (repository == null) {
    throw new Response("Repository not Found", {
      status: 404,
      statusText: "Repository not found",
    });
  }
  const branchCount = await prisma.branch.count({
    where: {
      repositoryId: repository.id,
    },
  });
  return {
    repository,
    branchCount,
  };
};

export const action: ActionFunction = async ({ request, params }) => {
  invariant(params.id, "Expected a repository id");
  const deleteRepo = await deleteRepository({
    id: params.id,
  });
  const session = await getSession(request.headers.get("Cookie"));
  flashMessage(session, {
    type: MessageType.Success,
    text: `Repository "${deleteRepo.fullName}" has been removed`,
  });
  throw redirect(homePath(), {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
};

export default function RepositoryPage() {
  const { repository, branchCount } = useLoaderData<Loader>();
  const navigation = useNavigation();
  const isDeleting = navigation.state === "submitting";

  const requestDeleteConfirmation: React.FormEventHandler<HTMLFormElement> = (
    event
  ) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the repository "${repository.fullName}"?`
    );
    if (!confirmed) {
      event.preventDefault();
    }
  };

  const { isCopied, copyToClipboard } = useClipboard();

  return (
    <div className="max-w-4xl mx-auto px-8">
      <header className="py-8">
        <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
          {repository.fullName}
        </h2>
        <p className="text-gray-500 font-mono text-sm mt-2">
          {branchCount} deployed branches
        </p>
      </header>

      <main className="">
        <div>
          <div className="mt-6 border-t border-white/10">
            <dl className="divide-y divide-white/10">
              <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt className="text-sm font-medium leading-6 text-white">
                  Owner
                </dt>
                <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                  {repository.owner}
                </dd>
              </div>
              <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt className="text-sm font-medium leading-6 text-white">
                  Name
                </dt>
                <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                  {repository.name}
                </dd>
              </div>
              <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                <dt className="text-sm font-medium leading-6 text-white">
                  Docker compose directory
                </dt>
                <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0">
                  {repository.dockerComposeDirectory}
                </dd>
              </div>
              {repository.deployKey && (
                <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                  <dt className="text-sm font-medium leading-6 text-white">
                    Github deploy key
                  </dt>
                  <dd className="mt-1 text-sm leading-6 text-gray-400 sm:col-span-2 sm:mt-0 flex flex-col space-y-2">
                    {isCopied ? (
                      <div className="self-end flex items-center space-x-1">
                        <span className="">Copied</span>
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          repository.deployKey != null &&
                          copyToClipboard(repository.deployKey)
                        }
                        className="group hover:text-white transition-colors self-end flex items-center space-x-1"
                      >
                        <span className="">Copy</span>
                        <ClipboardIcon className="h-5 w-5" aria-hidden="true" />
                      </button>
                    )}

                    <div className="bg-gray-700/20 rounded-lg p-2">
                      <code className="whitespace-pre-wrap break-all">
                        {repository.deployKey}
                      </code>
                    </div>
                  </dd>
                </div>
              )}
            </dl>
          </div>
          <div className="mt-6 flex items-center justify-start gap-x-4">
            <Link
              to="edit"
              className="rounded-md bg-white/10 min-w-[70px] text-center px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-white/20 cursor-pointer"
            >
              Edit
            </Link>
            <Form method="post" onSubmit={requestDeleteConfirmation}>
              <button
                type="submit"
                name="method"
                value="delete"
                disabled={navigation.state === "submitting"}
                className="rounded-md bg-red-600 disabled:bg-red-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </Form>
          </div>
        </div>
      </main>
    </div>
  );
}
