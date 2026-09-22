import { NextResponse } from "next/server";

import { getPayloadClient } from "@/dal/payload-client";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";
import { PLATFORM_DEFAULT_MEDIA_SLOT } from "@/lib/constants/mediaDefaults";
import type {
  CardsGridBlock,
  ContentBlock,
  CtaBandBlock,
  HeroBlock,
  StatsBlock,
} from "@/payload-types";

/**
 * POST /api/demo-seed
 *
 * The preview database was branched from the main database, so `page` and
 * `posts` carry unrelated content, and every one of those documents has a
 * NULL slug because a migration localised the slug column without copying
 * the old values into it. Nobody can reach this database directly from here
 * and its connection string must never enter a transcript, so this runs as
 * an HTTP endpoint on the deployed preview instead of a local script.
 *
 * Deletes every `page` and `posts` document, then rebuilds the demo tree
 * from fixed, deterministic content, so a second run in a row leaves the
 * same state - the rehearsal needs to be able to reset with one call.
 *
 * This route lives directly under /api, as a sibling of Payload's own
 * catch-all, rather than under a locale-prefixed path, because the i18n
 * proxy's matcher only reaches routes Payload itself generates and drops a
 * custom route placed anywhere else.
 */

type LocaleCode = "en" | "fr" | "ja";

interface LocalizedPageText {
  title: string;
  slug: string;
}

interface PageSpec {
  key: string;
  parentKey: string | null;
  en: LocalizedPageText;
  fr: LocalizedPageText;
  ja: LocalizedPageText;
}

// Parents are listed before their children - the create loop below relies on
// that order to resolve each page's parent id before it is needed.
const PAGE_TREE: PageSpec[] = [
  {
    key: "home",
    parentKey: null,
    en: { title: "Home", slug: "home" },
    fr: { title: "Accueil", slug: "accueil" },
    ja: { title: "ホーム", slug: "home" },
  },
  {
    key: "insights",
    parentKey: null,
    en: { title: "Insights", slug: "insights" },
    fr: { title: "Actualités", slug: "actualites" },
    ja: { title: "インサイト", slug: "インサイト" },
  },
  {
    key: "our-people",
    parentKey: null,
    en: { title: "Our people", slug: "our-people" },
    fr: { title: "Notre équipe", slug: "notre-equipe" },
    ja: { title: "専門家", slug: "専門家" },
  },
  {
    key: "services",
    parentKey: null,
    en: { title: "Services", slug: "services" },
    fr: { title: "Services", slug: "services" },
    ja: { title: "サービス", slug: "サービス" },
  },
  {
    key: "patents",
    parentKey: "services",
    en: { title: "Patents", slug: "patents" },
    fr: { title: "Brevets", slug: "brevets" },
    ja: { title: "特許", slug: "特許" },
  },
  {
    key: "trade-marks",
    parentKey: "services",
    en: { title: "Trade marks", slug: "trade-marks" },
    fr: { title: "Marques", slug: "marques" },
    ja: { title: "商標", slug: "商標" },
  },
  {
    key: "global-presence",
    parentKey: null,
    en: { title: "Global presence", slug: "global-presence" },
    fr: { title: "Présence mondiale", slug: "presence-mondiale" },
    ja: { title: "世界展開", slug: "世界展開" },
  },
  {
    key: "asia",
    parentKey: "global-presence",
    en: { title: "Asia", slug: "asia" },
    fr: { title: "Asie", slug: "asie" },
    ja: { title: "アジア", slug: "アジア" },
  },
  {
    key: "japan",
    parentKey: "asia",
    en: { title: "Japan", slug: "japan" },
    fr: { title: "Japon", slug: "japon" },
    ja: { title: "日本", slug: "日本" },
  },
  {
    key: "tokyo-office",
    parentKey: "japan",
    en: { title: "Tokyo office", slug: "tokyo-office" },
    fr: { title: "Bureau de Tokyo", slug: "bureau-de-tokyo" },
    ja: { title: "東京オフィス", slug: "東京オフィス" },
  },
];

type LexicalRichTextState = ContentBlock["content"];

function buildParagraphRichText(paragraph: string): LexicalRichTextState {
  return {
    root: {
      type: "root",
      direction: "ltr",
      format: "",
      indent: 0,
      version: 1,
      children: [
        {
          type: "paragraph",
          direction: "ltr",
          format: "",
          indent: 0,
          textFormat: 0,
          version: 1,
          children: [
            {
              type: "text",
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
              text: paragraph,
              version: 1,
            },
          ],
        },
      ],
    },
  };
}

interface SeedActionLink {
  type: "custom";
  label: string;
  url: string;
  newTab: boolean;
  appearance: "default" | "outline" | "accent" | "ghost" | "link";
}

function buildAction(
  label: string,
  url: string,
  appearance: SeedActionLink["appearance"] = "default"
): SeedActionLink {
  return { type: "custom", label, url, newTab: false, appearance };
}

