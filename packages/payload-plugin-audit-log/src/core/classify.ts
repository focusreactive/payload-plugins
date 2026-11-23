import type { AuditAction } from "../types";
import type { OpFlags } from "./saveFlags";

type Doc = Record<string, unknown> | undefined;
type SaveFlags = Pick<OpFlags, "draft" | "restore"> & { wasPublished?: boolean };

export function classifyCollectionChange({
  operation,
  previousDoc,
  doc,
  flags,
}: {
  operation: "create" | "update";
  previousDoc?: Doc;
  doc: Doc;
  flags: SaveFlags;
}): AuditAction {
  if (operation === "create") return "doc.create";
  if (flags.restore) return "doc.restore";
  const from = previousDoc?._status;
  const to = doc?._status;
  if (to === "published" && from !== "published") return "doc.publish";
  const wasPublished = from === "published" || flags.wasPublished;
  if (wasPublished && to === "draft" && !flags.draft) return "doc.unpublish";
  return "doc.update";
}

export function classifyGlobalChange(
  previousDoc: Doc,
  doc: Doc,
  flags: SaveFlags = {}
): AuditAction {
  const to = doc?._status;
  if (to === "published" && previousDoc?._status !== "published") return "global.publish";
  const wasPublished = previousDoc?._status === "published" || flags.wasPublished;
  if (wasPublished && to === "draft" && !flags.draft && !flags.restore) return "global.unpublish";
  return "global.update";
}
