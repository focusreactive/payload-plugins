"use client";

import { Banner, Button } from "@payloadcms/ui";

import type { InstanceView, ViewAction, ViewActivity } from "../../types.js";
import { formatDateTime, operationsText, personName } from "../shared/format.js";
import type { People, T } from "../shared/format.js";
import { lastStepOf } from "../shared/history.js";
import { primaryActionOf, turnOf } from "../shared/indicator.js";
import type { Turn } from "../shared/indicator.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";
import { ActivityItem } from "./ActivityItem.js";
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

interface Props {
  view: InstanceView;
  people: People;
  busy: boolean;
  onAction: (activity: ViewActivity, action: ViewAction) => void;
  idPrefix: string;
}

/**
 * The drawer's main column for one workflow, in the order a person reads it: where it is (the
 * stepper), whose turn it is, what is on hold, then what they can do.
 */
export const RunMain = ({ view, people, busy, onAction, idPrefix }: Props) => {
  const { t, language } = useWorkflowsT();
  const turn = turnOf(view, people.me);
  const text = turnText(turn, view, people, t, language);
  const active = view.status === "active" && !view.stuck;
  const primary = primaryActionOf(view);
  // A stage with plain `actions` has one activity named after it: no heading of its own.
  const implicit = view.activities.length === 1 && view.activities[0]?.name === view.stage.name;
  return (
    <>
      <StageStepper
        completed={view.status === "completed"}
        stages={view.stages}
        stopped={view.status === "aborted"}
      />
      <div aria-live="polite" className="workflows-turn" data-turn={turn.kind}>
        <h3 className="workflows-turn__title">{text.title}</h3>
        <p className="workflows-turn__body">{text.body}</p>
        {active && view.stage.description ? (
          <p className="field-description workflows-turn__hint">{view.stage.description}</p>
        ) : null}
      </div>
      {active
        ? view.guards.map((guard) => (
            <Banner className="workflows-banner" key={guard.name} type="info">
              {guard.title === guard.name
                ? t("guardHolds", { operations: operationsText(guard.operations, t) })
                : guard.title}
            </Banner>
          ))
        : null}
      {active ? (
        implicit && view.activities[0] ? (
          <ActivityItem
            activity={view.activities[0]}
            busy={busy}
            idPrefix={idPrefix}
            implicit
            onAction={onAction}
            people={people}
            primary={primary}
          />
        ) : (
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
        )
      ) : null}
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
