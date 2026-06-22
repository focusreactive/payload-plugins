import { draftMode } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";

import config from "@/payload.config";
import { getTheme } from "@/lib/themes";
import { LivePreviewListener } from "../../_components/LivePreviewListener";
import { SiteChrome } from "../../_components/SiteChrome";

// Reads live tenant data per request — never prerender against an empty DB.
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ tenant: string; page: string }>;
}

export default async function ContentPage({ params }: Props) {
  const { tenant: tenantSlug, page: pageSlug } = await params;
  const { isEnabled: draft } = await draftMode();
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

  // The isolation guarantee in one query: match BOTH the page slug AND this
  // tenant. A slug that only exists under another tenant finds nothing here, so
  // we 404 — that's why /openai/safety and /anthropic/research don't resolve.
  // `draft` (tied to Next.js draft mode) switches to draft content under Live
  // Preview, which is when the visual-editing plugin embeds its edit markers.
  const { docs: pages } = await payload.find({
    collection: "pages",
    draft,
    depth: 1,
    limit: 1,
    where: {
      and: [{ slug: { equals: pageSlug } }, { tenant: { equals: tenant.id } }],
    },
  });

  const page = pages[0];
  if (!page) {
    notFound();
  }

  // Sibling pages for the header nav.
  const { docs: siblings } = await payload.find({
    collection: "pages",
    draft,
    limit: 100,
    sort: "slug",
    where: { tenant: { equals: tenant.id } },
  });
  const nav = siblings.map((sibling) => ({
    label: sibling.title,
    href: `/${tenant.slug}/${sibling.slug}`,
  }));

  return (
    <SiteChrome theme={theme} brand={tenant.name} brandHref={`/${tenant.slug}`} nav={nav}>
      <LivePreviewListener
        serverURL={process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4041"}
      />

      <Link className="back-link" href={`/${tenant.slug}`}>
        ← {tenant.name}
      </Link>

      <section className="hero">
        <h1 className="hero-title gradient">{page.title}</h1>
        {page.tagline ? <p className="hero-tagline">{page.tagline}</p> : null}
      </section>

      {page.content ? (
        <article className="content">
          <p>{page.content}</p>
        </article>
      ) : null}
    </SiteChrome>
  );
}
