import type { Where } from "payload";

export type CountStatus = "any" | "draft" | "published";
export type CountPeriod = "1" | "7" | "30" | "all";
export type CountDateField = "createdAt" | "updatedAt";

/** Settings of one "Document count" widget — what the editor fills in the widget form. */
export interface CountSettings {
  collection?: string;
  dateField?: CountDateField;
  /** Optional extra filter: only documents where `field` equals `value`. */
  field?: string;
  label?: string;
  period?: CountPeriod;
  status?: CountStatus;
  value?: string;
}

const DAY = 24 * 60 * 60 * 1000;

export const periodDays = (period: CountPeriod | undefined): number | null =>
  !period || period === "all" ? null : Number(period);

/** One `field operator value` condition; a list of them is AND-ed. */
export interface Condition {
  field: string;
  operator: "equals" | "greater_than_equal" | "less_than";
  value: string;
}

/**
 * The filter a widget describes, as a flat AND-list. `window` picks the current period or the
 * one right before it (for the trend).
 */
export const buildConditions = (
  settings: CountSettings,
  options: { hasDrafts: boolean; now: Date; window?: "current" | "previous" }
): Condition[] => {
  const conditions: Condition[] = [];
  const status = settings.status ?? "any";
  if (options.hasDrafts && status !== "any") {
    conditions.push({ field: "_status", operator: "equals", value: status });
  }

  const field = settings.field?.trim();
  const value = settings.value?.trim();
  if (field && value) {
    conditions.push({ field, operator: "equals", value });
  }

  const days = periodDays(settings.period);
  if (days !== null) {
    const dateField = settings.dateField ?? "updatedAt";
    const end = options.now.getTime() - (options.window === "previous" ? days * DAY : 0);
    conditions.push({
      field: dateField,
      operator: "greater_than_equal",
      value: new Date(end - days * DAY).toISOString(),
    });
    if (options.window === "previous") {
      conditions.push({
        field: dateField,
        operator: "less_than",
        value: new Date(end).toISOString(),
      });
    }
  }
  return conditions;
};

/** Payload `where`. With `prefix: "version."` it targets the versions collection instead. */
export const toWhere = (conditions: Condition[], prefix = ""): Where => ({
  and: conditions.map((condition) => ({
    [`${prefix}${condition.field}`]: { [condition.operator]: condition.value },
  })),
});

/** Query string that opens the admin list view with the same filter applied. */
export const toListQuery = (conditions: Condition[]): string =>
  conditions
    .map(
      (condition, index) =>
        `${encodeURIComponent(`where[and][${index}][${condition.field}][${condition.operator}]`)}=${encodeURIComponent(condition.value)}`
    )
    .join("&");

const PERIOD_TEXT: Record<Exclude<CountPeriod, "all">, string> = {
  "1": "in the last 24 hours",
  "30": "in the last 30 days",
  "7": "in the last 7 days",
};

/** Heading built from the settings, e.g. "Published articles", used when no label is given. */
export const defaultHeading = (settings: CountSettings, collectionLabel: string): string => {
  const status = settings.status ?? "any";
  const prefix = status === "draft" ? "Draft " : status === "published" ? "Published " : "";
  const name = prefix ? collectionLabel.toLowerCase() : collectionLabel;
  const extra =
    settings.field?.trim() && settings.value?.trim() ? ` · ${settings.value.trim()}` : "";
  return `${prefix}${name}${extra}`;
};

/** Small print under the number, e.g. "updated in the last 7 days". */
export const periodCaption = (settings: CountSettings): string => {
  if (!settings.period || settings.period === "all") {
    return "all time";
  }
  const verb = (settings.dateField ?? "updatedAt") === "createdAt" ? "created" : "updated";
  return `${verb} ${PERIOD_TEXT[settings.period]}`;
};
