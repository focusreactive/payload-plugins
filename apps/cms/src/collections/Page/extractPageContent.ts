import { heading, html, link, paragraph, richText } from "@focus-reactive/payload-plugin-seo/content";
import type { ContentNode } from "@focus-reactive/payload-plugin-seo/content";
import { actionLinks, compact, groupImage, uploadImage } from "@/core/lib/contentExtraction";
import type { Action, ImageGroup, Upload } from "@/core/lib/contentExtraction";
import type { Page } from "@/payload-types";

type Block = Page["blocks"][number];

export function extractPageBlockContent(block: Block): ContentNode[] {
  const b = block as Record<string, unknown> & Block;
  switch (block.blockType) {
    case "hero":
      return [...compact([paragraph(b.eyebrow as string), heading(2, b.title as string), richText(b.richText), groupImage(b.image as ImageGroup)]), ...actionLinks(b.actions as Action[])];
    case "content":
      return [
        ...compact([paragraph(b.eyebrow as string), heading(2, b.heading as string), paragraph(b.description as string), uploadImage(b.image as Upload), richText(b.content)]),
        ...actionLinks(b.actions as Action[]),
      ];
    case "faq":
      return compact([
        paragraph(b.eyebrow as string),
        heading(2, b.heading as string),
        paragraph(b.description as string),
        ...((b.items as { question?: string; answer?: unknown }[] | undefined) ?? []).flatMap((i) => [heading(3, i.question), richText(i.answer)]),
      ]);
    case "ctaBand":
      return [...compact([paragraph(b.eyebrow as string), heading(2, b.heading as string), paragraph(b.description as string)]), ...actionLinks(b.actions as Action[])];
    case "carousel":
      return compact([
        paragraph(b.eyebrow as string),
        heading(2, b.heading as string),
        paragraph(b.description as string),
        ...((b.slides as { image?: ImageGroup; text?: unknown }[] | undefined) ?? []).flatMap((s) => [groupImage(s.image), richText(s.text)]),
      ]);
    case "cardsGrid":
      return compact([
        paragraph(b.eyebrow as string),
        heading(2, b.heading as string),
        paragraph(b.description as string),
        ...((b.items as { title?: string; description?: string; image?: ImageGroup; link?: Action }[] | undefined) ?? []).flatMap((c) => [
          heading(3, c.title),
          paragraph(c.description),
          groupImage(c.image),
          link(c.link?.url, c.link?.label),
        ]),
      ]);
    case "testimonialsList":
      return compact([
        paragraph(b.eyebrow as string),
        heading(2, b.heading as string),
        paragraph(b.description as string),
        ...(
          (b.testimonialItems as
            | {
                testimonial?: { author?: string; company?: string; position?: string; content?: string } | number;
              }[]
            | undefined) ?? []
        ).flatMap((t) => {
          const ref = typeof t.testimonial === "object" ? t.testimonial : undefined;
          const role = [ref?.position, ref?.company].filter(Boolean).join(", ");

          return [paragraph(ref?.content), paragraph(ref?.author), paragraph(role)];
        }),
      ]);
    case "chart":
      return compact([paragraph(b.eyebrow as string), heading(2, b.heading as string), paragraph(b.description as string), heading(3, b.title as string), paragraph(b.subtitle as string)]);
    case "logos":
      return [...compact([paragraph(b.label as string)]), ...((b.items as { image?: ImageGroup }[] | undefined) ?? []).map((i) => groupImage(i.image)).filter((n): n is ContentNode => n !== null)];
    case "newsletter":
      return compact([paragraph(b.eyebrow as string), heading(2, b.heading as string), paragraph(b.buttonLabel as string), paragraph(b.disclaimer as string)]);
    case "stats":
      return ((b.items as { value?: string; label?: string }[] | undefined) ?? []).flatMap((s) => compact([paragraph(s.value), paragraph(s.label)]));
    case "rawHtml":
      return compact([html(b.html as string)]);
    default:
      return [];
  }
}

export default function extractPageContent(values: Record<string, unknown>): ContentNode[] {
  const blocks = (values as { blocks?: Block[] }).blocks ?? [];

  return blocks.flatMap(extractPageBlockContent);
}
