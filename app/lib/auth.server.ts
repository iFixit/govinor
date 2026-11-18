import { json, redirect } from "@remix-run/node";
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
 *
 * It also rejects state-changing requests sent from other sites. Browsers
 * resend saved Basic auth credentials on cross-site form posts, so a valid
 * password alone doesn't show the admin meant to make the request.
 */
export async function requireAuthorization(request: Request) {
  if (!isAuthorized(request)) {
    throw redirect("/login");
  }
  if (!isSameOriginRequest(request)) {
    throw json({ message: "Cross-site request rejected" }, 403);
  }
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Whether a request came from Govinor's own pages. Safe methods always pass.
 *
 * "same-site" is rejected along with "cross-site": previews run arbitrary
 * branch code on subdomains of the deploy domain, which count as the same site.
 */
export function isSameOriginRequest(request: Request) {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return true;
  }
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  if (fetchSite != null) {
    return fetchSite === "same-origin" || fetchSite === "none";
  }
  const origin = request.headers.get("Origin");
  if (origin != null) {
    // Compare hosts only: behind Caddy the request URL is http, the origin https.
    try {
      return new URL(origin).host === new URL(request.url).host;
    } catch {
      return false; // Includes the opaque origin "null".
    }
  }
  // Browsers send Origin on every cross-site POST, so a request with neither
  // header didn't come from another site's page (e.g. curl).
  return true;
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
