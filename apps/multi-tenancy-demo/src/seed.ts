import { getPayload } from "payload";

import config from "./payload.config";

// Seeds the demo SQLite DB with two tenants (OpenAI + Anthropic), each owning
// its own slugged pages, plus three users that demonstrate tenant-scoped access:
//
//   - an admin associated with BOTH tenants (the tenant selector can switch)
//   - one user per tenant, associated with only that tenant (locked to it)
//
// Run from apps/multi-tenancy-demo:
//   bun run seed
//
// Idempotent: users and tenants are find-or-created (never duplicated), and
// pages are wiped and recreated on every run — safe to re-run.

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@admin.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "admin";

type SeedPage = { title: string; slug: string; tagline: string; content: string };

type SeedTenant = {
  name: string;
  slug: string;
  // The single-tenant user that should only ever see this tenant.
  user: { email: string; password: string; name: string };
  pages: SeedPage[];
};

// Note: `home` and `products` exist for BOTH tenants — same slug, different
// content per tenant (a clean isolation demo). `research` is OpenAI-only and
// `safety` is Anthropic-only, so /openai/safety and /anthropic/research 404.
const TENANTS: SeedTenant[] = [
  {
    name: "OpenAI",
    slug: "openai",
    user: { email: "user@openai.com", password: "openai", name: "OpenAI User" },
    pages: [
      {
        title: "OpenAI",
        slug: "home",
        tagline: "Creating safe AGI that benefits all of humanity.",
        content: "OpenAI is an AI research and deployment company. We build frontier models like GPT and Codex, and ship them through products developers and businesses rely on every day.",
      },
      {
        title: "Products",
        slug: "products",
        tagline: "Frontier models, ready to build on.",
        content: "From ChatGPT to the API and Codex, our products put state-of-the-art models in your hands — with the tooling to deploy them responsibly at scale.",
      },
      {
        title: "Research",
        slug: "research",
        tagline: "Advancing the field, one breakthrough at a time.",
        content: "Our research spans reasoning, alignment, and multimodality. This page only exists under the OpenAI tenant — request /anthropic/research and you'll get a 404.",
      },
    ],
  },
  {
    name: "Anthropic",
    slug: "anthropic",
    user: { email: "user@anthropic.com", password: "anthropic", name: "Anthropic User" },
    pages: [
      {
        title: "Anthropic",
        slug: "home",
        tagline: "AI research and products that put safety at the frontier.",
        content: "Anthropic is an AI safety company. We build Claude — a family of models designed to be helpful, honest, and harmless — and the research that makes them trustworthy.",
      },
      {
        title: "Products",
        slug: "products",
        tagline: "Meet Claude, your AI collaborator.",
        content: "Claude powers everything from everyday chat to agentic coding with Claude Code. Same slug as OpenAI's Products page — entirely different tenant, entirely different content.",
      },
      {
        title: "Safety",
        slug: "safety",
        tagline: "Reliable, interpretable, steerable AI.",
        content: "Safety is the heart of what we do — interpretability, Constitutional AI, and responsible scaling. This page only exists under the Anthropic tenant; /openai/safety returns a 404.",
      },
    ],
  },
];

const run = async () => {
  const payload = await getPayload({ config });

  const findOrCreateUser = async (email: string, password: string, name: string): Promise<number> => {
    const existing = await payload.find({
      collection: "users",
      where: { email: { equals: email } },
      limit: 1,
    });
    const found = existing.docs[0];
    if (found) {
      payload.logger.info(`User ${email} already exists — left untouched`);
      return found.id;
    }
    const created = await payload.create({
      collection: "users",
      data: { email, password, name },
    });
    payload.logger.info(`Created user ${email} / ${password}`);
    return created.id;
  };

  // --- Admin user: associated with EVERY tenant (selector can switch) ------------------------
  const adminId = await findOrCreateUser(ADMIN_EMAIL, ADMIN_PASSWORD, "Demo Admin");

  // --- Tenants (find-or-create by slug) + their pages (wipe + recreate) + scoped user --------
  const tenantIds: number[] = [];
  for (const tenant of TENANTS) {
    const existingTenant = await payload.find({
      collection: "tenants",
      where: { slug: { equals: tenant.slug } },
      limit: 1,
    });
    let tenantId = existingTenant.docs[0]?.id;
    if (!tenantId) {
      const created = await payload.create({
        collection: "tenants",
        data: { name: tenant.name, slug: tenant.slug },
      });
      tenantId = created.id;
    }
    tenantIds.push(tenantId);

    await payload.delete({ collection: "pages", where: { tenant: { equals: tenantId } } });
    // Pages have drafts enabled (for visual editing), so publish them explicitly
    // — otherwise the public, non-draft frontend would render nothing.
    await Promise.all(tenant.pages.map((page) => payload.create({ collection: "pages", data: { ...page, tenant: tenantId, _status: "published" } })));

    // This user belongs to exactly ONE tenant. Logged in as them, the admin
    // tenant selector has nothing to switch to — that single tenant is the only
    // access they have.
    const userId = await findOrCreateUser(tenant.user.email, tenant.user.password, tenant.user.name);
    await payload.update({
      collection: "users",
      id: userId,
      data: { tenants: [{ tenant: tenantId }] },
    });
  }

  // --- Associate the admin with every tenant so the selector can switch between them ----------
  await payload.update({
    collection: "users",
    id: adminId,
    data: { tenants: tenantIds.map((tenant) => ({ tenant })) },
  });

  payload.logger.info(`Seeded ${TENANTS.length} tenants with pages and scoped users.`);
  payload.logger.info(`Admin (both tenants): ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  for (const tenant of TENANTS) {
    payload.logger.info(`${tenant.name}-only user: ${tenant.user.email} / ${tenant.user.password}`);
  }
};

await run();
process.exit(0);
