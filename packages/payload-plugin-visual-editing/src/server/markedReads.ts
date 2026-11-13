import type { PayloadRequest } from "payload";

export type Enrichment = "auto" | "explicit";

export type MarkedReadsOptions = {
  adminBasePath: string;
  enrichment: Enrichment;
};

export type MarkedReadRequest = Pick<PayloadRequest, "context" | "pathname" | "payloadAPI">;

type Operation = { operation: string; args: unknown; req: MarkedReadRequest };

type GlobalOperation = Operation & { slug: string };

type GlobalRead = { slug: string; req: MarkedReadRequest; query?: unknown; findMany?: unknown };

type OpenReads = { draft: number; other: number };

const COLLECTION_DRAFT_READS = new Set(["find", "findByID"]);
const COLLECTION_VERSION_READS = new Set(["findVersions", "findVersionByID"]);
const GLOBAL_DRAFT_READ = "read";
const GLOBAL_UNREAD_OPERATIONS = new Set(["countVersions"]);

const asksForDraft = (args: unknown): boolean =>
  typeof args === "object" && args !== null && (args as { draft?: unknown }).draft === true;

export const isCollectionVersionRead = (operation: string): boolean =>
  COLLECTION_VERSION_READS.has(operation);

const isGlobalVersionRead = (read: GlobalRead): boolean =>
  Object.hasOwn(read, "query") || Object.hasOwn(read, "findMany");

const isUnderAdmin = (req: MarkedReadRequest, adminBasePath: string): boolean =>
  (req.pathname ?? "").startsWith(adminBasePath);

export const createMarkedReads = ({ adminBasePath, enrichment }: MarkedReadsOptions) => {
  const openReadsByRequest = new WeakMap<MarkedReadRequest, Map<string, OpenReads>>();

  const openReadsOf = (req: MarkedReadRequest, slug: string): OpenReads => {
    const bySlug = openReadsByRequest.get(req) ?? new Map<string, OpenReads>();
    openReadsByRequest.set(req, bySlug);
    const reads = bySlug.get(slug) ?? { draft: 0, other: 0 };
    bySlug.set(slug, reads);
    return reads;
  };

  const closeOpenRead = (req: MarkedReadRequest, slug: string): boolean => {
    const reads = openReadsOf(req, slug);
    const isOnlyDraftReadOpen = reads.other === 0 && reads.draft > 0;
    if (reads.draft > 0) reads.draft -= 1;
    else if (reads.other > 0) reads.other -= 1;
    return isOnlyDraftReadOpen;
  };

  const isMarked = (req: MarkedReadRequest, isDraftRead: boolean): boolean => {
    const override = req.context?.visualEditing;
    if (typeof override === "boolean") return override;
    if (enrichment === "explicit") return false;
    return isDraftRead && req.payloadAPI === "local" && !isUnderAdmin(req, adminBasePath);
  };

  return {
    isCollectionReadMarked: ({ args, operation, req }: Operation): boolean => {
      const isDocumentRead = COLLECTION_DRAFT_READS.has(operation);
      if (!isDocumentRead && !isCollectionVersionRead(operation)) return false;
      return isMarked(req, isDocumentRead && asksForDraft(args));
    },
    closeGlobalRead: (read: GlobalRead): boolean =>
      isMarked(read.req, !isGlobalVersionRead(read) && closeOpenRead(read.req, read.slug)),
    openGlobalRead: ({ args, operation, req, slug }: GlobalOperation): void => {
      if (GLOBAL_UNREAD_OPERATIONS.has(operation)) return;
      const reads = openReadsOf(req, slug);
      if (operation === GLOBAL_DRAFT_READ && asksForDraft(args)) reads.draft += 1;
      else reads.other += 1;
    },
  };
};
