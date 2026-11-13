import type {
  ContentState,
  LeafVerdict,
  LocaleState,
} from "../../../../types/wire/DocumentTranslationState.js";
import type { IsoDateTime, LocaleCode, RunHandle } from "../../../../types/wire/primitives.js";
import type { RunState } from "../../../../types/wire/RunState.js";

type RunControls = { handle: RunHandle; locales: readonly LocaleCode[] };

/** What one target locale's row says, and what it needs to offer its action. */
export type LocaleRow =
  | { kind: "up-to-date"; translatedAt: IsoDateTime }
  | { kind: "behind"; behind: number; cameBackEmpty: number; translatedAt: IsoDateTime }
  | { kind: "not-translated" }
  | { kind: "written-by-hand" }
  | { kind: "translated" }
  | { kind: "translating"; startedAt: IsoDateTime }
  | ({ kind: "queued" } & RunControls)
  | ({ kind: "failed"; message: string } & RunControls)
  | ({ kind: "not-started"; failedLocale: LocaleCode } & RunControls);

/** `pick`: choose fields; `whole`: the tree is shown, but the locale goes in whole. */
export type TreeMode = "pick" | "whole";

const BEHIND: ReadonlySet<LeafVerdict> = new Set(["drifted", "unrecorded"]);

const countOf = (
  verdicts: Readonly<Record<string, LeafVerdict>>,
  wanted: (v: LeafVerdict) => boolean
) => Object.values(verdicts).filter(wanted).length;

function runRowOf(run: RunState): LocaleRow {
  const controls = { handle: run.handle, locales: run.locales };
  switch (run.status) {
    case "queued":
      return { kind: "queued", ...controls };
    case "running":
      return { kind: "translating", startedAt: run.queuedAt };
    case "failed":
      return { kind: "failed", message: run.message, ...controls };
    case "not-started":
      return { kind: "not-started", failedLocale: run.failedLocale, ...controls };
  }
}

function contentRowOf(content: ContentState): LocaleRow {
  switch (content.kind) {
    case "empty":
      return { kind: "not-translated" };
    case "untracked":
      return { kind: "written-by-hand" };
    case "filled":
      return { kind: "translated" };
    case "tracked": {
      const { verdicts, translatedAt } = content;
      const behind = countOf(verdicts, (v) => BEHIND.has(v));
      const cameBackEmpty = countOf(verdicts, (v) => v === "unanswered");
      if (content.dismissed || behind + cameBackEmpty === 0) {
        return { kind: "up-to-date", translatedAt };
      }
      return { kind: "behind", behind, cameBackEmpty, translatedAt };
    }
  }
}

/** A run outranks content: while a locale has one, the row is about the run. */
export function localeRowOf({ content, run }: Pick<LocaleState, "content" | "run">): LocaleRow {
  return run ? runRowOf(run) : contentRowOf(content);
}

/** A row opens only where the tree means something: a tracked locale, or an empty one with records kept. */
export function treeModeOf(row: LocaleRow, keepsRecords: boolean): TreeMode | null {
  if (row.kind === "up-to-date" || row.kind === "behind") return "pick";
  if (row.kind === "not-translated" && keepsRecords) return "whole";
  return null;
}
