import Link from "next/link";
import { getPayload } from "payload";

import config from "@/payload.config";
import { getTheme, neutralTheme, themeStyle } from "@/lib/themes";
import { SiteChrome } from "./_components/SiteChrome";

// Reads live tenant data per request — never prerender against an empty DB.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const payload = await getPayload({ config });
  const { docs: tenants } = await payload.find({
    collection: "tenants",
    limit: 100,
    sort: "name",
  });

  return (
    <SiteChrome theme={neutralTheme} brand="Multi-Tenancy Demo" brandHref="/">
      <section className="hero">
        <h1 className="hero-title">One Payload app, many isolated tenants.</h1>
        <p className="hero-tagline">
          Each tenant below owns its own pages and its own look. Pick one to preview only that tenant&apos;s content — the frontend equivalent of the admin tenant selector.
        </p>
      </section>

      {tenants.length === 0 ? (
        <p className="empty">
          No tenants yet. Run <code>bun run seed</code> in <code>apps/multi-tenancy-demo</code> to create the demo tenants.
        </p>
      ) : (
        <ul className="tenant-grid">
          {tenants.map((tenant) => {
            const theme = getTheme(tenant.slug);
            return (
              <li key={tenant.id}>
                <Link className="tenant-card" href={`/${tenant.slug}`} style={themeStyle(theme)}>
                  {theme.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- tiny static brand SVG; next/image optimization is unnecessary
                    <img alt={`${tenant.name} logo`} className="tenant-card-logo" src={theme.logo} />
                  ) : (
                    <span className="tenant-card-mark" aria-hidden>
                      {tenant.name.charAt(0)}
                    </span>
                  )}
                  <strong>{tenant.name}</strong>
                  <span className="tenant-card-blurb">{theme.blurb}</span>
                  <span className="tenant-card-slug">/{tenant.slug}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </SiteChrome>
  );
}
