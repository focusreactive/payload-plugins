/**
 * Every row is rendered at every tier, with a lock badge where the body is gated. That is not a
 * shortcut - it is the model the deal is about. A gated talk still needs a crawlable page with a
 * real title, a teaser and topics, because "the archive is invisible to Google" is the problem
 * being solved. Hiding rows from visitors would rebuild the invisibility in a new stack.
 *
 * The badge says what the ITEM requires rather than what the current reader holds, which is what
 * the "Show tier" field already promised in the admin ("Shows a lock and the tier needed"). Two
 * things follow: this block reads no cookie, so a page carrying it caches for everyone, and one
 * document cannot read "Readable" here and "Free" on the topic page.
 */

import type { ComponentProps } from "react";

import { SectionHeader } from "@/components/SectionHeader";
import { SectionContainer } from "@/components/shared";
import { getPayloadClient, getTalks } from "@/dal";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";

import { TalkList } from "./ui";

interface Props {
  /** Added by injectSection. Ignoring it is what made this block render flush to the
   *  viewport edge while every stock block sat inside the page's measure. */
  section?: ComponentProps<typeof SectionContainer>["sectionData"];
  id?: string | null;
  eyebrow?: string | null;
  heading?: string | null;
  description?: string | null;
  source?: "recent" | "topic" | "kind" | "selected" | null;
  topic?: { slug?: string | null } | number | string | null;
  kind?: string | null;
  limit?: number | null;
  showKind?: boolean | null;
  showTier?: boolean | null;
  talkItems?: { talk?: { id?: number | string } | number | string | null }[] | null;
}

/** A relationship field arrives as an id or as a populated object depending on `depth`. */
const relationId = (value: unknown): number | string | null => {
  if (typeof value === "number" || typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) {
    const { id } = value as { id?: number | string };
    return id ?? null;
  }
  return null;
};

async function TalkGridBlockContent({
  description,
  eyebrow,
  heading,
  kind,
  limit,
  showKind,
  showTier,
  source,
  talkItems,
  topic,
}: Props) {
  const payload = await getPayloadClient();

  const topicSlug =
    topic && typeof topic === "object" && "slug" in topic ? (topic.slug ?? undefined) : undefined;

  const { docs } = await getTalks(payload, {
    ids:
      source === "selected"
        ? (talkItems ?? [])
            .map((item) => relationId(item.talk))
            .filter((id): id is number | string => id !== null)
        : undefined,
    kind: source === "kind" ? (kind ?? undefined) : undefined,
    limit: limit ?? 6,
    topicSlug: source === "topic" ? topicSlug : undefined,
  });

  // The shared section header, so the block's own `eyebrow` field finally reaches the page and the
  // heading is the display-serif size every other block's heading is. It used to be a 20px h2 with
  // the eyebrow field read by nothing.
  const header = prepareSectionHeaderProps({
    description,
    eyebrow,
    heading: heading ?? "Talks",
  });

  if (docs.length === 0) {
    return (
      <div>
        {header && <SectionHeader {...header} className="mb-12" />}
        <p className="text-body-lg text-muted-foreground">
          No published talks match this section yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      {header && <SectionHeader {...header} className="mb-12" />}
      <TalkList showKind={showKind !== false} showTier={showTier !== false} talks={docs} />
    </div>
  );
}

export async function TalkGridBlockComponent(props: Props) {
  return (
    <SectionContainer sectionData={{ ...props.section, id: props.id }}>
      {await TalkGridBlockContent(props)}
    </SectionContainer>
  );
}
