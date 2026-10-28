import { heading, paragraph } from "@focus-reactive/payload-plugin-seo/content";
import type { ContentExtractor, DocStore } from "@focus-reactive/payload-plugin-seo/content";

import { I18N_CONFIG } from "@/lib/config/i18n";
import {
  asArray,
  buildRefQueries,
  linkToContentNode,
  richTextToContent,
  sectionHeadingContent,
  uploadImage,
} from "@/lib/contentExtraction";
import type { LinkResolveCtx, LinkValue, Upload } from "@/lib/contentExtraction";
import type { Post } from "@/payload-types";

const extractPostContent: ContentExtractor = async (values, ctx, { resolveDocs, helpers }) => {
  const post = values as Partial<Post>;
  const locale = ctx.locale ?? I18N_CONFIG.defaultLocale;
  const docs: DocStore = await resolveDocs(buildRefQueries(values));
  const linkCtx: LinkResolveCtx = { docs, locale };

  const faq = post.faq ?? undefined;
  const cta = post.cta ?? undefined;

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

  return helpers.compact([
    heading(1, post.title),
    ...authorNodes,
    paragraph(post.excerpt),
    uploadImage(post.heroImage as Upload, docs),
    ...richTextToContent(post.content, linkCtx),
    ...sectionHeadingContent(faq?.heading, 2),
    ...asArray<{ question?: string | null; answer?: unknown }>(faq?.items).flatMap((i) => [
      heading(3, i.question),
      ...richTextToContent(i.answer, linkCtx),
    ]),
    ...sectionHeadingContent(cta?.heading, 2),
    ...asArray<LinkValue>(cta?.actions).map((a) => linkToContentNode(a, linkCtx)),
    ...categoryNodes,
  ]);
};

export default extractPostContent;
