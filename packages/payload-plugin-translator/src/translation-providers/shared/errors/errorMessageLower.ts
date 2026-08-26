import { isObject } from "../../../core/kernel/utils/isObject";

/**
 * The message of an unknown throw, lowercased, or `null` when there is none to read.
 */
export function errorMessageLower(cause: unknown): string | null {
  if (!isObject(cause)) return null;

  const message = cause.message;
  return typeof message === "string" ? message.toLowerCase() : null;
}
