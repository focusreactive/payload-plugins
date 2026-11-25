import type { Payload } from "payload";
import { logError } from "./logError";

export async function failOpen<T>(
  payload: Payload,
  failure: string,
  run: () => T | Promise<T>
): Promise<T | undefined> {
  try {
    return await run();
  } catch (err) {
    logError(payload, failure, err);
    return undefined;
  }
}
