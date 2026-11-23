"use client";

import { toast } from "@payloadcms/ui";
import { useCallback, useEffect, useRef, useState } from "react";

import { ENDPOINTS } from "../../constants.js";
import type { WorkflowState } from "../../server/queries.js";
import { useWorkflowsApi } from "../shared/useWorkflowsApi.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";

/**
 * The document's workflow state as the server reports it. Refetches when `refreshKey` changes
 * (the document was saved) and after every operation, whether it worked or not: no optimistic UI.
 */
export const useWorkflowState = (collection: string, id: string, refreshKey: unknown) => {
  const api = useWorkflowsApi();
  const { t } = useWorkflowsT();
  const [state, setState] = useState<WorkflowState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const latest = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    latest.current?.abort();
    const controller = new AbortController();
    latest.current = controller;
    try {
      const next = await api<WorkflowState>(ENDPOINTS.state, {
        query: { collection, id },
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setState(next);
        setError(null);
      }
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(caught instanceof Error ? caught.message : t("loadFailed"));
      }
    }
  }, [api, collection, id, t]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is the save signal
  useEffect(() => {
    void load();
    return () => latest.current?.abort();
  }, [load, refreshKey]);

  const run = useCallback(
    async (path: string, body: Record<string, unknown>) => {
      setBusy(true);
      try {
        await api(path, { body });
      } catch (caught) {
        toast.error(caught instanceof Error ? caught.message : t("somethingWentWrong"));
      }
      await load();
      setBusy(false);
    },
    [api, load, t]
  );

  return {
    state,
    error,
    busy,
    reload: load,
    start: (workflow: string) => run(ENDPOINTS.start, { workflow, collection, id }),
    fire: (
      instanceId: string,
      activity: string,
      action: string,
      params?: Record<string, unknown>
    ) => run(ENDPOINTS.fire, { instanceId, activity, action, ...(params ? { params } : {}) }),
    abort: (instanceId: string) => run(ENDPOINTS.abort, { instanceId }),
  };
};
