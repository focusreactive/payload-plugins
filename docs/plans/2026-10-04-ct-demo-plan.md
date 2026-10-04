# CT demo — rebuild + migration (implementation plan for `apps/cms`)

> **For the implementing agent (Claude Opus 5.5).** Execute this document task-by-task, in order,
> on branch `claude/busy-planck-k29mbr`. Work **directly in `apps/cms`**: this branch is a one-off
> demo and will never be merged into `main`, so there is no need to protect the boilerplate.
> **Never push.** Commit locally after every task with the message given; Maksim pushes.
> Before the first commit read `/CLAUDE.md`, `apps/cms/CLAUDE.md`, `apps/cms/src/components/README.md`,
> `apps/cms/src/lib/dal/README.md`. Validate every task with
> `cd apps/cms && bun run check-types && bun run lint` (auto-fix: `bun run lint:fix`). Never edit
> `payload-types.ts`, `importMap.js` or migration files by hand; regenerate them. Where this document
> and the code disagree, the code wins; note the deviation in the commit body and keep going.
> Section 5 is the **feature contract** (why / exists / build / accept / demo). Section 6 is the
> **design contract**. Section 8 is the **order of work**. Sections 3 and 4 are facts you need; read
> them once, fully.

**Date:** 2026-10-04 · **Status:** ready to execute · **Branch:** `claude/busy-planck-k29mbr` (throwaway) ·
**Owner:** Maksim Hodasevich (FocusReactive TechLead). **Client:** codename **CT** — real name, contacts
and commercial context live in the internal CRM; never write them into this repository.

---

## 0. TL;DR

Build a believable first version of CT's new website inside the FocusReactive "Ideal CMS"
boilerplate (`apps/cms`: Payload 3.90 + Next.js 16 + Postgres + Tailwind 4), fed with CT's
real content (all 35 marketing pages, the 5 news posts + 35 newest articles and their authors; the
full 191-post dump stays one flag away) and
redesigned in CT's own brand (dark blue `#124853`, racing green `#007839`, electric green
`#b5ff6b`, Inter). Every promise in the technical proposal gets a visible, clickable moment in the
admin or on the site, and the whole thing also runs as a Docker image on `debian:trixie` next to a
Postgres, a Nginx and a Keycloak, because that is how the client will host it.

Order of work: setup → brand tokens & chrome → content model → locales → seed infra → seed content
→ seed chrome → seed pages → feeds, redirects, privacy → design polish & a11y → Docker/Keycloak →
verification & demo script → preview deploy (only after Maksim approves the push).

### 0.1 Before the implementing session starts (Maksim's checklist)

The implementing agent usually runs in a **cloud sandbox**: no Docker daemon, no local Postgres,
outbound network limited (the client's site is blocked; Google Fonts, npm, Neon and Vercel Blob
work). Everything client-specific stays out of git, so it reaches the sandbox through one archive.

1. Locally, on this branch: put the dump at `apps/cms/.local/ct/content-dump.md` and the logo at
   `apps/cms/.local/ct/brand/logo.svg`; run the image scraper (see
   `docs/plans/2026-10-04-ct-demo-content.md` §2); zip the folder:
   `cd apps/cms/.local && zip -r ct-local.zip ct`.
2. Upload the archive to the Vercel Blob store (unguessable URL, deletable after the demo):
   `bunx vercel blob put apps/cms/.local/ct-local.zip --rw-token "$BLOB_READ_WRITE_TOKEN"`.
3. Cloud environment variables for the session (environment menu → Edit): `CT_LOCAL_ARCHIVE_URL`
   (the Blob URL), `DATABASE_URL` (a **dedicated Neon branch for development** — not the preview
   branch Vercel creates), `PAYLOAD_SECRET`, `PREVIEW_SECRET`, `CRON_SECRET`,
   `BLOB_READ_WRITE_TOKEN` (media must survive container recycling), optional `OPENAI_API_KEY`;
   `NPM_TOKEN` is already there.
4. Deployment Protection on the `cms` Vercel project: the branch preview must open without a Vercel
   login (exception list / share link).
5. Docker (T12) is written in the sandbox but **built and verified on Maksim's machine**.

---

## 1. Context

### 1.1 The client and the deal

CT is a UK open-source systems-software consultancy (~100 engineers: Linux, build tooling,
safety-critical "trustable software", automotive SDV, RISC-V). It is replacing a 2016 Pelican static
site (Markdown in GitLab, Nginx) with a CMS-driven site. Brief highlights (details in the internal CRM):

- open-source, self-hostable CMS; marketing builds campaign pages from **blocks without developers**
- published site **static behind Nginx**, CMS and build **off the public internet**
- their stack: Debian trixie, Docker, Nginx, Traefik, one shared PostgreSQL, **Keycloak OIDC**, GitLab
- **Mautic** forms as literal HTML (no iframes), newsletter sign-ups everywhere
- preserve blog/article URLs; feeds stay where they are
- multilingual: **German + Japanese** (now or architected for later); field-level translation
- **cookieless** (Plausible analytics), **WCAG 2.2 AA**, YouTube without cookies
- ~50 pages across ~20 templates; existing content: 186 articles + 5 news posts in Markdown, 77
  authors, 211 tags, ~500 images (the proposal numbers)
- FocusReactive also owns UX/UI design (the client's wireframing fell through; their inputs arrive
  2026-10-09); the proposal call is in October

### 1.2 What the demo must prove (feature → requirement → task)

| # | Feature (what the client asked for) | Where the proposal promises it | Requirement | Built in |
|---|---|---|---|---|
| F1 | Page builder: reusable sections, presets, live preview, visual editing, no developer per page | Phase 1 "The page builder" | §5.1 | T2–T4, T9, T11 |
| F2 | Articles in two formats: imported **Markdown kept as Markdown**, new posts in rich text; images migrated | "Articles keep their Markdown", "Media moves into the CMS" | §5.2 | T4, T7 |
| F3 | Listings generated from content: news, blog, case studies, reports, events; author pages | "Articles and listings", "Tags and authors become records" | §5.3 | T4, T9, T10 |
| F4 | Every legacy URL keeps working (4 article URL shapes, `.html` marketing pages, author pages) | "Every existing article address keeps working" | §5.4 | T8, T10 |
| F5 | RSS + Atom feeds at their current addresses | "Feeds stay where they are" | §5.5 | T10 |
| F6 | Forms: a simple **form builder** in the CMS (no plugin), Mautic mode as literal HTML, newsletter sign-up, gated downloads | "Forms", "Mautic forms as part of the page", "Newsletter sign-up" | §5.6 | T4, T9, T11 |
| F7 | Editorial workflow and **roles**: author drafts, editor publishes, admin deletes; comments with mentions; versions; scheduling | "Editorial workflow", "Roles and access", "From draft to live" | §5.7 | T4, T13 |
| F8 | **Languages**: EN live, DE + JA switched on, **field-level** translation, AI translation plugin | "Languages", Phase 2 "German and Japanese" | §5.8 | T5, T13 |
| F9 | **Keycloak** sign-in (OIDC), roles from groups | "Sign-in through your identity provider", Phase 2 "Roles from Keycloak groups" | §5.9 | T12 |
| F10 | **Cookieless** site, Plausible, click-to-load YouTube | "Privacy and accessibility", "YouTube without cookies" | §5.10 | T10, T4 |
| F11 | Technical SEO + AI search: metadata, JSON-LD, sitemap with every page, robots allowing AI crawlers, llms.txt | "Technical SEO and AI search" | §5.11 | T10 |
| F12 | WCAG 2.2 AA on every template | "Privacy and accessibility" | §5.12 | T11 |
| F13 | Self-hosted: containers on the client's `debian:trixie` image, env-only config, no internet at runtime, their Postgres (shown via compose; the shareable link stays a normal Vercel preview) | "The self-hosted application", "Running on your infrastructure" | §5.13 | T12 |
| F14 | **Redesign** in CT's brand, by us | Agency Brief: FR takes design from UI to final visuals | §6 | T2, T3, T9, T11 |

### 1.3 Non-goals (say them on the call, do not build them)

- A truly static public site (`output: "export"`). `apps/cms` depends on middleware (locale + A/B
  rewrites), draft preview, PPR on the blog and dynamic search, which `next export` cannot build.
  The demo serves the site server-rendered from the CMS container; the publish → GitLab pipeline →
  static files flow is a slide. A compose-only "static snapshot" (Nginx serving a `wget --mirror` of
  the running site) is a stretch in T12 and must be labelled as a demonstration.
- GitLab pipeline, Mautic preference centre, approval workflow, add-to-calendar, accessibility
  statement (Phase 2 items).
- Changes under `packages/*` (published plugins). If a plugin needs a fix, do it in `apps/cms`
  wiring and note it.
- Images of the **marketing pages** (partner logos, hero illustrations): replaced by the line-motif
  system and generated covers. Article images **are** migrated for the selected posts through the
  image map (§5.2, `docs/plans/2026-10-04-ct-demo-content.md`).

---

## 2. Sources of truth

| What | Where | Notes |
|---|---|---|
| Full site content dump (1.57 MB markdown, 16 775 lines, md5 `bdd272aaace9c7c51157a9436ed8d0b1`) | Internal: CRM page "CT site content dump — demo prep (FULL)" (attachment) and Maksim's machine | Place it at `apps/cms/.local/ct/content-dump.md`. Never commit it. |
| Overview + chrome + template analysis | Internal Google Doc "CT site content dump — demo prep" | Same header/nav/footer/CTA text as section 1 of the dump. |
| What we promised | Internal: "CT Technical Proposal" (CRM → Proposals) | Phase 1 / Phase 2 scope; the table in §1.2 is derived from it. |
| Client brief, sitemap facts, deal history | Internal: CRM project page "CT — Rebuild + CMS migration" | New sitemap: Homepage, History, FOSS & Community, Partnerships, Case Studies & Demos, sector pages, SDV page, two capability variants, "The CT Way" → open-source tool pages (one template); listing template w/ variants; whitepaper w/ download; events w/ YouTube; newsletter template; Mautic preference centre. |
| Estimate | Internal Google Sheet "CT estimations" | "~40 blocks", articles & listings XL, Mautic forms XL, Keycloak S, static container L. |
| Brand: official logo | `apps/cms/.local/ct/brand/logo.svg` (git-ignored; Maksim has the file) | 360×77 wordmark, fill `#64a800`, built from concentric ring strokes. The seed copies brand assets into the git-ignored `apps/cms/public/ct/`. |
| Brand: live-site CSS | §6.2 reproduces the client's `:root` tokens verbatim (Maksim pasted the production stylesheet). | Fonts: self-hosted Inter variable. Signature motifs: angled 5vw dividers, dark-blue hero/footer, lime header CTA, tag pills, icon circles. |
| Content selection + image map contract | `docs/plans/2026-10-04-ct-demo-content.md` | The selection rule (5 news + 35 newest articles, derived from the dump at run time — no URL list is committed), the scraper `src/lib/seed/ct/scrapeImages.ts` and the `images-map.json` format the seed consumes. |
| Hosting hand-out + Docker files | `docs/plans/2026-10-04-ct-hosting.md`, `apps/cms/Dockerfile`, `apps/cms/docker-compose.yml`, `apps/cms/docker/*`, `apps/cms/.env.docker.example`, root `.dockerignore` | Already written (unbuilt); T12 makes them build and run. |
| Live site | `https://www.<client-domain>/` | Blocked from Anthropic's cloud sandbox; may be reachable from yours. Screenshots exist in this session's history; the CSS in §6.2 is authoritative. |

**Do not commit the dump, the proposal, estimates or emails.** The repository is public. Client
website copy enters the database through the seed only; the raw file lives in git-ignored
`apps/cms/.local/`.

## 3. Repository facts (verified 2026-10-04 against the code; trust these, re-check only if a command fails)

### 3.1 Commands (`apps/cms`)

```bash
bun install                      # repo root; NPM_TOKEN needed for @fr-private/payload-plugin-visual-editing
bun run dev                      # Turbopack, http://localhost:3333 (admin at /admin)
bun run build                    # next build, 8 GB heap
bun run check-types              # tsgo --noEmit
bun run lint / lint:fix          # Ultracite (oxlint + oxfmt); lefthook pre-commit auto-fixes staged files
bun run generate:types           # after ANY schema change
bun run generate:importmap       # after adding/moving admin components (registered by path string)
bun run payload migrate:create <name> && bun run payload migrate   # push:false — migrations are explicit
bun run test:int / test:e2e      # vitest (tests/int) / playwright (tests/e2e)
bun run payload run <file.ts>    # run a script with the Payload config (pattern used by the demo apps' seeds)
```

### 3.2 Architecture rules you must follow

- `src/` root holds the Payload nouns (`collections/`, `globals/`, `blocks/`) and the UI kit
  (`components/`); everything supporting lives in `src/lib/` (ADR-0001). A folder is earned by 2+
  related files, otherwise a flat file in `lib/utils/`.
- **Block layout:** `blocks/<Name>/config.ts` (Payload config, wrapped in `injectSection()` which
  adds the `section` tab: theme light/dark/light-gray/dark-gray, maxWidth, paddingY/X, background
  media + overlay, visibility) + `Component.tsx` (controller: Payload-aware, may import `@/dal`,
  `@/payload-types`, adapters) + `ui/` (presentational; **lint forbids** importing `@/payload-types`,
  `@/dal`, `@/lib/adapters`, `payload`, `@payloadcms/*` from `blocks/*/ui/**` and
  `collections/*/ui/**`) + `extractText.ts` (text for search/SEO extraction). Register in
  `blocks/contentBlocks.ts`, `blocks/contentBlockComponents.tsx`, `lib/utils/blockPreviewImage.ts`
  (+ PNG in `public/block-preview-images/`), the search extractor switch in
  `collections/Page/extractPageText.ts` and the SEO content extractor in
  `collections/Page/extractPageContent.ts` (the `payload-block-extractor` skill walks through it).
- **DAL:** app code calls `@/dal` (`getPayloadClient()`, `getPosts`, `getPageBySlug`, …), never
  `getPayload({config})`. Inside hooks/access/validate use `req.payload` and pass `req`.
