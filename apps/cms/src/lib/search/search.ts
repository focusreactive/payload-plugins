"use server";

import type { Pool } from "pg";

import { getPayloadClient } from "@/dal";

import { generateEmbedding } from "./generateEmbedding";
import { getDocumentSearchData } from "./getDocumentSearchData";
import { groupResultsByCollection } from "./groupResultsByCollection";
import { runSemanticSearch } from "./runSemanticSearch";
import type { SearchResultGroup } from "./types";

type Response =
  | {
      success: true;
      data: SearchResultGroup[];
    }
  | {
      success: false;
      error: string;
    };

interface Params {
  query: string;
  locale: string;
}

// The site only ever carries real content in these three locales (SITE_LOCALES in
// getListingRoutes.ts); ko/zh-hans/zh-hant are configured for routing but never seeded, so
// letting them through here would just run an embedding search against an empty locale.
const VALID_LOCALES = new Set(["en", "fr", "ja"]);

export async function search({ query, locale }: Params): Promise<Response> {
  if (!VALID_LOCALES.has(locale)) {
    return {
      data: [],
      success: true,
    };
  }

  try {
    const [embedding, payload] = await Promise.all([generateEmbedding(query), getPayloadClient()]);

    const pool = payload.db.pool as unknown as Pool;
    const rawItems = await runSemanticSearch({ embedding, locale, pool });

    const enrichedItems = await Promise.all(
      rawItems.map(async (item) => {
        const displayData = await getDocumentSearchData(
          payload,
          item.documentId,
          item.collection,
          item.locale
        );

        if (!displayData) {
          return null;
        }

        return { ...item, ...displayData };
      })
    );

    const items = enrichedItems.filter((item) => item !== null);
    const groups = groupResultsByCollection(items);

    return {
      data: groups,
      success: true,
    };
  } catch (error) {
    console.error("[search] error:", error);

    return {
      error: error as string,
      success: false,
    };
  }
}