/**
 * Builds the homepage's `blocks` array. Copy is verbatim from the deal's
 * homepage-copy brief (outside this repository, which is public) - every
 * "open it" action points into the CMS admin because those links need an
 * account and the credentials go out after the call.
 */
function buildHomepageBlocks(defaultMediaId: number) {
  const hero: HeroBlock = {
    blockType: "hero",
    variant: "centered",
    eyebrow: "Content platform demo",
    title: "Fifteen offices, six languages, nine markets, one content model",
    richText: buildParagraphRichText(
      "This is a working content platform built on your own published material. Everything below is live in the CMS behind it, not a mockup."
    ),
    actions: [
      buildAction("Open the CMS", "/admin", "accent"),
      buildAction("See an article that arrived from Passle", "/admin", "outline"),
    ],
    section: { theme: "light" },
  };

  const stats: StatsBlock = {
    blockType: "stats",
    items: [
      { value: "3,115", label: "Passle items synced (of about 3,800)" },
      { value: "265", label: "Fee-earner profiles" },
      { value: "17", label: "English services" },
      { value: "8", label: "French services" },
      { value: "5", label: "Japanese services" },
    ],
    section: { theme: "light" },
  };

  const passleSync: ContentBlock = {
    blockType: "content",
    eyebrow: "3,115 of roughly 3,800 items",
    heading: "Your attorneys keep writing in Passle. The article arrives here enriched.",
    layout: "image-text",
    image: defaultMediaId,
    content: buildParagraphRichText(
      "A post published in Passle sends its shortcode, and the platform pulls the article, matches the author to their profile by email address, and files it under the practice areas it belongs to. Nobody copies text, and an editor who adds a summary or a related service keeps that work when the article syncs again."
    ),
    actions: [buildAction("Open the synced article in the CMS", "/admin")],
    section: { theme: "light" },
  };

  const localisedAddresses: ContentBlock = {
    blockType: "content",
    eyebrow: "Localised addresses",
    heading:
      "Your Japanese pages already use Japanese addresses. The platform treats that as normal.",
    layout: "text-image",
    image: defaultMediaId,
    content: buildParagraphRichText(
      "/global-presence/asia/japan/ and /ja/世界展開/アジア/日本/ are the same document with a different address in each language, assembled from the address of every parent above it. Rename a parent in one language and every page beneath it follows, in that language only."
    ),
    actions: [buildAction("Rename a parent and watch the cascade", "/admin/collections/page")],
    section: { theme: "light" },
  };

  const languageAndMarket: CtaBandBlock = {
    blockType: "ctaBand",
    eyebrow: "Six languages, nine markets",
    heading:
      "French carries eight services. English carries seventeen. That is a decision, not a gap.",
    description:
      "Which languages a page exists in, and which markets it appears in, are set separately. A reference from a page to a service that is not offered in that market fails before it can publish, so a market shell cannot quietly link to something you do not do there.",
    actions: [
      buildAction("Switch market and watch the service list change", "/admin/collections/page"),
    ],
    section: { theme: "light" },
  };

  const reviewQueue: ContentBlock = {
    blockType: "content",
    eyebrow: "Review before publication",
    heading: "A translation arrives as a draft, addressed to a human.",
    layout: "image-text",
    image: defaultMediaId,
    content: buildParagraphRichText(
      "Machine translation drafts the page and the review queue holds it until someone signs it off. For an IP practice that is the only acceptable order, and it is the same queue that holds a fee-earner's request to update their own biography."
    ),
    actions: [buildAction("Open the review queue", "/admin")],
    section: { theme: "light" },
  };

  const roles: CardsGridBlock = {
    blockType: "cardsGrid",
    eyebrow: "Roles",
    heading: "What someone sees is what their job needs, and nothing else.",
    description:
      "An administrator, an international digital and communications editor who publishes anywhere, a local marketing and communications editor limited to their own markets and content types, and a fee-earner whose only task here is submitting a change to their own profile.",
    items: [
      {
        title: "Administrator",
        link: { ...buildAction("Sign in as this role", "/admin"), label: "Sign in as this role" },
      },
      {
        title: "International digital and communications editor",
        link: { ...buildAction("Sign in as this role", "/admin"), label: "Sign in as this role" },
      },
      {
        title: "Local marketing and communications editor",
        link: { ...buildAction("Sign in as this role", "/admin"), label: "Sign in as this role" },
      },
      {
        title: "Fee-earner",
        link: { ...buildAction("Sign in as this role", "/admin"), label: "Sign in as this role" },
      },
    ],
    section: { theme: "light" },
  };

  const footnotes: ContentBlock = {
    blockType: "content",
    eyebrow: "Honest footnotes",
    heading: "Scope of this demo",
    layout: "text-image",
    image: defaultMediaId,
    content: buildParagraphRichText(
      "The visual design is a speculative direction, not a proposal for your brand, and your brand agency's work replaces it. Passle runs against fixtures of your own published articles rather than your live tenancy, because the Passle API is read-only and a demo tenancy would be empty. Content migration, search and the mobile layout are deliberately out of scope here and are priced in the estimate."
    ),
    section: { theme: "light" },
  };

  return [
    hero,
    stats,
    passleSync,
    localisedAddresses,
    languageAndMarket,
    reviewQueue,
    roles,
    footnotes,
  ];
}

