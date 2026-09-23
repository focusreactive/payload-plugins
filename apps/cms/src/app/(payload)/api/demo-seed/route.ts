import { readFileSync } from "node:fs";
import path from "node:path";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getPayloadClient } from "@/dal/payload-client";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";
import { revalidatePathMap } from "@/dal/pathMap";
import { seedInsightsFromFixtures, seedPeopleRecords } from "@/scripts/seedPassleInsights";
import { PLATFORM_DEFAULT_MEDIA_SLOT } from "@/lib/constants/mediaDefaults";
import { passleFixturesByShortcode } from "@/lib/passle/fixtures";
import type { PasslePostPayload } from "@/lib/passle/types";
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
  Person,
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

/**
 * French and Japanese page bodies. Without these, every non-English page falls back to the
 * starter kit's own demo blocks and renders "NEW - CADENCE 3.0 / The operating system for teams
 * that ship" - on the exact pages the walkthrough opens to prove that one document carries a
 * different address per language. Short and factual on purpose: this is structural copy that has
 * to be right in three languages, not marketing.
 */
const LOCALIZED_PAGE_BODY: Record<
  string,
  Record<"fr" | "ja", { eyebrow: string; heading: string; body: string }>
> = {
  home: {
    fr: {
      eyebrow: "Démonstration",
      heading: "Quinze bureaux, six langues, neuf marchés, un seul modèle de contenu",
      body: "Cette page est la version française du même document que la page d'accueil anglaise. Elle porte sa propre adresse, et son contenu est géré dans le même CMS.",
    },
    ja: {
      eyebrow: "デモ",
      heading: "15のオフィス、6つの言語、9つの市場、ひとつのコンテンツモデル",
      body: "このページは英語版ホームページと同一のドキュメントの日本語版です。日本語のアドレスを持ち、同じCMSで管理されています。",
    },
  },
  insights: {
    fr: {
      eyebrow: "Depuis Passle",
      heading: "Les articles arrivent depuis Passle, sans copier-coller",
      body: "Vingt articles publiés par le cabinet sont arrivés par le même webhook. L'auteur est rattaché à sa fiche par adresse e-mail.",
    },
    ja: {
      eyebrow: "Passleから",
      heading: "記事はPassleから届きます。手入力はありません",
      body: "20件の記事が同じWebhookを通じて届きました。著者はメールアドレスで人物レコードに紐付けられます。",
    },
  },
  "our-people": {
    fr: {
      eyebrow: "Rattachement des auteurs",
      heading: "Une fiche par personne, avec ses marchés",
      body: "Vingt et une fiches, chacune avec un intitulé de poste, un bureau et les marchés couverts. Les marchés se définissent séparément des langues.",
    },
    ja: {
      eyebrow: "著者の紐付け",
      heading: "人物レコードと担当市場",
      body: "21名分のレコードがあり、役職、オフィス、担当市場を保持します。市場は言語とは別に設定します。",
    },
  },
  services: {
    fr: {
      eyebrow: "Six langues, neuf marchés",
      heading: "La liste des services change selon le marché",
      body: "L'anglais porte dix-sept services, le français huit, le japonais cinq. C'est une décision éditoriale, pas une lacune.",
    },
    ja: {
      eyebrow: "6言語、9市場",
      heading: "サービス一覧は市場ごとに変わります",
      body: "英語では17、フランス語では8、日本語では5のサービスを掲載しています。これは意図的な判断です。",
    },
  },
  patents: {
    fr: {
      eyebrow: "Service",
      heading: "Brevets",
      body: "Page de service en français. Le même document porte une adresse française et reste lié aux mêmes articles.",
    },
    ja: {
      eyebrow: "サービス",
      heading: "特許",
      body: "日本語のサービスページです。同一ドキュメントが日本語のアドレスを持ち、同じ記事に紐付いています。",
    },
  },
  "trade-marks": {
    fr: {
      eyebrow: "Service",
      heading: "Marques",
      body: "Page de service en français. Sa visibilité par marché se règle indépendamment de sa langue.",
    },
    ja: {
      eyebrow: "サービス",
      heading: "商標",
      body: "日本語のサービスページです。市場ごとの公開範囲は言語とは独立して設定します。",
    },
  },
  "global-presence": {
    fr: {
      eyebrow: "Présence mondiale",
      heading: "Du continent au pays, puis au bureau",
      body: "Cette branche descend sur quatre niveaux. Chaque niveau porte son propre segment d'adresse, dans chaque langue.",
    },
    ja: {
      eyebrow: "拠点",
      heading: "大陸から国へ、そしてオフィスへ",
      body: "この階層は4段階です。各階層が言語ごとに独自のアドレス区間を持ちます。",
    },
  },
  asia: {
    fr: {
      eyebrow: "Niveau continent",
      heading: "Asie",
      body: "Deuxième niveau de l'adresse. Le bureau de Tokyo se trouve deux niveaux plus bas.",
    },
    ja: {
      eyebrow: "大陸レベル",
      heading: "アジア",
      body: "アドレスの第2階層です。東京オフィスはこの2つ下にあります。",
    },
  },
  japan: {
    fr: {
      eyebrow: "Niveau pays",
      heading: "Japon",
      body: "Troisième niveau. Renommez ce niveau en français et seules les adresses françaises en dessous changent.",
    },
    ja: {
      eyebrow: "国レベル",
      heading: "日本",
      body: "第3階層です。この階層の名称を変更すると、その言語の配下のアドレスだけが変わります。",
    },
  },
  "tokyo-office": {
    fr: {
      eyebrow: "Niveau bureau",
      heading: "Bureau de Tokyo",
      body: "Quatrième et dernier niveau. Son adresse française est assemblée à partir de chaque parent au-dessus.",
    },
    ja: {
      eyebrow: "オフィスレベル",
      heading: "東京オフィス",
      body: "最下層です。日本語のアドレスは、上位のすべての階層から組み立てられます。",
    },
  },
};

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

