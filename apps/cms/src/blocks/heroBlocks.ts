import type { Block } from "payload";

import { HeroBlock } from "./Hero/config";
import { siteHeroBlocks } from "./site/configs";

// The stock hero stays in the schema so existing documents keep their data; the editor is
// offered the site's own heroes only (see `filterOptions` on the page's hero field).
export const heroBlocks: Block[] = [...siteHeroBlocks, HeroBlock];

export const siteHeroBlockSlugs: string[] = siteHeroBlocks.map((block) => block.slug);
