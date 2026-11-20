import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Editor-friendly field choices (CMS simplification, part B3):
// - CardsGrid `columns` number -> select '1'..'4'; per-card `alignVariant` / `rounded` / `backgroundColor`
//   move to the block (taken from the first card, preferring the block's own locale).
// - Carousel `effect` keeps slide/fade (cube/flip/coverflow/cards -> slide).
// - imageField `aspectRatio` keeps 16/9, 3/2, 4/3, 1/1, auto (9/16 + 1/2 -> 1/1, 4/1 + 3/1 -> 16/9).
// - Media `defaultFor` (hasMany select, one option) -> `isDefaultImage` checkbox.
// - Header `name`, reusable (global) section `title`, Site settings `seo.x.site` / `seo.x.creator` stop being
//   localized: the default-locale (en) value is kept, falling back to the first non-empty locale.
// - Site settings `seo.og.siteName` is dropped; where a locale had no `general.siteName` but an OG
//   site name, that name becomes the site name so the rendered og:site_name does not change.
// - Chart data point labels are localized (only presets store them per row, so only presets move).
// - Posts' rich-text inline blocks (stored as Lexical JSON in posts_locales.content and
//   _posts_v_locales.version_content) are rewritten: code `language` -> a fixed list, CTA banner
//   eyebrow/heading/description -> the shared `heading` group, cards grid as above.
// Every step covers live rows and the versions/drafts tables (`_*_v*`) and presets.

/** Tables (prefixes) a section block can live in; only presets blocks are not localized. */
const BLOCK_PREFIXES = ['page', '_page_v', 'posts', '_posts_v', 'gsec', '_gsec_v', 'presets'] as const
const HERO_PREFIXES = ['page', '_page_v', 'presets'] as const
const NON_LOCALIZED_BLOCK_PREFIXES = new Set<string>(['presets'])
/** Locales at the time of this migration (`src/lib/config/i18n.ts`); `en` is the default. */
const LOCALES = ['en', 'es'] as const
const DEFAULT_LOCALE = 'en'

const CARD_STYLE_COLUMNS = ['align_variant', 'rounded', 'background_color'] as const
const STAGE = '"_mig_editor_friendly_choices"'

const ASPECT_RATIO_MAP: Record<string, string> = { '9/16': '1/1', '1/2': '1/1', '4/1': '16/9', '3/1': '16/9' }
const REMOVED_EFFECTS = ['cube', 'flip', 'coverflow', 'cards']

/** Stage the default-locale value of a localized column, keyed by parent id. */
function stageLocalized(kind: string, table: string, column: string): string {
  return `INSERT INTO ${STAGE} (kind, key, v1)
    SELECT DISTINCT ON ("_parent_id") '${kind}', "_parent_id"::text, "${column}"
    FROM "${table}" WHERE coalesce("${column}", '') <> ''
    ORDER BY "_parent_id", ("_locale" = '${DEFAULT_LOCALE}') DESC, "_locale";`
}

function stageUp(): string {
  const statements: string[] = [
    `CREATE TABLE ${STAGE} (kind text NOT NULL, key text NOT NULL, v1 text, v2 text, v3 text);`,
  ]

  for (const prefix of BLOCK_PREFIXES) {
    const blocks = `${prefix}_blocks_cards_grid`
    const blockLocale = NON_LOCALIZED_BLOCK_PREFIXES.has(prefix) ? `'${DEFAULT_LOCALE}'` : 'b."_locale"'
    // Grid-level card style = the first card's style (same locale as the block when it has one).
    statements.push(`INSERT INTO ${STAGE} (kind, key, v1, v2, v3)
      SELECT DISTINCT ON (b."id") 'cards:${prefix}', b."id"::text,
        i."align_variant"::text, i."rounded"::text, i."background_color"::text
      FROM "${blocks}" b JOIN "${blocks}_items" i ON i."_parent_id" = b."id"
      ORDER BY b."id", (i."_locale" = ${blockLocale}) DESC, i."_order";`)
    // Number -> text so the generated cast to the new '1'..'4' enum succeeds; out-of-range -> nearest.
    statements.push(`ALTER TABLE "${blocks}" ALTER COLUMN "columns" DROP DEFAULT;
      ALTER TABLE "${blocks}" ALTER COLUMN "columns" SET DATA TYPE varchar
        USING (CASE WHEN "columns" IS NULL THEN NULL ELSE greatest(1, least(4, round("columns")))::int::text END);`)
    for (const [from, to] of Object.entries(ASPECT_RATIO_MAP)) {
      statements.push(
        `UPDATE "${blocks}_items" SET "image_aspect_ratio" = '${to}' WHERE "image_aspect_ratio" = '${from}';`,
      )
    }
    statements.push(
      `UPDATE "${prefix}_blocks_carousel" SET "effect" = 'slide' WHERE "effect" IN (${REMOVED_EFFECTS.map((e) => `'${e}'`).join(', ')});`,
    )
  }

  for (const prefix of HERO_PREFIXES) {
    for (const [from, to] of Object.entries(ASPECT_RATIO_MAP)) {
      statements.push(
        `UPDATE "${prefix}_blocks_hero" SET "image_aspect_ratio" = '${to}' WHERE "image_aspect_ratio" = '${from}';`,
      )
    }
  }

  statements.push(
    stageLocalized('header', 'header_locales', 'name'),
    stageLocalized('header_v', '_header_v_locales', 'version_name'),
    stageLocalized('gsec', 'gsec_locales', 'title'),
    stageLocalized('gsec_v', '_gsec_v_locales', 'version_title'),
    stageLocalized('x_site', 'site_settings_locales', 'seo_x_site'),
    stageLocalized('x_creator', 'site_settings_locales', 'seo_x_creator'),
    stageLocalized('x_site_v', '_site_settings_v_locales', 'version_seo_x_site'),
    stageLocalized('x_creator_v', '_site_settings_v_locales', 'version_seo_x_creator'),
    // og:site_name used to fall back to the site name; keep a custom OG name where it was the only name.
    `UPDATE "site_settings_locales" SET "general_site_name" = "seo_og_site_name"
      WHERE coalesce("general_site_name", '') = '' AND coalesce("seo_og_site_name", '') <> '';`,
    `UPDATE "_site_settings_v_locales" SET "version_general_site_name" = "version_seo_og_site_name"
      WHERE coalesce("version_general_site_name", '') = '' AND coalesce("version_seo_og_site_name", '') <> '';`,
    `INSERT INTO ${STAGE} (kind, key) SELECT DISTINCT 'media_default', "parent_id"::text
      FROM "media_default_for" WHERE "value" = 'platform_default';`,
    `INSERT INTO ${STAGE} (kind, key, v1) SELECT 'presets_dp', "id", "label" FROM "presets_blocks_chart_ranges_data_points";`,
  )

  return statements.join('\n')
}

