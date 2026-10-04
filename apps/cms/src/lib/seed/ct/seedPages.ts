import { emptyResult } from "./context";
import type { SeedContext, SeedStep } from "./context";
import { brandTitle, IA } from "./data/ia";
import type { IaPage } from "./data/ia";
import { renderCover } from "./imagery";
import { forgetPage, pageIdByPath, urlLink } from "./links";
import { log } from "./log";
import { upsertMedia } from "./mediaStore";
import { RECIPES } from "./recipes";
import { firstSentence, paragraphs, splitSections } from "./sections";
import type { PageSections } from "./sections";
import { firstParagraph } from "./text";
import type { ParsedPage } from "./types";

export const CTA_TITLE = "Contact CTA";
export const HEADER_NAME = "CT header";
export const FOOTER_NAME = "CT footer";

/** The global CTA must exist before pages reference it; the chrome step refines its links. */
async function ensureCta(ctx: SeedContext): Promise<number> {
  const found = await ctx.payload.find({
    collection: "globalBlock",
    limit: 1,
    where: { title: { equals: CTA_TITLE } },
  });
  if (found.docs[0]) {
    return found.docs[0].id;
  }
  const email = ctx.site.chrome.emails[0] ?? "info@example.com";
  const doc = await ctx.payload.create({
    collection: "globalBlock",
    context: ctx.writeContext,
    data: {
      _status: "published",
      block: [
        {
          actions: [
            { ...urlLink("/contact", "Contact us"), appearance: "default" },
            { ...urlLink(`mailto:${email}`, "Email us"), appearance: "ghost" },
          ],
          blockType: "ctaBand",
          eyebrow: "Get in touch",
          heading: `Find out how ${ctx.site.companyName ?? "CT"} can help you`,
          section: { theme: "light-gray" },
        },
      ],
      title: CTA_TITLE,
    },
  });
  return doc.id;
}

async function idByName(
  ctx: SeedContext,
  collection: "header" | "footer",
  name: string
): Promise<number | null> {
  const found = await ctx.payload.find({ collection, limit: 1, where: { name: { equals: name } } });
  return found.docs[0]?.id ?? null;
}

function sourcesOf(ctx: SeedContext, page: IaPage): ParsedPage[] {
  return page.sources
    .map((number) => ctx.site.pages.find((entry) => entry.number === number))
    .filter((entry): entry is ParsedPage => entry !== undefined);
}

function sectionsOf(page: IaPage, sources: ParsedPage[]): PageSections {
  // Hubs built from several entries only borrow the first paragraph of each as their intro.
  if (sources.length > 1) {
    return {
      intro: sources
        .map((source) => paragraphs(source.markdown)[0] ?? "")
        .filter(Boolean)
        .slice(0, 1)
        .join("\n\n"),
      sections: [],
    };
  }
  return sources[0] ? splitSections(sources[0].markdown) : { intro: "", sections: [] };
}

async function cover(
  ctx: SeedContext,
  page: IaPage,
  title: string,
  eyebrow: string,
  sand = false
): Promise<number> {
  const { id } = await upsertMedia(ctx, {
    alt: title,
    data: await renderCover({
      eyebrow,
      slug: `page-${page.slug}`,
      title,
      variant: sand ? "sand" : "dark",
    }),
    filename: `cover-page-${page.slug}.jpg`,
    folder: "Covers",
  });
  return id;
}

export const seedPages: SeedStep = async (ctx) => {
  const result = emptyResult();
  const company = ctx.site.companyName;
  const ctaBlockId = await ensureCta(ctx);
  const header = await idByName(ctx, "header", HEADER_NAME);
  const footer = await idByName(ctx, "footer", FOOTER_NAME);

  // Card summaries for hubs and menus: first sentence of each page's source.
  for (const page of IA) {
    const source = sourcesOf(ctx, page)[0];
    page.summary ??= source
      ? firstSentence(firstParagraph(source.markdown, 400)) || undefined
      : undefined;
  }

  for (const page of IA) {
    const sources = sourcesOf(ctx, page);
    if (page.sources.length > 0 && sources.length === 0) {
      log.warn(`${page.path}: dump entries ${page.sources.join(", ")} not found — composed page`);
    }
    const title = brandTitle(page.title, company);
    const sections = sectionsOf(page, sources);
    const downloadForms =
      page.slug === "trustable-software-framework"
        ? 2
        : sources.some((source) => source.hasDownloadForm) || page.slug === "ctrl-os"
          ? 1
          : 0;
    const needsCover = ["HOME", "SERVICE", "REPORTS"].includes(page.recipe);
    const coverId = needsCover
      ? await cover(
          ctx,
          page,
          title,
          page.recipe === "REPORTS" ? "White paper" : "What we do",
          page.recipe === "REPORTS"
        )
      : null;

    const existingId = await pageIdByPath(ctx, page.path);
    if (existingId && !ctx.flags.rebuildPages) {
      ctx.ids.pages.set(page.path, existingId);
      result.skipped++;
      continue;
    }

    const blocks = await RECIPES[page.recipe]({
      coverId,
      ctaBlockId: page.recipe === "CONTACT" ? null : ctaBlockId,
      ctx,
      downloadForms,
      hasDownloadForm: downloadForms > 0,
      page,
      sections,
      title,
    });

    const source = sources[0];
    const description = source ? firstParagraph(source.markdown) : page.summary;
    const parentId = page.parent ? await pageIdByPath(ctx, page.parent) : null;
    const data = {
      _status: "published" as const,
      blocks,
      footer: footer ?? undefined,
      generateSlug: false,
      header: header ?? undefined,
      meta: {
        description: description || undefined,
        image: ctx.ids.media.get("og"),
        robots: "index" as const,
        title: source?.titleTag ? brandTitle(source.titleTag, company) : title,
      },
      parent: parentId ?? undefined,
      slug: page.slug,
      title,
    };

    if (existingId) {
      await ctx.payload.update({
        collection: "page",
        context: ctx.writeContext,
        data: data as never,
        id: existingId,
      });
      ctx.ids.pages.set(page.path, existingId);
      result.updated++;
    } else {
      const doc = await ctx.payload.create({
        collection: "page",
        context: ctx.writeContext,
        data: data as never,
      });
      forgetPage(page.path);
      ctx.ids.pages.set(page.path, doc.id);
      result.created++;
    }
  }

  return result;
};
