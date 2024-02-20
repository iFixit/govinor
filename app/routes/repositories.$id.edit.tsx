import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
  SerializeFrom,
} from "@remix-run/node";
import { Form, Link, useActionData, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import {
  Switch,
  SwitchDescription,
  SwitchGroup,
  SwitchLabel,
} from "~/components/switch";
import { isBlank } from "~/helpers/application-helpers";
import { repositoryPath } from "~/helpers/path-helpers";
import { classNames } from "~/helpers/ui-helpers";
import { flashMessage, MessageType } from "~/lib/flash";
import { BreadcrumbItem } from "~/lib/hooks/use-breadcrumbs";
import { commitSession, getSession } from "~/lib/session.server";
import {
  findRepository,
  updateRepository,
  UpdateRepositoryInputSchema,
} from "~/models/repository.server";

export type Loader = typeof loader;

export const loader = async ({ params }: LoaderFunctionArgs) => {
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

export const action = async ({ request, params }: ActionFunctionArgs) => {
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
                  <Label htmlFor="owner">Repository owner</Label>
                  <div className="mt-2">
                    <Input
                      type="text"
                      name="owner"
                      id="owner"
                      placeholder="iFixit"
                      defaultValue={repository.owner}
                    />
                    <InputErrorMessage>
                      {actionData?.fieldErrors.owner?.[0]}
                    </InputErrorMessage>
                  </div>
                </div>
                <div className="sm:col-span-4">
                  <Label htmlFor="name">Repository name</Label>
                  <div className="mt-2">
                    <Input
                      type="text"
                      name="name"
                      id="name"
                      placeholder="ifixit"
                      defaultValue={repository.name}
                    />
                    <InputErrorMessage>
                      {actionData?.fieldErrors.name?.[0]}
                    </InputErrorMessage>
                  </div>
                </div>
                <div className="sm:col-span-4">
                  <Label htmlFor="dockerComposeDirectory">
                    Docker compose directory
                  </Label>
                  <div className="mt-2">
                    <Input
                      type="text"
                      name="dockerComposeDirectory"
                      id="dockerComposeDirectory"
                      placeholder="apps/strapi"
                      defaultValue={repository.dockerComposeDirectory}
                    />
                    <InputErrorMessage>
                      {actionData?.fieldErrors.dockerComposeDirectory?.[0]}
                    </InputErrorMessage>
                  </div>
                </div>
                <div className="sm:col-span-4">
                  <SwitchGroup>
                    <span className="flex flex-grow flex-col">
                      <SwitchLabel>Deploy only open pull requests</SwitchLabel>
                      <SwitchDescription>
                        If enabled, only branches that have open pull requests
                        will be deployed automatically.
                      </SwitchDescription>
                    </span>
                    <Switch
                      name="deployOnlyOnPullRequest"
                      defaultChecked={repository.deployOnlyOnPullRequest}
                    ></Switch>
                  </SwitchGroup>
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

function Label({
  className,
  ...otherProps
}: React.DetailedHTMLProps<
  React.LabelHTMLAttributes<HTMLLabelElement>,
  HTMLLabelElement
>) {
  return (
    <label
      {...otherProps}
      className={classNames(
        className,
        "block text-sm font-medium leading-6 text-white"
      )}
    />
  );
}

function Input({
  className,
  ...otherProps
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div
      className={classNames(
        className,
        "flex rounded-md bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500"
      )}
    >
      <input
        className="flex-1 border-0 bg-transparent py-1.5 text-white focus:ring-0 sm:text-sm sm:leading-6"
        {...otherProps}
      />
    </div>
  );
}

function InputErrorMessage({ children }: { children: React.ReactNode }) {
  if (isBlank(children)) return null;
  return <p className="mt-2 text-sm text-red-500">{children}</p>;
}
