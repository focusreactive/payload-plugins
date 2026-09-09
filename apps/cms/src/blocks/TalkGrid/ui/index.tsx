/**
 * The listing card, and the grid that holds it.
 *
 * One component, used by the TalkGrid block and by the topic route, because those two pages are
 * walked one after the other on a call. When each owned its own markup they drifted: different
 * tier labels, a lock on one and not the other, and two different teaser budgets both cutting
 * mid-word.
 */

import { Lock } from "lucide-react";
import Link from "next/link";

import { cn } from "@/components/utils";
import { excerptAtWord, formatTalkDuration, formatTalkKind } from "@/lib/talks/display";
import { TIER_BADGE_CLASS, tierBadge, tierBadgeToneClass } from "@/lib/talks/tierLabels";

/**
 * Structural, and without an index signature, so Payload's generated `Talk` stays assignable to it
 * - see the note on GatedTalkFields in lib/talks/applyTier.ts for what an index signature here
 * would do to the error messages three files away.
 */
export interface TalkCardTalk {
  slug: string;
  title: string;
  kind?: string | null;
  requiredTier?: string | null;
  durationSeconds?: number | null;
  audioUrl?: string | null;
  teaser?: string | null;
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

function MetaSeparator() {
  return <span aria-hidden>·</span>;
}

export function TalkCard({ talk, showKind = true, showTier = true }: TalkCardProps) {
  const kind = showKind ? formatTalkKind(talk.kind) : null;
  const duration = formatTalkDuration(talk.durationSeconds);
  const badge = tierBadge(talk.requiredTier);
  const excerpt = excerptAtWord(talk.teaser, CARD_EXCERPT_CHARS);
  const meta = [kind, duration, talk.audioUrl ? "Audio" : null].filter(
    (entry): entry is string => entry !== null
  );

  return (
    // The same recipe the ShopifyCarousel card uses, so the two card shapes on the demo are one
    // shape: rounded-lg, border-border, bg-card, p-6, gap-5.
    <li className="flex h-full flex-col gap-5 rounded-lg border border-border bg-card p-6 text-card-foreground transition-colors duration-200 ease-out hover:border-border-strong">
      {(showTier || meta.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {showTier && (
            <span
              aria-label={badge.description}
              className={cn(TIER_BADGE_CLASS, tierBadgeToneClass(badge.isGated))}
            >
              {/* Smaller than the house `size={20}` because it sits inside a 0.72rem pill, where
                  20px would be taller than the label beside it. */}
              {badge.isGated && <Lock aria-hidden className="shrink-0" size={14} />}
              {badge.label}
            </span>
          )}
          {meta.length > 0 && (
            <p className="text-eyebrow flex flex-wrap items-center gap-2 text-muted-foreground">
              {meta.map((entry, index) => (
                <span className="inline-flex items-center gap-2" key={entry}>
                  {index > 0 && <MetaSeparator />}
                  {entry}
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      <h3 className="text-h-card">
        <Link
          className="text-foreground transition-colors duration-200 ease-out hover:text-primary motion-reduce:transition-none"
          href={`/talks/${talk.slug}`}
        >
          {talk.title}
        </Link>
      </h3>

      {excerpt && <p className="text-small text-muted-foreground">{excerpt}</p>}
    </li>
  );
}

interface TalkListProps {
  talks: (TalkCardTalk & { id: number | string })[];
  showKind?: boolean;
  showTier?: boolean;
}

export function TalkList({ talks, showKind, showTier }: TalkListProps) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-6">
      {talks.map((talk) => (
        <TalkCard key={talk.id} showKind={showKind} showTier={showTier} talk={talk} />
      ))}
    </ul>
  );
}
