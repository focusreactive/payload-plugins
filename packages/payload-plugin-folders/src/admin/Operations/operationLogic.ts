import type { DeletePreview } from "../../core/deleteItems.js";
import type { OperationKind, OperationProgress } from "../../core/operations.js";
import type { PublishAction, PublishPreview } from "../../core/publish.js";
import type { FolderId, TreeItem } from "../../types.js";
import { isNestedIn } from "../Move/moveFlow.js";
import { itemKeyOf } from "../store.js";

/** Items to hand an endpoint: a folder carries everything inside it, so nested rows are left out. */
export const rootsOf = (items: readonly TreeItem[]): TreeItem[] =>
  items.filter(
    (item) =>
      !items.some((other) => itemKeyOf(other) !== itemKeyOf(item) && isNestedIn(item, other))
  );

/** One line of the delete preview's `sample`: `/news/a (published)`, `/news (folder)`. */
export type DeleteListingRow = {
  isFolder: boolean;
  /**
   * A page that sits at the path of a folder in the same list is that folder's root page: deleting
   * it takes the folder's own URL down, which the dialog says.
   */
  isRootPage: boolean;
  path: string;
  /** The page's status as the server wrote it (`published`, `draft`, `changed`, `live`); `null` for a folder. */
  status: string | null;
};

const sampleRowPattern = /^(.*) \(([^()]*)\)$/u;

export const parseDeleteListing = (sample: readonly string[]): DeleteListingRow[] => {
  const parsed = sample.map((line) => {
    const match = sampleRowPattern.exec(line);
    const path = match?.[1] ?? line;
    const suffix = match?.[2] ?? null;

    return { isFolder: suffix === "folder", path, status: suffix === "folder" ? null : suffix };
  });
  const folderPaths = new Set(parsed.filter((row) => row.isFolder).map((row) => row.path));

  return parsed.map((row) => ({
    ...row,
    isRootPage: !row.isFolder && folderPaths.has(row.path),
  }));
};

export type DeleteListing = {
  /** Folders and pages beyond the sample: "and 37 more". */
  moreCount: number;
  rows: DeleteListingRow[];
  /** Root pages in the list: each one takes its folder's URL down with it. */
  rootPageCount: number;
};

export const deleteListingOf = (
  preview: Pick<DeletePreview, "folders" | "pages" | "sample">
): DeleteListing => {
  const rows = parseDeleteListing(preview.sample);

  return {
    moreCount: Math.max(0, preview.folders + preview.pages - preview.sample.length),
    rows,
    rootPageCount: rows.filter((row) => row.isRootPage).length,
  };
};

/** What the delete dialog asks as its headline. */
export type DeleteHeadline =
  | { key: "deleteTitleFolder"; variables: { path: string } }
  | { key: "deleteTitleItems"; variables: { count: number } }
  | { key: "deleteTitlePage"; variables: { title: string } };

export const deleteHeadlineOf = (items: readonly TreeItem[]): DeleteHeadline => {
  const [only] = items;
  if (items.length === 1 && only.kind === "page") {
    return { key: "deleteTitlePage", variables: { title: only.title } };
  }
  if (items.length === 1) {
    return {
      key: "deleteTitleFolder",
      variables: { path: only.fullPath === "" ? only.title : only.fullPath },
    };
  }

  return { key: "deleteTitleItems", variables: { count: items.length } };
};

/**
 * Whether the Delete button may be pressed: the word the preview asked for, typed exactly (the
 * server compares the trimmed text and ignores nothing else), when it asked for one.
 */
export const isDeleteConfirmed = (confirmWord: string | null, typed: string): boolean =>
  confirmWord === null || typed.trim() === confirmWord;

/**
 * The refusal of a delete or a publish or a copy, from the endpoint's 403: how many documents it is
 * about. `items` is only the first 50 of them, so the number comes from `count`.
 */
export const refusedCountOf = (data: Record<string, unknown> | null): number => {
  const count = data?.count;

  return typeof count === "number" && Number.isFinite(count) ? count : 0;
};

/** What the Publish dialog states for a preview: pages that change, folders they sit in, what is skipped. */
export type PublishSummary = {
  /** Collections without drafts, whose pages are always live and are not touched. */
  liveCollections: Array<{ collection: string; count: number }>;
  /** Pages already in the target state. */
  unchangedCount: number;
};

