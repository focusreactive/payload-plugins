import type { CardsGridBlock } from "@/payload-types";

import type { CardsGridColumns, ICardStyle } from "./ui/types";

type GridSettings = Pick<
  CardsGridBlock,
  "alignVariant" | "backgroundColor" | "columns" | "rounded"
>;

const DEFAULT_COLUMNS: CardsGridColumns = 3;

function toColumns(value: GridSettings["columns"]): CardsGridColumns {
  const columns = Number(value);
  return columns === 1 || columns === 2 || columns === 3 || columns === 4
    ? columns
    : DEFAULT_COLUMNS;
}

/** Grid-level layout + card styling shared by the section block and the inline (post body) block. */
export function prepareCardsGridSettings(
  settings: GridSettings
): ICardStyle & { columns: CardsGridColumns } {
  return {
    alignVariant: settings.alignVariant ?? "left",
    backgroundColor: settings.backgroundColor ?? "none",
    columns: toColumns(settings.columns),
    rounded: settings.rounded ?? "none",
  };
}
