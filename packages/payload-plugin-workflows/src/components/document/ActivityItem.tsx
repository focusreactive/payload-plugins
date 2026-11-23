"use client";

import { Button } from "@payloadcms/ui";

import type { ViewAction, ViewActivity } from "../../types.js";
import { personName } from "../shared/format.js";
import type { People } from "../shared/format.js";
import { shownActions } from "../shared/indicator.js";
import { StatusPill } from "../shared/StatusPill.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";

interface Props {
  activity: ViewActivity;
  people: People;
  busy: boolean;
  /** `activity/action` of the one primary button in the drawer. */
  primary: string | undefined;
  onAction: (activity: ViewActivity, action: ViewAction) => void;
  idPrefix: string;
  /**
   * The stage's only task (plain `actions`): the stage already names it and the turn line says
   * who it waits on, so it is just its buttons.
   */
  implicit: boolean;
}

/** One task of the current stage: its title and status (parallel tasks only), then its buttons. */
export const ActivityItem = ({
  activity,
  people,
  busy,
  primary,
  onAction,
  idPrefix,
  implicit,
}: Props) => {
  const { t } = useWorkflowsT();
  const actions = shownActions(activity);
  const who = activity.assignee
    ? personName(activity.assignee, people, t)
    : (activity.roles ?? []).map((role) => t("roleLabel", { role })).join(", ");
  const buttons =
    actions.length > 0 ? (
      <div className="workflows-actions">
        {actions.map((action) => {
          const reasonId = `${idPrefix}-${activity.name}-${action.name}-reason`;
          return (
            <Button
              buttonStyle={primary === `${activity.name}/${action.name}` ? "primary" : "secondary"}
              disabled={!action.allowed || busy}
              extraButtonProps={action.allowed ? undefined : { "aria-describedby": reasonId }}
              key={action.name}
              margin={false}
              onClick={() => onAction(activity, action)}
              size="medium"
              tooltip={action.allowed ? action.description : undefined}
            >
              {action.title}
              {action.params.length > 0 ? "…" : ""}
            </Button>
          );
        })}
      </div>
    ) : null;
  const reasons = actions
    .filter((action) => !action.allowed)
    .map((action) => (
      <p
        className="field-description workflows-actions__reason"
        id={`${idPrefix}-${activity.name}-${action.name}-reason`}
        key={action.name}
      >
        {action.title}: {action.reason}
      </p>
    ));
  if (implicit) {
    return buttons ? (
      <>
        {buttons}
        {reasons}
      </>
    ) : null;
  }
  const active = activity.status === "active";
  return (
    <li className="workflows-task" data-status={activity.status}>
      <div className="workflows-task__head">
        <span className="workflows-task__title">{activity.title}</span>
        <StatusPill status={activity.status} />
      </div>
      {activity.description ? (
        <p className="field-description workflows-task__meta">{activity.description}</p>
      ) : null}
      {active && actions.length === 0 ? (
        <p className="field-description workflows-task__meta">
          {who ? t("turnOthers", { who }) : t("turnNobody")}
        </p>
      ) : null}
      {buttons}
      {reasons}
    </li>
  );
};
