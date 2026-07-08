import type { PreparedMedia } from "@/components/media";
import type { LinkProps } from "@/components/link/types";

export enum AlignVariant {
  Left = "left",
  Center = "center",
  Right = "right",
}

export interface ILogoItem {
  link?: LinkProps;
  image: PreparedMedia;
}

export interface ILogosProps {
  items: ILogoItem[];
  alignVariant: AlignVariant;
  label?: string | null;
}
