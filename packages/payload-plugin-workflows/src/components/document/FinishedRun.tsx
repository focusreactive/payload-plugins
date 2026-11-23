"use client";

import type { InstanceView } from "../../types.js";
import { formatDateTime, formatRelative } from "../shared/format.js";
import type { People } from "../shared/format.js";
import { StatusPill } from "../shared/StatusPill.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";
import { HistoryList } from "./HistoryList.js";

/** The latest finished run, in one line; its history opens on demand. */
export const FinishedRun = ({ view, people }: { view: InstanceView; people: People }) => {
  const { t, language } = useWorkflowsT();
  const at = view.history.at(-1)?.at;
  const when = at ? formatRelative(at, new Date(), language) : "";
  return (
    <section aria-label={view.title} className="workflows-run" data-status={view.status}>
      <div className="workflows-run__header">
        <span className="workflows-run__summary">
          {at ? (
            <time dateTime={at} title={formatDateTime(at, language)}>
              {view.status === "aborted"
                ? t("finishedAborted", { title: view.title, when })
                : t("finishedCompleted", { title: view.title, when })}
            </time>
          ) : (
            view.title
          )}
        </span>
        <StatusPill status={view.status} />
      </div>
      <HistoryList people={people} view={view} />
    </section>
  );
};
