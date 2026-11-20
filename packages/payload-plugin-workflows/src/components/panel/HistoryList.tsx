"use client";

import { useId, useState } from "react";

import type { InstanceView } from "../../types.js";
import { formatDateTime, historySentence } from "../shared/format.js";
import type { People } from "../shared/format.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";

/** The run's audit trail as sentences, newest first, behind a toggle. */
export const HistoryList = ({ view, people }: { view: InstanceView; people: People }) => {
  const { t, language } = useWorkflowsT();
  const [open, setOpen] = useState(false);
  const listId = useId();
  const entries = [...view.history].reverse();
  if (entries.length === 0) {
    return null;
  }
  return (
    <div className="workflows-history">
      <button
        aria-controls={listId}
        aria-expanded={open}
        className="workflows-history__toggle"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? t("hideHistory") : t("showHistory", { count: entries.length })}
      </button>
      {open ? (
        <ol className="workflows-history__list" id={listId}>
          {entries.map((entry, index) => (
            <li
              className="workflows-history__entry"
              data-type={entry.type}
              key={`${entry.at}-${index}`}
            >
              <span className="workflows-history__text">
                {historySentence(entry, view, people, t)}
              </span>
              <time className="workflows-history__time" dateTime={entry.at}>
                {formatDateTime(entry.at, language)}
              </time>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
};
