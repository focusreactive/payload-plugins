import type { PreparedMedia } from "@/components/media";
import type { LinkProps } from "@/components/link/types";
import type { SectionHeadingContent } from "@/components/SectionHeading";

export type HeroVariant = "showcase" | "centered";

export interface IHeroProps {
  variant: HeroVariant;
  heading?: SectionHeadingContent | null;
  image: PreparedMedia;
  links: LinkProps[];
}
