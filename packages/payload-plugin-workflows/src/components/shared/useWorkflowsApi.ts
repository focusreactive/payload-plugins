"use client";

import { useAuth, useConfig } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";
import { useCallback, useEffect, useState } from "react";

import type { People } from "./format.js";

type Query = Record<string, string | number | undefined>;

/** The server's message from Payload's error shape `{ errors: [{ message }] }`. */
const messageOf = (body: unknown): string | undefined => {
  const errors = (body as { errors?: { message?: unknown }[] } | null)?.errors;
  const message = Array.isArray(errors) ? errors[0]?.message : undefined;
  return typeof message === "string" && message ? message : undefined;
};

/**
 * The one way the admin UI talks to the API. Resolves with the JSON body, rejects with an `Error`
 * carrying the server's message (shown with `toast.error`).
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

/**
 * Names for user ids: the signed-in user, and display names (the user collection's `useAsTitle`,
 * else the email) read over the REST API with the viewer's own access. Ids the viewer may not
 * read stay ids.
 */
export const usePeople = (ids: string[]): People => {
  const api = useWorkflowsApi();
  const { user } = useAuth();
  const { config, getEntityConfig } = useConfig();
  const slug = config.admin.user;
  const titleField = getEntityConfig({ collectionSlug: slug })?.admin?.useAsTitle;
  const wanted = [...new Set(ids)].filter(Boolean).sort().join(",");
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!wanted) {
      return;
    }
    const controller = new AbortController();
    const load = async () => {
      try {
        const body = await api<{ docs: Record<string, unknown>[] }>(`/${slug}`, {
          query: { "where[id][in]": wanted, depth: 0, limit: wanted.split(",").length },
          signal: controller.signal,
        });
        const next: Record<string, string> = {};
        for (const doc of body.docs) {
          const label = [titleField && titleField !== "id" ? doc[titleField] : undefined, doc.email]
            .filter((value): value is string => typeof value === "string" && value.trim() !== "")
            .at(0);
          if (label) {
            next[String(doc.id)] = label;
          }
        }
        setLabels(next);
      } catch {
        // Unreadable users stay ids.
      }
    };
    void load();
    return () => controller.abort();
  }, [api, slug, titleField, wanted]);

  return { me: user ? String(user.id) : undefined, labels };
};
