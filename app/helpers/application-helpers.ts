import { json } from "remix";

export function assertNever(value: never): never {
  throw new Error(`Unexpected value should never occur: ${value}`);
}

export const badRequest = <ActionData = any>(data: ActionData) =>
  json(data, { status: 400 });
