import type { PreparedMedia } from "@/components/media";
import { SectionContainer } from "@/components/shared";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { CourseRailBlock, Media } from "@/payload-types";

import { CourseRail } from "./ui";
import type { CourseRailCourse, CourseRailTopic } from "./ui/types";

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

export async function CourseRailBlockComponent({
  allTopicsLabel,
  allTopicsLink,
  courses,
  eyebrow,
  heading,
  id,
  section,
  topics,
  viewAllLabel,
  viewAllLink,
}: CourseRailBlock) {
  const locale = await resolveLocale();

  const railTopics: CourseRailTopic[] = (topics ?? []).map((topic) => ({
    href: prepareLinkProps(topic.link, locale).href || undefined,
    isSelected: Boolean(topic.isSelected),
    label: topic.label,
  }));

  const railCourses: CourseRailCourse[] = (courses ?? []).map((course, index) => ({
    cover: buildCover(course.image, course.title, index),
    dateLabel: course.dateLabel ?? undefined,
    description: course.description ?? undefined,
    href: prepareLinkProps(course.link, locale).href || undefined,
    price: course.price ?? undefined,
    priceBefore: course.priceBefore ?? undefined,
    rating: course.rating ?? undefined,
    title: course.title,
  }));

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <CourseRail
        allTopicsHref={prepareLinkProps(allTopicsLink, locale).href || undefined}
        allTopicsLabel={allTopicsLabel ?? undefined}
        courses={railCourses}
        eyebrow={eyebrow ?? undefined}
        heading={heading}
        topics={railTopics}
        viewAllHref={prepareLinkProps(viewAllLink, locale).href || undefined}
        viewAllLabel={viewAllLabel ?? undefined}
      />
    </SectionContainer>
  );
}
