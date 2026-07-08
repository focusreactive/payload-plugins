import NextLink from "next/link";

import { Media } from "@/components/media";
import type { MediaProps, PreparedMedia } from "@/components/media";

import type { FooterLink, IFooterProps } from "./types";

function toLogoMediaProps(logo: PreparedMedia): MediaProps {
  const imageProps = {
    ...logo.imageProps,
    className: "w-auto h-7.5",
  };

  return logo.data.kind === "video"
    ? { ...logo.data, visualEditing: logo.visualEditing, imageProps }
    : { ...logo.data, visualEditing: logo.visualEditing, imageProps, width: 120, height: 30 };
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
  return (
    <footer className="bg-background text-foreground border-t border-border">
      <div className="mx-auto max-w-containerMaxW px-containerBase pb-10 pt-[72px]">
        <div className="grid grid-cols-[1.6fr_repeat(3,1fr)] gap-10 max-[760px]:grid-cols-2 max-[760px]:gap-8">
          <div className="flex flex-col">
            <NextLink
              href={brand.href}
              className="inline-flex items-center gap-2.5 font-display text-[1.4rem] font-semibold tracking-[-0.02em]"
            >
              {brand.logo ? <Media {...toLogoMediaProps(brand.logo)} /> : brand.label}
            </NextLink>
            {description ? (
              <p className="text-muted-foreground mt-4 max-w-[30ch] text-small">{description}</p>
            ) : null}
          </div>

          {linkGroups.map((group, groupIndex) => (
            <nav aria-label={group.label} key={groupIndex}>
              <h5 className="text-muted-foreground mb-4 font-mono text-[0.72rem] font-medium uppercase tracking-[0.14em]">
                {group.label}
              </h5>
              <ul className="flex flex-col">
                {group.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <FooterAnchor
                      className="text-muted-foreground hover:text-primary block py-1.5 text-[0.95rem] transition-colors motion-reduce:transition-none"
                      link={link}
                    />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="border-border text-muted-foreground mt-14 flex flex-wrap items-center justify-between gap-5 border-t pt-7 text-[0.85rem]">
          {copywriteText ? <span>{copywriteText}</span> : <span />}
          {legalLinks.length > 0 ? (
            <ul className="flex flex-wrap items-center gap-x-[18px] gap-y-2">
              {legalLinks.map((link, index) => (
                <li key={index}>
                  <FooterAnchor
                    className="hover:text-primary transition-colors motion-reduce:transition-none"
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
