import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, TypeWithID } from "payload";

import { revalidateScopedTag } from "@/lib/utils/scopedCache";

interface ArchiveDocument extends TypeWithID {
  _status?: "draft" | "published" | null;
}

interface RevalidateHooks<T extends ArchiveDocument> {
  afterChange: CollectionAfterChangeHook<T>[];
  afterDelete: CollectionAfterDeleteHook<T>[];
}

/**
 * getTalks caches every talk listing under "talks" and getTopicBySlug every topic under "topics",
 * with no revalidate time, so until these hooks existed a saved talk or topic stayed stale on the
 * site until someone invalidated the tag by hand (measured on a topic's SEO copy, 2026-09-23).
 * A talk card also carries its topics' titles, which is why Topic passes both tags.
 */
export function buildRevalidateHooks<T extends ArchiveDocument>(
  tags: string[]
): RevalidateHooks<T> {
  const revalidateAll = () => {
    for (const tag of tags) revalidateScopedTag(tag, "max");
  };

  const afterChange: CollectionAfterChangeHook<T> = async ({ doc, previousDoc, req }) => {
    if (req.context.disableRevalidate) return doc;

    // A draft of something never published is not on the site yet. Topic has no `_status`
    // at all, so it always revalidates.
    const neverPublished = doc._status === "draft" && previousDoc?._status !== "published";
    if (!neverPublished) revalidateAll();

    return doc;
  };

  const afterDelete: CollectionAfterDeleteHook<T> = async ({ doc, req }) => {
    if (!req.context.disableRevalidate) revalidateAll();

    return doc;
  };

  return { afterChange: [afterChange], afterDelete: [afterDelete] };
}
