import { json, LoaderFunction, redirect } from "@remix-run/node";
import { isAuthorized } from "~/lib/auth.server";

export const loader: LoaderFunction = async ({ request }) => {
  if (isAuthorized(request)) {
    return redirect("/");
  }
  return json("Not authorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": "Basic",
    },
  });
};
