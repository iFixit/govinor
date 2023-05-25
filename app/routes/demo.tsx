import { ActionArgs, LoaderArgs, redirect } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import fs from "fs/promises";
import { flashMessage, MessageType } from "~/lib/flash";
import { ConsoleLogger } from "~/lib/logger";
import { commitSession, getSession } from "~/lib/session.server";
import { Shell } from "~/lib/shell.server";
import { cloneRepoWithDeployKey } from "~/models/commands/clone-repo-with-deploy-key";
import { findRepository } from "~/models/repository.server";

export let loader = async ({ params }: LoaderArgs) => {
  return {
    knownHosts: await getKnownHosts(),
  };
};

async function getKnownHosts(): Promise<string> {
  const knownHostsPath = `${process.env.HOME}/.ssh/known_hosts`;
  try {
    const knownHostsContent = await fs.readFile(knownHostsPath, "utf-8");
    return knownHostsContent;
  } catch (error) {
    return `Error reading known_hosts file: ${error}`;
  }
}

export const action = async ({ request, params }: ActionArgs) => {
  const formData = await request.formData();
  // const input = Object.fromEntries(formData.entries());
  const repoFullName = formData.get("repo");
  if (typeof repoFullName !== "string") {
    const session = await getSession(request.headers.get("Cookie"));
    flashMessage(session, {
      type: MessageType.Error,
      text: `Invalid repo name`,
    });
    const url = new URL(request.url);
    throw redirect(url.href, {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }
  const logger = new ConsoleLogger();
  const shell = new Shell(logger);

  const repository = await findRepository({
    fullName: repoFullName,
  });

  if (!repository) {
    return new Response("Repository not found", {
      status: 404,
    });
  }

  await shell.run(
    cloneRepoWithDeployKey({
      repository,
      branchName: "main",
      path: "main",
    })
  );
  return null;
};

export default function DemoPage() {
  const { knownHosts } = useLoaderData<typeof loader>();
  return (
    <div className="max-w-4xl mx-auto px-8">
      <header className="py-8">
        <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Demo
        </h2>
      </header>

      <div className="bg-gray-700/20 rounded-lg p-2 text-white mb-8">
        <code className="whitespace-pre-wrap break-all">{knownHosts}</code>
      </div>

      <main className="">
        <Form method="post">
          <div className="max-w-md flex rounded-md bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500">
            <input
              type="text"
              name="repo"
              id="repo"
              className="flex-1 border-0 bg-transparent py-1.5 text-white focus:ring-0 sm:text-sm sm:leading-6"
              placeholder="iFixit/ifixit"
              defaultValue="dhmacs/fjsp-solver"
            />
          </div>
          <button
            type="submit"
            className="mt-4 rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            Clone Repo
          </button>
        </Form>
      </main>
    </div>
  );
}
