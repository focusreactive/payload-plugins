import { heading, paragraph } from "@focus-reactive/payload-plugin-seo/content";
import type { ContentExtractor, DocStore } from "@focus-reactive/payload-plugin-seo/content";

import { extractPageBlockContent } from "@/collections/Page/extractPageContent";
import { I18N_CONFIG } from "@/lib/config/i18n";
import { asArray, buildRefQueries, richTextToContent, uploadImage } from "@/lib/contentExtraction";
import type { LinkResolveCtx, Upload } from "@/lib/contentExtraction";
import type { Page, Post } from "@/payload-types";

type PageBlock = Page["blocks"][number];

const extractPostContent: ContentExtractor = async (values, ctx, { resolveDocs, helpers }) => {
  const post = values as Partial<Post>;
  const locale = ctx.locale ?? I18N_CONFIG.defaultLocale;
  const docs: DocStore = await resolveDocs(buildRefQueries(values));
  const linkCtx: LinkResolveCtx = { docs, locale };

  const named = (val: unknown, collection: string, field: string): string | undefined => {
    const doc =
      typeof val === "object" && val !== null
        ? (val as Record<string, unknown>)
        : typeof val === "number" || typeof val === "string"
          ? docs.get(collection, val)
          : undefined;

    const v = doc?.[field];

    return typeof v === "string" ? v : undefined;
  };

  const authorNodes = asArray<unknown>(post.authors).map((a) =>
    paragraph(named(a, "authors", "name"))
  );
  const categoryNodes = asArray<unknown>(post.categories).map((c) =>
    paragraph(named(c, "categories", "title"))
  );

  return [
    ...helpers.compact([
      heading(1, post.title),
      ...authorNodes,
      paragraph(post.excerpt),
      uploadImage(post.heroImage as Upload, docs),
      ...richTextToContent(post.content, linkCtx),
    ]),
    // Sections use the page block library, so they share its per-block extractor.
    ...asArray<PageBlock>(post.blocks).flatMap((block) =>
      extractPageBlockContent(block, linkCtx, docs, helpers)
    ),
    ...helpers.compact(categoryNodes),
  ];
};

export default extractPostContent;