function sortPasslePostsByPublishedDateDescending(posts: PasslePostPayload[]): PasslePostPayload[] {
  return [...posts].sort(
    (first, second) =>
      new Date(second.PublishedDate).getTime() - new Date(first.PublishedDate).getTime()
  );
}

function formatPasslePostPublishedDate(publishedDate: string): string {
  return new Date(publishedDate).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Shared by every cardsGrid that lists Passle-ingested posts (insights, and the
 * per-service "recent work" sections), so the same title/author/date shape is never
 * hand-typed twice and drifts.
 */
function buildInsightCardsGridItem(post: PasslePostPayload) {
  const authorName = post.Authors[0]?.Name ?? "Unattributed";
  return {
    alignVariant: "left" as const,
    title: post.PostTitle,
    description: `${authorName} · ${formatPasslePostPublishedDate(post.PublishedDate)}`,
  };
}

/**
 * Builds the homepage's `blocks` array. Copy is verbatim from the deal's
 * homepage-copy brief (outside this repository, which is public) - every
 * "open it" action points into the CMS admin because those links need an
 * account and the credentials go out after the call.
 */
function buildHomepageBlocks(defaultMediaId: number, illustrations: Record<string, number>) {
  const hero: HeroBlock = {
    blockType: "hero",
    variant: "centered",
    image: {
      image: illustrations["admin-page-tree.png"] ?? defaultMediaId,
      aspectRatio: "16/9",
    },
    eyebrow: "Content platform demo",
    title: "Fifteen offices, six languages, nine markets, one content model",
    richText: buildParagraphRichText(
      "This is a working content platform built on your own published material. Everything below is live in the CMS behind it, not a mockup."
    ),
    actions: [
      buildAction("Open the CMS", "/admin", "accent"),
      buildAction(
        "See an article that arrived from Passle",
        "/admin/collections/insight",
        "outline"
      ),
    ],
    section: { theme: "light" },
  };

  const stats: StatsBlock = {
    blockType: "stats",
    items: [
      { value: "3,115", label: "Passle items in the estate, of about 3,800" },
      { value: "20", label: "Ingested into this demo" },
      { value: "17", label: "English services" },
      { value: "8", label: "French services" },
    ],
    section: { theme: "light" },
  };

  const passleSync: ContentBlock = {
    blockType: "content",
    eyebrow: "3,115 of roughly 3,800 items in the estate",
    heading: "Your attorneys keep writing in Passle. The article arrives here enriched.",
    layout: "image-text",
    // A screenshot of the real admin beats a drawn diagram here: the claim is that
    // articles arrive by themselves, and the list of them with their authors is the
    // evidence. The drawn version of this sat next to it and looked invented.
    image: illustrations["admin-insight-list.png"] ?? defaultMediaId,
    content: buildParagraphRichText(
      "A post published in Passle sends its shortcode, and the platform pulls the article, matches the author to their profile by email address, and files it under the practice areas it belongs to. Nobody copies text, and an editor who adds a summary or a related service keeps that work when the article syncs again."
    ),
    actions: [buildAction("Open the synced article in the CMS", "/admin/collections/insight")],
    section: { theme: "light" },
  };

  const localisedAddresses: ContentBlock = {
    blockType: "content",
    eyebrow: "Localised addresses",
    heading:
      "Your Japanese pages already use Japanese addresses. The platform treats that as normal.",
    layout: "text-image",
    image: illustrations["admin-pages-japanese.png"] ?? defaultMediaId,
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
      buildAction("See how markets are set, separately from language", "/admin/collections/person"),
    ],
    section: { theme: "light" },
  };

  const reviewQueue: ContentBlock = {
    blockType: "content",
    eyebrow: "Review before publication",
    heading: "A translation arrives as a draft, addressed to a human.",
    layout: "image-text",
    image: illustrations["admin-person-markets.png"] ?? defaultMediaId,
    content: buildParagraphRichText(
      "Machine translation drafts the page and the review queue holds it until someone signs it off. For an IP practice that is the only acceptable order, and it is the same queue that holds a fee-earner's request to update their own biography."
    ),
    actions: [
      buildAction("Open the review queue", "/admin/collections/page?where[_status][equals]=draft"),
    ],
    section: { theme: "light" },
  };

  const roles: CardsGridBlock = {
    blockType: "cardsGrid",
    eyebrow: "Roles",
    heading: "What someone sees is what their job needs, and nothing else.",
    description:
      "An administrator, an international digital and communications editor who publishes anywhere, a local marketing and communications editor limited to their own markets and content types, and a fee-earner whose only task here is submitting a change to their own profile.",
    // Each card carries the account it belongs to, and the link signs the current user out,
    // because signing in as another role is the only way to see that role's admin. Four buttons
    // that all said "Sign in as this role" and all landed on the same /admin said nothing.
    items: [
      {
        title: "Administrator",
        description: "administrator@example.com",
        link: {
          ...buildAction("Sign out and use this account", "/admin/logout"),
          label: "Sign out and use this account",
        },
      },
      {
        title: "International digital and communications editor",
        description: "international.editor@example.com",
        link: {
          ...buildAction("Sign out and use this account", "/admin/logout"),
          label: "Sign out and use this account",
        },
      },
      {
        title: "Local marketing and communications editor",
        description: "local.editor@example.com",
        link: {
          ...buildAction("Sign out and use this account", "/admin/logout"),
          label: "Sign out and use this account",
        },
      },
      {
        title: "Fee-earner",
        description: "fee.earner@example.com",
        link: {
          ...buildAction("Sign out and use this account", "/admin/logout"),
          label: "Sign out and use this account",
        },
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

/**
 * /insights: every card is built from the same Passle fixtures the ingest itself reads
 * (@/lib/passle/fixtures), sorted newest first, so this listing always matches what a second
 * seed run would produce - nothing here is typed independently of the ingest data.
 */
function buildInsightsPageBlocks(illustrations: Record<string, number>, defaultMediaId: number) {
  const intro: ContentBlock = {
    blockType: "content",
    eyebrow: "From Passle",
    heading: "Twenty articles, none of them typed by hand",
    layout: "image-text",
    image: illustrations["admin-insight-list.png"] ?? defaultMediaId,
    content: buildParagraphRichText(
      "Every article below arrived through the same webhook: a shortcode comes in from Passle, the platform fetches the post, matches its author to a person record by email address, and files the result here with its original publish date intact."
    ),
    section: { theme: "light" },
  };

  const listing: CardsGridBlock = {
    blockType: "cardsGrid",
    eyebrow: "Latest insights",
    heading: "Recently published",
    description: "Newest first, in the order they synced.",
    columns: 3,
    items: sortPasslePostsByPublishedDateDescending(Object.values(passleFixturesByShortcode)).map(
      buildInsightCardsGridItem
    ),
    section: { theme: "light" },
  };

  return [intro, listing];
}

/**
 * /our-people: cards come from the Person documents seedPeopleRecords has already written by the
 * time this runs (see the reordering in POST below), not from a copy of that seed data kept here -
 * so this always reflects what is actually in the database, not what the seed script intended.
 */
function buildOurPeoplePageBlocks(
  illustrations: Record<string, number>,
  defaultMediaId: number,
  people: Person[]
) {
  const intro: ContentBlock = {
    blockType: "content",
    eyebrow: "Author matching",
    heading: "A person record is what makes an author real",
    layout: "text-image",
    image: illustrations["admin-page-tree.png"] ?? defaultMediaId,
    content: buildParagraphRichText(
      "Twenty-one people are on file here, each with a name, a job title, an office and the markets they cover. When an article syncs from Passle, the ingest checks its author's email address against this list. A match links the article to a real profile; a miss leaves the author's email on the article for an editor to resolve by hand."
    ),
    section: { theme: "light" },
  };

  const roster: CardsGridBlock = {
    blockType: "cardsGrid",
    eyebrow: "Our people",
    heading: "Twenty-one profiles, matched by email",
    description: "Twenty-one records, in the order they synced.",
    columns: 3,
    items: people.map((person) => ({
      alignVariant: "left" as const,
      title: person.name,
      description: `${person.jobTitle} - ${person.office}`,
    })),
    section: { theme: "light" },
  };

  return [intro, roster];
}

/**
 * /services: links to the two child service pages plus the real per-locale service counts already
 * quoted on the homepage (17 English, 8 French, 5 Japanese) - restated here rather than recomputed,
 * since there is no live per-locale service count to query in this demo database.
 */
function buildServicesOverviewPageBlocks() {
  const overview: CardsGridBlock = {
    blockType: "cardsGrid",
    eyebrow: "Services",
    heading: "Two practice areas, each with its own page",
    columns: 2,
    items: [
      {
        icon: "shield",
        title: "Patents",
        description: "Filing, prosecution and enforcement for inventions.",
        link: { ...buildAction("View patents", "/services/patents"), label: "View patents" },
      },
      {
        icon: "target",
        title: "Trade marks",
        description: "Registering and defending brand identity across every market.",
        link: {
          ...buildAction("View trade marks", "/services/trade-marks"),
          label: "View trade marks",
        },
      },
    ],
    section: { theme: "light" },
  };

  const coverage: StatsBlock = {
    blockType: "stats",
    items: [
      { value: "17", label: "English-language services" },
      { value: "8", label: "French-language services" },
      { value: "5", label: "Japanese-language services" },
    ],
    section: { theme: "light" },
  };

  return [overview, coverage];
}

/**
 * /services/patents and /services/trade-marks are deliberately built with different block orders
 * and, on patents only, an FAQ item grounded in a real gap in the seeded Person data: nobody
 * carries the "japan" market value (@/lib/fields/marketsField.ts lists it as one of nine options),
 * so a market-scoped view of a patents page would have no attorney to route a Japanese enquiry to.
 * This is the market-visibility note the two pages are meant to demonstrate - deliberately absent
 * from the trade marks page below.
 */
function buildPatentsPageBlocks(illustrations: Record<string, number>, defaultMediaId: number) {
  const recentPosts = sortPasslePostsByPublishedDateDescending(
    Object.values(passleFixturesByShortcode).filter((post) => post.Tags?.includes("Patents"))
  );

  const intro: ContentBlock = {
    blockType: "content",
    eyebrow: "Patents",
    heading: "Protection for what your engineers have actually built",
    layout: "image-text",
    image: illustrations["admin-pages-japanese.png"] ?? defaultMediaId,
    content: buildParagraphRichText(
      "Patent work here runs from a first filing through prosecution to enforcement, across the offices that handle technical subject matter. The examples below are recent matters our own attorneys wrote up, not brochure copy."
    ),
    section: { theme: "light" },
  };

  const recentWork: CardsGridBlock = {
    blockType: "cardsGrid",
    eyebrow: "Recent patent work",
    heading: "From the people who did it",
    columns: 3,
    items: recentPosts.map(buildInsightCardsGridItem),
    section: { theme: "light" },
  };

  const availability: FaqBlock = {
    blockType: "faq",
    eyebrow: "Before you ask",
    heading: "Availability",
    items: [
      {
        question: "Is a patent attorney available in every market this page publishes to?",
        answer: buildParagraphRichText(
          "Attorneys are on file for the UK/Europe, Greater China, South East Asia and Canada markets. Nobody is currently recorded against the Japan market, so a market-scoped view of this page would have no one to route a Japanese enquiry to until that gap is closed."
        ),
      },
      {
        question: "Who handles a matter that spans two offices?",
        answer: buildParagraphRichText(
          "The attorney who takes the initial instruction stays the point of contact even when a second office's technical specialism is brought in, so a client is never managing two relationships for one matter."
        ),
      },
    ],
    section: { theme: "light" },
  };

  return [intro, recentWork, availability];
}

function buildTradeMarksPageBlocks(illustrations: Record<string, number>, defaultMediaId: number) {
  const recentPosts = sortPasslePostsByPublishedDateDescending(
    Object.values(passleFixturesByShortcode).filter((post) =>
      post.Tags?.includes("Brands & Trade Marks")
    )
  );

  const recentWork: CardsGridBlock = {
    blockType: "cardsGrid",
    eyebrow: "Recent trade mark work",
    heading: "From the people who did it",
    columns: 3,
    items: recentPosts.map(buildInsightCardsGridItem),
    section: { theme: "light" },
  };

  const intro: ContentBlock = {
    blockType: "content",
    eyebrow: "Trade marks",
    heading: "Brand identity, registered and defended",
    layout: "text-image",
    image: illustrations["admin-person-markets.png"] ?? defaultMediaId,
    content: buildParagraphRichText(
      "Trade mark work covers clearance, filing, portfolio management and enforcement, in whichever of the firm's nine markets a brand needs protecting. The examples below are recent matters, not brochure copy."
    ),
    section: { theme: "light" },
  };

  return [intro, recentWork];
}

/**
 * /global-presence and its three descendants (asia, japan, tokyo-office) get shorter with every
 * level, ending at the leaf with a stats block instead of more prose - proving the four-level
 * localised address structure without turning any of them into an essay.
 */
function buildGlobalPresencePageBlocks(defaultMediaId: number) {
  const intro: ContentBlock = {
    blockType: "content",
    eyebrow: "Global presence",
    heading: "Nine markets, three published languages",
    layout: "image-text",
    image: defaultMediaId,
    content: buildParagraphRichText(
      "The address structure below moves from continent to country to office. Renaming a page at any level cascades that change to every child address beneath it, in that language only."
    ),
    section: { theme: "light" },
  };
  return [intro];
}

function buildAsiaPageBlocks(defaultMediaId: number) {
  const intro: ContentBlock = {
    blockType: "content",
    eyebrow: "Asia",
    heading: "The continent level of the address",
    layout: "text-image",
    image: defaultMediaId,
    content: buildParagraphRichText(
      "Asia is the second segment of the address. One office sits beneath it in this demo, Tokyo, two levels down through Japan."
    ),
    section: { theme: "light" },
  };
  return [intro];
}

function buildJapanPageBlocks(defaultMediaId: number) {
  const intro: ContentBlock = {
    blockType: "content",
    eyebrow: "Japan",
    heading: "One market, one address",
    layout: "image-text",
    image: defaultMediaId,
    content: buildParagraphRichText(
      "Everything beneath this address belongs to one market: Japan."
    ),
    section: { theme: "light" },
  };
  return [intro];
}

function buildTokyoOfficePageBlocks(defaultMediaId: number) {
  const intro: ContentBlock = {
    blockType: "content",
    eyebrow: "Tokyo office",
    heading: "Office level",
    layout: "text-image",
    image: defaultMediaId,
    content: buildParagraphRichText("The address ends here."),
    section: { theme: "light" },
  };

  const details: StatsBlock = {
    blockType: "stats",
    items: [
      { value: "Tokyo", label: "Office" },
      { value: "Japan", label: "Market" },
      { value: "4", label: "Levels in this address" },
    ],
    section: { theme: "light" },
  };

  return [intro, details];
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
      filename: "admin-insight-list.png",
      alt: "The insight list in the CMS, showing articles that arrived from Passle with their authors and publish dates",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "demo-screens", "admin-insight-list.png")
      ),
    },
    {
      filename: "admin-pages-japanese.png",
      alt: "The page list in the CMS with the locale set to Japanese, showing Japanese titles and Japanese slugs",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "demo-screens", "admin-pages-japanese.png")
      ),
    },
    {
      filename: "admin-page-tree.png",
      alt: "The page list in the CMS, each page with its own slug, above the locale switcher",
      mimetype: "image/png",
      data: readFileSync(path.join(process.cwd(), "public", "demo-screens", "admin-page-tree.png")),
    },
    {
      filename: "admin-person-markets.png",
      alt: "A person in the CMS, with the markets they belong to set separately from any language",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "demo-screens", "admin-person-markets.png")
      ),
    },
    {
      filename: "demo-logo.svg",
      alt: "Content Platform Demo",
      mimetype: "image/svg+xml",
      data: readFileSync(path.join(process.cwd(), "public", "demo-logo.svg")),
    },
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
        image: { image: mediaIdByFilename["one-document-six-addresses.svg"], aspectRatio: "16/9" },
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