export const publishSummaryOf = (preview: Pick<PublishPreview, "skipped">): PublishSummary => ({
  liveCollections: preview.skipped
    .filter((skip) => skip.reason === "live")
    .map(({ collection, count }) => ({ collection, count })),
  unchangedCount: preview.skipped
    .filter((skip) => skip.reason === "unchanged")
    .reduce((sum, skip) => sum + skip.count, 0),
});

/** Nothing to do: every page is already in the target state, or lives in a collection without drafts. */
export const isPublishNoOp = (preview: Pick<PublishPreview, "pages">): boolean =>
  preview.pages === 0;

export type DuplicateRefusal = "sameFolder";

/**
 * A bulk copy needs a folder other than the one any selected row sits in, because the copies would
 * keep their URL segments and clash with the originals (spec section 7.10). Known from the rows on
 * screen, so the dialog says it before sending anything; one item has its own name and segment.
 * `target` is the chosen folder, `null` for the top level.
 */
export const duplicateRefusalOf = (
  items: readonly TreeItem[],
  target: FolderId | null
): DuplicateRefusal | null => {
  const roots = rootsOf(items);
  if (roots.length < 2) {
    return null;
  }

  return roots.some((item) => String(item.parentId) === String(target)) ? "sameFolder" : null;
};

/** The default name of a single copy, and the text its segment follows. */
export const copyNameOf = (title: string, suffix: string): string => `${title} ${suffix}`;

/** The translation key of the banner line for an operation. */
const bannerKeys = {
  delete: "operationBannerDelete",
  duplicate: "operationBannerDuplicate",
  mirrorRedirects: "operationBannerMirrorRedirects",
  publish: "operationBannerPublish",
  unpublish: "operationBannerUnpublish",
} as const satisfies Record<OperationKind, string>;

const doneKeys = {
  delete: "operationDoneDelete",
  duplicate: "operationDoneDuplicate",
  mirrorRedirects: "operationDoneMirrorRedirects",
  publish: "operationDonePublish",
  unpublish: "operationDoneUnpublish",
} as const satisfies Record<OperationKind, string>;

const titleKeys = {
  delete: "operationTitleDelete",
  duplicate: "operationTitleDuplicate",
  mirrorRedirects: "operationTitleMirrorRedirects",
  publish: "operationTitlePublish",
  unpublish: "operationTitleUnpublish",
} as const satisfies Record<OperationKind, string>;

const kindKeys = {
  delete: "operationKindDelete",
  duplicate: "operationKindDuplicate",
  mirrorRedirects: "operationKindMirrorRedirects",
  publish: "operationKindPublish",
  unpublish: "operationKindUnpublish",
} as const satisfies Record<OperationKind, string>;

export const kindKeyOf = (kind: OperationKind) => kindKeys[kind];
export const bannerKeyOf = (kind: OperationKind) => bannerKeys[kind];
export const doneKeyOf = (kind: OperationKind) => doneKeys[kind];
export const titleKeyOf = (kind: OperationKind) => titleKeys[kind];

/** Where an operation stands, as the dialog and the banner read it. */
export type OperationView = {
  done: number;
  error?: string;
  id: FolderId;
  kind: OperationKind;
  status: OperationProgress["status"];
  total: number;
};

/** The share of the work done, 0 to 100, for the bar; an empty work list counts as done. */
export const percentOf = ({ done, total }: Pick<OperationView, "done" | "total">): number =>
  total <= 0 ? 100 : Math.min(100, Math.floor((done / total) * 100));

/** An operation still has steps to take (a failed one waits for a retry, so it does not). */
export const isRunning = (operation: Pick<OperationView, "status">): boolean =>
  operation.status === "running";

/** The operations of the page after one of them moved on; the others stay as they are. */
export const withProgress = (
  operations: readonly OperationView[],
  id: FolderId,
  progress: OperationProgress
): OperationView[] =>
  operations.map((operation) =>
    String(operation.id) === String(id)
      ? {
          done: progress.done,
          ...(progress.error ? { error: progress.error } : {}),
          id: operation.id,
          kind: operation.kind,
          status: progress.status,
          total: progress.total,
        }
      : operation
  );

/**
 * What the unfinished operations a reload read add to what the page already tracks: an operation
 * started in this page keeps its own, newer progress.
 */
export const mergeResumed = (
  tracked: readonly OperationView[],
  resumed: readonly OperationView[]
): OperationView[] => {
  const known = new Set(tracked.map((operation) => String(operation.id)));

  return [...tracked, ...resumed.filter((operation) => !known.has(String(operation.id)))];
};

export type { PublishAction };
