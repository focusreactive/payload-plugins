import type { DocumentId, IsoDateTime, LeafAddress, LocaleCode } from "./primitives.js";
import type { RunState } from "./RunState.js";

/**
 * How one leaf of a translated locale stands against its source. A wire contract imports nothing
 * outside itself, so the engine's own union is a second spelling of these four words, pinned to
 * this one by `core/domain/provenance/__tests__/theVerdictVocabularyIsOne.pins.ts`.
 */
export type LeafVerdict = "current" | "drifted" | "unanswered" | "unrecorded";

/**
 * What a target locale holds. `untracked` is content with no record of a run — someone wrote it —
 * and is never folded into `empty`. `filled` is content where no records are kept at all.
 */
export type ContentState =
  | { kind: "empty" }
  | { kind: "untracked" }
  | { kind: "filled" }
  | {
      kind: "tracked";
      verdicts: Readonly<Record<LeafAddress, LeafVerdict>>;
      translatedAt: IsoDateTime;
      sourceLocale: LocaleCode;
    };

export type TreeNode =
  | { kind: "group"; label: string; children: readonly TreeNode[] }
  | {
      kind: "whole-list";
      label: string;
      addresses: readonly LeafAddress[];
    }
  | { kind: "leaf"; label: string; address: LeafAddress; required: boolean };

export type LocaleState = {
  locale: LocaleCode;
  content: ContentState;
  run: RunState | null;
};

export type DocumentTranslationState = {
  collection: string;
  id: DocumentId;
  sourceLocale: LocaleCode;
  tree: readonly TreeNode[];
  excluded: readonly string[];
  locales: readonly LocaleState[];
};
