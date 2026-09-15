import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import NextLink from "next/link";

import { cn } from "@/components/utils";
import type { HeaderFeatured } from "../types";

interface FeaturedCardProps {
  featured: HeaderFeatured;
}

/**
 * The shared Eyebrow chip is deliberately not used here: it sets its label in a pill, and this
 * design wants a 12px corner.
 */
const cardClassName =
  "flex min-h-[196px] flex-col gap-[9px] rounded-lg bg-primary-soft p-5 text-foreground";

export function FeaturedCard({ featured }: FeaturedCardProps) {
  const { badge, title, description, link } = featured;

  const content = (
    <>
      {badge && <span className="text-eyebrow text-primary">{badge}</span>}
      {title && <span className="mt-auto text-h-card">{title}</span>}
      {description && <span className="text-small text-muted-foreground">{description}</span>}
      {link && <span className="text-small font-medium text-primary">{link.label}</span>}
    </>
  );

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
