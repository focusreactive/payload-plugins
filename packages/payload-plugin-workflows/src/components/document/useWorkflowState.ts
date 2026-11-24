"use client";

import { toast } from "@payloadcms/ui";
import { useCallback, useEffect, useRef, useState } from "react";

import { ENDPOINTS } from "../../constants.js";
import type { WorkflowState } from "../../server/queries.js";
import type { InstanceView, ViewAction, ViewActivity } from "../../types.js";
import { actionToast } from "../shared/format.js";
import { useWorkflowsApi } from "../shared/useWorkflowsApi.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";

/** The same workflow in a refetched state. */
const find = (next: WorkflowState | null, view: InstanceView) =>
  next?.instances.find((entry) => entry.id === view.id);

/**
 * The document's workflow state as the server reports it. Refetches when `refreshKey` changes
 * (the document was saved) and after every operation, whether it worked or not: no optimistic UI.
 * Every operation ends in a toast: what happened (from the refetched state), or the server's error,
 * and resolves to whether it worked.
 */
export const useWorkflowState = (collection: string, id: string, refreshKey: unknown) => {
  const api = useWorkflowsApi();
  const { t } = useWorkflowsT();
  const [state, setState] = useState<WorkflowState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const latest = useRef<AbortController | null>(null);

  const load = useCallback(async (): Promise<WorkflowState | null> => {
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
      return next;
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(caught instanceof Error ? caught.message : t("loadFailed"));
      }
      return null;
    }
  }, [api, collection, id, t]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey is the save signal
  useEffect(() => {
    void load();
    return () => latest.current?.abort();
  }, [load, refreshKey]);

  const run = useCallback(
    async (
      path: string,
      body: Record<string, unknown>,
      done: (next: WorkflowState | null) => string
    ): Promise<boolean> => {
      setBusy(true);
      let failed = false;
      try {
        await api(path, { body });
      } catch (caught) {
        failed = true;
        toast.error(caught instanceof Error ? caught.message : t("somethingWentWrong"));
      }
      const next = await load();
      if (!failed) {
        toast.success(done(next));
      }
      setBusy(false);
      return !failed;
    },
    [api, load, t]
  );

  return {
    state,
    error,
    busy,
    reload: load,
    start: (workflow: { name: string; title: string }) =>
      run(ENDPOINTS.start, { workflow: workflow.name, collection, id }, (next) => {
        const started = next?.instances.find(
          (entry) => entry.workflow === workflow.name && entry.status === "active"
        );
        return t("toastStarted", { title: workflow.title, stage: started?.stage.title ?? "" });
      }),
    fire: (
      view: InstanceView,
      activity: ViewActivity,
      action: ViewAction,
      params?: Record<string, unknown>
    ) =>
      run(
        ENDPOINTS.fire,
        {
          instanceId: view.id,
          activity: activity.name,
          action: action.name,
          ...(params ? { params } : {}),
        },
        (next) => actionToast(action.title, view, find(next, view), t)
      ),
    abort: (view: InstanceView, reason?: string) =>
      run(ENDPOINTS.abort, { instanceId: view.id, ...(reason ? { reason } : {}) }, () =>
        t("toastAborted", { title: view.title })
      ),
  };
};
