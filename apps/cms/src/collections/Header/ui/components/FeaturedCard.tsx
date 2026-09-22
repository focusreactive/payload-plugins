import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import NextLink from "next/link";

import { cn } from "@/components/utils";
import { Eyebrow } from "@/components/Eyebrow";
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
          {badge}
        </Eyebrow>
      )}
      {title && (
        <span className="mt-auto font-display text-[1.32rem] leading-[1.08] tracking-[-0.01em] text-foreground">
          {title}
        </span>
      )}
      {description && (
        <span className="text-[0.88rem] leading-[1.5] text-muted-foreground">{description}</span>
      )}
      {link && (
        <span className="inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-primary">
          {link.label}
          <span aria-hidden>&rarr;</span>
        </span>
      )}
    </>
  );

  /**
   * A flat sunken band, not a gradient tile: DESIGN.md bans gradients outright and the serif is
   * never bold, so the title carries weight through size rather than a heavier weight.
   */
  const cardClassName =
    "flex min-h-[196px] flex-col gap-[9px] rounded-[4px] border border-border bg-surface-muted p-5";

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
