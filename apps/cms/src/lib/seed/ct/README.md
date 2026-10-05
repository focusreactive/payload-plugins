# CT demo seed

Seeds the CT demo (plan: `docs/plans/2026-10-04-ct-demo-plan.md`) from the client's content dump.
Client material never enters git: it lives in `apps/cms/.local/ct/` (git-ignored), and so does
everything the seed derives from it that names the client (`public/ct/`,
`src/lib/redirects/legacy.local.json`).

## Prerequisites

- Postgres 16 with pgvector (`create extension vector` once per database), `DATABASE_URL` set.
  Environment variables win over `apps/cms/.env`.
- `bun install` at the repo root, `bun run payload migrate` in `apps/cms`.
- `MEDIA_STORAGE=local` to keep uploads in `public/media` (otherwise Vercel Blob when
  `BLOB_READ_WRITE_TOKEN` is set).
- Optional: `SEED_DEMO_PASSWORD` (default `ct-demo`), `OPENAI_API_KEY` (search embeddings and
  the translator plugin; without it the seed logs `AI_LoadAPIKeyError` per document and carries on).

## Inputs (`apps/cms/.local/ct/`)

Unzip the `ct-local*.zip` archive into `apps/cms/.local/` (it contains a `ct/` folder).

| File | Required | Notes |
|---|---|---|
| `content-dump.md` | yes | the full site dump (format: plan §4; md5 `bdd272aa…`) |
| `brand/logo.svg` | no | official wordmark; copied to `public/ct/`. Without it a neutral placeholder |
| `images-map.json` + `images/` | no | produced by `scrapeImages.ts`; without it posts get generated covers |

## Run

```bash
cd apps/cms
bun run seed:ct                        # 40 posts (5 news + 35 newest articles), all pages
bun run seed:ct limit-posts=5          # dry run
bun run seed:ct all-posts              # all 191 posts / 69 authors
bun run seed:ct only=posts,redirects   # selected steps
bun run seed:ct reset                  # delete what the seed owns, then seed
bun run seed:ct source=path/to/dump.md # another dump (e.g. tests/int/fixtures/ct-dump.sample.md)
```

Flags are positional `name=value` words: `payload run` swallows `--flags`.

Steps run in this order:
`media → taxonomy → users → posts → pages → chrome → redirects → presets → workflow`.
Every step upserts (by slug, sourceUrl, email, file name or name) and skips writes that would not
change anything, so a second run reports only `skipped`. `parsed.json` (the parsed dump) is
written next to the dump for inspection.

What each step owns:

- `users` — `admin@ct.demo` (Admin), `editor@ct.demo` (Editor), `author@ct.demo` (Author).
- `posts` — Markdown posts with author, category, date, cover and inline images. A post whose
  slug is taken by a page of the new site is seeded with a suffix (`-news` / `-<year>`), and
  SVGs with active content (draw.io `<foreignObject>` labels) are rasterised to PNG, since
  Payload rejects them.
- `redirects` — writes the full legacy-URL map to `src/lib/redirects/legacy.local.json`
  (git-ignored, old slugs carry the client's name) plus 3 editorial entries in the Redirects
  collection. **Rebuild after it changes**: `next.config.mjs` aliases the file as
  `@ct/legacy-map` at build time, falling back to the committed extras in `legacy.json`.
- `workflow` — two comment threads with mentions on the home page, one note on the newest
  article, and a draft news post (`scheduled-news-demo`) scheduled for tomorrow 09:00 London.
  Re-run it on demo day to re-arm the schedule.

## After seeding

The seed writes with `disableRevalidate` (no Next runtime), so a running server keeps serving
cached data: restart `bun run start` (or rebuild) after a seed. Re-seeding a different dump into
an existing build: delete `.next/cache/fetch-cache` first.

## Verify

```bash
bun run test:int                                            # parser, image insertion, legacy map
bun run build && PORT=3333 bun run start &
E2E_BASE_URL=http://localhost:3333 bunx playwright test tests/e2e/ct*.e2e.spec.ts
```

`ct.e2e.spec.ts` (every IA page → 200 + one h1, blog/author, DE/JA, robots/sitemap/llms),
`ct-redirects` (25 legacy URLs → 308 → 200), `ct-privacy` (cookies, nocookie video, feeds).

## Docker

See `docs/plans/2026-10-04-ct-hosting.md`: the compose stack (Postgres, app, Nginx, cron,
optional Keycloak) is seeded from the host with `DATABASE_URL` pointing at the compose Postgres.
The generated `legacy.local.json` is part of the build context, so build the image after seeding.

## Known gaps

- Translations (DE/JA content) need `OPENAI_API_KEY`; the locales are on, the content is EN.
- YouTube ids for the events page are placeholders (plan §11.3).
- Vercel previews build from git, so they get only the committed legacy extras unless
  `legacy.local.json` is provided at build time.

## Files

- `parseDump.ts` — dump → `ParsedSite` (plan §4 rules), `selectPosts()` (the demo selection),
  `avoidPageSlugs()`.
- `markdownImages.ts` — puts scraped images back into the Markdown at the mapped block.
- `sameData.ts` — "would this write change anything" check used to keep re-runs write-free.
- `run.ts` — CLI; `context.ts` shared types; `steps.ts` step registry; `reset.ts` `reset`.
- `scrapeImages.ts` — Bun-only image collector run on a machine that can reach the live site.

Tests: `tests/int/ctDump.int.spec.ts` (fixture always; full-dump counts when the dump is present).
