import React from "react";

import type { WbPeopleBlock } from "@/payload-types";

import { WbPeopleMoves } from "./ui";

export function WbPeopleMovesBlockComponent(props: WbPeopleBlock) {
  const { eyebrow, title, cta, ctaHref, items } = props;

  return (
    <WbPeopleMoves
      eyebrow={eyebrow ?? ""}
      title={title ?? ""}
      cta={cta ?? ""}
      ctaHref={ctaHref ?? "#"}
      items={(items ?? []).map((item) => ({
        date: item.date ?? "",
        category: item.category ?? "",
        region: item.region ?? "",
        title: item.title ?? "",
        href: item.href ?? "#",
      }))}
    />
  );
}
