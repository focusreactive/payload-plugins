import { readFileSync } from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";

import { getPayloadClient } from "@/dal/payload-client";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";
import { PLATFORM_DEFAULT_MEDIA_SLOT } from "@/lib/constants/mediaDefaults";
import type {
  CardsGridBlock,
  CarouselBlock,
  ChartBlock,
  ContentBlock,
  CtaBandBlock,
  FaqBlock,
  HeroBlock,
  LogosBlock,
  NewsletterBlock,
  RawHtmlBlock,
  StatsBlock,
  TestimonialsListBlock,
  User,
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

interface DemoMediaSpec {
  filename: string;
  alt: string;
  mimetype: string;
  data: Buffer;
}

/**
 * Every entry reads its file with a literal, statically-analysable path (never a path built from
 * a loop variable) so Vercel's build-time file tracer can see and bundle each one - the same class
 * of bug d94dca92 fixed for the JSON fixtures, where a dynamic directory reference silently
 * dropped its contents from the deployed function.
 */
function buildDemoMedia(): DemoMediaSpec[] {
  return [
    {
      filename: "preview-hero.png",
      alt: "Hero block preview",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "block-preview-images", "preview-hero.png")
      ),
    },
    {
      filename: "preview-content.png",
      alt: "Content block preview",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "block-preview-images", "preview-content.png")
      ),
    },
    {
      filename: "preview-faq.png",
      alt: "FAQ block preview",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "block-preview-images", "preview-faq.png")
      ),
    },
    {
      filename: "preview-cards-grid.png",
      alt: "Cards grid block preview",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "block-preview-images", "preview-cards-grid.png")
      ),
    },
    {
      filename: "preview-carusel.png",
      alt: "Carousel block preview",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "block-preview-images", "preview-carusel.png")
      ),
    },
    {
      filename: "preview-logos.png",
      alt: "Logos block preview",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "block-preview-images", "preview-logos.png")
      ),
    },
    {
      filename: "preview-chart.png",
      alt: "Chart block preview",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "block-preview-images", "preview-chart.png")
      ),
    },
    {
      filename: "preview-cta.png",
      alt: "CTA band block preview",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "block-preview-images", "preview-cta.png")
      ),
    },
    {
      filename: "preview-newsletter.png",
      alt: "Newsletter block preview",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "block-preview-images", "preview-newsletter.png")
      ),
    },
    {
      filename: "preview-stats.png",
      alt: "Stats block preview",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "block-preview-images", "preview-stats.png")
      ),
    },
    {
      filename: "preview-testimonials.png",
      alt: "Testimonials block preview",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "block-preview-images", "preview-testimonials.png")
      ),
    },
    {
      filename: "empty-placeholder.jpg",
      alt: "Raw HTML block preview",
      mimetype: "image/jpeg",
      data: readFileSync(path.join(process.cwd(), "public", "empty-placeholder.jpg")),
    },
  ];
}

/**
 * The Users collection has exactly three roles - admin, author, user - with no
 * market-restriction or approval-workflow field anywhere in the schema. The four personas this
 * demo needs to show collapse onto those three: the international and local editors both land on
 * "author" (the schema has no finer mechanism to tell them apart - the distinction stays in the
 * name and email only), and the fee-earner - who only submits a profile-change request for
 * approval - gets "user". None of these is the shared admin@focusreactive.com login; each is a
 * dedicated demo identity with its own email. Passwords are never hardcoded: each is read from
 * its own env var at seed time, mirroring how SANDBOX_E_SEED_TOKEN already works here, so the
 * actual values never enter this public repo.
 */
interface DemoUserSpec {
  email: string;
  name: string;
  role: User["role"];
  passwordEnvVar: string;
}

