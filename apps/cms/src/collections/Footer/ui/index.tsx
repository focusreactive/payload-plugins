import NextLink from "next/link";

import { Media } from "@/components/media";
import type { MediaProps, PreparedMedia } from "@/components/media";

import type { FooterLink, IFooterProps } from "./types";

/*
 * Tailwind compiles only the class names it can read as literal text, so a template string built
 * from the group count would emit no CSS. Every template an editor can produce is spelled out.
 */
const COLUMN_TEMPLATE_BY_GROUP_COUNT: Record<number, string> = {
  1: "lg:grid-cols-[minmax(0,6fr)_minmax(0,2fr)]",
  2: "lg:grid-cols-[minmax(0,6fr)_repeat(2,minmax(0,2fr))]",
  3: "lg:grid-cols-[minmax(0,6fr)_repeat(3,minmax(0,2fr))]",
  4: "lg:grid-cols-[minmax(0,6fr)_repeat(4,minmax(0,2fr))]",
};

const TOP_GRID_BASE_CLASSES =
  "grid grid-cols-1 gap-[clamp(24px,3vw,56px)] pb-[clamp(32px,4vw,64px)] sm:grid-cols-2";

function toLogoMediaProps(logo: PreparedMedia): MediaProps {
  const imageProps = {
    ...logo.imageProps,
    className: "block h-10 w-auto max-w-[min(100%,340px)] object-contain",
  };

  /*
   * The wrapper carries its own cap so the percentage above resolves against the width of the
   * link, which is what keeps a wide logo inside a 320px viewport instead of overflowing it.
   */
  const className = "max-w-full";

  return logo.data.kind === "video"
    ? { ...logo.data, className, imageProps, visualEditing: logo.visualEditing }
    : {
        ...logo.data,
        className,
        height: 40,
        imageProps,
        visualEditing: logo.visualEditing,
        width: 304,
      };
}

function FooterAnchor({ link, className }: { link: FooterLink; className?: string }) {
  return (
    <NextLink
      href={link.href}
      target={link.newTab ? "_blank" : undefined}
      rel={link.newTab ? "noopener noreferrer" : undefined}
      className={className}
    >
      {link.label}
    </NextLink>
  );
}

export function Footer({
  brand,
  description,
  linkGroups,
  legalLinks,
  copywriteText,
}: IFooterProps) {
  const columnTemplate =
    COLUMN_TEMPLATE_BY_GROUP_COUNT[linkGroups.length] ?? COLUMN_TEMPLATE_BY_GROUP_COUNT[3];

  return (
    <footer className="bg-background text-foreground border-t border-border">
      <div className="mx-auto w-full max-w-containerMaxW px-containerBase pb-10 pt-[72px]">
        <div className={`${TOP_GRID_BASE_CLASSES} ${columnTemplate}`}>
          <div className="flex min-w-0 flex-col gap-[clamp(20px,2.4vw,40px)] sm:col-span-2 lg:col-span-1">
            <NextLink href={brand.href} className="block w-fit max-w-full">
              {brand.logo ? (
                <Media {...toLogoMediaProps(brand.logo)} />
              ) : (
                <span className="text-h-card">{brand.label}</span>
              )}
            </NextLink>
            {description ? (
              <p className="text-muted-foreground max-w-[44ch] text-pretty text-body-lg">
                {description}
              </p>
            ) : null}
          </div>

          {linkGroups.map((group, groupIndex) => (
            <nav aria-label={group.label} className="min-w-0" key={groupIndex}>
              <h5 className="text-foreground mb-[clamp(14px,1.6vw,24px)] text-eyebrow">
                {group.label}
              </h5>
              <ul className="flex flex-col gap-[clamp(10px,1.1vw,14px)]">
                {group.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <FooterAnchor
                      className="text-foreground hover:text-primary block text-body-lg leading-[1.4] transition-colors duration-250 motion-reduce:transition-none"
                      link={link}
                    />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="border-border flex flex-wrap items-center justify-between gap-[clamp(12px,1.6vw,24px)] border-t pt-[clamp(20px,2.2vw,32px)]">
          {copywriteText ? (
            <span className="text-muted-foreground text-small">{copywriteText}</span>
          ) : (
            <span />
          )}
          {legalLinks.length > 0 ? (
            <ul className="flex flex-wrap items-center gap-[clamp(16px,2vw,32px)]">
              {legalLinks.map((link, index) => (
                <li key={index}>
                  <FooterAnchor
                    className="text-muted-foreground hover:text-primary text-small transition-colors duration-250 motion-reduce:transition-none"
                    link={link}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
