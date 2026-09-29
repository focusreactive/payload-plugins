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

import { CARD_RAIL_ITEM_WIDTH } from "@/components/ui/CardRail/constants";
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
 * The gap is the same `clamp(16px,1.6vw,24px)` the rail's track formula divides against
 * (`CARD_RAIL_ITEM_WIDTH`), so the two layouts read as one system and the rail's 3.28-cards-across
 * arithmetic stays true.
 */
const CARD_GAP_CLASS = "gap-[clamp(16px,1.6vw,24px)]";

/**
 * The concept draws no breakpoints at all - it is one 1520px composition - so every column count
 * below is ours. Three is what the rail shows at desktop, so the grid matching it keeps a card the
 * same size whichever layout an editor picks.
 */
const CARD_GRID_COLUMNS_CLASS = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

export function TalkList({ layout = "grid", showKind, showTier, talks }: TalkListProps) {
  if (layout === "rail") {
    return (
      // A plain scroller, no arrows: the arrows live on the blocks that own a header row to put
      // them in (CourseRail, ShopifyCarouselRail), and both drive the rail through the same
      // `useCardRail` hook. tabIndex is what lets a keyboard user scroll this one: Firefox and
      // Safari do not make a scroll container focusable on their own.
      <ul
        aria-label="Talks"
        className={cn(
          "scrollbar-none grid list-none grid-flow-col items-stretch overflow-x-auto overscroll-x-contain snap-x snap-proximity pb-2",
          CARD_GAP_CLASS
        )}
        style={{ gridAutoColumns: CARD_RAIL_ITEM_WIDTH }}
        tabIndex={0}
      >
        {talks.map((talk) => (
          <li className="flex min-w-0" key={talk.id}>
            <TalkCard showKind={showKind} showTier={showTier} talk={talk} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    // A real CSS grid, so the column is what decides a card's width. Under the flex-wrap row this
    // replaced, each `<li>` shrink-to-fit its own text and ContentCard's `100%` resolved against
    // that, which rendered sixteen full-width cards in one column at every desktop size.
    <ul className={cn(CARD_GRID_COLUMNS_CLASS, "list-none", CARD_GAP_CLASS)}>
      {talks.map((talk) => (
        <li className="flex min-w-0" key={talk.id}>
          <TalkCard showKind={showKind} showTier={showTier} talk={talk} />
        </li>
      ))}
    </ul>
  );
}
