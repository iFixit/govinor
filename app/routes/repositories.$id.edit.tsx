import {
  ActionArgs,
  json,
  LoaderArgs,
  redirect,
  SerializeFrom,
} from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import { repositoryPath } from "~/helpers/path-helpers";
import { flashMessage, MessageType } from "~/lib/flash";
import { BreadcrumbItem } from "~/lib/hooks/use-breadcrumbs";
import { commitSession, getSession } from "~/lib/session.server";
import {
  findRepository,
  updateRepository,
  UpdateRepositoryInputSchema,
} from "~/models/repository.server";

export type Loader = typeof loader;

export const loader = async ({ params }: LoaderArgs) => {
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
  return {
    repository,
  };
};

export const action = async ({ request, params }: ActionArgs) => {
  invariant(params.id, "Expected a repository id");
  const formData = await request.formData();
  const input = Object.fromEntries(formData.entries());
  const validatedInput = UpdateRepositoryInputSchema.safeParse(input);
  if (validatedInput.success) {
    const updatedRepo = await updateRepository(params.id, validatedInput.data);
    const session = await getSession(request.headers.get("Cookie"));
    flashMessage(session, {
      type: MessageType.Success,
      text: `Repository "${updatedRepo.fullName}" has been updated`,
    });
    throw redirect(repositoryPath(updatedRepo), {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  } else {
    return json(validatedInput.error.flatten());
  }
};

export const handle = {
  getBreadcrumbs: (data: SerializeFrom<Loader>): BreadcrumbItem[] => {
    return [
      {
        id: data.repository.id,
        name: data.repository.fullName,
        to: repositoryPath(data.repository),
      },
      {
        id: `${data.repository.id}/edit`,
        name: "Edit",
      },
    ];
  },
};

export default function EditRepositoryPage() {
  const { repository } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  return (
    <div className="max-w-4xl mx-auto px-8">
      <header className="py-8">
        <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Edit repo
        </h2>
      </header>

      <main className="">
        <Form method="POST">
          <div className="space-y-12">
            <div className="border-b border-white/10 pb-12">
              <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                <div className="sm:col-span-4">
                  <label
                    htmlFor="owner"
                    className="block text-sm font-medium leading-6 text-white"
                  >
                    Repository owner
                  </label>
                  <div className="mt-2">
                    <div className="flex rounded-md bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                      <input
                        type="text"
                        name="owner"
                        id="owner"
                        className="flex-1 border-0 bg-transparent py-1.5 text-white focus:ring-0 sm:text-sm sm:leading-6"
                        placeholder="iFixit"
                        defaultValue={repository.owner}
                      />
                    </div>
                    {actionData?.fieldErrors.owner && (
                      <p className="mt-2 text-sm text-red-500">
                        {actionData.fieldErrors.owner[0]}
                      </p>
                    )}
                  </div>
                </div>
                <div className="sm:col-span-4">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium leading-6 text-white"
                  >
                    Repository name
                  </label>
                  <div className="mt-2">
                    <div className="flex rounded-md bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                      <input
                        type="text"
                        name="name"
                        id="name"
                        className="flex-1 border-0 bg-transparent py-1.5 text-white focus:ring-0 sm:text-sm sm:leading-6"
                        placeholder="react-commerce"
                        defaultValue={repository.name}
                      />
                    </div>
                    {actionData?.fieldErrors.name && (
                      <p className="mt-2 text-sm text-red-500">
                        {actionData.fieldErrors.name[0]}
                      </p>
                    )}
                  </div>
                </div>
                <div className="sm:col-span-4">
                  <label
                    htmlFor="dockerComposeDirectory"
                    className="block text-sm font-medium leading-6 text-white"
                  >
                    Docker compose directory
                  </label>
                  <div className="mt-2">
                    <div className="flex rounded-md bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                      <input
                        type="text"
                        name="dockerComposeDirectory"
                        id="dockerComposeDirectory"
                        className="flex-1 border-0 bg-transparent py-1.5 text-white focus:ring-0 sm:text-sm sm:leading-6"
                        placeholder="backend"
                        defaultValue={repository.dockerComposeDirectory}
                      />
                    </div>
                    {actionData?.fieldErrors.dockerComposeDirectory && (
                      <p className="mt-2 text-sm text-red-500">
                        {actionData.fieldErrors.dockerComposeDirectory[0]}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-x-6">
            <Link
              to={repositoryPath(repository)}
              className="text-sm font-semibold leading-6 text-white"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              Save
            </button>
          </div>
        </Form>
      </main>
    </div>
  );
}