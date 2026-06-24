import { heading, paragraph, richText } from "@focus-reactive/payload-plugin-seo/content";
import type { ContentNode, ExtractContext } from "@focus-reactive/payload-plugin-seo/content";

import { I18N_CONFIG } from "@/core/config/i18n";
import { collectLinkRefs, compact, fetchLinkDocs, linkToContentNode, uploadImage } from "@/core/lib/contentExtraction";
import type { LinkResolveCtx, LinkValue, Upload } from "@/core/lib/contentExtraction";
import type { Post } from "@/payload-types";

export default async function extractPostContent(values: Record<string, unknown>, ctx?: ExtractContext): Promise<ContentNode[]> {
  const post = values as Partial<Post>;
  const locale = ctx?.locale ?? I18N_CONFIG.defaultLocale;
  const docsById = await fetchLinkDocs(collectLinkRefs(post), { apiRoute: ctx?.apiRoute, locale });
  const linkCtx: LinkResolveCtx = { docsById, locale };

  const faq = post.faq ?? undefined;
  const cta = post.cta ?? undefined;

  return compact([
    heading(1, post.title),
    paragraph(post.excerpt),
    uploadImage(post.heroImage as Upload),
    richText(post.content),
    heading(2, faq?.heading),
    ...((faq?.items ?? []) as { question?: string | null; answer?: unknown }[]).flatMap((i) => [heading(3, i.question), richText(i.answer)]),
    paragraph(cta?.eyebrow),
    heading(2, cta?.heading),
    paragraph(cta?.description),
    ...((cta?.actions ?? []) as LinkValue[]).map((a) => linkToContentNode(a, linkCtx)),
  ]);
}
