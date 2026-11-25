"use client";

import "./WorkflowDrawer.css";

import {
  Banner,
  Button,
  ConfirmationModal,
  Gutter,
  Popup,
  PopupList,
  ShimmerEffect,
  TextareaInput,
  XIcon,
  useModal,
} from "@payloadcms/ui";
import { useId, useState } from "react";
import type { ReactNode } from "react";

import type { WorkflowState } from "../../server/queries.js";
import type { InstanceView, ViewAction, ViewActivity } from "../../types.js";
import type { People } from "../shared/format.js";
import { publishNoteOf, runsOf } from "../shared/indicator.js";
import type { PublishNote } from "../shared/indicator.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";
import { HistoryList } from "./HistoryList.js";
import { RunFacts } from "./RunFacts.js";
import { PublishLine, RunMain, StartAgain } from "./RunMain.js";
import type { PendingAction } from "./RunMain.js";
import { StageStepper } from "./StageStepper.js";
import type { useWorkflowState } from "./useWorkflowState.js";

type Controls = ReturnType<typeof useWorkflowState>;
type Available = WorkflowState["available"][number];

interface Props extends Pick<
  Controls,
  "state" | "error" | "busy" | "reload" | "start" | "fire" | "abort"
> {
  people: People;
  drawerSlug: string;
}

interface MenuItem {
  key: string;
  label: string;
  onClick: () => void;
}

/**
 * The drawer's header, as Payload's document drawer draws it: one title, a divider under it, the
 * close button, and the rare actions (stop, start another) in a "⋮" menu beside it.
 */
const Header = ({
  title,
  menu,
  busy,
  onClose,
}: {
  title: string;
  menu: MenuItem[];
  busy: boolean;
  onClose: () => void;
}) => {
  const { t } = useWorkflowsT();
  return (
    <Gutter className="doc-drawer__header workflows-drawer__header">
      <div className="doc-drawer__header-content">
        <h2 className="doc-drawer__header-text">{title}</h2>
        <div className="workflows-drawer__header-actions">
          {menu.length > 0 ? (
            <Popup
              button={
                <div className="doc-controls__dots">
                  <div />
                  <div />
                  <div />
                  <span className="workflows-sr-only">{t("moreActions")}</span>
                </div>
              }
              className="workflows-drawer__menu"
              disabled={busy}
              horizontalAlign="right"
              render={({ close }) => (
                <PopupList.ButtonGroup>
                  {menu.map((item) => (
                    <PopupList.Button
                      key={item.key}
                      onClick={() => {
                        close();
                        item.onClick();
                      }}
                    >
                      {item.label}
                    </PopupList.Button>
                  ))}
                </PopupList.ButtonGroup>
              )}
              size="large"
              verticalAlign="bottom"
            />
          ) : null}
          <button
            aria-label={t("close")}
            className="doc-drawer__header-close"
            onClick={onClose}
            type="button"
          >
            <XIcon />
          </button>
        </div>
      </div>
    </Gutter>
  );
};

/**
 * Payload's document edit layout: a main column and a sidebar behind a divider, stacking into one
 * column on narrow screens. The same classes, so it moves with Payload's breakpoints and gutters.
 */
const Layout = ({ main, sidebar }: { main: ReactNode; sidebar: ReactNode }) => (
  <div className="document-fields document-fields--has-sidebar workflows-drawer__layout">
    <div className="document-fields__main">
      <Gutter className="document-fields__edit">
        <div className="workflows-drawer__main">{main}</div>
      </Gutter>
    </div>
    <div className="document-fields__sidebar-wrap">
      <div className="document-fields__sidebar">
        <div className="document-fields__sidebar-fields workflows-drawer__sidebar">{sidebar}</div>
      </div>
    </div>
  </div>
);

const previewStages = (def: Available) =>
  def.stages.map((stage) => ({ ...stage, state: "unvisited" as const }));

