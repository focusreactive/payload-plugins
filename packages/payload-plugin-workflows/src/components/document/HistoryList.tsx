"use client";

import { ChevronIcon, toast } from "@payloadcms/ui";
import { useId, useState } from "react";
import type { ReactNode } from "react";

import { ENDPOINTS } from "../../constants.js";
import type { HistoryEntry, InstanceView } from "../../types.js";
import { formatDateTime } from "../shared/format.js";
import type { People, T } from "../shared/format.js";
import {
  TIMELINE_VISIBLE,
  groupByDay,
  mergeHistory,
  rowDetails,
  rowWhat,
  rowWho,
  stepSentence,
  timelineRows,
} from "../shared/history.js";
import type { ActorKind, LoadedHistory, TimelineDay, TimelineRow } from "../shared/history.js";
import { useWorkflowsApi } from "../shared/useWorkflowsApi.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";

const KIND_LABEL: Record<ActorKind, Parameters<T>[0]> = {
  person: "timelineKindPerson",
  api: "timelineKindApi",
  agent: "timelineKindAgent",
  system: "timelineKindSystem",
};

const timeOf = (iso: string, language: string): string =>
  new Intl.DateTimeFormat(language, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));

const Row = ({ row, view, people }: { row: TimelineRow; view: InstanceView; people: People }) => {
  const { t, language } = useWorkflowsT();
  const [open, setOpen] = useState(false);
  const stepsId = useId();
  const details = rowDetails(row, view.titles, t);
  // A single automatic step is the row's own text: nothing to fold.
  const folded = row.lead ? row.steps : row.steps.length > 1 ? row.steps : [];
  return (
    <li className="workflows-history__row" data-failed={row.failed.length > 0} data-kind={row.kind}>
      <span
        aria-label={t(KIND_LABEL[row.kind])}
        className="workflows-history__dot"
        data-kind={row.kind}
        role="img"
      />
      <div className="workflows-history__body">
        <p className="workflows-history__text">{rowWhat(row, view.titles, t)}</p>
        {details.map((detail) => (
          <p className="workflows-history__detail" key={detail}>
            {detail}
          </p>
        ))}
        {row.failed.map((entry, index) => (
          <p className="workflows-history__detail" data-tone="error" key={`${entry.at}-${index}`}>
            {stepSentence(entry, view.titles, t)}
          </p>
        ))}
        <p className="workflows-history__meta">
          <span className="workflows-history__who">{rowWho(row, people, t)}</span>
          {row.kind === "api" ? (
            <span className="workflows-history__marker">{t("timelineApi")}</span>
          ) : null}
          {row.kind === "agent" ? (
            <span className="workflows-history__marker" data-kind="agent">
              {t("timelineAgentMarker")}
            </span>
          ) : null}
          <span aria-hidden="true">·</span>
          <time dateTime={row.at} title={formatDateTime(row.at, language)}>
            {timeOf(row.at, language)}
          </time>
          {folded.length > 0 ? (
            <>
              <span aria-hidden="true">·</span>
              <button
                aria-controls={stepsId}
                aria-expanded={open}
                className="workflows-history__toggle"
                onClick={() => setOpen((value) => !value)}
                type="button"
              >
                {t("timelineSteps", { count: folded.length })}
                <ChevronIcon direction={open ? "up" : "down"} size="small" />
              </button>
            </>
          ) : null}
        </p>
        {open && folded.length > 0 ? (
          <ol className="workflows-history__steps" id={stepsId}>
            {folded.map((entry, index) => (
              <li className="workflows-history__step" key={`${entry.at}-${index}`}>
                <time dateTime={entry.at}>{timeOf(entry.at, language)}</time>
                <span>{stepSentence(entry, view.titles, t)}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </li>
  );
};

const dayLabel = (day: TimelineDay, t: T, language: string): string => {
  if (day.relative === "today") {
    return t("timelineToday");
  }
  if (day.relative === "yesterday") {
    return t("timelineYesterday");
  }
  return new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(new Date(day.at));
};

/**
 * The workflow's history as a vertical timeline, newest first, grouped by day: one entry per step
 * a person or agent took, the automatic steps it caused folded under it. "Show older" first shows
 * the rows already loaded, then reads older entries from the server, a page at a time. Without a
 * run (nothing started yet) it says what will appear here.
 */
export const HistoryList = ({ view, people }: { view?: InstanceView; people: People }) => {
  const { t, language } = useWorkflowsT();
  const api = useWorkflowsApi();
  const [all, setAll] = useState(false);
  const [loaded, setLoaded] = useState<LoadedHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const headingId = useId();
  const run = view;
  const merged = run ? mergeHistory(run, loaded) : { history: [], older: 0 };
  const rows = timelineRows(merged.history);
  const shown = all ? rows : rows.slice(0, TIMELINE_VISIBLE);
  const hidden = rows.length - shown.length;
  const loadOlder = async () => {
    if (!run?.id) {
      return;
    }
    setLoading(true);
    try {
      const page = await api<{ entries: HistoryEntry[]; older: number }>(ENDPOINTS.history, {
        query: { instanceId: run.id, before: merged.older },
      });
      const continued = loaded && loaded.from === merged.older ? loaded.entries : [];
      setLoaded({ from: page.older, entries: [...page.entries, ...continued] });
      setAll(true);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t("somethingWentWrong"));
    }
    setLoading(false);
  };
  let more: ReactNode = null;
  if (hidden > 0) {
    more = (
      <button className="workflows-history__more" onClick={() => setAll(true)} type="button">
        {t("timelineShowOlder", { count: hidden })}
      </button>
    );
  } else if (merged.older > 0) {
    more = (
      <button
        className="workflows-history__more"
        disabled={loading}
        onClick={() => void loadOlder()}
        type="button"
      >
        {t("timelineLoadOlder", { count: merged.older })}
      </button>
    );
  }
  return (
    <section aria-labelledby={headingId} className="workflows-history">
      <h3 className="workflows-section-title" id={headingId}>
        {t("historyHeading")}
      </h3>
      {rows.length === 0 ? (
        <p className="field-description workflows-history__empty">{t("historyEmpty")}</p>
      ) : null}
      {run
        ? groupByDay(shown, new Date()).map((day) => (
            <div className="workflows-history__day" key={day.key}>
              <h4 className="workflows-history__day-label">{dayLabel(day, t, language)}</h4>
              <ol className="workflows-history__list">
                {day.rows.map((row) => (
                  <Row key={row.key} people={people} row={row} view={run} />
                ))}
              </ol>
            </div>
          ))
        : null}
      {more}
    </section>
  );
};