const DEMO_USERS: DemoUserSpec[] = [
  {
    email: "administrator@example.com",
    name: "Administrator",
    role: "admin",
    passwordEnvVar: "SANDBOX_E_ADMIN_PASSWORD",
  },
  {
    email: "international.editor@example.com",
    name: "International digital and communications editor",
    role: "author",
    passwordEnvVar: "SANDBOX_E_INTL_EDITOR_PASSWORD",
  },
  {
    email: "local.editor@example.com",
    name: "Local marketing and communications editor",
    role: "author",
    passwordEnvVar: "SANDBOX_E_LOCAL_EDITOR_PASSWORD",
  },
  {
    email: "fee.earner@example.com",
    name: "Fee-earner",
    role: "user",
    passwordEnvVar: "SANDBOX_E_FEE_EARNER_PASSWORD",
  },
];

/**
 * TestimonialsList's `testimonials` field requires at least one row, so the preset needs a real
 * testimonial document to point at. Author and company are invented for this demo and match no
 * real person or organisation.
 */
function buildDemoTestimonial(avatarMediaId: number) {
  return {
    author: "Elena Voss",
    company: "Global IP Practice",
    position: "Senior Editor",
    rating: 5,
    avatar: avatarMediaId,
    content:
      "Publishing the same rebrand across nine markets used to mean nine separate projects. Now it's one page tree and a locale switch.",
  };
}

interface DemoPresetSpec {
  name: string;
  previewFilename: string;
  block:
    | HeroBlock
    | ContentBlock
    | FaqBlock
    | CardsGridBlock
    | CarouselBlock
    | LogosBlock
    | ChartBlock
    | CtaBandBlock
    | NewsletterBlock
    | StatsBlock
    | TestimonialsListBlock
    | RawHtmlBlock;
}

/**
 * One preset per entry in contentBlocks.ts (apps/cms/src/blocks/contentBlocks.ts), so every block
 * in the drawer has a populated starting point instead of an empty shell. GlobalSectionSlotBlock
 * is deliberately excluded - its only field is a required relationship to an existing globalBlock
 * document, demo-seed never creates one, and a preset with nothing but a pointer to nothing isn't
 * "real content."
 */
