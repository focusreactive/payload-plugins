"use client";

import { ChevronIcon } from "@payloadcms/ui";
import { useId, useState } from "react";

import type { HistoryEntry, InstanceView } from "../../types.js";
import { formatDateTime, historySentence, personName, titleIn } from "../shared/format.js";
import type { People, T } from "../shared/format.js";
import { TIMELINE_VISIBLE, groupByDay, timelineRows } from "../shared/timeline.js";
import type { ActorKind, TimelineDay, TimelineRow } from "../shared/timeline.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";

type Titles = Pick<InstanceView, "titles">;

const capitalize = (text: string): string =>
  text ? text.charAt(0).toUpperCase() + text.slice(1) : text;

const paramText = (value: unknown): string =>
  typeof value === "string" ? value : JSON.stringify(value);

/** Who did the row's step, as its line names them. */
const whoOf = (row: TimelineRow, people: People, t: T): string => {
  if (row.kind === "system" || row.actor.id === undefined) {
    return t("timelineAutomated");
  }
  // "You" starts the line; other names stay as written (an email is not capitalised).
  const name = row.actor.id === people.me ? t("actorYou") : personName(row.actor.id, people, t);
  return row.kind === "agent" ? t("timelineViaAgent", { name }) : name;
};

/** What happened, after the dot: "Approve → moved to Approved → completed". */
const whatOf = (row: TimelineRow, view: Titles, people: People, t: T): string => {
  const stage = (name: string) => titleIn(view.titles, name, name);
  const parts: string[] = [];
  const first = row.lead ?? row.steps[0];
  if (first?.type === "action" && row.lead) {
    const base = `${first.stage}/${first.activity}`;
    parts.push(titleIn(view.titles, `${base}/${first.action}`, first.action));
  } else if (first?.type === "started") {
    parts.push(t("timelineStarted", { stage: stage(first.stage) }));
  } else if (first?.type === "aborted") {
    parts.push(t("timelineAborted"));
  }
  if (row.movedTo !== undefined) {
    parts.push(t("timelineMovedTo", { stage: stage(row.movedTo) }));
  }
  if (row.completed) {
    parts.push(t("timelineCompleted"));
  }
  if (parts.length === 0 && row.steps.length === 1 && row.steps[0]) {
    return historySentence(row.steps[0], view, people, t);
  }
  return capitalize(parts.join(" → "));
};

/** The row's inputs, under its line: the reason a change was requested, an abort's reason. */
const detailsOf = (entry: HistoryEntry | undefined, view: Titles): string[] => {
  if (entry?.type === "aborted") {
    return entry.reason ? [entry.reason] : [];
  }
  if (entry?.type !== "action") {
    return [];
  }
  const base = `${entry.stage}/${entry.activity}/${entry.action}`;
  return Object.entries(entry.params ?? {})
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([name, value]) => `${titleIn(view.titles, `${base}/${name}`, name)}: ${paramText(value)}`
    );
};

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

const Row = ({
  row,
  view,
  people,
  latest,
}: {
  row: TimelineRow;
  view: InstanceView;
  people: People;
  latest: boolean;
}) => {
  const { t, language } = useWorkflowsT();
  const [open, setOpen] = useState(false);
  const stepsId = useId();
  const details = detailsOf(row.lead, view);
  // A single automatic step is the row's own text: nothing to fold.
  const folded = row.lead ? row.steps : row.steps.length > 1 ? row.steps : [];
  return (
    <li className="workflows-history__row" data-failed={row.failed.length > 0} data-kind={row.kind}>
      <div className="workflows-history__line">
        <time
          className="workflows-history__time"
          dateTime={row.at}
          title={formatDateTime(row.at, language)}
        >
          {timeOf(row.at, language)}
        </time>
        <span
          aria-label={t(KIND_LABEL[row.kind])}
          className="workflows-history__dot"
          data-kind={row.kind}
          role="img"
        />
        <span className="workflows-history__text">
          <span className="workflows-history__who">{whoOf(row, people, t)}</span>
          {row.kind === "api" ? (
            <span className="workflows-history__marker">{t("timelineApi")}</span>
          ) : null}
          <span className="workflows-history__what">
            <span aria-hidden="true"> · </span>
            {whatOf(row, view, people, t)}
          </span>
        </span>
        <span className="workflows-history__end">
          {latest ? <span className="workflows-history__badge">{t("timelineLatest")}</span> : null}
          {folded.length > 0 ? (
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
          ) : null}
        </span>
      </div>
      {details.map((detail) => (
        <p className="workflows-history__detail" key={detail}>
          {detail}
        </p>
      ))}
      {row.failed.map((entry, index) => (
        <p className="workflows-history__detail" data-tone="error" key={`${entry.at}-${index}`}>
          {historySentence(entry, view, people, t)}
        </p>
      ))}
      {open && folded.length > 0 ? (
        <ol className="workflows-history__steps" id={stepsId}>
          {folded.map((entry, index) => (
            <li className="workflows-history__step" key={`${entry.at}-${index}`}>
              <time className="workflows-history__time" dateTime={entry.at}>
                {timeOf(entry.at, language)}
              </time>
              <span>{historySentence(entry, view, people, t)}</span>
            </li>
          ))}
        </ol>
      ) : null}
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
 * The run's history as a compact timeline, newest first, grouped by day: one line per step a
 * person or agent took, the automatic steps it caused folded under it.
 */
export const HistoryList = ({ view, people }: { view: InstanceView; people: People }) => {
  const { t, language } = useWorkflowsT();
  const [all, setAll] = useState(false);
  const headingId = useId();
  const rows = timelineRows(view.history);
  if (rows.length === 0) {
    return null;
  }
  const shown = all ? rows : rows.slice(0, TIMELINE_VISIBLE);
  const hidden = rows.length - shown.length;
  const latest = rows[0];
  return (
    <section aria-labelledby={headingId} className="workflows-history">
      <h3 className="workflows-section-title" id={headingId}>
        {t("historyHeading")}
      </h3>
      {groupByDay(shown, new Date()).map((day) => (
        <div className="workflows-history__day" key={day.key}>
          <h4 className="workflows-history__day-label">{dayLabel(day, t, language)}</h4>
          <ol className="workflows-history__list">
            {day.rows.map((row) => (
              <Row key={row.key} latest={row === latest} people={people} row={row} view={view} />
            ))}
          </ol>
        </div>
      ))}
      {hidden > 0 ? (
        <button className="workflows-history__more" onClick={() => setAll(true)} type="button">
          {t("timelineShowOlder", { count: hidden })}
        </button>
      ) : null}
    </section>
  );
};
