import type { Block } from "payload";

import { HeroBlock } from "./Hero/config";
import { siteHeroBlocks } from "./site/configs";
import { blogHeroBlocks } from "./site/templates/blog";
import { ImageHeroBlock } from "./site/shared/imageHeroConfig";
import { SimpleHeroBlock } from "./site/shared/simpleHeroConfig";

const allSiteHeroBlocks: Block[] = [
  ...siteHeroBlocks,
  ImageHeroBlock,
  SimpleHeroBlock,
  ...blogHeroBlocks,
];

// The stock hero stays in the schema so existing documents keep their data; the editor is
// offered the site's own heroes only (see `filterOptions` on the page's hero field).
export const heroBlocks: Block[] = [...allSiteHeroBlocks, HeroBlock];

export const siteHeroBlockSlugs: string[] = allSiteHeroBlocks.map((block) => block.slug);
