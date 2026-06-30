import { image } from "@focus-reactive/payload-plugin-seo/content";
import type { ContentNode, DocQuery, DocStore } from "@focus-reactive/payload-plugin-seo/content";

import { collectLinkRefs, linkToContentNode } from "./links";
import type { LinkResolveCtx, LinkValue } from "./links";
import { collectRichTextRefs } from "./richTextRefs";
import type { ImageGroup, Upload, UploadField } from "./types";

export const MEDIA_COLLECTION = "media";

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asId(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function mediaDoc(value: UploadField, docs: DocStore): Upload | null {
  if (value && typeof value === "object") return value;

  const id = asId(value);
  if (id == null) return null;

  return (docs.get(MEDIA_COLLECTION, id) as Upload | undefined) ?? null;
}

export function relationId(v: unknown): string | number | null {
  if (typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "object" && v !== null) {
    const id = (v as { id?: unknown }).id;
    if (typeof id === "number" || typeof id === "string") return id;
  }

  return null;
}

export function collectRelationIds(value: unknown, key: string): (string | number)[] {
  const out = new Set<string | number>();

  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }

    if (typeof node !== "object" || node === null) return;

    const rec = node as Record<string, unknown>;
    const field = rec[key];
    const candidates = Array.isArray(field) ? field : [field];

    for (const c of candidates) {
      const id = relationId(c);
      if (id != null) out.add(id);
    }

    for (const child of Object.values(rec)) visit(child);
  };

  visit(value);

  return [...out];
}

export function collectMediaIds(value: unknown): number[] {
  const out = new Set<number>();

  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }

    if (typeof node !== "object" || node === null) return;

    const rec = node as Record<string, unknown>;

    const fromImage = asId((rec.image as { image?: unknown })?.image ?? rec.image);
    if (fromImage != null) out.add(fromImage);

    const hero = asId(rec.heroImage);
    if (hero != null) out.add(hero);

    for (const child of Object.values(rec)) visit(child);
  };

  visit(value);

  return [...out];
}

export function actionLinks(
  actions: LinkValue[] | null | undefined,
  ctx: LinkResolveCtx
): ContentNode[] {
  return asArray<LinkValue>(actions)
    .map((a) => linkToContentNode(a, ctx))
    .filter((n): n is ContentNode => n !== null);
}

export function groupImage(group: ImageGroup, docs: DocStore): ContentNode | null {
  const media = mediaDoc(group?.image, docs);
  return image(media?.url, media?.alt);
}

export function uploadImage(value: UploadField, docs: DocStore): ContentNode | null {
  const media = mediaDoc(value, docs);
  return image(media?.url, media?.alt);
}

export function buildRefQueries(values: unknown): DocQuery[] {
  const queries: DocQuery[] = [];
  const rt = collectRichTextRefs(values);

  const byCollection = new Map<string, Set<string | number>>();
  const addLink = (collection: string, id: string | number) => {
    const ids = byCollection.get(collection) ?? new Set<string | number>();
    ids.add(id);
    byCollection.set(collection, ids);
  };

  for (const ref of collectLinkRefs(values)) addLink(ref.collection, ref.id);
  for (const ref of rt.links) addLink(ref.collection, ref.id);
  for (const [collection, ids] of byCollection) {
    queries.push({ collection, ids: [...ids], select: ["slug", "breadcrumbs"], depth: 1 });
  }

  const media = [...new Set<string | number>([...collectMediaIds(values), ...rt.media])];
  if (media.length > 0) {
    queries.push({
      collection: MEDIA_COLLECTION,
      ids: media,
      select: ["url", "filename", "mimeType", "alt"],
    });
  }

  const testimonials = collectRelationIds(values, "testimonial");
  if (testimonials.length > 0) {
    queries.push({
      collection: "testimonials",
      ids: testimonials,
      select: ["author", "company", "position", "content"],
    });
  }

  const authors = collectRelationIds(values, "authors");
  if (authors.length > 0) {
    queries.push({ collection: "authors", ids: authors, select: ["name"] });
  }

  const categories = collectRelationIds(values, "categories");
  if (categories.length > 0) {
    queries.push({ collection: "categories", ids: categories, select: ["title"] });
  }

  return queries;
}
