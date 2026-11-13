import type { DocumentId, IsoDateTime, LeafAddress, LocaleCode } from "./primitives.js";
import type { RunState } from "./RunState.js";

/** How one leaf of a translated locale stands against its source. */
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
      dismissed: boolean;
    };

export type TreeNode =
  | { kind: "group"; label: string; children: readonly TreeNode[] }
  | {
      /** A block list localized as a whole: each locale owns its blocks, so it goes as one. */
      kind: "whole-list";
      label: string;
      addresses: readonly LeafAddress[];
    }
  | { kind: "leaf"; label: string; address: LeafAddress; required: boolean };

export type LocaleState = {
  locale: LocaleCode;
  content: ContentState;
  /** Independent of `content`: an empty locale can be translating for the first time. */
  run: RunState | null;
  /** Leaves Payload refuses to leave empty in this locale; a run into it must include them. */
  mustInclude: readonly LeafAddress[];
};

/** `GET {basePath}/document-state/:collection_slug/:collection_id` */
export type DocumentTranslationState = {
  collection: string;
  id: DocumentId;
  sourceLocale: LocaleCode;
  /** The saved document's translatable shape, shared by every locale. */
  tree: readonly TreeNode[];
  /** Labels of the fields excluded from translation. */
  excluded: readonly string[];
  locales: readonly LocaleState[];
};
