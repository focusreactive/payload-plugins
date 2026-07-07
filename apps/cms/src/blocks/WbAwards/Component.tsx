import React from "react";

import type { WbAwardsBlock } from "@/payload-types";

import { WbAwards } from "./ui";

export function WbAwardsBlockComponent(props: WbAwardsBlock) {
  const { eyebrow, title, cta, ctaHref, items } = props;

  return (
    <WbAwards
      eyebrow={eyebrow ?? ""}
      title={title ?? ""}
      cta={cta ?? ""}
      ctaHref={ctaHref ?? "#"}
      items={(items ?? []).map((item) => ({
        region: item.region ?? "",
        title: item.title ?? "",
        description: item.description ?? "",
        cta: item.cta ?? "",
        href: item.href ?? "#",
      }))}
    />
  );
}
