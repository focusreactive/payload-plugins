import { cn } from "@/components/utils";
import DefaultCard from "./DefaultCard";
import type { ICardsGridProps } from "./types";

/**
 * A single leftover card on its own row (four items in a three-up grid, for example) reads as
 * broken rather than intentional. Dropping to one fewer column only helps when it actually
 * divides the item count evenly, so an editor's column choice is only overridden when doing so
 * fixes the orphan outright.
 */
function resolveEffectiveColumns(columns: number, itemCount: number) {
  const leavesOrphan = columns > 1 && itemCount > columns && itemCount % columns === 1;
  const fallbackColumns = columns - 1;
  const fallbackFixesIt = fallbackColumns > 0 && itemCount % fallbackColumns === 0;

  return leavesOrphan && fallbackFixesIt ? fallbackColumns : columns;
}

/**
 * The tablet tier is always 2-up regardless of the editor's column choice, so an odd item count
 * strands one card there even when the desktop tier above is fine (patents' 5-item "Recent patent
 * work" is 3-up on desktop with no orphan, but 2-up on tablet leaves one alone). Bounded to small
 * curated sets only: a 21-person directory left one item on its own row at this width too, and that
 * reads as a normal list ending, not a broken layout - collapsing it to one column would make a long
 * page longer to fix something nobody perceives as broken.
 */
function tabletGridLeavesSmallOrphan(itemCount: number) {
  const maxCuratedSetSize = 6;
  return itemCount > 2 && itemCount <= maxCuratedSetSize && itemCount % 2 === 1;
}

export function CardsGrid(props: ICardsGridProps) {
  const { items, columns } = props;
  const itemCount = items?.length ?? 0;

  const effectiveColumns = resolveEffectiveColumns(columns, itemCount);
  // Boxed cards (icon cards, team cards) take Untitled's tighter card gutter; bare text columns
  // keep the wide one so they do not run together.
  const isBoxed = items?.some((item) => item.icon || item.backgroundColor === "light-gray");

  const gridCols =
    effectiveColumns === 3
      ? "lg:grid-cols-3"
      : effectiveColumns === 2
        ? "lg:grid-cols-2"
        : effectiveColumns === 4
          ? "lg:grid-cols-4"
          : "lg:grid-cols-1";

  const tabletGridCols = tabletGridLeavesSmallOrphan(itemCount)
    ? "sm:grid-cols-1"
    : "sm:grid-cols-2";

  return (
    <ul
      className={cn(
        "not-prose grid w-full grid-cols-1",
        isBoxed ? "gap-6 md:gap-8" : "gap-x-16 gap-y-10 md:gap-y-8",
        tabletGridCols,
        gridCols
      )}
    >
      {items?.map((item, i) => (
        <li key={i}>
          <DefaultCard {...item} />
        </li>
      ))}
    </ul>
  );
}
