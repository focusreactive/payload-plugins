// Pure helpers behind the admin UI: history sentences, param form validation, dates. No React,
// no Payload imports, so they are unit-tested directly.

import type { WorkflowsTranslations } from "../../translations/en.js";
import type { Actor, HistoryEntry, InstanceView, ParamDef } from "../../types.js";

type Key = keyof WorkflowsTranslations;
type PluralBase<K> = K extends `${infer Base}_one` ? Base : never;
/** A string key; plural ones (`runs_one` / `runs_other`) by their base name, chosen by `count`. */
export type TKey = Exclude<Key, `${string}_one` | `${string}_other`> | PluralBase<Key>;

/** The plugin's `t`, keyed by its own strings. */
export type T = (key: TKey, vars?: Record<string, unknown>) => string;

/** `"request-changes"` → `"Request changes"`: the fallback when a definition declares no title. */
export const humanize = (name: string): string => {
  const words = name.replace(/[-_]+/gu, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : name;
};

export const titleIn = (
  titles: Record<string, string> | undefined,
  key: string,
  name: string
): string => titles?.[key] ?? humanize(name);

export interface People {
  /** The signed-in user, to say "you". */
  me?: string;
  labels?: Record<string, string>;
}

/** A user id as people read it: "you", their display name, or the id when it is unreadable. */
export const personName = (id: string, people: People, t: T): string =>
  id === people.me ? t("you") : (people.labels?.[id] ?? id);

export const actorName = (actor: Actor, people: People, t: T): string => {
  if (actor.id === undefined) {
    return t("actorSystem");
  }
  const name = actor.id === people.me ? t("actorYou") : (people.labels?.[actor.id] ?? actor.id);
  if (actor.via === "agent") {
    return t("actorAgent", { name });
  }
  return actor.via === "api" ? t("actorApi", { name }) : name;
};

const paramText = (value: unknown): string =>
  typeof value === "string" ? value : JSON.stringify(value);

/** One history entry as a sentence: "You chose “Request changes” on Review the page." */
export const historySentence = (
  entry: HistoryEntry,
  view: Pick<InstanceView, "titles">,
  people: People,
  t: T
): string => {
  const actor = actorName(entry.actor, people, t);
  const stage = (name: string) => titleIn(view.titles, name, name);
  switch (entry.type) {
    case "started":
      return t("historyStarted", { actor, stage: stage(entry.stage) });
    case "action": {
      const base = `${entry.stage}/${entry.activity}`;
      const action = titleIn(view.titles, `${base}/${entry.action}`, entry.action);
      const activity = titleIn(view.titles, base, entry.activity);
      const sentence = entry.auto
        ? t("historyActionAuto", { action, activity })
        : t("historyAction", { actor, action, activity });
      const params = Object.entries(entry.params ?? {})
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .map(
          ([name, value]) =>
            `${titleIn(view.titles, `${base}/${entry.action}/${name}`, name)}: ${paramText(value)}`
        );
      return params.length > 0 ? `${sentence} ${params.join("; ")}` : sentence;
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
      return entry.reason
        ? t("historyAbortedReason", { actor, reason: entry.reason })
        : t("historyAborted", { actor });
    default:
      return "";
  }
};

/** Who a run waits on, in words: "you, editor (role)". Empty when anyone may act. */
export const waitingOnText = (waitingOn: InstanceView["waitingOn"], people: People, t: T): string =>
  [
    ...waitingOn.users.map((id) => personName(id, people, t)),
    ...waitingOn.roles.map((role) => t("roleLabel", { role })),
  ].join(", ");

// ---- Param form ------------------------------------------------------------------------------

/** What the form holds per param before it is sent: text for inputs, a flag for a checkbox. */
export type ParamInput = string | boolean;

export const paramLabel = (def: ParamDef): string => def.title ?? humanize(def.name);

export const optionsOf = (def: ParamDef): { label: string; value: string }[] =>
  (def.options ?? []).map((option) =>
    typeof option === "string" ? { label: option, value: option } : option
  );

export const initialInputs = (defs: ParamDef[]): Record<string, ParamInput> =>
  Object.fromEntries(defs.map((def) => [def.name, def.type === "boolean" ? false : ""]));

/**
 * The form's inputs as the params the engine expects, or a message per invalid field. Mirrors the
 * server's checks that a person can fix (required, numbers); the server still has the last word.
 */
export const readParams = (
  defs: ParamDef[],
  inputs: Record<string, ParamInput>,
  t: T
): { params: Record<string, unknown>; errors: Record<string, string> } => {
  const params: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const def of defs) {
    const input = inputs[def.name];
    const label = paramLabel(def);
    if (def.type === "boolean") {
      params[def.name] = input === true;
      continue;
    }
    const text = typeof input === "string" ? input.trim() : "";
    if (text === "") {
      if (def.required) {
        errors[def.name] = t("paramsRequired", { label });
      }
      continue;
    }
    if (def.type === "number") {
      const value = Number(text);
      if (Number.isFinite(value)) {
        params[def.name] = value;
      } else {
        errors[def.name] = t("paramsNumber", { label });
      }
      continue;
    }
    if (def.type === "date") {
      const time = Date.parse(text);
      if (Number.isNaN(time)) {
        errors[def.name] = t("paramsDate", { label });
      } else {
        params[def.name] = new Date(time).toISOString();
      }
      continue;
    }
    params[def.name] = text;
  }
  return { params, errors };
};

// ---- Dates -----------------------------------------------------------------------------------

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "3 minutes ago", "yesterday", "just now" in the admin's language. */
export const formatRelative = (iso: string, now: Date, locale: string): string => {
  const seconds = Math.round((Date.parse(iso) - now.getTime()) / 1000);
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return format.format(Math.round(seconds / size), unit);
    }
  }
  return format.format(0, "second");
};

export const formatDateTime = (iso: string, locale: string): string =>
  new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(iso)
  );
