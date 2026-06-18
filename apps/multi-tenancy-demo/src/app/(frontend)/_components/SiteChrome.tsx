import Link from "next/link";
import type { ReactNode } from "react";

import type { Theme } from "@/lib/themes";
import { themeStyle } from "@/lib/themes";

export interface NavLink {
  label: string;
  href: string;
}

interface Props {
  theme: Theme;
  /** Brand text in the header; links to `brandHref`. */
  brand: string;
  brandHref: string;
  nav?: NavLink[];
  children: ReactNode;
}

// Minimalistic, hardcoded header + footer wrapper. Themed entirely via the CSS
// custom properties projected from the tenant's theme onto the root element.
export function SiteChrome({ theme, brand, brandHref, nav = [], children }: Props) {
  return (
    <div className="site" style={themeStyle(theme)}>
      <header className="site-header">
        <Link className="brand" href={brandHref}>
          {theme.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- tiny static brand SVG; next/image optimization is unnecessary
            <img alt={`${brand} logo`} className="brand-logo" src={theme.logo} />
          ) : (
            <span className="brand-mark" aria-hidden>
              {brand.charAt(0)}
            </span>
          )}
          {brand}
        </Link>
        {nav.length > 0 && (
          <nav className="site-nav">
            {nav.map((link) => (
              <Link href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="site-main">{children}</main>

      <footer className="site-footer">
        <span>
          Multi-tenancy demo · powered by <code>@payloadcms/plugin-multi-tenant</code>
        </span>
        <Link href="/admin">Admin panel →</Link>
      </footer>
    </div>
  );
}