- **Local API with a user ⇒ `overrideAccess: false`.** Seeds run without a user (admin privileges).
- **React Compiler is on:** no `useMemo` / `useCallback`.
- **Localization:** content locales come from `lib/config/i18n.ts` (`en`, `es` today). Field labels
  `{ en, es }` are **admin UI languages** (`i18n.supportedLanguages`), a different thing; they stay.
  `createLocalizedDefault({ en, es })` is typed `Record<Locale, T>` — adding locales means loosening
  that type (see §5.8). URLs are locale-prefixed `as-needed` (`/`, `/es/...`).
- **Postgres 63-char identifiers:** block slugs and nested array/select names short; budget
  `_pages_v_blocks_<slug>_<array>_<field>` and `_gsec_v_blocks_…` (GlobalBlock dbName `gsec`).
- **Custom admin components** are registered by path string (`"/components/admin/X#Named"`), then
  `generate:importmap`.

### 3.3 What already exists (do not rebuild; reuse and restyle)

| Area | What is there |
|---|---|
| Collections | `users` (auth; `role` select `admin`/`author`/`user`, **defaultValue `admin`**), `media` (folders on; `defaultFor: platform_default`; sizes thumbnail/square/small/medium/large; Vercel Blob when token set, else `public/media`), `page` (nested-docs parent/breadcrumbs, drafts, blocks tab + SEO tab, header/footer relations), `posts` (title, excerpt, heroImage *required*, `content` richText with inline blocks, optional FAQ + CTA groups, publishedAt, readingTime (hook), categories, authors, relatedPosts, SEO), `categories` (title + slug), `authors` (name, avatar — **no slug**), `testimonials`, `header` (logo, `navItems` ≤ 6 with link|dropdown mega-menu: featured card + links; `actions` ≤ 2), `footer` (logo, description, `linkGroups` ≤ 4, `legalLinks` ≤ 4, `copyrightText`), `globalBlock` (one block, reusable via the `globalSectionSlot` block), `document-embeddings` (pgvector search), plugin collections: `redirects`, `presets`, `comments`, `ab-experiments`, `payload-mcp-api-keys` |
| Global | `site-settings`: siteName, admin logo/icon, SEO defaults (title separator/suffix, description, OG, X), blog page settings (header/footer/title/description/meta), 404 settings |
| Blocks (12) | `hero` (variants showcase/centered; eyebrow, title, richText, ≤2 actions, image), `content` (eyebrow/heading/description, layout image-text/text-image, image, richText, actions), `cardsGrid` (section header, columns, items: icon from 20 lucide names, title, description, align/rounded/background), `logos` (label, align, items), `stats` (2–4 value/label), `faq` (items question/answer), `testimonialsList`, `carousel`, `chart`, `ctaBand` (section header + ≤2 actions), `newsletter` (eyebrow, heading, placeholder, button, disclaimer — **submit is faked client-side**), `rawHtml`, plus `globalSectionSlot` |
| Fields | `link()` (type reference/custom/customPage(blog, search), newTab, label, appearance default/outline/accent/ghost/link), `linkGroup`, `imageField`, `slugField`, `sectionHeaderFields()` (eyebrow, heading, description), `heroFields`, `generateSeoFields()`, `generateRichText("default" | "hero")` (headings, lists, links, uploads, blockquote, **tables**, optional inline blocks) |
| UI kit | `components/shared` (CMSLink, Media, RichText renderer, SectionContainer applies `data-theme` zones, Container, Link), `Button` (cva: Default/Primary/Accent/Secondary/Badge/Ghost/GhostDark; pill radius today), `Eyebrow` (mono uppercase chip, tones), `DisplayHeading`, `SectionHeader`, `Card`, `Accordion`, `GridLines`, `AbstractBackdrop` (orbs/blobs in teal/lime — to be replaced), `BlogPostsGrid`, `RelatedPosts`, `PostHero`, `AuthorAvatar`, `Pagination`, `PageRange`, `FaqSection`, `CtaBandSection`, `Testimonials`, `ThemeSelector`, `LocaleSelector`, `cookieBanner` (component exists, **not mounted**), `LivePreviewListener`, `VisualEditingEditRouter`, `PayloadRedirects`, `seo/*` JSON-LD (Article, Breadcrumbs, Blog, FAQ, Organization) |
| Routes | `(frontend)/[locale]/page.tsx` (home = page slug `home`), `[...slug]` (nested pages via breadcrumbs), `blog` (PPR, search, category filter, pagination), `blog/[slug]` (PostContent: hero, body, FAQ, CTA, related), `search`, `not-found`, `next/preview|exit-preview|preview-init`; `robots.ts`, `sitemap.ts` (pages + posts, all locales, alternates); `(payload)/api/[...slug]`, `(payload)/api/auth/oidc` + `/callback` (OIDC SSO: Auth0/Keycloak-style issuer, PKCE optional; creates/links users by email; **no group→role mapping**) |
| Plugins wired (`lib/plugins/index.ts`) | Vercel Blob (always on, token may be empty), redirects (from/to, 307/308, `isActive`, validated `from`), SEO analysis panel (`@focus-reactive/payload-plugin-seo`), nested docs, presets, comments (mentions), scheduling (`GET /api/scheduled-publish/run` with `Authorization: Bearer $CRON_SECRET`), translator (OpenAI provider, sync runner — needs `OPENAI_API_KEY`), A/B (middleware rewrites; cookies set **only when an experiment matches**), analytics (GA4; **self-disables** when `GA4_MEASUREMENT_ID` is not a `G-…` id), visual editing (`@fr-private`), MCP (`@payloadcms/plugin-mcp` with content tools), `restrictApiAccess` (last) |
| Middleware | `src/proxy.ts`: A/B rewrite → next-intl locale routing. **Matcher skips `api`, `admin`, `_next`, `_vercel` and any path containing a dot** (`.*\\..*`). Consequences: `/feeds/all.atom.xml` and `/llms.txt` bypass locale routing (good); `/automotive.html` and `/news/x.html` also bypass it and will 404 unless handled (§5.4). |
| Deploy | `vercel.json`: build = `turbo build --filter='./packages/*'` → `bun run migrate` → `next build`; cron `/api/scheduled-publish/run` hourly. Neon↔Vercel integration creates a `preview/<branch>` DB per PR (`.github/workflows/cleanup-neon-preview-branch.yml` deletes it on PR close). Media prefix per environment: `lib/storage/mediaStoragePrefix.ts` (`""` prod, `preview/<branch>`, `dev`). |
| Fonts | `next/font/google`: Newsreader (display serif), Archivo (sans), IBM Plex Mono → exposed as `--font-newsreader`, `--font-archivo`, `--font-ibm-plex-mono`; `packages/tailwind-config/base.css` maps them to `--font-display/--font-sans/--font-mono` and defines the two-tier color tokens (primitives → semantic roles) plus `[data-theme]` zones and `text-display-1/2`, `text-h-section`, `text-h-card`, `text-lead`, `text-body-lg`, `text-small`, `text-eyebrow` utilities. `apps/cms/src/app/(frontend)/styles.css` imports it and sets container/section spacing variables. |
| Tests | `tests/int/*.int.spec.ts` (vitest, jsdom), `tests/e2e/frontend.e2e.spec.ts` (Playwright, Chromium; currently a template test) |

### 3.4 Gotchas to design around

1. **Dotted paths skip the proxy** → legacy `.html` redirects must be resolved in `proxy.ts`
   itself with a widened matcher (§5.4). Keep `.xml`, `.txt`, images, fonts excluded.
2. **`heroImage` on posts is required** → every seeded post needs a cover (generated).
3. **Users default role is `admin`** → OIDC-created users must get an explicit role (§5.9).
4. **Vercel Blob plugin is always registered** → make it `enabled: Boolean(token)` for Docker (§5.13).
5. **Analytics env vars are read with `!`** but the plugin self-disables when the id is invalid;
   the client provider still mounts — gate it behind the env var (§5.10).
6. **A/B cookies** are set only when an experiment matches a path; keep zero experiments seeded and
   assert no cookies (§5.10). Do not delete the plugin; it is a "future possibility" slide.
7. **Markdown→Lexical converter**: verify `convertMarkdownToLexical` / `editorConfigFactory` exist
   in `node_modules/@payloadcms/richtext-lexical/dist/index.d.ts` after install. If absent, fall
   back to the hand-rolled converter (§5.2).
8. **Translator needs `OPENAI_API_KEY`**; semantic search needs it too. Without it the admin still
   works; the demo moment for translation is skipped.
9. **`createLocalizedDefault` typing** blocks adding locales until loosened (§5.8).
10. **Newsletter block fakes submit** → wire it to the form endpoint (§5.6).

## 4. The content dump — format you must parse

One markdown file, four top-level sections (`# 0.` analysis, `# 1.` chrome, `# 2.` marketing
pages, `# 3.` posts, `# 4.` skipped). Every page/post is an entry:

```
## 2.8 Automotive                                   ← "## <n>.<m> <Title>" (title = page H1)

**URL:** https://www.<client-domain>/automotive.html
**Title tag:** Automotive | CT
**Template:** T-SECTOR — Sector landing (industry vertical)
                                                   ← posts add, between URL and Title tag:
**Date:** Wed 08 January 2025                      ←   "Ddd DD Month YYYY"
**Author:** John Ellis                             ←   one string; 69 distinct; "CT" = company

<body markdown>                                    ← ###/####/##### headings, paragraphs, "- " lists,
                                                      22 table lines, 2 "> " quotes, NO fenced code,
                                                      NO images, NO tags, NO front matter
---                                                ← entry separator (240 of them)
```

Counts to assert in the parser test (`tests/int/ctDump.int.spec.ts`; skipped when the file
is absent):

| Metric | Expected |
|---|---|
| Entries with `**URL:**` | 237 (46 marketing + 191 posts) |
| `**Template:**` distribution | T-BLOG-POST 186 · T-SERVICE 9 · T-FRAGMENT 7 · T-NEWS-POST 5 · T-ABOUT-FAMILY 5 · T-SOLUTION 4 · T-SECTOR 4 · T-JOB-JD 4 · T-LISTING 2 · one each of T-HOME, T-CONTACT, T-LEGAL, T-CAMPAIGN, T-CASESTUDY-INDEX, T-REPORTS-INDEX, T-EVENTS-INDEX, T-NEWS-INDEX, T-BLOG-INDEX, T-ARCHIVE-INDEX, T-MARKETING-GENERIC |
| Posts with `**Date:**` / `**Author:**` | 191 / 191 |
| Distinct authors | 69 (the company account has 18 posts; the next five authors have 13, 12, 9, 8 and 7) |
| Post years | 2014–2026 |
| Post URL shapes | `/articles/YYYY/slug/` 159 · `/articles/YYYY/slug.html` 8 · `/articles/slug/` 19 · `/news/slug.html` 5 |

Parsing rules:

1. Split on lines equal to `---`; an entry is valid when it has a `**URL:**` line.
2. Metadata = the `**Key:**` lines before the first body paragraph. Keep only the `T-…` code of
   `**Template:**`.
3. `slug` = last non-empty path segment, lowercased, `.html` stripped, non `[a-z0-9-]` → `-`;
   collisions throw (none expected; the test asserts uniqueness across pages and posts).
4. **Strip leaked chrome**: cut from the first line matching `^### Get in touch to find out how
   CT can help you`, `^### Other Content`, `^Certificate Number`, `^© CT Ltd` to the
   entry end; drop nav-only list items (`About Us`, `Our Services`, `Careers`, `Environmental
   Policy`, `Privacy Policy`, `Contact Us`, `Full archive`) that follow a stripped marker. Keep
   `### About CT` / `### About exida` boilerplate — real press copy.
5. Marketing pages: `### Related articles`, `#### Our other services:`, `#### CT Blog:`,
   `Relevant articles:` and the link-only lists under them are navigation → remove; the new pages
   get a `postsList` block and the mega-menu instead.
6. Form stubs: `Learn more about our Privacy Policy here .`, `By clicking submit, …`,
   `Download white paper`, `#### Complete the form below …` ⇒ set `hasDownloadForm: true` on the
   entry and remove those lines.
7. Flattened code: body lines starting with `# ` (5) and lines > 1 500 chars that read as shell/code
   (19) → one paragraph whose text node has `format: 16` (inline code). Never a heading.
8. Headings: bodies start at `###` (page H1 is the entry title) → `###`→h2, `####`→h3, `#####`→h4.
9. Ignore `T-FRAGMENT` (7 empty includes), `T-LISTING` (2 author pages — authors come from posts),
   `T-ARCHIVE-INDEX`.
10. Normalise scrape artefacts: `/\s+([,.;:!?])/g → "$1"`; collapse double spaces.

Output `ParsedSite { chrome, pages: ParsedPage[], posts: ParsedPost[], authors: string[] }` cached
at `apps/cms/.local/ct/parsed.json`. Each `ParsedPost` keeps `markdown` (the cleaned body,
verbatim) **and** gets a Lexical conversion only when needed (§5.2 stores Markdown as Markdown).

## 5. Feature requirements (the contract)

Each feature: **Why** (what the client said / we promised) · **Exists** (in `apps/cms` today) ·
**Build** (exact work) · **Data** (schema) · **UI** (what it looks like, see §6 for visuals) ·
**Accept** (how you prove it) · **Demo** (the moment on the call).

### 5.1 F1 — Page builder: sections, presets, live preview, visual editing

**Why.** "Marketing assembles campaign pages from a library of reusable sections without a
developer" is the central reason Payload beats Decap in the proposal. The estimate sells "~40
blocks shared across every template".

**Exists.** 12 blocks + `globalSectionSlot`, presets plugin (save any block as a preset and insert
it), live preview (admin shows the real page, three breakpoints), visual editing (click text on the
preview → field), nested pages, drafts/versions.

**Build.**
- Four new blocks: `postsList` (§5.3), `caseStudies` (§5.3), `form` (§5.6), `videoEmbed` (§5.10).
- Restyle every block's `ui/` per §6.7 (the redesign is mostly block UI work).
- Seed **presets** that make the "no developer" claim concrete: "Service hero (dark)", "Sector hero
  + case studies", "Gated whitepaper form", "Newsletter band", "Contact enquiry form", "Latest news
  (3)". Presets plugin collection slug: `presets`; create via Local API with the block data.
- Keep the block picker tidy: every block has a preview PNG (`public/block-preview-images/`), labels
  in `en` + `es`.

**Accept.** In the admin: create a page from scratch using only the picker and presets, publish,
open it: it looks like a CT page (§6 cadence rules hold). Live preview shows edits without
reload; visual editing badge appears on hover in preview; a preset inserted twice renders twice.

