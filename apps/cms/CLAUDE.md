# CLAUDE.md

Guidance for Claude Code (and other AI agents) working in this Payload + Next.js app.

## Commands

```bash
bun run dev                    # Dev server (Turbopack, port 3333)
bun run devsafe                # Dev with .next cache cleared
bun run build                  # Production build (8GB memory limit)
bun run lint                   # Lint + format check (Ultracite: oxlint + oxfmt)
bun run check-types            # tsgo --noEmit
bun run test:int               # Vitest integration tests
bun run test:e2e               # Playwright E2E tests (Chromium)
bun run generate:types         # Regenerate Payload TypeScript types — run after schema changes
bun run generate:importmap     # Regenerate Payload import map — run after adding/editing admin components
bun run payload migrate:create # Create a new database migration (writes into src/lib/database/migrations)
bun run payload migrate        # Apply pending migrations
```

Migrations live in `src/lib/database/migrations/`.

Validate changes with: `bun run check-types && bun run lint`.

## Tech Stack

Next.js 16 + React 19 with Payload CMS 3.84, PostgreSQL, Tailwind CSS 4, next-intl 4. **React Compiler is enabled — do not use `useMemo` or `useCallback`.**

## Architecture

Two ideas govern placement: **content + UI you build with lives at `src/` root** (the Payload nouns and the UI kit); **everything that supports it lives in `src/lib/`**. A folder is earned by 2+ tightly-related files — anything smaller is a flat file in `lib/utils/`; plugin app-side wiring groups by plugin under `lib/plugins/<name>/`. See [ADR-0001](../../docs/adr/0001-flatten-src-into-lib.md) for the rationale.

```
src/
├── app/(frontend)/[locale]/   # Public, locale-prefixed routes (page compositions colocate here, e.g. blog/_components)
├── app/(payload)/             # Admin panel + REST/custom API
├── blocks/                    # Page builder blocks — config.ts + Component.tsx (controller) + ui/ (presentational)
├── collections/               # Payload collection configs (Header/Footer also hold a Component.tsx + ui/)
├── components/                # All reusable UI — see components/README.md
│   ├── shared/                #   building blocks: CMSLink, Media, RichText, SectionContainer, Container, Link
│   ├── admin/                 #   Payload admin-panel UI: RowLabel, CopyAiPromptButton, Icon, Logo, SSOButtons
│   ├── seo/                   #   JSON-LD renderers + schema builders
│   └── <Component>/           #   every other reusable component (absorbs the former entities/ + features/)
├── globals/                   # Payload globals (SiteSettings)
├── lib/                       # Everything that supports the app
│   ├── fields/                #   reusable Payload field builders
│   ├── hooks/                 #   Payload lifecycle hooks
│   ├── access/                #   composable access-control helpers (superAdmin, admin, or(), and()…)
│   ├── auth/                  #   OIDC SSO
│   ├── plugins/               #   plugin wiring (index.ts, seoPlugin, mcp) + per-plugin app glue (ab/, analytics/)
│   ├── dal/                   #   Domain Access Layer — import root @/dal — see lib/dal/README.md
│   ├── database/              #   Postgres adapter + migrations
│   ├── search/                #   pgvector semantic search
│   ├── config/                #   i18n, blog, customPages
│   ├── constants/             #   default values, media defaults
│   ├── i18n/                  #   next-intl integration
│   ├── context/               #   React contexts + providers
│   ├── adapters/              #   prop-prep adapters (image / link / richText / section)
│   ├── types/                 #   shared types
│   └── utils/                 #   flat cross-cutting helpers
├── messages/                  # Translation JSON (next-intl)
└── proxy.ts                   # Locale routing + A/B rewrite resolution
```

**Path alias:** `@/*` → `./src/*`. The DAL keeps a stable import root regardless of its file location: `@/dal` → `./src/lib/dal`.

## Data Access (DAL)

All app-layer data access goes through `@/dal`. **App code never calls
`getPayload({ config })` directly** — it calls `getPayloadClient()` or a domain
method from `@/dal`. Hooks, field `validate`, and `access` functions are
inside Payload's request lifecycle and continue to use `req.payload` so they
share the surrounding transaction. See `src/lib/dal/README.md` for the full
pattern.

## Database

Postgres adapter + migrations live in `src/lib/database/`. `payload.config.ts`
imports `createDatabaseAdapter()` from `@/lib/database`; the adapter is configured
with `migrationDir` pointing at `src/lib/database/migrations/`, so `payload
migrate:create` writes new files there.

### Postgres 63-char identifier limit

Postgres caps table/enum names at **63 characters**. Payload derives those names
by concatenating the full nested path (e.g. `_default_templates_v_blocks_<slug>_<array>_<field>`),
so a deeply nested field inside a block can overflow and make `payload migrate:create` abort with `Exceeded max identifier length for table or enum name of 63 characters`.

