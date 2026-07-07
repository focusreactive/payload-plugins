import React from "react";

import type { WbSponsorsBlock } from "@/payload-types";

import { WbSponsors } from "./ui";

export function WbSponsorsBlockComponent(props: WbSponsorsBlock) {
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

  return (
    <WbSponsors
      eyebrow={eyebrow ?? ""}
      title={title ?? ""}
      description={description ?? ""}
      primaryCta={{
        label: primaryCta?.label ?? "",
        href: primaryCta?.href ?? "#",
      }}
      secondaryCta={{
        label: secondaryCta?.label ?? "",
        href: secondaryCta?.href ?? "#",
      }}
      trustedLabel={trustedLabel ?? ""}
      partnerLogos={partnerLogos ?? []}
      cards={(cards ?? []).map((card) => ({
        title: card.title ?? "",
        description: card.description ?? "",
        includes: card.includes ?? [],
        cta: card.cta ?? "",
        href: card.href ?? "#",
      }))}
    />
  );
}
