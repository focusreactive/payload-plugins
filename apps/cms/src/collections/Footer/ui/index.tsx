import NextLink from "next/link";

import { DiagonalBand } from "@/components/DiagonalBand";
import { Bluesky, Linkedin, Mastodon, Youtube } from "@/components/icons";
import { Media } from "@/components/media";
import type { MediaProps, PreparedMedia } from "@/components/media";

import type { FooterLink, FooterSocialPlatform, IFooterProps } from "./types";

const SOCIAL: Record<FooterSocialPlatform, { label: string; Icon: typeof Linkedin }> = {
  bluesky: { Icon: Bluesky, label: "Bluesky" },
  linkedin: { Icon: Linkedin, label: "LinkedIn" },
  mastodon: { Icon: Mastodon, label: "Mastodon" },
  youtube: { Icon: Youtube, label: "YouTube" },
};

function toLogoMediaProps(logo: PreparedMedia): MediaProps {
  const imageProps = {
    ...logo.imageProps,
    className: "h-9 w-auto",
  };

  return logo.data.kind === "video"
    ? { ...logo.data, visualEditing: logo.visualEditing, imageProps }
    : { ...logo.data, visualEditing: logo.visualEditing, imageProps, width: 168, height: 36 };
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

const linkClassName =
  "inline-block py-1 text-[0.875rem] text-ct-white underline-offset-[3px] decoration-ct-electric-green decoration-2 transition-colors hover:underline hover:text-ct-electric-green";

/**
 * §6.6 footer: the light-green angled band (it overlaps the section above, so the sand CTA band or a
 * white page shows through its empty half), then the dark-blue footer with link columns, ISO chips,
 * socials and the legal line.
 */
export function Footer({
  brand,
  description,
  linkGroups,
  legalLinks,
  socialLinks,
  badges,
  copywriteText,
}: IFooterProps) {
  return (
    <footer className="relative">
      <DiagonalBand color="light-green" className="relative z-[2] -mt-[clamp(32px,5vw,96px)]" />
      <div data-theme="dark" className="dark-zone relative z-[2] bg-ct-dark-blue text-ct-white">
        <div className="mx-auto max-w-containerMaxW px-containerBase pb-10 pt-16">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
            <div className="flex flex-col gap-6">
              <NextLink href={brand.href} aria-label={brand.label || "Home"} className="w-fit">
                {brand.logo ? (
                  <Media {...toLogoMediaProps(brand.logo)} />
                ) : (
                  <span className="text-xl font-bold">{brand.label}</span>
                )}
              </NextLink>
              {description ? (
                <p className="max-w-[34ch] text-small text-ct-grey-300">{description}</p>
              ) : null}
              {badges.length > 0 && (
                <ul className="flex flex-wrap gap-2" aria-label="Certifications">
                  {badges.map((badge, index) => (
                    <li
                      key={index}
                      className="rounded-sm border border-white/30 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ct-white"
                    >
                      {badge.label}
                      {badge.certificate ? (
                        <span className="text-ct-grey-300"> · {badge.certificate}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {socialLinks.length > 0 && (
                <ul className="flex gap-1" aria-label="Social media">
                  {socialLinks.map((social, index) => {
                    const { Icon, label } = SOCIAL[social.platform];
                    return (
                      <li key={index}>
                        <a
                          href={social.url}
                          rel="noopener noreferrer"
                          target="_blank"
                          aria-label={label}
                          className="inline-flex size-11 items-center justify-center rounded-md text-ct-white transition-colors hover:bg-white/10 hover:text-ct-electric-green"
                        >
                          <Icon size={22} />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {linkGroups.map((group, groupIndex) => (
                <nav aria-label={group.label} key={groupIndex}>
                  <h2 className="mb-3 text-eyebrow text-ct-grey-300">{group.label}</h2>
                  <ul className="flex flex-col">
                    {group.links.map((link, linkIndex) => (
                      <li key={linkIndex}>
                        <FooterAnchor className={linkClassName} link={link} />
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-6 text-[0.75rem] text-ct-grey-300">
            {copywriteText ? <p className="max-w-[90ch]">{copywriteText}</p> : <span />}
            {legalLinks.length > 0 ? (
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {legalLinks.map((link, index) => (
                  <li key={index}>
                    <FooterAnchor
                      className="underline-offset-[3px] transition-colors hover:text-ct-electric-green hover:underline"
                      link={link}
                    />
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
