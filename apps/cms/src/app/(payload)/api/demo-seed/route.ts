import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getPayloadClient } from "@/dal/payload-client";
import { getDefaultMediaId } from "@/dal/getDefaultMediaId";
import { revalidatePathMap } from "@/dal/pathMap";
import { seedInsightsFromFixtures, seedPeopleRecords } from "@/scripts/seedPassleInsights";
import { PLATFORM_DEFAULT_MEDIA_SLOT } from "@/lib/constants/mediaDefaults";
import { passleFixturesByShortcode } from "@/lib/passle/fixtures";
import { personSlug } from "@/lib/dal/getListingRoutes";
import { reindexAllEmbeddings } from "@/lib/search/reindexAllEmbeddings";
import { SKIP_REDIRECT_ON_SLUG_CHANGE } from "@/lib/hooks/redirectOnSlugChange";
import { translatedInsight102o1qk } from "@/lib/passle/translations/102o1qk";
import type { PasslePostPayload } from "@/lib/passle/types";
import type {
  PeopleDirectoryBlock,
  FeatureListBlock,
  InsightsListBlock,
  CardsGridBlock,
  CarouselBlock,
  ChartBlock,
  ContentBlock,
  CtaBandBlock,
  FaqBlock,
  HeroBlock,
  LogosBlock,
  NewsletterBlock,
  Page,
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
      eyebrow: "Adresses localisées",
      heading: "Un seul document, une URL par langue",
      body: "Cette page et la page d’accueil anglaise sont un seul et même document, ici dans sa version française. Elle possède sa propre URL, et son contenu est géré dans le même CMS.",
    },
    ja: {
      eyebrow: "ローカライズされたURL",
      heading: "同じ文書に、言語ごとのURL",
      body: "このページは、英語版トップページと同じドキュメントの日本語版です。日本語のURLを持ち、同じCMSで管理されています。",
    },
  },
  insights: {
    fr: {
      eyebrow: "En provenance de Passle",
      heading: "Les articles nous parviennent de Passle, sans copier-coller",
      body: "Vingt articles publiés par le cabinet dans Passle sont arrivés ici d’eux-mêmes, sans que personne ne les ressaisisse. Chaque article est rattaché au profil de son auteur.",
    },
    ja: {
      eyebrow: "Passle連携",
      heading: "記事はPassleから自動で届きます。手入力は不要です",
      body: "事務所がPassleで公開した20件の記事が、手入力なしで自動的に届きました。記事はそれぞれ著者のプロフィールに紐付けられます。",
    },
  },
  "our-people": {
    fr: {
      eyebrow: "Rattachement des auteurs",
      heading: "Un profil par personne",
      body: "Vingt et un profils, chacun avec un intitulé de poste. Les marchés se configurent indépendamment des langues.",
    },
    ja: {
      eyebrow: "著者の紐付け",
      heading: "一人ひとりのプロフィール",
      body: "21名分のプロフィールに、役職を掲載しています。市場は言語とは独立して設定します。",
    },
  },
  services: {
    fr: {
      eyebrow: "Six langues, neuf marchés",
      heading: "La liste des services n’est pas la même dans chaque langue",
      body: "La version anglaise compte dix-sept services, la française huit, la japonaise cinq. C’est une décision éditoriale, pas une lacune. Deux d’entre eux, Brevets et Marques, sont développés en pages complètes dans cette démonstration.",
    },
    ja: {
      eyebrow: "6言語、9市場",
      heading: "サービス一覧は言語ごとに異なります",
      body: "英語版では17件、フランス語版では8件、日本語版では5件のサービスを掲載しています。これは意図的な編集判断であり、抜け漏れではありません。このデモでは、そのうち特許と商標の2件をページとして作成しています。",
    },
  },
  patents: {
    fr: {
      eyebrow: "Brevets",
      heading: "Du premier dépôt à la défense du titre",
      body: "Le travail sur les brevets va du premier dépôt à la procédure de délivrance, puis au contentieux, dans les bureaux qui traitent les sujets techniques. Cette page et sa version anglaise sont un seul et même document, publié sous une URL française et rattaché aux mêmes articles.",
    },
    ja: {
      eyebrow: "特許",
      heading: "出願から権利化、そして権利行使まで",
      body: "特許業務は、最初の出願から権利化の手続き、そして権利行使までを扱います。このページは英語版と同一のドキュメントで、日本語のURLを持ち、同じ記事に紐付いています。",
    },
  },
  "trade-marks": {
    fr: {
      eyebrow: "Marques",
      heading: "Protéger une marque, puis la défendre",
      body: "Le travail sur les marques couvre la recherche d’antériorité, le dépôt, la gestion de portefeuille et la défense, dans chacun des neuf marchés où une marque doit être protégée. La visibilité de cette page par marché se règle indépendamment de sa langue.",
    },
    ja: {
      eyebrow: "商標",
      heading: "ブランドを登録し、そして守る",
      body: "商標業務は、調査から出願、ポートフォリオ管理、権利行使までを扱います。市場ごとの公開範囲は、言語とは独立して設定します。",
    },
  },
  "global-presence": {
    fr: {
      eyebrow: "Présence mondiale",
      heading: "Du continent au pays, puis à l’implantation",
      body: "Cette branche compte quatre niveaux. Chaque niveau possède son propre segment d’URL, dans chaque langue.",
    },
    ja: {
      eyebrow: "拠点",
      heading: "大陸から国へ、そして拠点へ",
      body: "この構造は4階層です。各階層が、言語ごとに固有のURLセグメントを持ちます。",
    },
  },
  asia: {
    fr: {
      eyebrow: "Échelon continental",
      heading: "Asie",
      body: "Deuxième niveau de l’URL. Tokyo se trouve deux niveaux plus bas.",
    },
    ja: {
      eyebrow: "大陸階層",
      heading: "アジア",
      body: "URLの第2階層です。東京は、ここから2階層下にあります。",
    },
  },
  japan: {
    fr: {
      eyebrow: "Échelon national",
      heading: "Japon",
      body: "Troisième niveau. Changez son adresse dans la version française, et seules les URL françaises situées en dessous changent.",
    },
    ja: {
      eyebrow: "国階層",
      heading: "日本",
      body: "第3階層です。ある言語でこの階層のアドレスを変更すると、その言語の配下のURLだけが変わります。",
    },
  },
  "tokyo-office": {
    fr: {
      eyebrow: "Échelon local",
      heading: "Tokyo",
      body: "Quatrième et dernier niveau. Son URL française se compose des segments de toutes les pages parentes qui la précèdent.",
    },
    ja: {
      eyebrow: "拠点階層",
      heading: "東京",
      body: "最下層です。日本語のアドレスは、上位のすべての階層から組み立てられます。",
    },
  },
};

/**
 * Page titles and descriptions, written rather than generated. The SEO plugin's generator filled
 * every page with "Explore a live content platform demo featuring..." and "Discover our author
 * matching system...", four of six opening with Explore or Discover, which is the first thing a
 * digital lead sees when they view source.
 */
const TRANSLATED_INSIGHTS_NOTE = {
  fr: "Seul cet article existe en français. Les dix-neuf autres n’existent qu’en anglais et ne sont donc pas listés ici.",
  ja: "日本語版があるのはこの記事のみです。残りの19本は英語版のみのため、ここには表示されません。",
} as const;

const PAGE_META_EN: Record<string, { title: string; description: string }> = {
  home: {
    title: "A content platform for fifteen offices and six languages",
    description:
      "One document carries a different address in each language, markets are set separately from languages, and articles arrive from Passle without copy-paste.",
  },
  insights: {
    title: "Insights, arriving from Passle",
    description:
      "Twenty of your published articles, arrived from Passle by themselves, each shown under its author's profile.",
  },
  "our-people": {
    title: "Our people, twenty-one profiles",
    description:
      "Twenty-one profiles, each with a job title. The email address on the profile is what lets an article find its author automatically.",
  },
  services: {
    title: "Services, and why the list differs by language",
    description:
      "English carries seventeen services, French eight, Japanese five. That is an editorial decision, not a translation gap.",
  },
  patents: {
    title: "Patents",
    description:
      "Patent work from first filing through prosecution to enforcement, alongside the firm's own published commentary on it.",
  },
  "trade-marks": {
    title: "Trade marks",
    description:
      "Clearance, filing, portfolio management and enforcement, in whichever of the nine markets a brand needs protecting.",
  },
  "global-presence": {
    title: "Global presence",
    description:
      "The presence tree, four levels deep, where every level carries its own address segment in every language.",
  },
  asia: {
    title: "Asia",
    description: "The continent level of the address, with Japan and Tokyo beneath it.",
  },
  japan: {
    title: "Japan",
    description:
      "The country level. Change its address in one language and every address beneath it follows, in that language only.",
  },
  "tokyo-office": {
    title: "Tokyo",
    description:
      "The deepest level of the address tree, reached through Global presence, Asia and Japan in English and through 世界展開, アジア and 日本 in Japanese.",
  },
};

