import { link } from "@focus-reactive/payload-plugin-seo/content";
import type { ContentNode, DocStore } from "@focus-reactive/payload-plugin-seo/content";

import { buildUrl } from "@/lib/utils/path/buildUrl";
import type { Page } from "@/payload-types";

export type LinkRelation = "page" | "posts";

export interface ResolvedLinkDoc {
  id?: string | number;
  slug?: string | null;
  breadcrumbs?: Page["breadcrumbs"];
}

export interface LinkReference {
  relationTo: LinkRelation;
  value: number | string | ResolvedLinkDoc;
}

export interface LinkValue {
  type?: "reference" | "custom" | null;
  reference?: LinkReference | null;
  url?: string | null;
  label?: string | null;
}

export interface LinkRef {
  collection: LinkRelation;
  id: string | number;
}

export interface LinkResolveCtx {
  docs: DocStore;
  locale: string;
}

const LINK_TYPES = new Set(["reference", "custom"]);

export function isLinkValue(value: unknown): value is LinkValue {
  if (typeof value !== "object" || value === null) return false;

  const type = (value as { type?: unknown }).type;

  return typeof type === "string" && LINK_TYPES.has(type);
}

export function linkRefKey({ collection, id }: LinkRef): string {
  return `${collection}:${id}`;
}

function referenceToFetch(value: LinkValue): LinkRef | null {
  if (value.type !== "reference" || !value.reference) return null;

  const { relationTo, value: refValue } = value.reference;

  if (relationTo !== "page" && relationTo !== "posts") return null;
  if (typeof refValue !== "number" && typeof refValue !== "string") return null;

  return {
    collection: relationTo,
    id: refValue,
  };
}

export function collectLinkRefs(value: unknown): LinkRef[] {
  const out: LinkRef[] = [];
  const seen = new Set<string>();

  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);

      return;
    }

    if (typeof node !== "object" || node === null) return;

    if (isLinkValue(node)) {
      const ref = referenceToFetch(node);

      if (ref) {
        const key = linkRefKey(ref);

        if (!seen.has(key)) {
          seen.add(key);
          out.push(ref);
        }
      }
    }

    for (const child of Object.values(node as Record<string, unknown>)) visit(child);
  };

  visit(value);

  return out;
}

function resolveReferenceHref(reference: LinkReference, ctx: LinkResolveCtx): string {
  const { relationTo, value } = reference;

  const doc: ResolvedLinkDoc | undefined =
    typeof value === "object" && value !== null
      ? value
      : (ctx.docs.get(relationTo, value) as ResolvedLinkDoc | undefined);

  if (!doc) return "";

  if (relationTo === "page") {
    return (
      buildUrl({
        collection: "page",
        breadcrumbs: doc.breadcrumbs,
        slug: doc.slug,
        locale: ctx.locale,
        absolute: false,
      }) || "/"
    );
  }

  return buildUrl({ collection: "posts", slug: doc.slug, locale: ctx.locale, absolute: false });
}

function resolveLinkHref(value: LinkValue, ctx: LinkResolveCtx): string {
  switch (value.type) {
    case "custom":
      return value.url ?? "";
    case "reference":
      return value.reference ? resolveReferenceHref(value.reference, ctx) : "";
    default:
      return "";
  }
}

export function linkToContentNode(value: unknown, ctx: LinkResolveCtx): ContentNode | null {
  if (!isLinkValue(value)) return null;

  const href = resolveLinkHref(value, ctx);
  const label = typeof value.label === "string" ? value.label : "";

  return link(href, label);
}
