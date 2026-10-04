import { cn } from "@/components/utils";
import DefaultCard from "./DefaultCard";
import type { ICardsGridProps } from "./types";

export function CardsGrid(props: ICardsGridProps) {
  const { items, columns, numbered } = props;

  const gridCols =
    columns === 3
      ? "lg:grid-cols-3"
      : columns === 2
        ? "lg:grid-cols-2"
        : columns === 4
          ? "lg:grid-cols-4"
          : "lg:grid-cols-1";

  return (
    <div className={cn("not-prose grid grid-cols-1 gap-6 sm:grid-cols-2 xl:gap-8", gridCols)}>
      {items?.map((item, i) => (
        <DefaultCard key={i} {...item} number={numbered ? i + 1 : undefined} />
      ))}
    </div>
  );
}
