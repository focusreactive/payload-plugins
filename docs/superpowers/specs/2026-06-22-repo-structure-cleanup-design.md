# Repo Structure Cleanup — Design

**Date:** 2026-06-22
**Status:** Approved design (pending spec review) → implementation
**Scope:** Two independent work-streams in the `payload-plugins` monorepo:

- **Part A** — Consolidate the `.claude` / `.agents` agent setup into a single, consistent root convention.
- **Part B** — Delete the `@repo/ui` package, fold its UI into `apps/cms`, and establish a clear, colocated component structure with an enforced presentational ↔ controller boundary.

The two parts touch disjoint files and can be implemented and reviewed independently. They will be executed in order (A then B) but committed as separate logical changes.

---

## Background / Motivation

Feedback surfaced two forms of structural drift:

1. **Agent setup is half-converted.** There is an *intended but undocumented* convention — `.agents/` holds the real, tool-agnostic source of truth; `.claude/` holds only relative symlinks into it. Today the convention is applied to ~5 of ~17 skill/agent entries; the rest were committed as **real files directly under `.claude/`**, and the setup is duplicated across the repo root and `apps/cms`.

2. **UI organization is inconsistent.** `@repo/ui` is a separate private package consumed *only* by `apps/cms` (31 files; zero use from `apps/dev` or any plugin). The cms-side code that wraps it is the de-facto controller layer, but it lives in a confusingly-named `core/ui` directory mixed with primitives, and `cn()` is reimplemented 5 times across the repo.

---

## Part A — Agent setup consolidation

### Current reality (all git-tracked)

| Location | Entry | State |
|---|---|---|
| root `.agents/skills/` | find-skills, payload, turborepo, vercel-react-best-practices | ✅ real (canonical) |
| root `.claude/skills/` | find-skills, payload, turborepo, vercel-react-best-practices | ✅ symlink → `../../.agents/skills/<n>` |
| root `.claude/skills/` | payload-plugins-add-package | ❌ real file, no `.agents` source |
| `apps/cms/.agents/skills/` | grill-me | ✅ real (canonical) |
| `apps/cms/.claude/skills/` | grill-me | ✅ symlink |
| `apps/cms/.claude/skills/` | cache-components, nextjs-best-practices, payload-block-extractor, tailwindcss-development, typescript, upload-local-image | ❌ real files, no `.agents` source |
| `apps/cms/.claude/agents/` | code-reviewer, data-scientist, debugger, frontend-developer (`.md`) | ❌ real files, no `.agents` source, no agents store anywhere |

### Target convention

> **`.agents/` is the single canonical, tool-agnostic store at the repo root. `.claude/` contains nothing but relative symlinks into `.agents/`.** No per-package `.claude` / `.agents` duplication.

```
/.agents/
  skills/   ← real dirs (canonical):
            find-skills, payload, turborepo, vercel-react-best-practices,
            payload-plugins-add-package, grill-me, cache-components,
            nextjs-best-practices, payload-block-extractor,
            tailwindcss-development, typescript, upload-local-image
  agents/   ← real files (canonical, NEW store):
            code-reviewer.md, data-scientist.md, debugger.md, frontend-developer.md
/.claude/
  skills/<name>     → ../../.agents/skills/<name>      (symlink, all entries)
  agents/<name>.md  → ../../.agents/agents/<name>.md   (symlink, all entries)
  settings.local.json   (untouched; gitignored)
  worktrees/            (untouched; locally git-excluded)
/apps/cms/.claude/   ← DELETED
/apps/cms/.agents/   ← DELETED
```

### Decisions

- **Agent `.md` files are symlinked too** (canonical in `.agents/agents/`) so the rule is uniform across skills and agents.
- **cms-scoped skills become repo-wide.** Promoting `payload-block-extractor`, `cache-components`, etc. to the root makes them available everywhere. This is acceptable and arguably better — `apps/cms` is the primary app and the others are also TypeScript/Payload code.
- **Instruction files are out of scope.** `apps/cms/AGENTS.md`, `apps/cms/CLAUDE.md`, `apps/dev/AGENTS.md` stay where they are — they are not part of the symlink convention.
- **Symlinks are relative**, e.g. `.claude/agents/debugger.md → ../../.agents/agents/debugger.md`, so they resolve identically on every machine and in worktrees.

### Work

1. Create `/.agents/agents/`. `git mv` the four `apps/cms/.claude/agents/*.md` into it.
2. For each stray real-file skill, `git mv` its directory into the appropriate `/.agents/skills/<name>` (root `payload-plugins-add-package`; the six cms skills; cms `grill-me` already canonical — move from `apps/cms/.agents`).
3. Replace every promoted entry under root `/.claude/skills` and `/.claude/agents` with a relative symlink into `/.agents/`.
4. Delete `apps/cms/.claude/` and `apps/cms/.agents/` entirely.
5. Document the convention in the root `CLAUDE.md` (new short "Agent setup" section) so it stops drifting.
6. Verify: every entry under `/.claude/skills` and `/.claude/agents` is a symlink (`git ls-files -s` shows mode `120000`) and resolves to an existing target.

