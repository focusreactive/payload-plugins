import Link from "next/link";
import { getPayload } from "payload";

import config from "@/payload.config";

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
    <div>
      <h1>Multi-Tenancy Demo</h1>
      <p className="subtitle">
        Each tenant below owns its own isolated set of pages. Pick one to preview only that tenant&apos;s content. In the <Link href="/admin">admin panel</Link>, the tenant selector filters the Pages
        list the same way.
      </p>

      {tenants.length === 0 ? (
        <p>
          No tenants yet. Run <code>bun run seed</code> in <code>apps/multi-tenancy-demo</code> to create two demo tenants.
        </p>
      ) : (
        <ul className="tenant-list">
          {tenants.map((tenant) => (
            <li key={tenant.id}>
              <Link className="tenant-card" href={`/${tenant.slug}`}>
                <strong>{tenant.name}</strong>
                <span>/{tenant.slug}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Link className="admin-link" href="/admin">
        Go to the admin panel →
      </Link>
    </div>
  );
}
