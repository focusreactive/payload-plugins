"use client";

import { Banner, Button } from "@payloadcms/ui";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import type { InstanceView, ViewAction, ViewActivity } from "../../types.js";
import { formatDateTime, holdLead, personName } from "../shared/format.js";
import type { People, T } from "../shared/format.js";
import { enteredBecause, lastStepOf } from "../shared/history.js";
import { primaryActionOf, turnOf } from "../shared/indicator.js";
import type { Turn } from "../shared/indicator.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";
import { ActivityItem } from "./ActivityItem.js";
import { ParamForm } from "./ParamForm.js";
import { StageStepper } from "./StageStepper.js";

const list = (items: string[]) => items.join(", ");

/** The turn line, phrased for the reader: a short title and one sentence under it. */
const turnText = (
  turn: Turn,
  view: InstanceView,
  people: People,
  t: T,
  language: string
): { title: string; body: string } => {
  const stage = view.stage.title;
  const last = lastStepOf(view);
  const when = last.at ? formatDateTime(last.at, language) : "";
  const who = last.actor?.id === undefined ? "" : personName(last.actor.id, people, t);
  switch (turn.kind) {
    case "stuck":
      return { title: t("turnStuck"), body: t("turnStuckBody", { stage: view.stage.name }) };
    case "completed":
      return {
        title: t("turnCompleted"),
        body:
          last.action && who
            ? t("turnCompletedBody", { when, action: last.action, who })
            : t("turnCompletedBodyShort", { when }),
      };
    case "aborted":
      return {
        title: t("turnAborted"),
        body: who ? t("turnAbortedBody", { who, when }) : t("turnAbortedBodyShort", { when }),
      };
    case "you":
      return turn.roles.length > 0
        ? {
            title: t("turnYouRole"),
            body: t("turnYouRoleBody", { roles: list(turn.roles), stage }),
          }
        : { title: t("turnYou"), body: t("turnYouBody", { stage }) };
    case "anyone":
      return { title: t("turnAnyone"), body: t("turnAnyoneBody", { stage }) };
    case "othersOpen":
      return { title: t("turnOthersOpen"), body: t("turnOthersOpenBody", { stage }) };
    case "others": {
      const names = turn.users.map((id) => personName(id, people, t));
      if (names.length === 0) {
        const roles = list(turn.roles);
        return {
          title: t("turnOthers", { who: t("roleLabel", { role: roles }) }),
          body: t("turnOthersRoleBody", { roles, stage }),
        };
      }
      return {
        title: t("turnOthers", { who: list(names) }),
        body: t("turnOthersBody", { who: list(names), stage }),
      };
    }
    default:
      return { title: t("turnNobody"), body: t("turnNobodyBody", { stage }) };
  }
};

/** An action waiting for its params, shown as a form in place of the buttons. */
export interface PendingAction {
  activity: ViewActivity;
  action: ViewAction;
}

interface Props {
  view: InstanceView;
  people: People;
  busy: boolean;
  onAction: (activity: ViewActivity, action: ViewAction) => void;
  pending: PendingAction | null;
  onSubmitParams: (pending: PendingAction, params: Record<string, unknown>) => void;
  onCancelParams: () => void;
  idPrefix: string;
}

/**
 * After an action, focus moves to the turn line (it says what happened next) rather than staying
 * on a button that is gone or disabled, or, when the pointer clicked it, looking pressed. Only
 * when focus was in the drawer or lost with the button; never pulled from elsewhere.
 */
const useFocusAfter = (busy: boolean, pending: PendingAction | null) => {
  const ref = useRef<HTMLHeadingElement>(null);
  const was = useRef({ busy, pending });
  useEffect(() => {
    const before = was.current;
    was.current = { busy, pending };
    const settled = before.busy && !busy;
    const closed = before.pending !== null && pending === null && !busy;
    const heading = ref.current;
    if (!heading || !(settled || closed)) {
      return;
    }
    const active = document.activeElement;
    const drawer = heading.closest(".workflows-drawer");
    if (!active || active === document.body || drawer?.contains(active)) {
      heading.focus();
    }
  }, [busy, pending]);
  return ref;
};