### Risks / notes

- **Skill discovery from a subdirectory.** With cms's own `.claude` removed, a developer who runs the agent CLI with cwd `apps/cms` relies on root-level discovery. This matches standard monorepo usage (work from repo root) and is the explicit choice. Documented in `CLAUDE.md`.

---

## Part B — Delete `@repo/ui`, colocate UI in `apps/cms`

### Guiding principle

`@repo/ui` is cms-private in everything but location. Since it is being deleted (not republished), **portability is no longer a goal**, which frees us to colocate. A *feature is one folder*: its Payload config, its presentational section, and its controller live together. Only genuinely-reusable pieces live in shared folders.

### Target structure

```
apps/cms/src/
  components/                 ← SHARED, cross-feature pieces only
    ui/                       ← reusable PRESENTATIONAL primitives (pure, no Payload):
                                Button, Link, Image, RichText, SectionHeader, Eyebrow,
                                DisplayHeading, GridLines, AbstractBackdrop, Switch,
                                HorizontalSelect, Card, Accordion, Pagination, EmptyState,
                                SkeletonFallback, BlogPostCard, LinksList, CookieBanner, EmptyBlock
                                lib.ts  ← the ONE canonical cn / cva / resolveBackdropTone
                                index.ts
    shared/                   ← reusable CONTROLLER pieces (Payload-aware, cross-feature):
                                CMSLink, Media, RichTextRenderer, SectionContainer, Logo,
                                PostHero, AuthorAvatar, CopyAiPromptButton, RowLabel,
                                BlockLabel, Admin/*, ErrorBoundary
                                index.ts

  blocks/<Block>/             ← a feature = ONE folder, fully colocated:
      config.ts               ← Payload block config
      fields.ts               ← (where present) icon/enum field defs
      <Block>.tsx             ← presentational section (pure)   ← was @repo/ui/sections/<x>
      Component.tsx           ← controller (Payload-aware; data → presentational props)
      InlineComponent.tsx     ← (where present) controller variant
      index.ts
  widgets/<Widget>/           ← same colocation pattern (presentational + controller)
  features/<Feature>/         ← same
  collections/Header|Footer/  ← presentational Header/Footer section colocated here
```

### Where each current thing lands

- **`@repo/ui` primitives** (`components/ui/*`: button, link, image, richText, eyebrow, displayHeading, gridLines, abstractBackdrop, sectionHeader, switch, horizontalSelect) → `apps/cms/src/components/ui/`.
- **`@repo/ui` sections with a 1:1 block owner** (hero, cardsGrid, carousel, chart, content, ctaBand, logos, newsletter, stats) → **into the owning `blocks/<Block>/` folder** as `<Block>.tsx`.
- **`@repo/ui` sections owned by a collection** (header, footer) → into `collections/Header` / `collections/Footer`.
- **`@repo/ui` sections that are shared or have no single block owner** (blog/BlogPostCard — used by two widgets; linksList; cookieBanner; copy) → `components/ui/`.
- **`@repo/ui/utils.ts`** (`cn`, `cva`, `resolveBackdropTone`) → `components/ui/lib.ts`. This is the single canonical implementation for the app.
- **Today's `core/ui/blocks`** (CMSLink, Media, RichText wrapper, SectionContainer) and **`core/ui/components`** (Logo, PostHero, Card, AuthorAvatar, CopyAiPromptButton, RowLabel, BlockLabel, Admin/*, ErrorBoundary, EmptyState, Pagination, PageRange, Accordion, FaqSection, SkeletonFallback, CtaBandSection, Link) → split by nature: pure ones → `components/ui/`; Payload-aware ones → `components/shared/`. The exact per-component classification is enumerated in the implementation plan.
- **`core/lib/utils.ts`** (`cn` duplicate) → deleted; its importers repoint to `components/ui/lib`.

`blocks/` (Code, RawHtml, TestimonialsList, Faq, RenderBlocks), `widgets/`, `features/`, `lib/adapters/`, `dal/`, `core/seo/` keep their roles — they are already controllers. (`Faq`'s presentational `FaqSection` and `TestimonialsList`'s UI follow the same colocation rule.)

### Boundary rule (enforced)

