import type { Payload } from "payload";
import { LOG_PREFIX } from "../constants";

export function logError(payload: Payload, message: string, err: unknown): void {
  payload.logger.error({ err, msg: `${LOG_PREFIX} ${message}` });
}