/**
 * Every page outside the homepage exists to prove the address structure
 * (the localised slug tree), not to carry marketing copy of its own - the
 * homepage is where this demo's content lives.
 */
function buildStructuralBlocks(pageTitle: string, defaultMediaId: number) {
  const placeholder: ContentBlock = {
    blockType: "content",
    heading: pageTitle,
    layout: "image-text",
    image: defaultMediaId,
    content: buildParagraphRichText(
      "This page exists to demonstrate the localised address structure. The homepage carries the demo content."
    ),
    section: { theme: "light" },
  };
  return [placeholder];
}

export async function POST(request: Request) {
  const seedToken = request.headers.get("x-seed-token");
  const expectedToken = process.env.CRON_SECRET;

  // Fail closed: an unset CRON_SECRET must never make an unheadered request
  // pass by both sides comparing to undefined.
  if (!expectedToken || !seedToken || seedToken !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await getPayloadClient();

  try {
    let defaultMediaId = await getDefaultMediaId(PLATFORM_DEFAULT_MEDIA_SLOT);
    if (!defaultMediaId) {
      const fallbackMedia = await payload.find({
        collection: "media",
        limit: 1,
        overrideAccess: true,
      });
      defaultMediaId = fallbackMedia.docs[0]?.id ?? null;
    }
    if (!defaultMediaId) {
      return NextResponse.json(
        {
          error:
            "No media documents exist in this database, so the required image field on the Content blocks cannot be filled. Upload at least one media item, then re-run the seed.",
        },
        { status: 500 }
      );
    }
    // The Media relationship field type is `number | Media`; getDefaultMediaId
    // and payload.find() both return the raw id, which is numeric in this database.
    const defaultMediaNumericId = Number(defaultMediaId);

    const deletedPages = await payload.delete({
      collection: "page",
      where: { id: { not_equals: 0 } },
      overrideAccess: true,
      context: { skipEmbedding: true },
    });
    const deletedPosts = await payload.delete({
      collection: "posts",
      where: { id: { not_equals: 0 } },
      overrideAccess: true,
      context: { skipEmbedding: true },
    });

    const pageIdByKey: Record<string, number> = {};

    for (const spec of PAGE_TREE) {
      const parentId = spec.parentKey ? pageIdByKey[spec.parentKey] : undefined;
      const blocks =
        spec.key === "home"
          ? buildHomepageBlocks(defaultMediaNumericId)
          : buildStructuralBlocks(spec.en.title, defaultMediaNumericId);

      const created = await payload.create({
        collection: "page",
        locale: "en",
        draft: false,
        overrideAccess: true,
        context: { skipEmbedding: true },
        data: {
          title: spec.en.title,
          // The core slug field hook re-slugifies on every create regardless
          // of `generateSlug`, so the exact value set here is temporary and
          // gets locked in per locale by the updates below.
          slug: spec.en.slug,
          ...(parentId ? { parent: parentId } : {}),
          blocks,
        },
      });

      pageIdByKey[spec.key] = created.id;

      // On update (unlike create), the slug hook only re-slugifies when
      // `generateSlug` is true - passing it as false here is what lets a
      // non-ASCII slug (Japanese, or accented French) survive intact,
      // because slugify() is ASCII-only and would otherwise strip it to "".
      for (const locale of ["en", "fr", "ja"] as LocaleCode[]) {
        const text = spec[locale];
        await payload.update({
          collection: "page",
          id: created.id,
          locale,
          draft: false,
          overrideAccess: true,
          context: { skipEmbedding: true },
          data: {
            title: text.title,
            slug: text.slug,
            generateSlug: false,
          },
        });
      }
    }

    const siteSettingsTextByLocale: Record<LocaleCode, string> = {
      en: "Content Platform Demo",
      fr: "Démo de plateforme de contenu",
      ja: "コンテンツプラットフォームデモ",
    };

    for (const locale of ["en", "fr", "ja"] as LocaleCode[]) {
      await payload.updateGlobal({
        slug: "site-settings",
        locale,
        draft: false,
        overrideAccess: true,
        data: {
          general: { siteName: siteSettingsTextByLocale[locale] },
          ...(locale === "en"
            ? {
                seo: {
                  defaultDescription:
                    "A working content platform demo built on your own published material.",
                  og: {
                    title: "Content Platform Demo",
                    siteName: "Content Platform Demo",
                    description: "Fifteen offices, six languages, nine markets, one content model.",
                  },
                },
                blog: {
                  title: "Insights",
                  description: "Latest articles and updates.",
                },
              }
            : {}),
        },
      });
    }

    return NextResponse.json({
      deleted: {
        page: deletedPages.docs.length,
        posts: deletedPosts.docs.length,
      },
      created: {
        page: PAGE_TREE.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Demo seed failed.";
    payload.logger.error(error, "Demo seed failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
