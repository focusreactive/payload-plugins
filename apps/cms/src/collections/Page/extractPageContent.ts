import { heading, html, paragraph } from "@focus-reactive/payload-plugin-seo/content";
import type {
  ContentExtractor,
  ContentNode,
  DocQuery,
  DocStore,
} from "@focus-reactive/payload-plugin-seo/content";

import { collectGlobalBlockIds, isPublishedGlobalBlock } from "@/collections/GlobalBlock/slots";
import { I18N_CONFIG } from "@/lib/config/i18n";
import {
  actionLinks,
  asArray,
  buildRefQueries,
  groupImage,
  linkToContentNode,
  relationId,
  richTextToContent,
  sectionHeadingContent,
  uploadImage,
} from "@/lib/contentExtraction";
import type { ImageGroup, LinkResolveCtx, LinkValue, Upload } from "@/lib/contentExtraction";
import type { GlobalBlock, HeroBlock, Page, SectionHeadingFields } from "@/payload-types";

type Block = Page["blocks"][number];

function extractHeroContent(
  hero: HeroBlock,
  ctx: LinkResolveCtx,
  docs: DocStore,
  helpers: { compact: (n: (ContentNode | null | undefined)[]) => ContentNode[] }
): ContentNode[] {
  return [
    ...helpers.compact([
      ...sectionHeadingContent(hero.heading, 1),
      groupImage(hero.image as ImageGroup, docs),
    ]),
    ...actionLinks(hero.actions as LinkValue[], ctx),
  ];
}

export function extractPageBlockContent(
  block: Block,
  ctx: LinkResolveCtx,
  docs: DocStore,
  helpers: { compact: (n: (ContentNode | null | undefined)[]) => ContentNode[] }
): ContentNode[] {
  const b = block as Record<string, unknown> & Block;
  switch (block.blockType) {
    case "content":
      return [
        ...helpers.compact([
          ...sectionHeadingContent(b.heading as SectionHeadingFields, 2),
          uploadImage(b.image as Upload, docs),
          ...richTextToContent(b.content, ctx),
        ]),
        ...actionLinks(b.actions as LinkValue[], ctx),
      ];
    case "faq":
      return helpers.compact([
        ...sectionHeadingContent(b.heading as SectionHeadingFields, 2),
        ...asArray<{ question?: string; answer?: unknown }>(b.items).flatMap((i) => [
          heading(3, i.question),
          ...richTextToContent(i.answer, ctx),
        ]),
      ]);
    case "ctaBand":
      return [
        ...helpers.compact([...sectionHeadingContent(b.heading as SectionHeadingFields, 2)]),
        ...actionLinks(b.actions as LinkValue[], ctx),
      ];
    case "carousel":
      return helpers.compact([
        ...sectionHeadingContent(b.heading as SectionHeadingFields, 2),
        ...asArray<{ image?: ImageGroup; text?: unknown }>(b.slides).flatMap((s) => [
          groupImage(s.image, docs),
          ...richTextToContent(s.text, ctx),
        ]),
      ]);
    case "cardsGrid":
      return helpers.compact([
        ...sectionHeadingContent(b.heading as SectionHeadingFields, 2),
        ...asArray<{
          title?: string;
          description?: string;
          image?: ImageGroup;
          link?: LinkValue;
        }>(b.items).flatMap((c) => [
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
        ...sectionHeadingContent(b.heading as SectionHeadingFields, 2),
        ...asArray<{ testimonial?: Testimonial | number | string }>(b.testimonialItems).flatMap(
          (t) => {
            const ref = resolveTestimonial(t.testimonial);
            const role = [ref?.position, ref?.company].filter(Boolean).join(", ");
            return [paragraph(ref?.content), paragraph(ref?.author), paragraph(role)];
          }
        ),
      ]);
    }
    case "chart":
      return helpers.compact([
        ...sectionHeadingContent(b.heading as SectionHeadingFields, 2),
        heading(3, b.title as string),
        paragraph(b.subtitle as string),
      ]);
    case "logos":
      return helpers.compact([
        paragraph(b.label as string),
        ...asArray<{ image?: ImageGroup; link?: LinkValue }>(b.items).flatMap((i) => [
          groupImage(i.image, docs),
          linkToContentNode(i.link, ctx),
        ]),
      ]);
    case "newsletter":
      return helpers.compact([
        ...sectionHeadingContent(b.heading as SectionHeadingFields, 2),
        paragraph(b.buttonLabel as string),
        paragraph(b.disclaimer as string),
      ]);
    case "stats":
      return asArray<{ value?: string; label?: string }>(b.items).flatMap((s) =>
        helpers.compact([paragraph(s.value), paragraph(s.label)])
      );
    case "rawHtml":
      return helpers.compact([html(b.html as string)]);
    case "globalSectionSlot": {
      const gid = relationId(b.reference);
      const resolved =
        gid != null
          ? (docs.get("globalBlock", gid) as Pick<GlobalBlock, "_status" | "block"> | undefined)
          : undefined;
      const inner = isPublishedGlobalBlock(resolved) ? resolved?.block?.[0] : undefined;

      return inner ? extractPageBlockContent(inner as unknown as Block, ctx, docs, helpers) : [];
    }
    default:
      return [];
  }
}

function mergeStores(...stores: (DocStore | null)[]): DocStore {
  return {
    get: (collection, id) => {
      for (const store of stores) {
        const doc = store?.get(collection, id);
        if (doc) return doc;
      }
      return undefined;
    },
  };
}

const extractPageContent: ContentExtractor = async (values, ctx, { resolveDocs, helpers }) => {
  const hero = asArray<HeroBlock>((values as { hero?: unknown }).hero);
  const blocks = asArray<Block>((values as { blocks?: unknown }).blocks);
  const locale = ctx.locale ?? I18N_CONFIG.defaultLocale;

  const globalIds = collectGlobalBlockIds(blocks);
  const phase1Queries: DocQuery[] = [...buildRefQueries(values)];
  if (globalIds.length > 0) {
    phase1Queries.push({
      collection: "globalBlock",
      ids: globalIds,
      select: ["block", "_status"],
      depth: 0,
    });
  }
  const docs1: DocStore = await resolveDocs(phase1Queries);

  const globalDocs = globalIds
    .map((id) => docs1.get("globalBlock", id) as Pick<GlobalBlock, "_status"> | undefined)
    .filter(isPublishedGlobalBlock) as Record<string, unknown>[];
  const phase2Queries: DocQuery[] = globalDocs.flatMap((doc) => buildRefQueries(doc));
  const docs2: DocStore | null = phase2Queries.length > 0 ? await resolveDocs(phase2Queries) : null;

  const docs = mergeStores(docs1, docs2);
  const linkCtx: LinkResolveCtx = { docs, locale };

  return [
    ...hero.flatMap((heroBlock) => extractHeroContent(heroBlock, linkCtx, docs, helpers)),
    ...blocks.flatMap((block) => extractPageBlockContent(block, linkCtx, docs, helpers)),
  ];
};

export default extractPageContent;
