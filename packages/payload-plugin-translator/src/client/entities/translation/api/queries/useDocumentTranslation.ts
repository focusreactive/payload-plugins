import { useQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import type { CollectionSlug } from "payload";
import { useEffect, useRef } from "react";

import { useTranslateKitConfig } from "../../../../shared/config/index.js";
import { handleNextApiError } from "../../../../shared/api/handleApiError.js";
import type { DocumentTranslation } from "../../model/types.js";
import { translationKeys } from "../../queries/translationKeys.js";
import { useRefreshTranslation } from "../../queries/useRefreshTranslation.js";

type Props = {
  collection: CollectionSlug;
  id: string;
};

type Options = {
  enabled?: boolean;
};

const POLLING_INTERVAL_MILLISECONDS = 20000; // 20 sec

export function useDocumentTranslation({ collection, id }: Props, options?: Options) {
  const refresh = useRefreshTranslation();
  const { basePath } = useTranslateKitConfig();

  const query = useQuery<DocumentTranslation[], Error, DocumentTranslation[]>({
    queryKey: translationKeys.legacy.documentStatus(collection, id),
    queryFn: async ({ signal }) => {
      return handleNextApiError(async () => {
        const response = await ofetch<{ data: DocumentTranslation[] }>(
          `/api${basePath}/document/${collection}/${id}`,
          {
            method: "get",
            signal,
          }
        );

        // Normalize to an array defensively: a stale admin tab from before the object→array response
        // change (deploy skew) would otherwise feed a non-array here and break the polling callback.
        return Array.isArray(response.data) ? response.data : [];
      });
    },
    enabled: options?.enabled,
    // Keep polling while any locale's job is still in flight; stop once every job is terminal.
    refetchInterval: (query) => {
      const active = (query.state.data ?? []).some(
        (job) => job.status === "pending" || job.status === "running"
      );
      return active ? POLLING_INTERVAL_MILLISECONDS : false;
    },
  });

  // When a queued (async) translation transitions to "completed" in-session, the provenance
  // record's sourceFingerprint has just been updated server-side — invalidate staleness so the
  // "Out of date" notice clears without waiting for the next focus/remount refetch (#50).
  // Tracked as a *set* of completed target locales (the feed is now per-locale): fire whenever a
  // locale newly reaches "completed". The snapshot is tagged with the document key and reset when
  // the document changes, so a cold mount of an already-completed document — or navigating to a
  // different document within the same component instance — does NOT fire a spurious extra refetch.
  const docKey = `${collection}:${id}`;
  const previousCompletedRef = useRef<{ docKey: string; locales: Set<string> } | undefined>(
    undefined
  );
  useEffect(() => {
    const jobs = query.data;
    if (!jobs) return;
    const completed = new Set(
      jobs.filter((job) => job.status === "completed").map((job) => job.input.target_lng)
    );
    const previous = previousCompletedRef.current;
    const sameDoc = previous?.docKey === docKey;
    if (sameDoc && [...completed].some((locale) => !previous.locales.has(locale))) {
      void refresh(translationKeys.legacy.everyStaleness);
    }
    previousCompletedRef.current = { docKey, locales: completed };
  }, [query.data, refresh, docKey]);

  return query;
}
