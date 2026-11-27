import { ofetch } from "ofetch";
import type { $Fetch, FetchContext } from "ofetch";

import { ApiRequestError } from "./errors/ApiRequestError.js";
import type { ApiRequestErrorReason } from "./errors/ApiRequestError.js";

/** The one way the admin talks to the plugin's routes; every failure rejects with `ApiRequestError`. */
export type ApiRequest = $Fetch;

/** Relative to the admin's origin, e.g. `/api/translate`. */
export type ApiBase = string;

export const REQUEST_TIMEOUT_MS = 15_000;

export type CreateRequestOptions = {
  baseURL: ApiBase;
  fetch?: typeof globalThis.fetch;
};

const ABORTED = new Set(["TimeoutError", "AbortError"]);

function reasonOfStatus(status: number): ApiRequestErrorReason {
  if (status === 401 || status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 429) return "busy";
  if (status >= 500) return "server";
  return "rejected";
}

function failureOf({ error, response }: FetchContext): ApiRequestError {
  if (!response) {
    const reason = error && ABORTED.has(error.name) ? "timeout" : "network";
    return new ApiRequestError(reason, error?.message ?? "The request did not reach the server");
  }

  const body: unknown = response._data;
  const fields = typeof body === "object" && body !== null ? body : {};
  const message =
    "message" in fields && typeof fields.message === "string"
      ? fields.message
      : `The server answered ${response.status}`;
  const details = "details" in fields && Array.isArray(fields.details) ? fields.details : undefined;
  return new ApiRequestError(reasonOfStatus(response.status), message, {
    status: response.status,
    details,
  });
}

/** A proxy's login page or an HTML error page answers 200 too; only JSON is the plugin's own. */
function isUnreadable({ response }: FetchContext): boolean {
  if (!response?.ok || response._data === undefined) return false;
  return !(response.headers.get("content-type") ?? "").includes("json");
}

export function createRequest({ baseURL, fetch }: CreateRequestOptions): ApiRequest {
  return ofetch.create(
    {
      baseURL,
      credentials: "include",
      timeout: REQUEST_TIMEOUT_MS,
      onRequestError: (context) => {
        throw failureOf(context);
      },
      onResponseError: (context) => {
        throw failureOf(context);
      },
      onResponse: (context) => {
        if (isUnreadable(context)) {
          throw new ApiRequestError("server", "The server answered something other than JSON", {
            status: context.response?.status,
          });
        }
      },
    },
    fetch ? { fetch } : {}
  );
}
