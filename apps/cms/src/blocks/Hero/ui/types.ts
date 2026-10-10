import type { PreparedMedia } from "@/components/media";
import type { LinkProps } from "@/components/link/types";
import type { SectionHeadingContent } from "@/components/SectionHeading";

export type HeroVariant = "showcase" | "centered";

export type HeroTheme = "dark" | "dark-gray" | "light" | "light-gray" | null;

export interface IHeroProps {
  variant: HeroVariant;
  theme?: HeroTheme;
  heading?: SectionHeadingContent | null;
  image: PreparedMedia;
  links: LinkProps[];
}
