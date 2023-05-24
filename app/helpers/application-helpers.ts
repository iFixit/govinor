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

export const isNonEmptyString = (value: any): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

export const isNonEmptyArray = <T>(value: T | null | undefined): value is T => {
  return Array.isArray(value) && value.length > 0;
};

export const isNonEmptyObject = <T>(
  value: T | null | undefined
): value is T => {
  return (
    value != null && typeof value === "object" && Object.keys(value).length > 0
  );
};

export const isBlank = (value: any): boolean => {
  return !isPresent(value);
};

export const presentOrDefault = <T>(
  value: T | undefined | null,
  defaultValue: T
): T => {
  return isPresent(value) ? value : defaultValue;
};