/** Nothing running: what the workflow is, its stages, one primary Start (or a choice of them). */
const StartPanel = ({
  available,
  busy,
  start,
  publish,
}: {
  available: Available[];
  busy: boolean;
  start: Controls["start"];
  publish?: PublishNote;
}) => {
  const { t } = useWorkflowsT();
  const [only] = available;
  if (available.length === 1 && only) {
    return (
      <>
        <PublishLine note={publish} />
        {only.description ? <p className="workflows-lead">{only.description}</p> : null}
        <StageStepper stages={previewStages(only)} />
        <div className="workflows-actions">
          <Button
            buttonStyle="primary"
            disabled={busy}
            margin={false}
            onClick={() => void start(only)}
            size="medium"
          >
            {t("startWorkflow")}
          </Button>
        </div>
        {only.stages[0] ? (
          <p className="field-description">{t("startHint", { stage: only.stages[0].title })}</p>
        ) : null}
      </>
    );
  }
  return (
    <>
      <PublishLine note={publish} />
      {available.length > 0 ? <p className="workflows-lead">{t("startChoose")}</p> : null}
      <ul className="workflows-choices">
        {available.map((def) => (
          <li className="workflows-choice" key={def.name}>
            <div className="workflows-choice__text">
              <h3 className="workflows-choice__title">{def.title}</h3>
              {def.description ? <p className="field-description">{def.description}</p> : null}
              <StageStepper stages={previewStages(def)} />
            </div>
            <Button
              buttonStyle="secondary"
              disabled={busy}
              margin={false}
              onClick={() => void start(def)}
              size="medium"
            >
              {t("start", { title: def.title })}
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
};

/** Payload's loading look: shimmer blocks where the stepper, the turn line and buttons will be. */
const Loading = () => {
  const { t } = useWorkflowsT();
  return (
    <div aria-busy="true" aria-label={t("loading")} className="workflows-loading" role="status">
      <ShimmerEffect height={28} />
      <ShimmerEffect height={20} width="40%" />
      <ShimmerEffect height={20} width="70%" />
      <ShimmerEffect height={40} width={240} />
    </div>
  );
};

/**
 * Everything the workflow drawer shows: the document's workflow (the one waiting on the reader
 * first, a tab per workflow when several run), else the latest finished one, else what may be
 * started. It stays open across actions and shows the new state.
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
  drawerSlug,
}: Props) => {
  const { t } = useWorkflowsT();
  const { openModal, closeModal } = useModal();
  const idPrefix = useId();
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [reason, setReason] = useState("");
  const abortSlug = "workflow-abort";
  const close = () => closeModal(drawerSlug);

  if (!state) {
    return (
      <div className="workflows-drawer">
        <Header busy={busy} menu={[]} onClose={close} title={t("drawerTitle")} />
        <Layout
          main={
            error ? (
              <Banner className="workflows-banner" type="error">
                <span className="workflows-banner__row">
                  {error}
                  <Button
                    buttonStyle="secondary"
                    margin={false}
                    onClick={() => void reload()}
                    size="small"
                  >
                    {t("retry")}
                  </Button>
                </span>
              </Banner>
            ) : (
              <Loading />
            )
          }
          sidebar={null}
        />
      </div>
    );
  }

  const runs = runsOf(state, people.me);
  const { active } = runs;
  const view: InstanceView | undefined =
    active.find((entry) => entry.id === selected) ?? active[0] ?? runs.finished;
  const finished = view && view.status !== "active";
  const publish = publishNoteOf(state, view);
  const again = finished ? state.available.find((def) => def.name === view.workflow) : undefined;

  const menu: MenuItem[] = [];
  if (view) {
    for (const def of state.available) {
      if (def !== again) {
        menu.push({
          key: `start-${def.name}`,
          label: t("start", { title: def.title }),
          onClick: () => void start(def),
        });
      }
    }
    if (view.canAbort) {
      menu.push({
        key: "abort",
        label: t("abort"),
        onClick: () => {
          setReason("");
          openModal(abortSlug);
        },
      });
    }
  }

  let title = t("drawerTitle");
  if (active.length > 1) {
    title = t("drawerTitleMany");
  } else if (view) {
    title = view.title;
  } else if (state.available.length === 1 && state.available[0]) {
    title = state.available[0].title;
  }

  const act = (activity: ViewActivity, action: ViewAction) => {
    if (!view) {
      return;
    }
    if (action.params.length > 0) {
      setPending({ activity, action });
      return;
    }
    void fire(view, activity, action);
  };

  const notice = state.hiddenCollections ? (
    <Banner className="workflows-banner" type="info">
      {t("hiddenByAccess", { collections: state.hiddenCollections.join(", ") })}
    </Banner>
  ) : null;

  const main = view ? (
    <>
      {notice}
      {active.length > 1 ? (
        <div className="workflows-tabs">
          {active.map((entry) => (
            <Button
              buttonStyle="tab"
              disabled={entry === view}
              extraButtonProps={{ "aria-pressed": entry === view }}
              key={entry.id ?? entry.workflow}
              margin={false}
              onClick={() => setSelected(entry.id)}
              size="medium"
            >
              {entry.title}
            </Button>
          ))}
        </div>
      ) : null}
      {error ? (
        <Banner className="workflows-banner" type="error">
          {error}
        </Banner>
      ) : null}
      <RunMain
        busy={busy}
        idPrefix={idPrefix}
        onAction={act}
        onCancelParams={() => setPending(null)}
        onSubmitParams={async (chosen, params) => {
          // A refused action keeps its form, so what was typed is not lost.
          if (await fire(view, chosen.activity, chosen.action, params)) {
            setPending(null);
          }
        }}
        pending={pending}
        people={people}
        publish={publish}
        view={view}
      />
      {again ? (
        <StartAgain busy={busy} onStart={() => void start(again)} title={again.title} />
      ) : null}
    </>
  ) : (
    <>
      {notice}
      <StartPanel available={state.available} busy={busy} publish={publish} start={start} />
    </>
  );

  return (
    <div aria-busy={busy} className="workflows-drawer">
      <Header busy={busy} menu={menu} onClose={close} title={title} />
      <Layout
        main={main}
        sidebar={
          <>
            <RunFacts people={people} view={view} />
            <HistoryList key={view?.id} people={people} view={view} />
          </>
        }
      />
      {view?.canAbort ? (
        <ConfirmationModal
          body={
            <>
              <p>{t("abortBody", { stage: view.stage.title })}</p>
              <div className="workflows-stop__reason">
                <TextareaInput
                  description={t("abortReasonHint")}
                  label={t("abortReason")}
                  onChange={(event) => setReason(event.target.value)}
                  path="workflow-abort-reason"
                  rows={3}
                  value={reason}
                />
              </div>
            </>
          }
          cancelLabel={t("cancel")}
          className="workflows-stop"
          confirmingLabel={t("aborting")}
          confirmLabel={t("abortConfirm")}
          heading={t("abortHeading", { title: view.title })}
          modalSlug={abortSlug}
          onConfirm={async () => {
            await abort(view, reason.trim() || undefined);
          }}
        />
      ) : null}
    </div>
  );
};