const PAGE_TREE: PageSpec[] = [
  {
    key: "home",
    parentKey: null,
    en: { title: "Home", slug: "home" },
    // The home slug never appears in a URL: the locale root serves it, and a localised value here
    // makes /fr 404 while /ja works, because only "home" resolves as the index.
    fr: { title: "Accueil", slug: "home" },
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
    en: { title: "Tokyo", slug: "tokyo" },
    fr: { title: "Tokyo", slug: "tokyo" },
    ja: { title: "東京", slug: "東京" },
  },
];

/**
 * The French and Japanese homepages carried a single paragraph while the English one carried a
 * hero, a stats row and five sections. On a demo whose headline claim is that one content model
 * serves every locale, switching from / to /fr looked like the claim failing. These two locales
 * now open with the same hero and the same stats row, translated.
 */
/**
 * The two data-driven listings are carried into every locale so the counts the body text states are
 * backed by something. Their own heading is not localized by the block, so it is overridden here:
 * an English "Recently published" over French article cards is the tell that the page is a copy.
 */
const LOCALIZED_LISTING_HEADER: Record<
  "fr" | "ja",
  Record<
    "insights" | "our-people" | "patents" | "trade-marks",
    { eyebrow: string; heading: string; description: string }
  >
> = {
  fr: {
    patents: {
      eyebrow: "Travaux récents en brevets",
      heading: "Rédigés par les conseils en propriété industrielle qui les traitent",
      description: "Articles publiés par le cabinet. Ils n’existent qu’en anglais.",
    },
    "trade-marks": {
      eyebrow: "Travaux récents en marques",
      heading: "Rédigés par les conseils en propriété industrielle qui les traitent",
      description: "Articles publiés par le cabinet. Ils n’existent qu’en anglais.",
    },
    insights: {
      eyebrow: "Derniers articles",
      heading: "Publiés récemment",
      description:
        "Les plus récents d’abord, par date de publication. Les articles eux-mêmes n’existent qu’en anglais.",
    },
    "our-people": {
      eyebrow: "Notre équipe",
      heading: "Vingt et un profils, rattachés par adresse e-mail",
      description:
        "Les profils sont gérés ici, dans le CMS. Un article venu de Passle rejoint le profil de son auteur ; si l’auteur n’a pas encore de profil, un éditeur le crée.",
    },
  },
  ja: {
    patents: {
      eyebrow: "特許分野の最近の記事",
      heading: "実務を担当する弁理士が執筆しています",
      description: "事務所が公開した記事です。本文は英語版のみです。",
    },
    "trade-marks": {
      eyebrow: "商標分野の最近の記事",
      heading: "実務を担当する弁理士が執筆しています",
      description: "事務所が公開した記事です。本文は英語版のみです。",
    },
    insights: {
      eyebrow: "最新の記事",
      heading: "最近公開された記事",
      description: "公開日の新しい順に表示しています。記事本文は英語版のみです。",
    },
    "our-people": {
      eyebrow: "専門家",
      heading: "21名のプロフィール、メールアドレスで紐付け",
      description:
        "プロフィールはこのCMSで管理します。Passleから届いた記事は著者のプロフィールに紐付けられ、プロフィールがまだない著者は編集者が作成します。",
    },
  },
};

const LOCALIZED_HOMEPAGE: Record<
  "fr" | "ja",
  {
    heroEyebrow: string;
    heroTitle: string;
    heroBody: string;
    primaryAction: string;
    secondaryAction: string;
    statsHeader: StatsHeader;
    stats: NonNullable<StatsBlock["items"]>;
  }
> = {
  fr: {
    heroEyebrow: "Démonstration",
    heroTitle: "Quinze bureaux, six langues, neuf marchés, un seul modèle de contenu",
    heroBody:
      "Une plateforme de contenu réellement en service, construite sur vos propres publications. Tout ce qui suit existe réellement dans le CMS, ce n’est pas une maquette.",
    primaryAction: "Ouvrir le CMS",
    secondaryAction: "Voir un article arrivé de Passle",
    statsHeader: {
      eyebrow: "Chiffres",
      heading: "Les chiffres derrière cette démo",
      description:
        "Chaque chiffre a été compté sur votre site ou dans ce CMS, et chacun indique sa source.",
    },
    stats: [
      {
        value: "3 115",
        label: "Éléments Passle sur votre site",
        description: "Comptés depuis votre plan du site, sur environ 3 800 éléments au total.",
      },
      {
        value: "20",
        label: "Intégrés dans cette démo",
        description: "De vrais articles de votre site, chacun rattaché à son auteur par e-mail.",
        link: buildStatLink("Voir les articles", "/fr/actualites"),
      },
      {
        value: "17",
        label: "Services en anglais",
        description: "La liste anglaise complète. Brevets et marques sont construits ici en pages.",
      },
      {
        value: "8",
        label: "Services en français",
        description: "Le français en compte moins que l’anglais, et le site montre cet écart.",
        link: buildStatLink("Voir les services", "/fr/services"),
      },
    ],
  },
  ja: {
    heroEyebrow: "コンテンツ基盤デモ",
    heroTitle: "15拠点、6言語、9市場、ひとつのコンテンツモデル",
    heroBody:
      "御社自身の公開記事をもとに構築した、実際に稼働するコンテンツ基盤です。以下のすべてが背後のCMSに実在しており、モックアップではありません。",
    primaryAction: "CMSを開く",
    secondaryAction: "Passleから届いた記事を見る",
    statsHeader: {
      eyebrow: "数字で見る",
      heading: "このデモを支える数字",
      description:
        "以下の数字はすべて、御社の公開サイトまたはこのCMSで数えたもので、それぞれ出典を示しています。",
    },
    stats: [
      {
        value: "3,115",
        label: "Passle上の記事数",
        description: "サイトマップから数えた件数です。全体では約3,800件あります。",
      },
      {
        value: "20",
        label: "このデモに取り込んだ件数",
        description: "御社サイトの実際の記事で、著者とはメールアドレスで紐付けています。",
        link: buildStatLink("記事を見る", "/ja/インサイト"),
      },
      {
        value: "17",
        label: "英語版のサービス数",
        description: "英語版の全リストです。特許と商標はここでページとして作成しています。",
      },
      {
        value: "8",
        label: "フランス語版のサービス数",
        description: "フランス語版は英語版より少なく、サイトはその差を隠さず示します。",
        link: buildStatLink("サービスを見る", "/ja/サービス"),
      },
    ],
  },
};

type LexicalRichTextState = ContentBlock["content"];

type RichTextPart = { paragraph: string } | { bullets: string[] };

function buildTextNode(text: string) {
  return {
    type: "text",
    detail: 0,
    format: 0,
    mode: "normal",
    style: "",
    text,
    version: 1,
  };
}

function buildParagraphNode(paragraph: string) {
  return {
    type: "paragraph",
    direction: "ltr",
    format: "",
    indent: 0,
    textFormat: 0,
    version: 1,
    children: [buildTextNode(paragraph)],
  };
}

/**
 * `tag` and `listType` both have to be present, and they are read by two different pieces of code:
 * the packaged JSX converter renders the element named by `tag`
 * (@payloadcms/richtext-lexical, converters/list.js), while this repository's own `listitem`
 * override keys off `listType === "bullet"` to swap the marker for the brand check icon
 * (apps/cms/src/components/shared/RichText/index.tsx). Omitting either one renders nothing.
 */
function buildBulletListNode(bullets: string[]) {
  return {
    type: "list",
    direction: "ltr",
    format: "",
    indent: 0,
    version: 1,
    listType: "bullet",
    start: 1,
    tag: "ul",
    children: bullets.map((bullet, index) => ({
      type: "listitem",
      direction: "ltr",
      format: "",
      indent: 0,
      version: 1,
      value: index + 1,
      children: [buildTextNode(bullet)],
    })),
  };
}

/**
 * Body copy is read on a projector, in a room, by someone deciding whether to buy this. A section
 * that arrives as one sixty-word paragraph gets skipped, so every claim here is either a paragraph
 * of at most two sentences or a bullet list - and a list only where the items really are parallel,
 * because bulleting a single argument reads worse than the paragraph did.
 */
function buildRichText(...parts: RichTextPart[]): LexicalRichTextState {
  return {
    root: {
      type: "root",
      direction: "ltr",
      format: "",
      indent: 0,
      version: 1,
      children: parts.map((part) =>
        "bullets" in part ? buildBulletListNode(part.bullets) : buildParagraphNode(part.paragraph)
      ),
    },
  };
}

