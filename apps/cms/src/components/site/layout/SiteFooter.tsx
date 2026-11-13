import React from "react";

import { SiteBackground, SiteImage, mediaUrl } from "@/components/site/SiteImage";
import { InlineRichText, SiteRichText, hasRichText } from "@/components/site/SiteRichText";
import { withLocalePrefix } from "@/lib/config/entityRoutes";
import { telHref } from "@/lib/site/links";
import type { Locale } from "@/lib/types";
import type { Footer, Header } from "@/payload-types";

import { footerLinks, headerMenuLinks } from "./chromeData";
import type { ChromeLink, StateLocations } from "./chromeData";
import { SiteAccordionItem } from "./SiteChromeClient";
import { SocialLinks } from "./SocialLinks";

interface Props {
  header: Header | null;
  footer: Footer | null;
  locale: Locale;
  locations: StateLocations[];
}

const targetProps = (link: ChromeLink) =>
  link.newTab ? { rel: "noreferrer", target: "_blank" } : {};

function LocationsList({
  heading,
  locations,
}: {
  heading?: string | null;
  locations: StateLocations[];
}) {
  return (
    <ul className="footer-locations">
      {heading && <li>{heading}</li>}
      {locations.map((state) => (
        <SiteAccordionItem
          key={state.id}
          title={
            <>
              <span>
                <a href={state.href}>{state.name}</a>
              </span>{" "}
              ({state.clinics.length})
            </>
          }
        >
          <ul>
            {state.clinics.map((clinic) => (
              <li key={clinic.id}>
                <a href={clinic.href}>{clinic.name}</a>
              </li>
            ))}
          </ul>
        </SiteAccordionItem>
      ))}
    </ul>
  );
}

export function SiteNewsletter({ footer }: Pick<Props, "footer">) {
  const newsletter = footer?.newsletter;

  if (!hasRichText(newsletter?.title)) {
    return null;
  }

  const mobileImage = mediaUrl(newsletter?.mobileImage);

  return (
    <section id="newsletter">
      <SiteBackground media={newsletter?.image} />
      {mobileImage && (
        <style>{`@media (max-width: 767px) { #newsletter .bg-container { background-image: url("${mobileImage}") !important; } }`}</style>
      )}
      <div className="container">
        <div className="title">
          <InlineRichText data={newsletter?.title} />
        </div>
        {newsletter?.text && <p>{newsletter.text}</p>}
        <div className="hbspt-form">
          <form action="#">
            <input aria-label="Email" name="email" placeholder="Email*" type="email" />
            <input
              className="hs-button"
              type="submit"
              value={newsletter?.buttonText || "Subscribe"}
            />
          </form>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter({ header, footer, locale, locations }: Props) {
  const menu = headerMenuLinks(header, locale);
  const groups = (footer?.linkGroups ?? []).map((group) => footerLinks(group.links, locale));
  const legalLinks = footerLinks(footer?.legalLinks, locale);
  const phone = footer?.phone;
  const logoAlt = footer?.name ? `${footer.name} Logo` : "";

  return (
    <footer id="footer">
      <div className="container">
        <div id="footer-top">
          <div>
            <figure>
              <a href={withLocalePrefix("/", locale)}>
                <SiteImage alt={logoAlt} height={23} media={footer?.logo} width={250} />
              </a>
            </figure>
            {phone && <a href={telHref(phone)}>{phone}</a>}
            <div id="footer-seo">
              <LocationsList heading={footer?.locationsHeading} locations={locations} />
              {footer?.about?.heading && <h2 className="small">{footer.about.heading}</h2>}
              <SiteRichText data={footer?.about?.text} locale={locale} />
            </div>
          </div>
          <div id="footer-menu">
            <ul className="main-menu">
              {menu.map((link) => (
                <li key={`${link.href}-${link.label}`}>
                  <a href={link.href} {...targetProps(link)}>
                    <span>{link.label}</span>
                  </a>
                </li>
              ))}
            </ul>
            {groups.map((links, index) => (
              <ul className="footer-menu" key={index}>
                {links.map((link) => (
                  <li key={`${link.href}-${link.label}`}>
                    <a href={link.href} {...targetProps(link)}>
                      <span>{link.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ))}
            <LocationsList heading={footer?.locationsHeading} locations={locations} />
          </div>
        </div>
        <div id="social-mobile">
          <SocialLinks profiles={footer?.social} />
        </div>
        {phone && <a href={telHref(phone)}>{phone}</a>}
        <div id="footer-copyright">
          <SocialLinks profiles={footer?.social} />
          <div className="copyright">
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
        {(footer?.disclaimer?.heading || footer?.disclaimer?.text) && (
          <div id="footer-disclaimer">
            {footer.disclaimer.heading && <h2 className="small">{footer.disclaimer.heading}</h2>}
            {footer.disclaimer.text && <p>{footer.disclaimer.text}</p>}
          </div>
        )}
      </div>
    </footer>
  );
}
