# payload-plugins — Agent Guide

## Stack

- **Package manager**: bun
- **Build system**: Turborepo (`turbo.json`)
- **Language**: TypeScript (ESM, `"type": "module"`)
- **Monorepo**: bun workspaces

## Structure

```
apps/
  dev/                                → local Payload CMS sandbox app for plugin development (private)
  cms/                                → Payload CMS boilerplate app — full reference setup (private)
packages/
  payload-plugin-ab/                  → @focus-reactive/payload-plugin-ab (published)
  payload-plugin-presets/             → @focus-reactive/payload-plugin-presets (published)
  payload-plugin-comments/            → @focus-reactive/payload-plugin-comments (published)
  payload-plugin-scheduling/          → @focus-reactive/payload-plugin-scheduling (published)
  payload-plugin-translator/          → @focus-reactive/payload-plugin-translator (published)
  database/                           → @repo/database — postgres adapter + migrations (private)
  ui/                                 → @repo/ui — shared React UI components (private)
  tailwind-config/                    → @repo/tailwind-config — shared Tailwind v4 config (private)
  eslint-config/                      → @repo/eslint-config (private)
  typescript-config/                  → @repo/typescript-config (private)
```

`apps/cms` consumes the workspace plugins via `workspace:*`, gets its Postgres
adapter from `@repo/database`, and runs all app-layer data access through
its own `src/dal/` (see `apps/cms/src/dal/README.md`). `apps/dev` is the
minimal plugin sandbox.

## Bun layout

`bunfig.toml` sets `linker = "hoisted"`. Required because the workspace
plugins declare `next`/`payload` as peer deps; the default isolated linker
installs duplicate copies, which TypeScript treats as unrelated types and
breaks check-types across plugin boundaries. `package.json` `overrides`
also pin `payload@*`, `@payloadcms/*`, `next`, and `@types/react*` to one
version each to keep the hoisted layout unambiguous.

## Key Commands

```bash
bun install                        # install deps
bun run build                      # build all packages via turbo
bunx turbo run build --filter='./packages/*'  # build publishable packages only
bun run dev                        # start dev app
bun run lint                       # lint all
bun run release                    # run multi-semantic-release (CI only)
bun run multi-semantic-release --dry-run  # preview release locally
```

## Publishing Flow

Releases are fully automated via **multi-semantic-release** + **semantic-release**.

**How it works:**

1. Push commits to `main`
2. GitHub Actions (`.github/workflows/release.yml`) runs `multi-semantic-release --ignore-private-packages`
3. Each package is released independently based on which files changed in commits since its last tag
4. Version bump is determined by commit type — **file location determines which package is released, not the commit scope**

**Commit types → version bumps:**
| Type | Bump |
|------|------|
| `fix:` | patch |
| `feat:` | minor |
| `feat!:` / `BREAKING CHANGE:` | major |
| `docs:` | patch |
| `refactor:` | patch |
| `chore:` | no release |

**To trigger a release for a specific package:** commit any change to a file inside its directory using one of the bump-triggering types above.

**CI requires:** `GITHUB_TOKEN` (auto-provided) — no `NPM_TOKEN` needed currently (workflow uses OIDC provenance).

> Note: `@semantic-release/npm` is configured with `"provenance": true` — packages are published with npm provenance attestations via GitHub OIDC (`id-token: write` permission is set).

## Adding a New Plugin

1. Create `packages/your-plugin-name/` with `package.json` (set `"private": false`, `"publishConfig": { "access": "public" }`)
2. Set `"repository".url` to `https://github.com/focusreactive/payload-plugins` (no hyphen — matches git remote)
3. Add a `build` script compatible with turbo
4. It will be auto-discovered by bun workspaces and included in releases

## Gotchas

- Git remote is `focusreactive/payload-plugins` (no hyphen). Package `repository.url` must match exactly or semantic-release will fail with a 128 git error.
- `apps/dev` and internal packages (`eslint-config`, `typescript-config`) are skipped via `--ignore-private-packages`.
- Do not manually bump versions in `package.json` — semantic-release owns version fields.
