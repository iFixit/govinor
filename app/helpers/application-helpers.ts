import { json } from "@remix-run/node";

export function assertNever(value: never): never {
  throw new Error(`Unexpected value should never occur: ${value}`);
}

export const badRequest = <ActionData = any>(data: ActionData) =>
  json(data, { status: 400 });

export function isPresent<T>(value: T | null | undefined): value is T {
  if (value == null) return false;

  if (typeof value === "string") return value.trim().length > 0;

  if (Array.isArray(value)) return value.length > 0;

  return true;
}
