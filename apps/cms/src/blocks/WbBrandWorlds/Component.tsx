import React from "react";

import type { WbBrandsBlock } from "@/payload-types";

import { WbBrandWorlds } from "./ui";

export function WbBrandWorldsBlockComponent(props: WbBrandsBlock) {
  const { eyebrow, title, titleSecondLine, subtitle, items } = props;

  return (
    <WbBrandWorlds
      eyebrow={eyebrow ?? ""}
      title={title ?? ""}
      titleSecondLine={titleSecondLine ?? ""}
      subtitle={subtitle ?? ""}
      items={(items ?? []).map((item) => ({
        number: item.number ?? "",
        brand: item.brand ?? "",
        description: item.description ?? "",
        includes: item.includes ?? [],
        latestHighlight: item.latestHighlight ?? "",
        latestCta: item.latestCta ?? "",
        href: item.href ?? "#",
      }))}
    />
  );
}
