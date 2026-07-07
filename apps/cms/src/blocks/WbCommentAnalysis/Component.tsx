import React from "react";

import type { WbAnalysisBlock } from "@/payload-types";

import { mediaSrc } from "@/blocks/WbHero/Component";

import { WbCommentAnalysis } from "./ui";

export function WbCommentAnalysisBlockComponent(props: WbAnalysisBlock) {
  const { eyebrow, title, cta, ctaHref, featured, items } = props;

  return (
    <WbCommentAnalysis
      eyebrow={eyebrow ?? ""}
      title={title ?? ""}
      cta={cta ?? ""}
      ctaHref={ctaHref ?? "#"}
      featured={{
        image: mediaSrc(featured?.image),
        category: featured?.category ?? "",
        date: featured?.date ?? "",
        title: featured?.title ?? "",
        excerpt: featured?.excerpt ?? "",
        cta: featured?.cta ?? "",
        href: featured?.href ?? "#",
      }}
      items={(items ?? []).map((item) => ({
        category: item.category ?? "",
        date: item.date ?? "",
        title: item.title ?? "",
        description: item.description ?? "",
        href: item.href ?? "#",
      }))}
    />
  );
}