function buildParagraphRichText(paragraph: string): LexicalRichTextState {
  return buildRichText({ paragraph });
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

function buildStatLink(label: string, url: string) {
  return { type: "custom" as const, label, url, newTab: false };
}

type StatsHeader = Pick<StatsBlock, "eyebrow" | "heading" | "description">;

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
// Filled in POST once the insights are seeded, so the patents and trade marks cards can link to
// each article's own page. Slugs come from the database, not recomputed from the title here.
const insightSlugByShortcode = new Map<string, string>();

function buildInsightCardsGridItem(post: PasslePostPayload) {
  const authorName = post.Authors[0]?.Name ?? "Unattributed";
  const slug = insightSlugByShortcode.get(post.PostShortcode);
  return {
    alignVariant: "left" as const,
    title: post.PostTitle,
    description: `${authorName} · ${formatPasslePostPublishedDate(post.PublishedDate)}`,
    ...(slug
      ? {
          link: {
            type: "custom" as const,
            url: `/insights/${slug}`,
            label: "Read the article",
            newTab: false,
          },
        }
      : {}),
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
      image: illustrations["admin-pages-en.png"] ?? defaultMediaId,
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
        "/insights/takeaways-from-uc-berkeley-law-ai-institute",
        "outline"
      ),
    ],
    section: { theme: "light" },
  };

  const stats: StatsBlock = {
    blockType: "stats",
    layout: "accentLine",
    eyebrow: "By the numbers",
    heading: "The numbers behind this demo",
    description:
      "Every figure was counted from your live site or from this CMS, and each one says where.",
    items: [
      {
        value: "3,115",
        label: "Passle items on your site",
        description: "Counted from your sitemap, out of roughly 3,800 items in total.",
      },
      {
        value: "20",
        label: "Arrived in this demo",
        description: "Real articles from your site, each filed against its author by email.",
        link: buildStatLink("Browse the articles", "/insights"),
      },
      {
        value: "17",
        label: "English services",
        description: "The full English list. Patents and trade marks are built out as pages here.",
        link: buildStatLink("View services", "/services"),
      },
      {
        value: "8",
        label: "French services",
        description: "French lists fewer services than English, and the site shows that gap.",
        link: buildStatLink("View the French list", "/fr/services"),
      },
    ],
    section: { theme: "light" },
  };

  const passleSync: ContentBlock = {
    blockType: "content",
    eyebrow: "3,115 of roughly 3,800 items on your site come from Passle",
    heading: "Your attorneys keep writing in Passle. The website keeps up by itself.",
    layout: "image-text",
    // A screenshot of the real admin beats a drawn diagram here: the claim is that
    // articles arrive by themselves, and the list of them with their authors is the
    // evidence. The drawn version of this sat next to it and looked invented.
    image: illustrations["admin-insights-passle.png"] ?? defaultMediaId,
    // "files it under the practice areas it belongs to" until 2026-09-23: there is no practice-area
    // or service field on the Insight collection, so nothing files anything. What the ingest really
    // does is copy the author's markets onto the article
    // (lib/passle/ingestInsightFromPassle.ts, `matchedPersonMarkets`), which is the claim the
    // language-and-market section below then builds on.
    content: buildRichText(
      {
        paragraph:
          "Nothing changes for the people who write. An attorney publishes in Passle as they do today, and the article appears on the website under their profile, with nobody copying text across.",
      },
      {
        bullets: [
          "Attorneys write, publish and correct in Passle. A correction reaches the website the same way the original did.",
          "The platform finds the author's profile and shows the article in the markets that author covers.",
          "Your editors only handle what the platform cannot place, such as an article whose author has no profile yet, and decide which markets an article appears in.",
        ],
      }
    ),
    actions: [
      buildAction("Read it on the site", "/insights/takeaways-from-uc-berkeley-law-ai-institute"),
      buildAction("Open the articles in the CMS", "/admin/collections/insight", "outline"),
    ],
    section: { theme: "light" },
  };

  const localisedAddresses: ContentBlock = {
    blockType: "content",
    eyebrow: "Localised addresses",
    heading:
      "Your Japanese pages already use Japanese addresses. The platform treats that as normal.",
    layout: "text-image",
    image: illustrations["admin-pages-ja.png"] ?? defaultMediaId,
    // The two addresses were buried mid-sentence, which is where the whole claim lives. On their
    // own lines a viewer sees them without being read to.
    content: buildRichText(
      {
        paragraph:
          "One document. One address per language, assembled from the address of every parent above it.",
      },
      {
        bullets: ["English: /global-presence/asia/japan/", "Japanese: /ja/世界展開/アジア/日本/"],
      },
      {
        paragraph:
          "Change a parent's address in one language and every page beneath it follows, in that language only.",
      }
    ),
    actions: [
      buildAction("See a page four levels deep in Japanese", "/ja/世界展開/アジア/日本/東京"),
      buildAction("Change a parent's address in the CMS", "/admin/collections/page", "outline"),
    ],
    section: { theme: "light" },
  };

  // A ctaBand until 2026-09-23: it carries the only claim on the page that the CMS enforces a
  // rule, and a band has no image field, so the section that most needed evidence was the one
  // showing none. The screenshot is the person record its own button links to.
  const languageAndMarket: ContentBlock = {
    blockType: "content",
    eyebrow: "Six languages, nine markets",
    heading:
      "French carries eight services. English carries seventeen. That is a decision, not a gap.",
    layout: "image-text",
    image: illustrations["admin-person-record.png"] ?? defaultMediaId,
    content: buildRichText(
      {
        paragraph:
          "Which languages a document exists in, and which markets it belongs to, are two separate fields. Neither is derived from the other.",
      },
      {
        bullets: [
          "Markets are set on the article and on the person who wrote it.",
          "An article whose author covers none of its markets will not save.",
          "The error names both sides: the author's markets, and the article's.",
        ],
      }
    ),
    actions: [buildAction("See the market field on a person", "/admin/collections/person")],
    section: { theme: "light" },
  };

  const reviewQueue: ContentBlock = {
    blockType: "content",
    eyebrow: "Review before publication",
    heading: "A translation arrives as a draft, addressed to a human.",
    layout: "image-text",
    image: illustrations["admin-review-queue.png"] ?? defaultMediaId,
    content: buildRichText(
      {
        paragraph:
          "Machine translation drafts the page. The review queue holds it until someone signs it off.",
      },
      { paragraph: "For an IP practice, that is the only acceptable order." }
    ),
    actions: [
      buildAction("Open the review queue", "/admin/collections/page?where[_status][equals]=draft"),
    ],
    section: { theme: "light" },
  };

  const roles: CardsGridBlock = {
    blockType: "cardsGrid",
    eyebrow: "Roles",
    heading: "Four accounts, and what each one can actually do.",
    // What each account can do used to sit here, in one block, above four cards that carried only
    // an email address. It now sits on the card it belongs to, so the reader matches capability to
    // login without holding four of them in their head.
    description:
      "Sign out and back in as any of them. The local editor looks after Canada: Canadian articles and people open for editing, every other market is read only, and pages can be edited but not created or deleted.",
    // Each card carries the account it belongs to, and the link signs the current user out,
    // because signing in as another role is the only way to see that role's admin. Four buttons
    // that all said "Sign in as this role" and all landed on the same /admin said nothing.
    items: [
      {
        title: "Administrator",
        description: "Anything at all, including adding people · administrator@example.com",
        link: {
          ...buildAction("Sign out and use this account", "/admin/logout"),
          label: "Sign out and use this account",
        },
      },
      {
        title: "International digital and communications editor",
        description:
          "Creates, edits and publishes pages, people and insights · international.editor@example.com",
        link: {
          ...buildAction("Sign out and use this account", "/admin/logout"),
          label: "Sign out and use this account",
        },
      },
      {
        title: "Local marketing and communications editor",
        description:
          "Canada only: edits Canadian articles and people, edits pages but cannot create or delete them · local.editor@example.com",
        link: {
          ...buildAction("Sign out and use this account", "/admin/logout"),
          label: "Sign out and use this account",
        },
      },
      {
        title: "Fee-earner",
        description:
          "Edits one profile, Robert A. McNaughton, and submits it for an editor to approve · fee.earner@example.com",
        link: {
          ...buildAction("Sign out and use this account", "/admin/logout"),
          label: "Sign out and use this account",
        },
      },
    ],
    section: { theme: "light" },
  };

  // A bulleted list here read as fine print. Each limit is its own statement with a title, on
  // Untitled's features-simple-icons-04, so the reader sees six clear boundaries at a glance.
  const footnotes: FeatureListBlock = {
    blockType: "featureList",
    eyebrow: "Honest footnotes",
    heading: "What this demo is not",
    description: "Everything above is real and running. These are its edges.",
    items: [
      {
        icon: "sparkles",
        title: "A direction, not your brand",
        description:
          "The visual design is speculative. Your brand agency's work replaces it, and the blocks take any design without a schema change.",
      },
      {
        icon: "plug",
        title: "Fixtures, not your live Passle",
        description:
          "Twenty of your published articles, arriving the same way a live article would. We hold no access to your Passle account, and a fresh demo account would be empty.",
      },
      {
        icon: "layout-grid",
        title: "Reflows on a phone, not designed for one",
        description:
          "Navigation, image crops and tap targets on mobile are unreviewed. The mobile pass is priced in the estimate.",
      },
      {
        icon: "layers",
        title: "No practice-area filing yet",
        description:
          "Passle already tags every article, so this is a taxonomy to model, not data to go and find.",
      },
      {
        icon: "shield",
        title: "Two-factor sign-in and glossary translation",
        description: "Specced for the build, not wired into this sandbox.",
      },
      {
        icon: "workflow",
        title: "No migration and no search here",
        description:
          "Moving your Umbraco content and the site search are priced in the estimate, not demonstrated.",
      },
    ],
    section: { theme: "light" },
  };

  // Alternating surface tone is how a reader sees where one section ends and the next begins.
  // Done here rather than in CSS so it stays an editor's decision: the theme is a field on every
  // section, and flipping one in the admin changes the page.
  const homeBlocks = [
    hero,
    stats,
    passleSync,
    localisedAddresses,
    languageAndMarket,
    reviewQueue,
    roles,
    footnotes,
  ];

  return homeBlocks;
}

