import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import NextLink from "next/link";

import { cn } from "@/components/ui/utils";
import { Eyebrow } from "@/components/ui/primitives/Eyebrow";
import type { HeaderFeatured } from "../types";

interface FeaturedCardProps {
  featured: HeaderFeatured;
}

export function FeaturedCard({ featured }: FeaturedCardProps) {
  const { badge, title, description, link } = featured;

  const content = (
    <>
      {badge && (
        <Eyebrow tone="accent" prefix="dot" size="md" className="self-start">
          <span aria-hidden className="size-1.5 rounded-pill bg-accent-foreground opacity-50" />
          {badge}
        </Eyebrow>
      )}
      {title && (
        <span className="mt-auto font-display text-[1.32rem] font-semibold leading-[1.08] tracking-[-0.01em]">
          {title}
        </span>
      )}
      {description && (
        <span className="text-[0.88rem] leading-[1.5] text-white/80">{description}</span>
      )}
      {link && (
        <span className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-accent">
          {link.label}
          <span aria-hidden>&rarr;</span>
        </span>
      )}
    </>
  );

  const cardClassName =
    "flex min-h-[196px] flex-col gap-[9px] rounded-md bg-gradient-to-br from-primary to-deep-900 p-5 text-white";

  if (link) {
    const newTabProps = link.newTab ? { rel: "noopener noreferrer", target: "_blank" } : {};

    return (
      <NavigationMenu.Link asChild>
        <NextLink
          href={link.href}
          className={cn(
            cardClassName,
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          )}
          {...newTabProps}
        >
          {content}
        </NextLink>
      </NavigationMenu.Link>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}
