import { json, LoaderArgs, redirect } from "@remix-run/node";
import { isAuthorized } from "~/lib/auth.server";

export const loader = async ({ request }: LoaderArgs) => {
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
