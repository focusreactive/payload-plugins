import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";

import config from "@/payload.config";

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
    limit: 1,
    where: { slug: { equals: tenantSlug } },
  });

  const tenant = tenants[0];
  if (!tenant) {
    notFound();
  }

  // Only the pages belonging to this tenant — the `tenant` field is injected by
  // the multi-tenant plugin. This is the frontend equivalent of selecting the
  // tenant in the admin panel.
  const { docs: pages } = await payload.find({
    collection: "pages",
    limit: 100,
    sort: "title",
    where: { tenant: { equals: tenant.id } },
  });

  return (
    <div>
      <Link className="back-link" href="/">
        ← All tenants
      </Link>
      <h1>{tenant.name}</h1>
      <p className="subtitle">Pages scoped to this tenant.</p>

      {pages.length === 0 ? (
        <p>This tenant has no pages yet.</p>
      ) : (
        pages.map((page) => (
          <article className="page-card" key={page.id}>
            <h2>{page.title}</h2>
            {page.content ? <p>{page.content}</p> : null}
          </article>
        ))
      )}
    </div>
  );
}
