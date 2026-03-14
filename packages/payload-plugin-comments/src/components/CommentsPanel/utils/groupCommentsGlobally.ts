import type { Comment } from "../../../types";
import { sortGroupsByCreatedAt } from "./sortGroupsByCreatedAt";
import type { FieldPath } from "../types";

export interface GroupedComments {
  collections: Map<string, Map<string, Map<FieldPath, Comment[]>>>;
  globals: Map<string, Map<FieldPath, Comment[]>>;
}

export function groupCommentsGlobally(comments: Comment[]): GroupedComments {
  const collections = new Map<string, Map<string, Map<FieldPath, Comment[]>>>();
  const globals = new Map<string, Map<FieldPath, Comment[]>>();

  for (const comment of comments) {
    // Global comment
    if (comment.globalSlug) {
      const slug = comment.globalSlug;
      const field = comment.fieldPath ?? null;

      if (!globals.has(slug)) globals.set(slug, new Map());
      const fields = globals.get(slug)!;

      if (!fields.has(field)) fields.set(field, []);
      fields.get(field)!.push(comment);
      continue;
    }

    // Collection comment
    const slug = comment.collectionSlug;
    const docId = String(comment.documentId);
    const field = comment.fieldPath ?? null;

    if (!slug || !comment.documentId) continue;

    if (!collections.has(slug)) collections.set(slug, new Map());
    const docs = collections.get(slug)!;

    if (!docs.has(docId)) docs.set(docId, new Map());
    const fields = docs.get(docId)!;

    if (!fields.has(field)) fields.set(field, []);
    fields.get(field)!.push(comment);
  }

  // Sort collection groups
  const toTime = (c: Comment) => new Date(c.createdAt).getTime();
  const oldestInFields = (fields: Map<FieldPath, Comment[]>) =>
    Math.min(...[...fields.values()].flat().map(toTime));

  for (const [slug, docs] of collections.entries()) {
    for (const [docId, fields] of docs.entries()) {
      docs.set(docId, sortGroupsByCreatedAt(fields));
    }
    const sortedDocs = new Map(
      [...docs.entries()].sort(([, a], [, b]) => oldestInFields(a) - oldestInFields(b)),
    );
    collections.set(slug, sortedDocs);
  }

  // Sort globals
  for (const [slug, fields] of globals.entries()) {
    globals.set(slug, sortGroupsByCreatedAt(fields));
  }

  return { collections, globals };
}
