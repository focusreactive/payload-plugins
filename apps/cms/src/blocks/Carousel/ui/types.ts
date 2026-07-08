import type { PreparedMedia } from "@/components/media";
import type { IRichTextProps } from "@/components/richText/types";

export type CarouselEffect = "slide" | "fade" | "cube" | "flip" | "coverflow" | "cards";

export interface ICarouselProps {
  effect?: CarouselEffect;
  slides: ICarouselCardProps[];
}

export interface ICarouselCardProps {
  image: PreparedMedia;
  text?: IRichTextProps;
  /** @deprecated kept for backward compat; no longer used in rendering */
  effect?: CarouselEffect;
  /** @deprecated kept for backward compat; no longer used in rendering */
  isActive?: boolean;
}
