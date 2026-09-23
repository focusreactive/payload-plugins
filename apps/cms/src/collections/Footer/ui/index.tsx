import NextLink from "next/link";

import { Media } from "@/components/media";
import type { MediaProps, PreparedMedia } from "@/components/media";
import { Button } from "@/shared/ui/shadcn/base/buttons/button";

import type { FooterLink, IFooterProps } from "./types";

function toLogoMediaProps(logo: PreparedMedia): MediaProps {
  const imageProps = {
    ...logo.imageProps,
    className: "h-7 w-auto",
  };

  return logo.data.kind === "video"
    ? { ...logo.data, visualEditing: logo.visualEditing, imageProps }
    : { ...logo.data, visualEditing: logo.visualEditing, imageProps, width: 120, height: 30 };
}

function FooterAnchor({
  link,
  color,
  size,
  className,
}: {
  link: FooterLink;
  color: "link-gray";
  size: "md" | "sm";
  className?: string;
}) {
  return (
    <Button
      color={color}
      size={size}
      href={link.href}
      target={link.newTab ? "_blank" : undefined}
      rel={link.newTab ? "noopener noreferrer" : undefined}
      className={className}
    >
      {link.label}
    </Button>
  );
}

export function Footer({
  brand,
  description,
  linkGroups,
  legalLinks,
  copywriteText,
}: IFooterProps) {
  return (
    <footer className="bg-primary py-12 md:pt-16">
      <div className="mx-auto max-w-container px-4 md:px-8">
        <nav>
          {/*
           * grid-cols-2/md:grid-cols-3/lg:grid-cols-6 is Untitled UI's literal footer-large-01
           * class, tuned for their 6-category placeholder data. linkGroups is capped at 4
           * (Footer/config.ts maxRows), so at the lg breakpoint the last two grid cells sit
           * empty rather than the row stretching to fill - left as-is per the no-invented-classes
           * rule rather than substituting a column count they never shipped.
           */}
          <ul className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
            {linkGroups.map((group, groupIndex) => (
              <li key={groupIndex}>
                <h4 className="text-sm font-semibold text-quaternary">{group.label}</h4>
                <ul className="mt-4 flex flex-col gap-3">
                  {group.links.map((link, linkIndex) => (
                    <li key={linkIndex} className="flex">
                      <FooterAnchor
                        link={link}
                        color="link-gray"
                        size="md"
                        className="max-h-5 gap-1"
                      />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-12 flex flex-col justify-between gap-6 border-t border-secondary pt-8 md:mt-16 md:flex-row md:items-center">
          <div className="flex flex-col gap-2">
            <NextLink href={brand.href} className="inline-flex w-min items-center">
              {brand.logo ? <Media {...toLogoMediaProps(brand.logo)} /> : brand.label}
            </NextLink>
            {/* Untitled UI's footer-large-01 bottom bar has no description slot; description is
                our own CMS data, so it is rendered minimally here using their text token scale. */}
            {description ? <p className="max-w-xs text-sm text-tertiary">{description}</p> : null}
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
            {copywriteText ? <p className="text-sm text-quaternary">{copywriteText}</p> : null}
            {/* Untitled UI's footer-large-01 bottom bar has no legal-links slot (only a logo and
                one copyright line); legalLinks is our own CMS data, so it is rendered minimally
                here reusing their own Button link-gray variant. */}
            {legalLinks.length > 0 ? (
              <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {legalLinks.map((link, index) => (
                  <li key={index}>
                    <FooterAnchor link={link} color="link-gray" size="sm" />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
