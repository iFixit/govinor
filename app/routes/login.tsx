import { json, LoaderFunctionArgs, redirect } from "@remix-run/node";
import { isAuthorized } from "~/lib/auth.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
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
