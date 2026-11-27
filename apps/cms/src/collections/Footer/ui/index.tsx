import NextLink from "next/link";

import { Media } from "@/components/media";
import type { MediaProps, PreparedMedia } from "@/components/media";
import { SOCIAL_PLATFORM_LABELS, SocialIcon } from "@/components/SocialIcon";
import { cn } from "@/components/utils";
import type { FooterLink, IFooterProps } from "./types";

function toLogoMediaProps(logo: PreparedMedia): MediaProps {
  const imageProps = {
    ...logo.imageProps,
    className: "h-9 w-auto md:h-12",
  };

  return logo.data.kind === "video"
    ? { ...logo.data, visualEditing: logo.visualEditing, imageProps }
    : { ...logo.data, visualEditing: logo.visualEditing, imageProps, width: 256, height: 48 };
}

const linkClassName =
  "text-body text-foreground transition-opacity duration-150 hover:opacity-70 motion-reduce:transition-none";

function FooterAnchor({ link, className }: { link: FooterLink; className?: string }) {
  return (
    <NextLink
      href={link.href}
      target={link.newTab ? "_blank" : undefined}
      rel={link.newTab ? "noopener noreferrer" : undefined}
      className={cn(linkClassName, className)}
    >
      {link.label}
    </NextLink>
  );
}

const columnsClassName: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

const middleSpanClassName: Record<number, string> = {
  1: "sm:col-span-1",
  2: "sm:col-span-2",
};

export function Footer({
  brand,
  description,
  linkGroups,
  legalLinks,
  socialLinks,
  copywriteText,
}: IFooterProps) {
  const columnCount = Math.min(Math.max(linkGroups.length, 1), 4);
  const [firstLegalLink, ...restLegalLinks] = legalLinks;
  // Bottom row mirrors the columns above it: first legal link under the first
  // column, the remaining ones under the middle columns, socials under the last.
  const middleSpan = Math.max(columnCount - 2, 1);
  const hasBottomRow = legalLinks.length > 0 || socialLinks.length > 0;

  return (
    <footer className="relative rounded-t-2xl border-t border-border bg-surface text-foreground backdrop-blur-glass-lg">
      <div className="mx-auto grid max-w-containerMaxW grid-cols-1 gap-x-gridGap gap-y-14 px-containerBase py-14 md:py-20 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-4 lg:pr-12">
          <div className="flex flex-1 flex-col items-start pb-10 lg:pb-0">
            <NextLink
              href={brand.href}
              aria-label={brand.label}
              className="inline-flex items-center text-h-card"
            >
              {brand.logo ? <Media {...toLogoMediaProps(brand.logo)} /> : brand.label}
            </NextLink>
          </div>
          {description ? (
            <p className="max-w-[36ch] whitespace-pre-line text-body text-foreground">
              {description}
            </p>
          ) : null}
          {copywriteText ? (
            <p className="text-body text-subtle-foreground">{copywriteText}</p>
          ) : null}
        </div>

        <div
          className={cn(
            "grid grid-cols-2 gap-x-gridGap gap-y-12 lg:col-span-6 lg:col-start-7",
            columnsClassName[columnCount]
          )}
        >
          {linkGroups.map((group, groupIndex) => (
            <nav aria-label={group.label} key={groupIndex} className="flex flex-col gap-6">
              <h5 className="text-overline text-subtle-foreground">{group.label}</h5>
              <ul className="flex flex-col gap-3">
                {group.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <FooterAnchor link={link} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {hasBottomRow ? (
            <div
              className={cn(
                "col-span-full grid grid-cols-2 items-center gap-x-gridGap gap-y-6 pt-2 lg:pt-8",
                columnsClassName[columnCount]
              )}
            >
              <div>{firstLegalLink ? <FooterAnchor link={firstLegalLink} /> : null}</div>

              {columnCount > 2 || restLegalLinks.length > 0 ? (
                <ul
                  className={cn(
                    "flex flex-wrap items-center gap-x-4 gap-y-2",
                    columnCount > 2 && middleSpanClassName[middleSpan]
                  )}
                >
                  {restLegalLinks.map((link, index) => (
                    <li key={index}>
                      <FooterAnchor link={link} />
                    </li>
                  ))}
                </ul>
              ) : null}

              {socialLinks.length > 0 ? (
                <ul className="col-span-full flex flex-wrap items-center gap-3 sm:col-span-1">
                  {socialLinks.map((social, index) => (
                    <li key={index}>
                      <a
                        href={social.href}
                        {...(social.newTab ? { rel: "noopener noreferrer", target: "_blank" } : {})}
                        aria-label={SOCIAL_PLATFORM_LABELS[social.platform]}
                        className="inline-flex text-foreground transition-opacity duration-150 hover:opacity-70 motion-reduce:transition-none"
                      >
                        <SocialIcon platform={social.platform} />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
