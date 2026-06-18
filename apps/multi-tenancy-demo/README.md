# multi-tenancy-demo

A minimal Payload + Next.js app that demonstrates the official
[`@payloadcms/plugin-multi-tenant`](https://payloadcms.com/docs/plugins/multi-tenant)
in isolation — tenant scoping, the admin tenant selector, tenant-scoped user
access, and a small themed frontend preview. The two demo tenants are
**OpenAI** and **Anthropic**, each with its own brand colors.

## What it shows

- A **`tenants`** collection — each document is one isolated tenant.
- A tenant-scoped **`pages`** collection with a per-tenant `slug`. The plugin
  injects a `tenant` field (made visible here via `debug: true`) and filters the
  admin list view by the selected tenant.
- **Per-tenant access:** the plugin auto-adds a `tenants` array to `users`. The
  seeded admin belongs to both tenants (so the selector can switch), while each
  single-tenant user can only ever see their one tenant — log in as them and the
  selector has nothing to switch to.
- **Tenant isolation in the URL:** pages open at `/<tenant>/<slug>`. The same
  slug (`home`, `products`) exists under both tenants and resolves to _different_
  content. A slug that only exists for one tenant (`/openai/research`,
  `/anthropic/safety`) returns a **404** under the other — the query is scoped to
  the active tenant.
- **Per-tenant theming:** a hardcoded minimalistic header/footer plus a hero,
  styled with each tenant's brand palette and logo (OpenAI = blue→violet on
  white; Anthropic = coral on cream). See `src/lib/themes.ts` and the brand SVGs
  in `public/`.
- **Live Preview** (`@payloadcms/live-preview-react`): editing a page in the
  admin opens a side-by-side preview of `/<tenant>/<slug>`; saving refreshes the
  frontend route via `RefreshRouteOnSave`.
- **Visual editing** (`@fr-private/payload-plugin-visual-editing`): in the Live
  Preview panel, flip the floating toggle to **Hover**/**Always** and editable
  text gets a click-to-edit badge that deep-links back into the admin field.
  Only active for draft content inside the preview iframe.

## Run it

> One dependency, `@fr-private/payload-plugin-visual-editing`, is a **private**
> npm package. Installing it requires an `@fr-private` org token exposed as the
> `NPM_TOKEN` env var (the repo's root `.npmrc` already reads `${NPM_TOKEN}`):
> `NPM_TOKEN=npm_xxx bun install`.

```bash
# from the repo root (NPM_TOKEN must be set for the private plugin)
NPM_TOKEN=npm_xxx bun install

# from this app
cd apps/multi-tenancy-demo
cp .env.example .env          # set PAYLOAD_SECRET to any value
bun run seed                  # creates 2 tenants, their pages, and 3 users
bun run dev                   # http://localhost:4041
```

## Users (seeded)

| Role           | Email                | Password    | Tenants            |
| -------------- | -------------------- | ----------- | ------------------ |
| Admin          | `admin@admin.com`    | `admin`     | OpenAI + Anthropic |
| OpenAI-only    | `user@openai.com`    | `openai`    | OpenAI             |
| Anthropic-only | `user@anthropic.com` | `anthropic` | Anthropic          |

Admin credentials are overridable via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

## Switching tenants

1. Open the admin panel at `http://localhost:4041/admin`.
2. Log in as `admin@admin.com` — the **tenant selector** at the top of the nav
   lists both tenants. Pick one; the **Pages** list shows only that tenant's
   pages. Log in as a single-tenant user instead and you're locked to one tenant.
3. Visit the frontend at `http://localhost:4041/`, open a tenant to see its
   themed pages, click a page to open it, and try the **Tenant isolation** links
   to watch a foreign slug 404.

## Live Preview & visual editing

1. In the admin, open any **Pages** document and open the **Live Preview** side
   panel — it loads `/<tenant>/<slug>` through `/next/preview`, so the frontend
   renders in Next.js draft mode.
2. Edit a field and **Save** — the preview refreshes to show the change.
3. Flip the floating visual-editing toggle (bottom of the preview) to **Hover**
   or **Always**: editable text shows an outline and an **Edit** badge; clicking
   it focuses that field back in the admin form.
4. Pages have drafts enabled, so the public frontend shows the **published**
   version; the preview shows your unsaved/draft version.

## Notes

- SQLite-backed (`@payloadcms/db-sqlite`) for a zero-setup local demo.
- Private (`"private": true`) — excluded from the release pipeline.
- The `content` field is a `textarea` (auto-overlayable). If you switch it to
  `richText`, wrap the renderer with `withVisualEditingPath` per the plugin's
  README so the Edit badge attaches.
