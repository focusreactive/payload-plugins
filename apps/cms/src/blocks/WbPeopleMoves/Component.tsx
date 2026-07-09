import React from "react";

import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { WbPeopleBlock } from "@/payload-types";

import { WbPeopleMoves } from "./ui";

export async function WbPeopleMovesBlockComponent(props: WbPeopleBlock) {
  const { eyebrow, title, cta, items } = props;
  const locale = await resolveLocale();

  const sectionCta = prepareLinkProps(cta, locale);

  return (
    <WbPeopleMoves
      eyebrow={eyebrow ?? ""}
      title={title ?? ""}
      cta={sectionCta.text}
      ctaHref={sectionCta.href || "#"}
      items={(items ?? []).map((item) => ({
        date: item.date ?? "",
        category: item.category ?? "",
        region: item.region ?? "",
        title: item.title ?? "",
        href: prepareLinkProps(item.link, locale).href || "#",
      }))}
    />
  );
}
