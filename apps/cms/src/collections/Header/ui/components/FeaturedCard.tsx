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
        <Eyebrow tone="outline" size="sm" className="self-start">
          {badge}
        </Eyebrow>
      )}
      {title && <span className="mt-auto text-h-item text-foreground">{title}</span>}
      {description && <span className="text-small text-muted-foreground">{description}</span>}
      {link && (
        <span className="inline-flex items-center gap-1 text-small font-medium capitalize text-foreground">
          {link.label}
          <span aria-hidden>&rsaquo;</span>
        </span>
      )}
    </>
  );
  const cardClassName =
    "flex min-h-[196px] flex-col gap-3 rounded-lg border border-border-strong bg-surface p-6 text-foreground shadow-glow-card";

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
