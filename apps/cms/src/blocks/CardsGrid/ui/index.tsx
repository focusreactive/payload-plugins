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

export function CardsGrid(props: ICardsGridProps) {
  const { items, columns } = props;

  const effectiveColumns = resolveEffectiveColumns(columns, items?.length ?? 0);

  const gridCols =
    effectiveColumns === 3
      ? "lg:grid-cols-3"
      : effectiveColumns === 2
        ? "lg:grid-cols-2"
        : effectiveColumns === 4
          ? "lg:grid-cols-4"
          : "lg:grid-cols-1";

  return (
    <div
      className={cn(
        "not-prose grid grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6",
        gridCols
      )}
    >
      {items?.map((item, i) => (
        <DefaultCard key={i} {...item} />
      ))}
    </div>
  );
}
