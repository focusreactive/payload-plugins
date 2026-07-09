import React from "react";

import { mediaSrc } from "@/blocks/WbHero/Component";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { WbEventsBlock } from "@/payload-types";

import { WbEvents } from "./ui";

export async function WbEventsBlockComponent(props: WbEventsBlock) {
  const { eyebrow, title, cta, featured, events } = props;
  const locale = await resolveLocale();

  const sectionCta = prepareLinkProps(cta, locale);
  const featuredLink = prepareLinkProps(featured?.link, locale);

  return (
    <WbEvents
      eyebrow={eyebrow ?? ""}
      title={title ?? ""}
      cta={sectionCta.text}
      ctaHref={sectionCta.href || "#"}
      featured={{
        image: mediaSrc(featured?.image),
        pill: featured?.pill ?? "",
        date: featured?.date ?? "",
        location: featured?.location ?? "",
        title: featured?.title ?? "",
        description: featured?.description ?? "",
        cta: featuredLink.text,
        href: featuredLink.href || "#",
      }}
      events={(events ?? []).map((event) => {
        const link = prepareLinkProps(event.link, locale);
        return {
          type: event.type ?? "",
          date: event.date ?? "",
          location: event.location ?? "",
          title: event.title ?? "",
          description: event.description ?? "",
          cta: link.text,
          href: link.href || "#",
        };
      })}
    />
  );
}