/**
 * Generous section padding with no change of surface reads as an empty page rather than as
 * separated sections, which is what the inner pages looked like. Alternating the surface is
 * what makes a boundary visible, so every page gets it, not only the homepage.
 */
function withAlternatingSurfaces<T>(blocks: T[]): T[] {
  return blocks.map((block, index) => {
    const existingSection = (block as { section?: Record<string, unknown> | null }).section;
    return {
      ...block,
      section: {
        ...(existingSection ?? {}),
        theme: index % 2 === 0 ? "light" : "light-gray",
      },
    };
  }) as T[];
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
    heading: "Twenty of your published articles, none of them typed in by hand",
    layout: "image-text",
    image: illustrations["admin-insights-passle.png"] ?? defaultMediaId,
    content: buildRichText(
      { paragraph: "Every article below was published in Passle and arrived here by itself." },
      {
        bullets: [
          "Each one sits under its author's profile, with its original publish date.",
          "A correction made in Passle replaces the text here, so the two never disagree.",
        ],
      }
    ),
    section: { theme: "light" },
  };

  // Read live from the Insight collection, so an article the webhook delivers during the call
  // shows up here on the next page load with nobody editing this page.
  const listing: InsightsListBlock = {
    blockType: "insightsList",
    eyebrow: "Latest insights",
    heading: "Recently published",
    description:
      "Newest first, by published date. This list reads the articles in the CMS, so nobody maintains it by hand.",
    limit: 24,
    section: { theme: "light" },
  };

  return [intro, listing];
}

/**
 * /our-people: cards come from the Person documents seedPeopleRecords has already written by the
 * time this runs (see the reordering in POST below), not from a copy of that seed data kept here -
 * so this always reflects what is actually in the database, not what the seed script intended.
 */
function buildOurPeoplePageBlocks(illustrations: Record<string, number>, defaultMediaId: number) {
  const intro: ContentBlock = {
    blockType: "content",
    eyebrow: "Author matching",
    heading: "A person record is what makes an author real",
    layout: "text-image",
    image: illustrations["admin-person-record.png"] ?? defaultMediaId,
    content: buildRichText(
      {
        paragraph: "Twenty-one people are on file, each with a job title.",
      },
      {
        paragraph:
          "When an article arrives from Passle, the platform looks for its author in this list by email address.",
      },
      {
        bullets: [
          "Found: the article appears on that person's profile.",
          "Not found: the article still arrives, and waits for an editor to add the profile or link an existing one.",
        ],
      }
    ),
    section: { theme: "light" },
  };

  // A peopleDirectory rather than cards typed in here: it reads the Person records when the page
  // renders, so a profile added or moved to another office shows up with no page edit.
  const roster: PeopleDirectoryBlock = {
    blockType: "peopleDirectory",
    eyebrow: "Our people",
    heading: "Twenty-one profiles, matched by email",
    description:
      "Profiles are kept here, in the CMS, not in Passle. An article joins its author's profile, and an author with no profile yet is one an editor adds.",
    section: { theme: "light" },
  };

  return [intro, roster];
}

/**
 * /services: links to the two child service pages plus the real per-locale service counts already
 * quoted on the homepage (17 English, 8 French, 5 Japanese) - restated here rather than recomputed,
 * since there is no live per-locale service count to query in this demo database.
 */
