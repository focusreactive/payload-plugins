import { APIError } from "payload";

/** A 400 whose message reaches the caller as it is written. */
export const badRequest = (message: string): APIError => new APIError(message, 400, null, true);
