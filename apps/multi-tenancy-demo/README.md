# multi-tenancy-demo

A minimal Payload + Next.js app that demonstrates the official
[`@payloadcms/plugin-multi-tenant`](https://payloadcms.com/docs/plugins/multi-tenant)
in isolation — no page builder, no other plugins, just tenant scoping and the
admin tenant selector, with a small frontend preview.

## What it shows

- A **`tenants`** collection — each document is one isolated tenant.
- A tenant-scoped **`pages`** collection. The plugin injects a `tenant` field
  (made visible here via `debug: true`) and filters the admin list view by the
  selected tenant.
- The plugin auto-adds a **`tenants` array field** to the `users` collection,
  which drives the **tenant selector** in the admin and scopes access.
- A frontend preview (`/<tenant-slug>`) that renders only the pages belonging to
  that tenant — the frontend equivalent of picking a tenant in the admin.

## Run it

```bash
# from the repo root
bun install

# from this app
cd apps/multi-tenancy-demo
cp .env.example .env          # set PAYLOAD_SECRET to any value
bun run seed                  # creates 2 tenants, their pages, and an admin user
bun run dev                   # http://localhost:4041
```

The seed creates an admin user (`dev@example.com` / `dev123456` by default,
overridable via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`) associated with both
seeded tenants.

## Switching tenants

1. Open the admin panel at `http://localhost:4041/admin` and log in.
2. Use the **tenant selector** in the top of the nav to pick a tenant.
3. Open the **Pages** collection — the list shows only the selected tenant's
   pages. Switch tenants and the list changes accordingly.
4. Visit the frontend at `http://localhost:4041/` and open a tenant to preview
   that tenant's pages in isolation.

## Notes

- SQLite-backed (`@payloadcms/db-sqlite`) for a zero-setup local demo.
- Private (`"private": true`) — excluded from the release pipeline.
