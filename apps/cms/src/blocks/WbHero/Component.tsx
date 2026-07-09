import React from "react";

import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { WbHeroBlock } from "@/payload-types";

import { WbHero } from "./ui";

// Resolve a Media upload field to its URL string (the ui takes plain URLs).
export function mediaSrc(media: unknown): string {
  return media && typeof media === "object" && "url" in media
    ? ((media as { url?: string | null }).url ?? "")
    : "";
}

export async function WbHeroBlockComponent(props: WbHeroBlock) {
  const { eyebrow, title, date, featured, compactCards, todayLinks, showTodayStrip } = props;
  const locale = await resolveLocale();

  const featuredLink = prepareLinkProps(featured?.link, locale);

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
        cta: featuredLink.text,
        href: featuredLink.href || "#",
      }}
      compactCards={(compactCards ?? []).map((card) => {
        const link = prepareLinkProps(card.link, locale);
        return {
          label: card.label ?? "",
          status: card.status ?? "",
          title: card.title ?? "",
          text: card.text ?? "",
          cta: link.text,
          brand: card.brand ?? "",
          href: link.href || "#",
        };
      })}
      todayLinks={(todayLinks ?? []).map((entry) => ({
        brand: entry.brand ?? "",
        title: entry.title ?? "",
        href: prepareLinkProps(entry.link, locale).href || "#",
      }))}
      showTodayStrip={showTodayStrip ?? true}
    />
  );
}
