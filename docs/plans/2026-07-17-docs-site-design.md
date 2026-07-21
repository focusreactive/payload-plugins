# Design — Documentation site for the payload-plugins

**Date:** 2026-07-17
**Status:** draft — awaiting review
**Scope:** repo infrastructure (new private `apps/docs`), no change to any published package.

## Problem

Each plugin ships a single `README.md` that npm renders as one long scroll. For anything
beyond a quick glance this is inconvenient: no navigation, no search, no cross-linking
between guides, no place for screenshots of the admin UI, no versioned "since vX.Y.Z"
surfacing. We want a proper documentation *site* that is nicer to read than the npm
README — and free to host.

## Goals

- A browsable docs site (nav + search) generated from Markdown/MDX.
- Reuses existing package `README.md` content as the starting point; keeps a single
  source of truth where practical.
- Lives inside the monorepo next to the code, builds through turbo, deploys on push.
- Free hosting, no recurring cost.
- Room for admin-UI screenshots / GIFs per feature.

## Non-goals

- Auto-generated API reference from TypeScript types (possible later via TypeDoc; not v1).
- Rewriting the plugins' public API or JSDoc conventions.
- Migrating README content *away* from the packages — npm pages still need a README.

## Decisions to confirm (defaults chosen, override in review)

1. **Scope of v1** — *default:* **translator only**, to nail the format before scaling to
   the other six publishable plugins (ab, presets, comments, scheduling, seo, analytics).
   Alternative: all plugins at once (single site, more content up front).
2. **Generator** — *default:* **Nextra** (Next.js, matches the repo stack, minimal config,
   MDX). Alternative: **Fumadocs** (also Next.js, nicer default theme + built-in search,
   a bit more setup).
3. **Screenshots** — *open:* (a) browser automation via the Chrome MCP against `apps/dev`
   — semi-autonomous, can be flaky, may need the user for login/first-run setup; (b) user
   supplies screenshots, agent places/annotates them — faster and more reliable; (c) defer
   screenshots to a later iteration and ship text first.
4. **Hosting** — *default:* **Cloudflare Pages** (clean root domain, generous free tier).
   Alternative: **GitHub Pages** (free for public repos, but served under `/<repo>/`, so
   Nextra needs `basePath`).

## Proposed structure

```
apps/docs/                          # private: true — ignored by multi-semantic-release
  package.json                      # next + nextra; build script wired into turbo
  next.config.mjs                   # nextra config (+ basePath only if GitHub Pages)
  theme.config.tsx                  # site title, logo, repo links, footer
  content/
    index.mdx                       # landing: what these plugins are
    translator/
      index.mdx                     # overview (from README "About"/"Features")
      installation.mdx
      quick-start.mdx
      configuration.mdx             # options reference (levels, providers, runner, strategies)
      guides/
        deep-translation.mdx
        rich-text.mdx
        auto-translate.mdx
      _meta.js                      # sidebar order
    _meta.js
  public/
    img/translator/                 # screenshots / GIFs
```

Content is authored as MDX. Where a page is a near-copy of the README, we keep the README
as the canonical short version and let the site page expand on it — we do **not** try to
transclude the README file into MDX in v1 (keeps the build simple; revisit if drift hurts).

## Monorepo integration

- New workspace `apps/docs`, `"private": true` so `--ignore-private-packages` skips it in
  releases (same treatment as `apps/dev`). Confirm it is excluded from the publishable
  build filter `./packages/*`.
- Add a `build` script that turbo can run; docs build must not block package releases.
- Peer/version overrides: reuse the repo's pinned `next`/react versions to stay consistent
  with the hoisted linker layout (see root CLAUDE.md "Bun layout").

## Deploy

- **Cloudflare Pages (default):** connect the repo, build command `bun run build`
  (filtered to `apps/docs`), output dir `apps/docs/out` (Nextra static export) or the
  Next.js adapter. No secrets in-repo; project is created in the user's Cloudflare account.
- **GitHub Pages (alt):** a `.github/workflows/docs.yml` builds the static export and
  publishes via `actions/deploy-pages`. Requires `basePath`/`assetPrefix = /<repo>` and
  Pages enabled in repo settings.

Either way the "enable hosting" step happens in the user's account — the agent prepares
config + workflow but cannot flip that switch.

## Automation boundary (what an autonomous run can/can't do)

- **Autonomous:** scaffold `apps/docs`, generate text content from READMEs + sources, wire
  turbo, write the deploy workflow/config.
- **Semi-autonomous:** screenshots via Chrome MCP (needs `apps/dev` running + admin login;
  note the known `apps/dev` DB-push hang — reset `dev.db` / run `dev:next` directly).
- **Human-gated:** enabling the host (Cloudflare/GitHub Pages) and any custom domain.

## Phasing

1. This design doc → review.
2. Scaffold `apps/docs` (Nextra) + turbo wiring + landing + translator overview. Verify
   `bun run build` and local `dev` render.
3. Fill translator content from README + source (installation, quick start, configuration,
   guides). User proof-reads.
4. Screenshots (per decision 3).
5. Deploy config/workflow; user enables hosting.
6. (Later) Extend to the other plugins; consider TypeDoc API reference.

## Open questions

- Custom domain wanted (e.g. `plugins.focusreactive.com`), or the host's default subdomain?
- Single site covering all plugins, or per-plugin sites? (Default: single site, one section
  per plugin.)
- Do we want the site linked from each package README (badge/link back)?
