/**
 * The listing card, and the grid/rail that holds it.
 *
 * One component, used by the TalkGrid block and by the topic route, because those two pages are
 * walked one after the other on a call. When each owned its own markup they drifted: different
 * tier labels, a lock on one and not the other, and two different teaser budgets both cutting
 * mid-word.
 *
 * The card itself is now the shared `ContentCard` primitive (src/components/ui/ContentCard) built
 * from the design concept, in its "course" variant - it is what makes a real Talk look like the
 * concept's design rather than the block's own bespoke card.
 */

import type { PreparedMedia } from "@/components/media";

import { ContentCard } from "@/components/ui/ContentCard";
import { cn } from "@/components/utils";
import { excerptAtWord } from "@/lib/talks/display";
import { kindLabel, tierLabel } from "@/lib/talks/taxonomy";

/**
 * The minimal shape read off a populated `image` upload relationship. Typed by hand rather than
 * imported from the generated `Media` type in `@/payload-types`: a colocated ui/ section has to
 * stay Payload-agnostic (eslint no-restricted-imports blocks that import here), and this is the
 * only piece of it TalkCard actually reads.
 */
interface PopulatedCoverImage {
  url?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
}

/**
 * Structural, and without an index signature, so Payload's generated `Talk` stays assignable to it
 * - see the note on GatedTalkFields in lib/talks/applyTier.ts for what an index signature here
 * would do to the error messages three files away.
 *
 * `coverImage` is typed by hand for the same reason, and has to be: oxlint bans Payload imports
 * inside a block's `ui/` folder, so the generated type is unavailable here whatever its state.
 * `getTalks`'s LISTING_SELECT requests the field, so it does arrive populated.
 */
export interface TalkCardTalk {
  slug: string;
  title: string;
  kind?: unknown;
  requiredTier?: string | null;
  teaser?: string | null;
  publishedAt?: string | null;
  coverImage?: { image?: PopulatedCoverImage | number | null } | null;
}

/**
 * Built by hand rather than through the `prepareMediaProps` adapter, which is off-limits here for
 * the same Payload-agnostic-ui/ reason `PopulatedCoverImage` is. An unpopulated relationship (a bare
 * id number, from a shallower query) or a missing url both degrade to no cover - ContentCard already
 * renders an empty well in that case, so there is nothing to fall back to here.
 */
function buildCover(talk: TalkCardTalk): PreparedMedia | undefined {
  const image = talk.coverImage?.image;
  if (!image || typeof image === "number" || !image.url) return undefined;

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

interface TalkCardProps {
  talk: TalkCardTalk;
  showKind?: boolean;
  showTier?: boolean;
}

/**
 * Long enough to carry a real sentence and short enough that three columns stay the same height at
 * a glance. It is one number for both pages on purpose.
 */
const CARD_EXCERPT_CHARS = 160;

/**
 * "Aug 24, 2026" - a fixed locale rather than one read off the request, matching how the kind and
 * tier vocabularies on this same card (lib/talks/taxonomy.ts) are also English-only strings rather
 * than `{ en, es }` pairs. `text-eyebrow`, the class ContentCard renders this label with, already
 * applies its own uppercase transform, so nothing here needs to force the string's case.
 */
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

export function TalkCard({ showKind = true, showTier = true, talk }: TalkCardProps) {
  return (
    <ContentCard
      className="snap-start"
      cover={buildCover(talk)}
      dateLabel={formatPublishedDate(talk.publishedAt)}
      description={excerptAtWord(talk.teaser, CARD_EXCERPT_CHARS) ?? undefined}
      // The kind takes the slot the star rating would occupy on a rated card. A talk is never
      // rated, so on this feed that slot is always free and the row keeps the concept's own
      // left-and-right balance instead of leaving the date alone against the edge.
      eyebrow={(showKind && kindLabel(talk.kind)) || undefined}
      href={`/talks/${talk.slug}`}
      // The tier's home now: a gated talk reads its required tier ("Premium", "All Access") in the
      // same green price slot a book-fed card would show a real price in, rather than a separate
      // badge with a lock glyph - see the top-of-file comment on Component.tsx for why the tier is
      // shown at every reader position rather than gated on one.
      price={showTier ? tierLabel(talk.requiredTier) : undefined}
      title={talk.title}
      variant="course"
    />
  );
}

interface TalkListProps {
  talks: (TalkCardTalk & { id: number | string })[];
  layout?: "grid" | "rail";
  showKind?: boolean;
  showTier?: boolean;
}

/**
 * ContentCard's "course" width is `clamp(260px, calc((100% - 2 * clamp(16px,1.6vw,24px)) / 3.28),
 * 460px)` (see ContentCard's own CONTENT_CARD_WIDTH comment) - a formula built for a flex row, where
 * a wrapped item's `100%` resolves against the row's own width. This gap has to match the one baked
 * into that formula exactly, or the maths the formula is doing no longer lines up with the space it
 * is dividing.
 */
const CARD_ROW_GAP_CLASS = "gap-[clamp(16px,1.6vw,24px)]";

export function TalkList({ layout = "grid", showKind, showTier, talks }: TalkListProps) {
  if (layout === "rail") {
    return (
      // A plain scroller, no arrows: src/blocks/CourseRail/ui/index.tsx's rail is being generalised
      // into a shared rail component with real arrow controls, and this block migrates onto it
      // once that exists - adding a second, block-local arrow implementation now would be one more
      // place for the two to drift apart. tabIndex is what lets a keyboard user scroll it in the
      // meantime: Firefox and Safari do not make a scroll container focusable on their own.
      <div
        aria-label="Talks"
        className={cn(
          "scrollbar-none flex flex-nowrap items-stretch overflow-x-auto overscroll-x-contain snap-x snap-proximity pb-2",
          CARD_ROW_GAP_CLASS
        )}
        role="group"
        tabIndex={0}
      >
        {talks.map((talk) => (
          <TalkCard key={talk.id} showKind={showKind} showTier={showTier} talk={talk} />
        ))}
      </div>
    );
  }

  return (
    // flex-wrap, not a CSS grid: see CARD_ROW_GAP_CLASS above for why the card's own width formula
    // needs a flex row's containing block, which a grid cell is not.
    <ul className={cn("flex flex-wrap items-stretch", CARD_ROW_GAP_CLASS)}>
      {talks.map((talk) => (
        <li key={talk.id}>
          <TalkCard showKind={showKind} showTier={showTier} talk={talk} />
        </li>
      ))}
    </ul>
  );
}
