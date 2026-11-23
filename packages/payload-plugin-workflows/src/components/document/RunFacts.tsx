"use client";

import { Pill } from "@payloadcms/ui";
import type { ComponentProps, ReactNode } from "react";

import type { InstanceView } from "../../types.js";
import { formatDateTime, personName } from "../shared/format.js";
import type { People, T } from "../shared/format.js";
import { startOf } from "../shared/history.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";

type PillStyle = NonNullable<ComponentProps<typeof Pill>["pillStyle"]>;

const statusOf = (view: InstanceView | undefined, t: T): { label: string; style: PillStyle } => {
  if (!view) {
    return { label: t("statusNotStarted"), style: "light-gray" };
  }
  if (view.stuck) {
    return { label: t("statusStuck"), style: "error" };
  }
  if (view.status === "completed") {
    return { label: t("statusCompleted"), style: "success" };
  }
  if (view.status === "aborted") {
    return { label: t("statusAborted"), style: "light-gray" };
  }
  return { label: t("statusRunning"), style: "warning" };
};

/**
 * The few facts about a workflow the sidebar leads with: status, who has it, when it started and
 * last changed. Without a run (nothing started yet) just the status.
 */
export const RunFacts = ({ view, people }: { view?: InstanceView; people: People }) => {
  const { t, language } = useWorkflowsT();
  const status = statusOf(view, t);
  const started = view ? startOf(view.history) : undefined;
  const changed = view?.history.at(-1)?.at;
  const assignees = [
    ...new Set(
      (view?.activities ?? []).flatMap((activity) => (activity.assignee ? [activity.assignee] : []))
    ),
  ];
  const name = (id: string | undefined) =>
    id === undefined ? t("timelineAutomated") : personName(id, people, t);
  const rows: { key: string; label: string; value: ReactNode }[] = [
    {
      key: "status",
      label: t("factStatus"),
      value: (
        <Pill className="workflows-pill" pillStyle={status.style} size="small">
          {status.label}
        </Pill>
      ),
    },
  ];
  if (view?.status === "active" && assignees.length > 0) {
    rows.push({
      key: "assignee",
      label: t("factAssignee"),
      value: assignees.map((id) => (id === people.me ? t("actorYou") : name(id))).join(", "),
    });
  }
  if (started) {
    rows.push({
      key: "started",
      label: t("factStarted"),
      value: t("factStartedBy", {
        when: formatDateTime(started.at, language),
        who: name(started.actor.id),
      }),
    });
  }
  if (changed && changed !== started?.at) {
    rows.push({
      key: "updated",
      label: t("factUpdated"),
      value: formatDateTime(changed, language),
    });
  }
  return (
    <dl aria-label={t("factsLabel")} className="workflows-facts">
      {rows.map((row) => (
        <div className="workflows-facts__row" key={row.key}>
          <dt className="workflows-facts__label">{row.label}</dt>
          <dd className="workflows-facts__value">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
};