/** "Request changes by Bea" and its params, when a person's step sent the run back here. */
const Because = ({ view, people }: { view: InstanceView; people: People }) => {
  const { t } = useWorkflowsT();
  const because = enteredBecause(view, t);
  if (!because) {
    return null;
  }
  const who =
    because.actor.id === undefined
      ? t("timelineAutomated")
      : personName(because.actor.id, people, t);
  return (
    <Banner className="workflows-banner" type="default">
      <span className="workflows-because">
        <strong className="workflows-banner__lead">
          {t("enteredBecause", { action: because.action, who })}
        </strong>
        {because.details.map((detail) => (
          <span className="workflows-because__detail" key={detail}>
            {detail}
          </span>
        ))}
      </span>
    </Banner>
  );
};

/**
 * The drawer's main column for one workflow, in the order a person reads it: why it is back here
 * (if a person sent it back), where it is (the stepper), whose turn it is, what is on hold, then
 * what they can do, or the form of the action they chose.
 */
export const RunMain = ({
  view,
  people,
  busy,
  onAction,
  pending,
  onSubmitParams,
  onCancelParams,
  idPrefix,
}: Props) => {
  const { t, language } = useWorkflowsT();
  const turnRef = useFocusAfter(busy, pending);
  const turn = turnOf(view, people.me);
  const text = turnText(turn, view, people, t, language);
  const active = view.status === "active" && !view.stuck;
  const primary = primaryActionOf(view);
  // A stage with plain `actions` has one activity named after it: no heading of its own.
  const implicit = view.activities.length === 1 && view.activities[0]?.name === view.stage.name;
  let actions: ReactNode = null;
  if (active && pending) {
    actions = (
      <section aria-labelledby={`${idPrefix}-form`} className="workflows-form">
        <h4 className="workflows-form__title" id={`${idPrefix}-form`}>
          {pending.action.title}
        </h4>
        {pending.action.description ? (
          <p className="field-description">{pending.action.description}</p>
        ) : null}
        <ParamForm
          busy={busy}
          defs={pending.action.params}
          key={`${pending.activity.name}/${pending.action.name}`}
          onCancel={onCancelParams}
          onSubmit={(params) => onSubmitParams(pending, params)}
          submitLabel={pending.action.title}
        />
      </section>
    );
  } else if (active && implicit && view.activities[0]) {
    actions = (
      <ActivityItem
        activity={view.activities[0]}
        busy={busy}
        idPrefix={idPrefix}
        implicit
        onAction={onAction}
        people={people}
        primary={primary}
      />
    );
  } else if (active) {
    actions = (
      <ul aria-label={t("actionsLabel")} className="workflows-tasks">
        {view.activities.map((activity) => (
          <ActivityItem
            activity={activity}
            busy={busy}
            idPrefix={idPrefix}
            implicit={false}
            key={activity.name}
            onAction={onAction}
            people={people}
            primary={primary}
          />
        ))}
      </ul>
    );
  }
  return (
    <>
      {active ? <Because people={people} view={view} /> : null}
      <StageStepper
        completed={view.status === "completed"}
        stages={view.stages}
        stopped={view.status === "aborted"}
      />
      <div aria-live="polite" className="workflows-turn" data-turn={turn.kind}>
        <h3 className="workflows-turn__title" ref={turnRef} tabIndex={-1}>
          {text.title}
        </h3>
        <p className="workflows-turn__body">{text.body}</p>
        {active && view.stage.description ? (
          <p className="field-description workflows-turn__hint">{view.stage.description}</p>
        ) : null}
      </div>
      {active
        ? view.guards.map((guard) => (
            <Banner className="workflows-banner workflows-hold" key={guard.name} type="warning">
              <strong className="workflows-banner__lead">{holdLead(guard.operations, t)}</strong>{" "}
              {guard.title === guard.name ? t("holdUntilDone") : guard.title}
            </Banner>
          ))
        : null}
      {actions}
    </>
  );
};

/** Starting a finished workflow again: secondary, under a line, with what it does. */
export const StartAgain = ({
  title,
  busy,
  onStart,
}: {
  title: string;
  busy: boolean;
  onStart: () => void;
}) => {
  const { t } = useWorkflowsT();
  return (
    <div className="workflows-again">
      <Button
        buttonStyle="secondary"
        disabled={busy}
        margin={false}
        onClick={onStart}
        size="medium"
      >
        {t("startAgain")}
      </Button>
      <p className="field-description">{t("startAgainHint", { title })}</p>
    </div>
  );
};
