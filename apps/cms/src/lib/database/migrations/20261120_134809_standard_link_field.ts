import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// One standard link field (CMS simplification, part B4):
// - Every "Buttons" list (hero, text and image, call to action, header buttons, and the call-to-action
//   banner inside post rich text) stops spreading the link fields into the row: each row now holds
//   one `link` group, like footer links, logos and cards already did. In the database the row's
//   columns move from `type, new_tab, url, custom_page, label, appearance` to `link_type, link_new_tab,
//   link_url, link_custom_page, link_label, link_appearance` (new `..._link_*` enum types), and the
//   page/post the button points to moves in `*_rels.path` from `…actions.N.reference` to
//   `…actions.N.link.reference`. Covers live rows, versions/drafts (`_*_v*`), presets and reusable
//   sections. Post rich text (Lexical JSON) `ctaBannerInline` buttons are rewritten the same way.
// - Image shape gains "Portrait (3:4)" (`3/4` added to every `image_aspect_ratio` enum).
// Down moves the buttons back; a portrait (3/4) image shape becomes square (1/1), the closest
// shape the older schema has.

const BLOCK_PREFIXES = ['page', '_page_v', 'posts', '_posts_v', 'gsec', '_gsec_v', 'presets'] as const
const HERO_PREFIXES = ['page', '_page_v', 'presets'] as const
const RELS_TABLES = [
  'page_rels', '_page_v_rels', 'posts_rels', '_posts_v_rels', 'gsec_rels', '_gsec_v_rels',
  'presets_rels', 'header_rels', '_header_v_rels',
] as const

/** Every table that stores a "Buttons" row. */
const BUTTON_TABLES: string[] = [
  ...BLOCK_PREFIXES.flatMap((prefix) => [`${prefix}_blocks_content_actions`, `${prefix}_blocks_cta_band_actions`]),
  ...HERO_PREFIXES.map((prefix) => `${prefix}_blocks_hero_actions`),
  'header_actions',
  '_header_v_version_actions',
]
/** Presets are not localized: there the (localized) button text column is NOT NULL. */
const NOT_NULL_LABEL_TABLES = new Set([
  'presets_blocks_hero_actions',
  'presets_blocks_content_actions',
  'presets_blocks_cta_band_actions',
])

/** Flat column -> link-group column; enum columns are cast through text to the target column's enum. */
const COLUMNS: { flat: string; grouped: string; isEnum: boolean }[] = [
  { flat: 'type', grouped: 'link_type', isEnum: true },
  { flat: 'new_tab', grouped: 'link_new_tab', isEnum: false },
  { flat: 'url', grouped: 'link_url', isEnum: false },
  { flat: 'custom_page', grouped: 'link_custom_page', isEnum: true },
  { flat: 'label', grouped: 'link_label', isEnum: false },
  { flat: 'appearance', grouped: 'link_appearance', isEnum: true },
]

function copyColumns(direction: 'up' | 'down'): string {
  return BUTTON_TABLES.map((table) => {
    const assignments = COLUMNS.map(({ flat, grouped, isEnum }) => {
      const [from, to] = direction === 'up' ? [flat, grouped] : [grouped, flat]
      return isEnum ? `"${to}" = "${from}"::text::"enum_${table}_${to}"` : `"${to}" = "${from}"`
    }).join(', ')
    const label = direction === 'up' ? 'link_label' : 'label'
    const notNull = NOT_NULL_LABEL_TABLES.has(table)
      ? `\n      UPDATE "${table}" SET "${label}" = '' WHERE "${label}" IS NULL;
      ALTER TABLE "${table}" ALTER COLUMN "${label}" SET NOT NULL;`
      : ''
    return `UPDATE "${table}" SET ${assignments};${notNull}`
  }).join('\n')
}

const FLAT_REFERENCE_PATH = String.raw`(^|\.)actions\.([0-9]+)\.reference$`
const GROUPED_REFERENCE_PATH = String.raw`(^|\.)actions\.([0-9]+)\.link\.reference$`

function moveRelationshipPaths(direction: 'up' | 'down'): string {
  const [from, to] =
    direction === 'up'
      ? [FLAT_REFERENCE_PATH, String.raw`\1actions.\2.link.reference`]
      : [GROUPED_REFERENCE_PATH, String.raw`\1actions.\2.reference`]
  return RELS_TABLES.map(
    (table) => `UPDATE "${table}" SET "path" = regexp_replace("path", '${from}', '${to}') WHERE "path" ~ '${from}';`,
  ).join('\n')
}

/** The older schema has no portrait shape: 3/4 becomes square. */
function dropPortraitShape(): string {
  return [
    ...HERO_PREFIXES.map((prefix) => `${prefix}_blocks_hero`),
    ...BLOCK_PREFIXES.map((prefix) => `${prefix}_blocks_cards_grid_items`),
  ]
    .map((table) => `UPDATE "${table}" SET "image_aspect_ratio" = '1/1' WHERE "image_aspect_ratio" = '3/4';`)
    .join('\n')
}

// ---------------------------------------------------------------------------------------------
// Rich text (Lexical JSON): post content holds `ctaBannerInline` blocks whose buttons have no
// tables of their own. The admin validates them on save, so they are rewritten as well.

type JsonRecord = Record<string, unknown>

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const LINK_KEYS = ['type', 'newTab', 'reference', 'url', 'customPage', 'label', 'appearance'] as const

function upgradeBlockFields(fields: JsonRecord): void {
  if (fields.blockType !== 'ctaBannerInline' || !Array.isArray(fields.actions)) return
  for (const action of fields.actions.filter(isRecord)) {
    if (isRecord(action.link)) continue
    const link: JsonRecord = {}
    for (const key of LINK_KEYS) {
      if (key in action) {
        link[key] = action[key]
        delete action[key]
      }
    }
    action.link = link
  }
}

