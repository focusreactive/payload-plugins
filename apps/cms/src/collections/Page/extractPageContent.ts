import { heading, html, paragraph, richText } from "@focus-reactive/payload-plugin-seo/content";
import type {
  ContentExtractor,
  ContentNode,
  DocStore,
} from "@focus-reactive/payload-plugin-seo/content";

import { I18N_CONFIG } from "@/lib/config/i18n";
import {
  actionLinks,
  buildRefQueries,
  groupImage,
  linkToContentNode,
  uploadImage,
} from "@/lib/contentExtraction";
import type { ImageGroup, LinkResolveCtx, LinkValue, Upload } from "@/lib/contentExtraction";
import type { Page } from "@/payload-types";

type Block = Page["blocks"][number];

export function extractPageBlockContent(
  block: Block,
  ctx: LinkResolveCtx,
  docs: DocStore,
  helpers: { compact: (n: (ContentNode | null | undefined)[]) => ContentNode[] }
): ContentNode[] {
  const b = block as Record<string, unknown> & Block;
  switch (block.blockType) {
    case "hero":
      return [
        ...helpers.compact([
          paragraph(b.eyebrow as string),
          heading(2, b.title as string),
          richText(b.richText),
          groupImage(b.image as ImageGroup, docs),
        ]),
        ...actionLinks(b.actions as LinkValue[], ctx),
      ];
    case "content":
      return [
        ...helpers.compact([
          paragraph(b.eyebrow as string),
          heading(2, b.heading as string),
          paragraph(b.description as string),
          uploadImage(b.image as Upload, docs),
          richText(b.content),
        ]),
        ...actionLinks(b.actions as LinkValue[], ctx),
      ];
    case "faq":
      return helpers.compact([
        paragraph(b.eyebrow as string),
        heading(2, b.heading as string),
        paragraph(b.description as string),
        ...((b.items as { question?: string; answer?: unknown }[] | undefined) ?? []).flatMap(
          (i) => [heading(3, i.question), richText(i.answer)]
        ),
      ]);
    case "ctaBand":
      return [
        ...helpers.compact([
          paragraph(b.eyebrow as string),
          heading(2, b.heading as string),
          paragraph(b.description as string),
        ]),
        ...actionLinks(b.actions as LinkValue[], ctx),
      ];
    case "carousel":
      return helpers.compact([
        paragraph(b.eyebrow as string),
        heading(2, b.heading as string),
        paragraph(b.description as string),
        ...((b.slides as { image?: ImageGroup; text?: unknown }[] | undefined) ?? []).flatMap(
          (s) => [groupImage(s.image, docs), richText(s.text)]
        ),
      ]);
    case "cardsGrid":
      return helpers.compact([
        paragraph(b.eyebrow as string),
        heading(2, b.heading as string),
        paragraph(b.description as string),
        ...(
          (b.items as
            | { title?: string; description?: string; image?: ImageGroup; link?: LinkValue }[]
            | undefined) ?? []
        ).flatMap((c) => [
          heading(3, c.title),
          paragraph(c.description),
          groupImage(c.image, docs),
          linkToContentNode(c.link, ctx),
        ]),
      ]);
    case "testimonialsList": {
      type Testimonial = { author?: string; company?: string; position?: string; content?: string };
      const resolveTestimonial = (val: unknown): Testimonial | undefined => {
        if (typeof val === "object" && val !== null) return val as Testimonial;
        if (typeof val === "number" || typeof val === "string") {
          return docs.get("testimonials", val) as Testimonial | undefined;
        }
        return undefined;
      };
      return helpers.compact([
        paragraph(b.eyebrow as string),
        heading(2, b.heading as string),
        paragraph(b.description as string),
        ...(
          (b.testimonialItems as { testimonial?: Testimonial | number | string }[] | undefined) ??
          []
        ).flatMap((t) => {
          const ref = resolveTestimonial(t.testimonial);
          const role = [ref?.position, ref?.company].filter(Boolean).join(", ");
          return [paragraph(ref?.content), paragraph(ref?.author), paragraph(role)];
        }),
      ]);
    }
    case "chart":
      return helpers.compact([
        paragraph(b.eyebrow as string),
        heading(2, b.heading as string),
        paragraph(b.description as string),
        heading(3, b.title as string),
        paragraph(b.subtitle as string),
      ]);
    case "logos":
      return helpers.compact([
        paragraph(b.label as string),
        ...((b.items as { image?: ImageGroup; link?: LinkValue }[] | undefined) ?? []).flatMap(
          (i) => [groupImage(i.image, docs), linkToContentNode(i.link, ctx)]
        ),
      ]);
    case "newsletter":
      return helpers.compact([
        paragraph(b.eyebrow as string),
        heading(2, b.heading as string),
        paragraph(b.buttonLabel as string),
        paragraph(b.disclaimer as string),
      ]);
    case "stats":
      return ((b.items as { value?: string; label?: string }[] | undefined) ?? []).flatMap((s) =>
        helpers.compact([paragraph(s.value), paragraph(s.label)])
      );
    case "rawHtml":
      return helpers.compact([html(b.html as string)]);
    default:
      return [];
  }
}

const extractPageContent: ContentExtractor = async (values, ctx, { resolveDocs, helpers }) => {
  const blocks = (values as { blocks?: Block[] }).blocks ?? [];
  const locale = ctx.locale ?? I18N_CONFIG.defaultLocale;
  const docs: DocStore = await resolveDocs(buildRefQueries(values));
  const linkCtx: LinkResolveCtx = { docs, locale };

  return blocks.flatMap((block) => extractPageBlockContent(block, linkCtx, docs, helpers));
};

export default extractPageContent;
