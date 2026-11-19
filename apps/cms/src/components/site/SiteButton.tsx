import React from "react";

import { siteLinkHref, siteLinkTarget } from "@/lib/site/links";
import type { SiteLinkValue } from "@/lib/site/links";

interface SiteButtonValue {
  text?: string | null;
  link?: SiteLinkValue | null;
}

interface Props {
  button: SiteButtonValue | null | undefined;
  locale: string;
  className?: string;
}

/** The section's button as the site's own `a.button`; renders nothing while text or link is empty. */
export function SiteButton({ button, locale, className = "button" }: Props) {
  const href = siteLinkHref(button?.link, locale);

  if (!button?.text || !href) {
    return null;
  }

  return (
    <a className={className} href={href} {...siteLinkTarget(button.link)}>
      {button.text}
    </a>
  );
}
