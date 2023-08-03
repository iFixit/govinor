import {
  ActionArgs,
  json,
  LoaderArgs,
  redirect,
  SerializeFrom,
} from "@remix-run/node";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { DEPLOYMENT_DOCKER_COMPOSE_ROOT_DIRECTORY } from "config/env.server";
import invariant from "tiny-invariant";
import { z } from "zod";
import { deploymentPath, repositoryPath } from "~/helpers/path-helpers";
import { PushJob } from "~/jobs/push-job.server";
import { flashMessage, MessageType } from "~/lib/flash";
import { BreadcrumbItem } from "~/lib/hooks/use-breadcrumbs";
import { commitSession, getSession } from "~/lib/session.server";
import { createBranch } from "~/models/branch.server";
import { findRepository } from "~/models/repository.server";

export type Loader = typeof loader;

export const loader = async ({ params }: LoaderArgs) => {
  const repositoryId = params.id;
  invariant(repositoryId, "Expected a repository id");
  const repository = await findRepository({
    id: params.id,
  });

  if (repository == null)
    throw new Response("Repository not Found", {
      status: 404,
      statusText: "Repository not found",
    });

  return {
    repository,
  };
};

export const action = async ({ request, params }: ActionArgs) => {
  const repositoryId = params.id;
  invariant(repositoryId, "Expected a repository id");
  const repository = await findRepository({
    id: repositoryId,
  });

  if (repository == null) {
    throw new Response("Repository not Found", {
      status: 404,
      statusText: "Repository not found",
    });
  }

  const formData = await request.formData();
  const input = Object.fromEntries(formData.entries());
  const validatedInput = CreateBranchInputSchema.safeParse(input);

  if (validatedInput.success) {
    const branch = await createBranch({
      branchName: validatedInput.data.branchName,
      cloneUrl: `https://github.com/${repository.fullName}.git`,
      dockerComposeDirectory: DEPLOYMENT_DOCKER_COMPOSE_ROOT_DIRECTORY,
      repositoryId,
    });
    const job = await PushJob.performLater({ branch: branch.name });
    const session = await getSession(request.headers.get("Cookie"));

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
  return json(validatedInput.error.flatten());
};

const CreateBranchInputSchema = z.object({
  branchName: z.string().trim().min(1, "Branch name is required"),
});

export const handle = {
  getBreadcrumbs: (data: SerializeFrom<Loader>): BreadcrumbItem[] => {
    return [
      {
        id: data.repository.id,
        name: data.repository.fullName,
        to: repositoryPath(data.repository),
      },
      {
        id: "deploy-branch",
        name: "Deploy branch",
      },
    ];
  },
};

export default function NewBranchRoute() {
  const { repository } = useLoaderData<Loader>();
  const actionData = useActionData<typeof action>();

  const navigation = useNavigation();

  return (
    <div className="max-w-4xl mx-auto px-8">
      <header className="py-8">
        <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Deploy branch
        </h2>
      </header>

      <main className="">
        <Form method="post">
          <div className="space-y-12">
            <div className="border-b border-white/10 pb-12">
              <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
                <div className="sm:col-span-4">
                  <label
                    htmlFor="branchName"
                    className="block text-sm font-medium leading-6 text-white"
                  >
                    Branch name
                  </label>
                  <div className="mt-2">
                    <div className="flex rounded-md bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
                      <input
                        type="text"
                        name="branchName"
                        id="branchName"
                        className="flex-1 border-0 bg-transparent py-1.5 text-white focus:ring-0 sm:text-sm sm:leading-6"
                        placeholder="main"
                      />
                    </div>
                    {actionData?.fieldErrors.branchName && (
                      <p className="mt-2 text-sm text-red-500">
                        {actionData.fieldErrors.branchName[0]}
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
              disabled={navigation.state === "submitting"}
              className="rounded-md bg-indigo-500 disabled:bg-indigo-400 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
            >
              {navigation.state === "submitting"
                ? "Creating a deploy..."
                : navigation.state === "loading"
                ? "Deployment created!"
                : "Deploy"}
            </button>
          </div>
        </Form>
      </main>
    </div>
  );
}
