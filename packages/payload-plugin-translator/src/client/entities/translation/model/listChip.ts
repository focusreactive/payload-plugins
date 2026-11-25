import type { ListLocaleState } from "../../../../types/wire/ListTranslationState.js";
import type { IsoDateTime, LocaleCode } from "../../../../types/wire/primitives.js";
import type { RunState } from "../../../../types/wire/RunState.js";

/** One locale's mark in the list column. A run outranks what the locale holds. */
export type ListChip =
  | { kind: "translated"; locale: LocaleCode; translatedAt: IsoDateTime | null }
  | { kind: "not-translated"; locale: LocaleCode }
  | { kind: "translating"; locale: LocaleCode }
  | { kind: "queued"; locale: LocaleCode }
  | { kind: "failed"; locale: LocaleCode; message: string };

function runChipOf(locale: LocaleCode, run: RunState): ListChip {
  switch (run.status) {
    case "queued":
      return { kind: "queued", locale };
    case "running":
      return { kind: "translating", locale };
    case "failed":
      return { kind: "failed", locale, message: run.message };
    case "not-started":
      return { kind: "failed", locale, message: `Not started: ${run.failedLocale} failed first` };
  }
}

export function listChipOf({ locale, content, run }: ListLocaleState): ListChip {
  if (run) return runChipOf(locale, run);
  if (content.kind === "empty") return { kind: "not-translated", locale };
  return { kind: "translated", locale, translatedAt: content.translatedAt };
}
