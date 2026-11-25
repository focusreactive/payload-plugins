"use client";

import "./WorkflowIndicator.css";

import {
  Button,
  CheckIcon,
  Drawer,
  useDocumentInfo,
  useDrawerSlug,
  useModal,
} from "@payloadcms/ui";

import { holdLead, userIdsIn, waitingOnText } from "../shared/format.js";
import type { People, T } from "../shared/format.js";
import { indicatorOf } from "../shared/indicator.js";
import type { Indicator, RunTone } from "../shared/indicator.js";
import { usePeople } from "../shared/useWorkflowsApi.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";
import { useWorkflowState } from "./useWorkflowState.js";
import { WorkflowDrawerBody } from "./WorkflowDrawer.js";

/** What the button shows, and its full accessible name. */
const describe = (
  indicator: Exclude<Indicator, { kind: "none" }>,
  people: People,
  t: T
): { text: string; label: string; tone: RunTone; completed: boolean } => {
  const open = t("indicatorOpen");
  if (indicator.kind === "idle") {
    const { finished, publish } = indicator;
    // A completed run names where it ended ("✓ Approved"), or, when it lets the next publish
    // through, says so; publishing that needs a workflow first asks for it; else neutral.
    if (finished?.status === "completed") {
      const completed = t("indicatorCompletedIn", {
        title: finished.title,
        stage: finished.stage.title,
      });
      let note = "";
      if (publish === "ready") {
        note = ` ${t("publishReady")}.`;
      } else if (publish === "used") {
        note = ` ${t("publishUsed")}`;
      }
      return {
        text: publish === "ready" ? t("publishReadyShort") : finished.stage.title,
        label: `${t("indicatorLabel")}: ${completed}.${note} ${open}`,
        tone: "success",
        completed: true,
      };
    }
    const summary = finished
      ? t("indicatorAborted", { title: finished.title })
      : t("indicatorNone");
    const required = publish === "required" ? ` ${t("publishRequired")}.` : "";
    return {
      text: publish === "required" ? t("publishRequired") : t("indicatorLabel"),
      label: `${t("indicatorLabel")}: ${summary}.${required} ${open}`,
      tone: indicator.tone,
      completed: false,
    };
  }
  const { view, tone, waitsOnMe, more } = indicator;
  let waiting: string;
  if (view.stuck) {
    waiting = t("indicatorStuck");
  } else if (waitsOnMe) {
    waiting = t("indicatorWaitingYou");
  } else {
    const who = waitingOnText(view.waitingOn, people, t);
    waiting = who ? t("indicatorWaitingOn", { who }) : t("indicatorWaitingAnyone");
  }
  const heldOps = [...new Set(view.guards.flatMap((guard) => guard.operations))];
  const held = !view.stuck && heldOps.length > 0 ? ` ${holdLead(heldOps, t)}` : "";
  const extra = more > 0 ? ` ${t("indicatorMore", { count: more })}` : "";
  return {
    text: view.stage.title,
    label: `${view.title}: ${view.stage.title}, ${waiting}.${held} ${open}${extra}`,
    tone,
    completed: false,
  };
};

const IndicatorBody = ({
  collection,
  id,
  refreshKey,
}: {
  collection: string;
  id: string;
  refreshKey: unknown;
}) => {
  const { t } = useWorkflowsT();
  const { openModal, isModalOpen } = useModal();
  const drawerSlug = useDrawerSlug("workflow");
  const controls = useWorkflowState(collection, id, refreshKey);
  const { state, error, reload } = controls;
  const people = usePeople(userIdsIn(state?.instances ?? []));
  const isOpen = isModalOpen(drawerSlug);

  let indicator: Indicator | null = null;
  if (state) {
    indicator = indicatorOf(state, people.me);
  } else if (error) {
    indicator = { kind: "idle", tone: "error" };
  }
  // Nothing to say (or still loading): no button. An open drawer stays until it is closed.
  if ((!indicator || indicator.kind === "none") && !isOpen) {
    return null;
  }
  const shown: Exclude<Indicator, { kind: "none" }> =
    indicator && indicator.kind !== "none" ? indicator : { kind: "idle", tone: "neutral" };
  const look = describe(shown, people, t);
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
          "data-tone": failed ? "error" : look.tone,
          "data-kind": shown.kind,
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
          {look.completed ? (
            <span aria-hidden="true" className="workflows-indicator__check">
              <CheckIcon />
            </span>
          ) : (
            // Idle, the dot shows only where the label collapses (narrow screens).
            <span aria-hidden="true" className="workflows-indicator__dot" />
          )}
          <span className="workflows-indicator__text">{look.text}</span>
          {more > 0 ? (
            <span aria-hidden="true" className="workflows-indicator__more">
              +{more}
            </span>
          ) : null}
        </span>
      </Button>
      <Drawer className="workflows-drawer-modal" gutter={false} Header={null} slug={drawerSlug}>
        <WorkflowDrawerBody drawerSlug={drawerSlug} people={people} {...controls} />
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
export const WorkflowIndicator = () => {
  const { id, collectionSlug, lastUpdateTime } = useDocumentInfo();
  if (id === undefined || id === null || id === "" || !collectionSlug) {
    return null;
  }
  return <IndicatorBody collection={collectionSlug} id={String(id)} refreshKey={lastUpdateTime} />;
};
