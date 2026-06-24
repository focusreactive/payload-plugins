# ADR-0001: Flatten `src/` — remove Feature-Sliced layers, consolidate support code into `lib/`

- **Status:** Accepted
- **Date:** 2026-06-22
- **Scope:** `apps/cms` (the Ideal CMS starter)

## Context

`src/` had grown to **20 top-level folders** mixing three organizing schemes at once:

- **Payload-native** — `collections`, `blocks`, `fields`, `globals`, `hooks`, `plugins` (mandated by Payload; familiar to any Payload dev).
- **Feature-Sliced Design** — `entities/`, `features/`, `widgets/` (a frontend layering methodology).
- **Custom support code** — `core/` (config, constants, context, lib, seo, types, utils), a separate top-level `lib/adapters`, plus `dal/`, `database/`, `search/`, `auth/`, `i18n/`, `providers/`.

This produced recurring friction:

- **Five places to put a component** — `blocks`, `components`, `entities`, `features`, `widgets` — with overlapping boundaries (e.g. `blocks/TestimonialsList` vs `entities/Testimonials`).
- **Three helper buckets** — top-level `lib/`, `core/lib/`, `core/utils/` — with no rule separating them.
- **Scattered plugin wiring** — `plugins/` + `core/lib/abTesting` + `core/lib/analytics` — so the plugin↔app relationship was invisible.
- The FSD layers were barely populated (~9 items total), **not enforced** (no import-direction lint), and **not documented** in `CLAUDE.md`.

The starter is scaffolded into client projects via `create-ideal-cms`, so its structure is also a teaching default — every quirk propagates downstream.

## Decision

Adopt a two-level placement rule:

1. **Content + UI you build with lives at `src/` root:** `app`, `collections`, `blocks`, `globals`, `components`.
2. **Everything that supports it lives in `src/lib/`:** `fields`, `hooks`, `access`, `auth`, `plugins`, `dal`, `database`, `search`, `config`, `constants`, `context`, `i18n`, `adapters`, `types`, `utils`.

Governing rule: **a folder is earned by 2+ tightly-related files; anything smaller is a flat file in `lib/utils/`; plugin app-side wiring groups by plugin under `lib/plugins/<name>/`.**

Concretely:

- **Removed the Feature-Sliced layers.** `entities/` and `features/` fold into `components/`; page compositions (`widgets/`: `PostContent`, `BlogPageContent`) colocate next to their route under `app/.../_components/`.
- **One helpers home.** `core/lib` + `core/utils` + the old top-level `lib/adapters` consolidate under `lib/` (`lib/utils`, plus the cohesive `lib/adapters`).
- **Plugin wiring grouped by plugin.** `core/lib/abTesting` → `lib/plugins/ab`, `core/lib/analytics` → `lib/plugins/analytics`, alongside `lib/plugins/index.ts` and `lib/plugins/seoPlugin`. The published feature stays in `packages/payload-plugin-<name>/`.
- **DAL keeps a stable import root.** `@/dal` → `./src/lib/dal` via a tsconfig alias, so the DAL's public surface is independent of its physical location.
- `core/seo` (JSON-LD rendering) → `components/seo`; `providers/` → `lib/context`.

Result: `src/` root drops from **20 → 7** folders.

## Consequences

**Positive**

- One home per kind of thing; the "which folder?" decision largely disappears.
- The plugin↔app relationship is visible (`lib/plugins/<name>/`).
- Code and docs (`CLAUDE.md`, `lib/dal/README.md`, `components/README.md`) agree 1:1.
- Future growth is governed by one rule, so the sprawl does not grow back.

**Costs accepted**

- **Mild Payload-idiom divergence:** `fields/` and `hooks/` now live under `lib/` rather than at `src/` root where Payload devs expect them. (`collections`, `blocks`, `globals`, `components` stay at root, so admin component path-strings remain valid.)
- A **one-time migration** (~210 files) that also propagates to repos scaffolded from this starter.
- The layout is **bespoke** — onboarding relies on the documented rule in `CLAUDE.md` rather than a named standard.

## Alternatives considered

- **Keep FSD, enforce it** (import-direction lint + populate the layers) — rejected: too little content to justify three layers, and it overlaps Payload's own taxonomy.
- **Everything, including Payload schema, under `lib/`** — rejected: burying `collections`/`blocks` under `lib/` breaks Payload-dev muscle memory in a starter.
- **`cms/` + `web/` top-level split** — rejected: naming a folder `cms/` inside a project that *is* the CMS duplicates the concept.

## Verification

`bun run check-types` (green) · `bun run lint` (0 errors) · `bun run build` (43/43 pages; import map, `@/dal` alias, and next-intl all resolve).
