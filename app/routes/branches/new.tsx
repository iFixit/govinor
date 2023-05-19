import { ActionFunction, json, redirect } from "@remix-run/node";
import { Form, useActionData, useTransition } from "@remix-run/react";
import { z } from "zod";
import { DEPLOYMENT_DOCKER_COMPOSE_ROOT_DIRECTORY } from "~/../config/env.server";
import { MessageType, flashMessage } from "~/lib/flash";
import { commitSession, getSession } from "~/lib/session.server";
import { createBranch } from "~/models/branch.server";

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const input = Object.fromEntries(formData.entries());
  const validatedInput = CreateBranchInputSchema.safeParse(input);
  if (validatedInput.success) {
    await createBranch({
      branchName: validatedInput.data.branchName,
      cloneUrl: "https://github.com/iFixit/react-commerce.git",
      dockerComposeDirectory: DEPLOYMENT_DOCKER_COMPOSE_ROOT_DIRECTORY,
    });
    const session = await getSession(request.headers.get("Cookie"));
    flashMessage(session, {
      type: MessageType.Success,
      text: `Branch "${validatedInput.data.branchName}" created successfully`,
    });
    const url = new URL(request.url);
    throw redirect(url.href, {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  } else {
    return json<ActionData>(validatedInput.error.flatten());
  }
};

type ActionData = z.inferFlattenedErrors<typeof CreateBranchInputSchema>;

const CreateBranchInputSchema = z.object({
  branchName: z.string().trim().min(1, "Branch name is required"),
});

export default function NewBranchRoute() {
  const actionData = useActionData<ActionData>();
  const transition = useTransition();
  const isSubmitting = transition.submission != null;
  return (
    <div className="lg:max-w-4xl mx-auto sm:px-5 lg:px-0">
      <div className="md:grid md:grid-cols-3 md:gap-6">
        <div className="md:col-span-1">
          <div className="px-4 sm:px-0">
            <h3 className="text-lg font-medium leading-6 text-stone-900">
              Add a new existing branch
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              This form will register a new branch, but won't trigger a deploy
              for it.
            </p>
          </div>
        </div>
        <div className="mt-5 md:mt-0 md:col-span-2">
          <Form method="post" reloadDocument>
            <div className="shadow sm:rounded-md sm:overflow-hidden">
              <div className="px-4 py-5 bg-white space-y-6 sm:p-6">
                <div className="grid grid-cols-3 gap-6">
                  <div className="col-span-3 sm:col-span-2">
                    <label
                      htmlFor="branchName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Branch name
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="branchName"
                        id="branchName"
                        className="shadow-sm focus:ring-blue-300 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="main"
                      />
                    </div>
                    {actionData?.fieldErrors.branchName && (
                      <p className="text-sm text-red-600 mt-1">
                        {actionData.fieldErrors.branchName}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 bg-stone-50 text-right sm:px-6">
                <button
                  type="submit"
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                  disabled={isSubmitting}
                >
                  Add branch
                </button>
              </div>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
