import { heading, link, paragraph, richText } from "@focus-reactive/payload-plugin-seo/content";
import type { ContentNode } from "@focus-reactive/payload-plugin-seo/content";
import { compact, uploadImage } from "@/core/lib/contentExtraction";
import type { Action, Upload } from "@/core/lib/contentExtraction";
import type { Post } from "@/payload-types";

export default function extractPostContent(values: Record<string, unknown>): ContentNode[] {
  const post = values as Partial<Post>;
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
    ...((cta?.actions ?? []) as Action[]).map((a) => link(a.url, a.label)),
  ]);
}