> **Presentational** files (everything in `components/ui/`, and each block's `<Block>.tsx` section) take props and return JSX. They may import only `components/ui/*`, styling utils (`cn`/cva), and presentation libs (radix, recharts, icons). They **may NOT** import `@/payload-types`, `@/dal`, `payload`, `@payloadcms/*`, `@/lib/adapters`, or any server-only module.
>
> **Controllers** — each block's `Component.tsx` / `InlineComponent.tsx`, everything in `components/shared/`, and all of `widgets/`, `features/`, `collections/*/Component.tsx` — are the *only* files allowed to import Payload types/data. They map CMS data → presentational props (data prep via `lib/adapters`) and render presentational components. Presentational never imports a controller.

Enforcement: an oxlint `no-restricted-imports` (import-boundary) rule scoped so that files matching the presentational set cannot import the Payload/data modules listed above. If a clean lint scoping proves impractical, the rule is documented as a convention and checked in review; the directory + file-naming split keeps it obvious either way.

### Dependency migration

`@repo/ui` declares runtime deps; `apps/cms` already has some. The delta to **add to `apps/cms/package.json`** (those used by migrated components, not already present): `@hookform/resolvers`, `react-hook-form`, `cmdk`, and the missing radix packages (`react-alert-dialog`, `react-avatar`, `react-checkbox`, `react-icons`, `react-label`, `react-popover`, `react-select`, `react-separator`, `react-switch`, `react-toast`). Already present and reused as-is: `class-variance-authority`, `clsx`, `tailwind-merge`, `recharts`, `@radix-ui/react-{accordion,dialog,dropdown-menu,navigation-menu,slot}`. After the move, prune any added dep that no migrated component actually imports. Pin versions to the repo's existing `overrides` policy (single version each).

`@repo/tailwind-config` **stays** (cms depends on it directly).

### Migration steps (high level; detailed sequencing in the plan)

1. Create `components/ui/` and `components/shared/`; move `@repo/ui` primitives + shared sections + `utils.ts → lib.ts` in.
2. Move each 1:1 section into its `blocks/<Block>/` (and Header/Footer into their collections).
3. Reclassify and move today's `core/ui` contents into `components/ui` / `components/shared`.
4. Rewrite imports: `@repo/ui` → `@/components/ui` (and the colocated section path where applicable); `@/core/ui*` → new locations; `core/lib/utils` cn → `@/components/ui/lib`. (~31 `@repo/ui` sites + `core/ui` importers; mechanical.)
5. Absorb the dependency delta into `apps/cms/package.json`; remove the `@repo/ui` dependency.
6. Delete `packages/ui/`; remove it from the bun workspace and from `overrides`/turbo references if any.
7. Add the import-boundary lint rule + document the structure (in `apps/cms/CLAUDE.md` or a `components/README.md`).
8. Verify (see below).

### Out of scope

- **Plugins keep their own `cn()`** (`payload-plugin-analytics`, `-seo`, `-comments`). They are published packages and cannot depend on a private workspace package; no shared published util package is being created.
- No change to `apps/dev`, `@repo/tailwind-config`, `@repo/typescript-config`, the release pipeline, or any plugin's published surface.
- No behavioral/visual change is intended — this is a pure move/rename refactor.

### Risks / notes

- **Path-alias correctness.** cms uses `@/*` path aliases; the new `components/ui`, `components/shared`, and colocated section imports must resolve under the existing `tsconfig`/bundler alias config. Verify `@/components/*` resolves.
- **Server vs client components.** Some presentational components may currently rely on being in a separate package; moving into the Next.js app must preserve `"use client"` directives. Keep directives intact during the move.
- **Hoisted bun layout.** `bunfig.toml` uses `linker = "hoisted"` and `overrides` pin `payload`/`next`/react types. Removing a workspace package must not disturb these; re-run `bun install` and confirm the lockfile + hoisted layout stay consistent.
- **Large mechanical diff.** ~31 import sites plus internal `@repo/ui` cross-imports. Use codemod-style find/replace, then rely on `check-types` + `build` as the safety net.

---

## Verification (both parts)

- Part A: every `/.claude/skills/*` and `/.claude/agents/*` entry is a symlink resolving to an existing `/.agents/...` target; no `apps/cms/.claude` or `apps/cms/.agents` remains; `git status` shows only intended renames.
- Part B: `bun run build` (turbo, full) passes; `bun run check-types` passes; `bun run lint` passes (incl. the new boundary rule); `apps/cms` dev app boots and renders a representative page (Hero/CardsGrid/Footer) unchanged; `packages/ui` is gone and no dangling `@repo/ui` reference remains (`grep -rn "@repo/ui" --include='*.ts*' --include='*.json'` returns nothing under `apps/`/`packages/`).

## Execution order

1. Part A (mechanical, low-risk) — commit.
2. Part B (the refactor) — commit.

Each part is implemented against this design; a detailed step-by-step implementation plan follows via the planning step.
