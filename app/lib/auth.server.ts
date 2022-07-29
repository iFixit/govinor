import { redirect } from "@remix-run/node";
import { ADMIN_PASSWORD, ADMIN_USERNAME } from "~/../config/env.server";

export interface Credentials {
  username: string;
  password: string;
}

export async function requireAuthorization(request: Request) {
  if (!isAuthorized(request)) {
    throw redirect("/login");
  }
}

export function isAuthorized(request: Request) {
  const credentials = getCredentials(request);
  return (
    credentials?.username === ADMIN_USERNAME &&
    credentials?.password === ADMIN_PASSWORD
  );
}

export function getCredentials(request: Request): Credentials | null {
  const authorization = request.headers.get("Authorization");
  if (authorization == null) {
    return null;
  }
  const [, base64] = authorization.split(" ");
  const [username, password] = Buffer.from(base64, "base64")
    .toString()
    .split(":");
  return { username, password };
}
