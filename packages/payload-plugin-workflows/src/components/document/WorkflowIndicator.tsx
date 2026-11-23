"use client";

import "./WorkflowIndicator.css";

import { Button, Drawer, useAuth, useDocumentInfo, useDrawerSlug, useModal } from "@payloadcms/ui";

import type { T } from "../shared/format.js";
import { formatRelative, waitingOnText } from "../shared/format.js";
import { indicatorOf } from "../shared/indicator.js";
import type { Indicator } from "../shared/indicator.js";
import type { WorkflowsClientProps } from "../shared/types.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";
import { useWorkflowState } from "./useWorkflowState.js";
import { WorkflowDrawerBody } from "./WorkflowDrawer.js";

/** What the button shows, and its full accessible name. */
const describe = (
  indicator: Indicator,
  me: string | undefined,
  t: T,
  language: string
): { text: string; label: string; tone: string; held: boolean } => {
  const open = t("indicatorOpen");
  if (indicator.kind !== "run") {
    const finished = indicator.kind === "idle" ? indicator.finished : undefined;
    const at = finished?.history.at(-1)?.at;
    let summary = t("indicatorNone");
    if (finished) {
      const when = at ? formatRelative(at, new Date(), language) : "";
      summary =
        finished.status === "aborted"
          ? t("finishedAborted", { title: finished.title, when })
          : t("finishedCompleted", { title: finished.title, when });
    }
    return {
      text: t("indicatorLabel"),
      label: `${t("indicatorLabel")}: ${summary}. ${open}`,
      tone: "idle",
      held: false,
    };
  }
  const { view, tone, waitsOnMe, more } = indicator;
  const people = { me, labels: view.userLabels };
  let waiting: string;
  if (tone === "stuck") {
    waiting = t("indicatorStuck");
  } else if (waitsOnMe) {
    waiting = t("indicatorWaitingYou");
  } else {
    const who = waitingOnText(view.waitingOn, people, t);
    waiting = who ? t("indicatorWaitingOn", { who }) : t("indicatorWaitingAnyone");
  }
  const operations: Record<string, string> = {
    publish: t("operationPublish"),
    update: t("operationUpdate"),
    delete: t("operationDelete"),
  };
  const heldOps = [...new Set(view.guards.flatMap((guard) => guard.operations))];
  const held =
    tone !== "stuck" && heldOps.length > 0
      ? ` ${t("indicatorHeld", { operations: heldOps.map((op) => operations[op] ?? op).join(", ") })}`
      : "";
  const extra = more > 0 ? ` ${t("indicatorMore", { count: more })}` : "";
  return {
    text: view.stage.title,
    label: `${view.title}: ${view.stage.title}, ${waiting}.${held} ${open}${extra}`,
    tone,
    held: held !== "",
  };
};

const IndicatorBody = ({
  endpoints,
  collection,
  id,
  refreshKey,
}: Pick<WorkflowsClientProps, "endpoints"> & {
  collection: string;
  id: string;
  refreshKey: unknown;
}) => {
  const { t, language } = useWorkflowsT();
  const { user } = useAuth();
  const me = user ? String(user.id) : undefined;
  const { openModal, isModalOpen } = useModal();
  const drawerSlug = useDrawerSlug("workflow");
  const controls = useWorkflowState(endpoints, collection, id, refreshKey);
  const { state, error, reload } = controls;
  const isOpen = isModalOpen(drawerSlug);

  let indicator: Indicator | null = null;
  if (state) {
    indicator = indicatorOf(state, me);
  } else if (error) {
    indicator = { kind: "idle" };
  }
  // Nothing to say (or still loading): no button. An open drawer stays until it is closed.
  if ((!indicator || indicator.kind === "none") && !isOpen) {
    return null;
  }
  const shown = indicator && indicator.kind !== "none" ? indicator : { kind: "idle" as const };
  const look = describe(shown, me, t, language);
  const failed = !state && Boolean(error);
  const more = shown.kind === "run" ? shown.more : 0;

  return (
    <>
      <Button
        aria-label={
          failed
            ? `${t("indicatorLabel")}: ${t("indicatorFailed")}. ${t("indicatorOpen")}`
            : look.label
        }
        buttonStyle="secondary"
        className="workflows-indicator"
        extraButtonProps={{
          "data-tone": failed ? "stuck" : look.tone,
          "data-held": look.held,
          "aria-haspopup": "dialog",
          title: failed ? undefined : look.label,
        }}
        margin={false}
        onClick={() => {
          void reload();
          openModal(drawerSlug);
        }}
        size="medium"
      >
        <span className="workflows-indicator__content">
          {shown.kind === "run" || failed ? (
            <span aria-hidden="true" className="workflows-indicator__dot" />
          ) : null}
          <span className="workflows-indicator__text">{look.text}</span>
          {more > 0 ? (
            <span aria-hidden="true" className="workflows-indicator__more">
              +{more}
            </span>
          ) : null}
        </span>
      </Button>
      <Drawer className="workflows-drawer-modal" slug={drawerSlug} title={t("drawerTitle")}>
        <WorkflowDrawerBody me={me} {...controls} />
      </Drawer>
    </>
  );
};

/**
 * The workflow's one-line indicator beside Save / Publish, and the drawer it opens. Hidden until
 * the document has an id and while there is nothing to show. Owns the document's workflow state:
 * one fetch, refetched on save (`lastUpdateTime`) and after every action; the drawer gets it as
 * props. A drawer, not a page: the document form and its unsaved changes stay as they are.
 */
export const WorkflowIndicator = ({ endpoints }: Partial<WorkflowsClientProps>) => {
  const { id, collectionSlug, lastUpdateTime } = useDocumentInfo();
  if (id === undefined || id === null || id === "" || !collectionSlug || !endpoints) {
    return null;
  }
  return (
    <IndicatorBody
      collection={collectionSlug}
      endpoints={endpoints}
      id={String(id)}
      refreshKey={lastUpdateTime}
    />
  );
};
