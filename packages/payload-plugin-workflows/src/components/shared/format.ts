// Pure helpers behind the admin UI: names, who a run waits on, the param form, dates. No React,
// no Payload imports, so they are unit-tested directly.

import { TEXT_MAX_LENGTH } from "../../constants.js";
import type { WorkflowsTranslations } from "../../translations.js";
import type { InstanceView, ViewParam } from "../../types.js";

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

/** How to name users: the signed-in one is "you", others by display name, else by id. */
export interface People {
  me?: string;
  labels?: Record<string, string>;
}

/** A user id as people read it: "you", their display name, or the id when it is unreadable. */
export const personName = (id: string, people: People, t: T): string =>
  id === people.me ? t("you") : (people.labels?.[id] ?? id);

/** The user ids runs name: who they wait on, assignees, who started them, people in their history. */
export const userIdsIn = (views: InstanceView[]): string[] =>
  views.flatMap((view) => [
    ...view.waitingOn.users,
    ...view.activities.flatMap((activity) => (activity.assignee ? [activity.assignee] : [])),
    ...[view.started.actor, ...view.history.map((entry) => entry.actor)].flatMap((actor) =>
      actor.id === undefined ? [] : [actor.id]
    ),
    ...view.history.flatMap((entry) => {
      const by = entry.cause && "by" in entry.cause ? entry.cause.by : undefined;
      return by ? [by.id] : [];
    }),
  ]);

/** Who a run waits on, in words: "you, editor (role)". Empty when anyone may act. */
export const waitingOnText = (waitingOn: InstanceView["waitingOn"], people: People, t: T): string =>
  [
    ...waitingOn.users.map((id) => personName(id, people, t)),
    ...waitingOn.roles.map((role) => t("roleLabel", { role })),
  ].join(", ");

/** A guard's operations in words: "publishing, saving". */
export const operationsText = (operations: string[], t: T): string => {
  const words: Record<string, string> = {
    publish: t("operationPublish"),
    update: t("operationUpdate"),
    delete: t("operationDelete"),
  };
  return operations.map((operation) => words[operation] ?? operation).join(", ");
};

/**
 * What a hold says first, in plain words: "Publishing is on hold." The guard's own title follows
 * it, as in the server's refusal of the write.
 */
export const holdLead = (operations: string[], t: T): string => {
  const words = operationsText(operations, t).split(", ");
  const listed =
    words.length > 1
      ? t("listAnd", { first: words.slice(0, -1).join(", "), last: words.at(-1) })
      : (words[0] ?? "");
  return t("holdLead", {
    count: words.length,
    operations: listed.charAt(0).toUpperCase() + listed.slice(1),
  });
};

// ---- Param form ------------------------------------------------------------------------------

/** What the form holds per param before it is sent: text for inputs, a flag for a checkbox. */
export type ParamInput = string | boolean;

export const paramLabel = (def: ViewParam): string => def.title ?? humanize(def.name);

export const optionsOf = (def: ViewParam): { label: string; value: string }[] =>
  (def.options ?? []).map((option) =>
    typeof option === "string" ? { label: option, value: option } : option
  );

export const initialInputs = (defs: ViewParam[]): Record<string, ParamInput> =>
  Object.fromEntries(defs.map((def) => [def.name, def.type === "boolean" ? false : ""]));

/**
 * The form's inputs as the params the engine expects, or a message per invalid field. Mirrors the
 * server's checks that a person can fix (required, numbers, length); the server has the last word.
 */
export const readParams = (
  defs: ViewParam[],
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
    const max = def.maxLength ?? TEXT_MAX_LENGTH;
    if ((def.type === "string" || def.type === "text") && text.length > max) {
      errors[def.name] = t("paramsTooLong", { label, max });
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

// ---- Feedback --------------------------------------------------------------------------------

/**
 * The toast after an action worked, from the run before and after it: "Approve — moved to
 * Approved", "Approve — workflow complete", or "Take this review — done".
 */
export const actionToast = (
  action: string,
  before: InstanceView | undefined,
  after: InstanceView | undefined,
  t: T
): string => {
  if (after?.status === "completed") {
    return t("toastCompleted", { action });
  }
  if (after && before && after.stage.name !== before.stage.name) {
    return t("toastMoved", { action, stage: after.stage.title });
  }
  return t("toastDone", { action });
};