function buildServicesOverviewPageBlocks(illustrations: Record<string, number> = {}) {
  const overview: CardsGridBlock = {
    blockType: "cardsGrid",
    eyebrow: "Services",
    heading: "Two of the seventeen, built out as pages",
    columns: 2,
    items: [
      {
        icon: "shield",
        title: "Patents",
        description: "Filing, prosecution and enforcement for inventions.",
        link: {
          ...buildAction("View patents", "/services/patents"),
          label: "View patents",
        },
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
    layout: "splitImage",
    image: illustrations["admin-pages-fr.png"],
    eyebrow: "Coverage by language",
    heading: "Each language carries its own list",
    description:
      "Your English, French and Japanese sites do not list the same services. These counts come from each one.",
    items: [
      {
        value: "17",
        label: "English services",
        description: "The full list on your English site.",
        image: illustrations["admin-pages-en.png"],
      },
      {
        value: "8",
        label: "French services",
        description: "Nine fewer than English.",
        image: illustrations["admin-pages-fr.png"],
        link: buildStatLink("View in French", "/fr/services"),
      },
      {
        value: "5",
        label: "Japanese services",
        description: "The smallest of the three lists.",
        image: illustrations["admin-pages-ja.png"],
        link: buildStatLink("View in Japanese", "/ja/サービス"),
      },
      {
        value: "2",
        label: "Built out as pages",
        description: "Patents and trade marks, in all three languages.",
        image: illustrations["admin-tokyo-ja.png"],
      },
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
    image: illustrations["admin-insights-passle.png"] ?? defaultMediaId,
    content: buildRichText(
      {
        paragraph:
          "Patent work runs from first filing through prosecution to enforcement. It happens in the offices that handle technical subject matter.",
      },
      {
        paragraph:
          "The articles below are the firm's own published commentary, pulled in from Passle.",
      }
    ),
    section: { theme: "light" },
  };

  const recentWork: CardsGridBlock = {
    blockType: "cardsGrid",
    eyebrow: "Recent patent work",
    heading: "Written by the attorneys who work on it",
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
        answer: buildRichText(
          {
            paragraph: "No. Attorneys are on file for four of the nine markets:",
          },
          {
            bullets: ["UK/Europe", "Greater China", "South East Asia", "Canada"],
          },
          {
            paragraph:
              "Nobody is recorded against Japan. A market-scoped view here would have no one to route a Japanese enquiry to until that gap is closed.",
          }
        ),
      },
      {
        question: "What happens when an article's author is not in the CMS?",
        answer: buildRichText(
          {
            paragraph:
              "The article still publishes. The platform records the author's email address on it, for an editor to link by hand.",
          },
          {
            paragraph: "One of the twenty articles here is deliberately in that state.",
          }
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
    heading: "Written by the attorneys who work on it",
    columns: 3,
    items: recentPosts.map(buildInsightCardsGridItem),
    section: { theme: "light" },
  };

  const intro: ContentBlock = {
    blockType: "content",
    eyebrow: "Trade marks",
    heading: "Brand identity, registered and defended",
    layout: "text-image",
    image: illustrations["admin-person-record.png"] ?? defaultMediaId,
    content: buildRichText(
      {
        paragraph:
          "Trade mark work covers clearance, filing, portfolio management and enforcement. It runs in whichever of the nine markets a brand needs protecting.",
      },
      {
        paragraph:
          "Markets are a separate field from language, shown here on a person record. The articles below are the firm's own published commentary.",
      }
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
    heading: "Nine markets, and six languages of which three are written here",
    layout: "image-text",
    image: defaultMediaId,
    content: buildRichText(
      {
        paragraph: "The address structure below moves from continent to country to location.",
      },
      {
        paragraph:
          "Change a page's address at any level and every child address follows, in that language only.",
      }
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
      "Asia is the second segment of the address. One more level sits beneath it in this demo, Tokyo, reached through Japan."
    ),
    section: { theme: "light" },
  };
  return [intro];
}

function buildJapanPageBlocks(defaultMediaId: number) {
  const intro: ContentBlock = {
    blockType: "content",
    eyebrow: "Japan",
    heading: "One country, one address in each language",
    layout: "image-text",
    image: defaultMediaId,
    content: buildParagraphRichText(
      "Everything beneath this address sits in Japan, and each level carries its own address segment in each language."
    ),
    section: { theme: "light" },
  };
  return [intro];
}

function buildTokyoOfficePageBlocks(defaultMediaId: number, illustrations: Record<string, number>) {
  const intro: ContentBlock = {
    blockType: "content",
    eyebrow: "Client liaison",
    heading: "Tokyo",
    layout: "text-image",
    image: illustrations["admin-tokyo-ja.png"] ?? defaultMediaId,
    content: buildRichText(
      { paragraph: "One document with three addresses, not three pages." },
      {
        paragraph:
          "This is the deepest page in the address tree. In English you reach it through Global presence, Asia and Japan.",
      },
      {
        paragraph:
          "In French and Japanese those same three documents carry their own names, so only the address changes.",
      }
    ),
    section: { theme: "light" },
  };

  const details: StatsBlock = {
    blockType: "stats",
    layout: "accentLine",
    eyebrow: "This page",
    heading: "What sits at this address",
    items: [
      {
        value: "Client liaison",
        label: "Presence in Japan",
        description: "Japan is served through client liaison, not a local office.",
      },
      {
        value: "Japan",
        label: "Country",
        description: "The level above this one in the address.",
      },
      {
        value: "3",
        label: "Languages this page exists in",
        description: "English, French and Japanese, each with its own address.",
        link: buildStatLink("Open in Japanese", "/ja/世界展開/アジア/日本/東京"),
      },
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
 * The public headshots from marks-clerk.com, one per seeded person, named by personSlug so the
 * seed can attach each one without a lookup table. This one reads its directory rather than
 * literal paths, so next.config lists public/demo-people in outputFileTracingIncludes: without
 * that line the deployed function ships with an empty directory and every photo silently drops.
 */
function buildHeadshotMedia(): DemoMediaSpec[] {
  const headshotDirectory = path.join(process.cwd(), "public", "demo-people");
  return readdirSync(headshotDirectory)
    .filter((filename) => filename.endsWith(".webp"))
    .map((filename) => ({
      filename,
      alt: `Headshot of ${filename.replace(/\.webp$/, "").replaceAll("-", " ")}`,
      mimetype: "image/webp",
      data: readFileSync(path.join(headshotDirectory, filename)),
    }));
}

/**
 * Every entry reads its file with a literal, statically-analysable path (never a path built from
 * a loop variable) so Vercel's build-time file tracer can see and bundle each one - the same class
 * of bug d94dca92 fixed for the JSON fixtures, where a dynamic directory reference silently
 * dropped its contents from the deployed function.
 */
function buildDemoMedia(): DemoMediaSpec[] {
  return [
    ...buildHeadshotMedia(),
    {
      filename: "admin-insights-passle.png",
      alt: "The insight list in the CMS, showing articles that arrived from Passle with their authors and publish dates",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "demo-screens", "admin-insights-passle.png")
      ),
    },
    {
      filename: "admin-pages-ja.png",
      alt: "The page list in the CMS with the locale set to Japanese, showing Japanese titles and Japanese slugs",
      mimetype: "image/png",
      data: readFileSync(path.join(process.cwd(), "public", "demo-screens", "admin-pages-ja.png")),
    },
    {
      filename: "admin-pages-fr.png",
      alt: "The page list in the CMS with the locale set to French, showing French titles and French slugs",
      mimetype: "image/png",
      data: readFileSync(path.join(process.cwd(), "public", "demo-screens", "admin-pages-fr.png")),
    },
    {
      filename: "admin-tokyo-ja.png",
      alt: "The Tokyo page open in the CMS in Japanese, with the live preview showing its Japanese address",
      mimetype: "image/png",
      data: readFileSync(path.join(process.cwd(), "public", "demo-screens", "admin-tokyo-ja.png")),
    },
    {
      filename: "admin-pages-en.png",
      alt: "The page list in the CMS, each page with its own slug, above the locale switcher",
      mimetype: "image/png",
      data: readFileSync(path.join(process.cwd(), "public", "demo-screens", "admin-pages-en.png")),
    },
    {
      filename: "admin-person-record.png",
      alt: "A person in the CMS, with the markets they belong to set separately from any language",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "demo-screens", "admin-person-record.png")
      ),
    },
    {
      filename: "admin-review-queue.png",
      alt: "The translated Designs page open in the CMS, status Draft, with the Publish changes button unused and the review queue link in the sidebar",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "demo-screens", "admin-review-queue.png")
      ),
    },
    {
      filename: "demo-logo.svg",
      alt: "Marks & Clerk",
      mimetype: "image/svg+xml",
      data: readFileSync(path.join(process.cwd(), "public", "brand", "marks-and-clerk-logo.svg")),
    },
    {
      filename: "preset-hero.png",
      alt: "Preview of a section preset, captured from the live demo",
      mimetype: "image/png",
      data: readFileSync(path.join(process.cwd(), "public", "preset-previews", "preset-hero.png")),
    },
    {
      filename: "preset-stats.png",
      alt: "Preview of a section preset, captured from the live demo",
      mimetype: "image/png",
      data: readFileSync(path.join(process.cwd(), "public", "preset-previews", "preset-stats.png")),
    },
    {
      filename: "preset-content-image-left.png",
      alt: "Preview of a section preset, captured from the live demo",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "preset-previews", "preset-content-image-left.png")
      ),
    },
    {
      filename: "preset-content-image-right.png",
      alt: "Preview of a section preset, captured from the live demo",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "preset-previews", "preset-content-image-right.png")
      ),
    },
    {
      filename: "preset-icon-cards.png",
      alt: "Preview of a section preset, captured from the live demo",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "preset-previews", "preset-icon-cards.png")
      ),
    },
    {
      filename: "preset-team-cards.png",
      alt: "Preview of a section preset, captured from the live demo",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "preset-previews", "preset-team-cards.png")
      ),
    },
    {
      filename: "preset-text-cards.png",
      alt: "Preview of a section preset, captured from the live demo",
      mimetype: "image/png",
      data: readFileSync(
        path.join(process.cwd(), "public", "preset-previews", "preset-text-cards.png")
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
 * The Users collection has three roles - admin, author, user - and a markets field. The four
 * personas map onto them: the international and local editors are both "author", told apart by
 * markets (empty for the international editor, Canada for the local one, which scopes articles and
 * people to Canada and stops them creating or deleting pages), and the fee-earner - who only submits a profile-change request for
 * approval - gets "user". None of these is the shared admin@focusreactive.com login; each is a
 * dedicated demo identity with its own email. Passwords are never hardcoded: each is read from
 * its own env var at seed time, mirroring how SANDBOX_E_SEED_TOKEN already works here, so the
 * actual values never enter this public repo.
 */
interface DemoUserSpec {
  email: string;
  name: string;
  role: User["role"];
  markets?: NonNullable<User["markets"]>;
  /** The Person a fee-earner may edit, found by email so the link survives a reseed. */
  personEmail?: string;
  passwordEnvVar: string;
}

const FEE_EARNER_PERSON_EMAIL = "rmcnaughton@example.com";

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
    // Canada, because the seeded people and articles include Canadian ones, so the scope shows
    // both sides: Canadian articles open for editing, UK and Asian ones read only.
    markets: ["canada"],
    passwordEnvVar: "SANDBOX_E_LOCAL_EDITOR_PASSWORD",
  },
  {
    email: "fee.earner@example.com",
    name: "Fee-earner",
    role: "user",
    // Canadian, so the local editor (Canada) can approve the submission as well as the
    // international editor and the administrator.
    personEmail: FEE_EARNER_PERSON_EMAIL,
    passwordEnvVar: "SANDBOX_E_FEE_EARNER_PASSWORD",
  },
];

/**
 * Service and market context for the people listings. A directory on the Patents and Trade marks
 * pages lists the people tied to that service, and one on the Asia page lists the Greater China
 * and SE Asia people. The contextual standfirsts are written against those three listings, so
 * each one is visible at a known address, and the default standfirst shows everywhere else.
 */
const PEOPLE_DIRECTORY_CONTEXTS: Array<{
  pageKey: string;
  block: Omit<PeopleDirectoryBlock, "blockType" | "service">;
  serviceOfPage: boolean;
}> = [
  {
    pageKey: "patents",
    serviceOfPage: true,
    block: {
      eyebrow: "Patents people",
      heading: "The attorneys behind this practice",
      description:
        "Each profile tagged with the Patents service. Where someone has a standfirst written for patents, you read it here instead of their general one.",
      section: { theme: "light" },
    },
  },
  {
    pageKey: "trade-marks",
    serviceOfPage: true,
    block: {
      eyebrow: "Trade marks people",
      heading: "The attorneys behind this practice",
      description:
        "Each profile tagged with the Trade marks service, with the standfirst written for trade marks where there is one.",
      section: { theme: "light" },
    },
  },
  {
    pageKey: "asia",
    serviceOfPage: false,
    block: {
      eyebrow: "Our people in Asia",
      heading: "Greater China and South-East Asia",
      description:
        "Filtered by market, not by service. A standfirst written for a market shows here in place of the general one.",
      markets: ["greater-china", "se-asia"],
      section: { theme: "light" },
    },
  },
];

const PEOPLE_CONTEXT: Array<{
  email: string;
  standfirst: string;
  services: Array<"patents" | "trade-marks">;
  contextual: Array<{
    service?: "patents" | "trade-marks";
    market?: "greater-china";
    text: string;
  }>;
}> = [
  {
    email: "zsu@example.com",
    standfirst: "Partner in Hong Kong, advising on patent and trade mark matters.",
    services: ["patents", "trade-marks"],
    contextual: [
      {
        market: "greater-china",
        text: "Partner in Hong Kong, the first point of contact for clients filing across Greater China.",
      },
    ],
  },
  {
    email: "xhuang@example.com",
    standfirst: "Partner in Hong Kong.",
    services: ["trade-marks"],
    contextual: [
      {
        service: "trade-marks",
        text: "Heads the trade mark team in Hong Kong and is its legal representative.",
      },
    ],
  },
  {
    email: "clovrics@example.com",
    standfirst: "Partner in Toronto.",
    services: ["trade-marks"],
    contextual: [
      {
        service: "trade-marks",
        text: "Heads trade marks and copyright for Canada, from the Toronto office.",
      },
    ],
  },
  {
    email: FEE_EARNER_PERSON_EMAIL,
    standfirst: "Associate in the Toronto office.",
    services: ["patents"],
    contextual: [],
  },
  {
    email: "jgregoire@example.com",
    standfirst: "Partner in the Toronto office.",
    services: ["patents"],
    contextual: [],
  },
  {
    email: "mshaw@example.com",
    standfirst: "Partner in the London office.",
    services: ["patents"],
    contextual: [],
  },
];

