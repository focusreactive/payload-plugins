import React from "react";

import { mediaSrc } from "@/blocks/WbHero/Component";
import type { WbNewsBlock } from "@/payload-types";

import { WbLatestNews } from "./ui";

export function WbLatestNewsBlockComponent(props: WbNewsBlock) {
  const { eyebrow, title, cta, ctaHref, featured, items } = props;

  return (
    <WbLatestNews
      eyebrow={eyebrow ?? ""}
      title={title ?? ""}
      cta={cta ?? ""}
      ctaHref={ctaHref ?? "#"}
      featured={{
        image: mediaSrc(featured?.image),
        category: featured?.category ?? "",
        date: featured?.date ?? "",
        title: featured?.title ?? "",
        description: featured?.description ?? "",
        cta: featured?.cta ?? "",
        byline: featured?.byline ?? "",
        href: featured?.href ?? "#",
      }}
      items={(items ?? []).map((item) => ({
        category: item.category ?? "",
        date: item.date ?? "",
        title: item.title ?? "",
        text: item.text ?? "",
        href: item.href ?? "#",
      }))}
    />
  );
}
