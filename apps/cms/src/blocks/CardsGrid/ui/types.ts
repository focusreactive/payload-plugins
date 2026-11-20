import type React from "react";

import type { PreparedMedia } from "@/components/media";
import type { LinkProps } from "@/components/link/types";

export type CardsGridColumns = 1 | 2 | 3 | 4;

/** Card styling, set once for the whole grid. */
export interface ICardStyle {
  alignVariant: "left" | "center" | "right";
  rounded: "none" | "large";
  backgroundColor: "none" | "light" | "dark" | "light-gray" | "dark-gray" | "gradient-2";
}

export interface ICardContent {
  title: string;
  description?: string;
  image: PreparedMedia;
  link: LinkProps;
  icon?: React.ReactNode | null;
}

export interface IDefaultCardProps extends ICardContent, ICardStyle {}

export interface ICardsGridProps extends ICardStyle {
  items: ICardContent[];
  columns: CardsGridColumns;
}