function buildDemoPresets(
  mediaIdByFilename: Record<string, number>,
  testimonialId: number
): DemoPresetSpec[] {
  return [
    {
      name: "Demo Hero",
      previewFilename: "preview-hero.png",
      block: {
        blockType: "hero",
        variant: "showcase",
        eyebrow: "Demo preset",
        title: "A rebrand that keeps every market in sync",
        richText: buildParagraphRichText(
          "Patents, trade marks, and every regional office share one content model, so a rebrand rolls out to nine markets at once instead of nine separate projects."
        ),
        actions: [buildAction("View services", "/services", "default")],
        image: { image: mediaIdByFilename["preview-hero.png"], aspectRatio: "16/9" },
        section: { theme: "light" },
      },
    },
    {
      name: "Demo Content",
      previewFilename: "preview-content.png",
      block: {
        blockType: "content",
        eyebrow: "How it works",
        heading: "One page tree, three languages",
        layout: "image-text",
        image: mediaIdByFilename["preview-content.png"],
        content: buildParagraphRichText(
          "Every page carries an English, French, and Japanese version from the same record, so a slug change or a parent rename cascades to all three without a separate translation project."
        ),
        actions: [buildAction("View global presence", "/global-presence", "outline")],
        section: { theme: "light" },
      },
    },
    {
      name: "Demo FAQ",
      previewFilename: "preview-faq.png",
      block: {
        blockType: "faq",
        eyebrow: "Questions",
        heading: "Frequently asked",
        description: "What a new editor usually asks in week one.",
        items: [
          {
            question: "Who can publish to every market at once?",
            answer: buildParagraphRichText(
              "Only the international digital and communications editor role can publish across all markets in one step."
            ),
          },
          {
            question: "What happens to a page outside my own market?",
            answer: buildParagraphRichText(
              "Local editors are scoped to their own markets, so a page outside them stays read-only."
            ),
          },
        ],
        section: { theme: "light" },
      },
    },
    {
      name: "Demo Cards Grid",
      previewFilename: "preview-cards-grid.png",
      block: {
        blockType: "cardsGrid",
        eyebrow: "Explore",
        heading: "Start here",
        description: "Three entry points into the demo content.",
        items: [
          {
            icon: "users",
            title: "Our people",
            description: "Meet the editors and reviewers behind the published pages.",
            link: {
              ...buildAction("Meet our people", "/our-people", "default"),
              label: "Meet our people",
            },
          },
          {
            icon: "layers",
            title: "Services",
            description: "Patents, trade marks, and everything in between.",
            link: {
              ...buildAction("View services", "/services", "default"),
              label: "View services",
            },
          },
          {
            icon: "map",
            title: "Global presence",
            description: "Nine markets, one shared content model.",
            link: {
              ...buildAction("View global presence", "/global-presence", "default"),
              label: "View global presence",
            },
          },
        ],
        section: { theme: "light" },
      },
    },
    {
      name: "Demo Carousel",
      previewFilename: "preview-carusel.png",
      block: {
        blockType: "carousel",
        eyebrow: "Case studies",
        heading: "Three ways teams use this platform",
        description: "A quick look at recent regional launches.",
        effect: "slide",
        slides: [
          {
            image: { image: mediaIdByFilename["preview-carusel.png"] },
            text: buildParagraphRichText(
              "Tokyo office launch, translated into Japanese from the same page tree."
            ),
          },
          {
            image: { image: mediaIdByFilename["preview-carusel.png"] },
            text: buildParagraphRichText(
              "A rebrand rolled out to nine markets without forking the content model."
            ),
          },
          {
            image: { image: mediaIdByFilename["preview-carusel.png"] },
            text: buildParagraphRichText(
              "A parent page renamed once, cascading to every child slug."
            ),
          },
        ],
        section: { theme: "light" },
      },
    },
    {
      name: "Demo Logos",
      previewFilename: "preview-logos.png",
      block: {
        blockType: "logos",
        label: "Trusted by teams across nine markets",
        alignVariant: "center",
        items: [
          {
            image: { image: mediaIdByFilename["preview-logos.png"] },
            link: { type: "custom", newTab: false, url: "/global-presence", label: "Tokyo office" },
          },
          {
            image: { image: mediaIdByFilename["preview-logos.png"] },
            link: {
              type: "custom",
              newTab: false,
              url: "/global-presence",
              label: "Amsterdam office",
            },
          },
          {
            image: { image: mediaIdByFilename["preview-logos.png"] },
            link: {
              type: "custom",
              newTab: false,
              url: "/global-presence",
              label: "Singapore office",
            },
          },
        ],
        section: { theme: "light" },
      },
    },
    {
      name: "Demo Chart",
      previewFilename: "preview-chart.png",
      block: {
        blockType: "chart",
        eyebrow: "Platform metrics",
        heading: "Publishing *velocity* since the rebrand",
        description: "Pages published per month across all nine markets.",
        title: "Monthly published pages",
        subtitle: "By market",
        ranges: [
          {
            label: "Q1",
            dataPoints: [
              { label: "Asia", value: 24 },
              { label: "Europe", value: 31 },
              { label: "Americas", value: 18 },
            ],
          },
          {
            label: "Q2",
            dataPoints: [
              { label: "Asia", value: 29 },
              { label: "Europe", value: 35 },
              { label: "Americas", value: 22 },
            ],
          },
        ],
        section: { theme: "light" },
      },
    },
    {
      name: "Demo CTA Band",
      previewFilename: "preview-cta.png",
      block: {
        blockType: "ctaBand",
        eyebrow: "Ready when you are",
        heading: "See it on your own content next",
        description: "The fastest way to evaluate a platform is to publish something real in it.",
        actions: [buildAction("View our people", "/our-people", "accent")],
        section: { theme: "light" },
      },
    },
    {
      name: "Demo Newsletter",
      previewFilename: "preview-newsletter.png",
      block: {
        blockType: "newsletter",
        eyebrow: "Stay in the loop",
        heading: "Get updates on the platform",
        inputPlaceholder: "Work email",
        buttonLabel: "Subscribe",
        disclaimer: "Unsubscribe anytime.",
        section: { theme: "light" },
      },
    },
    {
      name: "Demo Stats",
      previewFilename: "preview-stats.png",
      block: {
        blockType: "stats",
        items: [
          { value: "15", label: "Offices" },
          { value: "6", label: "Languages" },
          { value: "9", label: "Markets" },
          { value: "1", label: "Content model" },
        ],
        section: { theme: "light" },
      },
    },
    {
      name: "Demo Testimonials",
      previewFilename: "preview-testimonials.png",
      block: {
        blockType: "testimonialsList",
        eyebrow: "What editors say",
        heading: "From the rollout",
        description: "Feedback from the first cohort of editors.",
        testimonialItems: [{ testimonial: testimonialId }],
        showRating: true,
        showAvatar: true,
        duration: 60,
        section: { theme: "light" },
      },
    },
    {
      name: "Demo Raw HTML",
      previewFilename: "empty-placeholder.jpg",
      block: {
        blockType: "rawHtml",
        html: '<div style="padding: 2rem;"><strong>Embed placeholder</strong> - drop a signed office-hours widget, a status badge, or any third-party embed here.</div>',
        section: { theme: "light" },
      },
    },
  ];
}

