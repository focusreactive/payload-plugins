import type { PayloadRequest, Where } from "payload";
import type { UsageDoc } from "../keyphrases/usage";
import type { DocTarget } from "../keyphrases/docTarget";
import type { FoundDoc } from "./findDocsByIds";
import { findDocsByIds } from "./findDocsByIds";

export interface ReadableDoc {
  summary: UsageDoc;
  doc: FoundDoc;
}

interface FindReadableDocsOptions {
  locale: string;
  titleOnly?: boolean;
  publishedOnly?: boolean;
}

const PUBLISHED_ONLY: Where = { _status: { equals: "published" } };

function groupByCollection(targets: DocTarget[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const { collection, docId } of targets) {
    groups.set(collection, [...(groups.get(collection) ?? []), docId]);
  }

  return groups;
}

function toSummary(collection: string, doc: FoundDoc, titleField: string): UsageDoc {
  const title = doc[titleField];

  return {
    collection,
    id: String(doc.id),
    title: typeof title === "string" && title.trim() ? title : String(doc.id),
  };
}

async function findInCollection(
  req: PayloadRequest,
  collection: string,
  ids: string[],
  { locale, titleOnly = false, publishedOnly = false }: FindReadableDocsOptions
): Promise<ReadableDoc[]> {
  const config = req.payload.collections[collection]?.config;
  const titleField = config?.admin?.useAsTitle ?? "id";

  const docs = await findDocsByIds(req.payload, {
    collection,
    ids,
    overrideAccess: false,
    locale,
    req,
    select: titleOnly ? { [titleField]: true } : undefined,
    where: publishedOnly && config?.versions?.drafts ? PUBLISHED_ONLY : undefined,
  });

  return docs.map((doc) => ({ summary: toSummary(collection, doc, titleField), doc }));
}

export async function findReadableDocs(
  req: PayloadRequest,
  targets: DocTarget[],
  options: FindReadableDocsOptions
): Promise<ReadableDoc[]> {
  const groups = [...groupByCollection(targets)];
  const found = await Promise.all(
    groups.map(([collection, ids]) => findInCollection(req, collection, ids, options))
  );

  return found.flat();
}
