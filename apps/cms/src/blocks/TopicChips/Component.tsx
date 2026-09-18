import type { ComponentProps } from "react";

import { SectionHeader } from "@/components/SectionHeader";
import { SectionContainer } from "@/components/shared";
import { getPayloadClient } from "@/dal";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";

import { TopicChipList } from "./ui";

interface Props {
  /** Added by injectSection. Ignoring it is what made this block render flush to the
   *  viewport edge while every stock block sat inside the page's measure. */
  section?: ComponentProps<typeof SectionContainer>["sectionData"];
  id?: string | null;
  eyebrow?: string | null;
  heading?: string | null;
  description?: string | null;
  topicItems?:
    | { topic?: { slug?: string | null; title?: string | null } | number | string | null }[]
    | null;
}

async function TopicChipsBlockContent({ description, eyebrow, heading, topicItems }: Props) {
  // A relationship only arrives populated when the query asked for enough depth. The blocks on a
  // Page come back at the depth the page query chose, so an id here is normal rather than an
  // error - fall back to fetching the topics directly.
  const picked = (topicItems ?? [])
    .map((item) => item.topic)
    .filter((topic): topic is { slug?: string | null; title?: string | null } =>
      Boolean(topic && typeof topic === "object" && "title" in topic)
    );

  let topics = picked;
  if (topics.length === 0) {
    const payload = await getPayloadClient();
    const result = await payload.find({
      collection: "topic",
      limit: 12,
      overrideAccess: true,
      select: { slug: true, title: true },
      sort: "title",
    });
    topics = result.docs;
  }

  if (topics.length === 0) return null;

  // The shared section header, so the block's own `eyebrow` field reaches the page and the heading
  // matches every other block's. It used to be a 20px h2 with the eyebrow read by nothing.
  const header = prepareSectionHeaderProps({
    description,
    eyebrow,
    heading: heading ?? "Start where you are",
  });

  return (
    <div>
      {header && <SectionHeader {...header} className="mb-12" />}
      <TopicChipList topics={topics} />
    </div>
  );
}

export async function TopicChipsBlockComponent(props: Props) {
  return (
    <SectionContainer sectionData={{ ...props.section, id: props.id }}>
      {await TopicChipsBlockContent(props)}
    </SectionContainer>
  );
}
