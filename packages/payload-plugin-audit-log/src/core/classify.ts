import type { AuditAction } from "../types";
import type { OpFlags } from "./requestState";

type Doc = Record<string, unknown> | undefined;

function apiKeyChangeOf(liveDoc: Doc, doc: Doc): AuditAction | undefined {
  if (liveDoc?.enableAPIKey === true && doc?.enableAPIKey === false) return "apikey.revoked";
  if (liveDoc && liveDoc.enableAPIKey !== true && doc?.enableAPIKey === true)
    return "apikey.created";
  return undefined;
}

export function classifyCollectionChange(args: {
  operation: "create" | "update";
  previousDoc?: Doc;
  liveDoc?: Doc;
  doc: Doc;
  flags: OpFlags;
  isApiKeyCollection?: boolean;
  usesApiKeys?: boolean;
  savesDraft?: boolean;
}): AuditAction {
  const { operation, previousDoc, doc, flags, isApiKeyCollection, usesApiKeys, savesDraft } = args;
  if (operation === "create") {
    if (isApiKeyCollection) return "apikey.created";
    return flags.duplicate ? "doc.duplicate" : "doc.create";
  }
  if (flags.restore) return "doc.restore";
  const apiKeyChange =
    usesApiKeys && !savesDraft ? apiKeyChangeOf(args.liveDoc ?? previousDoc, doc) : undefined;
  if (apiKeyChange) return apiKeyChange;
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