async function seedPeopleInContext(
  payload: Awaited<ReturnType<typeof getPayloadClient>>,
  pageIdByKey: Record<string, number>
) {
  for (const context of PEOPLE_DIRECTORY_CONTEXTS) {
    const pageId = pageIdByKey[context.pageKey];
    if (!pageId) continue;
    const page = await payload.findByID({
      collection: "page",
      id: pageId,
      locale: "en",
      depth: 0,
      overrideAccess: true,
    });
    await payload.update({
      collection: "page",
      id: pageId,
      locale: "en",
      overrideAccess: true,
      context: { skipEmbedding: true },
      data: {
        _status: "published",
        blocks: [
          ...(page.blocks ?? []),
          {
            blockType: "peopleDirectory",
            ...context.block,
            ...(context.serviceOfPage ? { service: pageId } : {}),
          },
        ],
      },
    });
  }

  for (const entry of PEOPLE_CONTEXT) {
    const found = await payload.find({
      collection: "person",
      where: { email: { equals: entry.email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const person = found.docs[0];
    if (!person) continue;
    await payload.update({
      collection: "person",
      id: person.id,
      locale: "en",
      overrideAccess: true,
      context: { skipEmbedding: true },
      data: {
        _status: "published",
        standfirst: entry.standfirst,
        services: entry.services.flatMap((key) => (pageIdByKey[key] ? [pageIdByKey[key]] : [])),
        contextualStandfirsts: entry.contextual.map((contextual) => ({
          service: contextual.service ? pageIdByKey[contextual.service] : null,
          market: contextual.market ?? null,
          text: contextual.text,
        })),
      },
    });
  }

  // The fee-earner's own edit, waiting for approval, so the editors' queue has something in it on
  // first sign-in. A draft on top of the published profile: the site keeps showing the published
  // biography until an editor publishes this one.
  const feeEarnerPerson = (
    await payload.find({
      collection: "person",
      where: { email: { equals: FEE_EARNER_PERSON_EMAIL } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
  ).docs[0];
  if (feeEarnerPerson) {
    await payload.update({
      collection: "person",
      id: feeEarnerPerson.id,
      locale: "en",
      draft: true,
      overrideAccess: true,
      context: { skipEmbedding: true },
      data: {
        _status: "draft",
        reviewStatus: "submitted",
        jobTitle: "Associate, Patent Agent",
        standfirst:
          "Associate in the Toronto office, working on patent prosecution in Canada and the US.",
        biography:
          "Robert works on patent prosecution for Canadian and international applicants, with a focus on mechanical and software inventions. This is the fee-earner's own edit, submitted for review: it stays off the site until an editor publishes it.",
      },
    });
  }
}

/**
 * TestimonialsList's `testimonials` field requires at least one row, so the preset needs a real
 * testimonial document to point at. Author and company are invented for this demo and match no
 * real person or organisation.
 */
function buildDemoTestimonial(avatarMediaId: number) {
  return {
    author: "Placeholder",
    company: "Placeholder",
    position: "Placeholder",
    rating: 5,
    avatar: avatarMediaId,
    content:
      "Preset placeholder text. In the delivered platform this slot carries a directory ranking or a client reference.",
  };
}

interface DemoPresetSpec {
  name: string;
  previewFilename: string;
  block: NonNullable<Page["blocks"]>[number];
}

/**
 * One preset per section design the demo actually renders, each taken from the same builder the
 * page uses, so a preset can never drift from the section it previews. Blocks still on the fork
 * base's design (FAQ, carousel, logos, chart, CTA band, newsletter, testimonials, raw HTML) get no
 * preset: offering one would put the old look straight back onto a page.
 */
function buildDemoPresets(
  defaultMediaId: number,
  illustrations: Record<string, number>
): DemoPresetSpec[] {
  const home = buildHomepageBlocks(defaultMediaId, illustrations);
  const pickHomeBlock = (blockType: string, headingIncludes?: string) => {
    const block = home.find(
      (candidate) =>
        candidate.blockType === blockType &&
        (headingIncludes === undefined ||
          ("heading" in candidate && String(candidate.heading ?? "").includes(headingIncludes)))
    );
    if (!block) throw new Error(`Preset source missing: ${blockType} ${headingIncludes ?? ""}`);
    return block as NonNullable<Page["blocks"]>[number];
  };
  const firstCardsGrid = (blocks: { blockType: string }[]) => {
    const block = blocks.find((candidate) => candidate.blockType === "cardsGrid") as
      | CardsGridBlock
      | undefined;
    if (!block) throw new Error("Preset source missing: cardsGrid");
    return block;
  };

  return [
    {
      name: "Hero - centred, screenshot below",
      previewFilename: "preset-hero.png",
      block: pickHomeBlock("hero"),
    },
    {
      name: "Stats - row of figures",
      previewFilename: "preset-stats.png",
      block: pickHomeBlock("stats"),
    },
    {
      name: "Content - screenshot left, bullets",
      previewFilename: "preset-content-image-left.png",
      block: pickHomeBlock("content", "Passle"),
    },
    {
      name: "Content - screenshot right, bullets",
      previewFilename: "preset-content-image-right.png",
      block: pickHomeBlock("content", "Japanese pages"),
    },
    {
      name: "Cards - icon cards with links",
      previewFilename: "preset-icon-cards.png",
      block: firstCardsGrid(buildServicesOverviewPageBlocks(illustrations)),
    },
    {
      name: "Cards - people directory",
      previewFilename: "preset-team-cards.png",
      block: buildOurPeoplePageBlocks(illustrations, defaultMediaId)[1] as PeopleDirectoryBlock,
    },
    {
      name: "Insights - newest articles",
      previewFilename: "preset-text-cards.png",
      block: {
        ...(buildInsightsPageBlocks(illustrations, defaultMediaId)[1] as InsightsListBlock),
        limit: 6,
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

/**
 * The footer's two link columns were previously labelled with their own first link, so the
 * column read "Services / Services / Global presence". A column label has to name the group,
 * not repeat a member of it.
 */
const FOOTER_GROUP_LABELS_BY_LOCALE: Record<LocaleCode, { practice: string; firm: string }> = {
  en: { practice: "What we do", firm: "Who we are" },
  fr: { practice: "Notre expertise", firm: "Le cabinet" },
  ja: { practice: "サービス内容", firm: "事務所について" },
};

const FOOTER_TEXT_BY_LOCALE: Record<LocaleCode, { description: string; copyright: string }> = {
  en: {
    description:
      "A working content platform: six languages, nine markets, and every article seeded from real fixtures, not a live tenancy.",
    copyright: "Marks & Clerk - content platform demo, built by FocusReactive",
  },
  fr: {
    description:
      "Une plateforme de contenu réellement en service : six langues, neuf marchés, et des articles repris de publications réelles, pas un flux en direct.",
    copyright: "Marks & Clerk - content platform demo, built by FocusReactive",
  },
  ja: {
    description:
      "実際に稼働しているコンテンツ基盤。6言語、9市場、記事は実際の公開記事をもとに投入したもので、ライブ連携ではありません。",
    copyright: "Marks & Clerk - content platform demo, built by FocusReactive",
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
        context: { skipEmbedding: true, [SKIP_REDIRECT_ON_SLUG_CHANGE]: true },
        data: {
          name: "Marks & Clerk",
          ...(logoMediaId ? { logo: logoMediaId } : {}),
          navItems: navigation.map((item) => ({
            label: item.label,
            type: "link" as const,
            link: { type: "custom" as const, url: item.url },
          })),
          // The whole point of the demo is the CMS behind the page, so there is a way into it
          // from every page rather than only from the homepage hero.
          actions: [
            {
              appearance: "accent" as const,
              label: "CMS",
              newTab: true,
              type: "custom" as const,
              url: "/admin",
            },
          ],
        },
      });
    }

    if (footer) {
      await payload.update({
        collection: "footer",
        id: footer.id,
        locale,
        overrideAccess: true,
        context: { skipEmbedding: true, [SKIP_REDIRECT_ON_SLUG_CHANGE]: true },
        data: {
          name: "Marks & Clerk",
          ...(logoMediaId ? { logo: logoMediaId } : {}),
          description: footerText.description,
          copyrightText: footerText.copyright,
          linkGroups: [
            {
              label: FOOTER_GROUP_LABELS_BY_LOCALE[locale].practice,
              links: navigation.slice(2).map((item) => ({
                link: {
                  type: "custom" as const,
                  url: item.url,
                  label: item.label,
                },
              })),
            },
            {
              label: FOOTER_GROUP_LABELS_BY_LOCALE[locale].firm,
              links: navigation.slice(0, 2).map((item) => ({
                link: {
                  type: "custom" as const,
                  url: item.url,
                  label: item.label,
                },
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
          await payload.delete({
            collection: "media",
            id: existingDoc.id,
            overrideAccess: true,
          });

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
      "admin-pages-en.png": mediaIdByFilename["admin-pages-en.png"],
      "admin-person-record.png": mediaIdByFilename["admin-person-record.png"],
      "admin-review-queue.png": mediaIdByFilename["admin-review-queue.png"],
      "admin-insights-passle.png": mediaIdByFilename["admin-insights-passle.png"],
      "admin-pages-ja.png": mediaIdByFilename["admin-pages-ja.png"],
      "admin-pages-fr.png": mediaIdByFilename["admin-pages-fr.png"],
      "admin-tokyo-ja.png": mediaIdByFilename["admin-tokyo-ja.png"],
    };

    const platformDefaultMediaId = mediaIdByFilename["admin-pages-en.png"];
    if (platformDefaultMediaId) {
      await payload.update({
        collection: "media",
        id: platformDefaultMediaId,
        overrideAccess: true,
        data: { defaultFor: [PLATFORM_DEFAULT_MEDIA_SLOT] },
      });
    }

    let defaultMediaId: string | number | null = mediaIdByFilename["admin-pages-en.png"] ?? null;
    if (!defaultMediaId) {
      defaultMediaId = await getDefaultMediaId(PLATFORM_DEFAULT_MEDIA_SLOT);
    }

    // getDefaultMediaId reads through unstable_cache, so on a branch database it can hand back an
    // id from whatever content lived here before. A relationship to a missing row fails validation
    // with "Image invalid" and never names the id, so confirm the row exists before trusting it.
    if (defaultMediaId) {
      const existing = await payload
        .findByID({
          collection: "media",
          id: defaultMediaId,
          depth: 0,
          overrideAccess: true,
        })
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
    for (const person of (
      await payload.find({ collection: "person", limit: 200, depth: 0, overrideAccess: true })
    ).docs) {
      const photoId = mediaIdByFilename[`${personSlug(person)}.webp`];
      if (photoId && person.photo !== photoId) {
        await payload.update({
          collection: "person",
          id: person.id,
          // Person has drafts now: without a status the photo could land on a draft only.
          data: { photo: photoId, _status: "published" },
          overrideAccess: true,
        });
      }
    }
    await seedInsightsFromFixtures(payload);
    insightSlugByShortcode.clear();
    for (const insight of (
      await payload.find({
        collection: "insight",
        locale: "en",
        limit: 500,
        depth: 0,
        overrideAccess: true,
      })
    ).docs) {
      if (insight.slug) insightSlugByShortcode.set(insight.passleShortcode, insight.slug);
    }

    const deletedPages = await payload.delete({
      collection: "page",
      where: { id: { not_equals: 0 } },
      overrideAccess: true,
      context: { skipEmbedding: true, [SKIP_REDIRECT_ON_SLUG_CHANGE]: true },
    });
    const deletedPosts = await payload.delete({
      collection: "posts",
      where: { id: { not_equals: 0 } },
      overrideAccess: true,
      context: { skipEmbedding: true, [SKIP_REDIRECT_ON_SLUG_CHANGE]: true },
    });

    const pageIdByKey: Record<string, number> = {};

    for (const spec of PAGE_TREE) {
      const parentId = spec.parentKey ? pageIdByKey[spec.parentKey] : undefined;
      const rawBlocks = (() => {
        switch (spec.key) {
          case "home":
            return buildHomepageBlocks(defaultMediaNumericId, illustrationIds);
          case "insights":
            return buildInsightsPageBlocks(illustrationIds, defaultMediaNumericId);
          case "our-people":
            return buildOurPeoplePageBlocks(illustrationIds, defaultMediaNumericId);
          case "services":
            return buildServicesOverviewPageBlocks(illustrationIds);
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
            return buildTokyoOfficePageBlocks(defaultMediaNumericId, illustrationIds);
          default:
            return buildStructuralBlocks(spec.en.title, defaultMediaNumericId);
        }
      })();

      const blocks = withAlternatingSurfaces(rawBlocks as NonNullable<Page["blocks"]>);

      const created = await payload.create({
        collection: "page",
        locale: "en",
        draft: false,
        overrideAccess: true,
        context: { skipEmbedding: true, [SKIP_REDIRECT_ON_SLUG_CHANGE]: true },
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
        const localizedHome =
          locale === "en" || spec.key !== "home" ? undefined : LOCALIZED_HOMEPAGE[locale];
        const CARRIED_LISTING_KEYS = ["insights", "our-people", "patents", "trade-marks"] as const;
        type CarriedListingKey = (typeof CARRIED_LISTING_KEYS)[number];
        const localizedListingHeader =
          locale === "en" || !CARRIED_LISTING_KEYS.includes(spec.key as CarriedListingKey)
            ? undefined
            : LOCALIZED_LISTING_HEADER[locale][spec.key as CarriedListingKey];

        await payload.update({
          collection: "page",
          id: created.id,
          locale,
          draft: false,
          overrideAccess: true,
          context: { skipEmbedding: true, [SKIP_REDIRECT_ON_SLUG_CHANGE]: true },
          data: {
            _status: "published",
            title: text.title,
            slug: text.slug,
            generateSlug: false,
            // Written rather than generated, and per locale, because the generator produced the
            // same four openings across every page.
            meta: localizedHome
              ? {
                  title: localizedHome.heroTitle,
                  description: localizedHome.heroBody,
                }
              : localizedBody
                ? {
                    title: localizedBody.heading,
                    description: localizedBody.body,
                  }
                : {
                    title: PAGE_META_EN[spec.key]?.title ?? text.title,
                    description: PAGE_META_EN[spec.key]?.description ?? "",
                  },
            // blocks is localized and required, so a locale left unwritten renders the starter
            // kit's own demo blocks instead of this demo's content.
            ...(localizedBody
              ? {
                  blocks: [
                    ...(localizedHome
                      ? [
                          {
                            blockType: "hero" as const,
                            variant: "centered" as const,
                            image: {
                              image: (illustrationIds["admin-pages-en.png"] ??
                                defaultMediaId) as number,
                              aspectRatio: "16/9" as const,
                            },
                            eyebrow: localizedHome.heroEyebrow,
                            title: localizedHome.heroTitle,
                            richText: buildParagraphRichText(localizedHome.heroBody),
                            actions: [
                              buildAction(localizedHome.primaryAction, "/admin", "accent"),
                              buildAction(
                                localizedHome.secondaryAction,
                                // The one article translated into both languages, at its own
                                // localised address.
                                locale === "fr"
                                  ? "/fr/actualites/enseignements-ai-institute-uc-berkeley-law"
                                  : "/ja/インサイト/ucバークレー-ai-institute-からの学び",
                                "outline"
                              ),
                            ],
                            section: { theme: "light" as const },
                          },
                          {
                            blockType: "stats" as const,
                            layout: "accentLine" as const,
                            ...localizedHome.statsHeader,
                            items: localizedHome.stats,
                            section: { theme: "light" as const },
                          },
                        ]
                      : []),
                    {
                      blockType: "content" as const,
                      eyebrow: localizedBody.eyebrow,
                      heading: localizedBody.heading,
                      layout: "text-image" as const,
                      // A page arguing that its address is localized, next to a screenshot of the
                      // English admin, argues against itself: each locale gets its own capture.
                      image: (spec.key === "tokyo-office"
                        ? (illustrationIds["admin-tokyo-ja.png"] ?? defaultMediaId)
                        : locale === "ja"
                          ? (illustrationIds["admin-pages-ja.png"] ?? defaultMediaId)
                          : (illustrationIds["admin-pages-fr.png"] ?? defaultMediaId)) as number,
                      content: buildParagraphRichText(localizedBody.body),
                      section: { theme: "light" as const },
                    },
                    // The French and Japanese bodies count twenty articles and twenty-one people.
                    // Without these the reader is told a number and shown nothing, so the two
                    // data-driven listings are carried over. Neither card carries a link, so
                    // nothing here can send a French reader to an English address.
                    // The listing grid only, never what follows it. The patents page carries an
                    // FAQ after its grid: spreading the header across both gave the FAQ the
                    // grid's heading, and carrying it at all would put English question and
                    // answer text on a French page.
                    ...(localizedListingHeader
                      ? blocks.slice(1, 2).map(
                          (block) =>
                            ({
                              ...block,
                              ...localizedListingHeader,
                              // No fallback: a French or Japanese reader sees only the articles that
                              // exist in their language, never the English titles under a local heading.
                              // The people directory needs no override: it builds each profile
                              // link in the page's own language from the Person records.
                              // The insights list filters to this language itself.
                              ...(spec.key === "insights" && (locale === "fr" || locale === "ja")
                                ? { description: TRANSLATED_INSIGHTS_NOTE[locale] }
                                : {}),
                            }) as typeof block
                        )
                      : []),
                  ],
                }
              : {}),
          },
        });
      }
    }

    await seedPeopleInContext(payload, pageIdByKey);

    // The review queue is the destination for the fourth claim, and an empty queue proves nothing.
    // This page is created as a draft and never published, which is what a machine translation
    // waiting for a human actually looks like: it exists, it is addressable, and it is not live.
    const seedWarnings: string[] = [];
    const draftServiceParentId = pageIdByKey["services"];
    try {
      if (draftServiceParentId) {
        const draftPage = await payload.create({
          collection: "page",
          locale: "en",
          draft: true,
          overrideAccess: true,
          context: { skipEmbedding: true, [SKIP_REDIRECT_ON_SLUG_CHANGE]: true },
          data: {
            _status: "draft",
            title: "Designs",
            // Same as the tree above: the core slug hook re-slugifies on create whatever this says,
            // and passing generateSlug here fails validation on a draft, so the real slugs are set
            // by the per-locale updates below.
            slug: "designs",
            parent: draftServiceParentId,
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

        // Blocks are localized, so a locale left unwritten falls back to the starter kit's own
        // demo blocks - which is another vendor's marketing copy appearing inside the review
        // queue, on the page the walkthrough opens to prove the queue works.
        for (const [locale, text] of [
          [
            "fr",
            {
              title: "Dessins et modèles",
              slug: "dessins-et-modeles",
              eyebrow: "En attente de relecture",
              heading: "Dessins et modèles",
              body: "Troisième page de service, traduite par la plateforme et retenue ici jusqu’à ce qu’un relecteur la valide. Elle possède déjà son URL, elle n’est pas publiée, et aucun lien du site public n’y mène.",
            },
          ],
          [
            "ja",
            {
              title: "意匠",
              slug: "意匠",
              eyebrow: "レビュー待ち",
              heading: "意匠",
              body: "3つ目のサービスページです。プラットフォームが翻訳し、担当者が承認するまでここで保留されています。URLはすでに割り当てられていますが、公開はされておらず、公開サイトからのリンクもありません。",
            },
          ],
        ] as const) {
          await payload.update({
            collection: "page",
            id: draftPage.id,
            locale,
            draft: true,
            overrideAccess: true,
            context: { skipEmbedding: true, [SKIP_REDIRECT_ON_SLUG_CHANGE]: true },
            data: {
              _status: "draft",
              title: text.title,
              slug: text.slug,
              generateSlug: false,
              blocks: [
                {
                  blockType: "content" as const,
                  eyebrow: text.eyebrow,
                  heading: text.heading,
                  layout: "text-image" as const,
                  image: defaultMediaId as number,
                  content: buildParagraphRichText(text.body),
                  section: { theme: "light" as const },
                },
              ],
            },
          });
        }
      }
    } catch (error) {
      seedWarnings.push(
        `Review queue draft not created: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const SITE_SEO_BY_LOCALE: Record<
      LocaleCode,
      {
        description: string;
        notFoundTitle: string;
        notFoundDescription: string;
      }
    > = {
      en: {
        description:
          "A working content platform: fifteen offices, six languages, nine markets, one content model.",
        notFoundTitle: "That address does not exist",
        notFoundDescription:
          "Every page here lives at its own address in each language. This one does not, in any of them.",
      },
      fr: {
        description:
          "Une plateforme de contenu réellement en service : quinze bureaux, six langues, neuf marchés, un seul modèle de contenu.",
        notFoundTitle: "Cette page n’existe pas",
        notFoundDescription:
          "Chaque page possède sa propre URL dans chaque langue. Celle que vous avez saisie n’existe dans aucune d’elles.",
      },
      ja: {
        description:
          "実際に稼働しているコンテンツ基盤。15拠点、6言語、9市場、ひとつのコンテンツモデル。",
        notFoundTitle: "お探しのページは見つかりませんでした",
        notFoundDescription:
          "各ページは言語ごとに固有のURLを持ちます。このURLはどの言語にも存在しません。",
      },
    };

    // A firm's name does not translate, and the header now carries their own wordmark, so the
    // browser tab has to agree with it rather than saying "Content Platform Demo".
    const siteSettingsTextByLocale: Record<LocaleCode, string> = {
      en: "Marks & Clerk",
      fr: "Marks & Clerk",
      ja: "Marks & Clerk",
    };

    for (const locale of ["en", "fr", "ja"] as LocaleCode[]) {
      await payload.updateGlobal({
        slug: "site-settings",
        locale,
        draft: false,
        overrideAccess: true,
        data: {
          general: { siteName: siteSettingsTextByLocale[locale] },
          // The admin sidebar logo reads from here; with nothing set it falls back to the
          // starter kit's /logo.svg.
          adminPanel: { logo: mediaIdByFilename["demo-logo.svg"] },
          // Every locale, not just English: the title suffix falls back to the site name, and
          // leaving fr and ja unwritten put "| My Site" in the browser tab of every non-English
          // page, which is the starter kit's factory default.
          seo: {
            // Written explicitly rather than left to fall back to siteName: the field carries its
            // own localized defaultValue ("My Site"), which wins over the fallback and put the
            // starter kit's name in every French and Japanese browser tab.
            titleSuffix: siteSettingsTextByLocale[locale],
            defaultDescription: SITE_SEO_BY_LOCALE[locale].description,
            og: {
              title: siteSettingsTextByLocale[locale],
              siteName: siteSettingsTextByLocale[locale],
              description: SITE_SEO_BY_LOCALE[locale].description,
            },
          },
          // The 404 copy is stored on this document, so a change to the field's default value
          // never reaches a database that already has one. It has to be written here.
          notFound: {
            title: SITE_SEO_BY_LOCALE[locale].notFoundTitle,
            description: SITE_SEO_BY_LOCALE[locale].notFoundDescription,
          },
          ...(locale === "en"
            ? {
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
      const linkedPerson = persona.personEmail
        ? (
            await payload.find({
              collection: "person",
              where: { email: { equals: persona.personEmail } },
              limit: 1,
              depth: 0,
              overrideAccess: true,
            })
          ).docs[0]
        : undefined;
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
          data: {
            name: persona.name,
            role: persona.role,
            markets: persona.markets ?? [],
            person: linkedPerson?.id ?? null,
            password,
          },
        });
        usersUpdatedCount += 1;
        continue;
      }

      await payload.create({
        collection: "users",
        overrideAccess: true,
        data: {
          name: persona.name,
          email: persona.email,
          role: persona.role,
          markets: persona.markets ?? [],
          person: linkedPerson?.id ?? null,
          password,
        },
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
          data: {
            name: "Screenshot",
            role: "admin",
            password: screenshotPassword,
          },
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

    const demoPresets = buildDemoPresets(defaultMediaNumericId, illustrationIds);
    for (const spec of demoPresets) {
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

    // The branch database inherits the fork base's presets ("Dark", "Light Gray", ...) with its
    // vendor preview images, and earlier runs of this seed left presets for sections that no
    // longer exist. Anything not defined above goes, or the drawer offers the old designs.
    const demoPresetNames = new Set(demoPresets.map((spec) => spec.name));
    const allPresets = await payload.find({
      collection: "presets",
      limit: 500,
      depth: 0,
      locale: "en",
      overrideAccess: true,
    });
    let presetsDeletedCount = 0;
    for (const preset of allPresets.docs) {
      if (demoPresetNames.has(preset.name)) continue;
      await payload.delete({ collection: "presets", id: preset.id, overrideAccess: true });
      presetsDeletedCount += 1;
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
        await payload.delete({
          collection: "media",
          id: doc.id,
          overrideAccess: true,
        });
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
    // One insight carries real French and Japanese versions so the language switcher has a
    // translated article to land on; every other insight stays English-only on purpose.
    try {
      const [translatableInsight] = (
        await payload.find({
          collection: "insight",
          where: { passleShortcode: { equals: translatedInsight102o1qk.passleShortcode } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
      ).docs;
      if (!translatableInsight) {
        seedWarnings.push(
          `Insight ${translatedInsight102o1qk.passleShortcode} not found, so no translated insight`
        );
      } else {
        for (const [locale, translation] of Object.entries(translatedInsight102o1qk.locales)) {
          await payload.update({
            collection: "insight",
            id: translatableInsight.id,
            locale: locale as "fr" | "ja",
            overrideAccess: true,
            context: { [SKIP_REDIRECT_ON_SLUG_CHANGE]: true },
            data: {
              title: translation.title,
              slug: translation.slug,
              // Without this the slug hook re-slugifies to ASCII and the Japanese address collapses.
              generateSlug: false,
              standfirst: translation.standfirst,
              body: buildRichText(...translation.paragraphs.map((paragraph) => ({ paragraph }))),
            },
          });
        }
      }
    } catch (error) {
      seedWarnings.push(
        `Translated insight failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    revalidatePath("/", "layout");

    // Every page, post and insight above was created with skipEmbedding so this one request
    // doesn't also make dozens of sequential OpenAI calls; this is what actually makes search
    // work again after a reseed, and it is currently the only reindex path in this codebase.
    let searchIndexed: Awaited<ReturnType<typeof reindexAllEmbeddings>> | null = null;
    try {
      searchIndexed = await reindexAllEmbeddings(payload);
    } catch (error) {
      seedWarnings.push(
        `Search reindex failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return NextResponse.json({
      deleted: {
        page: deletedPages.docs.length,
        posts: deletedPosts.docs.length,
        media: mediaDeletedCount,
        presets: presetsDeletedCount,
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
      searchIndexed,
      warnings: [...userWarnings, ...seedWarnings],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Demo seed failed.";
    payload.logger.error(error, "Demo seed failed");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