function applyUp(): string {
  const statements: string[] = []

  for (const prefix of BLOCK_PREFIXES) {
    const assignments = CARD_STYLE_COLUMNS.map(
      (column, index) =>
        `"${column}" = coalesce(s.v${index + 1}, b."${column}"::text)::"enum_${prefix}_blocks_cards_grid_${column}"`,
    ).join(', ')
    statements.push(`UPDATE "${prefix}_blocks_cards_grid" b SET ${assignments}
      FROM ${STAGE} s WHERE s.kind = 'cards:${prefix}' AND s.key = b."id"::text;`)
  }

  statements.push(
    `UPDATE "header" t SET "name" = s.v1 FROM ${STAGE} s WHERE s.kind = 'header' AND s.key = t."id"::text;`,
    `UPDATE "_header_v" t SET "version_name" = s.v1 FROM ${STAGE} s WHERE s.kind = 'header_v' AND s.key = t."id"::text;`,
    `UPDATE "gsec" t SET "title" = s.v1 FROM ${STAGE} s WHERE s.kind = 'gsec' AND s.key = t."id"::text;`,
    `UPDATE "_gsec_v" t SET "version_title" = s.v1 FROM ${STAGE} s WHERE s.kind = 'gsec_v' AND s.key = t."id"::text;`,
    `UPDATE "site_settings" t SET "seo_x_site" = s.v1 FROM ${STAGE} s WHERE s.kind = 'x_site' AND s.key = t."id"::text;`,
    `UPDATE "site_settings" t SET "seo_x_creator" = s.v1 FROM ${STAGE} s WHERE s.kind = 'x_creator' AND s.key = t."id"::text;`,
    `UPDATE "_site_settings_v" t SET "version_seo_x_site" = s.v1 FROM ${STAGE} s WHERE s.kind = 'x_site_v' AND s.key = t."id"::text;`,
    `UPDATE "_site_settings_v" t SET "version_seo_x_creator" = s.v1 FROM ${STAGE} s WHERE s.kind = 'x_creator_v' AND s.key = t."id"::text;`,
    `UPDATE "media" t SET "is_default_image" = true FROM ${STAGE} s WHERE s.kind = 'media_default' AND s.key = t."id"::text;`,
    `INSERT INTO "presets_blocks_chart_ranges_data_points_locales" ("label", "_locale", "_parent_id")
      SELECT coalesce(s.v1, ''), '${DEFAULT_LOCALE}', s.key FROM ${STAGE} s WHERE s.kind = 'presets_dp';`,
    `DROP TABLE ${STAGE};`,
  )

  return statements.join('\n')
}

function stageDown(): string {
  const statements: string[] = [
    `CREATE TABLE ${STAGE} (kind text NOT NULL, key text NOT NULL, v1 text, v2 text, v3 text);`,
  ]

  for (const prefix of BLOCK_PREFIXES) {
    const blocks = `${prefix}_blocks_cards_grid`
    statements.push(`INSERT INTO ${STAGE} (kind, key, v1, v2, v3)
      SELECT 'cards:${prefix}', "id"::text, "align_variant"::text, "rounded"::text, "background_color"::text
      FROM "${blocks}";`)
    statements.push(`ALTER TABLE "${blocks}" ALTER COLUMN "columns" DROP DEFAULT;
      ALTER TABLE "${blocks}" ALTER COLUMN "columns" SET DATA TYPE numeric USING "columns"::text::numeric;`)
  }

  statements.push(
    `INSERT INTO ${STAGE} (kind, key, v1) SELECT 'header', "id"::text, "name" FROM "header";`,
    `INSERT INTO ${STAGE} (kind, key, v1) SELECT 'header_v', "id"::text, "version_name" FROM "_header_v";`,
    `INSERT INTO ${STAGE} (kind, key, v1) SELECT 'gsec', "id"::text, "title" FROM "gsec";`,
    `INSERT INTO ${STAGE} (kind, key, v1) SELECT 'gsec_v', "id"::text, "version_title" FROM "_gsec_v";`,
    `INSERT INTO ${STAGE} (kind, key, v1, v2) SELECT 'x', "id"::text, "seo_x_site", "seo_x_creator" FROM "site_settings";`,
    `INSERT INTO ${STAGE} (kind, key, v1, v2)
      SELECT 'x_v', "id"::text, "version_seo_x_site", "version_seo_x_creator" FROM "_site_settings_v";`,
    `INSERT INTO ${STAGE} (kind, key) SELECT 'media_default', "id"::text FROM "media" WHERE "is_default_image";`,
    `INSERT INTO ${STAGE} (kind, key, v1)
      SELECT DISTINCT ON ("_parent_id") 'presets_dp', "_parent_id", "label"
      FROM "presets_blocks_chart_ranges_data_points_locales"
      ORDER BY "_parent_id", ("_locale" = '${DEFAULT_LOCALE}') DESC, "_locale";`,
  )

  return statements.join('\n')
}

/** Copy a staged, formerly localized value back into every locale row. */
function restoreLocalized(kind: string, table: string, column: string): string {
  return `INSERT INTO "${table}" ("${column}", "_locale", "_parent_id")
    SELECT s.v1, l.code::"_locales", s.key::int FROM ${STAGE} s
    CROSS JOIN (VALUES ${LOCALES.map((locale) => `('${locale}')`).join(', ')}) AS l(code)
    WHERE s.kind = '${kind}';`
}

function applyDown(): string {
  const statements: string[] = []

  for (const prefix of BLOCK_PREFIXES) {
    // Every card gets the grid's style back.
    const assignments = CARD_STYLE_COLUMNS.map(
      (column, index) =>
        `"${column}" = coalesce(s.v${index + 1}, i."${column}"::text)::"enum_${prefix}_blocks_cards_grid_items_${column}"`,
    ).join(', ')
    statements.push(`UPDATE "${prefix}_blocks_cards_grid_items" i SET ${assignments}
      FROM ${STAGE} s WHERE s.kind = 'cards:${prefix}' AND s.key = i."_parent_id"::text;`)
  }

  statements.push(
    restoreLocalized('header', 'header_locales', 'name'),
    restoreLocalized('header_v', '_header_v_locales', 'version_name'),
    restoreLocalized('gsec', 'gsec_locales', 'title'),
    restoreLocalized('gsec_v', '_gsec_v_locales', 'version_title'),
    `UPDATE "site_settings_locales" t SET "seo_x_site" = s.v1, "seo_x_creator" = s.v2
      FROM ${STAGE} s WHERE s.kind = 'x' AND s.key = t."_parent_id"::text;`,
    `UPDATE "_site_settings_v_locales" t SET "version_seo_x_site" = s.v1, "version_seo_x_creator" = s.v2
      FROM ${STAGE} s WHERE s.kind = 'x_v' AND s.key = t."_parent_id"::text;`,
    `INSERT INTO "media_default_for" ("order", "parent_id", "value")
      SELECT 1, s.key::int, 'platform_default' FROM ${STAGE} s WHERE s.kind = 'media_default';`,
    `UPDATE "presets_blocks_chart_ranges_data_points" t SET "label" = coalesce(s.v1, '')
      FROM ${STAGE} s WHERE s.kind = 'presets_dp' AND s.key = t."id";`,
    `UPDATE "presets_blocks_chart_ranges_data_points" SET "label" = '' WHERE "label" IS NULL;`,
    `ALTER TABLE "presets_blocks_chart_ranges_data_points" ALTER COLUMN "label" SET NOT NULL;`,
    `DROP TABLE ${STAGE};`,
  )

  return statements.join('\n')
}

// ---------------------------------------------------------------------------------------------
// Rich text (Lexical JSON) inline blocks in posts. Blocks inside rich text have no tables of their
// own, so the JSON is rewritten instead of relying on tolerant readers: the admin validates select
// values on save, so a stale `language: "ts"` or a string `heading` would block editors from saving.

