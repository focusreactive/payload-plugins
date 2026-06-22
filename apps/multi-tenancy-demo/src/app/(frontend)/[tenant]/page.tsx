import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";

import config from "@/payload.config";
import { getTheme } from "@/lib/themes";
import { SiteChrome } from "../_components/SiteChrome";

// Reads live tenant data per request — never prerender against an empty DB.
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ tenant: string }>;
}

export default async function TenantPage({ params }: Props) {
  const { tenant: tenantSlug } = await params;
  const payload = await getPayload({ config });

  const { docs: tenants } = await payload.find({
    collection: "tenants",
    limit: 100,
    where: { slug: { equals: tenantSlug } },
  });

  const tenant = tenants[0];
  if (!tenant) {
    notFound();
  }

  const theme = getTheme(tenant.slug);

  // Only the pages belonging to this tenant — the `tenant` field is injected by
  // the multi-tenant plugin. This is the frontend equivalent of selecting the
  // tenant in the admin panel.
  const { docs: pages } = await payload.find({
    collection: "pages",
    limit: 100,
    sort: "slug",
    where: { tenant: { equals: tenant.id } },
  });

  const mySlugs = new Set(pages.map((page) => page.slug));

  // Pull the OTHER tenants' pages to demonstrate isolation: a slug that only
  // exists for another tenant 404s here, even though it's a perfectly valid
  // page over there.
  const { docs: foreignPages } = await payload.find({
    collection: "pages",
    limit: 100,
    where: { tenant: { not_equals: tenant.id } },
  });
  const foreignOnly = foreignPages.filter((page) => !mySlugs.has(page.slug));

  const nav = pages.map((page) => ({ label: page.title, href: `/${tenant.slug}/${page.slug}` }));

  return (
    <SiteChrome theme={theme} brand={tenant.name} brandHref={`/${tenant.slug}`} nav={nav}>
      <Link className="back-link" href="/">
        ← All tenants
      </Link>

      <section className="hero">
        <h1 className="hero-title gradient">{tenant.name}</h1>
        <p className="hero-tagline">{theme.blurb}</p>
      </section>

      <h2 className="section-title">Pages</h2>
      {pages.length === 0 ? (
        <p className="empty">This tenant has no pages yet.</p>
      ) : (
        <ul className="page-grid">
          {pages.map((page) => (
            <li key={page.id}>
              <Link className="page-card" href={`/${tenant.slug}/${page.slug}`}>
                <strong>{page.title}</strong>
                {page.tagline ? <span>{page.tagline}</span> : null}
                <code>
                  /{tenant.slug}/{page.slug}
                </code>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="isolation">
        <h2 className="section-title">Tenant isolation</h2>
        <p className="isolation-note">
          These slugs belong to other tenants. They&apos;re valid pages there, but requesting them
          under <code>/{tenant.slug}</code> returns a <strong>404</strong> — the plugin scopes every
          query to the active tenant.
        </p>
        {foreignOnly.length === 0 ? (
          <p className="empty">No foreign-only slugs to try.</p>
        ) : (
          <ul className="isolation-list">
            {foreignOnly.map((page) => (
              <li key={page.id}>
                <Link href={`/${tenant.slug}/${page.slug}`}>
                  /{tenant.slug}/{page.slug}
                </Link>
                <span className="isolation-tag">404 — not in this tenant</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </SiteChrome>
  );
}
