import type { Access, PayloadRequest, Where } from "payload";

import { getInsightHref, getPersonHref } from "@/lib/dal/getListingRoutes";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import type { Page } from "@/payload-types";

import type { SeoOverviewCollection, SeoOverviewRow } from "./types";

type LoadedDocument = {
  id: number | string;
  _status?: "draft" | "published" | null;
  breadcrumbs?: Page["breadcrumbs"];
  meta?: { title?: string | null; description?: string | null } | null;
  name?: string | null;
  slug?: string | null;
  title?: string | null;
};

const COLLECTIONS: SeoOverviewCollection[] = ["page", "insight", "person"];

const TYPE_NOUN: Record<SeoOverviewCollection, string> = {
  insight: "article",
  page: "page",
  person: "profile",
};

/**
 * Runs the collection's own update access for the signed-in user, so a market-scoped editor sees
 * exactly the rows the edit view would let them save. A query result (the market filter) is
 * resolved against the database rather than guessed from the row.
 */
async function findEditableIds({
  access,
  collection,
  ids,
  req,
}: {
  access: Access | undefined;
  collection: SeoOverviewCollection;
  ids: (number | string)[];
  req: PayloadRequest;
}): Promise<{ editableIds: Set<number | string>; roleCanEdit: boolean }> {
  const result = access ? await access({ req }) : false;
  if (result === true) return { editableIds: new Set(ids), roleCanEdit: true };
  if (!result || ids.length === 0) return { editableIds: new Set(), roleCanEdit: Boolean(result) };
  const matching = await req.payload.find({
    collection,
    depth: 0,
    overrideAccess: true,
    pagination: false,
    req,
    select: {},
    where: { and: [result as Where, { id: { in: ids } }] },
  });
  return { editableIds: new Set(matching.docs.map((document) => document.id)), roleCanEdit: true };
}

async function publicPath(
  collection: SeoOverviewCollection,
  document: LoadedDocument,
  locale: string
): Promise<string | null> {
  if (collection === "page") {
    return (
      buildUrl({
        absolute: false,
        breadcrumbs: document.breadcrumbs,
        collection: "page",
        locale,
        slug: document.slug,
      }) || "/"
    );
  }
  if (collection === "insight") {
    return document.slug ? getInsightHref({ slug: document.slug }, locale) : null;
  }
  return document.name ? getPersonHref({ name: document.name }, locale) : null;
}

function typeLabel(collection: SeoOverviewCollection, path: string | null, locale: string) {
  if (collection === "insight") return "Insight";
  if (collection === "person") return "Person";
  const withoutLocale = path && locale !== "en" ? path.replace(`/${locale}`, "") : path;
  return withoutLocale?.startsWith("/services/") ? "Service" : "Page";
}

export async function loadSeoOverviewRows({
  locale,
  req,
}: {
  locale: string;
  req: PayloadRequest;
}): Promise<SeoOverviewRow[]> {
  const { payload, user } = req;
  const rows: SeoOverviewRow[] = [];

  for (const collection of COLLECTIONS) {
    const collectionConfig = payload.collections[collection]?.config;
    if (!collectionConfig) continue;
    const hasDrafts = Boolean(collectionConfig.versions?.drafts);

    const found = await payload.find({
      collection,
      depth: 0,
      // Shows what the edit view shows: the latest draft when there is one.
      draft: hasDrafts,
      fallbackLocale: false,
      locale: locale as "en",
      overrideAccess: false,
      pagination: false,
      req,
      select:
        collection === "person"
          ? { meta: true, name: true }
          : collection === "insight"
            ? { meta: true, slug: true, title: true }
            : { _status: true, breadcrumbs: true, meta: true, slug: true, title: true },
      sort: collection === "person" ? "name" : "title",
      user,
    });
    const documents = found.docs as LoadedDocument[];

    const { editableIds, roleCanEdit } = await findEditableIds({
      access: collectionConfig.access?.update,
      collection,
      ids: documents.map((document) => document.id),
      req,
    });

    for (const document of documents) {
      const path = await publicPath(collection, document, locale);
      const noun = TYPE_NOUN[collection];
      rows.push({
        collection,
        editBlockedReason: editableIds.has(document.id)
          ? null
          : roleCanEdit
            ? `This ${noun} is filed under a market you do not look after, so you can read it but not change it.`
            : `Your role can read this ${noun} but not change it.`,
        latestIsDraft: hasDrafts && document._status === "draft",
        hasDrafts,
        id: document.id,
        path,
        seoDescription: document.meta?.description ?? null,
        seoTitle: document.meta?.title ?? null,
        title: document.title ?? document.name ?? "(untitled)",
        type: typeLabel(collection, path, locale),
      });
    }
  }

  return rows;
}
