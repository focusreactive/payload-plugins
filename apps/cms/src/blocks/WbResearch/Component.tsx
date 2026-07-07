import React from "react";

import type { WbResearchBlock } from "@/payload-types";

import { mediaSrc } from "@/blocks/WbHero/Component";

import { WbResearch } from "./ui";

export function WbResearchBlockComponent(props: WbResearchBlock) {
  const { eyebrow, title, cta, ctaHref, featured, items } = props;

  return (
    <WbResearch
      eyebrow={eyebrow ?? ""}
      title={title ?? ""}
      cta={cta ?? ""}
      ctaHref={ctaHref ?? "#"}
      featured={{
        image: mediaSrc(featured?.image),
        pill: featured?.pill ?? "",
        meta: featured?.meta ?? "",
        title: featured?.title ?? "",
        excerpt: featured?.excerpt ?? "",
        cta: featured?.cta ?? "",
        href: featured?.href ?? "#",
      }}
      items={(items ?? []).map((item) => ({
        date: item.date ?? "",
        type: item.type ?? "",
        title: item.title ?? "",
        desc: item.desc ?? "",
        cta: item.cta ?? "",
        href: item.href ?? "#",
      }))}
    />
  );
}