/**
 * The header and footer are the only content visible on every page, so a demo that leaves the
 * fork base's own navigation in place advertises someone else's product on every screenshot.
 * Localised labels and paths, because the nav is where a viewer first sees the language switch.
 */
const NAVIGATION_BY_LOCALE: Record<LocaleCode, { label: string; url: string }[]> = {
  en: [
    { label: "Insights", url: "/insights" },
    { label: "Our people", url: "/our-people" },
    { label: "Services", url: "/services" },
    { label: "Global presence", url: "/global-presence" },
  ],
  fr: [
    { label: "Actualités", url: "/fr/actualites" },
    { label: "Notre équipe", url: "/fr/notre-equipe" },
    { label: "Services", url: "/fr/services" },
    { label: "Présence mondiale", url: "/fr/presence-mondiale" },
  ],
  ja: [
    { label: "インサイト", url: "/ja/インサイト" },
    { label: "専門家", url: "/ja/専門家" },
    { label: "サービス", url: "/ja/サービス" },
    { label: "世界展開", url: "/ja/世界展開" },
  ],
};

const FOOTER_TEXT_BY_LOCALE: Record<LocaleCode, { description: string; copyright: string }> = {
  en: {
    description:
      "A working content platform: six languages, nine markets, and every article arriving from the firm's own publishing tool.",
    copyright: "Content Platform Demo",
  },
  fr: {
    description:
      "Une plateforme de contenu en fonctionnement : six langues, neuf marchés, et chaque article arrivant depuis l'outil de publication du cabinet.",
    copyright: "Content Platform Demo",
  },
  ja: {
    description:
      "実際に動作するコンテンツ基盤。6つの言語、9つの市場、そして記事は事務所自身の配信ツールから届きます。",
    copyright: "Content Platform Demo",
  },
};

