"use client";

import "./WorkflowPanel.css";

import { Button, useAuth, useDocumentInfo } from "@payloadcms/ui";

import type { People } from "../shared/format.js";
import type { WorkflowsClientProps } from "../shared/types.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";
import { ActiveRun } from "./ActiveRun.js";
import { FinishedRun } from "./FinishedRun.js";
import { useWorkflowState } from "./useWorkflowState.js";

const PanelBody = ({
  endpoints,
  collection,
  id,
  refreshKey,
}: Pick<WorkflowsClientProps, "endpoints"> & {
  collection: string;
  id: string;
  refreshKey: unknown;
}) => {
  const { t } = useWorkflowsT();
  const { user } = useAuth();
  const { state, error, busy, reload, start, fire, abort } = useWorkflowState(
    endpoints,
    collection,
    id,
    refreshKey
  );

  if (!state) {
    return (
      <div className="workflows-panel" data-loading={!error}>
        <span className="field-label">{t("panelLabel")}</span>
        {error ? (
          <div className="workflows-notice" data-tone="error" role="alert">
            <span className="workflows-notice__body">{error}</span>
            <Button
              buttonStyle="secondary"
              margin={false}
              onClick={() => void reload()}
              size="small"
            >
              {t("retry")}
            </Button>
          </div>
        ) : (
          <p className="field-description">{t("loading")}</p>
        )}
      </div>
    );
  }

  const active = state.instances.filter((view) => view.status === "active");
  // `instances` is newest first, so the first finished one is the latest.
  const finished =
    active.length === 0 ? state.instances.find((view) => view.status !== "active") : undefined;
  if (active.length === 0 && !finished && state.available.length === 0) {
    return null;
  }
  const peopleOf = (labels: Record<string, string> | undefined): People => ({
    me: user ? String(user.id) : undefined,
    labels,
  });

  return (
    <div aria-busy={busy} className="workflows-panel">
      <span className="field-label">{t("panelLabel")}</span>
      {active.map((view) => (
        <ActiveRun
          busy={busy}
          key={view.id ?? view.workflow}
          onAbort={() => abort(view.id ?? "")}
          onFire={(activity, action, params) => fire(view.id ?? "", activity, action, params)}
          people={peopleOf(view.userLabels)}
          view={view}
        />
      ))}
      {finished ? <FinishedRun people={peopleOf(finished.userLabels)} view={finished} /> : null}
      {state.available.length > 0 ? (
        <div className="workflows-panel__start">
          {state.available.map((def) => (
            <div className="workflows-panel__start-item" key={def.name}>
              <Button
                buttonStyle="secondary"
                disabled={busy}
                margin={false}
                onClick={() => void start(def.name)}
                size="small"
              >
                {t("start", { title: def.title })}
              </Button>
              {def.description ? <p className="field-description">{def.description}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

/**
 * The sidebar `ui` field on every subject document. Hidden until the document has an id; refetches
 * whenever the document is saved (`lastUpdateTime` moves on save, autosave and publish).
 */
export const WorkflowPanel = ({ endpoints }: Partial<WorkflowsClientProps>) => {
  const { id, collectionSlug, lastUpdateTime } = useDocumentInfo();
  if (id === undefined || id === null || id === "" || !collectionSlug || !endpoints) {
    return null;
  }
  return (
    <PanelBody
      collection={collectionSlug}
      endpoints={endpoints}
      id={String(id)}
      refreshKey={lastUpdateTime}
    />
  );
};
