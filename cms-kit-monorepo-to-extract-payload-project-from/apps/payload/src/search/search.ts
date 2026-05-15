"use server";

import configPromise from "@payload-config";
import { getPayload } from "payload";
import type { Pool } from "pg";

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

const VALID_LOCALES = new Set(["en", "es"]);

export async function search({ query, locale }: Params): Promise<Response> {
  if (!VALID_LOCALES.has(locale)) {
    return {
      data: [],
      success: true,
    };
  }

  try {
    const [embedding, payload] = await Promise.all([
      generateEmbedding(query),
      getPayload({ config: configPromise }),
    ]);

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

        if (!displayData) {return null;}

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
