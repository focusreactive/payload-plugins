// How a run's history reads in the drawer: one row per step a person or an agent took, the
// automatic steps it caused folded under it, automatic stretches nobody caused as rows of their
// own, rows grouped by day. Pure (no React, no Payload), so it is unit-tested directly. The stored history is untouched.

import type { Actor, HistoryEntry, InstanceView } from "../../types.js";
import { humanize, personName, titleIn } from "./format.js";
import type { People, T } from "./format.js";

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

/** Rows shown before "Show older". */
export const TIMELINE_VISIBLE = 8;

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

type Draft = Pick<TimelineRow, "key" | "at" | "kind" | "actor" | "lead" | "steps">;

const summarize = (row: Draft): TimelineRow => {
  const entries = row.lead ? [row.lead, ...row.steps] : row.steps;
  const moves = entries.flatMap((entry) => (entry.type === "transition" ? [entry.to] : []));
  const movedTo = moves.at(-1);
  return {
    ...row,
    ...(movedTo === undefined ? {} : { movedTo }),
    completed: entries.some((entry) => entry.type === "completed"),
    failed: entries.filter((entry) => entry.type === "effect" && entry.status === "failed"),
  };
};

/**
 * Folds the history (oldest first, as stored) into rows, newest first. A step a person or agent
 * took starts a row; the automatic steps it caused join it: those recorded by the same operation
 * (same time) and its effects, with what their results moved. Automatic steps nobody caused (a
 * document save, the clock) form an "Automated" row of their own.
 */
export const timelineRows = (history: HistoryEntry[]): TimelineRow[] => {
  const rows: Draft[] = [];
  let lastAt: string | undefined;
  history.forEach((entry, index) => {
    const current = rows.at(-1);
    const caused = entry.at === lastAt || entry.type === "effect";
    if (isAutomatic(entry) && current && caused) {
      current.steps.push(entry);
    } else if (isAutomatic(entry)) {
      rows.push({
        key: String(index),
        at: entry.at,
        kind: "system",
        actor: entry.actor,
        steps: [entry],
      });
    } else {
      const kind = actorKind(entry.actor);
      rows.push({
        key: String(index),
        at: entry.at,
        kind,
        actor: entry.actor,
        lead: entry,
        steps: [],
      });
    }
    lastAt = entry.at;
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
    if (last?.key === key) {
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

// ---- Words ----------------------------------------------------------------------------------

type Titles = Record<string, string> | undefined;

/** One step as a sentence: "“Reset” ran on Review." Used for automatic steps and failures. */
export const stepSentence = (entry: HistoryEntry, titles: Titles, t: T): string => {
  const stage = (name: string) => titleIn(titles, name, name);
  switch (entry.type) {
    case "started":
      return t("historyStarted", { stage: stage(entry.stage) });
    case "action": {
      const base = `${entry.stage}/${entry.activity}`;
      return t("historyAction", {
        action: titleIn(titles, `${base}/${entry.action}`, entry.action),
        activity: titleIn(titles, base, entry.activity),
      });
    }
    case "transition":
      return t("historyTransition", { from: stage(entry.from), to: stage(entry.to) });
    case "effect": {
      const effect = humanize(entry.effect);
      if (entry.status === "failed") {
        return t("historyEffectFailed", { effect, error: entry.error ?? "" });
      }
      return entry.status === "done"
        ? t("historyEffectDone", { effect })
        : t("historyEffectQueued", { effect });
    }
    case "completed":
      return t("historyCompleted");
    case "aborted":
      return t("historyAborted");
    default:
      return "";
  }
};

/** Who did the row's step, as its line names them: "You", "Ann · AI agent", "Automated". */
export const rowWho = (row: TimelineRow, people: People, t: T): string => {
  if (row.kind === "system" || row.actor.id === undefined) {
    return t("timelineAutomated");
  }
  // "You" starts the line; other names stay as written (an email is not capitalised).
  const name = row.actor.id === people.me ? t("actorYou") : personName(row.actor.id, people, t);
  return row.kind === "agent" ? t("timelineByAgent", { name }) : name;
};

/** What happened, after the dot: "Approve → moved to Approved → completed". */
export const rowWhat = (row: TimelineRow, titles: Titles, t: T): string => {
  const stage = (name: string) => titleIn(titles, name, name);
  const parts: string[] = [];
  const first = row.lead ?? row.steps[0];
  if (first?.type === "action" && row.lead) {
    parts.push(titleIn(titles, `${first.stage}/${first.activity}/${first.action}`, first.action));
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
    return stepSentence(row.steps[0], titles, t);
  }
  const text = parts.join(" → ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** The row's inputs, kept visible under its line: an action's params, an abort's reason. */
export const rowDetails = (row: TimelineRow, titles: Titles, t: T): string[] => {
  const entry = row.lead ?? row.steps[0];
  if (entry?.type === "aborted") {
    return entry.reason ? [`${t("historyReason")}: ${entry.reason}`] : [];
  }
  if (entry?.type !== "action") {
    return [];
  }
  const base = `${entry.stage}/${entry.activity}/${entry.action}`;
  return Object.entries(entry.params ?? {})
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([name, value]) =>
        `${titleIn(titles, `${base}/${name}`, name)}: ${typeof value === "string" ? value : JSON.stringify(value)}`
    );
};

/** Who started the run and when, from its first entry. */
export const startOf = (history: HistoryEntry[]): { actor: Actor; at: string } | undefined => {
  const first = history.find((entry) => entry.type === "started");
  return first ? { actor: first.actor, at: first.at } : undefined;
};

/**
 * The last step a person or agent took and when the run last changed: what a finished run's
 * summary names ("last step “Approve” by Bea").
 */
export const lastStepOf = (view: InstanceView): { actor?: Actor; action?: string; at?: string } => {
  const row = timelineRows(view.history).find((entry) => entry.lead);
  const lead = row?.lead;
  const action =
    lead?.type === "action"
      ? titleIn(view.titles, `${lead.stage}/${lead.activity}/${lead.action}`, lead.action)
      : undefined;
  return {
    ...(lead ? { actor: lead.actor } : {}),
    ...(action ? { action } : {}),
    ...(view.history.at(-1)?.at ? { at: view.history.at(-1)?.at } : {}),
  };
};

/**
 * Why the run is where it is, when a person's step with params sent it there ("Request changes"
 * with a reason): who, which action, and its params. From the history, for any workflow.
 */
export const enteredBecause = (
  view: InstanceView,
  t: T
): { actor: Actor; action: string; details: string[] } | undefined => {
  if (view.status !== "active") {
    return undefined;
  }
  // The latest row that moved the run is the one that brought it into this stage.
  const row = timelineRows(view.history).find((entry) => entry.movedTo !== undefined);
  const lead = row?.lead;
  if (!row || row.movedTo !== view.stage.name || lead?.type !== "action") {
    return undefined;
  }
  const details = rowDetails(row, view.titles, t);
  if (details.length === 0) {
    return undefined;
  }
  const action = titleIn(view.titles, `${lead.stage}/${lead.activity}/${lead.action}`, lead.action);
  return { actor: lead.actor, action, details };
};
