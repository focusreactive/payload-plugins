# CT demo seed

Seeds the CT demo (plan: `docs/plans/2026-10-04-ct-demo-plan.md`) from the client's content dump.
Client material never enters git: it lives in `apps/cms/.local/ct/` (git-ignored).

## Inputs (`apps/cms/.local/ct/`)

| File | Required | Notes |
|---|---|---|
| `content-dump.md` | yes | the full site dump (format: plan §4) |
| `brand/logo.svg` | yes | official wordmark; copied to `public/ct/` (git-ignored) |
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

Steps run in this order: `media → taxonomy → users → posts → pages → chrome → redirects → presets`.
Every step upserts (by slug, sourceUrl, email or name), so a second run changes nothing.
`parsed.json` (the parsed dump) is written next to the dump for inspection.

## Files

- `parseDump.ts` — dump → `ParsedSite` (plan §4 rules) and `selectPosts()` (the demo selection).
- `markdownImages.ts` — puts scraped images back into the Markdown at the mapped block.
- `run.ts` — CLI; `context.ts` shared types; `steps.ts` step registry; `reset.ts` `--reset`.
- `scrapeImages.ts` — Bun-only image collector run on a machine that can reach the live site.

Tests: `tests/int/ctDump.int.spec.ts` (fixture always; full-dump counts when the dump is present).
