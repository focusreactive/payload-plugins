import React from "react";

import { SiteImage, mediaOf } from "@/components/site/SiteImage";
import { withLocalePrefix } from "@/lib/config/entityRoutes";
import { I18N_CONFIG } from "@/lib/config/i18n";
import { siteLinkHref, telHref } from "@/lib/site/links";
import type { Locale } from "@/lib/types";
import type { Footer, Header } from "@/payload-types";

import { footerLinks, headerActions, headerMenuLinks, siteLinks } from "./chromeData";
import type { ChromeLink } from "./chromeData";
import { MenuButton, StickyHeaderEffect } from "./SiteChromeClient";
import { SocialLinks } from "./SocialLinks";

interface Props {
  header: Header | null;
  footer: Footer | null;
  locale: Locale;
  /** The page's path without the locale prefix, so the language links keep the visitor on it. */
  path: string;
  clinicCount: number;
  locationsHref: string;
}

const targetProps = (link: ChromeLink) =>
  link.newTab ? { rel: "noreferrer", target: "_blank" } : {};

function MenuList({
  links,
  className,
  id,
}: {
  links: ChromeLink[];
  className: string;
  id?: string;
}) {
  return (
    <ul className={className} id={id}>
      {links.map((link) => (
        <li key={`${link.href}-${link.label}`}>
          <a href={link.href} {...targetProps(link)}>
            <span>{link.label}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function LanguageSwitcher({ locale, path }: Pick<Props, "locale" | "path">) {
  return (
    <ul className="language-switcher notranslate">
      {I18N_CONFIG.locales.map(({ code }) => (
        <li key={code}>
          <a
            className={code === locale ? "current" : undefined}
            href={withLocalePrefix(path, code)}
            hrefLang={`${code}-us`}
          >
            {code}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function SiteHeader({ header, footer, locale, path, clinicCount, locationsHref }: Props) {
  const homeHref = withLocalePrefix("/", locale);
  const menu = headerMenuLinks(header, locale);
  const [action] = headerActions(header, locale);
  const moreLinks = siteLinks(header?.moreLinks, locale);
  const legalLinks = footerLinks(footer?.legalLinks, locale);
  const announcementHref = siteLinkHref(header?.announcement?.link, locale);
  const logoAlt = header?.name ? `${header.name} Logo` : "";
  const phone = header?.phone;

  return (
    <div id="header">
      <StickyHeaderEffect />
      {header?.announcement?.text && (
        <div id="topbar">
          <div className="container">
            <ul id="announcements">
              <li className="current">
                <p>
                  <a className="arrow" href={announcementHref}>
                    <strong>{header.announcement.text}</strong>
                  </a>
                </p>
              </li>
            </ul>
          </div>
        </div>
      )}
      <div id="nav-wrap">
        <div className="container">
          <figure id="logo">
            <a href={homeHref}>
              <SiteImage
                alt={logoAlt}
                className="not-lazy"
                eager
                height={23}
                media={header?.logo}
                width={250}
              />
            </a>
          </figure>
          <figure id="logo-mobile">
            <a href={homeHref}>
              <SiteImage
                alt={logoAlt}
                className="not-lazy"
                eager
                height={33}
                media={mediaOf(header?.mobileLogo) ?? header?.logo}
                width={90}
              />
            </a>
          </figure>
          <MenuList className="main-menu" id="desktop-menu" links={menu} />
          {action && (
            <a className="button" href={action.href} {...targetProps(action)}>
              {action.label}
            </a>
          )}
          <LanguageSwitcher locale={locale} path={path} />
          <MenuButton />
          <div id="mobile-menu-container">
            <MenuList className="main-menu" links={menu} />
            <MenuList className="secondary-menu" links={moreLinks} />
            <div id="mobile-cta">
              {action && (
                <a className="button" href={action.href} {...targetProps(action)}>
                  {action.label}
                </a>
              )}
              {phone && (
                <a className="tel-pink" href={telHref(phone)}>
                  {header?.phoneLabel ? `${header.phoneLabel} ` : ""}
                  {phone}
                </a>
              )}
              <div className="phone-social-container">
                <SocialLinks profiles={footer?.social} />
              </div>
              <div className="footer-copyright">
                <p>
                  {footer?.copyrightText}
                  {legalLinks.map((link) => (
                    <React.Fragment key={link.href}>
                      <a href={link.href}>{link.label}</a>{" "}
                    </React.Fragment>
                  ))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div id="mobile-language">
        <div className="container">
          {header?.locationsLabel && (
            <a className="locations-link" href={locationsHref}>
              {header.locationsLabel} ({clinicCount})
            </a>
          )}
          <LanguageSwitcher locale={locale} path={path} />
        </div>
      </div>
    </div>
  );
}
