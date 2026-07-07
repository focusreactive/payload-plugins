import React from "react";

import type { WbHeroBlock } from "@/payload-types";

import { WbHero } from "./ui";

// Resolve a Media upload field to its URL string (the ui takes plain URLs).
export function mediaSrc(media: unknown): string {
  return media && typeof media === "object" && "url" in media
    ? ((media as { url?: string | null }).url ?? "")
    : "";
}

export function WbHeroBlockComponent(props: WbHeroBlock) {
  const { eyebrow, title, date, featured, compactCards, todayLinks, showTodayStrip } = props;

  return (
    <WbHero
      eyebrow={eyebrow ?? ""}
      title={title ?? ""}
      date={date ?? ""}
      featured={{
        image: mediaSrc(featured?.image),
        category: featured?.category ?? "",
        brand: featured?.brand ?? "",
        title: featured?.title ?? "",
        excerpt: featured?.excerpt ?? "",
        cta: featured?.cta ?? "",
        href: featured?.href ?? "#",
      }}
      compactCards={(compactCards ?? []).map((card) => ({
        label: card.label ?? "",
        status: card.status ?? "",
        title: card.title ?? "",
        text: card.text ?? "",
        cta: card.cta ?? "",
        brand: card.brand ?? "",
        href: card.href ?? "#",
      }))}
      todayLinks={(todayLinks ?? []).map((link) => ({
        brand: link.brand ?? "",
        title: link.title ?? "",
        href: link.href ?? "#",
      }))}
      showTodayStrip={showTodayStrip ?? true}
    />
  );
}
