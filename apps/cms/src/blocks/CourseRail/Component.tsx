import type { PreparedMedia } from "@/components/media";
import { SectionContainer } from "@/components/shared";
import { getPayloadClient, getTalks } from "@/dal";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import { excerptAtWord } from "@/lib/talks/display";
import { kindLabel, tierLabel } from "@/lib/talks/taxonomy";
import type { Locale } from "@/lib/types";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { CourseRailBlock, Media, Topic } from "@/payload-types";

import { CourseRail } from "./ui";
import type {
  CourseRailCourse,
  CourseRailFilterTopic,
  CourseRailStaticTopic,
  CourseRailTopics,
} from "./ui/types";

/**
 * `source`, `allTeachingsLabel` and `limit` are new fields this pass added; `payload-types.ts` has
 * not been regenerated to know about them (`payload generate:types` is off-limits here - see the
 * task brief), so they are declared here until that regeneration lands centrally.
 */
interface CourseRailBlockWithSource extends CourseRailBlock {
  source?: "typed" | "talks" | null;
  allTeachingsLabel?: string | null;
  limit?: number | null;
}

/**
 * The concept's own course covers, cycled by row position so the section renders as designed
 * against an empty media library. They are public files rather than uploaded documents, so an
 * editor's own picture always wins - but nothing here will ever replace one of these with an
 * upload, because no upload happens.
 */
const FALLBACK_COVERS = [
  "/design/course-01.webp",
  "/design/course-02.webp",
  "/design/course-03.webp",
  "/design/course-04.webp",
  "/design/course-05.webp",
  "/design/course-06.webp",
];

function buildCover(
  image: { image?: Media | number | null } | null | undefined,
  title: string,
  index: number
): PreparedMedia {
  const prepared = prepareMediaProps(image ?? null);

  if (prepared.data.kind === "image" && prepared.data.src) {
    return { ...prepared, data: { ...prepared.data, alt: prepared.data.alt || title } };
  }

  return {
    data: { alt: title, kind: "image", src: FALLBACK_COVERS[index % FALLBACK_COVERS.length] },
  };
}

/**
 * `getTalks`'s `LISTING_SELECT` returns `coverImage`, `kind`, `teaser` and `publishedAt`, but the
 * generated `Talk` interface hasn't caught up with the collection (same regeneration gap as
 * `CourseRailBlockWithSource` above) - so this stands in for it rather than importing `Talk`.
 */
interface TalkForCourseRail {
  id: number;
  slug: string;
  title: string;
  kind?: unknown;
  requiredTier?: string | null;
  teaser?: string | null;
  publishedAt?: string | null;
  topics?: (number | Topic)[] | null;
  coverImage?: { image?: Media | number | null } | null;
}

/**
 * Built by hand rather than through the `prepareMediaProps` adapter: that adapter is off-limits
 * inside `ui/` (Payload-agnostic there), and building the talk cover the same way here - rather
 * than reaching for the adapter just because this file is allowed to - keeps one cover-building
 * shape for both blocks that read a Talk's `coverImage` (this one and TalkGrid's), instead of two
 * that quietly drift.
 */
function buildTalkCover(talk: TalkForCourseRail, index: number): PreparedMedia {
  const image = talk.coverImage?.image;
  if (image && typeof image === "object" && image.url) {
    return {
      data: {
        alt: image.alt || talk.title,
        height: image.height ?? undefined,
        kind: "image",
        src: image.url,
        width: image.width ?? undefined,
      },
    };
  }

  return {
    data: { alt: talk.title, kind: "image", src: FALLBACK_COVERS[index % FALLBACK_COVERS.length] },
  };
}

/** Long enough for a real sentence, short enough that the row stays even - same budget TalkGrid's own card uses. */
const CARD_EXCERPT_CHARS = 160;

function formatPublishedDate(publishedAt: string | null | undefined): string | undefined {
  if (!publishedAt) return undefined;
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  });
}