type JsonRecord = Record<string, unknown>

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const LANGUAGE_ALIASES: Record<string, string> = {
  bash: 'bash', console: 'bash', sh: 'bash', shell: 'bash', shellscript: 'bash', terminal: 'bash', zsh: 'bash',
  css: 'css',
  htm: 'html', html: 'html',
  javascript: 'javascript', js: 'javascript', cjs: 'javascript', mjs: 'javascript', node: 'javascript',
  json: 'json', jsonc: 'json',
  jsx: 'jsx', tsx: 'tsx',
  markdown: 'markdown', md: 'markdown',
  plain: 'plaintext', plaintext: 'plaintext', text: 'plaintext', txt: 'plaintext',
  py: 'python', python: 'python',
  mysql: 'sql', postgres: 'sql', postgresql: 'sql', psql: 'sql', sql: 'sql',
  ts: 'typescript', typescript: 'typescript',
  yaml: 'yaml', yml: 'yaml',
}

/** Free-text language -> the fixed list; unknown -> plain text; empty stays empty. */
function toCodeLanguage(value: unknown): unknown {
  if (typeof value !== 'string' || value.trim() === '') return value ?? null
  const key = value.trim().toLowerCase().replace(/[\s_-]+/g, '')
  return LANGUAGE_ALIASES[key] ?? 'plaintext'
}

const toColumnsOption = (value: unknown): string => {
  const columns = Math.round(Number(value))
  return Number.isFinite(columns) && value !== null && value !== '' ? String(Math.min(4, Math.max(1, columns))) : '3'
}

const CARD_STYLE_FIELDS = { alignVariant: 'center', backgroundColor: 'none', rounded: 'none' } as const

function upgradeBlockFields(fields: JsonRecord): void {
  switch (fields.blockType) {
    case 'codeInline':
      fields.language = toCodeLanguage(fields.language)
      break
    case 'ctaBannerInline':
      if (!isRecord(fields.heading)) {
        fields.heading = {
          description: fields.description ?? null,
          eyebrow: fields.eyebrow ?? null,
          title: fields.heading ?? null,
        }
        delete fields.description
        delete fields.eyebrow
      }
      break
    case 'cardsGridInline': {
      const items = Array.isArray(fields.items) ? fields.items.filter(isRecord) : []
      for (const [name, fallback] of Object.entries(CARD_STYLE_FIELDS)) {
        fields[name] ??= items[0]?.[name] ?? fallback
        for (const item of items) delete item[name]
      }
      fields.columns = toColumnsOption(fields.columns)
      for (const item of items) {
        const image = item.image
        if (isRecord(image) && typeof image.aspectRatio === 'string') {
          image.aspectRatio = ASPECT_RATIO_MAP[image.aspectRatio] ?? image.aspectRatio
        }
      }
      break
    }
    default:
      break
  }
}

function downgradeBlockFields(fields: JsonRecord): void {
  switch (fields.blockType) {
    case 'ctaBannerInline':
      if (isRecord(fields.heading)) {
        const { description, eyebrow, title } = fields.heading
        fields.description = description ?? null
        fields.eyebrow = eyebrow ?? null
        fields.heading = title ?? null
      }
      break
    case 'cardsGridInline': {
      const items = Array.isArray(fields.items) ? fields.items.filter(isRecord) : []
      for (const name of Object.keys(CARD_STYLE_FIELDS)) {
        for (const item of items) item[name] = fields[name] ?? null
        delete fields[name]
      }
      fields.columns = fields.columns == null ? 3 : Number(fields.columns)
      break
    }
    default:
      // codeInline: the fixed language ids are valid free text, nothing to undo.
      break
  }
}

/** Applies `transform` to the fields of every Lexical block node, in place. */
function walk(node: unknown, transform: (fields: JsonRecord) => void): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, transform)
    return
  }
  if (!isRecord(node)) return
  if (node.type === 'block' && isRecord(node.fields)) transform(node.fields)
  for (const value of Object.values(node)) {
    if (typeof value === 'object' && value !== null) walk(value, transform)
  }
}

const RICH_TEXT_COLUMNS = [
  { column: 'content', table: 'posts_locales' },
  { column: 'version_content', table: '_posts_v_locales' },
] as const

