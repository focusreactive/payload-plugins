import * as NavigationMenu from "@radix-ui/react-navigation-menu";
import NextLink from "next/link";

import { AbstractBackdrop } from "@/components/AbstractBackdrop";
import type { HeaderFeatured } from "../types";

interface FeaturedCardProps {
  featured: HeaderFeatured;
}

const cardClassName =
  "group relative flex min-h-[220px] flex-col gap-2.5 overflow-hidden rounded-lg bg-ct-dark-blue p-5 text-ct-white";

export function FeaturedCard({ featured }: FeaturedCardProps) {
  const { badge, title, description, link } = featured;

  const content = (
    <>
      <AbstractBackdrop tone="dark" intensity="subtle" />
      {badge && <span className="relative text-eyebrow text-ct-electric-green">{badge}</span>}
      {title && (
        <span className="relative mt-auto text-[1.25rem] font-semibold leading-[1.2] text-ct-white">
          {title}
        </span>
      )}
      {description && (
        <span className="relative text-[0.875rem] leading-[1.5] text-ct-grey-300">
          {description}
        </span>
      )}
      {link && (
        <span className="relative inline-flex items-center gap-1.5 text-[0.875rem] font-semibold text-ct-electric-green">
          {link.label}
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </span>
      )}
    </>
  );

  if (link) {
    const newTabProps = link.newTab ? { rel: "noopener noreferrer", target: "_blank" } : {};

    return (
      <NavigationMenu.Link asChild>
        <NextLink href={link.href} className={cardClassName} {...newTabProps}>
          {content}
        </NextLink>
      </NavigationMenu.Link>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}
