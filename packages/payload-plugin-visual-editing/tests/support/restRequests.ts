import type { Payload } from "payload";

import { handleEndpoints } from "payload";

export const API_URL = "http://cms.example/api";

export type Rest = (path: string, init?: RequestInit) => Promise<Response>;

export const restOf =
  (payload: Payload, payloadInstanceCacheKey: string): Rest =>
  (path, init) =>
    handleEndpoints({
      config: payload.config,
      payloadInstanceCacheKey,
      request: new Request(`${API_URL}${path}`, init),
    });

export const postOfJson = (body: unknown, headers: Headers = new Headers()): RequestInit => ({
  body: JSON.stringify(body),
  headers,
  method: "POST",
});