function downgradeBlockFields(fields: JsonRecord): void {
  if (fields.blockType === 'ctaBannerInline' && Array.isArray(fields.actions)) {
    for (const action of fields.actions.filter(isRecord)) {
      if (!isRecord(action.link)) continue
      Object.assign(action, action.link)
      delete action.link
    }
  }
  if (fields.blockType === 'cardsGridInline' && Array.isArray(fields.items)) {
    for (const item of fields.items.filter(isRecord)) {
      if (isRecord(item.image) && item.image.aspectRatio === '3/4') item.image.aspectRatio = '1/1'
    }
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
  // Generated: new link enums, the 3/4 image shape, the new `link_*` columns (button text nullable
  // until it is copied over).
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_hero_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_hero_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_hero_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_page_blocks_content_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_content_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_content_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_page_blocks_cta_band_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_cta_band_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_cta_band_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__page_v_blocks_hero_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_hero_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_hero_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__page_v_blocks_content_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_content_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_content_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__page_v_blocks_cta_band_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_cta_band_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_cta_band_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_posts_blocks_content_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_posts_blocks_content_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_posts_blocks_content_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_posts_blocks_cta_band_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_posts_blocks_cta_band_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_posts_blocks_cta_band_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__posts_v_blocks_content_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__posts_v_blocks_content_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__posts_v_blocks_content_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__posts_v_blocks_cta_band_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__posts_v_blocks_cta_band_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__posts_v_blocks_cta_band_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_header_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_header_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_header_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__header_v_version_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__header_v_version_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__header_v_version_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_gsec_blocks_content_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_content_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_content_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_gsec_blocks_cta_band_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_cta_band_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_cta_band_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__gsec_v_blocks_content_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_content_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_content_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__gsec_v_blocks_cta_band_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_cta_band_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_cta_band_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_presets_blocks_hero_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_hero_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_hero_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_presets_blocks_content_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_content_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_content_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_presets_blocks_cta_band_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_cta_band_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_cta_band_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  ALTER TYPE "public"."enum_page_blocks_hero_image_aspect_ratio" ADD VALUE '3/4' BEFORE 'auto';
  ALTER TYPE "public"."enum_page_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '3/4' BEFORE 'auto';
  ALTER TYPE "public"."enum__page_v_blocks_hero_image_aspect_ratio" ADD VALUE '3/4' BEFORE 'auto';
  ALTER TYPE "public"."enum__page_v_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '3/4' BEFORE 'auto';
  ALTER TYPE "public"."enum_posts_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '3/4' BEFORE 'auto';
  ALTER TYPE "public"."enum__posts_v_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '3/4' BEFORE 'auto';
  ALTER TYPE "public"."enum_gsec_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '3/4' BEFORE 'auto';
  ALTER TYPE "public"."enum__gsec_v_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '3/4' BEFORE 'auto';
  ALTER TYPE "public"."enum_presets_blocks_hero_image_aspect_ratio" ADD VALUE '3/4' BEFORE 'auto';
  ALTER TYPE "public"."enum_presets_blocks_cards_grid_items_image_aspect_ratio" ADD VALUE '3/4' BEFORE 'auto';
  ALTER TABLE "page_blocks_hero_actions" ADD COLUMN "link_type" "enum_page_blocks_hero_actions_link_type" DEFAULT 'reference';
  ALTER TABLE "page_blocks_hero_actions" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "page_blocks_hero_actions" ADD COLUMN "link_url" varchar;
  ALTER TABLE "page_blocks_hero_actions" ADD COLUMN "link_custom_page" "enum_page_blocks_hero_actions_link_custom_page";
  ALTER TABLE "page_blocks_hero_actions" ADD COLUMN "link_label" varchar;
  ALTER TABLE "page_blocks_hero_actions" ADD COLUMN "link_appearance" "enum_page_blocks_hero_actions_link_appearance" DEFAULT 'default';
  ALTER TABLE "page_blocks_content_actions" ADD COLUMN "link_type" "enum_page_blocks_content_actions_link_type" DEFAULT 'reference';
  ALTER TABLE "page_blocks_content_actions" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "page_blocks_content_actions" ADD COLUMN "link_url" varchar;
  ALTER TABLE "page_blocks_content_actions" ADD COLUMN "link_custom_page" "enum_page_blocks_content_actions_link_custom_page";
  ALTER TABLE "page_blocks_content_actions" ADD COLUMN "link_label" varchar;
  ALTER TABLE "page_blocks_content_actions" ADD COLUMN "link_appearance" "enum_page_blocks_content_actions_link_appearance" DEFAULT 'default';
  ALTER TABLE "page_blocks_cta_band_actions" ADD COLUMN "link_type" "enum_page_blocks_cta_band_actions_link_type" DEFAULT 'reference';
  ALTER TABLE "page_blocks_cta_band_actions" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "page_blocks_cta_band_actions" ADD COLUMN "link_url" varchar;
  ALTER TABLE "page_blocks_cta_band_actions" ADD COLUMN "link_custom_page" "enum_page_blocks_cta_band_actions_link_custom_page";
  ALTER TABLE "page_blocks_cta_band_actions" ADD COLUMN "link_label" varchar;
  ALTER TABLE "page_blocks_cta_band_actions" ADD COLUMN "link_appearance" "enum_page_blocks_cta_band_actions_link_appearance" DEFAULT 'default';
  ALTER TABLE "_page_v_blocks_hero_actions" ADD COLUMN "link_type" "enum__page_v_blocks_hero_actions_link_type" DEFAULT 'reference';
  ALTER TABLE "_page_v_blocks_hero_actions" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "_page_v_blocks_hero_actions" ADD COLUMN "link_url" varchar;
  ALTER TABLE "_page_v_blocks_hero_actions" ADD COLUMN "link_custom_page" "enum__page_v_blocks_hero_actions_link_custom_page";
  ALTER TABLE "_page_v_blocks_hero_actions" ADD COLUMN "link_label" varchar;
  ALTER TABLE "_page_v_blocks_hero_actions" ADD COLUMN "link_appearance" "enum__page_v_blocks_hero_actions_link_appearance" DEFAULT 'default';
  ALTER TABLE "_page_v_blocks_content_actions" ADD COLUMN "link_type" "enum__page_v_blocks_content_actions_link_type" DEFAULT 'reference';
  ALTER TABLE "_page_v_blocks_content_actions" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "_page_v_blocks_content_actions" ADD COLUMN "link_url" varchar;
  ALTER TABLE "_page_v_blocks_content_actions" ADD COLUMN "link_custom_page" "enum__page_v_blocks_content_actions_link_custom_page";
  ALTER TABLE "_page_v_blocks_content_actions" ADD COLUMN "link_label" varchar;
  ALTER TABLE "_page_v_blocks_content_actions" ADD COLUMN "link_appearance" "enum__page_v_blocks_content_actions_link_appearance" DEFAULT 'default';
  ALTER TABLE "_page_v_blocks_cta_band_actions" ADD COLUMN "link_type" "enum__page_v_blocks_cta_band_actions_link_type" DEFAULT 'reference';
  ALTER TABLE "_page_v_blocks_cta_band_actions" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "_page_v_blocks_cta_band_actions" ADD COLUMN "link_url" varchar;
  ALTER TABLE "_page_v_blocks_cta_band_actions" ADD COLUMN "link_custom_page" "enum__page_v_blocks_cta_band_actions_link_custom_page";
  ALTER TABLE "_page_v_blocks_cta_band_actions" ADD COLUMN "link_label" varchar;
  ALTER TABLE "_page_v_blocks_cta_band_actions" ADD COLUMN "link_appearance" "enum__page_v_blocks_cta_band_actions_link_appearance" DEFAULT 'default';
  ALTER TABLE "posts_blocks_content_actions" ADD COLUMN "link_type" "enum_posts_blocks_content_actions_link_type" DEFAULT 'reference';
  ALTER TABLE "posts_blocks_content_actions" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "posts_blocks_content_actions" ADD COLUMN "link_url" varchar;
  ALTER TABLE "posts_blocks_content_actions" ADD COLUMN "link_custom_page" "enum_posts_blocks_content_actions_link_custom_page";
  ALTER TABLE "posts_blocks_content_actions" ADD COLUMN "link_label" varchar;
  ALTER TABLE "posts_blocks_content_actions" ADD COLUMN "link_appearance" "enum_posts_blocks_content_actions_link_appearance" DEFAULT 'default';
  ALTER TABLE "posts_blocks_cta_band_actions" ADD COLUMN "link_type" "enum_posts_blocks_cta_band_actions_link_type" DEFAULT 'reference';
  ALTER TABLE "posts_blocks_cta_band_actions" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "posts_blocks_cta_band_actions" ADD COLUMN "link_url" varchar;
  ALTER TABLE "posts_blocks_cta_band_actions" ADD COLUMN "link_custom_page" "enum_posts_blocks_cta_band_actions_link_custom_page";
  ALTER TABLE "posts_blocks_cta_band_actions" ADD COLUMN "link_label" varchar;
  ALTER TABLE "posts_blocks_cta_band_actions" ADD COLUMN "link_appearance" "enum_posts_blocks_cta_band_actions_link_appearance" DEFAULT 'default';
  ALTER TABLE "_posts_v_blocks_content_actions" ADD COLUMN "link_type" "enum__posts_v_blocks_content_actions_link_type" DEFAULT 'reference';
  ALTER TABLE "_posts_v_blocks_content_actions" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "_posts_v_blocks_content_actions" ADD COLUMN "link_url" varchar;
  ALTER TABLE "_posts_v_blocks_content_actions" ADD COLUMN "link_custom_page" "enum__posts_v_blocks_content_actions_link_custom_page";
  ALTER TABLE "_posts_v_blocks_content_actions" ADD COLUMN "link_label" varchar;
  ALTER TABLE "_posts_v_blocks_content_actions" ADD COLUMN "link_appearance" "enum__posts_v_blocks_content_actions_link_appearance" DEFAULT 'default';
  ALTER TABLE "_posts_v_blocks_cta_band_actions" ADD COLUMN "link_type" "enum__posts_v_blocks_cta_band_actions_link_type" DEFAULT 'reference';
  ALTER TABLE "_posts_v_blocks_cta_band_actions" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "_posts_v_blocks_cta_band_actions" ADD COLUMN "link_url" varchar;
  ALTER TABLE "_posts_v_blocks_cta_band_actions" ADD COLUMN "link_custom_page" "enum__posts_v_blocks_cta_band_actions_link_custom_page";
  ALTER TABLE "_posts_v_blocks_cta_band_actions" ADD COLUMN "link_label" varchar;
  ALTER TABLE "_posts_v_blocks_cta_band_actions" ADD COLUMN "link_appearance" "enum__posts_v_blocks_cta_band_actions_link_appearance" DEFAULT 'default';
  ALTER TABLE "header_actions" ADD COLUMN "link_type" "enum_header_actions_link_type" DEFAULT 'reference';
  ALTER TABLE "header_actions" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "header_actions" ADD COLUMN "link_url" varchar;
  ALTER TABLE "header_actions" ADD COLUMN "link_custom_page" "enum_header_actions_link_custom_page";
  ALTER TABLE "header_actions" ADD COLUMN "link_label" varchar;
  ALTER TABLE "header_actions" ADD COLUMN "link_appearance" "enum_header_actions_link_appearance" DEFAULT 'default';
  ALTER TABLE "_header_v_version_actions" ADD COLUMN "link_type" "enum__header_v_version_actions_link_type" DEFAULT 'reference';
  ALTER TABLE "_header_v_version_actions" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "_header_v_version_actions" ADD COLUMN "link_url" varchar;
  ALTER TABLE "_header_v_version_actions" ADD COLUMN "link_custom_page" "enum__header_v_version_actions_link_custom_page";
  ALTER TABLE "_header_v_version_actions" ADD COLUMN "link_label" varchar;
  ALTER TABLE "_header_v_version_actions" ADD COLUMN "link_appearance" "enum__header_v_version_actions_link_appearance" DEFAULT 'default';
  ALTER TABLE "gsec_blocks_content_actions" ADD COLUMN "link_type" "enum_gsec_blocks_content_actions_link_type" DEFAULT 'reference';
  ALTER TABLE "gsec_blocks_content_actions" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "gsec_blocks_content_actions" ADD COLUMN "link_url" varchar;
  ALTER TABLE "gsec_blocks_content_actions" ADD COLUMN "link_custom_page" "enum_gsec_blocks_content_actions_link_custom_page";
  ALTER TABLE "gsec_blocks_content_actions" ADD COLUMN "link_label" varchar;
  ALTER TABLE "gsec_blocks_content_actions" ADD COLUMN "link_appearance" "enum_gsec_blocks_content_actions_link_appearance" DEFAULT 'default';
  ALTER TABLE "gsec_blocks_cta_band_actions" ADD COLUMN "link_type" "enum_gsec_blocks_cta_band_actions_link_type" DEFAULT 'reference';
  ALTER TABLE "gsec_blocks_cta_band_actions" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "gsec_blocks_cta_band_actions" ADD COLUMN "link_url" varchar;
  ALTER TABLE "gsec_blocks_cta_band_actions" ADD COLUMN "link_custom_page" "enum_gsec_blocks_cta_band_actions_link_custom_page";
  ALTER TABLE "gsec_blocks_cta_band_actions" ADD COLUMN "link_label" varchar;
  ALTER TABLE "gsec_blocks_cta_band_actions" ADD COLUMN "link_appearance" "enum_gsec_blocks_cta_band_actions_link_appearance" DEFAULT 'default';
  ALTER TABLE "_gsec_v_blocks_content_actions" ADD COLUMN "link_type" "enum__gsec_v_blocks_content_actions_link_type" DEFAULT 'reference';
  ALTER TABLE "_gsec_v_blocks_content_actions" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "_gsec_v_blocks_content_actions" ADD COLUMN "link_url" varchar;
  ALTER TABLE "_gsec_v_blocks_content_actions" ADD COLUMN "link_custom_page" "enum__gsec_v_blocks_content_actions_link_custom_page";
  ALTER TABLE "_gsec_v_blocks_content_actions" ADD COLUMN "link_label" varchar;
  ALTER TABLE "_gsec_v_blocks_content_actions" ADD COLUMN "link_appearance" "enum__gsec_v_blocks_content_actions_link_appearance" DEFAULT 'default';
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" ADD COLUMN "link_type" "enum__gsec_v_blocks_cta_band_actions_link_type" DEFAULT 'reference';
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" ADD COLUMN "link_url" varchar;
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" ADD COLUMN "link_custom_page" "enum__gsec_v_blocks_cta_band_actions_link_custom_page";
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" ADD COLUMN "link_label" varchar;
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" ADD COLUMN "link_appearance" "enum__gsec_v_blocks_cta_band_actions_link_appearance" DEFAULT 'default';
  ALTER TABLE "presets_blocks_hero_actions" ADD COLUMN "link_type" "enum_presets_blocks_hero_actions_link_type" DEFAULT 'reference';
  ALTER TABLE "presets_blocks_hero_actions" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "presets_blocks_hero_actions" ADD COLUMN "link_url" varchar;
  ALTER TABLE "presets_blocks_hero_actions" ADD COLUMN "link_custom_page" "enum_presets_blocks_hero_actions_link_custom_page";
  ALTER TABLE "presets_blocks_hero_actions" ADD COLUMN "link_label" varchar;
  ALTER TABLE "presets_blocks_hero_actions" ADD COLUMN "link_appearance" "enum_presets_blocks_hero_actions_link_appearance" DEFAULT 'default';
  ALTER TABLE "presets_blocks_content_actions" ADD COLUMN "link_type" "enum_presets_blocks_content_actions_link_type" DEFAULT 'reference';
  ALTER TABLE "presets_blocks_content_actions" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "presets_blocks_content_actions" ADD COLUMN "link_url" varchar;
  ALTER TABLE "presets_blocks_content_actions" ADD COLUMN "link_custom_page" "enum_presets_blocks_content_actions_link_custom_page";
  ALTER TABLE "presets_blocks_content_actions" ADD COLUMN "link_label" varchar;
  ALTER TABLE "presets_blocks_content_actions" ADD COLUMN "link_appearance" "enum_presets_blocks_content_actions_link_appearance" DEFAULT 'default';
  ALTER TABLE "presets_blocks_cta_band_actions" ADD COLUMN "link_type" "enum_presets_blocks_cta_band_actions_link_type" DEFAULT 'reference';
  ALTER TABLE "presets_blocks_cta_band_actions" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "presets_blocks_cta_band_actions" ADD COLUMN "link_url" varchar;
  ALTER TABLE "presets_blocks_cta_band_actions" ADD COLUMN "link_custom_page" "enum_presets_blocks_cta_band_actions_link_custom_page";
  ALTER TABLE "presets_blocks_cta_band_actions" ADD COLUMN "link_label" varchar;
  ALTER TABLE "presets_blocks_cta_band_actions" ADD COLUMN "link_appearance" "enum_presets_blocks_cta_band_actions_link_appearance" DEFAULT 'default';`)
  await db.execute(sql.raw(copyColumns('up')))
  await db.execute(sql.raw(moveRelationshipPaths('up')))
  // Generated: the flat button columns and their enums go.
  await db.execute(sql`
  ALTER TABLE "page_blocks_hero_actions" DROP COLUMN "type";
  ALTER TABLE "page_blocks_hero_actions" DROP COLUMN "new_tab";
  ALTER TABLE "page_blocks_hero_actions" DROP COLUMN "url";
  ALTER TABLE "page_blocks_hero_actions" DROP COLUMN "custom_page";
  ALTER TABLE "page_blocks_hero_actions" DROP COLUMN "label";
  ALTER TABLE "page_blocks_hero_actions" DROP COLUMN "appearance";
  ALTER TABLE "page_blocks_content_actions" DROP COLUMN "type";
  ALTER TABLE "page_blocks_content_actions" DROP COLUMN "new_tab";
  ALTER TABLE "page_blocks_content_actions" DROP COLUMN "url";
  ALTER TABLE "page_blocks_content_actions" DROP COLUMN "custom_page";
  ALTER TABLE "page_blocks_content_actions" DROP COLUMN "label";
  ALTER TABLE "page_blocks_content_actions" DROP COLUMN "appearance";
  ALTER TABLE "page_blocks_cta_band_actions" DROP COLUMN "type";
  ALTER TABLE "page_blocks_cta_band_actions" DROP COLUMN "new_tab";
  ALTER TABLE "page_blocks_cta_band_actions" DROP COLUMN "url";
  ALTER TABLE "page_blocks_cta_band_actions" DROP COLUMN "custom_page";
  ALTER TABLE "page_blocks_cta_band_actions" DROP COLUMN "label";
  ALTER TABLE "page_blocks_cta_band_actions" DROP COLUMN "appearance";
  ALTER TABLE "_page_v_blocks_hero_actions" DROP COLUMN "type";
  ALTER TABLE "_page_v_blocks_hero_actions" DROP COLUMN "new_tab";
  ALTER TABLE "_page_v_blocks_hero_actions" DROP COLUMN "url";
  ALTER TABLE "_page_v_blocks_hero_actions" DROP COLUMN "custom_page";
  ALTER TABLE "_page_v_blocks_hero_actions" DROP COLUMN "label";
  ALTER TABLE "_page_v_blocks_hero_actions" DROP COLUMN "appearance";
  ALTER TABLE "_page_v_blocks_content_actions" DROP COLUMN "type";
  ALTER TABLE "_page_v_blocks_content_actions" DROP COLUMN "new_tab";
  ALTER TABLE "_page_v_blocks_content_actions" DROP COLUMN "url";
  ALTER TABLE "_page_v_blocks_content_actions" DROP COLUMN "custom_page";
  ALTER TABLE "_page_v_blocks_content_actions" DROP COLUMN "label";
  ALTER TABLE "_page_v_blocks_content_actions" DROP COLUMN "appearance";
  ALTER TABLE "_page_v_blocks_cta_band_actions" DROP COLUMN "type";
  ALTER TABLE "_page_v_blocks_cta_band_actions" DROP COLUMN "new_tab";
  ALTER TABLE "_page_v_blocks_cta_band_actions" DROP COLUMN "url";
  ALTER TABLE "_page_v_blocks_cta_band_actions" DROP COLUMN "custom_page";
  ALTER TABLE "_page_v_blocks_cta_band_actions" DROP COLUMN "label";
  ALTER TABLE "_page_v_blocks_cta_band_actions" DROP COLUMN "appearance";
  ALTER TABLE "posts_blocks_content_actions" DROP COLUMN "type";
  ALTER TABLE "posts_blocks_content_actions" DROP COLUMN "new_tab";
  ALTER TABLE "posts_blocks_content_actions" DROP COLUMN "url";
  ALTER TABLE "posts_blocks_content_actions" DROP COLUMN "custom_page";
  ALTER TABLE "posts_blocks_content_actions" DROP COLUMN "label";
  ALTER TABLE "posts_blocks_content_actions" DROP COLUMN "appearance";
  ALTER TABLE "posts_blocks_cta_band_actions" DROP COLUMN "type";
  ALTER TABLE "posts_blocks_cta_band_actions" DROP COLUMN "new_tab";
  ALTER TABLE "posts_blocks_cta_band_actions" DROP COLUMN "url";
  ALTER TABLE "posts_blocks_cta_band_actions" DROP COLUMN "custom_page";
  ALTER TABLE "posts_blocks_cta_band_actions" DROP COLUMN "label";
  ALTER TABLE "posts_blocks_cta_band_actions" DROP COLUMN "appearance";
  ALTER TABLE "_posts_v_blocks_content_actions" DROP COLUMN "type";
  ALTER TABLE "_posts_v_blocks_content_actions" DROP COLUMN "new_tab";
  ALTER TABLE "_posts_v_blocks_content_actions" DROP COLUMN "url";
  ALTER TABLE "_posts_v_blocks_content_actions" DROP COLUMN "custom_page";
  ALTER TABLE "_posts_v_blocks_content_actions" DROP COLUMN "label";
  ALTER TABLE "_posts_v_blocks_content_actions" DROP COLUMN "appearance";
  ALTER TABLE "_posts_v_blocks_cta_band_actions" DROP COLUMN "type";
  ALTER TABLE "_posts_v_blocks_cta_band_actions" DROP COLUMN "new_tab";
  ALTER TABLE "_posts_v_blocks_cta_band_actions" DROP COLUMN "url";
  ALTER TABLE "_posts_v_blocks_cta_band_actions" DROP COLUMN "custom_page";
  ALTER TABLE "_posts_v_blocks_cta_band_actions" DROP COLUMN "label";
  ALTER TABLE "_posts_v_blocks_cta_band_actions" DROP COLUMN "appearance";
  ALTER TABLE "header_actions" DROP COLUMN "type";
  ALTER TABLE "header_actions" DROP COLUMN "new_tab";
  ALTER TABLE "header_actions" DROP COLUMN "url";
  ALTER TABLE "header_actions" DROP COLUMN "custom_page";
  ALTER TABLE "header_actions" DROP COLUMN "label";
  ALTER TABLE "header_actions" DROP COLUMN "appearance";
  ALTER TABLE "_header_v_version_actions" DROP COLUMN "type";
  ALTER TABLE "_header_v_version_actions" DROP COLUMN "new_tab";
  ALTER TABLE "_header_v_version_actions" DROP COLUMN "url";
  ALTER TABLE "_header_v_version_actions" DROP COLUMN "custom_page";
  ALTER TABLE "_header_v_version_actions" DROP COLUMN "label";
  ALTER TABLE "_header_v_version_actions" DROP COLUMN "appearance";
  ALTER TABLE "gsec_blocks_content_actions" DROP COLUMN "type";
  ALTER TABLE "gsec_blocks_content_actions" DROP COLUMN "new_tab";
  ALTER TABLE "gsec_blocks_content_actions" DROP COLUMN "url";
  ALTER TABLE "gsec_blocks_content_actions" DROP COLUMN "custom_page";
  ALTER TABLE "gsec_blocks_content_actions" DROP COLUMN "label";
  ALTER TABLE "gsec_blocks_content_actions" DROP COLUMN "appearance";
  ALTER TABLE "gsec_blocks_cta_band_actions" DROP COLUMN "type";
  ALTER TABLE "gsec_blocks_cta_band_actions" DROP COLUMN "new_tab";
  ALTER TABLE "gsec_blocks_cta_band_actions" DROP COLUMN "url";
  ALTER TABLE "gsec_blocks_cta_band_actions" DROP COLUMN "custom_page";
  ALTER TABLE "gsec_blocks_cta_band_actions" DROP COLUMN "label";
  ALTER TABLE "gsec_blocks_cta_band_actions" DROP COLUMN "appearance";
  ALTER TABLE "_gsec_v_blocks_content_actions" DROP COLUMN "type";
  ALTER TABLE "_gsec_v_blocks_content_actions" DROP COLUMN "new_tab";
  ALTER TABLE "_gsec_v_blocks_content_actions" DROP COLUMN "url";
  ALTER TABLE "_gsec_v_blocks_content_actions" DROP COLUMN "custom_page";
  ALTER TABLE "_gsec_v_blocks_content_actions" DROP COLUMN "label";
  ALTER TABLE "_gsec_v_blocks_content_actions" DROP COLUMN "appearance";
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" DROP COLUMN "type";
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" DROP COLUMN "new_tab";
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" DROP COLUMN "url";
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" DROP COLUMN "custom_page";
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" DROP COLUMN "label";
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" DROP COLUMN "appearance";
  ALTER TABLE "presets_blocks_hero_actions" DROP COLUMN "type";
  ALTER TABLE "presets_blocks_hero_actions" DROP COLUMN "new_tab";
  ALTER TABLE "presets_blocks_hero_actions" DROP COLUMN "url";
  ALTER TABLE "presets_blocks_hero_actions" DROP COLUMN "custom_page";
  ALTER TABLE "presets_blocks_hero_actions" DROP COLUMN "label";
  ALTER TABLE "presets_blocks_hero_actions" DROP COLUMN "appearance";
  ALTER TABLE "presets_blocks_content_actions" DROP COLUMN "type";
  ALTER TABLE "presets_blocks_content_actions" DROP COLUMN "new_tab";
  ALTER TABLE "presets_blocks_content_actions" DROP COLUMN "url";
  ALTER TABLE "presets_blocks_content_actions" DROP COLUMN "custom_page";
  ALTER TABLE "presets_blocks_content_actions" DROP COLUMN "label";
  ALTER TABLE "presets_blocks_content_actions" DROP COLUMN "appearance";
  ALTER TABLE "presets_blocks_cta_band_actions" DROP COLUMN "type";
  ALTER TABLE "presets_blocks_cta_band_actions" DROP COLUMN "new_tab";
  ALTER TABLE "presets_blocks_cta_band_actions" DROP COLUMN "url";
  ALTER TABLE "presets_blocks_cta_band_actions" DROP COLUMN "custom_page";
  ALTER TABLE "presets_blocks_cta_band_actions" DROP COLUMN "label";
  ALTER TABLE "presets_blocks_cta_band_actions" DROP COLUMN "appearance";
  DROP TYPE "public"."enum_page_blocks_hero_actions_type";
  DROP TYPE "public"."enum_page_blocks_hero_actions_custom_page";
  DROP TYPE "public"."enum_page_blocks_hero_actions_appearance";
  DROP TYPE "public"."enum_page_blocks_content_actions_type";
  DROP TYPE "public"."enum_page_blocks_content_actions_custom_page";
  DROP TYPE "public"."enum_page_blocks_content_actions_appearance";
  DROP TYPE "public"."enum_page_blocks_cta_band_actions_type";
  DROP TYPE "public"."enum_page_blocks_cta_band_actions_custom_page";
  DROP TYPE "public"."enum_page_blocks_cta_band_actions_appearance";
  DROP TYPE "public"."enum__page_v_blocks_hero_actions_type";
  DROP TYPE "public"."enum__page_v_blocks_hero_actions_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_hero_actions_appearance";
  DROP TYPE "public"."enum__page_v_blocks_content_actions_type";
  DROP TYPE "public"."enum__page_v_blocks_content_actions_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_content_actions_appearance";
  DROP TYPE "public"."enum__page_v_blocks_cta_band_actions_type";
  DROP TYPE "public"."enum__page_v_blocks_cta_band_actions_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_cta_band_actions_appearance";
  DROP TYPE "public"."enum_posts_blocks_content_actions_type";
  DROP TYPE "public"."enum_posts_blocks_content_actions_custom_page";
  DROP TYPE "public"."enum_posts_blocks_content_actions_appearance";
  DROP TYPE "public"."enum_posts_blocks_cta_band_actions_type";
  DROP TYPE "public"."enum_posts_blocks_cta_band_actions_custom_page";
  DROP TYPE "public"."enum_posts_blocks_cta_band_actions_appearance";
  DROP TYPE "public"."enum__posts_v_blocks_content_actions_type";
  DROP TYPE "public"."enum__posts_v_blocks_content_actions_custom_page";
  DROP TYPE "public"."enum__posts_v_blocks_content_actions_appearance";
  DROP TYPE "public"."enum__posts_v_blocks_cta_band_actions_type";
  DROP TYPE "public"."enum__posts_v_blocks_cta_band_actions_custom_page";
  DROP TYPE "public"."enum__posts_v_blocks_cta_band_actions_appearance";
  DROP TYPE "public"."enum_header_actions_type";
  DROP TYPE "public"."enum_header_actions_custom_page";
  DROP TYPE "public"."enum_header_actions_appearance";
  DROP TYPE "public"."enum__header_v_version_actions_type";
  DROP TYPE "public"."enum__header_v_version_actions_custom_page";
  DROP TYPE "public"."enum__header_v_version_actions_appearance";
  DROP TYPE "public"."enum_gsec_blocks_content_actions_type";
  DROP TYPE "public"."enum_gsec_blocks_content_actions_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_content_actions_appearance";
  DROP TYPE "public"."enum_gsec_blocks_cta_band_actions_type";
  DROP TYPE "public"."enum_gsec_blocks_cta_band_actions_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_cta_band_actions_appearance";
  DROP TYPE "public"."enum__gsec_v_blocks_content_actions_type";
  DROP TYPE "public"."enum__gsec_v_blocks_content_actions_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_content_actions_appearance";
  DROP TYPE "public"."enum__gsec_v_blocks_cta_band_actions_type";
  DROP TYPE "public"."enum__gsec_v_blocks_cta_band_actions_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_cta_band_actions_appearance";
  DROP TYPE "public"."enum_presets_blocks_hero_actions_type";
  DROP TYPE "public"."enum_presets_blocks_hero_actions_custom_page";
  DROP TYPE "public"."enum_presets_blocks_hero_actions_appearance";
  DROP TYPE "public"."enum_presets_blocks_content_actions_type";
  DROP TYPE "public"."enum_presets_blocks_content_actions_custom_page";
  DROP TYPE "public"."enum_presets_blocks_content_actions_appearance";
  DROP TYPE "public"."enum_presets_blocks_cta_band_actions_type";
  DROP TYPE "public"."enum_presets_blocks_cta_band_actions_custom_page";
  DROP TYPE "public"."enum_presets_blocks_cta_band_actions_appearance";`)
  await rewritePostsRichText(db, upgradeBlockFields)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await rewritePostsRichText(db, downgradeBlockFields)
  await db.execute(sql.raw(dropPortraitShape()))
  // Generated: the flat enums, image shapes without 3/4, the flat columns (text nullable until filled).
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_hero_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_hero_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_hero_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_page_blocks_content_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_content_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_content_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_page_blocks_cta_band_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_cta_band_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_cta_band_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__page_v_blocks_hero_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_hero_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_hero_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__page_v_blocks_content_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_content_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_content_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__page_v_blocks_cta_band_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_cta_band_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_cta_band_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_posts_blocks_content_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_posts_blocks_content_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_posts_blocks_content_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_posts_blocks_cta_band_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_posts_blocks_cta_band_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_posts_blocks_cta_band_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__posts_v_blocks_content_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__posts_v_blocks_content_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__posts_v_blocks_content_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__posts_v_blocks_cta_band_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__posts_v_blocks_cta_band_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__posts_v_blocks_cta_band_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_header_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_header_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_header_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__header_v_version_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__header_v_version_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__header_v_version_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_gsec_blocks_content_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_content_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_content_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_gsec_blocks_cta_band_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_cta_band_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_cta_band_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__gsec_v_blocks_content_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_content_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_content_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__gsec_v_blocks_cta_band_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_cta_band_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_cta_band_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_presets_blocks_hero_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_hero_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_hero_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_presets_blocks_content_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_content_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_content_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_presets_blocks_cta_band_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_cta_band_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_cta_band_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
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
  ALTER TABLE "posts_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE text;
  ALTER TABLE "posts_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::text;
  DROP TYPE "public"."enum_posts_blocks_cards_grid_items_image_aspect_ratio";
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', 'auto');
  ALTER TABLE "posts_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::"public"."enum_posts_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "posts_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE "public"."enum_posts_blocks_cards_grid_items_image_aspect_ratio" USING "image_aspect_ratio"::"public"."enum_posts_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "_posts_v_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE text;
  ALTER TABLE "_posts_v_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::text;
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_items_image_aspect_ratio";
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', 'auto');
  ALTER TABLE "_posts_v_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::"public"."enum__posts_v_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "_posts_v_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE "public"."enum__posts_v_blocks_cards_grid_items_image_aspect_ratio" USING "image_aspect_ratio"::"public"."enum__posts_v_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "gsec_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::text;
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_items_image_aspect_ratio";
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', 'auto');
  ALTER TABLE "gsec_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::"public"."enum_gsec_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "gsec_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE "public"."enum_gsec_blocks_cards_grid_items_image_aspect_ratio" USING "image_aspect_ratio"::"public"."enum_gsec_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::text;
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_items_image_aspect_ratio";
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', 'auto');
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DEFAULT '1/1'::"public"."enum__gsec_v_blocks_cards_grid_items_image_aspect_ratio";
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" ALTER COLUMN "image_aspect_ratio" SET DATA TYPE "public"."enum__gsec_v_blocks_cards_grid_items_image_aspect_ratio" USING "image_aspect_ratio"::"public"."enum__gsec_v_blocks_cards_grid_items_image_aspect_ratio";
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
  ALTER TABLE "page_blocks_hero_actions" ADD COLUMN "type" "enum_page_blocks_hero_actions_type" DEFAULT 'reference';
  ALTER TABLE "page_blocks_hero_actions" ADD COLUMN "new_tab" boolean;
  ALTER TABLE "page_blocks_hero_actions" ADD COLUMN "url" varchar;
  ALTER TABLE "page_blocks_hero_actions" ADD COLUMN "custom_page" "enum_page_blocks_hero_actions_custom_page";
  ALTER TABLE "page_blocks_hero_actions" ADD COLUMN "label" varchar;
  ALTER TABLE "page_blocks_hero_actions" ADD COLUMN "appearance" "enum_page_blocks_hero_actions_appearance" DEFAULT 'default';
  ALTER TABLE "page_blocks_content_actions" ADD COLUMN "type" "enum_page_blocks_content_actions_type" DEFAULT 'reference';
  ALTER TABLE "page_blocks_content_actions" ADD COLUMN "new_tab" boolean;
  ALTER TABLE "page_blocks_content_actions" ADD COLUMN "url" varchar;
  ALTER TABLE "page_blocks_content_actions" ADD COLUMN "custom_page" "enum_page_blocks_content_actions_custom_page";
  ALTER TABLE "page_blocks_content_actions" ADD COLUMN "label" varchar;
  ALTER TABLE "page_blocks_content_actions" ADD COLUMN "appearance" "enum_page_blocks_content_actions_appearance" DEFAULT 'default';
  ALTER TABLE "page_blocks_cta_band_actions" ADD COLUMN "type" "enum_page_blocks_cta_band_actions_type" DEFAULT 'reference';
  ALTER TABLE "page_blocks_cta_band_actions" ADD COLUMN "new_tab" boolean;
  ALTER TABLE "page_blocks_cta_band_actions" ADD COLUMN "url" varchar;
  ALTER TABLE "page_blocks_cta_band_actions" ADD COLUMN "custom_page" "enum_page_blocks_cta_band_actions_custom_page";
  ALTER TABLE "page_blocks_cta_band_actions" ADD COLUMN "label" varchar;
  ALTER TABLE "page_blocks_cta_band_actions" ADD COLUMN "appearance" "enum_page_blocks_cta_band_actions_appearance" DEFAULT 'default';
  ALTER TABLE "_page_v_blocks_hero_actions" ADD COLUMN "type" "enum__page_v_blocks_hero_actions_type" DEFAULT 'reference';
  ALTER TABLE "_page_v_blocks_hero_actions" ADD COLUMN "new_tab" boolean;
  ALTER TABLE "_page_v_blocks_hero_actions" ADD COLUMN "url" varchar;
  ALTER TABLE "_page_v_blocks_hero_actions" ADD COLUMN "custom_page" "enum__page_v_blocks_hero_actions_custom_page";
  ALTER TABLE "_page_v_blocks_hero_actions" ADD COLUMN "label" varchar;
  ALTER TABLE "_page_v_blocks_hero_actions" ADD COLUMN "appearance" "enum__page_v_blocks_hero_actions_appearance" DEFAULT 'default';
  ALTER TABLE "_page_v_blocks_content_actions" ADD COLUMN "type" "enum__page_v_blocks_content_actions_type" DEFAULT 'reference';
  ALTER TABLE "_page_v_blocks_content_actions" ADD COLUMN "new_tab" boolean;
  ALTER TABLE "_page_v_blocks_content_actions" ADD COLUMN "url" varchar;
  ALTER TABLE "_page_v_blocks_content_actions" ADD COLUMN "custom_page" "enum__page_v_blocks_content_actions_custom_page";
  ALTER TABLE "_page_v_blocks_content_actions" ADD COLUMN "label" varchar;
  ALTER TABLE "_page_v_blocks_content_actions" ADD COLUMN "appearance" "enum__page_v_blocks_content_actions_appearance" DEFAULT 'default';
  ALTER TABLE "_page_v_blocks_cta_band_actions" ADD COLUMN "type" "enum__page_v_blocks_cta_band_actions_type" DEFAULT 'reference';
  ALTER TABLE "_page_v_blocks_cta_band_actions" ADD COLUMN "new_tab" boolean;
  ALTER TABLE "_page_v_blocks_cta_band_actions" ADD COLUMN "url" varchar;
  ALTER TABLE "_page_v_blocks_cta_band_actions" ADD COLUMN "custom_page" "enum__page_v_blocks_cta_band_actions_custom_page";
  ALTER TABLE "_page_v_blocks_cta_band_actions" ADD COLUMN "label" varchar;
  ALTER TABLE "_page_v_blocks_cta_band_actions" ADD COLUMN "appearance" "enum__page_v_blocks_cta_band_actions_appearance" DEFAULT 'default';
  ALTER TABLE "posts_blocks_content_actions" ADD COLUMN "type" "enum_posts_blocks_content_actions_type" DEFAULT 'reference';
  ALTER TABLE "posts_blocks_content_actions" ADD COLUMN "new_tab" boolean;
  ALTER TABLE "posts_blocks_content_actions" ADD COLUMN "url" varchar;
  ALTER TABLE "posts_blocks_content_actions" ADD COLUMN "custom_page" "enum_posts_blocks_content_actions_custom_page";
  ALTER TABLE "posts_blocks_content_actions" ADD COLUMN "label" varchar;
  ALTER TABLE "posts_blocks_content_actions" ADD COLUMN "appearance" "enum_posts_blocks_content_actions_appearance" DEFAULT 'default';
  ALTER TABLE "posts_blocks_cta_band_actions" ADD COLUMN "type" "enum_posts_blocks_cta_band_actions_type" DEFAULT 'reference';
  ALTER TABLE "posts_blocks_cta_band_actions" ADD COLUMN "new_tab" boolean;
  ALTER TABLE "posts_blocks_cta_band_actions" ADD COLUMN "url" varchar;
  ALTER TABLE "posts_blocks_cta_band_actions" ADD COLUMN "custom_page" "enum_posts_blocks_cta_band_actions_custom_page";
  ALTER TABLE "posts_blocks_cta_band_actions" ADD COLUMN "label" varchar;
  ALTER TABLE "posts_blocks_cta_band_actions" ADD COLUMN "appearance" "enum_posts_blocks_cta_band_actions_appearance" DEFAULT 'default';
  ALTER TABLE "_posts_v_blocks_content_actions" ADD COLUMN "type" "enum__posts_v_blocks_content_actions_type" DEFAULT 'reference';
  ALTER TABLE "_posts_v_blocks_content_actions" ADD COLUMN "new_tab" boolean;
  ALTER TABLE "_posts_v_blocks_content_actions" ADD COLUMN "url" varchar;
  ALTER TABLE "_posts_v_blocks_content_actions" ADD COLUMN "custom_page" "enum__posts_v_blocks_content_actions_custom_page";
  ALTER TABLE "_posts_v_blocks_content_actions" ADD COLUMN "label" varchar;
  ALTER TABLE "_posts_v_blocks_content_actions" ADD COLUMN "appearance" "enum__posts_v_blocks_content_actions_appearance" DEFAULT 'default';
  ALTER TABLE "_posts_v_blocks_cta_band_actions" ADD COLUMN "type" "enum__posts_v_blocks_cta_band_actions_type" DEFAULT 'reference';
  ALTER TABLE "_posts_v_blocks_cta_band_actions" ADD COLUMN "new_tab" boolean;
  ALTER TABLE "_posts_v_blocks_cta_band_actions" ADD COLUMN "url" varchar;
  ALTER TABLE "_posts_v_blocks_cta_band_actions" ADD COLUMN "custom_page" "enum__posts_v_blocks_cta_band_actions_custom_page";
  ALTER TABLE "_posts_v_blocks_cta_band_actions" ADD COLUMN "label" varchar;
  ALTER TABLE "_posts_v_blocks_cta_band_actions" ADD COLUMN "appearance" "enum__posts_v_blocks_cta_band_actions_appearance" DEFAULT 'default';
  ALTER TABLE "header_actions" ADD COLUMN "type" "enum_header_actions_type" DEFAULT 'reference';
  ALTER TABLE "header_actions" ADD COLUMN "new_tab" boolean;
  ALTER TABLE "header_actions" ADD COLUMN "url" varchar;
  ALTER TABLE "header_actions" ADD COLUMN "custom_page" "enum_header_actions_custom_page";
  ALTER TABLE "header_actions" ADD COLUMN "label" varchar;
  ALTER TABLE "header_actions" ADD COLUMN "appearance" "enum_header_actions_appearance" DEFAULT 'default';
  ALTER TABLE "_header_v_version_actions" ADD COLUMN "type" "enum__header_v_version_actions_type" DEFAULT 'reference';
  ALTER TABLE "_header_v_version_actions" ADD COLUMN "new_tab" boolean;
  ALTER TABLE "_header_v_version_actions" ADD COLUMN "url" varchar;
  ALTER TABLE "_header_v_version_actions" ADD COLUMN "custom_page" "enum__header_v_version_actions_custom_page";
  ALTER TABLE "_header_v_version_actions" ADD COLUMN "label" varchar;
  ALTER TABLE "_header_v_version_actions" ADD COLUMN "appearance" "enum__header_v_version_actions_appearance" DEFAULT 'default';
  ALTER TABLE "gsec_blocks_content_actions" ADD COLUMN "type" "enum_gsec_blocks_content_actions_type" DEFAULT 'reference';
  ALTER TABLE "gsec_blocks_content_actions" ADD COLUMN "new_tab" boolean;
  ALTER TABLE "gsec_blocks_content_actions" ADD COLUMN "url" varchar;
  ALTER TABLE "gsec_blocks_content_actions" ADD COLUMN "custom_page" "enum_gsec_blocks_content_actions_custom_page";
  ALTER TABLE "gsec_blocks_content_actions" ADD COLUMN "label" varchar;
  ALTER TABLE "gsec_blocks_content_actions" ADD COLUMN "appearance" "enum_gsec_blocks_content_actions_appearance" DEFAULT 'default';
  ALTER TABLE "gsec_blocks_cta_band_actions" ADD COLUMN "type" "enum_gsec_blocks_cta_band_actions_type" DEFAULT 'reference';
  ALTER TABLE "gsec_blocks_cta_band_actions" ADD COLUMN "new_tab" boolean;
  ALTER TABLE "gsec_blocks_cta_band_actions" ADD COLUMN "url" varchar;
  ALTER TABLE "gsec_blocks_cta_band_actions" ADD COLUMN "custom_page" "enum_gsec_blocks_cta_band_actions_custom_page";
  ALTER TABLE "gsec_blocks_cta_band_actions" ADD COLUMN "label" varchar;
  ALTER TABLE "gsec_blocks_cta_band_actions" ADD COLUMN "appearance" "enum_gsec_blocks_cta_band_actions_appearance" DEFAULT 'default';
  ALTER TABLE "_gsec_v_blocks_content_actions" ADD COLUMN "type" "enum__gsec_v_blocks_content_actions_type" DEFAULT 'reference';
  ALTER TABLE "_gsec_v_blocks_content_actions" ADD COLUMN "new_tab" boolean;
  ALTER TABLE "_gsec_v_blocks_content_actions" ADD COLUMN "url" varchar;
  ALTER TABLE "_gsec_v_blocks_content_actions" ADD COLUMN "custom_page" "enum__gsec_v_blocks_content_actions_custom_page";
  ALTER TABLE "_gsec_v_blocks_content_actions" ADD COLUMN "label" varchar;
  ALTER TABLE "_gsec_v_blocks_content_actions" ADD COLUMN "appearance" "enum__gsec_v_blocks_content_actions_appearance" DEFAULT 'default';
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" ADD COLUMN "type" "enum__gsec_v_blocks_cta_band_actions_type" DEFAULT 'reference';
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" ADD COLUMN "new_tab" boolean;
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" ADD COLUMN "url" varchar;
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" ADD COLUMN "custom_page" "enum__gsec_v_blocks_cta_band_actions_custom_page";
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" ADD COLUMN "label" varchar;
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" ADD COLUMN "appearance" "enum__gsec_v_blocks_cta_band_actions_appearance" DEFAULT 'default';
  ALTER TABLE "presets_blocks_hero_actions" ADD COLUMN "type" "enum_presets_blocks_hero_actions_type" DEFAULT 'reference';
  ALTER TABLE "presets_blocks_hero_actions" ADD COLUMN "new_tab" boolean;
  ALTER TABLE "presets_blocks_hero_actions" ADD COLUMN "url" varchar;
  ALTER TABLE "presets_blocks_hero_actions" ADD COLUMN "custom_page" "enum_presets_blocks_hero_actions_custom_page";
  ALTER TABLE "presets_blocks_hero_actions" ADD COLUMN "label" varchar;
  ALTER TABLE "presets_blocks_hero_actions" ADD COLUMN "appearance" "enum_presets_blocks_hero_actions_appearance" DEFAULT 'default';
  ALTER TABLE "presets_blocks_content_actions" ADD COLUMN "type" "enum_presets_blocks_content_actions_type" DEFAULT 'reference';
  ALTER TABLE "presets_blocks_content_actions" ADD COLUMN "new_tab" boolean;
  ALTER TABLE "presets_blocks_content_actions" ADD COLUMN "url" varchar;
  ALTER TABLE "presets_blocks_content_actions" ADD COLUMN "custom_page" "enum_presets_blocks_content_actions_custom_page";
  ALTER TABLE "presets_blocks_content_actions" ADD COLUMN "label" varchar;
  ALTER TABLE "presets_blocks_content_actions" ADD COLUMN "appearance" "enum_presets_blocks_content_actions_appearance" DEFAULT 'default';
  ALTER TABLE "presets_blocks_cta_band_actions" ADD COLUMN "type" "enum_presets_blocks_cta_band_actions_type" DEFAULT 'reference';
  ALTER TABLE "presets_blocks_cta_band_actions" ADD COLUMN "new_tab" boolean;
  ALTER TABLE "presets_blocks_cta_band_actions" ADD COLUMN "url" varchar;
  ALTER TABLE "presets_blocks_cta_band_actions" ADD COLUMN "custom_page" "enum_presets_blocks_cta_band_actions_custom_page";
  ALTER TABLE "presets_blocks_cta_band_actions" ADD COLUMN "label" varchar;
  ALTER TABLE "presets_blocks_cta_band_actions" ADD COLUMN "appearance" "enum_presets_blocks_cta_band_actions_appearance" DEFAULT 'default';`)
  await db.execute(sql.raw(copyColumns('down')))
  await db.execute(sql.raw(moveRelationshipPaths('down')))
  // Generated: the `link_*` columns and their enums go.
  await db.execute(sql`
  ALTER TABLE "page_blocks_hero_actions" DROP COLUMN "link_type";
  ALTER TABLE "page_blocks_hero_actions" DROP COLUMN "link_new_tab";
  ALTER TABLE "page_blocks_hero_actions" DROP COLUMN "link_url";
  ALTER TABLE "page_blocks_hero_actions" DROP COLUMN "link_custom_page";
  ALTER TABLE "page_blocks_hero_actions" DROP COLUMN "link_label";
  ALTER TABLE "page_blocks_hero_actions" DROP COLUMN "link_appearance";
  ALTER TABLE "page_blocks_content_actions" DROP COLUMN "link_type";
  ALTER TABLE "page_blocks_content_actions" DROP COLUMN "link_new_tab";
  ALTER TABLE "page_blocks_content_actions" DROP COLUMN "link_url";
  ALTER TABLE "page_blocks_content_actions" DROP COLUMN "link_custom_page";
  ALTER TABLE "page_blocks_content_actions" DROP COLUMN "link_label";
  ALTER TABLE "page_blocks_content_actions" DROP COLUMN "link_appearance";
  ALTER TABLE "page_blocks_cta_band_actions" DROP COLUMN "link_type";
  ALTER TABLE "page_blocks_cta_band_actions" DROP COLUMN "link_new_tab";
  ALTER TABLE "page_blocks_cta_band_actions" DROP COLUMN "link_url";
  ALTER TABLE "page_blocks_cta_band_actions" DROP COLUMN "link_custom_page";
  ALTER TABLE "page_blocks_cta_band_actions" DROP COLUMN "link_label";
  ALTER TABLE "page_blocks_cta_band_actions" DROP COLUMN "link_appearance";
  ALTER TABLE "_page_v_blocks_hero_actions" DROP COLUMN "link_type";
  ALTER TABLE "_page_v_blocks_hero_actions" DROP COLUMN "link_new_tab";
  ALTER TABLE "_page_v_blocks_hero_actions" DROP COLUMN "link_url";
  ALTER TABLE "_page_v_blocks_hero_actions" DROP COLUMN "link_custom_page";
  ALTER TABLE "_page_v_blocks_hero_actions" DROP COLUMN "link_label";
  ALTER TABLE "_page_v_blocks_hero_actions" DROP COLUMN "link_appearance";
  ALTER TABLE "_page_v_blocks_content_actions" DROP COLUMN "link_type";
  ALTER TABLE "_page_v_blocks_content_actions" DROP COLUMN "link_new_tab";
  ALTER TABLE "_page_v_blocks_content_actions" DROP COLUMN "link_url";
  ALTER TABLE "_page_v_blocks_content_actions" DROP COLUMN "link_custom_page";
  ALTER TABLE "_page_v_blocks_content_actions" DROP COLUMN "link_label";
  ALTER TABLE "_page_v_blocks_content_actions" DROP COLUMN "link_appearance";
  ALTER TABLE "_page_v_blocks_cta_band_actions" DROP COLUMN "link_type";
  ALTER TABLE "_page_v_blocks_cta_band_actions" DROP COLUMN "link_new_tab";
  ALTER TABLE "_page_v_blocks_cta_band_actions" DROP COLUMN "link_url";
  ALTER TABLE "_page_v_blocks_cta_band_actions" DROP COLUMN "link_custom_page";
  ALTER TABLE "_page_v_blocks_cta_band_actions" DROP COLUMN "link_label";
  ALTER TABLE "_page_v_blocks_cta_band_actions" DROP COLUMN "link_appearance";
  ALTER TABLE "posts_blocks_content_actions" DROP COLUMN "link_type";
  ALTER TABLE "posts_blocks_content_actions" DROP COLUMN "link_new_tab";
  ALTER TABLE "posts_blocks_content_actions" DROP COLUMN "link_url";
  ALTER TABLE "posts_blocks_content_actions" DROP COLUMN "link_custom_page";
  ALTER TABLE "posts_blocks_content_actions" DROP COLUMN "link_label";
  ALTER TABLE "posts_blocks_content_actions" DROP COLUMN "link_appearance";
  ALTER TABLE "posts_blocks_cta_band_actions" DROP COLUMN "link_type";
  ALTER TABLE "posts_blocks_cta_band_actions" DROP COLUMN "link_new_tab";
  ALTER TABLE "posts_blocks_cta_band_actions" DROP COLUMN "link_url";
  ALTER TABLE "posts_blocks_cta_band_actions" DROP COLUMN "link_custom_page";
  ALTER TABLE "posts_blocks_cta_band_actions" DROP COLUMN "link_label";
  ALTER TABLE "posts_blocks_cta_band_actions" DROP COLUMN "link_appearance";
  ALTER TABLE "_posts_v_blocks_content_actions" DROP COLUMN "link_type";
  ALTER TABLE "_posts_v_blocks_content_actions" DROP COLUMN "link_new_tab";
  ALTER TABLE "_posts_v_blocks_content_actions" DROP COLUMN "link_url";
  ALTER TABLE "_posts_v_blocks_content_actions" DROP COLUMN "link_custom_page";
  ALTER TABLE "_posts_v_blocks_content_actions" DROP COLUMN "link_label";
  ALTER TABLE "_posts_v_blocks_content_actions" DROP COLUMN "link_appearance";
  ALTER TABLE "_posts_v_blocks_cta_band_actions" DROP COLUMN "link_type";
  ALTER TABLE "_posts_v_blocks_cta_band_actions" DROP COLUMN "link_new_tab";
  ALTER TABLE "_posts_v_blocks_cta_band_actions" DROP COLUMN "link_url";
  ALTER TABLE "_posts_v_blocks_cta_band_actions" DROP COLUMN "link_custom_page";
  ALTER TABLE "_posts_v_blocks_cta_band_actions" DROP COLUMN "link_label";
  ALTER TABLE "_posts_v_blocks_cta_band_actions" DROP COLUMN "link_appearance";
  ALTER TABLE "header_actions" DROP COLUMN "link_type";
  ALTER TABLE "header_actions" DROP COLUMN "link_new_tab";
  ALTER TABLE "header_actions" DROP COLUMN "link_url";
  ALTER TABLE "header_actions" DROP COLUMN "link_custom_page";
  ALTER TABLE "header_actions" DROP COLUMN "link_label";
  ALTER TABLE "header_actions" DROP COLUMN "link_appearance";
  ALTER TABLE "_header_v_version_actions" DROP COLUMN "link_type";
  ALTER TABLE "_header_v_version_actions" DROP COLUMN "link_new_tab";
  ALTER TABLE "_header_v_version_actions" DROP COLUMN "link_url";
  ALTER TABLE "_header_v_version_actions" DROP COLUMN "link_custom_page";
  ALTER TABLE "_header_v_version_actions" DROP COLUMN "link_label";
  ALTER TABLE "_header_v_version_actions" DROP COLUMN "link_appearance";
  ALTER TABLE "gsec_blocks_content_actions" DROP COLUMN "link_type";
  ALTER TABLE "gsec_blocks_content_actions" DROP COLUMN "link_new_tab";
  ALTER TABLE "gsec_blocks_content_actions" DROP COLUMN "link_url";
  ALTER TABLE "gsec_blocks_content_actions" DROP COLUMN "link_custom_page";
  ALTER TABLE "gsec_blocks_content_actions" DROP COLUMN "link_label";
  ALTER TABLE "gsec_blocks_content_actions" DROP COLUMN "link_appearance";
  ALTER TABLE "gsec_blocks_cta_band_actions" DROP COLUMN "link_type";
  ALTER TABLE "gsec_blocks_cta_band_actions" DROP COLUMN "link_new_tab";
  ALTER TABLE "gsec_blocks_cta_band_actions" DROP COLUMN "link_url";
  ALTER TABLE "gsec_blocks_cta_band_actions" DROP COLUMN "link_custom_page";
  ALTER TABLE "gsec_blocks_cta_band_actions" DROP COLUMN "link_label";
  ALTER TABLE "gsec_blocks_cta_band_actions" DROP COLUMN "link_appearance";
  ALTER TABLE "_gsec_v_blocks_content_actions" DROP COLUMN "link_type";
  ALTER TABLE "_gsec_v_blocks_content_actions" DROP COLUMN "link_new_tab";
  ALTER TABLE "_gsec_v_blocks_content_actions" DROP COLUMN "link_url";
  ALTER TABLE "_gsec_v_blocks_content_actions" DROP COLUMN "link_custom_page";
  ALTER TABLE "_gsec_v_blocks_content_actions" DROP COLUMN "link_label";
  ALTER TABLE "_gsec_v_blocks_content_actions" DROP COLUMN "link_appearance";
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" DROP COLUMN "link_type";
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" DROP COLUMN "link_new_tab";
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" DROP COLUMN "link_url";
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" DROP COLUMN "link_custom_page";
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" DROP COLUMN "link_label";
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" DROP COLUMN "link_appearance";
  ALTER TABLE "presets_blocks_hero_actions" DROP COLUMN "link_type";
  ALTER TABLE "presets_blocks_hero_actions" DROP COLUMN "link_new_tab";
  ALTER TABLE "presets_blocks_hero_actions" DROP COLUMN "link_url";
  ALTER TABLE "presets_blocks_hero_actions" DROP COLUMN "link_custom_page";
  ALTER TABLE "presets_blocks_hero_actions" DROP COLUMN "link_label";
  ALTER TABLE "presets_blocks_hero_actions" DROP COLUMN "link_appearance";
  ALTER TABLE "presets_blocks_content_actions" DROP COLUMN "link_type";
  ALTER TABLE "presets_blocks_content_actions" DROP COLUMN "link_new_tab";
  ALTER TABLE "presets_blocks_content_actions" DROP COLUMN "link_url";
  ALTER TABLE "presets_blocks_content_actions" DROP COLUMN "link_custom_page";
  ALTER TABLE "presets_blocks_content_actions" DROP COLUMN "link_label";
  ALTER TABLE "presets_blocks_content_actions" DROP COLUMN "link_appearance";
  ALTER TABLE "presets_blocks_cta_band_actions" DROP COLUMN "link_type";
  ALTER TABLE "presets_blocks_cta_band_actions" DROP COLUMN "link_new_tab";
  ALTER TABLE "presets_blocks_cta_band_actions" DROP COLUMN "link_url";
  ALTER TABLE "presets_blocks_cta_band_actions" DROP COLUMN "link_custom_page";
  ALTER TABLE "presets_blocks_cta_band_actions" DROP COLUMN "link_label";
  ALTER TABLE "presets_blocks_cta_band_actions" DROP COLUMN "link_appearance";
  DROP TYPE "public"."enum_page_blocks_hero_actions_link_type";
  DROP TYPE "public"."enum_page_blocks_hero_actions_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_hero_actions_link_appearance";
  DROP TYPE "public"."enum_page_blocks_content_actions_link_type";
  DROP TYPE "public"."enum_page_blocks_content_actions_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_content_actions_link_appearance";
  DROP TYPE "public"."enum_page_blocks_cta_band_actions_link_type";
  DROP TYPE "public"."enum_page_blocks_cta_band_actions_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_cta_band_actions_link_appearance";
  DROP TYPE "public"."enum__page_v_blocks_hero_actions_link_type";
  DROP TYPE "public"."enum__page_v_blocks_hero_actions_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_hero_actions_link_appearance";
  DROP TYPE "public"."enum__page_v_blocks_content_actions_link_type";
  DROP TYPE "public"."enum__page_v_blocks_content_actions_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_content_actions_link_appearance";
  DROP TYPE "public"."enum__page_v_blocks_cta_band_actions_link_type";
  DROP TYPE "public"."enum__page_v_blocks_cta_band_actions_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_cta_band_actions_link_appearance";
  DROP TYPE "public"."enum_posts_blocks_content_actions_link_type";
  DROP TYPE "public"."enum_posts_blocks_content_actions_link_custom_page";
  DROP TYPE "public"."enum_posts_blocks_content_actions_link_appearance";
  DROP TYPE "public"."enum_posts_blocks_cta_band_actions_link_type";
  DROP TYPE "public"."enum_posts_blocks_cta_band_actions_link_custom_page";
  DROP TYPE "public"."enum_posts_blocks_cta_band_actions_link_appearance";
  DROP TYPE "public"."enum__posts_v_blocks_content_actions_link_type";
  DROP TYPE "public"."enum__posts_v_blocks_content_actions_link_custom_page";
  DROP TYPE "public"."enum__posts_v_blocks_content_actions_link_appearance";
  DROP TYPE "public"."enum__posts_v_blocks_cta_band_actions_link_type";
  DROP TYPE "public"."enum__posts_v_blocks_cta_band_actions_link_custom_page";
  DROP TYPE "public"."enum__posts_v_blocks_cta_band_actions_link_appearance";
  DROP TYPE "public"."enum_header_actions_link_type";
  DROP TYPE "public"."enum_header_actions_link_custom_page";
  DROP TYPE "public"."enum_header_actions_link_appearance";
  DROP TYPE "public"."enum__header_v_version_actions_link_type";
  DROP TYPE "public"."enum__header_v_version_actions_link_custom_page";
  DROP TYPE "public"."enum__header_v_version_actions_link_appearance";
  DROP TYPE "public"."enum_gsec_blocks_content_actions_link_type";
  DROP TYPE "public"."enum_gsec_blocks_content_actions_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_content_actions_link_appearance";
  DROP TYPE "public"."enum_gsec_blocks_cta_band_actions_link_type";
  DROP TYPE "public"."enum_gsec_blocks_cta_band_actions_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_cta_band_actions_link_appearance";
  DROP TYPE "public"."enum__gsec_v_blocks_content_actions_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_content_actions_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_content_actions_link_appearance";
  DROP TYPE "public"."enum__gsec_v_blocks_cta_band_actions_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_cta_band_actions_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_cta_band_actions_link_appearance";
  DROP TYPE "public"."enum_presets_blocks_hero_actions_link_type";
  DROP TYPE "public"."enum_presets_blocks_hero_actions_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_hero_actions_link_appearance";
  DROP TYPE "public"."enum_presets_blocks_content_actions_link_type";
  DROP TYPE "public"."enum_presets_blocks_content_actions_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_content_actions_link_appearance";
  DROP TYPE "public"."enum_presets_blocks_cta_band_actions_link_type";
  DROP TYPE "public"."enum_presets_blocks_cta_band_actions_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_cta_band_actions_link_appearance";`)
}