async function seedNavigation(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  logoMediaId: number | undefined
) {
  const [header] = (await payload.find({ collection: "header", limit: 1, overrideAccess: true }))
    .docs;
  const [footer] = (await payload.find({ collection: "footer", limit: 1, overrideAccess: true }))
    .docs;

  for (const locale of ["en", "fr", "ja"] as LocaleCode[]) {
    const navigation = NAVIGATION_BY_LOCALE[locale];
    const footerText = FOOTER_TEXT_BY_LOCALE[locale];

    if (header) {
      await payload.update({
        collection: "header",
        id: header.id,
        locale,
        overrideAccess: true,
        context: { skipEmbedding: true },
        data: {
          name: "Content Platform Demo",
          ...(logoMediaId ? { logo: logoMediaId } : {}),
          navItems: navigation.map((item) => ({
            label: item.label,
            type: "link" as const,
            link: { type: "custom" as const, url: item.url },
          })),
          actions: [],
        },
      });
    }

    if (footer) {
      await payload.update({
        collection: "footer",
        id: footer.id,
        locale,
        overrideAccess: true,
        context: { skipEmbedding: true },
        data: {
          name: "Content Platform Demo",
          ...(logoMediaId ? { logo: logoMediaId } : {}),
          description: footerText.description,
          copyrightText: footerText.copyright,
          linkGroups: [
            {
              label: navigation[2].label,
              links: navigation.slice(2).map((item) => ({
                link: { type: "custom" as const, url: item.url, label: item.label },
              })),
            },
            {
              label: navigation[0].label,
              links: navigation.slice(0, 2).map((item) => ({
                link: { type: "custom" as const, url: item.url, label: item.label },
              })),
            },
          ],
          legalLinks: [],
        },
      });
    }
  }
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

  // Optional, and deliberately not an env var: a screenshot pass asks for a throwaway admin in the
  // request body, so nothing about it outlives the run that asked for it.
  const requestBody = (await request.json().catch(() => ({}))) as {
    screenshotPassword?: unknown;
  };
  const screenshotPassword =
    typeof requestBody.screenshotPassword === "string" &&
    requestBody.screenshotPassword.length >= 12
      ? requestBody.screenshotPassword
      : undefined;

  const payload = await getPayloadClient();

  try {
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

        // Re-upload when the bytes on disk have changed, because upserting on filename
        // alone silently keeps the old picture: a redrawn illustration or a retaken
        // screenshot would never reach the demo, and the seed would report success.
        if (existingDoc.filesize !== spec.data.length) {
          // Replacing rather than updating, because an update keeps the stored object and Payload
          // renames the incoming file around it: the third upload of the same screenshot became
          // admin-insight-list-2.png and left two stale copies in the media library.
          await payload.delete({ collection: "media", id: existingDoc.id, overrideAccess: true });

          const replacedMedia = await payload.create({
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

          mediaIdByFilename[spec.filename] = replacedMedia.id;
        }

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

    // Mark one media doc as the platform default, because every block's image defaultValue
    // resolves through getDefaultMediaId, and a null there fails validation on any locale that
    // falls back to the default block set.
    const illustrationIds: Record<string, number> = {
      "admin-page-tree.png": mediaIdByFilename["admin-page-tree.png"],
      "admin-person-markets.png": mediaIdByFilename["admin-person-markets.png"],
      "admin-insight-list.png": mediaIdByFilename["admin-insight-list.png"],
      "admin-pages-japanese.png": mediaIdByFilename["admin-pages-japanese.png"],
    };

    const platformDefaultMediaId = mediaIdByFilename["admin-page-tree.png"];
    if (platformDefaultMediaId) {
      await payload.update({
        collection: "media",
        id: platformDefaultMediaId,
        overrideAccess: true,
        data: { defaultFor: [PLATFORM_DEFAULT_MEDIA_SLOT] },
      });
    }

    let defaultMediaId: string | number | null = mediaIdByFilename["admin-page-tree.png"] ?? null;
    if (!defaultMediaId) {
      defaultMediaId = await getDefaultMediaId(PLATFORM_DEFAULT_MEDIA_SLOT);
    }

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

    // The people and insights are seeded before the page tree below, not after: /our-people
    // reads real Person documents back out of the database to build its cards, and that only
    // works once seedPeopleRecords has actually written them. Neither seed step touches the
    // `page` or `posts` collections, so running them before those deletes is safe.
    await seedPeopleRecords(payload);
    await seedInsightsFromFixtures(payload);

    const seededPeople = (
      await payload.find({ collection: "person", limit: 100, overrideAccess: true })
    ).docs;

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
      const blocks = (() => {
        switch (spec.key) {
          case "home":
            return buildHomepageBlocks(defaultMediaNumericId, illustrationIds);
          case "insights":
            return buildInsightsPageBlocks(illustrationIds, defaultMediaNumericId);
          case "our-people":
            return buildOurPeoplePageBlocks(illustrationIds, defaultMediaNumericId, seededPeople);
          case "services":
            return buildServicesOverviewPageBlocks();
          case "patents":
            return buildPatentsPageBlocks(illustrationIds, defaultMediaNumericId);
          case "trade-marks":
            return buildTradeMarksPageBlocks(illustrationIds, defaultMediaNumericId);
          case "global-presence":
            return buildGlobalPresencePageBlocks(defaultMediaNumericId);
          case "asia":
            return buildAsiaPageBlocks(defaultMediaNumericId);
          case "japan":
            return buildJapanPageBlocks(defaultMediaNumericId);
          case "tokyo-office":
            return buildTokyoOfficePageBlocks(defaultMediaNumericId);
          default:
            return buildStructuralBlocks(spec.en.title, defaultMediaNumericId);
        }
      })();

      const created = await payload.create({
        collection: "page",
        locale: "en",
        draft: false,
        overrideAccess: true,
        context: { skipEmbedding: true },
        data: {
          _status: "published",
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
        const localizedBody = locale === "en" ? undefined : LOCALIZED_PAGE_BODY[spec.key]?.[locale];

        await payload.update({
          collection: "page",
          id: created.id,
          locale,
          draft: false,
          overrideAccess: true,
          context: { skipEmbedding: true },
          data: {
            _status: "published",
            title: text.title,
            slug: text.slug,
            generateSlug: false,
            // blocks is localized and required, so a locale left unwritten renders the starter
            // kit's own demo blocks instead of this demo's content.
            ...(localizedBody
              ? {
                  blocks: [
                    {
                      blockType: "content" as const,
                      eyebrow: localizedBody.eyebrow,
                      heading: localizedBody.heading,
                      layout: "text-image" as const,
                      image: defaultMediaId as number,
                      content: buildParagraphRichText(localizedBody.body),
                      section: { theme: "light" as const },
                    },
                  ],
                }
              : {}),
          },
        });
      }
    }

    // The review queue is the destination for the fourth claim, and an empty queue proves nothing.
    // This page is created as a draft and never published, which is what a machine translation
    // waiting for a human actually looks like: it exists, it is addressable, and it is not live.
    const draftServiceParentId = pageIdByKey["services"];
    if (draftServiceParentId) {
      const draftPage = await payload.create({
        collection: "page",
        locale: "en",
        draft: true,
        overrideAccess: true,
        context: { skipEmbedding: true },
        data: {
          _status: "draft",
          title: "Designs",
          slug: "designs",
          parent: draftServiceParentId,
          generateSlug: false,
          blocks: [
            {
              blockType: "content" as const,
              eyebrow: "Awaiting review",
              heading: "Designs",
              layout: "text-image" as const,
              image: defaultMediaId as number,
              content: buildParagraphRichText(
                "A third service page, translated by the platform and held here until an editor approves it. It is addressable, it is not published, and nothing on the public site links to it."
              ),
              section: { theme: "light" as const },
            },
          ],
        },
      });

      for (const [locale, text] of [
        ["fr", { title: "Dessins et modèles", slug: "dessins-et-modeles" }],
        ["ja", { title: "意匠", slug: "意匠" }],
      ] as const) {
        await payload.update({
          collection: "page",
          id: draftPage.id,
          locale,
          draft: true,
          overrideAccess: true,
          context: { skipEmbedding: true },
          data: { _status: "draft", title: text.title, slug: text.slug, generateSlug: false },
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

    // A screenshot pass needs an admin login, but the four persona passwords live only on the
    // presenter's machine and never enter this repo. One throwaway admin can be created from the
    // request body instead, and any run that does not ask for one deletes it again, so the demo is
    // never left carrying a login nobody recorded.
    const screenshotUserEmail = "screenshot@example.com";
    const existingScreenshotUser = await payload.find({
      collection: "users",
      where: { email: { equals: screenshotUserEmail } },
      limit: 1,
      overrideAccess: true,
    });
    const existingScreenshotDoc = existingScreenshotUser.docs[0];

    if (screenshotPassword) {
      if (existingScreenshotDoc) {
        await payload.update({
          collection: "users",
          id: existingScreenshotDoc.id,
          overrideAccess: true,
          data: { name: "Screenshot", role: "admin", password: screenshotPassword },
        });
        usersUpdatedCount += 1;
      } else {
        await payload.create({
          collection: "users",
          overrideAccess: true,
          data: {
            name: "Screenshot",
            email: screenshotUserEmail,
            role: "admin",
            password: screenshotPassword,
          },
        });
        usersCreatedCount += 1;
      }
    } else if (existingScreenshotDoc) {
      await payload.delete({
        collection: "users",
        id: existingScreenshotDoc.id,
        overrideAccess: true,
      });
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

    await seedNavigation(payload, mediaIdByFilename["demo-logo.svg"]);

    // Anything in the library that this seed did not put there is either another project's content
    // inherited with the branch database, or a stale copy Payload renamed around an earlier upload.
    // Both are visible the moment an editor opens Media on the call.
    const seededFilenames = new Set(buildDemoMedia().map((spec) => spec.filename));
    const strayMedia = await payload.find({
      collection: "media",
      limit: 500,
      depth: 0,
      overrideAccess: true,
    });
    let mediaDeletedCount = 0;
    for (const doc of strayMedia.docs) {
      if (!doc.filename || seededFilenames.has(doc.filename)) {
        continue;
      }

      // A row another document still points at cannot be deleted, and Postgres reports that as a
      // bare "Failed query" with no field name. Skipping it keeps the reset working; the count in
      // the response is what actually went.
      try {
        await payload.delete({ collection: "media", id: doc.id, overrideAccess: true });
        mediaDeletedCount += 1;
      } catch {
        continue;
      }
    }
    // Every page here was deleted and recreated with a new id, so the cached map still points
    // at rows that no longer exist until it is rebuilt.
    revalidatePathMap();

    // The rendered pages are cached too, and a query string does not bypass that cache: a reseed
    // rewrote every document while the site kept serving the previous run's HTML, which reads as
    // "the seed did nothing". Purging the whole route tree is right here because the seed just
    // rewrote all of it.
    revalidatePath("/", "layout");

    return NextResponse.json({
      deleted: {
        page: deletedPages.docs.length,
        posts: deletedPosts.docs.length,
        media: mediaDeletedCount,
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
