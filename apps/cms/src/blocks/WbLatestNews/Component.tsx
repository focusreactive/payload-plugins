import React from "react";

import { mediaSrc } from "@/blocks/WbHero/Component";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { WbNewsBlock } from "@/payload-types";

import { WbLatestNews } from "./ui";

export async function WbLatestNewsBlockComponent(props: WbNewsBlock) {
  const { eyebrow, title, cta, featured, items } = props;
  const locale = await resolveLocale();

  const sectionCta = prepareLinkProps(cta, locale);
  const featuredLink = prepareLinkProps(featured?.link, locale);

  return (
    <WbLatestNews
      eyebrow={eyebrow ?? ""}
      title={title ?? ""}
      cta={sectionCta.text}
      ctaHref={sectionCta.href || "#"}
      featured={{
        image: mediaSrc(featured?.image),
        category: featured?.category ?? "",
        date: featured?.date ?? "",
        title: featured?.title ?? "",
        description: featured?.description ?? "",
        cta: featuredLink.text,
        byline: featured?.byline ?? "",
        href: featuredLink.href || "#",
      }}
      items={(items ?? []).map((item) => ({
        category: item.category ?? "",
        date: item.date ?? "",
        title: item.title ?? "",
        text: item.text ?? "",
        href: prepareLinkProps(item.link, locale).href || "#",
      }))}
    />
  );
}
