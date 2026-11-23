"use client";

import { Button } from "@payloadcms/ui";

import type { ViewAction, ViewActivity } from "../../types.js";
import { personName } from "../shared/format.js";
import type { People } from "../shared/format.js";
import { StatusPill } from "../shared/StatusPill.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";

interface Props {
  activity: ViewActivity;
  people: People;
  busy: boolean;
  /** Whether this activity holds the first action the caller may take: it gets the accent. */
  primary: string | undefined;
  onAction: (activity: ViewActivity, action: ViewAction) => void;
  idPrefix: string;
  /** Say who this activity waits on; off when the run's own line already says it. */
  showWaiting: boolean;
}

/** One activity of the current stage: status, who it waits on, its actions. */
export const ActivityItem = ({
  activity,
  people,
  busy,
  primary,
  onAction,
  idPrefix,
  showWaiting,
}: Props) => {
  const { t } = useWorkflowsT();
  const active = activity.status === "active";
  // An action its own `filter` turns off (e.g. "Take this review" once taken) is not something the
  // user can act on; only refusals they can understand (assignment, roles) stay, disabled.
  const actions = activity.actions.filter(
    (action) => action.allowed || action.reasonCode !== "filter"
  );
  // Every action refused for the same reason (e.g. assigned to someone else): say it once.
  const refused = actions.filter((action) => !action.allowed);
  const sharedReason =
    refused.length > 1 && refused.every((action) => action.reason === refused[0]?.reason)
      ? refused[0]?.reason
      : undefined;
  const sharedReasonId = `${idPrefix}-${activity.name}-reason`;
  const who = activity.assignee
    ? personName(activity.assignee, people, t)
    : (activity.roles ?? []).map((role) => t("roleLabel", { role })).join(", ");
  return (
    <li className="workflows-activity" data-status={activity.status}>
      <div className="workflows-activity__head">
        <span className="workflows-activity__title">{activity.title}</span>
        <StatusPill status={activity.status} />
      </div>
      {activity.description ? (
        <p className="workflows-activity__meta">{activity.description}</p>
      ) : null}
      {active && showWaiting ? (
        <p className="workflows-activity__meta">
          {who ? t("waitingOn", { who }) : t("waitingOnAnyone")}
        </p>
      ) : null}
      {active && actions.length > 0 ? (
        <ul className="workflows-activity__actions">
          {actions.map((action) => {
            const reasonId = sharedReason
              ? sharedReasonId
              : `${idPrefix}-${activity.name}-${action.name}-reason`;
            return (
              <li className="workflows-action" data-allowed={action.allowed} key={action.name}>
                <Button
                  buttonStyle={
                    primary === `${activity.name}/${action.name}` ? "primary" : "secondary"
                  }
                  disabled={!action.allowed || busy}
                  extraButtonProps={action.allowed ? undefined : { "aria-describedby": reasonId }}
                  margin={false}
                  onClick={() => onAction(activity, action)}
                  size="small"
                >
                  {action.title}
                  {action.params.length > 0 ? "…" : ""}
                </Button>
                {action.allowed || sharedReason ? null : (
                  <span className="workflows-action__reason" id={reasonId}>
                    {action.reason}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
      {active && sharedReason ? (
        <p className="workflows-action__reason" id={sharedReasonId}>
          {sharedReason}
        </p>
      ) : null}
    </li>
  );
};
