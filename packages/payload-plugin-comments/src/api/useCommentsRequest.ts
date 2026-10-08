"use client";

import { useCallback } from "react";
import { useConfig } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";
import type { Response } from "../types";
import { getDefaultErrorMessage } from "../utils/error/getDefaultErrorMessage";

function isServiceResponse<TData>(value: unknown): value is Response<TData> {
  return typeof value === "object" && value !== null && "success" in value;
}

export function useCommentsRequest() {
  const {
    config: {
      routes: { api: apiRoute },
    },
  } = useConfig();

  return useCallback(
    async <TArgs, TData>(path: `/${string}`, args: TArgs): Promise<Response<TData>> => {
      try {
        const res = await fetch(formatAdminURL({ apiRoute, path }), {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(args),
        });
        const body: unknown = await res.json().catch(() => null);

        if (isServiceResponse<TData>(body)) return body;

        return { success: false, error: res.statusText || `Request failed with ${res.status}` };
      } catch (err) {
        return { success: false, error: getDefaultErrorMessage(err) };
      }
    },
    [apiRoute]
  );
}
