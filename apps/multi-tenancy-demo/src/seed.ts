import { getPayload } from "payload";

import config from "./payload.config";

// Seeds the demo SQLite DB with two tenants, each owning its own pages, plus an
// admin user associated with both tenants so the admin tenant selector works.
// Run from apps/multi-tenancy-demo:
//   bun run seed
//
// Idempotent: tenants and the admin user are find-or-created (never duplicated),
// and pages are wiped and recreated on every run — safe to re-run.

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "dev@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "dev123456";

const TENANTS = [
  {
    name: "Acme Corp",
    slug: "acme",
    pages: [
      { title: "Acme — Home", content: "Welcome to Acme Corp. Rockets, anvils, and questionable physics since 1949." },
      { title: "Acme — About", content: "Acme builds the gadgets every cartoon villain relies on." },
    ],
  },
  {
    name: "Globex",
    slug: "globex",
    pages: [
      { title: "Globex — Home", content: "Globex Corporation: a totally legitimate multinational conglomerate." },
      { title: "Globex — Careers", content: "Join Globex. We have a volcano lair and excellent dental." },
    ],
  },
];

const run = async () => {
  const payload = await getPayload({ config });

  // --- Admin user (find-or-create; never duplicated) -----------------------------------------
  const existingUser = await payload.find({ collection: "users", where: { email: { equals: ADMIN_EMAIL } }, limit: 1 });
  let adminId = existingUser.docs[0]?.id;
  if (!adminId) {
    const admin = await payload.create({ collection: "users", data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: "Demo Admin" } });
    adminId = admin.id;
    payload.logger.info(`Created admin user ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } else {
    payload.logger.info(`Admin user ${ADMIN_EMAIL} already exists — left untouched`);
  }

  // --- Tenants (find-or-create by slug) + their pages (wipe + recreate) -----------------------
  const tenantIds: number[] = [];
  for (const tenant of TENANTS) {
    const existingTenant = await payload.find({ collection: "tenants", where: { slug: { equals: tenant.slug } }, limit: 1 });
    let tenantId = existingTenant.docs[0]?.id;
    if (!tenantId) {
      const created = await payload.create({ collection: "tenants", data: { name: tenant.name, slug: tenant.slug } });
      tenantId = created.id;
    }
    tenantIds.push(tenantId);

    await payload.delete({ collection: "pages", where: { tenant: { equals: tenantId } } });
    await Promise.all(tenant.pages.map((page) => payload.create({ collection: "pages", data: { ...page, tenant: tenantId } })));
  }

  // --- Associate the admin with every tenant so the selector can switch between them ----------
  await payload.update({
    collection: "users",
    id: adminId,
    data: { tenants: tenantIds.map((tenant) => ({ tenant })) },
  });

  payload.logger.info(`Seeded ${TENANTS.length} tenants with pages. Visit /admin and use the tenant selector.`);
};

await run();
process.exit(0);
