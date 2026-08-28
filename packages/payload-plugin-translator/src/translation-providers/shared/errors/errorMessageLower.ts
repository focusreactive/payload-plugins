import { isObject } from "../../../core/kernel/utils/isObject";

export function errorMessageLower(cause: unknown): string | null {
  if (!isObject(cause)) return null;

  const message = cause.message;
  return typeof message === "string" ? message.toLowerCase() : null;
}
