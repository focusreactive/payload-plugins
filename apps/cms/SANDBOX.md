# Sandbox F

A content sandbox. This branch exists only to keep a preview deployment alive: **never merge it**.

It carries custom code on top of the standard app: a site rendered 1:1 from an existing
stylesheet, record-driven page types, and the sections those pages are built from. Content,
names, copy and images live in the database only and are loaded by a seed kept outside this
repository.

## How the site layer is put together

| What | Where |
|---|---|
| The site's stylesheets, served as static files | `public/assets/css/` (`styles.css`, `templates/*.css`, `site-overrides.css`) and the icons they reference in `public/assets/images/icons/` |
| URL prefixes of the record page types | `src/lib/config/entityRoutes.ts` - the only place a prefix is written |
| Record collections (states, clinics, doctors, treatments, conditions) | `src/collections/entities/` |
| Reads of those records, cached under one tag | `src/lib/dal/entities.ts` (`findEntities`, `getEntityBySlug`, `getSiteChrome`) |
| The frame every page shares (stylesheets, `body` id and classes, header, newsletter, footer) | `src/components/site/layout/SitePage.tsx` |
| Building blocks for markup (plain `img`, button, rich text, slider, video) | `src/components/site/` |
| Section configs and components | `src/blocks/site/` - `configs.ts`, `components.tsx`, and one file per page type under `templates/` |
| Section registries | `src/blocks/siteBlocks.ts` (configs) and `src/blocks/siteBlockComponents.tsx` (components) |
| Page templates of the record types | `src/templates/` |
| Link field and link resolution | `src/lib/fields/site/siteLink.ts`, `src/lib/site/links.ts` |
| Seeder (generic; reads JSON from `SEED_DIR`) | `src/scripts/seedSite.ts` |

## Conventions

- **Markup is the original site's markup.** A section component renders the same elements, class
  names and nesting as the scraped section, because the stylesheet is used unchanged. No Tailwind
  class, no `next/image`, no `next/link` on the public site: the app's Tailwind build is not loaded
  there, and plain anchors make every navigation a document load, so each page gets exactly the
  stylesheets of its own template.
- **One stylesheet set per page type.** `SitePage` takes `template` and links `styles.css` plus the
  template's files (`SITE_TEMPLATE_STYLES`). It also sets the id and classes the stylesheet expects
  on `body`.
- **A scraped section maps to one block.** The section's first class names the block
  (`trustlogos` -> `logoStrip`, `media_text` -> `mediaText`); its other classes become named
  options (side, size, background), never typed class names. Block slugs stay under 12 characters
  and nested array names short, because Postgres caps identifiers at 63 characters and every block
  exists once per collection and once more per version table.
- **Text an editor types is a field; text with emphasis is rich text.** A heading with an
  italic or underlined word is `headingRichText` rendered with `InlineRichText`; running text is
  `bodyRichText` rendered with `SiteRichText`. No field holds HTML.
- **A link is `siteLink` / `siteButton`**, resolved with `siteLinkHref`. A URL or phone value that
  ends up in an `href` or `src` goes through `stripMarkers`, and its field name is listed in the
  visual-editing plugin's `excludeFieldNames`.
- **A section that lists records reads them through `findEntities`** and accepts hand-picked
  records as an override. On a record's own page it receives `context` (the record) and shows that
  record's data: a doctors slider with nothing picked shows the clinic's own doctors.
- **Collection slugs and code names are neutral** (`clinics`, `treatments`). Nothing in this
  repository names a company.
- **Schema changes need a migration**, generated with every optional plugin switched on and
  `VERCEL_ENV=production`, then read for `DROP` before it is committed:
  `CRON_SECRET=x GA4_MEASUREMENT_ID=G-PLACEHOLDER1 GA4_PROPERTY_ID=1 GA4_CLIENT_EMAIL=a@example.com GA4_PRIVATE_KEY=x BLOB_READ_WRITE_TOKEN=vercel_blob_rw_x_x OPENAI_API_KEY=x VERCEL_ENV=production bun run migrate:create <name>`.
  The same variables apply to `bun run generate:types`.

## Seeding

```bash
SEED_DIR=/absolute/path/to/seed/parts bun run payload run src/scripts/seedSite.ts
```

Every JSON file in the folder is applied in name order; documents are matched by slug, so a second
run is safe. Afterwards refresh the deployed pages:
`POST /api/site/revalidate?secret=<PREVIEW_SECRET>`.
