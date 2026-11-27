import type {
  FieldTranslationNotice,
  FieldTranslationResult,
} from "../../../../types/wire/field-translation.js";
import type { LocaleCode } from "../../../../types/wire/primitives.js";
import type { LocaleChoice } from "../../../entities/translation/index.js";

/** A locale the field can be pulled from; `panels` marks the document panel's own source. */
export type SourceChoice = LocaleChoice & { panels: boolean };

/** What the last press led to. `previous` is the value from before the first translation of a series. */
export type ControlOutcome =
  | { kind: "idle" }
  | { kind: "translating"; source: LocaleCode; previous: unknown }
  | { kind: "translated"; source: LocaleCode; previous: unknown }
  | { kind: "failed"; source: LocaleCode; previous: unknown; error: Error }
  | { kind: "noted"; notice: FieldTranslationNotice };

export type FieldControlView =
  | { kind: "hidden" }
  | { kind: "unsaved" }
  | { kind: "localized-list" }
  | { kind: "ready"; notice: FieldTranslationNotice | null }
  | { kind: "translating" }
  | { kind: "translated" }
  | { kind: "failed"; error: Error };

type ViewInput = {
  allowed: boolean;
  saved: boolean;
  sources: readonly SourceChoice[];
  outcome: ControlOutcome;
};

type SourceInput = {
  locales: readonly LocaleChoice[];
  defaultLocale: LocaleCode | undefined;
  target: LocaleCode;
};

export function sourceChoicesOf({ locales, defaultLocale, target }: SourceInput): SourceChoice[] {
  const others = locales
    .filter((locale) => locale.code !== target)
    .map((locale) => ({ ...locale, panels: locale.code === defaultLocale }));
  return [
    ...others.filter((choice) => choice.panels),
    ...others.filter((choice) => !choice.panels),
  ];
}

export const showsSourceMenu = (sources: readonly SourceChoice[]): boolean => sources.length > 1;

export function fieldControlView({
  allowed,
  saved,
  sources,
  outcome,
}: ViewInput): FieldControlView {
  if (!allowed || sources.length === 0) return { kind: "hidden" };
  if (!saved) return { kind: "unsaved" };
  switch (outcome.kind) {
    case "idle":
      return { kind: "ready", notice: null };
    case "translating":
      return { kind: "translating" };
    case "translated":
      return { kind: "translated" };
    case "failed":
      return { kind: "failed", error: outcome.error };
    case "noted":
      return outcome.notice.reason === "localized-list"
        ? { kind: "localized-list" }
        : { kind: "ready", notice: outcome.notice };
    default: {
      const exhaustive: never = outcome;
      return exhaustive;
    }
  }
}

export function outcomeOf(
  answer: FieldTranslationResult,
  request: { source: LocaleCode; previous: unknown }
): ControlOutcome {
  if (answer.status === "translated") return { kind: "translated", ...request };
  return { kind: "noted", notice: answer.notice };
}
