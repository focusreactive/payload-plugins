import type { IImageProps } from "../../ui/image/types";
import type { LinkProps } from "../../ui/link/types";
import type { IRichTextProps } from "../../ui/richText/types";

export type HeroVariant = "showcase" | "centered";

export type HeroTheme = "dark" | "dark-gray" | "light" | "light-gray" | null;

export interface IHeroProps {
  variant: HeroVariant;
  theme?: HeroTheme;
  badge?: string | null;
  title: string;
  text: IRichTextProps;
  image: IImageProps;
  links: LinkProps[];
}
