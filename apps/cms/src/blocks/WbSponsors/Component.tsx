import React from "react";

import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { WbSponsorsBlock } from "@/payload-types";

import { WbSponsors } from "./ui";

export async function WbSponsorsBlockComponent(props: WbSponsorsBlock) {
  const {
    eyebrow,
    title,
    description,
    primaryCta,
    secondaryCta,
    trustedLabel,
    partnerLogos,
    cards,
  } = props;
  const locale = await resolveLocale();

  const primary = prepareLinkProps(primaryCta, locale);
  const secondary = prepareLinkProps(secondaryCta, locale);

  return (
    <WbSponsors
      eyebrow={eyebrow ?? ""}
      title={title ?? ""}
      description={description ?? ""}
      primaryCta={{ label: primary.text, href: primary.href || "#" }}
      secondaryCta={{ label: secondary.text, href: secondary.href || "#" }}
      trustedLabel={trustedLabel ?? ""}
      partnerLogos={partnerLogos ?? []}
      cards={(cards ?? []).map((card) => {
        const link = prepareLinkProps(card.link, locale);
        return {
          title: card.title ?? "",
          description: card.description ?? "",
          includes: card.includes ?? [],
          cta: link.text,
          href: link.href || "#",
        };
      })}
    />
  );
}