**Demo.** Open `/sectors/automotive` in the editor → live preview → change the hero title → insert
"Gated whitepaper form" preset → publish → reload public page.

### 5.2 F2 — Articles in two formats: imported Markdown stays Markdown; new posts are rich text

**Why.** CT's 186 articles live as Markdown in GitLab and engineers write Markdown. The
proposal promises: "Imported articles keep their Markdown and can still be edited as Markdown. New
posts are written in rich text." Images (~500) must travel with the articles.

**Exists.** `posts.content` is Lexical rich text (required) with inline blocks; `RichText` renderer
with prose styles; `readingTime` hook; `extractPostText.ts` feeds search/SEO; `PostContent`
renders hero + body + FAQ + CTA + related.

**Build.**
- Posts fields (`collections/Posts/index.ts`): `contentFormat` select (`richText` default |
  `markdown`) in the sidebar; `markdown` field of type `code` (`admin.language: "markdown"`,
  `admin.condition: contentFormat === "markdown"`); `content` becomes `required: false` with a
  collection-level `validate`/`beforeValidate` hook: exactly the field for the active format must be
  non-empty. `sourceUrl` (text, sidebar, readOnly) and `legacyPath` (text, hidden) for migration.
- Rendering (`blog/[slug]/_components/PostContent`): when `contentFormat === "markdown"`, render
  `MarkdownBody` (server component). Preferred implementation: `convertMarkdownToLexical` from
  `@payloadcms/richtext-lexical` with `editorConfigFactory.fromEditor({ config, editor:
  generateRichText("default") })` → pass the result to the existing `RichText` renderer so Markdown
  and rich-text posts share one design. Fallback (if the export is missing or drops tables/code):
  `react-markdown` + `remark-gfm` + `rehype-sanitize`, wrapped in the same `prose-copy` classes.
  Fenced code → `<pre><code>` styled per §6.6 (dark-blue block); tables → §6.6 table style; images
  → `<img>` with `loading="lazy"`, max-width 100%, caption from title text.
- Images: the dump has none, so they arrive through **`apps/cms/.local/ct/images-map.json`**
  produced by `src/lib/seed/ct/scrapeImages.ts` (Maksim runs it locally; contract and
  format in `docs/plans/2026-10-04-ct-demo-content.md` §2–§3). The importer (T7) uploads each
  `local` file to Media (folder "Articles"), picks the cover (splash → first inline → og → generated)
  and inserts `![alt](mediaUrl)` after the mapped block index of the Markdown body. The importer
  also keeps supporting `![alt](src)` already present in Markdown (for the later GitLab export) and
  is unit-tested on a fixture with 3 images. When the map is missing, posts get generated covers
  and the run logs a single warning.
- Admin affordance: sidebar UI field `ConvertToRichText` (`"use client"`, `@payloadcms/ui`
  `useForm`/`useField`): converts `markdown` → Lexical via the same converter through a small
  server endpoint (`POST /api/posts/convert-markdown`), writes `content`, flips `contentFormat`.
  Optional if time is short; it is a strong demo moment ("edit as Markdown or upgrade to rich text").
- `extractPostText.ts` / `extractPostContent.ts`: include the Markdown body so search, SEO analysis
  and embeddings work for both formats.
- Reading time hook: compute from Markdown text when in Markdown mode.

**Data.** `contentFormat: "richText" | "markdown"`, `markdown: string | null`, `content: Lexical |
null`, `sourceUrl`, `legacyPath`. Migration required.

**UI.** Identical typography for both formats; Markdown posts show an eyebrow "Imported from
Markdown" **only in the admin sidebar**, never on the site.

**Accept.** Seeded posts render with `contentFormat: markdown`; a new post written in the Lexical
editor renders through the same layout; the fixture post with images shows 3 images; search finds a
phrase from a Markdown post; `ConvertToRichText` turns a Markdown post into an editable Lexical
document.

**Demo.** Open an imported article → sidebar shows Markdown source → edit a line → preview updates →
"Convert to rich text" → the same article now has the block toolbar.

### 5.3 F3 — Listings and author pages

**Why.** News, blog, case studies, reports and events are listings generated from content; "tags
and authors become records, their pages are generated". The estimate: "Articles, news & listings
(tag & author pages generated)" XL, "Case studies filtered onto sector pages".

**Exists.** `/blog` index (search, category filter, pagination, featured post), `getPosts` DAL
(category filter), `BlogPostsGrid`, categories collection. No author pages, no generic listing block.

**Build.**
- **`postsList` block** (`blocks/PostsList/`): `sectionHeaderFields()`, `source` select
  (`latest` | `category` | `author`), `category` relationship (condition), `author` relationship
  (condition), `limit` (1–12, default 3), `layout` select (`grid` | `list` | `featured`), `viewAll`
  link (optional). Controller fetches via `@/dal` (`getPosts` extended with `author` slug filter);
  UI per §6.7. Empty state uses `EmptyBlock`.
- **`caseStudies` block** (`blocks/CaseStudies/`): `sectionHeaderFields()`, `filterSector` select
  (all | automotive | agritech | finance | medical | other), `items` array (min 1): `title`
  (localized), `sector` select, `technologies` text (comma-separated), `problem`, `solution`,
  `result` textareas (localized). UI per §6.7. Sector pages insert the block with `filterSector`.
