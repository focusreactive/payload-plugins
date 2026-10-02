import type { Page } from "@/payload-types";

import { filterHiddenBlocks } from "@/lib/fields/section/filterHiddenBlocks";

import { HeroBlockComponent } from "./Hero/Component";

export function RenderHero({ hero }: { hero: Page["hero"] }) {
  const [visibleHero] = filterHiddenBlocks(hero);

  if (!visibleHero) {
    return null;
  }

  return <HeroBlockComponent {...visibleHero} />;
}
