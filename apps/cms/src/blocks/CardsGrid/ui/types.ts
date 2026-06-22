import type React from "react";

import type { IImageProps } from "@/components/image/types";
import type { LinkProps } from "@/components/link/types";

export interface IDefaultCardProps {
  title: string;
  description?: string;
  image: IImageProps;
  link: LinkProps;
  alignVariant: "left" | "center" | "right";
  rounded: "none" | "large";
  backgroundColor: "none" | "light" | "dark" | "light-gray" | "dark-gray" | "gradient-2";
  icon?: React.ReactNode | null;
}

export interface ICardsGridProps {
  items: IDefaultCardProps[];
  columns: number;
}
