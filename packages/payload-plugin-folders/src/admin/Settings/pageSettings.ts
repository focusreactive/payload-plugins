import type { FolderId } from "../../types.js";

/** What the page settings drawer edits. */
export type PageSettingsValues = {
  isFolderRoot: boolean;
  parentId: FolderId | null;
  /** The segment the form shows: the page's own value in the admin locale. */
  segment: string;
  title: string;
};

/** The values one save step writes; a missing key is left alone. */
export type PageFieldChanges = {
  isFolderRoot?: boolean;
  segment?: string;
  title?: string;
};

export type PageSaveStep =
  | {
      changes: PageFieldChanges;
      kind: "content";
      /**
       * `draft` is a draft edit, which changes no live URL. `live` writes the live page, so its URL
       * changes now.
       */
      mode: "draft" | "live";
      /** The editor confirms before it goes: a live save that changes a URL nobody has chosen yet. */
      needsConfirm: boolean;
    }
  | { kind: "move"; toFolder: FolderId | null };

const sameValue = <Value>(left: Value, right: Value): boolean => left === right;

const hasKeys = (changes: PageFieldChanges): boolean => Object.keys(changes).length > 0;

/**
 * The saves the page settings drawer makes, in order (spec section 7.8):
 *
 * - Title and segment are a draft edit in a collection with drafts, so the URL changes when the
 *   page is published. A collection without drafts has no such state: its edit is live, and a new
 *   URL is confirmed first.
 * - The root flag follows Set as root page: a page with a newer draft takes it as part of the draft,
 *   a published page takes it live, after the confirmation for a new root, and before any draft
 *   edit so that edit is not published along with it. Unticking has chosen its segment in the
 *   un-root dialog already, so the segment goes with it and nothing asks again.
 * - A new parent folder is a move, last, with the move's own preview and confirmation.
 */
export const planPageSettingsSave = ({
  edited,
  hasDrafts,
  hasNewerDraft,
  stored,
}: {
  edited: PageSettingsValues;
  hasDrafts: boolean;
  /** The latest version is a draft: the page is a draft, or published with an unpublished change. */
  hasNewerDraft: boolean;
  stored: PageSettingsValues;
}): PageSaveStep[] => {
  const steps: PageSaveStep[] = [];
  const isRootChanged = !sameValue(stored.isFolderRoot, edited.isFolderRoot);
  const isUnrooted = isRootChanged && !edited.isFolderRoot;
  const content: PageFieldChanges = {};
  if (!sameValue(stored.title, edited.title)) {
    content.title = edited.title;
  }
  // A root page's own segment is not part of its URL and the field is greyed, so only un-rooting,
  // which chose one in the dialog, writes it.
  if (!sameValue(stored.segment, edited.segment) && (!edited.isFolderRoot || isUnrooted)) {
    content.segment = edited.segment;
  }
  if (isRootChanged) {
    content.isFolderRoot = edited.isFolderRoot;
  }

  if (hasKeys(content)) {
    if (!hasDrafts) {
      steps.push({
        changes: content,
        kind: "content",
        mode: "live",
        needsConfirm:
          (isRootChanged && edited.isFolderRoot) ||
          (!isRootChanged && content.segment !== undefined),
      });
    } else if (!isRootChanged || hasNewerDraft) {
      steps.push({ changes: content, kind: "content", mode: "draft", needsConfirm: false });
    } else {
      const { isFolderRoot, segment, ...draftEdit } = content;
      steps.push({
        changes: { isFolderRoot, ...(segment === undefined ? {} : { segment }) },
        kind: "content",
        mode: "live",
        needsConfirm: edited.isFolderRoot,
      });
      if (hasKeys(draftEdit)) {
        steps.push({ changes: draftEdit, kind: "content", mode: "draft", needsConfirm: false });
      }
    }
  }

  if (String(stored.parentId) !== String(edited.parentId)) {
    steps.push({ kind: "move", toFolder: edited.parentId });
  }

  return steps;
};

/** The body of a content step. A published page of a collection with drafts must say it stays published. */
export const pageBodyOf = ({
  changes,
  hasDrafts,
  mode,
  segmentField,
  titleField,
}: {
  changes: PageFieldChanges;
  hasDrafts: boolean;
  mode: "draft" | "live";
  segmentField: string;
  titleField: string;
}): Record<string, boolean | string> => ({
  ...(hasDrafts ? { _status: mode === "draft" ? "draft" : "published" } : {}),
  ...(changes.title === undefined ? {} : { [titleField]: changes.title }),
  ...(changes.segment === undefined ? {} : { [segmentField]: changes.segment }),
  ...(changes.isFolderRoot === undefined ? {} : { isFolderRoot: changes.isFolderRoot }),
});
