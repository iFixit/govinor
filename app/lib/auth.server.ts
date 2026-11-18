import { redirect } from "@remix-run/node";
import { createHash, timingSafeEqual } from "crypto";
import { ADMIN_PASSWORD, ADMIN_USERNAME } from "~/../config/env.server";

export interface Credentials {
  username: string;
  password: string;
}

/**
 * Call this first in every loader and action. Remix runs only the matched
 * route's loader or action for data requests and form posts, so a check in
 * the root loader alone does not protect them.
 */
export async function requireAuthorization(request: Request) {
  if (!isAuthorized(request)) {
    throw redirect("/login");
  }
}

export function isAuthorized(request: Request) {
  const credentials = getCredentials(request);
  if (credentials == null) {
    return false;
  }
  // Evaluate both so the response time doesn't reveal which one was wrong.
  const usernameMatches = safeEqual(credentials.username, ADMIN_USERNAME);
  const passwordMatches = safeEqual(credentials.password, ADMIN_PASSWORD);
  return usernameMatches && passwordMatches;
}

export function getCredentials(request: Request): Credentials | null {
  const authorization = request.headers.get("Authorization");
  const match = authorization?.match(/^Basic\s+(\S+)$/i);
  if (match == null) {
    return null;
  }
  const decoded = Buffer.from(match[1], "base64").toString();
  const separator = decoded.indexOf(":");
  if (separator === -1) {
    return null;
  }
  return {
    username: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
}

function safeEqual(a: string, b: string) {
  // Hash first so both buffers have the same length, as timingSafeEqual requires.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}
