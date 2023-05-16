import {
  ErrorBoundaryComponent,
  LinksFunction,
  LoaderFunction,
  MetaFunction,
  json,
} from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { requireAuthorization } from "~/lib/auth.server";
import { commitSession, getSession } from "~/lib/session.server";
import { GlobalNotification } from "./components/global-notification";
import { DefaultLayout } from "./components/layout/default-layout";
import { Message, getFlashMessage } from "./lib/flash";
import styles from "./styles.css";

export let links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: styles }];
};
export const meta: MetaFunction = () => {
  return { title: "Govinor" };
};

type LoaderData = {
  globalMessage: Message | null;
};

export let loader: LoaderFunction = async ({ request }) => {
  await requireAuthorization(request);

  const session = await getSession(request.headers.get("Cookie"));
  const globalMessage = getFlashMessage(session);

  return json<LoaderData>(
    { globalMessage },
    {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    }
  );
};

export default function App() {
  const { globalMessage } = useLoaderData<LoaderData>();
  return (
    <html lang="en" className="h-full bg-gray-900">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="h-full">
        <DefaultLayout>
          <Outlet />
        </DefaultLayout>
        {globalMessage && (
          <GlobalNotification
            type={globalMessage.type}
            message={globalMessage.text}
            dismissAfter={2000}
          />
        )}
        <ScrollRestoration />
        <Scripts />
        {process.env.NODE_ENV === "development" && <LiveReload />}
      </body>
    </html>
  );
}

export const ErrorBoundary: ErrorBoundaryComponent = ({ error }) => {
  console.error(error);
  return (
    <html lang="en" className="h-full bg-gray-900">
      <head>
        <title>Oh no!</title>
        <Meta />
        <Links />
      </head>
      <body>
        <DefaultLayout>
          <div className="bg-red-100 w-[500px] py-10 mx-auto text-center">
            <h1 className="text-4xl leading-tight font-bold">
              Oh no! The app crashed :(
            </h1>
          </div>
        </DefaultLayout>
        <Scripts />
      </body>
    </html>
  );
};
