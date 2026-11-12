import type { AuditAction } from "../types";
import type { OpFlags } from "./requestState";

type Doc = Record<string, unknown> | undefined;

export function classifyCollectionChange({
  operation,
  previousDoc,
  doc,
  flags,
}: {
  operation: "create" | "update";
  previousDoc?: Doc;
  doc: Doc;
  flags: OpFlags;
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

export function classifyGlobalChange(previousDoc: Doc, doc: Doc, flags: OpFlags = {}): AuditAction {
  const to = doc?._status;
  if (to === "published" && previousDoc?._status !== "published") return "global.publish";
  const wasPublished = previousDoc?._status === "published" || flags.wasPublished;
  if (wasPublished && to === "draft" && !flags.draft && !flags.restore) return "global.unpublish";
  return "global.update";
}
