import React from "react";

import { mediaSrc } from "@/blocks/WbHero/Component";
import type { WbFeaturedBlock } from "@/payload-types";

import { WbFeatured } from "./ui";

export function WbFeaturedBlockComponent(props: WbFeaturedBlock) {
  const { eyebrow, title, cta, ctaHref, items } = props;

  return (
    <WbFeatured
      eyebrow={eyebrow ?? ""}
      title={title ?? ""}
      cta={cta ?? ""}
      ctaHref={ctaHref ?? "#"}
      items={(items ?? []).map((item) => ({
        image: mediaSrc(item.image),
        category: item.category ?? "",
        brand: item.brand ?? "",
        title: item.title ?? "",
        description: item.description ?? "",
        date: item.date ?? "",
        href: item.href ?? "#",
      }))}
    />
  );
}
