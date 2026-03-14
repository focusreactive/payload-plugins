import type { Comment } from "../../../types";
import { sortGroupsByCreatedAt } from "./sortGroupsByCreatedAt";
import type { FieldPath } from "../types";

type CommentsMap = Map<FieldPath, Comment[]>;

type CollectionCommentsMapByDoc = Map<number, CommentsMap>;

export type CollectionCommentsEntry = {
  type: "collection";
  slug: string;
  docs: CollectionCommentsMapByDoc;
};

export type GlobalCommentsEntry = {
  type: "global";
  slug: string;
  fields: CommentsMap;
};

export type EntityCommentsEntry = CollectionCommentsEntry | GlobalCommentsEntry;

const extractCommentCreatedAtTime = (c: Comment) => new Date(c.createdAt).getTime();

export function groupCommentsGlobally(comments: Comment[]): EntityCommentsEntry[] {
  const collections = new Map<string, CollectionCommentsMapByDoc>();
  const globals = new Map<string, CommentsMap>();

  for (const comment of comments) {
    if (comment.globalSlug) {
      const slug = comment.globalSlug;
      const field = comment.fieldPath ?? null;

      if (!globals.has(slug)) globals.set(slug, new Map());

      const fields = globals.get(slug)!;

      if (!fields.has(field)) fields.set(field, []);

      fields.get(field)!.push(comment);

      continue;
    }

    const slug = comment.collectionSlug;
    const docId = comment.documentId;
    const field = comment.fieldPath ?? null;
    if (!slug || !docId) continue;

    if (!collections.has(slug)) collections.set(slug, new Map());

    const docs = collections.get(slug)!;

    if (!docs.has(docId)) docs.set(docId, new Map());

    const fields = docs.get(docId)!;

    if (!fields.has(field)) fields.set(field, []);

    fields.get(field)!.push(comment);
  }

  // Sort collection inner maps
  for (const [slug, docs] of collections.entries()) {
    for (const [docId, fields] of docs.entries()) {
      docs.set(docId, sortGroupsByCreatedAt(fields));
    }

    const oldestInFields = (fields: Map<FieldPath, Comment[]>) =>
      Math.min(...[...fields.values()].flat().map(extractCommentCreatedAtTime));

    const sortedDocs = new Map([...docs.entries()].sort(([, a], [, b]) => oldestInFields(a) - oldestInFields(b)));

    collections.set(slug, sortedDocs);
  }

  // Sort globals inner maps
  for (const [slug, fields] of globals.entries()) {
    globals.set(slug, sortGroupsByCreatedAt(fields));
  }

  const oldestInCollectionDocs = (docs: CollectionCommentsMapByDoc) =>
    Math.min(...[...docs.values()].flatMap((fields) => [...fields.values()].flat()).map(extractCommentCreatedAtTime));

  const oldestInGlobalFields = (fields: Map<FieldPath, Comment[]>) =>
    Math.min(...[...fields.values()].flat().map(extractCommentCreatedAtTime));

  const entries: Array<{ entry: EntityCommentsEntry; time: number }> = [];

  for (const [slug, docs] of collections.entries()) {
    entries.push({
      entry: { type: "collection", slug, docs },
      time: oldestInCollectionDocs(docs),
    });
  }

  for (const [slug, fields] of globals.entries()) {
    entries.push({
      entry: { type: "global", slug, fields },
      time: oldestInGlobalFields(fields),
    });
  }

  return entries.sort((a, b) => a.time - b.time).map(({ entry }) => entry);
}
