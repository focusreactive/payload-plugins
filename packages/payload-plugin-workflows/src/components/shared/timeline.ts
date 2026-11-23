// The run's history as a compact timeline: one row per step a person or an agent took, with the
// automatic consequences it caused folded under it, and purely automatic stretches as one row.
// Pure: no React, no Payload imports, so it is unit-tested directly. The stored history is untouched.

import type { Actor, HistoryEntry } from "../../types.js";

/** Who did a step: a person in the admin, a person through the API, an agent for a person, the workflow. */
export type ActorKind = "person" | "api" | "agent" | "system";

export const actorKind = (actor: Actor): ActorKind => {
  if (actor.id === undefined) {
    return "system";
  }
  if (actor.via === "agent") {
    return "agent";
  }
  return actor.via === "api" ? "api" : "person";
};

/** A step nobody chose: the engine's own (transitions, effects, completion) or an automatic action. */
export const isAutomatic = (entry: HistoryEntry): boolean =>
  entry.actor.id === undefined || (entry.type === "action" && entry.auto);

/** Automatic steps within this long of the step before them belong to the same row. */
export const FOLD_WINDOW_MS = 60_000;

export interface TimelineRow {
  /** Stable within one history: the index of the row's first entry. */
  key: string;
  /** When the row's step happened (its lead's time, or the first automatic step's). */
  at: string;
  kind: ActorKind;
  actor: Actor;
  /** The step a person or agent took; absent for a purely automatic row. */
  lead?: HistoryEntry;
  /** The automatic steps folded into the row, oldest first. */
  steps: HistoryEntry[];
  /** The stage the row's transitions ended in, when it moved the run. */
  movedTo?: string;
  completed: boolean;
  /** Effects in the row that failed: shown, never folded away. */
  failed: HistoryEntry[];
}

const summarize = (row: Omit<TimelineRow, "movedTo" | "completed" | "failed">): TimelineRow => {
  const entries = row.lead ? [row.lead, ...row.steps] : row.steps;
  let movedTo: string | undefined;
  for (const entry of entries) {
    if (entry.type === "transition") {
      movedTo = entry.to;
    }
  }
  return {
    ...row,
    ...(movedTo === undefined ? {} : { movedTo }),
    completed: entries.some((entry) => entry.type === "completed"),
    failed: entries.filter((entry) => entry.type === "effect" && entry.status === "failed"),
  };
};

/**
 * Folds the history (oldest first, as stored) into rows, newest first. A step a person or agent
 * took starts a row; the automatic steps right after it (each within `FOLD_WINDOW_MS` of the one
 * before) join it. Automatic steps with no such step before them form their own row.
 */
export const timelineRows = (history: HistoryEntry[]): TimelineRow[] => {
  const rows: Omit<TimelineRow, "movedTo" | "completed" | "failed">[] = [];
  let lastAt = Number.NEGATIVE_INFINITY;
  history.forEach((entry, index) => {
    const time = Date.parse(entry.at);
    const current = rows.at(-1);
    if (isAutomatic(entry)) {
      if (current && time - lastAt <= FOLD_WINDOW_MS) {
        current.steps.push(entry);
      } else {
        rows.push({
          key: String(index),
          at: entry.at,
          kind: "system",
          actor: entry.actor,
          steps: [entry],
        });
      }
    } else {
      rows.push({
        key: String(index),
        at: entry.at,
        kind: actorKind(entry.actor),
        actor: entry.actor,
        lead: entry,
        steps: [],
      });
    }
    lastAt = time;
  });
  return rows.map(summarize).reverse();
};

const pad = (value: number): string => String(value).padStart(2, "0");

/** The local calendar day of a time, `YYYY-MM-DD`. */
export const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export interface TimelineDay {
  key: string;
  /** `today` / `yesterday` relative to `now`, else `null` (the heading shows the date). */
  relative: "today" | "yesterday" | null;
  /** A time on that day, to format the heading. */
  at: string;
  rows: TimelineRow[];
}

/** Rows (newest first) under one heading per local day, in the same order. */
export const groupByDay = (rows: TimelineRow[], now: Date): TimelineDay[] => {
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const days: TimelineDay[] = [];
  for (const row of rows) {
    const key = dayKey(new Date(row.at));
    const last = days.at(-1);
    if (last && last.key === key) {
      last.rows.push(row);
      continue;
    }
    let relative: TimelineDay["relative"] = null;
    if (key === today) {
      relative = "today";
    } else if (key === yesterday) {
      relative = "yesterday";
    }
    days.push({ key, relative, at: row.at, rows: [row] });
  }
  return days;
};

/** Rows shown before "Show older". */
export const TIMELINE_VISIBLE = 8;
