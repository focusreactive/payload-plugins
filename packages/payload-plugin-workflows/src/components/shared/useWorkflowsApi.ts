"use client";

import { useConfig } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";
import { useCallback } from "react";

type Query = Record<string, string | number | undefined>;

/** The server's message from Payload's error shape `{ errors: [{ message }] }`. */
const messageOf = (body: unknown): string | undefined => {
  const errors = (body as { errors?: { message?: unknown }[] } | null)?.errors;
  const message = Array.isArray(errors) ? errors[0]?.message : undefined;
  return typeof message === "string" && message ? message : undefined;
};

/**
 * The one way the admin UI talks to the plugin's endpoints. Resolves with the JSON body, rejects
 * with an `Error` carrying the server's message (shown with `toast.error`).
 */
export const useWorkflowsApi = () => {
  const {
    config: {
      routes: { api: apiRoute },
    },
  } = useConfig();
  return useCallback(
    async <R>(
      path: string,
      options: { query?: Query; body?: unknown; signal?: AbortSignal } = {}
    ): Promise<R> => {
      const search = new URLSearchParams();
      for (const [key, value] of Object.entries(options.query ?? {})) {
        if (value !== undefined && value !== "") {
          search.set(key, String(value));
        }
      }
      const url = formatAdminURL({
        apiRoute,
        path: `${path}${search.size > 0 ? `?${search}` : ""}` as `/${string}`,
      });
      const response = await fetch(url, {
        method: options.body === undefined ? "GET" : "POST",
        credentials: "include",
        headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal,
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(messageOf(body) ?? (response.statusText || `HTTP ${response.status}`));
      }
      return body as R;
    },
    [apiRoute]
  );
};