- **Author pages**: add `slug` to `authors` (`slugField` from name) and `bio` textarea; route
  `(frontend)/[locale]/blog/author/[slug]/page.tsx` (hero with avatar/name/bio, `postsList`-style
  grid of the author's posts, pagination via `?page=`); `generateMetadata`; add author URLs to
  `sitemap.ts`. Legacy `/author/<slug>.html` redirects there (§5.4).
- News index = page `/resources/news` with `postsList source=category(news) layout=list limit=12`.
  Case studies, reports, events = pages (§7).
- Tags: the dump has no tags, so **categories** stand in (11 rules, T7). Say so on the call.

**Accept.** `/resources/news` lists exactly the 5 news posts newest-first; the most prolific author of the
selection lists 10 posts; a sector page shows only its case studies; `postsList` with `limit=3` on the home
page shows the three newest posts.

**Demo.** Change `limit` and `layout` on the home page's `postsList` in live preview; open an
author page from a post byline.

### 5.4 F4 — Every legacy URL keeps working

**Why.** "Every existing article address keeps working" and the four URL shapes are quoted in the
proposal. SEO equity is the client's main migration fear.

**Exists.** `redirects` plugin collection (from → page/post or URL, 307/308, `isActive`,
normalised `from`), `PayloadRedirects` component resolves them for unmatched locale routes.

**Build.**
- **Static legacy map** `src/lib/redirects/legacy.json` (generated by the seed, committed — it holds
  only URL pairs): old path (lowercased) → new path. Entries: every seeded post (all shapes, with
  and without trailing slash and `.html`; 40 by default, 191 with `--all-posts`), 2 author pages, every old marketing `.html` → new page (§7
  table), `/updates.html` → `/blog`, `/news.html` → `/resources/news`, `/casestudies.html`,
  `/reports.html`, `/events.html`, `/contact.html`, `/privacy.html`, `/join-us.html`,
  `/services.html` → `/what-we-do`, `/index.html` → `/`.
- **Proxy handling** (`src/proxy.ts`): widen the matcher so `.html` paths reach the proxy but assets
  do not: `"/((?!api|admin|_next|_vercel|.*\\.(?:png|jpe?g|gif|svg|ico|webp|avif|css|js|map|txt|xml|woff2?|ttf|json)$).*)"`.
  Next compiles matcher strings with path-to-regexp; if it rejects the non-capturing group or the
  `$` anchor, use the simpler `"/((?!api|admin|_next|_vercel).*)"` and do the asset-extension
  short-circuit (`return NextResponse.next()` for `/\.(png|jpe?g|…)$/`) as the first line of
  `middleware()`.
  Then: `const hit = LEGACY_REDIRECTS[pathname.toLowerCase().replace(/\/+$/, "") || "/"]`
  → `NextResponse.redirect(new URL(hit, request.url), 308)`. Import the JSON statically (the map
  is ~450 entries; fine for the proxy bundle).
- **Editorial redirects** stay in the CMS collection (demo: create one live); `PayloadRedirects`
  continues to serve them for non-dotted paths.
- Query strings are preserved on redirect; mixed-case legacy slugs (`RISC-V-user-space-access-oops`)
  match because the lookup lowercases.

**Accept.** Playwright spec hits 25 legacy URLs (all four article shapes, 5 marketing `.html`, 2
author pages, `/index.html`) → each returns 308 to the new URL which returns 200. Curl check
`curl -I http://localhost:3333/automotive.html` shows `location: /sectors/automotive`.

**Demo.** Paste an old article URL from the live site into the demo → lands on the migrated post.
Open the redirects collection, add `/legacy-campaign.html → /ces-2026`, hit it.

### 5.5 F5 — RSS and Atom feeds at their current addresses

**Why.** "The Atom and RSS feeds keep their format and their current addresses, so subscribers and
aggregators notice nothing."

**Exists.** Nothing.

**Build.**
- Verify the live addresses if reachable (`<link rel="alternate">` on the home page). Pelican
  defaults, used unless proven otherwise: `/feeds/all.atom.xml`, `/feeds/all.rss.xml`, per-category
  `/feeds/<category>.atom.xml`. Store the list in `lib/config/feeds.ts`.
- Route handlers (no locale; dotted paths bypass the proxy): `app/(frontend)/feeds/all.atom.xml/route.ts`,
  `app/(frontend)/feeds/all.rss.xml/route.ts`, `app/(frontend)/feeds/[category].atom.xml/route.ts`
  (dynamic segment with suffix is not allowed in Next → implement `feeds/[feed]/route.ts` and parse
  `feed` = `<slug>.atom.xml` / `<slug>.rss.xml`; `all.*` handled by the same handler).
- Content: last 50 published posts (`getPosts` without locale prefix, default locale), `title`,
  `link` absolute (`getServerSideURL()` + `/blog/<slug>`), `id`/`guid` = link, `published`/`pubDate`,
  `updated`, `author` name(s), `summary` = excerpt, `content` = HTML of the body (Lexical → HTML via `convertLexicalToHTML` from
  `@payloadcms/richtext-lexical/html` — verify the export name in `dist/exports/html.d.ts`;
  Markdown posts → `marked` with `sanitize-html`).
  Build XML by hand (small template functions) or with the `feed` package; escape properly.
- Headers: `Content-Type: application/atom+xml; charset=utf-8` / `application/rss+xml`,
  `Cache-Control: public, max-age=300, s-maxage=3600`. Add `<link rel="alternate">` tags in the
  frontend layout `<head>` for both feeds.
- Revalidate on post publish: tag the handler's data fetch with the existing post cache tags.

**Accept.** `curl /feeds/all.atom.xml | xmllint --noout -` passes; W3C-style sanity (first entry =
newest post, 50 entries, absolute links). `/feeds/news.atom.xml` has 5 entries.

**Demo.** Open the Atom URL in the browser; subscribe in a reader if time allows.

### 5.6 F6 — Forms: simple builder, Mautic literal-HTML mode, newsletter, gated downloads

**Why.** The brief: Mautic integration "literal HTML form elements, not iframes, styled via the
site design system"; 9 page forms + 32 article-embedded frames today; newsletter sign-up "under
every article and on the listings"; whitepapers behind a form. We promised a universal form block
"so your team creates new forms with no developer". No form-builder plugin: a small purpose-built
block is the point.

**Exists.** `newsletter` block with a fake client-side submit; no submissions storage.

**Build.**
- **`form` block** (`blocks/Form/`, slug `form`): `sectionHeaderFields()`; `mode` select
  (`internal` default | `mautic`); `formName` text (identifier shown in submissions); `mauticFormId`
  text + `mauticActionUrl` text (condition `mode === "mautic"`; default action
  `https://mautic.example.com/form/submit?formId=`); `fields` array: `name` (slug-safe), `label`
  (localized), `type` select (`text` | `email` | `tel` | `textarea` | `select` | `checkbox`),
  `required` checkbox, `placeholder` (localized), `options` text (comma list, condition select),
  `width` select (`full` | `half`); `submitLabel` (localized, default "Submit"); `consentText`
  textarea (localized; default = the "By clicking submit…" sentence from the dump); `successMessage`
  (localized); `successLink` = `link({ required: false })` (for gated downloads: the file/URL shown
  after success).
- **Rendering**: a real `<form method="post" action=…>`; inputs are native elements styled per
  §6.6; labels visible; `aria-describedby` for help/consent; honeypot field `website` hidden; hidden
  `page`, `referrer`, `utm_*` inputs filled server-side from the request URL/headers (proposal:
  "each submission carries the page, the referrer and the UTM parameters"). **Mautic mode**: field
  names `mauticform[<name>]`, hidden `mauticform[formId]`, `mauticform[return]`, no JavaScript
  required — this is exactly the markup Mautic's "manual copy" expects. **Internal mode**: action
  `/api/forms/submit` (route handler `app/(payload)/api/forms/submit/route.ts`, specific route wins
  over the Payload catch-all); on success redirect `303` to the same page with `?form=<id>&ok=1`
  (no-JS works) and the block renders `successMessage` + `successLink` when the query matches; a
  small `"use client"` enhancement intercepts submit with `fetch` and swaps in the success state
  without navigation.
- **`form-submissions` collection** (`collections/FormSubmissions.ts`): `formName`, `page`
  (text URL), `referrer`, `utm` group (source/medium/campaign/term/content), `data` JSON, `email`
  (extracted for the list column), `createdAt`; access: create anyone (via the endpoint only —
  `restrictApiAccess` must keep REST create closed; the handler uses Local API), read/update/delete
  admins + editors; admin group "Leads", default columns formName/email/page/createdAt. Basic abuse
  control in the handler: honeypot, 2 KB payload cap, 10 submissions/min per IP (in-memory map is
  fine for the demo).
- **Newsletter block**: post to the same endpoint with `formName: "newsletter"`; show the existing
  success copy; keep the block, restyle per §6.7.
- **Gated downloads** (reports, CTRL OS, TSF): `form` block preset "Gated whitepaper form" with
  fields email + company + consent and a `successLink` to a placeholder PDF in Media (seed a
  2-page branded PDF generated with `pdf-lib`, or a simple link to the report page) — labelled
  "sample" on the call.

**Accept.** Submit the contact form → row in `form-submissions` with page/referrer/utm; Mautic-mode
form renders field names `mauticform[...]` and no `<iframe>` anywhere on the site; no-JS submit
(Playwright with JS disabled) shows the success message after redirect; newsletter band writes a
submission; a gated form reveals the download link after submit.

**Demo.** Build a 3-field form in the admin from scratch, publish, submit, show the lead in "Leads".
Switch the same block to Mautic mode, show the generated markup in DevTools.

### 5.7 F7 — Editorial workflow and roles

**Why.** "An author can draft but not publish, an editor can publish, and only an administrator can
delete content"; comments with mentions; versions; scheduling; review on the real page.

**Exists.** Roles `admin` / `author` / `user` (labels Admin/Author/User); access helpers; comments
plugin; scheduling plugin; versions/drafts; live preview. Authors can currently publish (update
access = publish).

**Build.**
- Rename labels only (not values): `user` → "Editor", `author` → "Author", `admin` → "Admin"
  (`collections/Users`). Change the `role` `defaultValue` from `admin` to `author` (least privilege;
  the first admin is created through the admin UI explicitly); OIDC users get an explicit role (§5.9).
- Publish gate: shared `beforeChange` hook `denyPublishForAuthors` on `page`, `posts`, `header`,
  `footer`, `globalBlock`: if `req.user?.role === "author"` and `data._status === "published"` (or a
  scheduled publish job is created) → throw `Forbidden("Authors save drafts; an editor publishes")`.
  Delete access on content collections: `superAdmin` only (today `or(superAdmin, user, author)`).
  Form submissions: read for `admin` + `user`.
- Seed three demo users (passwords from `SEED_DEMO_PASSWORD`, default `ct-demo`):
  `admin@ct.demo` (admin), `editor@ct.demo` (user), `author@ct.demo` (author),
  all with `name`.
- Comments: seed 2 comments with a mention on the home page and one on an article so the panel is
  not empty. Scheduling: seed one draft news post scheduled for "tomorrow 09:00".

**Accept.** Logged in as author: Publish on a page fails with the message, Save draft works, Delete
is hidden/denied; as editor: Publish works, Delete denied; as admin: everything. Comments panel
shows seeded threads; scheduled post shows its publish time in the admin.

**Demo.** Two browser profiles: author drafts + comments "@editor please review"; editor opens the
comment, previews the draft on the real page, publishes (or schedules).

### 5.8 F8 — Languages and field-level localization (EN, DE, JA)

**Why.** "Any number of languages from the start … switching one on and translating the content";
"German and Japanese translated field by field across the block library" is a key Decap
differentiator in the proposal.

**Exists.** `en` + `es` content locales, every content field `localized: true`, `createLocalizedDefault`,
translator plugin (OpenAI) with per-document "Translate" action, `LocaleSelector` on the frontend,
hreflang alternates (`getAlternateLocales`), `messages/{en,es}.json` UI strings.

**Build.**
- Add `de` (German) and `ja` (Japanese) to `I18N_CONFIG.locales` (keep `es`; removing it is a
  destructive migration and buys nothing), `openGraphLocales` (`de_DE`, `ja_JP`), `messages/de.json`,
  `messages/ja.json` (translate the ~59 UI strings; keep keys identical).
- Loosen `createLocalizedDefault<T>(translations: Partial<Record<Locale, T>> & { en: T })` and the
  same for `createLocalizedRichText`, so the 17 call sites need no edits and new locales fall back to
  `en` defaults.
- Fonts: load `Noto Sans JP` via `next/font/google` (weights 400/700) as `--font-ja` and apply
  `html:lang(ja) { --font-sans: var(--font-ja), …; --font-display: var(--font-ja), … }` in
  `brand.css` so Japanese renders properly (Inter has no CJK glyphs).
- Schema: `generate:types` → `payload migrate:create add_de_ja_locales` (changes the `_locales`
  enum) → `migrate`. Verify `Config["locale"]` is now `"en" | "es" | "de" | "ja"`.
- Translator: confirm the plugin config picks up the new locales (it reads the collections' config;
  check `translatorPlugin({...})` options for a locale list). With `OPENAI_API_KEY` set, translate
  the home page and one article into `de` during T13 and keep the result (seed stores EN only).
- Frontend: `/de` and `/ja` resolve with EN fallback (`fallback: true`); `LocaleSelector` lists the
  four; hreflang in `generateMeta` covers all locales; sitemap already iterates locales.

**Accept.** `/de` renders (fallback English where untranslated); after translating the home page in
the admin, `/de` shows German hero + cards while the untranslated footer falls back; `/ja` renders
Japanese glyphs with Noto Sans JP; a block field edited in `de` does not change `en`.

**Demo.** Switch the admin locale to Deutsch on the home page, click Translate (plugin), review
field by field, publish, open `/de`. Point at a single block translated differently per locale.

### 5.9 F9 — Keycloak sign-in (OIDC) and roles from groups

**Why.** "Editors sign in with their Keycloak accounts"; Phase 2: roles follow Keycloak groups. The
estimate has "CMS sign-in through Keycloak (OIDC) — S".

**Exists.** OIDC flow (`lib/auth/oidc`, `api/auth/oidc` + `/callback`, `SSOButtons` after login)
driven by `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, optional PKCE, provider label.
Claims mapped: sub, email, name, picture. Users created on first login get the collection default
role (`admin` — wrong for the demo).

**Build.**
- Group → role mapping: read `groups` (array) from the id token / userinfo (Keycloak needs a
  "Group Membership" mapper on the client, full path off); env `OIDC_ROLE_MAP` JSON, default
  `{"cms-admins":"admin","cms-editors":"user","cms-authors":"author"}`; default role when no group
  matches: `author`. Apply on create **and** on every login (so group changes propagate — this is
  the Phase 2 promise, cheap here). Store `oidcSub` on the user if not already stored.
- Keycloak in compose (T12): `quay.io/keycloak/keycloak:26` `start-dev --import-realm`, realm
  `ct` with client `ct-cms` (confidential, redirect URI
  `http://localhost:8080/api/auth/oidc/callback`, Group Membership mapper), groups `cms-admins`,
  `cms-editors`, `cms-authors`, users `admin@ct.demo` (admins), `editor@ct.demo`
  (editors), `author@ct.demo` (authors), password `ct-demo`. Realm JSON committed under
  `apps/cms/docker/keycloak/realm-ct.json`.
- Local dev without Docker: `OIDC_*` empty → password login as today.

**Accept.** `docker compose up` → `/admin` shows "Sign in with Keycloak" → the editor user logs in → lands in
the admin as Editor (can publish, cannot delete); the author user lands as Author (draft only).
Changing that user's group to `cms-editors` in Keycloak and re-logging promotes them.

**Demo.** Login screen → Keycloak → back in Payload with the right role. One sentence: "roles live in
your IdP".

### 5.10 F10 — Privacy: cookieless, Plausible, click-to-load YouTube

**Why.** "The site sets no cookies. Analytics stay on Plausible, and YouTube videos load only when a
visitor presses play." The events page embeds 22 videos today.

**Exists.** GA4 analytics plugin (disables itself without an id, but the client provider mounts);
A/B cookies only when an experiment matches; `cookieBanner` component unused.

**Build.**
- Analytics: mount `AnalyticsProviderClient` only when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set; add
  `PlausibleScript` (`<script defer data-domain=NEXT_PUBLIC_PLAUSIBLE_DOMAIN src=NEXT_PUBLIC_PLAUSIBLE_SRC>`,
  default src `https://plausible.io/js/script.js`, rendered only when the domain env is set; in the
  Docker image the script may be self-hosted later — document). No GA in the demo env.
- **`videoEmbed` block** (`blocks/VideoEmbed/`): `sectionHeaderFields()`, `provider` select
  (`youtube`), `videoId` text, `title` text (a11y), `poster` upload (optional; when empty render a
  generated brand poster with the title, **no request to YouTube before click**), `aspect` select
  (16:9 | 4:3). UI: poster + play button; on click swap in
  `<iframe src="https://www.youtube-nocookie.com/embed/<id>?autoplay=1" allow="autoplay; encrypted-media" title=…>`.
  Also usable inside posts: register an inline variant in `generateRichText` blocks list for
  `posts.content` like `CtaBannerInlineBlock`.
- Assert zero cookies on public pages (Playwright `context.cookies()` after `/`, a post, a form page)
  — A/B stays installed with zero experiments; if a cookie appears, gate the A/B middleware behind
  `AB_ENABLED=true`.
- Remove the unused `cookieBanner` mount possibility from the demo (leave the component).

**Accept.** No `Set-Cookie` on public pages (curl -I) and empty cookie jar in Playwright; the events
page shows 3 `videoEmbed` posters and no network request to `youtube.com`/`ytimg.com` until click;
Plausible script tag present only when env set.

**Demo.** DevTools → Application → Cookies: empty. Click a video: iframe appears, `youtube-nocookie`.

### 5.11 F11 — Technical SEO and AI search

**Why.** "A sitemap with every page", "structured data to Google's rules", "robots.txt allows AI
crawlers", "an llms.txt file is included", canonical + hreflang.

**Exists.** `generateMeta` (title/description/OG/canonical/alternates), JSON-LD components
(Article, Breadcrumbs, Blog, FAQ, Organization), `sitemap.ts` (pages + posts × locales),
`robots.ts`, SEO analysis panel.

**Build.**
- `robots.ts`: keep the generic rule; add explicit `allow: "/"` rules for `GPTBot`, `ClaudeBot`,
  `Claude-Web`, `PerplexityBot`, `Google-Extended`, `CCBot`, `Applebot-Extended`; keep `/admin`,
  `/api`, `/next` disallowed.
- `app/llms.txt/route.ts`: text with site name, one-line description, then `## Pages` and
  `## Articles` lists of `- [Title](absolute URL): excerpt` from published content (default locale).
- Sitemap: add author pages; confirm `alternates.languages` lists en/es/de/ja.
- Organization JSON-LD: legal name, postal address, phone and email **from the dump's chrome and
  contact sections** (1 and 2.13), sameAs for LinkedIn/Mastodon/Bluesky/YouTube (URLs from Maksim;
  `#` until then), logo URL. Seeded via SiteSettings fields that already exist or a small addition.
- Posts: `meta.title` from the dump's `Title tag` (strip ` | CT`), `meta.description` from
  the excerpt. Pages: from `Title tag` + first paragraph.

**Accept.** `/robots.txt` lists the AI agents; `/llms.txt` has one line per seeded article; `/sitemap.xml`
includes `/blog/author/*` and hreflang alternates; Rich Results test on a post passes (manual).

**Demo.** Open `/robots.txt`, `/llms.txt`, the SEO panel on a draft post ("checked before publish").

### 5.12 F12 — Accessibility (WCAG 2.2 AA)

**Why.** Base requirement in the brief; "every template is built and checked".

**Build.** Design tokens enforce contrast (§6.2 rules). Add `components/SkipLink`; ensure landmarks
(`header`, `nav aria-label`, `main`, `footer`), one `h1` per page, visible focus ring (`--color-ring`
2px offset 2px), 44×44 targets for header items and buttons, form labels + error text, reduced
motion, `lang` per locale, alt text on all seeded media (title-based). Add `@axe-core/playwright`
and a spec covering `/`, a service, a sector, `/blog`, a post, `/contact`, `/resources/events` at
1440 and 375: zero serious/critical violations.

**Accept.** The axe spec passes; keyboard-only run through header → mega-menu → hero CTA → form.

### 5.13 F13 — Self-hosted runtime: Docker on `debian:trixie`, compose

**Why.** "Two containers built on your hardened debian:trixie image … configuration from environment
variables … no internet access at runtime … your PostgreSQL". The shareable demo URL is the ordinary Vercel preview of `apps/cms`; Docker is the client's
production story and is demonstrated with compose.

**Exists.** Nothing for Docker in `apps/cms`; `apps/dev/Dockerfile` is a usable multi-stage model.

**Build.** See T12 for the full spec: `ARG BASE_IMAGE=debian:trixie-slim`, Node 24 from the
official tarball in a build stage, Bun only in the build stage, `output: "standalone"` with
`outputFileTracingRoot` = monorepo root, runtime as non-root, migrations in the entrypoint, Blob
storage `enabled: Boolean(token)`, compose with `postgres:17`, `nginx` (reverse proxy on `:8080`
serving `/media` from the shared volume), `cron` (curl loop with Bearer `CRON_SECRET`), `keycloak`
(§5.9), optional `snapshot` + `nginx-static` for the "static files behind Nginx" demonstration.
Vercel: **not changed** — the preview of the existing `cms` project keeps its native Next.js build,
migrations and cron from `vercel.json`; Docker is shown through compose only.

**Accept.** `docker build --build-arg BASE_IMAGE=debian:trixie-slim` succeeds; `docker compose up`
→ migrate → seed → `http://localhost:8080/en`; `docker run --network none` of the CMS image against
a reachable Postgres serves pages; image has no Bun and no build tooling in the runtime stage.

**Demo.** `docker compose up` on screen; `docker inspect` showing the base image; Keycloak login.

## 6. Design specification (the redesign contract)

The redesign is **ours** (FocusReactive now owns UX/UI for this project). It must read as a
confident, modern evolution of <client-domain>, not a template with CT's colours. Keep every
signal the client's brand already owns; raise the craft around it.

### 6.1 Principles

1. **Engineering calm.** White canvas, generous whitespace, one strong type family (Inter), long
   measure for prose (45em), dark-blue bands only where a moment is earned.
2. **Keep the signature.** White header with the green wordmark and the lime Contact button;
   dark-blue heroes; the angled 5vw divider (sand → light green → dark blue) into the footer; tag
   pills (green-200/green-800); icon circles; ISO badges; LinkedIn / Mastodon / Bluesky / YouTube.
3. **One accent.** Electric green `#b5ff6b` is the single sharp accent: primary CTA in header/hero,
   dates and eyebrows on dark blue, hover inversion. Racing green `#007839` is the working colour
   for links and in-content buttons. No yellow, no serif, no glow, no gradients.
4. **Line, not photo.** CT has almost no photography. Use line motifs derived from the logo
   (concentric rings), dotted connectors and a faint circuit grid; generated covers follow the same
   language. Photos arrive later; the system must not depend on them.
5. **Structure you can see.** Numbered cards (01, 02 …), hairline rules, mono eyebrows, a visible
   12-column rhythm. The site should feel like documentation written by people who build operating
   systems.
6. **Accessible by construction.** Contrast rules live in the tokens; focus is visible everywhere;
   motion is subtle and optional.

### 6.2 Tokens — the client's palette, verbatim, mapped onto the boilerplate's roles

Source: production stylesheet `:root` (pasted by Maksim, 2026-10-04). Create
`apps/cms/src/app/(frontend)/brand.css` and import it in `styles.css` right after
`@import "@repo/tailwind-config/base.css"`. Do not edit `packages/tailwind-config`.

```css
/* ───────── CT primitives (exact values from <client-domain>) ───────── */
@theme {
  --color-ct-white: #ffffff;
  --color-ct-sand: #f4f3f2;
  --color-ct-black: #333333;
  --color-ct-teal: #315850;          /* .scene-darkgreen */
  --color-ct-dark-blue: #124853;     /* hero + footer */
  --color-ct-slate-blue: #296e72;    /* link hover, dropdown hover, icons */
  --color-ct-electric-green: #b5ff6b;/* header CTA, dates on dark, hover inversion */
  --color-ct-light-green: #5ab165;   /* angled band */
  --color-ct-dark-green: #103825;    /* button hover */
  --color-ct-racing-green: #007839;  /* links, in-content buttons */
  --color-ct-grey-100: #f4f5f2;  --color-ct-grey-200: #e9ebe6;  --color-ct-grey-300: #d9dbd5;
  --color-ct-grey-400: #b8b9b4;  --color-ct-grey-500: #9a9b99;  --color-ct-grey-600: #767774;
  --color-ct-grey-700: #6a6b67;  --color-ct-grey-800: #5d605a;  --color-ct-grey-900: #3f423c;
  --color-ct-green-100: #eaffcd; --color-ct-green-200: #dcf5b8; --color-ct-green-300: #bef76e;
  --color-ct-green-400: #a4ff1f; --color-ct-green-500: #64a800; --color-ct-green-600: #477703;
  --color-ct-green-700: #395e03; --color-ct-green-800: #365706; --color-ct-green-900: #2b4405;

  /* ───────── Semantic roles (names from base.css Tier 2) — LIGHT ───────── */
  --color-background: var(--color-ct-white);
  --color-foreground: var(--color-ct-grey-900);           /* body text  (≈ 10:1 on white) */
  --color-heading: var(--color-ct-dark-blue);             /* NEW token; display + section headings */
  --color-surface: var(--color-ct-sand);
  --color-surface-muted: var(--color-ct-grey-200);        /* alternating sections (article.home even) */
  --color-card: var(--color-ct-white);
  --color-card-foreground: var(--color-ct-grey-900);
  --color-primary: var(--color-ct-racing-green);          /* links, primary buttons (5.6:1 on white) */
  --color-primary-foreground: var(--color-ct-white);
  --color-primary-hover: var(--color-ct-dark-green);
  --color-primary-soft: var(--color-ct-green-200);        /* tag pills, icon circles */
  --color-primary-soft-foreground: var(--color-ct-green-800);
  --color-secondary: var(--color-ct-dark-blue);
  --color-secondary-foreground: var(--color-ct-white);
  --color-secondary-hover: var(--color-ct-slate-blue);
  --color-accent: var(--color-ct-electric-green);
  --color-accent-hover: var(--color-ct-green-300);
  --color-accent-foreground: var(--color-ct-dark-blue);
  --color-highlight: var(--color-ct-light-green);
  --color-muted: var(--color-ct-grey-200);
  --color-muted-foreground: var(--color-ct-grey-700);     /* meta text (5.3:1 on white) */
  --color-border: var(--color-ct-grey-300);
  --color-border-strong: var(--color-ct-grey-500);
  --color-input: var(--color-ct-grey-400);
  --color-ring: var(--color-ct-racing-green);
  --color-link-hover: var(--color-ct-slate-blue);
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px; --radius-pill: 999px;
}

/* ───────── DARK zones (hero bands, footer, featured cards) ───────── */
.dark-zone, [data-theme="dark"] {
  --color-background: var(--color-ct-dark-blue);
  --color-foreground: var(--color-ct-white);
  --color-heading: var(--color-ct-white);
  --color-surface: #0e3a44;                               /* dark-blue −8% L */
  --color-surface-muted: #0b2f37;
  --color-card: #0e3a44;
  --color-card-foreground: var(--color-ct-white);
  --color-primary: var(--color-ct-electric-green);        /* links/CTAs on dark (≈ 11:1) */
  --color-primary-foreground: var(--color-ct-dark-blue);
  --color-primary-hover: var(--color-ct-green-300);
  --color-primary-soft: rgba(181, 255, 107, 0.14);
  --color-primary-soft-foreground: var(--color-ct-electric-green);
  --color-secondary: var(--color-ct-white);
  --color-secondary-foreground: var(--color-ct-dark-blue);
  --color-secondary-hover: var(--color-ct-grey-200);
  --color-muted: #0b2f37;
  --color-muted-foreground: var(--color-ct-grey-300);     /* meta on dark (≈ 9:1) */
  --color-border: rgba(255, 255, 255, 0.14);
  --color-border-strong: rgba(255, 255, 255, 0.32);
  --color-input: rgba(255, 255, 255, 0.32);
  --color-ring: var(--color-ct-electric-green);
  --color-link-hover: var(--color-ct-green-300);
}
[data-theme="dark-gray"] {                                 /* teal variant = .scene-darkgreen */
  --color-background: var(--color-ct-teal); --color-surface: #284a43; --color-card: #284a43; --color-muted: #22403a;
}
[data-theme="light-gray"] {                                /* sand variant */
  --color-background: var(--color-ct-sand); --color-surface: var(--color-ct-white); --color-surface-muted: var(--color-ct-grey-200);
}
::selection { background: var(--color-ct-electric-green); color: var(--color-ct-dark-blue); }
```

**Contrast rules (hard):** `electric-green`, `light-green`, `green-400/500` never as text on light
backgrounds (all < 3:1 on white). Body text = `grey-900` on white, `white` on dark blue. Links =
`racing-green` on light, `electric-green` on dark. Buttons: racing-green fill + white text; electric-
green fill + dark-blue text. Meta text = `grey-700` minimum on light, `grey-300` on dark. Logo green
`#64a800` is for the logo and decorative strokes only.

**Zone cadence:** white → sand/grey-200 → white → dark-blue band, at most one dark band per three
sections besides the hero; the page always ends with the sand CTA band → light-green angle → dark-
blue footer (the client's existing closing sequence).

### 6.3 Typography

- **Family:** Inter (self-hosted via `next/font/google` `Inter`, weights 400/500/600/700, variable)
  for everything; `Inter Tight` 600/700 for display sizes ≥ 2.5rem; `IBM Plex Mono` 500 for eyebrows,
  code and numerals in stats; `Noto Sans JP` for `:lang(ja)`. Map: `--font-newsreader` → Inter
  Tight, `--font-archivo` → Inter (keep variable names so `base.css` stays untouched).
- **Scale** (override the utilities in `brand.css`):

| Utility | Size | Line | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `text-display-1` | clamp(2.75rem, 5.5vw, 4.25rem) | 1.02 | 700 | −0.025em | hero h1 |
| `text-display-2` | clamp(2.25rem, 4vw, 3.25rem) | 1.05 | 700 | −0.02em | hub/listing h1 |
| `text-h-section` | clamp(1.75rem, 3vw, 2.5rem) | 1.1 | 600 | −0.015em | section h2 |
| `text-h-card` | 1.375rem | 1.2 | 600 | −0.01em | card h3 |
| `text-lead` | clamp(1.125rem, 1.5vw, 1.3125rem) | 1.55 | 400 | 0 | hero/intro paragraph |
| body | 1.0625rem | 1.7 | 400 | 0 | prose (`max-width: 45em`) |
| `text-small` | 0.9375rem | 1.55 | 400 | 0 | meta, captions |
| `text-eyebrow` | 0.75rem | 1 | 500 mono | 0.14em upper | eyebrows, labels, numbers |

- Headings use `--color-heading` (dark blue on light, white on dark). Prose `h2` 1.75rem/2.5rem top
  margin, `h3` 1.375rem (matches the current `article h2/h3` rhythm). Links underlined on hover with
  `text-underline-offset: 3px`, hover colour `slate-blue`.

### 6.4 Layout

- Container `--container-max-width: 1200px` (was 1180), gutter `clamp(20px, 5vw, 64px)`; prose
  columns max `45em`; 12-column grid, 24px gap (32px ≥ 1280px).
- Section padding `--section-margin-base: clamp(64px, 8vw, 112px)`, large `clamp(96px, 12vw, 160px)`.
- Breakpoints: 640 (sm), 860 (md: header actions), 1024 (lg: mega-menu, 3–4 columns), 1280 (xl).
- Header 72px tall (64px on mobile), sticky, white at 92% + blur, 1px `border` on scroll.
- Hero bands: min-height `clamp(420px, 56vh, 640px)` on HOME/SECTOR/SOLUTION/CAMPAIGN; `clamp(260px,
  32vh, 360px)` on hubs/listings/about/legal; post splash `clamp(320px, 40vh, 440px)`.

### 6.5 Motifs and components to add

- **`DiagonalBand`** (`components/DiagonalBand`): a full-width wedge made with
  `clip-path: polygon(0 100%, 100% 0, 100% 100%)`, height `clamp(32px, 5vw, 96px)`, colour prop
  (`light-green` default, `sand`, `dark-blue`). Used: sand CTA band top edge (sand over the previous
  section), light-green between CTA band and footer, and under dark heroes on SECTOR/SOLUTION pages
  (white wedge over dark blue). Pure CSS, no SVG.
- **`AbstractBackdrop` → `lines` variant**: three decorative layers at low opacity — concentric
  rings (SVG, 9 strokes 1.5px, radius 120–480px, placed top-right, colour `slate-blue` 35% on light /
  `electric-green` 18% on dark), dotted connector paths (2px dots, 10px gap), and `GridLines` (1px,
  `border` colour at 60%). Static by default; a 40s slow drift only when `prefers-reduced-motion:
  no-preference`.
- **Ring mark**: `public/ct/mark.svg` = the first ring glyph cut from the logo SVG
  (`viewBox` cropped to the "C" ring), used in the footer, as favicon, as the bullet in the global
  CTA, and as the watermark on generated covers.
- **Numbered cards**: `cardsGrid` gets a `numbered` toggle (01, 02 … in mono eyebrow colour).
- **Tag pill**: `Eyebrow` tone `tag` = `primary-soft` background + `primary-soft-foreground`
  text, radius pill, 12px (exactly the current `.post-splash .tags .tag`).
- **Icon circle**: 48px, `primary-soft` background, `primary-soft-foreground` icon (the current
  `.icon`), lucide 24px stroke 1.8.
- **ISO chips**: two outlined chips in the footer: `ISO 9001 · <certificate no.>`,
  `ISO 27001 · <certificate no.>` (numbers from the dump chrome) (the certifier artwork is third-party; keep a slot for the badge
  images if the client sends them).
- **Social icons**: LinkedIn, Mastodon, Bluesky, YouTube as inline SVG in `components/icons/`
  (lucide lacks Mastodon/Bluesky), 24px, `dark-blue` on sand, `white` on dark blue.

### 6.6 Component specs

| Component | Spec |
|---|---|
| **Header** | White, 72px, logo 32px high (`logo.svg`), nav items 15px/500 `grey-900`, hover underline 2px `green-500` (inset box-shadow as on the live site), active 3px. Dropdown = mega-menu panel on sand (`surface`), 3 columns: eyebrow + 4–7 links (title 15px/600, description 13px `muted-foreground`), and a **featured card** on dark blue (eyebrow electric-green, title white, link arrow). `actions`: `Contact us` = Accent button (electric-green/dark-blue, hover inverted), `Careers` = Ghost. Mobile (< 1024): hamburger (3 bars `green-500`) → left drawer 300px white with grouped links, dark overlay 60% `grey-900`, lime Contact at the bottom. |
| **Footer** | Sequence: **CTA band** on sand (eyebrow "Get in touch", h2 racing-green, email + phone rows with 20px icons in dark blue, Contact us primary button, socials row) → **DiagonalBand light-green** → **footer** dark blue: left ring mark 48px + 4 link columns (eyebrow headings grey-300, links white 14px, hover electric-green underline), right ISO chips; bottom legal line 12px grey-300 (`© CT Ltd. 2007–2026 … VAT No. GB 903 8156 33.`) + legal links. |
| **Buttons** (`components/button`) | radius `--radius-md`, 44px min height, 600 weight, 15px; `Primary` racing-green/white → hover dark-green; `Accent` electric-green/dark-blue → hover dark-blue/electric-green (inversion, as `.contact-link a:hover`); `Secondary` outline 1px dark-blue, text dark-blue → hover fill dark-blue; `Ghost` text racing-green + arrow; sizes sm 36 / base 44 / lg 52. Focus: 2px ring `--color-ring` offset 2px. |
| **Card** | White on sand/grey sections, sand on white sections; 1px `border`; radius `--radius-lg`; padding 28px; hover: border `racing-green` + 3px top rule `light-green` (via inset shadow), no lift; title `text-h-card` dark blue; optional numbered eyebrow; optional icon circle; link arrow bottom-left in racing-green. |
| **Eyebrow** | mono 12px upper; tones: `outline` (1px `border-strong`, text `grey-800`) default on light; `accent` (electric-green fill, dark-blue text) on dark; `tag` (see 6.5); `muted` text-only. |
| **Inputs** | 44px, 1px `--color-input` border, radius `--radius-md`, white; focus 2px `ring`; label 14px/600 above; help 13px `muted-foreground`; error `#b55b55` text + border; required `*` in `#b55b55`; textarea 120px; select native with chevron; checkbox 20px accent `racing-green`. Dark zone: inputs white on dark blue. |
| **Tables** (prose) | header row dark blue/white 600; zebra sand; 1px `border`; 8px 12px cells; radius 8px overflow clip; horizontal scroll wrapper on mobile. |
| **Code** (prose) | block: dark blue background, `grey-100` text, 14px mono, radius 8px, 18px padding, scroll; inline: sand background, `grey-900`, 0.9em. |
| **Blockquote** | 3px left rule `light-green`, text dark blue 1.25rem/1.4, 500, no italics. |
| **Admonitions** (Markdown `> **Note:**` style not needed; keep if the converter emits them) | note/tip: green-100 bg, green-900 text; warning: `#fff3cd`-like → use sand + dark-blue border. |
| **Pagination / filters** | pill chips (`Eyebrow` tag tone) for categories; pagination numbers 40px squares, active dark blue. |
| **Skeleton / empty** | sand blocks, 8px radius; empty state = ring mark + one sentence. |

### 6.7 Section catalogue (every block, how it must look)

Section = `SectionContainer` with `data-theme` zone, optional backdrop, header (eyebrow → h2 →
description, left-aligned by default, centred on hubs), body, optional footer link.

| Block | Layout & behaviour | Variants / theme | Content limits |
|---|---|---|---|
| **hero** | **centered**: eyebrow, `display-1` h1 (balance), lead paragraph (max 60ch), 2 actions (Accent + Secondary on dark), `lines` backdrop top-right, optional DiagonalBand below. **showcase**: 7/5 split, text left, right = `image` (cover) in a 12px-radius frame with a ring-mark badge; on mobile image stacks below. New **band** behaviour when `richText` is empty: compact 260px band with h1 only (legal/contact/listings). | dark (default HOME/SECTOR/SOLUTION/CAMPAIGN), light (hubs/about), dark-gray (teal) for events/campaign accents | title ≤ 12 words; lead ≤ 45 words |
| **stats** | 4-up row (2×2 on mobile): value in mono `display-2` size dark blue (electric-green on dark), label `small` muted; thin top rule per cell | light / dark | 2–4 |
| **cardsGrid** | header; grid 2/3/4 columns (prop); Card per §6.6 with icon circle or number; whole card clickable when a link exists; "View all" ghost link under the grid | white or sand section; `numbered`; `iconStyle` circle/plain | 3–12 items; title ≤ 6 words; description ≤ 30 words |
| **content** | header + 2-column body (7/5): rich text (45em) and image/figure; `image-text` flips; no image → single prose column 45em with the heading in a left 4-col rail on ≥ lg (documentation feel) | white / sand / dark | one `###` group per block |
| **logos** | header; wordmarks rendered as text in mono 14px upper, `grey-700`, in a 4–6 column grid with hairline dividers (no third-party logo files) | sand | 4–12 |
| **postsList** | `grid`: 3 cards — cover 16:9, tag pill, title, date · reading time, author line with 24px avatar; `list`: dense rows — date column (mono) + title + excerpt; `featured`: first post large (cover 2:1, dark-blue overlay with white title) + 2 small. "View all" → link. | white / sand | 1–12 |
| **caseStudies** | header; 2-column cards (1 on mobile) with sector tag pill, title, three labelled columns inside (`The problem` / `CT solution` / `Business result`, labels mono eyebrow), technologies as outline pills at the bottom; alternating white/sand cards | sand section | 1–8 |
| **faq** | header left rail + accordion (Radix) right: 1px rules, question 17px/600 dark blue, chevron racing-green, answer prose | white | 3–10 |
| **testimonialsList** | big quote mark as ring glyph; quote 1.375rem dark blue; author line; carousel on mobile | sand / dark | 1–6 |
| **ctaBand** | the "contact" band: sand, centred, eyebrow, h2 racing-green, description with email/phone icons, 1–2 actions, socials row; always followed by DiagonalBand light-green + footer (the Footer component renders the band + wedge when a `globalSectionSlot` CTA precedes it — simpler: the **Footer** renders the wedge itself) | sand only | — |
| **newsletter** | one-line form (email + Accent button) inside a dark-blue card with ring backdrop; disclaimer `small`; success state inline | dark card on white/sand | — |
| **form** | header + 2-column form grid (`width: half` fields side by side ≥ md); consent checkbox row; submit Primary; success state replaces the form (check icon in icon circle + message + optional link) | white / sand; dark variant with white inputs | ≤ 12 fields |
| **videoEmbed** | 16:9 frame, radius 12px, poster with ring watermark + title + play button (electric-green circle, dark-blue triangle); click → nocookie iframe | white / dark | 1 |
| **globalSectionSlot** | renders the referenced block unchanged | — | — |
| carousel, chart, rawHtml | keep working, restyle tokens only; not used in seeded pages | — | — |

### 6.8 Page compositions (what each template looks like)

Every page: header → sections → global CTA band → footer. Hero theme and cadence per §6.2.

| Template | Composition (top → bottom) | Notes |
|---|---|---|
| **HOME** `/` | hero centered dark: eyebrow "Open source system software experts · since 2007", h1 "Software you can trust, built in the open." (new line), lead = original first paragraph, actions "Talk to an engineer" (Accent → /contact) + "What we do" (Secondary); DiagonalBand white → **stats** (2007 founded · 100+ engineers · ISO 9001 & 27001 · SIL 3 / ASIL D baseline) → **cardsGrid** "Philosophy" 4 icon cards (shield/compass/git-branch/gauge) on white → **content** "Systems software" text-image (generated cover) on sand → **cardsGrid** "What we do" 7 numbered cards → **cardsGrid** "Sectors" 4 cards on sand → **logos** "Communities and partners" (Eclipse Foundation, RISC-V International, AGL, ELISA, OSADL, MIT STPA, NVIDIA Partner Network, Red Hat, SUSE, Microchip, CIP, Bazel) → **postsList** featured "Latest from CT" → **newsletter** → CTA band | The only page with stats + logos; keep it under 9 sections |
| **HUB** `/what-we-do`, `/sectors`, `/technology`, `/resources` | hero light band (display-2, lead) → cardsGrid of children (numbered, 3 columns, with first sentence) → postsList grid (3, relevant category) → CTA band | `/technology` adds a second cardsGrid "Open source projects we maintain" (TSF, RE:OS/CTRL OS, SIF, freedesktop-sdk, BuildStream, RAFIA, rusty-worker, Safety Monitor) with external links |
| **SERVICE** | hero showcase light (eyebrow "What we do", h1 = title, lead = first paragraph, cover right) → content per prose `###` group (alternate white/sand) → cardsGrid "Example projects" when ≥ 3 `####` items (Bare Metal has 10; numbered, 3 columns) → postsList list (category by service) → cardsGrid "Other services" (siblings, plain) → CTA band | Services are the "documentation feel" pages: content blocks use the left-rail heading layout |
| **SECTOR** | hero centered dark + DiagonalBand → content groups → **caseStudies** filtered by sector on sand → faq when Q/A `####` exist (Automotive: "What is FuSa?") → postsList grid (sector category) → CTA band | Sector = where the client's buyers land: more dark, more proof |
| **SOLUTION** | hero centered dark (eyebrow = product name, e.g. "CTRL OS · becoming RE:OS") → content groups → **form** "Download the assessment" (gated, sand) for each `hasDownloadForm` group → postsList (Trustable & Safety) → CTA band | TSF page has 2 gated forms |
| **ABOUT** | hero light band → content groups; list-heavy groups → cardsGrid (Commandments: numbered cards per rule, grouped by `###`; Partnerships: logos block + cardsGrid with descriptions; "Our story" → stats-like timeline using cardsGrid numbered) → CTA band | Environmental policy stays prose |
| **CAREERS** `/who-we-are/careers` | hero light → content "What we offer" (list → cardsGrid icons) → cardsGrid "Open roles" (4 JD links) → content "Exciting work" → CTA band | |
| **JD** | hero light band (eyebrow "Careers · on-site / remote") → content groups → **form** "Apply" (name, email, LinkedIn URL, message, consent) → CTA band | |
| **LISTING** `/resources/news` | hero light band → postsList list (news, 12) with year separators → newsletter → CTA band | |
| **CASE STUDIES** | hero light band → caseStudies all (sand) → CTA band | |
| **REPORTS** | hero light band → one content text-image per report (cover = generated report cover, authors list inside) → form gated download → CTA band | |
| **EVENTS** | hero dark-gray (teal) → content "Upcoming events" → **videoEmbed** ×3 "Watch the talks" (ids from Maksim or placeholders) → content per year (≤ 4 blocks) → newsletter → CTA band | |
| **CAMPAIGN** `/ces-2026` | hero centered dark (eyebrow "CES 2026 · Las Vegas") → content groups → cardsGrid "How can CT help?" (questions as cards) → form "Book a meeting" → CTA band | |
| **CONTACT** | hero light band → content (phones + emails as a definition list; address) → cardsGrid 3 tiles Careers / Finance & Admin / Sales (icon circles; hover inverts to dark blue + electric green, like the live site) → form "Send an enquiry" → (no CTA band) → DiagonalBand + footer | |
| **LEGAL** | hero band (title only) → content prose → CTA band | Privacy table uses §6.6 table style |
| **BLOG INDEX** `/blog` | hero light band (title + description from settings) + search → category pill filters → featured post → 3-column grid → pagination → newsletter | Restyle the existing index; no logic change |
| **POST** `/blog/<slug>` | **splash** dark blue: back link, tag pills, h1 (display-2, max 20em), meta line (date in electric-green · reading time · author with avatar) → body 45em with a right rail "More from CT" (3 titles) on ≥ xl → FAQ (if any) → CTA (if any) → related posts grid → newsletter → footer | Markdown and rich-text posts identical |
| **AUTHOR** `/blog/author/<slug>` | hero light band (avatar 96px, name, bio, post count) → postsList grid → pagination → newsletter | |
| **404** | ring mark, "This page moved or never existed", search box, 3 latest posts | |

### 6.9 Responsive rules

- ≥ 1280: 12 columns, 3–4-up grids, mega-menu, post right rail. 1024–1279: 3-up, mega-menu, no rail.
  860–1023: 2-up, header actions visible, drawer nav. < 860: 1-up, drawer nav, lime Contact inside
  the drawer; hero `display-1` scales via clamp; stats 2×2; DiagonalBand min 32px.
- Tables and code scroll horizontally in a wrapper; images never exceed the prose column.
- Touch targets ≥ 44px; hover-only affordances have focus equivalents.

### 6.10 Motion and accessibility

- Transitions 150–200ms `--ease-out` on colour/border/transform only; hover lift never more than
  2px; backdrop drift only without reduced motion; no parallax, no autoplay.
- Focus ring 2px `--color-ring` + 2px offset on every interactive element; skip link; landmarks;
  `aria-current="page"` on active nav; mega-menu is a `NavigationMenu` (Radix) with keyboard support.

### 6.11 Imagery strategy (no source images)

- **Generated covers** (sharp, SVG → JPEG 1600×900): dark-blue background (or sand for every 3rd),
  ring motif in `slate-blue`/`electric-green` at 18%, category eyebrow (mono, electric-green), title
  (Inter Bold 56px, white, wrapped to 3 lines), small ring mark bottom-right. Deterministic per
  slug (hash picks ring position) so re-runs are stable. Alt = title.
- **Report covers**: same template, sand background, "White paper" eyebrow.
- **Avatars**: initials on `primary-soft` background, `green-800` text, 320×320.
- **Section backgrounds**: three textures in the "Background" folder (dark rings, sand circuit grid,
  light-green band) for editors to pick.
- When CT sends photos: replace `heroImage` on posts via a mapping file; nothing else changes.

### 6.12 Don'ts

No yellow, no serif, no glow cards, no gradients beyond the 14% tints, no electric/light green text
on white, no pill buttons (pills are for tags only), no stock photos, no third-party logo files, no
icon sets other than lucide + the four social SVGs, no more than one dark band per three sections,
no section without a heading except hero/stats/newsletter.

## 7. Information architecture, navigation, chrome

Pages are `page` docs with nested-docs `parent`; URL = breadcrumbs. Blog is the built-in `/blog`
custom page. Source = dump entry (`2.x`). Recipe = §6.8.

| New URL | Title | Source | Recipe |
|---|---|---|---|
| `/` (slug `home`) | Open Source System Software Experts | 2.1 | HOME |
| `/what-we-do` | What we do | 2.36 | HUB |
| `/what-we-do/bare-metal-programming` | Bare Metal Programming | 2.9 | SERVICE |
| `/what-we-do/build-engineering` | Build Engineering | 2.10 | SERVICE |
| `/what-we-do/devops` | DevOps | 2.17 | SERVICE |
| `/what-we-do/embedded-systems` | Embedded Systems | 2.18 | SERVICE |
| `/what-we-do/linux-kernel-bsp` | Linux Kernel & BSP | 2.27 | SERVICE |
| `/what-we-do/long-term-maintainability` | Long-Term Maintainability | 2.28 | SERVICE |
| `/what-we-do/build-and-integration` | Build and Integration | 2.24 | SERVICE |
| `/sectors` | Sectors | intros of 2.7/2.8/2.22/2.29 | HUB |
| `/sectors/automotive` | Automotive | 2.8 | SECTOR |
| `/sectors/heavy-equipment-agritech` | Heavy Equipment & Agriculture Technology | 2.7 | SECTOR |
| `/sectors/financial-services` | Financial Services | 2.22 | SECTOR |
| `/sectors/medical-devices` | Medical Devices | 2.29 | SECTOR |
| `/technology` | The CT Way | 2.42 intro + tool list (brief) | HUB (+ projects grid) |
| `/technology/trustable-software` | Delivering Trustable Software | 2.42 | SOLUTION |
| `/technology/ctrl-os` | CTRL OS — CT Trustable Reproducible Linux | 2.15 | SOLUTION (1 gated form) |
| `/technology/trustable-software-framework` | The Trustable Software Framework | 2.44 | SOLUTION (2 gated forms) |
| `/technology/nvidia-jetson` | NVIDIA Jetson Platform Development | 2.25 | SOLUTION |
| `/technology/towards-trustable-software` | Towards Trustable Software (white paper) | 2.43 | SOLUTION |
| `/who-we-are` | About CT | 2.6 | ABOUT |
| `/who-we-are/software-commandments` | The Software Commandments | 2.12 | ABOUT |
| `/who-we-are/partnerships` | Partnerships | 2.31 | ABOUT |
| `/who-we-are/environmental-policy` | Environmental Policy | 2.19 | ABOUT |
| `/who-we-are/careers` | Careers at CT | 2.26 | CAREERS |
| `/who-we-are/careers/devops-engineer` · `/software-safety-engineer` · `/software-engineer` · `/technical-author` | job titles | 2.16, 2.34, 2.37, 2.39 | JD |
| `/resources` | Resources | — | HUB |
| `/resources/news` | News & Announcements | 2.2 | LISTING |
| `/resources/case-studies` | Case Studies | 2.11 | CASE STUDIES |
| `/resources/reports` | Reports & White Papers | 2.33 | REPORTS |
| `/resources/events` | Events | 2.20 | EVENTS |
| `/ces-2026` | CT at CES 2026 | 2.5 | CAMPAIGN |
| `/contact` | Get in touch | 2.13 | CONTACT |
| `/privacy-policy` | Privacy Policy | 2.32 | LEGAL |
| `/blog`, `/blog/<slug>` ×40 (×191 with `--all-posts`), `/blog/author/<slug>` ×19 (×69) | built-in + new route | 2.4, 3.x | BLOG INDEX / POST / AUTHOR |

**Header** (`navItems` ≤ 6, dropdown with `featured`):

1. **What we do** → 7 services; featured "Delivering Trustable Software" → `/technology/trustable-software`
2. **Sectors** → 4 sectors; featured "Automotive: SDV and functional safety" → `/sectors/automotive`
3. **Technology** → Trustable Software, CTRL OS, TSF, NVIDIA Jetson, Towards Trustable Software; featured "Download the TSF safety assessment" → `/technology/trustable-software-framework`
4. **Resources** → News, Blog (`customPage: blog`), Case Studies, Reports & White Papers, Events
5. **Who we are** → About, Software Commandments, Partnerships, Environmental Policy, Careers
6. **CES 2026** (plain link)

`actions`: `Contact us` (appearance `accent` → `/contact`), `Careers` (appearance `ghost`).

**Footer**: `description` = the two ISO lines from the dump chrome; `linkGroups`:
Services (7), Sectors (4), Resources (News, Blog, Case Studies, Reports, Events), Company (About,
Commandments, Partnerships, Careers, Contact); `legalLinks`: Privacy Policy, Environmental Policy;
`copyrightText`: the legal line from the dump chrome (© … registered company number, VAT number).

**Global CTA** (`globalBlock` "Contact CTA" → `ctaBand`): eyebrow "Get in touch", heading "Find out
how CT can help you", description = contact email · phone from the dump chrome, actions
`Contact us` (primary → `/contact`), `Email us` (ghost → `mailto:` the same email). Placed
via `globalSectionSlot` as the last block of every page except `/contact`.

**Legacy map** (`src/lib/redirects/legacy.json`, generated in T8): every row above ← its old
`.html` URL; every seeded post ← all four shapes; 2 author pages; `/updates.html` → `/blog`; `/index.html` → `/`.

## 8. Tasks (ordered; commit after each; never push)

Conventions for every task: run `bun run check-types && bun run lint` before committing; after a
schema change run `generate:types` → `payload migrate:create <name>` → `payload migrate`; after
adding admin components run `generate:importmap`. Commit scope is `cms`.

### T1 — Branch, environment, local sources, baseline

**Files:** `apps/cms/.gitignore` (already ignores `.local/`, `public/ct/`, `.env.docker`, `.secrets/`), `apps/cms/.env` (local only)

1. `git fetch origin && git checkout claude/busy-planck-k29mbr`.
2. **Client sources** (git-ignored): if `CT_LOCAL_ARCHIVE_URL` is set (cloud sandbox),
   `curl -fsSL "$CT_LOCAL_ARCHIVE_URL" -o /tmp/ct-local.zip && mkdir -p apps/cms/.local && unzip -oq /tmp/ct-local.zip -d apps/cms/.local/`
   → expect `apps/cms/.local/ct/{content-dump.md,brand/logo.svg,images-map.json,images/}`. On a
   laptop the folder is prepared by hand (§0.1). If `images-map.json` is missing, continue: posts
   get generated covers (§5.2).
3. **Database**: cloud sandbox → `DATABASE_URL` from the environment (dedicated Neon dev branch).
   Laptop → `cd apps/dev && docker compose up -d postgres` gives `postgres://payload:payload@127.0.0.1:5434/payload`
   (create a `ct` database on it), or a Neon branch.
4. `cd apps/cms && cp .env.example .env` and fill `DATABASE_URL`, `PAYLOAD_SECRET`,
   `NEXT_PUBLIC_SERVER_URL=http://localhost:3333`, `PREVIEW_SECRET`, `CRON_SECRET`,
   `BLOB_READ_WRITE_TOKEN` (cloud: yes; laptop: optional → `public/media`); GA and OIDC empty;
   `OPENAI_API_KEY` if available. Values already present as environment variables win over `.env`.
5. Repo root: `bun install` (`NPM_TOKEN` for the private visual-editing plugin).
6. `bun run payload migrate && bun run dev` → first admin at `/admin`; `/en` renders.
7. Baseline `check-types` + `lint` green (note pre-existing warnings).

**Commit:** none unless something had to change (then `chore(cms): CT demo environment notes`).

### T2 — Brand tokens, fonts, base components, motifs

**Files:** create `src/app/(frontend)/brand.css`; modify `styles.css` (import), `[locale]/layout.tsx` (fonts Inter / Inter Tight / IBM Plex Mono / Noto Sans JP; `themeColor` `#ffffff` / `#124853`), `components/button/index.tsx`, `components/Eyebrow/index.tsx`, `components/Card/index.tsx`, `components/AbstractBackdrop/index.tsx` (+ `lines` variant), `components/GridLines`, create `components/DiagonalBand/index.tsx`, `components/icons/{Linkedin,Mastodon,Bluesky,Youtube}.tsx`, `components/SkipLink/index.tsx`, `components/richText/proseVariants.ts` + `styles.css` prose rules (tables, code, blockquote per §6.6), `blocks/CardsGrid/ui/GlowCard.tsx` (remove glow)

1. `brand.css` = §6.2 verbatim + §6.3 utility overrides + `:lang(ja)` font switch.
2. Replace every teal/lime literal: `grep -rn "\[#" apps/cms/src --include=*.tsx` → tokens.
3. Buttons/Eyebrow/Card/inputs per §6.6; `cardsGrid` gets `numbered` (config + UI).
4. Screenshot `/en` at 1440/375 into `.local/screenshots/` for your own comparison.

**Commit:** `feat(cms): CT brand tokens, typography, base components and motifs`

### T3 — Logo, favicons, header and footer redesign

**Files:** `public/ct/{logo.svg (exists), logo-on-dark.svg, mark.svg}`, `public/favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `components/admin/Logo.tsx`, `Icon.tsx`, `components/Logo/index.tsx`, `collections/Header/ui/**`, `collections/Footer/ui/**`, `collections/Footer/Component.tsx` (renders the light-green `DiagonalBand` wedge + the dark-blue footer; the sand CTA band itself is the `globalSectionSlot` → `ctaBand` block that precedes the footer on every page), `collections/Footer/config.ts` (+ `socialLinks` array: platform select + url; + `isoBadges` array: label, certificate)

1. Derive `logo-on-dark.svg` (fill white) and `mark.svg` (ring glyph) by editing the SVG source.
2. Header per §6.6 (white, underline hover, mega-menu on sand with featured dark card, lime Contact,
   drawer on mobile). Footer per §6.6: the Footer component renders the light-green wedge, the dark-blue footer,
   ISO chips, socials and the legal line; the sand CTA band above it is content (the global
   `ctaBand` block, §7), so on `/contact` the wedge simply sits on white. Migration for the two new
   footer arrays.
3. Admin logo/icon fall back to the CT SVGs.

**Commit:** `feat(cms): CT header, footer, logo set and admin branding`

### T4 — Content model: blocks, collections, fields, roles

**Files:** `blocks/PostsList/*`, `blocks/CaseStudies/*`, `blocks/Form/*` (+ `FormClient.tsx`), `blocks/VideoEmbed/*` (+ inline variant for posts), `blocks/contentBlocks.ts`, `blocks/contentBlockComponents.tsx`, `lib/utils/blockPreviewImage.ts` + 4 PNGs, extraction registry; `collections/FormSubmissions.ts`; `collections/Posts/index.ts` (`contentFormat`, `markdown`, `sourceUrl`, `legacyPath`, conditional required, inline `videoEmbed`); `collections/Authors/index.ts` (`slug`, `bio`); `collections/Users` (labels); `lib/hooks/denyPublishForAuthors.ts` (+ wiring on page/posts/header/footer/globalBlock; delete access → superAdmin); `app/(payload)/api/forms/submit/route.ts`; `app/(payload)/api/posts/convert-markdown/route.ts` + `components/admin/ConvertToRichText.tsx`; `blog/[slug]/_components/PostContent/components/MarkdownBody.tsx`; `lib/markdown/{toLexical.ts, toHtml.ts}`; `collections/Posts/extractPostText.ts` (+ markdown); `payload.config.ts` (register `FormSubmissions`); `lib/plugins/index.ts` (comments on `form-submissions`? no; `restrictApiAccess` keeps create closed)

Specs: §5.1 (presets later in T9), §5.2, §5.3, §5.6, §5.7, §5.10 (videoEmbed). Keep slugs short:
`postsList`, `caseStudies`, `form`, `videoEmbed`, `form-submissions`.

Schema workflow at the end: `generate:types` → `migrate:create ct_content_model` → `migrate`
→ `generate:importmap`. Verify in the admin: 4 new blocks in the picker with previews; a post can be
saved in Markdown mode; `form-submissions` appears under "Leads".

**Commit:** `feat(cms): postsList, caseStudies, form and videoEmbed blocks; markdown posts; form submissions; author publish gate`

### T5 — Locales: add `de` and `ja`

**Files:** `lib/config/i18n.ts`, `lib/utils/createLocalizedDefault.ts`, `messages/de.json`, `messages/ja.json`, `brand.css` (`:lang(ja)`), `[locale]/layout.tsx` (Noto Sans JP)

Per §5.8. `generate:types` → `migrate:create add_de_ja_locales` → `migrate`. Verify `/de`, `/ja`
render with fallback; `Config["locale"]` has four values; translator plugin lists the locales.

**Commit:** `feat(cms): German and Japanese content locales`

### T6 — Seed infrastructure: parser, Markdown tools, CLI

**Files:** `lib/seed/ct/{README.md,run.ts,parseDump.ts,types.ts,log.ts}`, `lib/markdown/toLexical.ts` (shared with T4), `tests/int/ctDump.int.spec.ts`, `tests/int/fixtures/ct-dump.sample.md` (2 pages + 2 posts + 1 post with 3 local images), `package.json` script `"seed:ct": "cross-env NODE_OPTIONS=--no-deprecation payload run src/lib/seed/ct/run.ts"`

1. `parseDump.ts` per §4; unit tests assert the counts table on the full dump when present.
2. `lib/markdown/toLexical.ts`: Payload converter first (`convertMarkdownToLexical` +
   `editorConfigFactory.fromEditor`), hand-rolled fallback (builders as in `apps/dev/src/seed.ts`);
   tests for headings, nested lists, links, tables, inline-code lines, images.
3. `run.ts` flags: `--source <path>`, `--only media,taxonomy,users,posts,chrome,pages,redirects,presets`,
   `--limit-posts N`, `--reset` (deletes docs this seed owns: posts with `sourceUrl` on the CT
   origin, pages whose slug is in the IA, redirects in the legacy list, seeded users/presets by
   name). Upserts by slug/sourceUrl → idempotent. Summary table at the end.

**Commit:** `feat(cms): CT dump parser, markdown tooling and seed CLI`

### T7 — Seed: media, taxonomy, authors, users, posts

**Files:** `lib/seed/ct/{brandAssets.ts,seedMedia.ts,seedTaxonomy.ts,seedUsers.ts,seedPosts.ts,data/categories.ts}`

1. Folders `Brand`, `Background`, `Covers`, `Avatars`, `Articles`; brand media (logo with
   `defaultFor: platform_default`, mark, on-dark), 3 background textures, OG image 1200×630.
2. Generated covers and avatars per §6.11 (sharp; cache under `.local/ct/covers/`).
3. Categories (`data/categories.ts`, 11): `News & Announcements` (slug `news`), `Trustable &
   Safety`, `RISC-V`, `Build Engineering`, `Linux Kernel`, `Automotive`, `Medical`, `Open Source &
   Community`, `Events`, `People & Culture`, `Engineering` (fallback). Assignment: template
   `T-NEWS-POST` → `news`; otherwise case-insensitive keyword tests on title + slug + first 600
   chars, in this order, up to 2 matches per post: `safety|trustable|tsf|iec 61508|iso 26262|stpa|
   rafia` → Trustable & Safety; `risc-v|riscv|cva6` → RISC-V; `buildstream|buildgrid|bazel|remote
   execution|reapi|\bbuild\b` → Build Engineering; `kernel|driver|\bbsp\b|systemd|glibc` → Linux
   Kernel; `automotive|vehicle|\bsdv\b|\bagl\b|genivi|android automotive` → Automotive;
   `medical|bloodlight|brain scanner` → Medical; `gnome|freedesktop|flathub|flatpak|outreachy|open
   source` → Open Source & Community; `fosdem|guadec|summit|conference|meetup|\bces\b` → Events;
   `meet the|interview|women|lgbt|remote working|lockdown|onboarding` → People & Culture; none →
   Engineering.
4. Authors — only those referenced by the seeded posts (19 for the default selection, 69 with
   `--all-posts`) with slug, avatar, one-line bio ("Writes about … at CT" from top category).
5. Users: admin/editor/author demo accounts (§5.7).
6. Posts — **40 by default: all `T-NEWS-POST` entries (5) + the 35 newest `T-BLOG-POST` entries by
   date**, selected from the parsed dump at run time (`selectPosts()` in `parseDump.ts`, shared with
   the scraper); `--all-posts` seeds all 191: `contentFormat: "markdown"`, `markdown` = cleaned body, `content` null, `excerpt` =
   first paragraph ≤ 220 chars, `heroImage` cover, `publishedAt` (09:00 Europe/London), authors,
   categories, `sourceUrl`, `legacyPath`, `meta`, `_status: published`, `context.disableRevalidate`.
   Images from `images-map.json` → upload to `Articles`, choose cover, insert into the Markdown at
   the mapped block (§5.2); fixture-tested; missing map → generated covers + one warning.
7. Dry run with `--limit-posts 5`, inspect `/blog` and 3 posts (tables, lists, long code lines,
   images), then the default run; second run = no changes.

**Commit:** `feat(cms): seed CT media, taxonomy, authors, demo users and selected posts`

### T8 — Seed: chrome, settings, global CTA, redirects + legacy map, proxy

**Files:** `lib/seed/ct/{seedChrome.ts,seedRedirects.ts,data/ia.ts}`, `lib/redirects/legacy.json` (generated, committed), `src/proxy.ts` (matcher + legacy lookup), `tests/e2e/ct-redirects.e2e.spec.ts`

1. Header/footer/global CTA/SiteSettings per §7 (links as `reference` to pages → pages seeded
   first; run order: media → taxonomy → users → posts → pages → chrome → redirects → presets).
2. `legacy.json` from IA + parsed posts (all shapes, trailing-slash variants, lowercase).
3. `proxy.ts` per §5.4; keep intl + A/B behaviour otherwise unchanged.
4. Editorial `redirects` collection: seed 3 examples (e.g. `/trustable.html`, `/ctrl-os.html`,
   `/ct-at-ces.html`) so the admin list is not empty — the static map handles the bulk.

**Commit:** `feat(cms): seed navigation, footer, settings, global CTA; legacy URL map in proxy`

### T9 — Seed: pages and presets

**Files:** `lib/seed/ct/{seedPages.ts,recipes.ts,seedPresets.ts}`

Recipes per §6.8 / §7; every page ends with the global CTA slot (except `/contact`); `meta` from
`Title tag` + first paragraph; parents before children; `_status: published`. Presets per §5.1.
Click through every URL in §7; fix recipe edge cases (empty groups, link-only groups).

**Commit:** `feat(cms): seed CT pages from template recipes and demo presets`

### T10 — Feeds, author pages, robots/llms, privacy

**Files:** `app/(frontend)/feeds/[feed]/route.ts`, `lib/config/feeds.ts`, `lib/markdown/toHtml.ts` (Lexical→HTML + Markdown→HTML), `[locale]/layout.tsx` (`<link rel="alternate">`), `[locale]/blog/author/[slug]/page.tsx` (+ `_components`), `lib/dal/getPosts.ts` (author filter), `lib/dal/getAuthorBySlug.ts`, `sitemap.ts` (authors), `robots.ts` (AI agents), `app/llms.txt/route.ts`, `components/PlausibleScript.tsx`, `[locale]/layout.tsx` (GA gated, Plausible), `.env.example` (+ `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_PLAUSIBLE_SRC`, `AB_ENABLED`, `OIDC_ROLE_MAP`, `SEED_DEMO_PASSWORD`)

Specs §5.5, §5.3 (author pages), §5.11, §5.10. Tests: feed XML well-formed; author page lists the
right count; no cookies spec.

**Commit:** `feat(cms): RSS/Atom feeds, author pages, robots + llms.txt, Plausible, cookieless checks`

### T11 — Design polish and accessibility pass

Walk §6.7 block by block and §6.8 page by page at 1440 / 1024 / 375; fix spacing, cadence, type,
empty states; mega-menu keyboard; forms; skip link; axe spec (§5.12); Lighthouse sanity on `/`
(LCP < 2.5 s locally); `bun run build` green.

**Commit:** `feat(cms): CT design polish and WCAG 2.2 AA pass`

### T12 — Docker on `debian:trixie`, compose (Postgres, Nginx, cron, Keycloak)

**Files (already written, unbuilt — make them build and run, fix what reality disagrees with):** `apps/cms/Dockerfile` (targets `cms`, `site`; `ARG BASE_IMAGE=debian:trixie-slim`, Node from tarball, Bun only in `deps`), `apps/cms/docker-compose.yml` (postgres, cms, edge, cron, keycloak [profile sso], snapshot + site [profiles]), `apps/cms/docker/{entrypoint.sh,nginx-edge.conf,nginx-site.conf,cron.sh,snapshot.sh,keycloak/realm-ct.json}`, `apps/cms/.env.docker.example`, root `.dockerignore`. **To add:** `next.config.mjs` (`output: "standalone"`, `outputFileTracingRoot: path.resolve(__dirname, "../..")`), `lib/plugins/index.ts` (Blob `enabled`), `lib/auth/oidc/*` + callback (groups → role, §5.9), `.gitignore` entries for `apps/cms/.env.docker` and `apps/cms/.secrets/`

1. **Image** (as written): multi-stage. `FROM ${BASE_IMAGE} AS node` installs Node 24 LTS from the official
   tarball (download `node-v24.x-linux-x64.tar.xz` + `SHASUMS256.txt`, verify, extract to
   `/usr/local`). `FROM node AS build` installs Bun pinned to `packageManager` (`curl -fsSL
   https://bun.sh/install | bash -s "bun-v1.3.9"`), copies root `package.json`, `bun.lock`,
   `bunfig.toml`, `turbo.json`, `packages/`, `apps/cms/`; `RUN --mount=type=secret,id=npm_token
   NPM_TOKEN=$(cat /run/secrets/npm_token) bun install --frozen-lockfile`; `bunx turbo run build
   --filter=cms...`. `FROM ${BASE_IMAGE} AS runtime`: copy `/usr/local/bin/node`, `.next/standalone`
   (server lands under `apps/cms/server.js` in a monorepo — check), `.next/static`, `public/`;
   non-root user; `EXPOSE 3000`; `ENTRYPOINT ["docker/entrypoint.sh"]`. Build context = **monorepo
   root** (`docker build -f apps/cms/Dockerfile --secret id=npm_token,src=.npm_token .`). No alpine
   (sharp needs glibc); no Bun in runtime; no internet at runtime (fonts are bundled by
   `next/font`). **Build-time database:** `next build` pre-renders (generateStaticParams, PPR) and
   needs Postgres → pass `--secret id=database_url`; locally point it at the compose Postgres
   (`host.docker.internal:5432` or `--network host`), in the client's GitLab job at their DB. If that
   is unacceptable, add a `SKIP_STATIC_PARAMS=1` guard that makes `lib/dal/staticParams/*` return `[]`
   and sets `dynamic = "force-dynamic"` on the blog index for the build — note the trade-off.
2. **Entrypoint**: `docker/entrypoint.sh` only validates env and execs the server — the Postgres
   adapter is configured with `prodMigrations`, so Payload applies pending migrations on init in
   production. Verify on first boot against an empty database; if it does not, add a `migrate`
   stage (built from `build`) that runs `bun run payload migrate` first in compose.
3. **Compose**: `postgres:17` (volume), `cms` (env from `.env.docker`, volume
   `./.local/media:/app/apps/cms/public/media`, `depends_on`), `nginx` (`:8080` → `cms:3000`;
   `/media/` from the shared volume; gzip; this is "your existing proxy"), `cron` (`curlimages/curl`
   loop: `curl -fsS -H "Authorization: Bearer $CRON_SECRET" http://cms:3000/api/scheduled-publish/run`
   every 60 s), `keycloak` (`quay.io/keycloak/keycloak:26 start-dev --import-realm`, realm JSON per
   §5.9, `:8081`), optional `snapshot` + `nginx-static` (`:8082`, labelled demonstration). Seed from
   the host: `DATABASE_URL=postgres://payload:payload@localhost:5432/ct bun run seed:ct`.
4. **Vercel: leave `vercel.json` as it is.** The shareable demo URL is the preview deployment of the
   existing `cms` Vercel project for this branch (branch alias
   `cms-git-claude-busy-planck-k29mbr-<team>.vercel.app`): its build command already builds the
   plugins, runs `bun run migrate` against the Neon `preview/<branch>` database and runs `next build`;
   the cron for scheduled publishing is already configured. Do not switch the project to the
   container runtime — if the plan lacks container images the preview build fails and the demo link
   dies. The container story is told with `docker compose` on the call. (Vercel does support
   `Dockerfile.vercel` + `services` with `runtime: "container"`; that is a separate experiment, not
   part of this demo.) Before the call: check the project's Deployment Protection — the client must
   open the preview without a Vercel login (disable protection for previews, or share link / bypass
   token).
5. Prove (on a machine with a Docker daemon — the cloud sandbox has none, so hand this step to
   Maksim with exact commands if you cannot run it): `docker build --target cms --build-arg BASE_IMAGE=debian:trixie-slim …`; `docker compose up`
   → `/en` on `:8080`; `docker run --network none …` serves pages; `--profile sso` Keycloak login
   maps roles; `--profile snapshot` then `--profile site` serves the static mirror on `:8082`.
   Hand-out for the client: `docs/plans/2026-10-04-ct-hosting.md` (update it if anything changes).

**Commit:** `feat(cms): Dockerfile on debian:trixie, compose stack with Postgres/Nginx/cron/Keycloak, Vercel container config`

### T13 — Verification, translations, demo script, README

**Files:** `lib/seed/ct/README.md`, `docs/plans/2026-10-04-ct-demo-script.md`, `tests/e2e/ct.e2e.spec.ts` (every §7 URL → 200 + h1; 25 legacy redirects; feeds; no cookies; axe)

1. Fresh DB → migrate → full seed → second seed no-op → `bun run build` → `bun run start` → e2e spec green.
2. With `OPENAI_API_KEY`: translate home + one article into `de` via the plugin; keep the result.
3. Seed comments/mentions and one scheduled post (§5.7) if not already in T7.
4. Screenshots for the deck (home, sector, solution+form, blog, post, admin editor with live preview,
   block picker with presets, Keycloak login) → `.local/screenshots/`.
5. Demo script per §10; README: prerequisites, dump location, flags, run order, Docker, known gaps.

**Commit:** `docs(cms): CT demo verification, seed README and demo script`

### T14 — Preview deployment (only after Maksim approves the push)

Push the branch; open a **draft** PR `[demo] CT rebuild + migration (do not merge)`; Neon
creates `preview/<branch>`; seed it from your machine with
`VERCEL_ENV=preview VERCEL_GIT_COMMIT_REF=claude/busy-planck-k29mbr DATABASE_URL=… BLOB_READ_WRITE_TOKEN=… bun run seed:ct`;
create the demo admin; run the e2e spec against the preview URL; paste URL + demo script into the PR.

---

## 9. Acceptance checklist

- [ ] `check-types`, `lint`, `test:int`, `build` green in `apps/cms`; e2e spec green locally.
- [ ] Fresh DB → migrate → seed → every §7 URL renders; second seed changes nothing.
- [ ] 40 posts (5 news + 35 articles) in Markdown mode with author, category, date, cover, excerpt and the images from `images-map.json`; `--all-posts` seeds 191; a new rich-text post renders identically; search finds Markdown text.
- [ ] 25 legacy URLs (4 article shapes, `.html` pages, author pages, `/index.html`) → 308 → 200.
- [ ] `/feeds/all.atom.xml`, `/feeds/all.rss.xml`, `/feeds/news.atom.xml` well-formed, newest first.
- [ ] Forms: internal submission stored with page/referrer/utm; Mautic-mode markup has `mauticform[...]` names and no iframe; no-JS submit works; newsletter stores; gated download reveals link.
- [ ] Roles: author cannot publish/delete; editor publishes; admin deletes. Comments + scheduled post seeded.
- [ ] `/de`, `/ja` render; translated home in `de`; Noto Sans JP on `/ja`.
- [ ] Keycloak login in compose maps groups → roles.
- [ ] No cookies on public pages; videos click-to-load via `youtube-nocookie`; Plausible tag only when env set.
- [ ] `/robots.txt` allows AI agents; `/llms.txt` lists every seeded article; sitemap has author pages + hreflang.
- [ ] axe: 0 serious/critical on 7 pages × 2 widths; keyboard pass.
- [ ] `docker compose up` on a clean machine works (verified by Maksim if the agent has no Docker daemon); image built on `debian:trixie-slim`; runs with `--network none`.
- [ ] The branch preview on Vercel builds with the unchanged `vercel.json` (migrations applied on the Neon preview branch) and opens without a Vercel login.
- [ ] Brand: §6.2 tokens only; §6.12 don'ts respected; header/footer sequence matches §6.6.
- [ ] Raw dump, parsed JSON, covers, media volume, screenshots **not** in git.

## 10. Demo script (20 minutes; one moment per feature)

1. **The site** (2 min) — `/`, `/sectors/automotive`, `/technology/ctrl-os`: their words, their brand, new system. Point at the angled band and the ISO chips: "nothing you own was lost".
2. **Page builder** (3 min) — editor on the Automotive page: live preview, change hero title, insert the "Gated whitepaper form" preset, visual-editing click on a card, publish, reload.
3. **Articles** (3 min) — `/blog`: 40 migrated with their images (191 available); open an imported post: Markdown in the sidebar, edit, preview; "Convert to rich text"; open a new post with the Lexical toolbar; author page; `/resources/news` listing.
4. **URLs and feeds** (2 min) — paste `<client-domain>/articles/2019/…` → lands on the post; `/feeds/all.atom.xml`; redirects collection: add one live.
5. **Forms** (3 min) — build a 3-field form in the admin, publish, submit, see it under Leads with page + UTM; flip the block to Mautic mode, show the `mauticform[...]` markup; newsletter band submits; no iframe anywhere.
6. **Workflow and roles** (2 min) — author drafts and comments "@editor"; editor previews, publishes or schedules; versions → restore.
7. **Languages** (2 min) — locale switcher `de`: Translate (plugin) field by field, publish, `/de`; `/ja` glyphs.
8. **Privacy, SEO, a11y** (1 min) — DevTools cookies: empty; click a video → nocookie iframe; `/robots.txt`, `/llms.txt`, SEO panel on a draft.
9. **Self-hosted** (2 min) — `docker compose up`: Postgres, Nginx on :8080, cron, Keycloak login as the editor user → Editor; `docker image inspect` shows `debian:trixie`; `--network none` container still serves.
10. **Close** — what is a slide, not a click: static files behind Nginx via GitLab pipeline, preference centre, approval workflow, add-to-calendar (Phase 2).

## 11. Open points for Maksim (pick the default, note it, keep going)

1. **Brand guidelines / badge art / social URLs** — default: CSS tokens in §6.2, ISO chips as text, socials `#`.
2. **Images**: Maksim runs `scrapeImages.ts` locally and drops `.local/ct/images-map.json` + `images/`; until then generated covers. The real GitLab Markdown export can replace the dump later; the importer handles both.
3. **YouTube ids** for the events page — default: 3 placeholder posters with real talk titles from the dump, no iframe until an id exists.
4. **RE:OS vs CTRL OS** — default: "CTRL OS · becoming RE:OS" eyebrow.
5. **Spanish locale** stays (non-destructive); DE + JA added.
6. **Deployment Protection** on the `cms` Vercel project: previews must open without a Vercel login for the client (disable for previews, or share link / bypass token).
7. **Public repo** — content is the client's public copy; the dump and internal docs never enter git.
