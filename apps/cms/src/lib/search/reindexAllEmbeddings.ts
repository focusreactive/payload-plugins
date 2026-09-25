import type { Payload } from "payload";
import type { Pool } from "pg";

import { extractPageText } from "@/collections/Page/extractPageText";
import { isServicePage } from "@/collections/Page/isServicePage";
import { extractPostText } from "@/collections/Posts/extractPostText";
import { extractInsightText } from "@/collections/Insight/extractInsightText";
import { extractPersonText } from "@/collections/Person/extractPersonText";
import { upsertEmbedding } from "@/lib/search/dbOperations";
import { generateEmbedding } from "@/lib/search/generateEmbedding";

const SITE_LOCALES = ["en", "fr", "ja"] as const;

export interface ReindexSummary {
  page: number;
  post: number;
  insight: number;
  person: number;
}

/**
 * Runs the same extract-embed-upsert steps as each collection's own afterChange hook
 * (Page/hooks/indexEmbedding.ts, Posts/hooks/indexEmbedding.ts, Insight/hooks/indexEmbedding.ts,
 * Person/hooks/indexEmbedding.ts), but for every existing document at once instead of one save at
 * a time. The demo seed (api/demo-seed/route.ts) creates every page, post and insight with
 * `context: { skipEmbedding: true }` - twenty-plus OpenAI round trips inside one seed request
 * would make it slow and would burn API cost on every rehearsal reseed - so nothing is indexed
 * until this runs. There is no other reindex path in this codebase today (no CLI script, no
 * scheduled job): the demo-seed route calls this once at the end of every run, and it is also
 * safe to call on its own to recover a search index without touching any document.
 */
export async function reindexAllEmbeddings(payload: Payload): Promise<ReindexSummary> {
  const { pool } = payload.db as unknown as { pool: Pool };
  const summary: ReindexSummary = { insight: 0, page: 0, person: 0, post: 0 };

  for (const locale of SITE_LOCALES) {
    const pages = await payload.find({
      collection: "page",
      depth: 1,
      fallbackLocale: false,
      limit: 500,
      locale,
      overrideAccess: true,
    });

    for (const page of pages.docs) {
      if (page._status !== "published") {
        continue;
      }
      try {
        const embedding = await generateEmbedding(extractPageText(page));
        await upsertEmbedding({
          collection: isServicePage(page.breadcrumbs) ? "service" : "page",
          documentId: String(page.id),
          embedding,
          locale,
          pool,
        });
        summary.page += 1;
      } catch (error) {
        payload.logger.error(
          { error, locale, pageId: page.id },
          "Failed to reindex page embedding"
        );
      }
    }

    const posts = await payload.find({
      collection: "posts",
      depth: 1,
      fallbackLocale: false,
      limit: 500,
      locale,
      overrideAccess: true,
    });

    for (const post of posts.docs) {
      if (post._status !== "published") {
        continue;
      }
      try {
        const embedding = await generateEmbedding(extractPostText(post));
        await upsertEmbedding({
          collection: "post",
          documentId: String(post.id),
          embedding,
          locale,
          pool,
        });
        summary.post += 1;
      } catch (error) {
        payload.logger.error(
          { error, locale, postId: post.id },
          "Failed to reindex post embedding"
        );
      }
    }

    const insights = await payload.find({
      collection: "insight",
      depth: 0,
      fallbackLocale: false,
      limit: 500,
      locale,
      overrideAccess: true,
    });

    for (const insight of insights.docs) {
      // fallbackLocale: false leaves title empty when this insight has no content of its own in
      // this locale - the same signal getListingRoutes.ts uses (19 of the 21 seeded articles are
      // English-only by design). Indexing that gap would create a French/Japanese row that is
      // really just the English text under a locale tag.
      if (!insight.title) {
        continue;
      }
      try {
        const embedding = await generateEmbedding(extractInsightText(insight));
        await upsertEmbedding({
          collection: "insight",
          documentId: String(insight.id),
          embedding,
          locale,
          pool,
        });
        summary.insight += 1;
      } catch (error) {
        payload.logger.error(
          { error, insightId: insight.id, locale },
          "Failed to reindex insight embedding"
        );
      }
    }
  }

  const people = await payload.find({
    collection: "person",
    depth: 0,
    limit: 500,
    overrideAccess: true,
  });

  for (const person of people.docs) {
    try {
      const embedding = await generateEmbedding(extractPersonText(person));
      await Promise.all(
        SITE_LOCALES.map((locale) =>
          upsertEmbedding({
            collection: "person",
            documentId: String(person.id),
            embedding,
            locale,
            pool,
          })
        )
      );
      summary.person += 1;
    } catch (error) {
      payload.logger.error({ error, personId: person.id }, "Failed to reindex person embedding");
    }
  }

  return summary;
}
