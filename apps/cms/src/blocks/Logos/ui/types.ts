import type { PreparedMedia } from "@/components/media";
import type { LinkProps } from "@/components/link/types";

export enum AlignVariant {
  Left = "left",
  Center = "center",
  Right = "right",
}

export interface ILogoItem {
  link?: LinkProps;
  /** Null → the item renders as a text wordmark (`name`). */
  image: PreparedMedia | null;
  name?: string | null;
}

export interface ILogosProps {
  items: ILogoItem[];
  alignVariant: AlignVariant;
  label?: string | null;
}
