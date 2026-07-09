import React from "react";

import { mediaSrc } from "@/blocks/WbHero/Component";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { WbFeaturedBlock } from "@/payload-types";

import { WbFeatured } from "./ui";

export async function WbFeaturedBlockComponent(props: WbFeaturedBlock) {
  const { eyebrow, title, cta, items } = props;
  const locale = await resolveLocale();

  const sectionCta = prepareLinkProps(cta, locale);

  return (
    <WbFeatured
      eyebrow={eyebrow ?? ""}
      title={title ?? ""}
      cta={sectionCta.text}
      ctaHref={sectionCta.href || "#"}
      items={(items ?? []).map((item) => ({
        image: mediaSrc(item.image),
        category: item.category ?? "",
        brand: item.brand ?? "",
        title: item.title ?? "",
        description: item.description ?? "",
        date: item.date ?? "",
        href: prepareLinkProps(item.link, locale).href || "#",
      }))}
    />
  );
}
