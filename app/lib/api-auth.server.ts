import { json } from "@remix-run/node";
import crypto from "crypto";
import { GOVINOR_API_TOKEN } from "~/../config/env.server";

/**
 * Throws a JSON response unless the request carries the API's bearer token.
 * CI uses this token instead of the dashboard login; every /api route calls
 * this first.
 */
export function requireApiToken(
  request: Request,
  expectedToken = GOVINOR_API_TOKEN
) {
  if (!expectedToken) {
    throw json({ message: "API token is not configured" }, 503);
  }
  const header = request.headers.get("Authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  // Compare digests so the check takes the same time for any token length.
  if (!crypto.timingSafeEqual(digest(token), digest(expectedToken))) {
    throw json({ message: "Unauthorized" }, 401);
  }
}

function digest(value: string) {
  return crypto.createHash("sha256").update(value).digest();
}
