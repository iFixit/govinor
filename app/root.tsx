import {
  ErrorBoundaryComponent,
  LinksFunction,
  LoaderArgs,
  MetaFunction,
  json,
} from "@remix-run/node";
import {
  isRouteErrorResponse,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import { requireAuthorization } from "~/lib/auth.server";
import { commitSession, getSession } from "~/lib/session.server";
import { GlobalNotification } from "./components/global-notification";
import { DefaultLayout } from "./components/layout/default-layout";
import { getFlashMessage } from "./lib/flash";
import { findAllRepositories } from "./models/repository.server";
import styles from "./styles.css";

export type Loader = typeof loader;

export let loader = async ({ request }: LoaderArgs) => {
  await requireAuthorization(request);

  const session = await getSession(request.headers.get("Cookie"));
  const globalMessage = getFlashMessage(session);

  const repositories = await findAllRepositories();

  return json(
    { globalMessage, repositories },
    {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    }
  );
};

export let links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: styles }];
};

export const meta: MetaFunction<Loader> = () => {
  return { title: "Govinor" };
};

export default function App() {
  const { globalMessage, repositories } = useLoaderData<Loader>();
  return (
    <html lang="en" className="h-full bg-gray-900">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full">
        <DefaultLayout repositories={repositories}>
          <Outlet />
        </DefaultLayout>
        {globalMessage && (
          <GlobalNotification
            type={globalMessage.type}
            message={globalMessage.text}
            dismissAfter={5000}
          />
        )}
        <ScrollRestoration />
        <Scripts />
        {process.env.NODE_ENV === "development" && <LiveReload />}
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  console.error(error);
  let statusCode: number = 500;
  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
  }
  return (
    <html lang="en" className="h-full bg-gray-900">
      <head>
        <title>Oh no!</title>
        <Meta />
        <Links />
      </head>
      <body className="h-full">
        <main className="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
          <div className="text-center">
            {statusCode && (
              <p className="text-base font-semibold text-indigo-600">
                {statusCode}
              </p>
            )}
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Ops, something not working 😬
            </h1>
            <p className="mt-6 text-base leading-7 text-gray-500">
              Don't panic. Please try to reload the page.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <button
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onClick={() => window.location.reload()}
              >
                Reload page
              </button>
              <a
                href="/"
                className="text-sm font-semibold text-white hover:underline"
              >
                Take me back home
              </a>
            </div>
          </div>
        </main>
        <Scripts />
      </body>
    </html>
  );
}
