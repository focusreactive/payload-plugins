import { cn } from "@/components/utils";
import DefaultCard from "./DefaultCard";
import type { CardsGridColumns, ICardsGridProps } from "./types";

const GRID_COLS: Record<CardsGridColumns, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

export function CardsGrid(props: ICardsGridProps) {
  const { items, columns, ...style } = props;
  const gridCols = GRID_COLS[columns] ?? GRID_COLS[3];

  return (
    <div
      className={cn("not-prose grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6", gridCols)}
    >
      {items?.map((item, i) => (
        <DefaultCard key={i} {...item} {...style} />
      ))}
    </div>
  );
}
