# CT demo — content selection and image collection

**Date:** 2026-10-04 · **Decision (Maksim):** migrate **all marketing pages** (they are rebuilt from
sections anyway) and **40 posts**: the 5 news announcements + the 35 newest articles. The full 191
stays available behind `--all-posts` in the seed; the dump has every body.

## 1. Selected posts (rule, not a list)

No URL list is committed. Both the seed and the image scraper derive the selection from the dump at
run time with the same function (`selectPosts()` in `src/lib/seed/ct/parseDump.ts`; the scraper has
a dependency-free copy):

- every entry with `**Template:** T-NEWS-POST` (5), plus
- the 35 newest entries with `**Template:** T-BLOG-POST` by `**Date:**` (ties broken by order in the dump).

Result on the current dump: 40 posts, 19 distinct authors, dates 2024-08-06 → 2026-09-08. Only the
authors of selected posts are seeded; `--all-posts` switches to all 191 posts / 69 authors.

## 2. Images: why a second pass is needed

The content dump holds article **text only** — zero `<img>`/`![]()` references across all 237
entries (checked). The proposal counts ~500 images on the old site. For the demo we collect the
images of the 40 selected posts directly from the live pages and store a mapping that tells the
seed where each image sits in the article.

The sandbox Claude runs in cannot reach `<client-domain>` (egress policy), so the script below is
run **by Maksim locally** (or by Opus if its environment has internet). It needs only Bun.

```bash
# from the repo root; the dump must be at apps/cms/.local/ct/content-dump.md
bun run apps/cms/src/lib/seed/ct/scrapeImages.ts --dump apps/cms/.local/ct/content-dump.md --out apps/cms/.local/ct
# dry run on two posts: add --limit 2 ; re-parse saved HTML offline: --from-html
# explicit list instead of the rule: --selection <json array of {url}>
```

What it does (tested against a local fixture; the live selectors come from the dump's template
analysis — `.post-splash`, `.post-content`):

1. Fetches each post page (polite 400 ms delay, 3 retries, custom user agent) and saves the raw HTML
   to `.local/ct/html/<slug>.html` so parsing can be repeated without network.
2. Walks the article body in document order with Bun's `HTMLRewriter`: counts block elements
   (`p, h2–h5, ul, ol, pre, blockquote, table`) and records every `<img>` (`src` or lazy `data-src`)
   with `afterBlock` = how many blocks preceded it. Also records the splash background image and
   `og:image` (kinds `splash`, `og`) — candidates for the post cover.
3. Downloads the images to `.local/ct/images/<slug>/NN-name.ext` (sha1 + bytes recorded).
4. Writes `.local/ct/images-map.json`:

```jsonc
{
  "generatedAt": "2026-10-05T…", "source": "…/selectedPosts.json",
  "posts": [
    {
      "slug": "<slug>",
      "sourceUrl": "https://www.<client-domain>/articles/2026/<slug>.html",
      "status": "ok",            // ok | fetch-failed | no-body
      "httpStatus": 200, "title": "<page title>", "blockCount": 42,
      "images": [
        { "kind": "splash", "src": "https://…/riscv.jpg", "local": "images/<slug>/01-riscv.jpg", "alt": "", "afterBlock": 0, … },
        { "kind": "inline", "src": "https://…/boot-chain.png", "local": "images/<slug>/02-boot-chain.png",
           "alt": "Boot chain diagram", "afterBlock": 3, "width": 800, "height": 400, "bytes": 51234, "sha1": "…" }
      ]
    }
  ]
}
```

## 3. How the seed uses the map (contract for Opus, task T7)

- For each selected post, read `images-map.json` → upload every `local` file to Media (folder
  `Articles`, `alt` = image alt or the post title) and remember `src → media URL`.
- **Cover:** first `splash` image if present, else first `inline`, else `og`, else a generated cover.
  Skip `og` images that are the site-wide default (same sha1 across many posts).
- **Body:** split the cleaned Markdown body into blocks (paragraph = blank-line separated; headings,
  lists, tables count as one block each — the same classes the scraper counts). Insert
  `![alt](mediaUrl)` after block `afterBlock` (clamped to the end). Because the dump's blocks and the
  HTML blocks are the same elements in the same order, positions line up; when `blockCount` in the
  map differs from the Markdown block count by more than 2, log a warning and place images at the
  proportional position instead.
- Posts with `status != ok` or no images keep the generated cover; nothing else changes.
- Idempotent: media are matched by `sha1` stored in the Media `caption`/filename, so re-runs do not
  duplicate files.

## 4. Marketing pages

All 35 marketing pages from §7 of the plan are migrated. Their images (logos of partners, hero
illustrations) are **not** collected: the redesign replaces them with the line-motif system and
generated covers (§6.11). If specific illustrations should survive (e.g. the CTRL OS badge), add
their URLs to a `pageImages.json` with the same `MappedImage` shape and the seed will upload them.