async function rewritePostsRichText(
  db: MigrateUpArgs['db'],
  transform: (fields: JsonRecord) => void,
): Promise<void> {
  for (const { column, table } of RICH_TEXT_COLUMNS) {
    const { rows } = await db.execute(
      sql.raw(`SELECT "id", "${column}" AS "value" FROM "${table}" WHERE "${column}"::text LIKE '%"blockType"%'`),
    )
    for (const row of rows as { id: number; value: unknown }[]) {
      const value = typeof row.value === 'string' ? JSON.parse(row.value) : row.value
      const before = JSON.stringify(value)
      walk(value, transform)
      const after = JSON.stringify(value)
      if (after !== before) {
        await db.execute(sql`UPDATE ${sql.identifier(table)} SET ${sql.identifier(column)} = ${after}::jsonb WHERE "id" = ${row.id}`)
      }
    }
  }
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql.raw(stageUp()))
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_cards_grid_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "public"."enum_page_blocks_cards_grid_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_page_blocks_cards_grid_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum_page_blocks_cards_grid_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  CREATE TABLE "presets_blocks_chart_ranges_data_points_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "media_default_for" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "header_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_header_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "media_default_for" CASCADE;
  DROP TABLE "header_locales" CASCADE;
  DROP TABLE "_header_v_locales" CASCADE;
  DROP TABLE "gsec_locales" CASCADE;
  DROP TABLE "_gsec_v_locales" CASCADE;
  ALTER TABLE "page_blocks_hero" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE text;
  ALTER TABLE "page_blocks_hero" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::text;
  DROP TYPE "public"."enum_page_blocks_hero_image_aspect_ratio";
  CREATE TYPE "public"."enum_page_blocks_hero_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', 'auto');
  ALTER TABLE "page_blocks_hero" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::"public"."enum_page_blocks_hero_image_aspect_ratio";
  ALTER TABLE "page_blocks_hero" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE "public"."enum_page_blocks_hero_image_aspect_ratio" USING "image_aspect_ratio"::"public"."enum_page_blocks_hero_image_aspect_ratio";
  ALTER TABLE "page_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE text;
  ALTER TABLE "page_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::text;
  DROP TYPE "public"."enum_page_blocks_cards_grid_items_image_aspect_ratio";
  CREATE TYPE "public"."enum_page_blocks_cards_grid_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', 'auto');
  ALTER TABLE "page_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::"public"."enum_page_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "page_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE "public"."enum_page_blocks_cards_grid_items_image_aspect_ratio" USING "image_aspect_ratio"::"public"."enum_page_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "page_blocks_carousel" ALTER COLUMN "effect" SET DATA TYPE text;
  ALTER TABLE "page_blocks_carousel" ALTER COLUMN "effect" SET DEFAULT 'slide'::text;
  DROP TYPE "public"."enum_page_blocks_carousel_effect";
  CREATE TYPE "public"."enum_page_blocks_carousel_effect" AS ENUM('slide', 'fade');
  ALTER TABLE "page_blocks_carousel" ALTER COLUMN "effect" SET DEFAULT 'slide'::"public"."enum_page_blocks_carousel_effect";
  ALTER TABLE "page_blocks_carousel" ALTER COLUMN "effect" SET DATA TYPE "public"."enum_page_blocks_carousel_effect" USING "effect"::"public"."enum_page_blocks_carousel_effect";
  ALTER TABLE "_page_v_blocks_hero" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_hero" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::text;
  DROP TYPE "public"."enum__page_v_blocks_hero_image_aspect_ratio";
  CREATE TYPE "public"."enum__page_v_blocks_hero_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', 'auto');
  ALTER TABLE "_page_v_blocks_hero" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::"public"."enum__page_v_blocks_hero_image_aspect_ratio";
  ALTER TABLE "_page_v_blocks_hero" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE "public"."enum__page_v_blocks_hero_image_aspect_ratio" USING "image_aspect_ratio"::"public"."enum__page_v_blocks_hero_image_aspect_ratio";
  ALTER TABLE "_page_v_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::text;
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_items_image_aspect_ratio";
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', 'auto');
  ALTER TABLE "_page_v_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::"public"."enum__page_v_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "_page_v_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE "public"."enum__page_v_blocks_cards_grid_items_image_aspect_ratio" USING "image_aspect_ratio"::"public"."enum__page_v_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "_page_v_blocks_carousel" ALTER COLUMN "effect" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_carousel" ALTER COLUMN "effect" SET DEFAULT 'slide'::text;
  DROP TYPE "public"."enum__page_v_blocks_carousel_effect";
  CREATE TYPE "public"."enum__page_v_blocks_carousel_effect" AS ENUM('slide', 'fade');
  ALTER TABLE "_page_v_blocks_carousel" ALTER COLUMN "effect" SET DEFAULT 'slide'::"public"."enum__page_v_blocks_carousel_effect";
  ALTER TABLE "_page_v_blocks_carousel" ALTER COLUMN "effect" SET DATA TYPE "public"."enum__page_v_blocks_carousel_effect" USING "effect"::"public"."enum__page_v_blocks_carousel_effect";
  ALTER TABLE "posts_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE text;
  ALTER TABLE "posts_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::text;
  DROP TYPE "public"."enum_posts_blocks_cards_grid_items_image_aspect_ratio";
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', 'auto');
  ALTER TABLE "posts_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::"public"."enum_posts_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "posts_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE "public"."enum_posts_blocks_cards_grid_items_image_aspect_ratio" USING "image_aspect_ratio"::"public"."enum_posts_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "posts_blocks_carousel" ALTER COLUMN "effect" SET DATA TYPE text;
  ALTER TABLE "posts_blocks_carousel" ALTER COLUMN "effect" SET DEFAULT 'slide'::text;
  DROP TYPE "public"."enum_posts_blocks_carousel_effect";
  CREATE TYPE "public"."enum_posts_blocks_carousel_effect" AS ENUM('slide', 'fade');
  ALTER TABLE "posts_blocks_carousel" ALTER COLUMN "effect" SET DEFAULT 'slide'::"public"."enum_posts_blocks_carousel_effect";
  ALTER TABLE "posts_blocks_carousel" ALTER COLUMN "effect" SET DATA TYPE "public"."enum_posts_blocks_carousel_effect" USING "effect"::"public"."enum_posts_blocks_carousel_effect";
  ALTER TABLE "_posts_v_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE text;
  ALTER TABLE "_posts_v_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::text;
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_items_image_aspect_ratio";
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', 'auto');
  ALTER TABLE "_posts_v_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::"public"."enum__posts_v_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "_posts_v_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE "public"."enum__posts_v_blocks_cards_grid_items_image_aspect_ratio" USING "image_aspect_ratio"::"public"."enum__posts_v_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "_posts_v_blocks_carousel" ALTER COLUMN "effect" SET DATA TYPE text;
  ALTER TABLE "_posts_v_blocks_carousel" ALTER COLUMN "effect" SET DEFAULT 'slide'::text;
  DROP TYPE "public"."enum__posts_v_blocks_carousel_effect";
  CREATE TYPE "public"."enum__posts_v_blocks_carousel_effect" AS ENUM('slide', 'fade');
  ALTER TABLE "_posts_v_blocks_carousel" ALTER COLUMN "effect" SET DEFAULT 'slide'::"public"."enum__posts_v_blocks_carousel_effect";
  ALTER TABLE "_posts_v_blocks_carousel" ALTER COLUMN "effect" SET DATA TYPE "public"."enum__posts_v_blocks_carousel_effect" USING "effect"::"public"."enum__posts_v_blocks_carousel_effect";
  ALTER TABLE "gsec_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::text;
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_items_image_aspect_ratio";
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', 'auto');
  ALTER TABLE "gsec_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::"public"."enum_gsec_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "gsec_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE "public"."enum_gsec_blocks_cards_grid_items_image_aspect_ratio" USING "image_aspect_ratio"::"public"."enum_gsec_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "gsec_blocks_carousel" ALTER COLUMN "effect" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_carousel" ALTER COLUMN "effect" SET DEFAULT 'slide'::text;
  DROP TYPE "public"."enum_gsec_blocks_carousel_effect";
  CREATE TYPE "public"."enum_gsec_blocks_carousel_effect" AS ENUM('slide', 'fade');
  ALTER TABLE "gsec_blocks_carousel" ALTER COLUMN "effect" SET DEFAULT 'slide'::"public"."enum_gsec_blocks_carousel_effect";
  ALTER TABLE "gsec_blocks_carousel" ALTER COLUMN "effect" SET DATA TYPE "public"."enum_gsec_blocks_carousel_effect" USING "effect"::"public"."enum_gsec_blocks_carousel_effect";
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::text;
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_items_image_aspect_ratio";
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', 'auto');
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::"public"."enum__gsec_v_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE "public"."enum__gsec_v_blocks_cards_grid_items_image_aspect_ratio" USING "image_aspect_ratio"::"public"."enum__gsec_v_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "_gsec_v_blocks_carousel" ALTER COLUMN "effect" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_carousel" ALTER COLUMN "effect" SET DEFAULT 'slide'::text;
  DROP TYPE "public"."enum__gsec_v_blocks_carousel_effect";
  CREATE TYPE "public"."enum__gsec_v_blocks_carousel_effect" AS ENUM('slide', 'fade');
  ALTER TABLE "_gsec_v_blocks_carousel" ALTER COLUMN "effect" SET DEFAULT 'slide'::"public"."enum__gsec_v_blocks_carousel_effect";
  ALTER TABLE "_gsec_v_blocks_carousel" ALTER COLUMN "effect" SET DATA TYPE "public"."enum__gsec_v_blocks_carousel_effect" USING "effect"::"public"."enum__gsec_v_blocks_carousel_effect";
  ALTER TABLE "presets_blocks_hero" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_hero" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::text;
  DROP TYPE "public"."enum_presets_blocks_hero_image_aspect_ratio";
  CREATE TYPE "public"."enum_presets_blocks_hero_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', 'auto');
  ALTER TABLE "presets_blocks_hero" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::"public"."enum_presets_blocks_hero_image_aspect_ratio";
  ALTER TABLE "presets_blocks_hero" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE "public"."enum_presets_blocks_hero_image_aspect_ratio" USING "image_aspect_ratio"::"public"."enum_presets_blocks_hero_image_aspect_ratio";
  ALTER TABLE "presets_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::text;
  DROP TYPE "public"."enum_presets_blocks_cards_grid_items_image_aspect_ratio";
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', 'auto');
  ALTER TABLE "presets_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::"public"."enum_presets_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "presets_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE "public"."enum_presets_blocks_cards_grid_items_image_aspect_ratio" USING "image_aspect_ratio"::"public"."enum_presets_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "presets_blocks_carousel" ALTER COLUMN "effect" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_carousel" ALTER COLUMN "effect" SET DEFAULT 'slide'::text;
  DROP TYPE "public"."enum_presets_blocks_carousel_effect";
  CREATE TYPE "public"."enum_presets_blocks_carousel_effect" AS ENUM('slide', 'fade');
  ALTER TABLE "presets_blocks_carousel" ALTER COLUMN "effect" SET DEFAULT 'slide'::"public"."enum_presets_blocks_carousel_effect";
  ALTER TABLE "presets_blocks_carousel" ALTER COLUMN "effect" SET DATA TYPE "public"."enum_presets_blocks_carousel_effect" USING "effect"::"public"."enum_presets_blocks_carousel_effect";
  ALTER TABLE "page_blocks_cards_grid" ALTER COLUMN "columns" SET DEFAULT '3'::"public"."enum_page_blocks_cards_grid_columns";
  ALTER TABLE "page_blocks_cards_grid" ALTER COLUMN "columns" SET DATA TYPE "public"."enum_page_blocks_cards_grid_columns" USING "columns"::"public"."enum_page_blocks_cards_grid_columns";
  ALTER TABLE "_page_v_blocks_cards_grid" ALTER COLUMN "columns" SET DEFAULT '3'::"public"."enum__page_v_blocks_cards_grid_columns";
  ALTER TABLE "_page_v_blocks_cards_grid" ALTER COLUMN "columns" SET DATA TYPE "public"."enum__page_v_blocks_cards_grid_columns" USING "columns"::"public"."enum__page_v_blocks_cards_grid_columns";
  ALTER TABLE "posts_blocks_cards_grid" ALTER COLUMN "columns" SET DEFAULT '3'::"public"."enum_posts_blocks_cards_grid_columns";
  ALTER TABLE "posts_blocks_cards_grid" ALTER COLUMN "columns" SET DATA TYPE "public"."enum_posts_blocks_cards_grid_columns" USING "columns"::"public"."enum_posts_blocks_cards_grid_columns";
  ALTER TABLE "_posts_v_blocks_cards_grid" ALTER COLUMN "columns" SET DEFAULT '3'::"public"."enum__posts_v_blocks_cards_grid_columns";
  ALTER TABLE "_posts_v_blocks_cards_grid" ALTER COLUMN "columns" SET DATA TYPE "public"."enum__posts_v_blocks_cards_grid_columns" USING "columns"::"public"."enum__posts_v_blocks_cards_grid_columns";
  ALTER TABLE "footer" ALTER COLUMN "name" SET DEFAULT 'Footer';
  ALTER TABLE "_footer_v" ALTER COLUMN "version_name" SET DEFAULT 'Footer';
  ALTER TABLE "gsec_blocks_cards_grid" ALTER COLUMN "columns" SET DEFAULT '3'::"public"."enum_gsec_blocks_cards_grid_columns";
  ALTER TABLE "gsec_blocks_cards_grid" ALTER COLUMN "columns" SET DATA TYPE "public"."enum_gsec_blocks_cards_grid_columns" USING "columns"::"public"."enum_gsec_blocks_cards_grid_columns";
  ALTER TABLE "_gsec_v_blocks_cards_grid" ALTER COLUMN "columns" SET DEFAULT '3'::"public"."enum__gsec_v_blocks_cards_grid_columns";
  ALTER TABLE "_gsec_v_blocks_cards_grid" ALTER COLUMN "columns" SET DATA TYPE "public"."enum__gsec_v_blocks_cards_grid_columns" USING "columns"::"public"."enum__gsec_v_blocks_cards_grid_columns";
  ALTER TABLE "presets_blocks_cards_grid" ALTER COLUMN "columns" SET DEFAULT '3'::"public"."enum_presets_blocks_cards_grid_columns";
  ALTER TABLE "presets_blocks_cards_grid" ALTER COLUMN "columns" SET DATA TYPE "public"."enum_presets_blocks_cards_grid_columns" USING "columns"::"public"."enum_presets_blocks_cards_grid_columns";
  ALTER TABLE "media" ADD COLUMN "is_default_image" boolean DEFAULT false;
  ALTER TABLE "page_blocks_cards_grid" ADD COLUMN "align_variant" "enum_page_blocks_cards_grid_align_variant" DEFAULT 'center';
  ALTER TABLE "page_blocks_cards_grid" ADD COLUMN "rounded" "enum_page_blocks_cards_grid_rounded" DEFAULT 'none';
  ALTER TABLE "page_blocks_cards_grid" ADD COLUMN "background_color" "enum_page_blocks_cards_grid_background_color" DEFAULT 'none';
  ALTER TABLE "_page_v_blocks_cards_grid" ADD COLUMN "align_variant" "enum__page_v_blocks_cards_grid_align_variant" DEFAULT 'center';
  ALTER TABLE "_page_v_blocks_cards_grid" ADD COLUMN "rounded" "enum__page_v_blocks_cards_grid_rounded" DEFAULT 'none';
  ALTER TABLE "_page_v_blocks_cards_grid" ADD COLUMN "background_color" "enum__page_v_blocks_cards_grid_background_color" DEFAULT 'none';
  ALTER TABLE "posts_blocks_cards_grid" ADD COLUMN "align_variant" "enum_posts_blocks_cards_grid_align_variant" DEFAULT 'center';
  ALTER TABLE "posts_blocks_cards_grid" ADD COLUMN "rounded" "enum_posts_blocks_cards_grid_rounded" DEFAULT 'none';
  ALTER TABLE "posts_blocks_cards_grid" ADD COLUMN "background_color" "enum_posts_blocks_cards_grid_background_color" DEFAULT 'none';
  ALTER TABLE "_posts_v_blocks_cards_grid" ADD COLUMN "align_variant" "enum__posts_v_blocks_cards_grid_align_variant" DEFAULT 'center';
  ALTER TABLE "_posts_v_blocks_cards_grid" ADD COLUMN "rounded" "enum__posts_v_blocks_cards_grid_rounded" DEFAULT 'none';
  ALTER TABLE "_posts_v_blocks_cards_grid" ADD COLUMN "background_color" "enum__posts_v_blocks_cards_grid_background_color" DEFAULT 'none';
  ALTER TABLE "header" ADD COLUMN "name" varchar DEFAULT 'Header';
  ALTER TABLE "_header_v" ADD COLUMN "version_name" varchar DEFAULT 'Header';
  ALTER TABLE "gsec_blocks_cards_grid" ADD COLUMN "align_variant" "enum_gsec_blocks_cards_grid_align_variant" DEFAULT 'center';
  ALTER TABLE "gsec_blocks_cards_grid" ADD COLUMN "rounded" "enum_gsec_blocks_cards_grid_rounded" DEFAULT 'none';
  ALTER TABLE "gsec_blocks_cards_grid" ADD COLUMN "background_color" "enum_gsec_blocks_cards_grid_background_color" DEFAULT 'none';
  ALTER TABLE "gsec" ADD COLUMN "title" varchar DEFAULT 'Reusable section';
  ALTER TABLE "_gsec_v_blocks_cards_grid" ADD COLUMN "align_variant" "enum__gsec_v_blocks_cards_grid_align_variant" DEFAULT 'center';
  ALTER TABLE "_gsec_v_blocks_cards_grid" ADD COLUMN "rounded" "enum__gsec_v_blocks_cards_grid_rounded" DEFAULT 'none';
  ALTER TABLE "_gsec_v_blocks_cards_grid" ADD COLUMN "background_color" "enum__gsec_v_blocks_cards_grid_background_color" DEFAULT 'none';
  ALTER TABLE "_gsec_v" ADD COLUMN "version_title" varchar DEFAULT 'Reusable section';
  ALTER TABLE "presets_blocks_cards_grid" ADD COLUMN "align_variant" "enum_presets_blocks_cards_grid_align_variant" DEFAULT 'center';
  ALTER TABLE "presets_blocks_cards_grid" ADD COLUMN "rounded" "enum_presets_blocks_cards_grid_rounded" DEFAULT 'none';
  ALTER TABLE "presets_blocks_cards_grid" ADD COLUMN "background_color" "enum_presets_blocks_cards_grid_background_color" DEFAULT 'none';
  ALTER TABLE "site_settings" ADD COLUMN "seo_x_site" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "seo_x_creator" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_seo_x_site" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_seo_x_creator" varchar;
  ALTER TABLE "presets_blocks_chart_ranges_data_points_locales" ADD CONSTRAINT "presets_blocks_chart_ranges_data_points_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_chart_ranges_data_points"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "presets_blocks_chart_ranges_data_points_locales_locale_paren" ON "presets_blocks_chart_ranges_data_points_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "page_blocks_cards_grid_items" DROP COLUMN "align_variant";
  ALTER TABLE "page_blocks_cards_grid_items" DROP COLUMN "rounded";
  ALTER TABLE "page_blocks_cards_grid_items" DROP COLUMN "background_color";
  ALTER TABLE "_page_v_blocks_cards_grid_items" DROP COLUMN "align_variant";
  ALTER TABLE "_page_v_blocks_cards_grid_items" DROP COLUMN "rounded";
  ALTER TABLE "_page_v_blocks_cards_grid_items" DROP COLUMN "background_color";
  ALTER TABLE "posts_blocks_cards_grid_items" DROP COLUMN "align_variant";
  ALTER TABLE "posts_blocks_cards_grid_items" DROP COLUMN "rounded";
  ALTER TABLE "posts_blocks_cards_grid_items" DROP COLUMN "background_color";
  ALTER TABLE "_posts_v_blocks_cards_grid_items" DROP COLUMN "align_variant";
  ALTER TABLE "_posts_v_blocks_cards_grid_items" DROP COLUMN "rounded";
  ALTER TABLE "_posts_v_blocks_cards_grid_items" DROP COLUMN "background_color";
  ALTER TABLE "gsec_blocks_cards_grid_items" DROP COLUMN "align_variant";
  ALTER TABLE "gsec_blocks_cards_grid_items" DROP COLUMN "rounded";
  ALTER TABLE "gsec_blocks_cards_grid_items" DROP COLUMN "background_color";
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" DROP COLUMN "align_variant";
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" DROP COLUMN "rounded";
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" DROP COLUMN "background_color";
  ALTER TABLE "presets_blocks_cards_grid_items" DROP COLUMN "align_variant";
  ALTER TABLE "presets_blocks_cards_grid_items" DROP COLUMN "rounded";
  ALTER TABLE "presets_blocks_cards_grid_items" DROP COLUMN "background_color";
  ALTER TABLE "presets_blocks_chart_ranges_data_points" DROP COLUMN "label";
  ALTER TABLE "site_settings_locales" DROP COLUMN "seo_og_site_name";
  ALTER TABLE "site_settings_locales" DROP COLUMN "seo_x_site";
  ALTER TABLE "site_settings_locales" DROP COLUMN "seo_x_creator";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_seo_og_site_name";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_seo_x_site";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_seo_x_creator";
  DROP TYPE "public"."enum_media_default_for";
  DROP TYPE "public"."enum_page_blocks_cards_grid_items_align_variant";
  DROP TYPE "public"."enum_page_blocks_cards_grid_items_rounded";
  DROP TYPE "public"."enum_page_blocks_cards_grid_items_background_color";
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_items_align_variant";
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_items_rounded";
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_items_background_color";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_items_align_variant";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_items_rounded";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_items_background_color";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_items_align_variant";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_items_rounded";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_items_background_color";
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_items_align_variant";
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_items_rounded";
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_items_background_color";
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_items_align_variant";
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_items_rounded";
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_items_background_color";
  DROP TYPE "public"."enum_presets_blocks_cards_grid_items_align_variant";
  DROP TYPE "public"."enum_presets_blocks_cards_grid_items_rounded";
  DROP TYPE "public"."enum_presets_blocks_cards_grid_items_background_color";`)
  await db.execute(sql.raw(applyUp()))
  await rewritePostsRichText(db, upgradeBlockFields)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await rewritePostsRichText(db, downgradeBlockFields)
  await db.execute(sql.raw(stageDown()))
  // Generated; hand-edited: presets data point `label` is added nullable, then filled and set NOT NULL.
  await db.execute(sql`
   CREATE TYPE "public"."enum_media_default_for" AS ENUM('platform_default');
  CREATE TYPE "public"."enum_page_blocks_cards_grid_items_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_page_blocks_cards_grid_items_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum_page_blocks_cards_grid_items_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_items_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_items_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_items_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_items_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_items_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_items_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_items_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_items_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_items_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_items_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_items_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_items_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_items_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_items_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_items_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_items_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_items_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_items_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  ALTER TYPE "public"."enum_page_blocks_hero_image_aspect_ratio" ADD VALUE '9/16' BEFORE 'auto';
  ALTER TYPE "public"."enum_page_blocks_hero_image_aspect_ratio" ADD VALUE '1/2' BEFORE 'auto';
  ALTER TYPE "public"."enum_page_blocks_hero_image_aspect_ratio" ADD VALUE '4/1' BEFORE 'auto';
  ALTER TYPE "public"."enum_page_blocks_hero_image_aspect_ratio" ADD VALUE '3/1' BEFORE 'auto';
  ALTER TYPE "public"."enum_page_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '9/16' BEFORE 'auto';
  ALTER TYPE "public"."enum_page_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '1/2' BEFORE 'auto';
  ALTER TYPE "public"."enum_page_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '4/1' BEFORE 'auto';
  ALTER TYPE "public"."enum_page_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '3/1' BEFORE 'auto';
  ALTER TYPE "public"."enum_page_blocks_carousel_effect" ADD VALUE 'cube';
  ALTER TYPE "public"."enum_page_blocks_carousel_effect" ADD VALUE 'flip';
  ALTER TYPE "public"."enum_page_blocks_carousel_effect" ADD VALUE 'coverflow';
  ALTER TYPE "public"."enum_page_blocks_carousel_effect" ADD VALUE 'cards';
  ALTER TYPE "public"."enum__page_v_blocks_hero_image_aspect_ratio" ADD VALUE '9/16' BEFORE 'auto';
  ALTER TYPE "public"."enum__page_v_blocks_hero_image_aspect_ratio" ADD VALUE '1/2' BEFORE 'auto';
  ALTER TYPE "public"."enum__page_v_blocks_hero_image_aspect_ratio" ADD VALUE '4/1' BEFORE 'auto';
  ALTER TYPE "public"."enum__page_v_blocks_hero_image_aspect_ratio" ADD VALUE '3/1' BEFORE 'auto';
  ALTER TYPE "public"."enum__page_v_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '9/16' BEFORE 'auto';
  ALTER TYPE "public"."enum__page_v_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '1/2' BEFORE 'auto';
  ALTER TYPE "public"."enum__page_v_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '4/1' BEFORE 'auto';
  ALTER TYPE "public"."enum__page_v_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '3/1' BEFORE 'auto';
  ALTER TYPE "public"."enum__page_v_blocks_carousel_effect" ADD VALUE 'cube';
  ALTER TYPE "public"."enum__page_v_blocks_carousel_effect" ADD VALUE 'flip';
  ALTER TYPE "public"."enum__page_v_blocks_carousel_effect" ADD VALUE 'coverflow';
  ALTER TYPE "public"."enum__page_v_blocks_carousel_effect" ADD VALUE 'cards';
  ALTER TYPE "public"."enum_posts_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '9/16' BEFORE 'auto';
  ALTER TYPE "public"."enum_posts_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '1/2' BEFORE 'auto';
  ALTER TYPE "public"."enum_posts_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '4/1' BEFORE 'auto';
  ALTER TYPE "public"."enum_posts_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '3/1' BEFORE 'auto';
  ALTER TYPE "public"."enum_posts_blocks_carousel_effect" ADD VALUE 'cube';
  ALTER TYPE "public"."enum_posts_blocks_carousel_effect" ADD VALUE 'flip';
  ALTER TYPE "public"."enum_posts_blocks_carousel_effect" ADD VALUE 'coverflow';
  ALTER TYPE "public"."enum_posts_blocks_carousel_effect" ADD VALUE 'cards';
  ALTER TYPE "public"."enum__posts_v_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '9/16' BEFORE 'auto';
  ALTER TYPE "public"."enum__posts_v_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '1/2' BEFORE 'auto';
  ALTER TYPE "public"."enum__posts_v_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '4/1' BEFORE 'auto';
  ALTER TYPE "public"."enum__posts_v_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '3/1' BEFORE 'auto';
  ALTER TYPE "public"."enum__posts_v_blocks_carousel_effect" ADD VALUE 'cube';
  ALTER TYPE "public"."enum__posts_v_blocks_carousel_effect" ADD VALUE 'flip';
  ALTER TYPE "public"."enum__posts_v_blocks_carousel_effect" ADD VALUE 'coverflow';
  ALTER TYPE "public"."enum__posts_v_blocks_carousel_effect" ADD VALUE 'cards';
  ALTER TYPE "public"."enum_gsec_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '9/16' BEFORE 'auto';
  ALTER TYPE "public"."enum_gsec_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '1/2' BEFORE 'auto';
  ALTER TYPE "public"."enum_gsec_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '4/1' BEFORE 'auto';
  ALTER TYPE "public"."enum_gsec_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '3/1' BEFORE 'auto';
  ALTER TYPE "public"."enum_gsec_blocks_carousel_effect" ADD VALUE 'cube';
  ALTER TYPE "public"."enum_gsec_blocks_carousel_effect" ADD VALUE 'flip';
  ALTER TYPE "public"."enum_gsec_blocks_carousel_effect" ADD VALUE 'coverflow';
  ALTER TYPE "public"."enum_gsec_blocks_carousel_effect" ADD VALUE 'cards';
  ALTER TYPE "public"."enum__gsec_v_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '9/16' BEFORE 'auto';
  ALTER TYPE "public"."enum__gsec_v_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '1/2' BEFORE 'auto';
  ALTER TYPE "public"."enum__gsec_v_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '4/1' BEFORE 'auto';
  ALTER TYPE "public"."enum__gsec_v_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '3/1' BEFORE 'auto';
  ALTER TYPE "public"."enum__gsec_v_blocks_carousel_effect" ADD VALUE 'cube';
  ALTER TYPE "public"."enum__gsec_v_blocks_carousel_effect" ADD VALUE 'flip';
  ALTER TYPE "public"."enum__gsec_v_blocks_carousel_effect" ADD VALUE 'coverflow';
  ALTER TYPE "public"."enum__gsec_v_blocks_carousel_effect" ADD VALUE 'cards';
  ALTER TYPE "public"."enum_presets_blocks_hero_image_aspect_ratio" ADD VALUE '9/16' BEFORE 'auto';
  ALTER TYPE "public"."enum_presets_blocks_hero_image_aspect_ratio" ADD VALUE '1/2' BEFORE 'auto';
  ALTER TYPE "public"."enum_presets_blocks_hero_image_aspect_ratio" ADD VALUE '4/1' BEFORE 'auto';
  ALTER TYPE "public"."enum_presets_blocks_hero_image_aspect_ratio" ADD VALUE '3/1' BEFORE 'auto';
  ALTER TYPE "public"."enum_presets_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '9/16' BEFORE 'auto';
  ALTER TYPE "public"."enum_presets_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '1/2' BEFORE 'auto';
  ALTER TYPE "public"."enum_presets_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '4/1' BEFORE 'auto';
  ALTER TYPE "public"."enum_presets_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '3/1' BEFORE 'auto';
  ALTER TYPE "public"."enum_presets_blocks_carousel_effect" ADD VALUE 'cube';
  ALTER TYPE "public"."enum_presets_blocks_carousel_effect" ADD VALUE 'flip';
  ALTER TYPE "public"."enum_presets_blocks_carousel_effect" ADD VALUE 'coverflow';
  ALTER TYPE "public"."enum_presets_blocks_carousel_effect" ADD VALUE 'cards';
  CREATE TABLE "media_default_for" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_media_default_for",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "header_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_header_v_locales" (
  	"version_name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "gsec_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_gsec_v_locales" (
  	"version_title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "presets_blocks_chart_ranges_data_points_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "presets_blocks_chart_ranges_data_points_locales" CASCADE;
  ALTER TABLE "page_blocks_cards_grid" ALTER COLUMN "columns" SET DATA TYPE numeric;
  ALTER TABLE "page_blocks_cards_grid" ALTER COLUMN "columns" SET DEFAULT 3;
  ALTER TABLE "_page_v_blocks_cards_grid" ALTER COLUMN "columns" SET DATA TYPE numeric;
  ALTER TABLE "_page_v_blocks_cards_grid" ALTER COLUMN "columns" SET DEFAULT 3;
  ALTER TABLE "posts_blocks_cards_grid" ALTER COLUMN "columns" SET DATA TYPE numeric;
  ALTER TABLE "posts_blocks_cards_grid" ALTER COLUMN "columns" SET DEFAULT 3;
  ALTER TABLE "_posts_v_blocks_cards_grid" ALTER COLUMN "columns" SET DATA TYPE numeric;
  ALTER TABLE "_posts_v_blocks_cards_grid" ALTER COLUMN "columns" SET DEFAULT 3;
  ALTER TABLE "footer" ALTER COLUMN "name" DROP DEFAULT;
  ALTER TABLE "_footer_v" ALTER COLUMN "version_name" DROP DEFAULT;
  ALTER TABLE "gsec_blocks_cards_grid" ALTER COLUMN "columns" SET DATA TYPE numeric;
  ALTER TABLE "gsec_blocks_cards_grid" ALTER COLUMN "columns" SET DEFAULT 3;
  ALTER TABLE "_gsec_v_blocks_cards_grid" ALTER COLUMN "columns" SET DATA TYPE numeric;
  ALTER TABLE "_gsec_v_blocks_cards_grid" ALTER COLUMN "columns" SET DEFAULT 3;
  ALTER TABLE "presets_blocks_cards_grid" ALTER COLUMN "columns" SET DATA TYPE numeric;
  ALTER TABLE "presets_blocks_cards_grid" ALTER COLUMN "columns" SET DEFAULT 3;
  ALTER TABLE "page_blocks_cards_grid_items" ADD COLUMN "align_variant" "enum_page_blocks_cards_grid_items_align_variant" DEFAULT 'center';
  ALTER TABLE "page_blocks_cards_grid_items" ADD COLUMN "rounded" "enum_page_blocks_cards_grid_items_rounded" DEFAULT 'none';
  ALTER TABLE "page_blocks_cards_grid_items" ADD COLUMN "background_color" "enum_page_blocks_cards_grid_items_background_color" DEFAULT 'none';
  ALTER TABLE "_page_v_blocks_cards_grid_items" ADD COLUMN "align_variant" "enum__page_v_blocks_cards_grid_items_align_variant" DEFAULT 'center';
  ALTER TABLE "_page_v_blocks_cards_grid_items" ADD COLUMN "rounded" "enum__page_v_blocks_cards_grid_items_rounded" DEFAULT 'none';
  ALTER TABLE "_page_v_blocks_cards_grid_items" ADD COLUMN "background_color" "enum__page_v_blocks_cards_grid_items_background_color" DEFAULT 'none';
  ALTER TABLE "posts_blocks_cards_grid_items" ADD COLUMN "align_variant" "enum_posts_blocks_cards_grid_items_align_variant" DEFAULT 'center';
  ALTER TABLE "posts_blocks_cards_grid_items" ADD COLUMN "rounded" "enum_posts_blocks_cards_grid_items_rounded" DEFAULT 'none';
  ALTER TABLE "posts_blocks_cards_grid_items" ADD COLUMN "background_color" "enum_posts_blocks_cards_grid_items_background_color" DEFAULT 'none';
  ALTER TABLE "_posts_v_blocks_cards_grid_items" ADD COLUMN "align_variant" "enum__posts_v_blocks_cards_grid_items_align_variant" DEFAULT 'center';
  ALTER TABLE "_posts_v_blocks_cards_grid_items" ADD COLUMN "rounded" "enum__posts_v_blocks_cards_grid_items_rounded" DEFAULT 'none';
  ALTER TABLE "_posts_v_blocks_cards_grid_items" ADD COLUMN "background_color" "enum__posts_v_blocks_cards_grid_items_background_color" DEFAULT 'none';
  ALTER TABLE "gsec_blocks_cards_grid_items" ADD COLUMN "align_variant" "enum_gsec_blocks_cards_grid_items_align_variant" DEFAULT 'center';
  ALTER TABLE "gsec_blocks_cards_grid_items" ADD COLUMN "rounded" "enum_gsec_blocks_cards_grid_items_rounded" DEFAULT 'none';
  ALTER TABLE "gsec_blocks_cards_grid_items" ADD COLUMN "background_color" "enum_gsec_blocks_cards_grid_items_background_color" DEFAULT 'none';
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" ADD COLUMN "align_variant" "enum__gsec_v_blocks_cards_grid_items_align_variant" DEFAULT 'center';
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" ADD COLUMN "rounded" "enum__gsec_v_blocks_cards_grid_items_rounded" DEFAULT 'none';
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" ADD COLUMN "background_color" "enum__gsec_v_blocks_cards_grid_items_background_color" DEFAULT 'none';
  ALTER TABLE "presets_blocks_cards_grid_items" ADD COLUMN "align_variant" "enum_presets_blocks_cards_grid_items_align_variant" DEFAULT 'center';
  ALTER TABLE "presets_blocks_cards_grid_items" ADD COLUMN "rounded" "enum_presets_blocks_cards_grid_items_rounded" DEFAULT 'none';
  ALTER TABLE "presets_blocks_cards_grid_items" ADD COLUMN "background_color" "enum_presets_blocks_cards_grid_items_background_color" DEFAULT 'none';
  ALTER TABLE "presets_blocks_chart_ranges_data_points" ADD COLUMN "label" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "seo_og_site_name" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "seo_x_site" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "seo_x_creator" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_seo_og_site_name" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_seo_x_site" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_seo_x_creator" varchar;
  ALTER TABLE "media_default_for" ADD CONSTRAINT "media_default_for_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_locales" ADD CONSTRAINT "header_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_header_v_locales" ADD CONSTRAINT "_header_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_header_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_locales" ADD CONSTRAINT "gsec_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_locales" ADD CONSTRAINT "_gsec_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "media_default_for_order_idx" ON "media_default_for" USING btree ("order");
  CREATE INDEX "media_default_for_parent_idx" ON "media_default_for" USING btree ("parent_id");
  CREATE UNIQUE INDEX "header_locales_locale_parent_id_unique" ON "header_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_header_v_locales_locale_parent_id_unique" ON "_header_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "gsec_locales_locale_parent_id_unique" ON "gsec_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_gsec_v_locales_locale_parent_id_unique" ON "_gsec_v_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "media" DROP COLUMN "is_default_image";
  ALTER TABLE "page_blocks_cards_grid" DROP COLUMN "align_variant";
  ALTER TABLE "page_blocks_cards_grid" DROP COLUMN "rounded";
  ALTER TABLE "page_blocks_cards_grid" DROP COLUMN "background_color";
  ALTER TABLE "_page_v_blocks_cards_grid" DROP COLUMN "align_variant";
  ALTER TABLE "_page_v_blocks_cards_grid" DROP COLUMN "rounded";
  ALTER TABLE "_page_v_blocks_cards_grid" DROP COLUMN "background_color";
  ALTER TABLE "posts_blocks_cards_grid" DROP COLUMN "align_variant";
  ALTER TABLE "posts_blocks_cards_grid" DROP COLUMN "rounded";
  ALTER TABLE "posts_blocks_cards_grid" DROP COLUMN "background_color";
  ALTER TABLE "_posts_v_blocks_cards_grid" DROP COLUMN "align_variant";
  ALTER TABLE "_posts_v_blocks_cards_grid" DROP COLUMN "rounded";
  ALTER TABLE "_posts_v_blocks_cards_grid" DROP COLUMN "background_color";
  ALTER TABLE "header" DROP COLUMN "name";
  ALTER TABLE "_header_v" DROP COLUMN "version_name";
  ALTER TABLE "gsec_blocks_cards_grid" DROP COLUMN "align_variant";
  ALTER TABLE "gsec_blocks_cards_grid" DROP COLUMN "rounded";
  ALTER TABLE "gsec_blocks_cards_grid" DROP COLUMN "background_color";
  ALTER TABLE "gsec" DROP COLUMN "title";
  ALTER TABLE "_gsec_v_blocks_cards_grid" DROP COLUMN "align_variant";
  ALTER TABLE "_gsec_v_blocks_cards_grid" DROP COLUMN "rounded";
  ALTER TABLE "_gsec_v_blocks_cards_grid" DROP COLUMN "background_color";
  ALTER TABLE "_gsec_v" DROP COLUMN "version_title";
  ALTER TABLE "presets_blocks_cards_grid" DROP COLUMN "align_variant";
  ALTER TABLE "presets_blocks_cards_grid" DROP COLUMN "rounded";
  ALTER TABLE "presets_blocks_cards_grid" DROP COLUMN "background_color";
  ALTER TABLE "site_settings" DROP COLUMN "seo_x_site";
  ALTER TABLE "site_settings" DROP COLUMN "seo_x_creator";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_seo_x_site";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_seo_x_creator";
  DROP TYPE "public"."enum_page_blocks_cards_grid_columns";
  DROP TYPE "public"."enum_page_blocks_cards_grid_align_variant";
  DROP TYPE "public"."enum_page_blocks_cards_grid_rounded";
  DROP TYPE "public"."enum_page_blocks_cards_grid_background_color";
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_columns";
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_align_variant";
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_rounded";
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_background_color";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_columns";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_align_variant";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_rounded";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_background_color";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_columns";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_align_variant";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_rounded";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_background_color";
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_columns";
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_align_variant";
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_rounded";
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_background_color";
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_columns";
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_align_variant";
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_rounded";
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_background_color";
  DROP TYPE "public"."enum_presets_blocks_cards_grid_columns";
  DROP TYPE "public"."enum_presets_blocks_cards_grid_align_variant";
  DROP TYPE "public"."enum_presets_blocks_cards_grid_rounded";
  DROP TYPE "public"."enum_presets_blocks_cards_grid_background_color";`)
  await db.execute(sql.raw(applyDown()))
}
