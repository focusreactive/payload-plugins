import type { PayloadRequest } from "payload";
import type { UsageDoc } from "../keyphrases/usage";
import type { FoundDoc } from "./findDocsByIds";
import type { DocTarget } from "../keyphrases/docTarget";

export function groupByCollection(targets: DocTarget[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const { collection, docId } of targets) {
    groups.set(collection, [...(groups.get(collection) ?? []), docId]);
  }

  return groups;
}

export function titleFieldOf(req: PayloadRequest, collection: string): string {
  return req.payload.collections[collection]?.config.admin?.useAsTitle ?? "id";
}

export function toUsageDoc(collection: string, doc: FoundDoc, titleField: string): UsageDoc {
  const title = doc[titleField];

  return {
    collection,
    id: String(doc.id),
    title: typeof title === "string" && title.trim() ? title : String(doc.id),
  };
}
