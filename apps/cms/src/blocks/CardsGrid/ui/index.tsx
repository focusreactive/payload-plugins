import { cn } from "@/components/utils";
import DefaultCard from "./DefaultCard";
import type { ICardsGridProps } from "./types";

export function CardsGrid(props: ICardsGridProps) {
  const { items, columns } = props;

  const gridCols =
    columns === 3
      ? "lg:grid-cols-3"
      : columns === 2
        ? "lg:grid-cols-2"
        : columns === 4
          ? "lg:grid-cols-4"
          : "lg:grid-cols-1";

  return (
    <div
      className={cn("not-prose grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:gap-6", gridCols)}
    >
      {items?.map((item, i) => (
        <DefaultCard key={i} {...item} />
      ))}
    </div>
  );
}
