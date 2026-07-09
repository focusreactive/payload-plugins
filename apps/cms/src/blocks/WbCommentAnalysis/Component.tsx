import React from "react";

import { mediaSrc } from "@/blocks/WbHero/Component";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { WbAnalysisBlock } from "@/payload-types";

import { WbCommentAnalysis } from "./ui";

export async function WbCommentAnalysisBlockComponent(props: WbAnalysisBlock) {
  const { eyebrow, title, cta, featured, items } = props;
  const locale = await resolveLocale();

  const sectionCta = prepareLinkProps(cta, locale);
  const featuredLink = prepareLinkProps(featured?.link, locale);

  return (
    <WbCommentAnalysis
      eyebrow={eyebrow ?? ""}
      title={title ?? ""}
      cta={sectionCta.text}
      ctaHref={sectionCta.href || "#"}
      featured={{
        image: mediaSrc(featured?.image),
        category: featured?.category ?? "",
        date: featured?.date ?? "",
        title: featured?.title ?? "",
        excerpt: featured?.excerpt ?? "",
        cta: featuredLink.text,
        href: featuredLink.href || "#",
      }}
      items={(items ?? []).map((item) => ({
        category: item.category ?? "",
        date: item.date ?? "",
        title: item.title ?? "",
        description: item.description ?? "",
        href: prepareLinkProps(item.link, locale).href || "#",
      }))}
    />
  );
}
