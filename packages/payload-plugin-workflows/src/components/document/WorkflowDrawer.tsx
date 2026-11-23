"use client";

import "./WorkflowDrawer.css";

import { Button } from "@payloadcms/ui";

import type { WorkflowState } from "../../server/queries.js";
import type { People } from "../shared/format.js";
import { runsOf } from "../shared/indicator.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";
import { ActiveRun } from "./ActiveRun.js";
import { FinishedRun } from "./FinishedRun.js";
import type { useWorkflowState } from "./useWorkflowState.js";

type Controls = ReturnType<typeof useWorkflowState>;

interface Props extends Pick<
  Controls,
  "state" | "error" | "busy" | "reload" | "start" | "fire" | "abort"
> {
  people: People;
}

const StartItem = ({
  def,
  busy,
  start,
}: {
  def: WorkflowState["available"][number];
  busy: boolean;
  start: Controls["start"];
}) => {
  const { t } = useWorkflowsT();
  return (
    <div className="workflows-drawer__start-item">
      <Button
        buttonStyle="secondary"
        disabled={busy}
        margin={false}
        onClick={() => void start(def.name)}
        size="medium"
      >
        {t("start", { title: def.title })}
      </Button>
      {def.description ? <p className="field-description">{def.description}</p> : null}
    </div>
  );
};

const StartList = ({
  available,
  busy,
  heading,
  start,
}: {
  available: WorkflowState["available"];
  busy: boolean;
  heading: string;
  start: Controls["start"];
}) => (
  <section aria-label={heading} className="workflows-drawer__start">
    <h3 className="workflows-section-title">{heading}</h3>
    {available.map((def) => (
      <StartItem busy={busy} def={def} key={def.name} start={start} />
    ))}
  </section>
);

/**
 * What the workflow drawer holds: the active runs (the one waiting on the reader first), else the
 * latest finished run, then what may be started. It stays open across actions and shows the new
 * state; the state itself lives in the indicator.
 */
export const WorkflowDrawerBody = ({
  state,
  error,
  busy,
  reload,
  start,
  fire,
  abort,
  people,
}: Props) => {
  const { t } = useWorkflowsT();
  if (!state) {
    return (
      <div className="workflows-drawer">
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
  const runs = runsOf(state, people.me);
  const { active } = runs;
  const finished = active.length === 0 ? runs.finished : undefined;
  return (
    <div aria-busy={busy} className="workflows-drawer">
      {error ? (
        <div className="workflows-notice" data-tone="error" role="alert">
          <span className="workflows-notice__body">{error}</span>
        </div>
      ) : null}
      {active.map((view) => (
        <ActiveRun
          busy={busy}
          key={view.id ?? view.workflow}
          onAbort={() => abort(view.id ?? "")}
          onFire={(activity, action, params) => fire(view.id ?? "", activity, action, params)}
          people={people}
          view={view}
        />
      ))}
      {finished ? <FinishedRun people={people} view={finished} /> : null}
      {state.available.length > 0 ? (
        <StartList
          available={state.available}
          busy={busy}
          heading={active.length > 0 || finished ? t("startOther") : t("startHeading")}
          start={start}
        />
      ) : null}
    </div>
  );
};