- **When it bites:** worst case is a block that has a draft mirror (`_pages_v_*`),
  a template-override variant (`_default_templates_v_blocks_*`), **and** a nested
  array/select inside it (e.g. a `linkGroup` array with an `iconTrailing` select).
  The system prefix `_default_templates_v_blocks_` alone eats ~28 chars — only the
  **slug + nested-path tail** is yours to shrink.
- **The fix is shorter names, not config tricks.** Keep block `slug` short, and
  keep nested array/group/field names short. Budget the full path against 63 chars
  *before* generating the migration — count `_default_templates_v_blocks_` (28) +
  slug + every nested segment.
- For an unavoidably long table, set an explicit short `dbName` on the
  block/array/field rather than letting Payload derive it, then regenerate.

## Wired Plugins

`src/lib/plugins/index.ts` is the single source of truth for plugin wiring. Currently active:

- `vercelBlobStorage` — production media uploads
- `redirectsPlugin` — 307/308 redirects, custom field overrides
- Custom `seoPlugin` — meta + JSON-LD
- `nestedDocsPlugin` — nested page hierarchy + breadcrumbs
- `@focus-reactive/payload-plugin-presets` — reusable block configurations
- `@focus-reactive/payload-plugin-comments` — inline field comments
- `@focus-reactive/payload-plugin-scheduling` — scheduled publishing on serverless
- `@focus-reactive/payload-plugin-translator` — AI translation (OpenAI provider)
- `@focus-reactive/payload-plugin-ab` — A/B testing with middleware-driven variant rewrites
- MCP plugin — exposes content tools to AI agents

A plugin's **app-side wiring** (config, adapters, provider components) lives under `src/lib/plugins/<name>/` — e.g. `lib/plugins/ab/` (middleware adapter, cookies, variant data) and `lib/plugins/analytics/` (GA4 provider). The published feature itself lives in the monorepo `packages/payload-plugin-<name>/`.

## Key Patterns

### Localization

Locales live in `src/lib/config/i18n.ts` (`en`, `es`). URLs always include the locale prefix (`/en/`, `/es/`). Mark fields `localized: true` and use `createLocalizedDefault({ en: '…', es: '…' })` for defaults.

### Blocks & Presets

Each block lives in `src/blocks/<BlockName>/`: `config.ts` (Payload block config; supports presets and A/B-experiment fields, and uses `getBlockPreviewImage('BlockName')` for the admin preview thumbnail), `Component.tsx` (the **controller** — Payload-aware, maps block data to props), and `ui/` (the **presentational** section — props in → JSX out, no Payload). Shared building blocks live in `@/components/shared` (and standalone components at `@/components/<Name>`); admin-panel UI in `@/components/admin`. See `src/components/README.md` for the full layout + the lint-enforced `ui/` boundary.

### A/B Testing

The plugin owns the experiment/variant data model. The proxy (`src/proxy.ts`) calls `resolveAbRewrite` to pick a variant and rewrite the request. Visitor identity is cookie-based (`ab_visitor_id`); variant choice is cached per slug.

### Access Control

Composable helpers exported from `src/lib/access/`: `superAdmin`, `admin`, `author`, `user`, `authenticated`, `anyone`, `nobody`, `onlySelf`, `createdBy`. Combine with `or()` and `and()`.

### Custom Admin Components

Register by **file path string**, not import: `'/components/MyComponent'` (paths are relative to `src`, so admin UI moved into `lib/` registers as `'/lib/context/MyProvider'`). Named exports use `'#'`: `'/components/MyComponent#Named'`. Default is a Server Component — add `'use client'` for client components. Run `bun run generate:importmap` after adding or moving any registered component.

## Critical Rules

1. **Local API access control:** When passing `user` to Payload's Local API, always set `overrideAccess: false`. Otherwise access control is bypassed.
2. **Hook transactions:** Always pass `req` to nested Payload operations inside hooks so they share the surrounding transaction.
3. **Hook recursion:** Use a `context` flag (e.g., `context.skipHooks`) to break infinite hook loops.
4. **Schema workflow:** Edit collection/field config → `bun run generate:types` → `bun run payload migrate:create` → `bun run payload migrate`.
5. **Migrations are explicit:** `push: false` is set — never rely on auto-push.

## MCP Output

When Payload MCP tools (`getPageContent`, `getPostsContent`, etc.) return content, output it **verbatim** — do not reformat, paraphrase, or summarize. The response is already pre-formatted Markdown.

## Tests

- Integration: `tests/int/**/*.int.spec.ts` (Vitest, jsdom)
- E2E: `tests/e2e/` (Playwright, Chromium only)

## See Also

`AGENTS.md` for comprehensive Payload conventions. `.cursor/rules/` for detailed guides on collections, fields, hooks, access control, plugins, and components.