export async function POST(request: Request) {
  const seedToken = request.headers.get("x-seed-token");
  // SANDBOX_E_SEED_TOKEN lives in this repo's encrypted clients tier, so an agent can inject it
  // with secrets.sh and reset the demo unattended; CRON_SECRET stays as the fallback because it
  // is what the Vercel project already carried.
  const expectedToken = process.env.SANDBOX_E_SEED_TOKEN ?? process.env.CRON_SECRET;

  // Fail closed: an unset token must never make an unheadered request
  // pass by both sides comparing to undefined.
  if (!expectedToken || !seedToken || seedToken !== expectedToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await getPayloadClient();

  try {
    let defaultMediaId = await getDefaultMediaId(PLATFORM_DEFAULT_MEDIA_SLOT);

    // getDefaultMediaId reads through unstable_cache, so on a branch database it can hand back an
    // id from whatever content lived here before. A relationship to a missing row fails validation
    // with "Image invalid" and never names the id, so confirm the row exists before trusting it.
    if (defaultMediaId) {
      const existing = await payload
        .findByID({ collection: "media", id: defaultMediaId, depth: 0, overrideAccess: true })
        .catch(() => null);
      if (!existing) {
        defaultMediaId = null;
      }
    }
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

    // Upsert by filename so a second run reuses the same media docs instead of duplicating them -
    // Payload itself would otherwise suffix a colliding filename rather than dedupe it.
    const mediaIdByFilename: Record<string, number> = {};
    let mediaCreatedCount = 0;

    for (const spec of buildDemoMedia()) {
      const existingMedia = await payload.find({
        collection: "media",
        where: { filename: { equals: spec.filename } },
        limit: 1,
        overrideAccess: true,
      });

      const existingDoc = existingMedia.docs[0];
      if (existingDoc) {
        mediaIdByFilename[spec.filename] = existingDoc.id;
        continue;
      }

      const createdMedia = await payload.create({
        collection: "media",
        overrideAccess: true,
        data: { alt: spec.alt },
        file: {
          data: spec.data,
          mimetype: spec.mimetype,
          name: spec.filename,
          size: spec.data.length,
        },
      });

      mediaIdByFilename[spec.filename] = createdMedia.id;
      mediaCreatedCount += 1;
    }

    // Upsert by email. Re-writing name/role/password on every run keeps an existing demo login in
    // sync with the current env var rather than leaving it to drift from a stale earlier value.
    const userWarnings: string[] = [];
    let usersCreatedCount = 0;
    let usersUpdatedCount = 0;

    for (const persona of DEMO_USERS) {
      const password = process.env[persona.passwordEnvVar];
      if (!password) {
        userWarnings.push(
          `Skipped ${persona.email}: ${persona.passwordEnvVar} is not set in this environment.`
        );
        continue;
      }

      const existingUser = await payload.find({
        collection: "users",
        where: { email: { equals: persona.email } },
        limit: 1,
        overrideAccess: true,
      });

      const existingDoc = existingUser.docs[0];
      if (existingDoc) {
        await payload.update({
          collection: "users",
          id: existingDoc.id,
          overrideAccess: true,
          data: { name: persona.name, role: persona.role, password },
        });
        usersUpdatedCount += 1;
        continue;
      }

      await payload.create({
        collection: "users",
        overrideAccess: true,
        data: { name: persona.name, email: persona.email, role: persona.role, password },
      });
      usersCreatedCount += 1;
    }

    // Upsert by author so a second run reuses the same testimonial instead of duplicating it.
    const testimonialAuthor = "Elena Voss";
    const existingTestimonial = await payload.find({
      collection: "testimonials",
      where: { author: { equals: testimonialAuthor } },
      locale: "en",
      limit: 1,
      overrideAccess: true,
    });

    const testimonialAvatarId = mediaIdByFilename["preview-testimonials.png"];
    const testimonialData = buildDemoTestimonial(testimonialAvatarId);
    let testimonialId: number;
    if (existingTestimonial.docs[0]) {
      testimonialId = existingTestimonial.docs[0].id;
      await payload.update({
        collection: "testimonials",
        id: testimonialId,
        locale: "en",
        overrideAccess: true,
        data: testimonialData,
      });
    } else {
      const createdTestimonial = await payload.create({
        collection: "testimonials",
        locale: "en",
        overrideAccess: true,
        data: testimonialData,
      });
      testimonialId = createdTestimonial.id;
    }

    // Upsert by name (locale "en", the anchor locale for every localized field in this route).
    let presetsCreatedCount = 0;
    let presetsUpdatedCount = 0;

    for (const spec of buildDemoPresets(mediaIdByFilename, testimonialId)) {
      const existingPreset = await payload.find({
        collection: "presets",
        where: { name: { equals: spec.name } },
        locale: "en",
        limit: 1,
        overrideAccess: true,
      });

      const previewMediaId = mediaIdByFilename[spec.previewFilename];
      const presetData = {
        name: spec.name,
        preview: previewMediaId,
        presetBlock: [spec.block],
      };

      const existingDoc = existingPreset.docs[0];
      if (existingDoc) {
        await payload.update({
          collection: "presets",
          id: existingDoc.id,
          locale: "en",
          overrideAccess: true,
          data: presetData,
        });
        presetsUpdatedCount += 1;
        continue;
      }

      await payload.create({
        collection: "presets",
        locale: "en",
        overrideAccess: true,
        data: presetData,
      });
      presetsCreatedCount += 1;
    }

    return NextResponse.json({
      deleted: {
        page: deletedPages.docs.length,
        posts: deletedPosts.docs.length,
      },
      created: {
        page: PAGE_TREE.length,
        media: mediaCreatedCount,
        users: usersCreatedCount,
        testimonials: existingTestimonial.docs[0] ? 0 : 1,
        presets: presetsCreatedCount,
      },
      updated: {
        users: usersUpdatedCount,
        testimonials: existingTestimonial.docs[0] ? 1 : 0,
        presets: presetsUpdatedCount,
      },
      warnings: userWarnings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Demo seed failed.";
    payload.logger.error(error, "Demo seed failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
