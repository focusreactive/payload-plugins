import React from "react";

import { mediaSrc } from "@/blocks/WbHero/Component";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { WbResearchBlock } from "@/payload-types";

import { WbResearch } from "./ui";

export async function WbResearchBlockComponent(props: WbResearchBlock) {
  const { eyebrow, title, cta, featured, items } = props;
  const locale = await resolveLocale();

  const sectionCta = prepareLinkProps(cta, locale);
  const featuredLink = prepareLinkProps(featured?.link, locale);

  return (
    <WbResearch
      eyebrow={eyebrow ?? ""}
      title={title ?? ""}
      cta={sectionCta.text}
      ctaHref={sectionCta.href || "#"}
      featured={{
        image: mediaSrc(featured?.image),
        pill: featured?.pill ?? "",
        meta: featured?.meta ?? "",
        title: featured?.title ?? "",
        excerpt: featured?.excerpt ?? "",
        cta: featuredLink.text,
        href: featuredLink.href || "#",
      }}
      items={(items ?? []).map((item) => {
        const link = prepareLinkProps(item.link, locale);
        return {
          date: item.date ?? "",
          type: item.type ?? "",
          title: item.title ?? "",
          desc: item.desc ?? "",
          cta: link.text,
          href: link.href || "#",
        };
      })}
    />
  );
}