function buildTypedRail(
  block: CourseRailBlockWithSource,
  locale: Locale
): { topics: CourseRailTopics; courses: CourseRailCourse[] } {
  const staticTopics: CourseRailStaticTopic[] = (block.topics ?? []).map((topic) => ({
    href: prepareLinkProps(topic.link, locale).href || undefined,
    isSelected: Boolean(topic.isSelected),
    label: topic.label,
  }));

  const courses: CourseRailCourse[] = (block.courses ?? []).map((course, index) => ({
    cover: buildCover(course.image, course.title, index),
    dateLabel: course.dateLabel ?? undefined,
    description: course.description ?? undefined,
    href: prepareLinkProps(course.link, locale).href || undefined,
    price: course.price ?? undefined,
    priceBefore: course.priceBefore ?? undefined,
    rating: course.rating ?? undefined,
    title: course.title,
  }));

  return { courses, topics: { mode: "static", topics: staticTopics } };
}

/**
 * Fetches the talks, then derives the chip list from the topics actually present on THAT fetched
 * set rather than from the Topic collection - a chip offering a topic none of these talks carry
 * would filter to an empty rail. `getTalks` is called with no `topicSlug`, so every talk in the
 * result is what the "All teachings" sentinel shows and what every derived chip filters in memory,
 * client-side, out of.
 */
async function buildTalkRail(
  limit: number,
  allTeachingsLabel: string
): Promise<{ topics: CourseRailTopics; courses: CourseRailCourse[] }> {
  const payload = await getPayloadClient();
  const { docs } = await getTalks(payload, { limit });
  const talks = docs as unknown as TalkForCourseRail[];

  const seenTopicSlugs = new Set<string>();
  const filterTopics: CourseRailFilterTopic[] = [{ label: allTeachingsLabel, topicSlug: null }];

  for (const talk of talks) {
    for (const topic of talk.topics ?? []) {
      if (typeof topic !== "object" || seenTopicSlugs.has(topic.slug)) continue;
      seenTopicSlugs.add(topic.slug);
      filterTopics.push({ label: topic.title, topicSlug: topic.slug });
    }
  }

  const courses: CourseRailCourse[] = talks.map((talk, index) => ({
    cover: buildTalkCover(talk, index),
    dateLabel: formatPublishedDate(talk.publishedAt),
    description: excerptAtWord(talk.teaser, CARD_EXCERPT_CHARS) ?? undefined,
    // The slot a star rating would take - a talk is never rated, so this is always free for it.
    eyebrow: kindLabel(talk.kind) ?? undefined,
    href: `/talks/${talk.slug}`,
    price: tierLabel(talk.requiredTier),
    title: talk.title,
    topicSlugs: (talk.topics ?? [])
      .filter((topic): topic is Topic => typeof topic === "object")
      .map((topic) => topic.slug),
  }));

  return { courses, topics: { mode: "filter", topics: filterTopics } };
}

export async function CourseRailBlockComponent(props: CourseRailBlockWithSource) {
  const {
    allTeachingsLabel,
    allTopicsLabel,
    allTopicsLink,
    eyebrow,
    heading,
    id,
    limit,
    section,
    source,
    viewAllLabel,
    viewAllLink,
  } = props;

  const locale = await resolveLocale();

  const { courses, topics } =
    source === "talks"
      ? await buildTalkRail(limit ?? 6, allTeachingsLabel ?? "All teachings")
      : buildTypedRail(props, locale);

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <CourseRail
        allTopicsHref={prepareLinkProps(allTopicsLink, locale).href || undefined}
        allTopicsLabel={allTopicsLabel ?? undefined}
        courses={courses}
        eyebrow={eyebrow ?? undefined}
        heading={heading}
        topics={topics}
        viewAllHref={prepareLinkProps(viewAllLink, locale).href || undefined}
        viewAllLabel={viewAllLabel ?? undefined}
      />
    </SectionContainer>
  );
}
