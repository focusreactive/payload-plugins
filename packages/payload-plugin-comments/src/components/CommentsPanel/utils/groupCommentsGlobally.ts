import type { Comment } from "../../../types";
import { sortGroupsByCreatedAt } from "./sortGroupsByCreatedAt";
import type { FieldPath } from "../types";

// Returns: Map<collectionSlug, Map<documentId, Map<fieldPath | null, Comment[]>>>
export function groupCommentsGlobally(comments: Comment[]): Map<string, Map<string, Map<FieldPath, Comment[]>>> {
  const collections = new Map<string, Map<string, Map<FieldPath, Comment[]>>>();

  for (const comment of comments) {
    const slug = comment.collectionSlug;
    const docId = String(comment.documentId);
    const field = comment.fieldPath ?? null;

    if (!collections.has(slug)) collections.set(slug, new Map());
    const docs = collections.get(slug)!;

    if (!docs.has(docId)) docs.set(docId, new Map());
    const fields = docs.get(docId)!;

    if (!fields.has(field)) fields.set(field, []);
    fields.get(field)!.push(comment);
  }

  const toTime = (c: Comment) => new Date(c.createdAt).getTime();
  const oldestInFields = (fields: Map<FieldPath, Comment[]>) => Math.min(...[...fields.values()].flat().map(toTime));

  for (const [slug, docs] of collections.entries()) {
    for (const [docId, fields] of docs.entries()) {
      docs.set(docId, sortGroupsByCreatedAt(fields));
    }

    const sortedDocs = new Map([...docs.entries()].sort(([, a], [, b]) => oldestInFields(a) - oldestInFields(b)));
    collections.set(slug, sortedDocs);
  }

  const oldestInDocs = (docs: Map<string, Map<FieldPath, Comment[]>>) =>
    Math.min(...[...docs.values()].map(oldestInFields));

  return new Map([...collections.entries()].sort(([, a], [, b]) => oldestInDocs(a) - oldestInDocs(b)));
}
