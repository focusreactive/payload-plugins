import React from "react";

import { withLocalePrefix } from "@/lib/config/entityRoutes";
import { ENTITY_ROUTE_PREFIXES } from "@/lib/config/entityRoutes";
import type { Locale } from "@/lib/types";
import type { Footer, Header } from "@/payload-types";

import { getLocationsByState } from "./chromeData";
import { BodyAttributes } from "./SiteChromeClient";
import { SiteFooter, SiteNewsletter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** The stylesheets a page type loads on top of the base one, as on the original site. */
export const SITE_TEMPLATE_STYLES = {
  blog: ["default", "blog"],
  default: ["default"],
  doctor: ["default", "doctor"],
  home: ["home"],
  location: ["default", "location"],
  locations: ["default", "locations"],
  post: ["default", "blog"],
  region: ["default", "region"],
  symptom: ["default"],
  treatment: ["default"],
} as const;

export type SiteTemplate = keyof typeof SITE_TEMPLATE_STYLES;

const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Lora:ital@0;1&family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,500;1,700&display=swap";

interface Props {
  /** The page type: picks the stylesheets and the class on `body`. */
  template: SiteTemplate;
  /** The id the stylesheet expects on `body`, normally the page's slug. */
  bodyId: string;
  locale: Locale;
  /** The page's path without the locale prefix, for example /locations/texas. */
  path: string;
  header: Header | number | null | undefined;
  footer: Header | Footer | number | null | undefined;
  /** The page's top section, which the site places before `main`. */
  hero?: React.ReactNode;
  /** The sections inside `main`. */
  children: React.ReactNode;
}

/**
 * The frame every page of the site shares: stylesheets, the classes on `body`, the header, the
 * hero before `main`, the newsletter band and the footer.
 */
export async function SitePage({
  template,
  bodyId,
  locale,
  path,
  header,
  footer,
  hero,
  children,
}: Props) {
  const headerDoc = header && typeof header === "object" ? header : null;
  const footerDoc = footer && typeof footer === "object" ? (footer as Footer) : null;
  const locations = await getLocationsByState(locale);
  const clinicCount = locations.reduce((count, state) => count + state.clinics.length, 0);
  const bodyClass = [
    template,
    "desktop",
    "chrome",
    headerDoc?.announcement?.text ? "has-topbar" : "",
    locale === "es" ? "es" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <link href="https://fonts.gstatic.com" rel="preconnect" crossOrigin="anonymous" />
      <link href={FONTS_URL} precedence="site-fonts" rel="stylesheet" />
      <link href="/assets/css/styles.css" precedence="site-base" rel="stylesheet" />
      {SITE_TEMPLATE_STYLES[template].map((name) => (
        <link
          href={`/assets/css/templates/${name}.css`}
          key={name}
          precedence="site-template"
          rel="stylesheet"
        />
      ))}
      <link href="/assets/css/site-overrides.css" precedence="site-overrides" rel="stylesheet" />
      <BodyAttributes className={bodyClass} id={bodyId} />
      <a className="scroll-link button" href="#main" id="skip-link">
        Skip To Content
      </a>
      <SiteHeader
        clinicCount={clinicCount}
        footer={footerDoc}
        header={headerDoc}
        locale={locale}
        locationsHref={withLocalePrefix(`/${ENTITY_ROUTE_PREFIXES.locations}`, locale)}
        path={path}
      />
      {hero}
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <SiteNewsletter footer={footerDoc} />
      <SiteFooter footer={footerDoc} header={headerDoc} locale={locale} locations={locations} />
    </>
  );
}
