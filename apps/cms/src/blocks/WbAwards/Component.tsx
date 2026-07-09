import React from "react";

import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { WbAwardsBlock } from "@/payload-types";

import { WbAwards } from "./ui";

export async function WbAwardsBlockComponent(props: WbAwardsBlock) {
  const { eyebrow, title, cta, items } = props;
  const locale = await resolveLocale();

  const sectionCta = prepareLinkProps(cta, locale);

  return (
    <WbAwards
      eyebrow={eyebrow ?? ""}
      title={title ?? ""}
      cta={sectionCta.text}
      ctaHref={sectionCta.href || "#"}
      items={(items ?? []).map((item) => {
        const link = prepareLinkProps(item.link, locale);
        return {
          region: item.region ?? "",
          title: item.title ?? "",
          description: item.description ?? "",
          cta: link.text,
          href: link.href || "#",
        };
      })}
    />
  );
}
