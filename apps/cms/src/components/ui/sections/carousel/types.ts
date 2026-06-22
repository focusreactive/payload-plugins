import type { IImageProps } from "@/components/ui/primitives/image/types";
import type { IRichTextProps } from "@/components/ui/primitives/richText/types";

export type CarouselEffect = "slide" | "fade" | "cube" | "flip" | "coverflow" | "cards";

export interface ICarouselProps {
  effect?: CarouselEffect;
  slides: ICarouselCardProps[];
}

export interface ICarouselCardProps {
  image: IImageProps;
  text?: IRichTextProps;
  /** @deprecated kept for backward compat; no longer used in rendering */
  effect?: CarouselEffect;
  /** @deprecated kept for backward compat; no longer used in rendering */
  isActive?: boolean;
}
