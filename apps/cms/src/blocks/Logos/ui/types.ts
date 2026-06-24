import type { IImageProps } from "@/components/image/types";
import type { LinkProps } from "@/components/link/types";

export enum AlignVariant {
  Left = "left",
  Center = "center",
  Right = "right",
}

export interface ILogoItem {
  link?: LinkProps;
  image: IImageProps;
}

export interface ILogosProps {
  items: ILogoItem[];
  alignVariant: AlignVariant;
  label?: string | null;
}
