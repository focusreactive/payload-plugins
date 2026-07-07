import React from "react";

import { mediaSrc } from "@/blocks/WbHero/Component";
import type { WbEventsBlock } from "@/payload-types";

import { WbEvents } from "./ui";

export function WbEventsBlockComponent(props: WbEventsBlock) {
  const { eyebrow, title, cta, ctaHref, featured, events } = props;

  return (
    <WbEvents
      eyebrow={eyebrow ?? ""}
      title={title ?? ""}
      cta={cta ?? ""}
      ctaHref={ctaHref ?? "#"}
      featured={{
        image: mediaSrc(featured?.image),
        pill: featured?.pill ?? "",
        date: featured?.date ?? "",
        location: featured?.location ?? "",
        title: featured?.title ?? "",
        description: featured?.description ?? "",
        cta: featured?.cta ?? "",
        href: featured?.href ?? "#",
      }}
      events={(events ?? []).map((event) => ({
        type: event.type ?? "",
        date: event.date ?? "",
        location: event.location ?? "",
        title: event.title ?? "",
        description: event.description ?? "",
        cta: event.cta ?? "",
        href: event.href ?? "#",
      }))}
    />
  );
}
