import React from "react";

import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { WbBrandsBlock } from "@/payload-types";

import { WbBrandWorlds } from "./ui";

export async function WbBrandWorldsBlockComponent(props: WbBrandsBlock) {
  const { eyebrow, title, titleSecondLine, subtitle, items } = props;
  const locale = await resolveLocale();

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
        href: prepareLinkProps(item.link, locale).href || "#",
      }))}
    />
  );
}
