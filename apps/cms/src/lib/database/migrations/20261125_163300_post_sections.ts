import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Posts: the fixed "FAQ" and "Call to action" groups become an optional, localized "Sections" blocks
// field (`blocks`) offering the page section blocks. Runs after editor_friendly_choices and
// standard_link_field, so the posts' section tables are created here directly in their final shape
// (grid-level card style, `link_*` button columns).
//
// What visitors saw is carried over, per post and locale, for the live rows and every version/draft:
// - The old groups were localized field by field, and a non-default locale fell back to English for
//   each empty field (an empty Spanish CTA title showed the English one, Spanish without CTA buttons
//   showed the English buttons). The new blocks field is localized as a whole, so a locale that had any
//   FAQ/CTA content of its own gets blocks built from those fallbacks. A locale without any (only the
//   default locale's) gets no blocks and keeps falling back to the English sections as a whole.
// - FAQ -> an `faq` block when there are questions (the page only showed the FAQ then).
// - CTA -> a `ctaBand` block (after the FAQ) when it has a title or buttons. A CTA without a title was
//   not shown, so it moves hidden (`_hidden`). It keeps the post page's look: default section look,
//   large space above and below.
// - CTA buttons keep their page/post links: `*_rels.path` `cta.actions.N.reference` ->
//   `blocks.K.actions.N.link.reference` (and the same under `version.` for versions).
// Down moves the first FAQ block and the first CTA band block of each post/locale back into the
// groups; other sections added since have no place in the old shape and are dropped.

const DEFAULT_LOCALE = 'en'
/** Locales at the time of this migration (`src/lib/config/i18n.ts`). */
const LOCALES = ['en', 'es'] as const

interface Variant {
  /** Table that owns the rows: `posts` or `_posts_v`. */
  parent: string
  /** `posts_locales` / `_posts_v_locales` and its column prefix for group fields. */
  locales: string
  col: string
  /** Legacy array tables. */
  faqItems: string
  ctaActions: string
  /** New block tables. */
  blocks: string
  rels: string
  /** Data path prefix: '' for live rows, 'version.' for versions. */
  path: string
  /** Versions use serial ids and keep a `_uuid`; live rows use varchar ids. */
  isVersion: boolean
}

const LIVE: Variant = {
  parent: 'posts',
  locales: 'posts_locales',
  col: '',
  faqItems: 'posts_faq_items',
  ctaActions: 'posts_cta_actions',
  blocks: 'posts_blocks',
  rels: 'posts_rels',
  path: '',
  isVersion: false,
}

const VERSIONS: Variant = {
  parent: '_posts_v',
  locales: '_posts_v_locales',
  col: 'version_',
  faqItems: '_posts_v_version_faq_items',
  ctaActions: '_posts_v_version_cta_actions',
  blocks: '_posts_v_blocks',
  rels: '_posts_v_rels',
  path: 'version.',
  isVersion: true,
}

const HEADING_FIELDS = ['eyebrow', 'title', 'description'] as const
const NEW_ID = `substr(md5(random()::text || clock_timestamp()::text), 1, 24)`
const localeList = LOCALES.map((locale) => `('${locale}')`).join(', ')

/** Old group heading field -> value shown for the locale (empty -> the default locale's value). */
function effective(v: Variant, group: 'faq' | 'cta', field: string): string {
  const column = `"${v.col}${group}_heading_${field}"`
  return `CASE WHEN k."locale" = '${DEFAULT_LOCALE}' THEN o.${column}
      ELSE coalesce(nullif(o.${column}, ''), d.${column}) END AS "${group}_${field}"`
}

function ownHeading(v: Variant): string {
  return (['faq', 'cta'] as const)
    .flatMap((group) => HEADING_FIELDS.map((field) => `coalesce(btrim(o."${v.col}${group}_heading_${field}"), '') <> ''`))
    .join(' OR ')
}

function moveUp(v: Variant): string {
  const tmp = `"tmp_${v.parent}_sections"`
  const blockId = v.isVersion
    ? (table: string) => `nextval(pg_get_serial_sequence('"${v.blocks}_${table}"', 'id'))`
    : () => NEW_ID
  const uuid = v.isVersion ? `, "_uuid"` : ''
  const uuidValue = v.isVersion ? `, ${NEW_ID}` : ''
  // Rows copied from the default locale get new ids; a locale's own rows keep theirs (live rows).
  const itemId = (alias: string, from: string) =>
    v.isVersion ? '' : `CASE WHEN s."${from}" = s."locale" THEN ${alias}."id" ELSE ${NEW_ID} END, `
  const itemIdColumn = v.isVersion ? '' : `"id", `
  const itemUuid = (alias: string) => (v.isVersion ? `, ${alias}."_uuid"` : '')

  return `
  CREATE TEMP TABLE ${tmp} AS
  SELECT k."parent_id", k."locale",
    ${(['faq', 'cta'] as const).flatMap((group) => HEADING_FIELDS.map((field) => effective(v, group, field))).join(',\n    ')},
    k."locale" = '${DEFAULT_LOCALE}' OR ${ownHeading(v)}
      OR EXISTS (SELECT 1 FROM "${v.faqItems}" i WHERE i."_parent_id" = k."parent_id" AND i."_locale" = k."locale")
      OR EXISTS (SELECT 1 FROM "${v.ctaActions}" a WHERE a."_parent_id" = k."parent_id" AND a."_locale" = k."locale") AS "own",
    CASE WHEN EXISTS (SELECT 1 FROM "${v.faqItems}" i WHERE i."_parent_id" = k."parent_id" AND i."_locale" = k."locale")
      THEN k."locale" ELSE '${DEFAULT_LOCALE}'::"_locales" END AS "faq_from",
    CASE WHEN EXISTS (SELECT 1 FROM "${v.ctaActions}" a WHERE a."_parent_id" = k."parent_id" AND a."_locale" = k."locale")
      THEN k."locale" ELSE '${DEFAULT_LOCALE}'::"_locales" END AS "cta_from"
  FROM (SELECT p."id" AS "parent_id", l."code"::"_locales" AS "locale" FROM "${v.parent}" p CROSS JOIN (VALUES ${localeList}) AS l("code")) AS k
  LEFT JOIN "${v.locales}" o ON o."_parent_id" = k."parent_id" AND o."_locale" = k."locale"
  LEFT JOIN "${v.locales}" d ON d."_parent_id" = k."parent_id" AND d."_locale" = '${DEFAULT_LOCALE}';

  -- Only locales with content of their own (and the default locale) get blocks.
  DELETE FROM ${tmp} WHERE NOT "own";
  ALTER TABLE ${tmp} ADD COLUMN "has_faq" boolean, ADD COLUMN "cta_visible" boolean, ADD COLUMN "has_cta_actions" boolean;
  UPDATE ${tmp} s SET
    "has_faq" = EXISTS (SELECT 1 FROM "${v.faqItems}" i WHERE i."_parent_id" = s."parent_id" AND i."_locale" = s."faq_from"),
    "cta_visible" = coalesce(btrim(s."cta_title"), '') <> '',
    "has_cta_actions" = EXISTS (SELECT 1 FROM "${v.ctaActions}" a WHERE a."_parent_id" = s."parent_id" AND a."_locale" = s."cta_from");
  ALTER TABLE ${tmp} ADD COLUMN "faq_block_id" text, ADD COLUMN "cta_block_id" text, ADD COLUMN "cta_order" integer;
  UPDATE ${tmp} SET
    "faq_block_id" = CASE WHEN "has_faq" THEN (${blockId('faq')})::text END,
    "cta_block_id" = CASE WHEN "cta_visible" OR "has_cta_actions" THEN (${blockId('cta_band')})::text END,
    "cta_order" = CASE WHEN "has_faq" THEN 2 ELSE 1 END;

  INSERT INTO "${v.blocks}_faq" ("_order", "_parent_id", "_path", "_locale", "id", "heading_eyebrow", "heading_title", "heading_description"${uuid})
  SELECT 1, "parent_id", '${v.path}blocks', "locale", "faq_block_id"${v.isVersion ? '::int' : ''}, "faq_eyebrow", "faq_title", "faq_description"${uuidValue}
  FROM ${tmp} WHERE "faq_block_id" IS NOT NULL;

  INSERT INTO "${v.blocks}_faq_items" ("_order", "_parent_id", "_locale", ${itemIdColumn}"question", "answer"${uuid})
  SELECT i."_order", s."faq_block_id"${v.isVersion ? '::int' : ''}, s."locale", ${itemId('i', 'faq_from')}i."question", i."answer"${itemUuid('i')}
  FROM "${v.faqItems}" i
  JOIN ${tmp} s ON s."parent_id" = i."_parent_id" AND s."faq_from" = i."_locale"
  WHERE s."faq_block_id" IS NOT NULL;

  INSERT INTO "${v.blocks}_cta_band" ("_order", "_parent_id", "_path", "_locale", "id", "heading_eyebrow", "heading_title", "heading_description", "section_padding_y", "_hidden"${uuid})
  SELECT "cta_order", "parent_id", '${v.path}blocks', "locale", "cta_block_id"${v.isVersion ? '::int' : ''}, "cta_eyebrow", "cta_title", "cta_description", 'large', NOT "cta_visible"${uuidValue}
  FROM ${tmp} WHERE "cta_block_id" IS NOT NULL;

  INSERT INTO "${v.blocks}_cta_band_actions" ("_order", "_parent_id", "_locale", ${itemIdColumn}"link_type", "link_new_tab", "link_url", "link_custom_page", "link_label", "link_appearance"${uuid})
  SELECT a."_order", s."cta_block_id"${v.isVersion ? '::int' : ''}, s."locale", ${itemId('a', 'cta_from')}
    a."type"::text::"enum_${v.blocks}_cta_band_actions_link_type", a."new_tab", a."url",
    a."custom_page"::text::"enum_${v.blocks}_cta_band_actions_link_custom_page", a."label",
    a."appearance"::text::"enum_${v.blocks}_cta_band_actions_link_appearance"${itemUuid('a')}
  FROM "${v.ctaActions}" a
  JOIN ${tmp} s ON s."parent_id" = a."_parent_id" AND s."cta_from" = a."_locale"
  WHERE s."cta_block_id" IS NOT NULL;

  -- Page/post links of the CTA buttons live in the rels table, addressed by path and locale.
  INSERT INTO "${v.rels}" ("order", "parent_id", "path", "locale", "categories_id", "authors_id", "posts_id", "page_id")
  SELECT r."order", r."parent_id",
    '${v.path}blocks.' || (s."cta_order" - 1) || '.actions.' || substring(r."path" FROM '^${v.path.replace('.', '[.]')}cta[.]actions[.]([0-9]+)[.]reference$') || '.link.reference',
    s."locale", r."categories_id", r."authors_id", r."posts_id", r."page_id"
  FROM "${v.rels}" r
  JOIN ${tmp} s ON s."parent_id" = r."parent_id" AND s."cta_from" = r."locale"
  WHERE s."cta_block_id" IS NOT NULL AND r."path" ~ '^${v.path.replace('.', '[.]')}cta[.]actions[.][0-9]+[.]reference$';
  DELETE FROM "${v.rels}" WHERE "path" LIKE '${v.path}cta.%' OR "path" LIKE '${v.path}faq.%';

  DROP TABLE ${tmp};`
}

function moveDown(v: Variant): string {
  const faq = `"tmp_${v.parent}_faq"`
  const cta = `"tmp_${v.parent}_cta"`
  const keepId = v.isVersion ? '' : `"id", `
  const keepIdValue = (alias: string) => (v.isVersion ? '' : `${alias}."id", `)
  const uuid = v.isVersion ? `, "_uuid"` : ''
  const uuidValue = (alias: string) => (v.isVersion ? `, ${alias}."_uuid"` : '')
  const actions = v.isVersion ? `enum__posts_v_version_cta_actions` : `enum_posts_cta_actions`
  const p = v.path.replace('.', '[.]')
  return `
  CREATE TEMP TABLE ${faq} AS
  SELECT DISTINCT ON ("_parent_id", "_locale") * FROM "${v.blocks}_faq" ORDER BY "_parent_id", "_locale", "_order";
  CREATE TEMP TABLE ${cta} AS
  SELECT DISTINCT ON ("_parent_id", "_locale") * FROM "${v.blocks}_cta_band" ORDER BY "_parent_id", "_locale", "_order";

  INSERT INTO "${v.locales}" ("_parent_id", "_locale")
  SELECT DISTINCT b."_parent_id", b."_locale" FROM (SELECT "_parent_id", "_locale" FROM ${faq} UNION SELECT "_parent_id", "_locale" FROM ${cta}) b
  WHERE NOT EXISTS (SELECT 1 FROM "${v.locales}" l WHERE l."_parent_id" = b."_parent_id" AND l."_locale" = b."_locale");

  UPDATE "${v.locales}" l SET
    "${v.col}faq_heading_eyebrow" = f."heading_eyebrow", "${v.col}faq_heading_title" = f."heading_title", "${v.col}faq_heading_description" = f."heading_description"
  FROM ${faq} f WHERE f."_parent_id" = l."_parent_id" AND f."_locale" = l."_locale";
  UPDATE "${v.locales}" l SET
    "${v.col}cta_heading_eyebrow" = c."heading_eyebrow", "${v.col}cta_heading_title" = c."heading_title", "${v.col}cta_heading_description" = c."heading_description"
  FROM ${cta} c WHERE c."_parent_id" = l."_parent_id" AND c."_locale" = l."_locale";

  INSERT INTO "${v.faqItems}" ("_order", "_parent_id", "_locale", ${keepId}"question", "answer"${uuid})
  SELECT i."_order", f."_parent_id", i."_locale", ${keepIdValue('i')}i."question", i."answer"${uuidValue('i')}
  FROM "${v.blocks}_faq_items" i JOIN ${faq} f ON f."id" = i."_parent_id" AND f."_locale" = i."_locale";

  INSERT INTO "${v.ctaActions}" ("_order", "_parent_id", "_locale", ${keepId}"type", "new_tab", "url", "custom_page", "label", "appearance"${uuid})
  SELECT a."_order", c."_parent_id", a."_locale", ${keepIdValue('a')}
    a."link_type"::text::"${actions}_type", a."link_new_tab", a."link_url",
    a."link_custom_page"::text::"${actions}_custom_page", a."link_label",
    a."link_appearance"::text::"${actions}_appearance"${uuidValue('a')}
  FROM "${v.blocks}_cta_band_actions" a JOIN ${cta} c ON c."id" = a."_parent_id" AND c."_locale" = a."_locale";

  UPDATE "${v.rels}" r
  SET "path" = '${v.path}cta.actions.' || substring(r."path" FROM '^${p}blocks[.][0-9]+[.]actions[.]([0-9]+)[.]link[.]reference$') || '.reference'
  FROM ${cta} c
  WHERE r."parent_id" = c."_parent_id" AND r."locale" = c."_locale"
    AND r."path" ~ ('^${p}blocks[.]' || (c."_order" - 1) || '[.]actions[.][0-9]+[.]link[.]reference$');
  DELETE FROM "${v.rels}" WHERE "path" LIKE '${v.path}blocks.%';

  DROP TABLE ${faq};
  DROP TABLE ${cta};`
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Generated: the posts' section tables.
  await db.execute(sql`
  CREATE TYPE "public"."enum_posts_blocks_content_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_posts_blocks_content_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_posts_blocks_content_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_posts_blocks_content_layout" AS ENUM('stacked', 'image-text', 'text-image');
  CREATE TYPE "public"."enum_posts_blocks_content_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_posts_blocks_content_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_content_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_posts_blocks_content_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_faq_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_posts_blocks_faq_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_faq_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_posts_blocks_faq_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_testimonials_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_posts_blocks_testimonials_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_testimonials_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_posts_blocks_testimonials_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_items_icon" AS ENUM('map', 'clock', 'zap', 'activity', 'layout-grid', 'sparkles', 'file-text', 'users', 'bar-chart-3', 'plug', 'shield', 'git-branch', 'gauge', 'bell', 'layers', 'workflow', 'calendar', 'compass', 'target', 'wand-2');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '3/4', 'auto');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_items_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_background_color" AS ENUM('none', 'light-gray', 'dark', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_carousel_effect" AS ENUM('slide', 'fade');
  CREATE TYPE "public"."enum_posts_blocks_carousel_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_posts_blocks_carousel_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_carousel_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_posts_blocks_carousel_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_logos_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_posts_blocks_logos_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_posts_blocks_logos_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_posts_blocks_logos_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_posts_blocks_logos_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_logos_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_posts_blocks_logos_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_chart_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_posts_blocks_chart_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_chart_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_posts_blocks_chart_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_cta_band_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_posts_blocks_cta_band_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_posts_blocks_cta_band_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_posts_blocks_cta_band_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_posts_blocks_cta_band_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_cta_band_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_posts_blocks_cta_band_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_newsletter_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_posts_blocks_newsletter_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_newsletter_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_posts_blocks_newsletter_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_stats_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_posts_blocks_stats_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_stats_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_posts_blocks_stats_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_raw_html_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_posts_blocks_raw_html_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_raw_html_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_posts_blocks_raw_html_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_content_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__posts_v_blocks_content_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__posts_v_blocks_content_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__posts_v_blocks_content_layout" AS ENUM('stacked', 'image-text', 'text-image');
  CREATE TYPE "public"."enum__posts_v_blocks_content_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__posts_v_blocks_content_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_content_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__posts_v_blocks_content_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_faq_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__posts_v_blocks_faq_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_faq_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__posts_v_blocks_faq_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_testimonials_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__posts_v_blocks_testimonials_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_testimonials_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__posts_v_blocks_testimonials_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_items_icon" AS ENUM('map', 'clock', 'zap', 'activity', 'layout-grid', 'sparkles', 'file-text', 'users', 'bar-chart-3', 'plug', 'shield', 'git-branch', 'gauge', 'bell', 'layers', 'workflow', 'calendar', 'compass', 'target', 'wand-2');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '3/4', 'auto');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_items_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_columns" AS ENUM('1', '2', '3', '4');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_background_color" AS ENUM('none', 'light-gray', 'dark', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_carousel_effect" AS ENUM('slide', 'fade');
  CREATE TYPE "public"."enum__posts_v_blocks_carousel_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__posts_v_blocks_carousel_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_carousel_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__posts_v_blocks_carousel_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_logos_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__posts_v_blocks_logos_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__posts_v_blocks_logos_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum__posts_v_blocks_logos_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__posts_v_blocks_logos_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_logos_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__posts_v_blocks_logos_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_chart_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__posts_v_blocks_chart_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_chart_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__posts_v_blocks_chart_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_cta_band_actions_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__posts_v_blocks_cta_band_actions_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__posts_v_blocks_cta_band_actions_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__posts_v_blocks_cta_band_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__posts_v_blocks_cta_band_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_cta_band_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__posts_v_blocks_cta_band_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_newsletter_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__posts_v_blocks_newsletter_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_newsletter_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__posts_v_blocks_newsletter_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_stats_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__posts_v_blocks_stats_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_stats_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__posts_v_blocks_stats_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_raw_html_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__posts_v_blocks_raw_html_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_raw_html_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__posts_v_blocks_raw_html_section_padding_x" AS ENUM('none', 'base');
  CREATE TABLE "posts_blocks_content_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_label" varchar,
  	"link_appearance" "enum_posts_blocks_content_actions_link_appearance" DEFAULT 'default',
  	"link_type" "enum_posts_blocks_content_actions_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_custom_page" "enum_posts_blocks_content_actions_link_custom_page",
  	"link_new_tab" boolean
  );
  CREATE TABLE "posts_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading_eyebrow" varchar,
  	"heading_title" varchar,
  	"heading_description" varchar,
  	"content" jsonb,
  	"image_id" integer,
  	"layout" "enum_posts_blocks_content_layout" DEFAULT 'stacked',
  	"section_theme" "enum_posts_blocks_content_section_theme",
  	"section_max_width" "enum_posts_blocks_content_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_posts_blocks_content_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_posts_blocks_content_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  CREATE TABLE "posts_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  CREATE TABLE "posts_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading_eyebrow" varchar,
  	"heading_title" varchar,
  	"heading_description" varchar,
  	"section_theme" "enum_posts_blocks_faq_section_theme",
  	"section_max_width" "enum_posts_blocks_faq_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_posts_blocks_faq_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_posts_blocks_faq_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  CREATE TABLE "posts_blocks_testimonials_list_testimonial_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"testimonial_id" integer
  );
  CREATE TABLE "posts_blocks_testimonials_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading_eyebrow" varchar,
  	"heading_title" varchar,
  	"heading_description" varchar,
  	"show_rating" boolean DEFAULT true,
  	"show_avatar" boolean DEFAULT true,
  	"duration" numeric DEFAULT 60,
  	"section_theme" "enum_posts_blocks_testimonials_list_section_theme",
  	"section_max_width" "enum_posts_blocks_testimonials_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_posts_blocks_testimonials_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_posts_blocks_testimonials_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  CREATE TABLE "posts_blocks_cards_grid_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"icon" "enum_posts_blocks_cards_grid_items_icon",
  	"description" varchar,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum_posts_blocks_cards_grid_items_image_aspect_ratio" DEFAULT '1/1',
  	"link_label" varchar,
  	"link_appearance" "enum_posts_blocks_cards_grid_items_link_appearance" DEFAULT 'default',
  	"link_type" "enum_posts_blocks_cards_grid_items_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_custom_page" "enum_posts_blocks_cards_grid_items_link_custom_page",
  	"link_new_tab" boolean
  );
  CREATE TABLE "posts_blocks_cards_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading_eyebrow" varchar,
  	"heading_title" varchar,
  	"heading_description" varchar,
  	"columns" "enum_posts_blocks_cards_grid_columns" DEFAULT '3',
  	"align_variant" "enum_posts_blocks_cards_grid_align_variant" DEFAULT 'left',
  	"rounded" "enum_posts_blocks_cards_grid_rounded" DEFAULT 'none',
  	"background_color" "enum_posts_blocks_cards_grid_background_color" DEFAULT 'none',
  	"section_theme" "enum_posts_blocks_cards_grid_section_theme",
  	"section_max_width" "enum_posts_blocks_cards_grid_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_posts_blocks_cards_grid_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_posts_blocks_cards_grid_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  CREATE TABLE "posts_blocks_carousel_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_image_id" integer,
  	"text" jsonb
  );
  CREATE TABLE "posts_blocks_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading_eyebrow" varchar,
  	"heading_title" varchar,
  	"heading_description" varchar,
  	"effect" "enum_posts_blocks_carousel_effect" DEFAULT 'slide',
  	"section_theme" "enum_posts_blocks_carousel_section_theme",
  	"section_max_width" "enum_posts_blocks_carousel_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_posts_blocks_carousel_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_posts_blocks_carousel_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  CREATE TABLE "posts_blocks_logos_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_image_id" integer,
  	"link_label" varchar,
  	"link_type" "enum_posts_blocks_logos_items_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_custom_page" "enum_posts_blocks_logos_items_link_custom_page",
  	"link_new_tab" boolean
  );
  CREATE TABLE "posts_blocks_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"align_variant" "enum_posts_blocks_logos_align_variant" DEFAULT 'center',
  	"section_theme" "enum_posts_blocks_logos_section_theme",
  	"section_max_width" "enum_posts_blocks_logos_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_posts_blocks_logos_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_posts_blocks_logos_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  CREATE TABLE "posts_blocks_chart_ranges_data_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" numeric
  );
  CREATE TABLE "posts_blocks_chart_ranges" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  CREATE TABLE "posts_blocks_chart" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading_eyebrow" varchar,
  	"heading_title" varchar,
  	"heading_description" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"section_theme" "enum_posts_blocks_chart_section_theme",
  	"section_max_width" "enum_posts_blocks_chart_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_posts_blocks_chart_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_posts_blocks_chart_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  CREATE TABLE "posts_blocks_cta_band_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_label" varchar,
  	"link_appearance" "enum_posts_blocks_cta_band_actions_link_appearance" DEFAULT 'default',
  	"link_type" "enum_posts_blocks_cta_band_actions_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_custom_page" "enum_posts_blocks_cta_band_actions_link_custom_page",
  	"link_new_tab" boolean
  );
  CREATE TABLE "posts_blocks_cta_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading_eyebrow" varchar,
  	"heading_title" varchar,
  	"heading_description" varchar,
  	"section_theme" "enum_posts_blocks_cta_band_section_theme",
  	"section_max_width" "enum_posts_blocks_cta_band_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_posts_blocks_cta_band_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_posts_blocks_cta_band_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  CREATE TABLE "posts_blocks_newsletter" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading_eyebrow" varchar,
  	"heading_title" varchar,
  	"heading_description" varchar,
  	"input_placeholder" varchar,
  	"button_label" varchar,
  	"disclaimer" varchar,
  	"section_theme" "enum_posts_blocks_newsletter_section_theme",
  	"section_max_width" "enum_posts_blocks_newsletter_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_posts_blocks_newsletter_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_posts_blocks_newsletter_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  CREATE TABLE "posts_blocks_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar
  );
  CREATE TABLE "posts_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_theme" "enum_posts_blocks_stats_section_theme",
  	"section_max_width" "enum_posts_blocks_stats_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_posts_blocks_stats_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_posts_blocks_stats_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  CREATE TABLE "posts_blocks_raw_html" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"html" varchar,
  	"section_theme" "enum_posts_blocks_raw_html_section_theme",
  	"section_max_width" "enum_posts_blocks_raw_html_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_posts_blocks_raw_html_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_posts_blocks_raw_html_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  CREATE TABLE "_posts_v_blocks_content_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_label" varchar,
  	"link_appearance" "enum__posts_v_blocks_content_actions_link_appearance" DEFAULT 'default',
  	"link_type" "enum__posts_v_blocks_content_actions_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_custom_page" "enum__posts_v_blocks_content_actions_link_custom_page",
  	"link_new_tab" boolean,
  	"_uuid" varchar
  );
  CREATE TABLE "_posts_v_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading_eyebrow" varchar,
  	"heading_title" varchar,
  	"heading_description" varchar,
  	"content" jsonb,
  	"image_id" integer,
  	"layout" "enum__posts_v_blocks_content_layout" DEFAULT 'stacked',
  	"section_theme" "enum__posts_v_blocks_content_section_theme",
  	"section_max_width" "enum__posts_v_blocks_content_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__posts_v_blocks_content_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__posts_v_blocks_content_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  CREATE TABLE "_posts_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  CREATE TABLE "_posts_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading_eyebrow" varchar,
  	"heading_title" varchar,
  	"heading_description" varchar,
  	"section_theme" "enum__posts_v_blocks_faq_section_theme",
  	"section_max_width" "enum__posts_v_blocks_faq_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__posts_v_blocks_faq_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__posts_v_blocks_faq_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  CREATE TABLE "_posts_v_blocks_testimonials_list_testimonial_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"testimonial_id" integer,
  	"_uuid" varchar
  );
  CREATE TABLE "_posts_v_blocks_testimonials_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading_eyebrow" varchar,
  	"heading_title" varchar,
  	"heading_description" varchar,
  	"show_rating" boolean DEFAULT true,
  	"show_avatar" boolean DEFAULT true,
  	"duration" numeric DEFAULT 60,
  	"section_theme" "enum__posts_v_blocks_testimonials_list_section_theme",
  	"section_max_width" "enum__posts_v_blocks_testimonials_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__posts_v_blocks_testimonials_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__posts_v_blocks_testimonials_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  CREATE TABLE "_posts_v_blocks_cards_grid_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"icon" "enum__posts_v_blocks_cards_grid_items_icon",
  	"description" varchar,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum__posts_v_blocks_cards_grid_items_image_aspect_ratio" DEFAULT '1/1',
  	"link_label" varchar,
  	"link_appearance" "enum__posts_v_blocks_cards_grid_items_link_appearance" DEFAULT 'default',
  	"link_type" "enum__posts_v_blocks_cards_grid_items_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_custom_page" "enum__posts_v_blocks_cards_grid_items_link_custom_page",
  	"link_new_tab" boolean,
  	"_uuid" varchar
  );
  CREATE TABLE "_posts_v_blocks_cards_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading_eyebrow" varchar,
  	"heading_title" varchar,
  	"heading_description" varchar,
  	"columns" "enum__posts_v_blocks_cards_grid_columns" DEFAULT '3',
  	"align_variant" "enum__posts_v_blocks_cards_grid_align_variant" DEFAULT 'left',
  	"rounded" "enum__posts_v_blocks_cards_grid_rounded" DEFAULT 'none',
  	"background_color" "enum__posts_v_blocks_cards_grid_background_color" DEFAULT 'none',
  	"section_theme" "enum__posts_v_blocks_cards_grid_section_theme",
  	"section_max_width" "enum__posts_v_blocks_cards_grid_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__posts_v_blocks_cards_grid_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__posts_v_blocks_cards_grid_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  CREATE TABLE "_posts_v_blocks_carousel_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_image_id" integer,
  	"text" jsonb,
  	"_uuid" varchar
  );
  CREATE TABLE "_posts_v_blocks_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading_eyebrow" varchar,
  	"heading_title" varchar,
  	"heading_description" varchar,
  	"effect" "enum__posts_v_blocks_carousel_effect" DEFAULT 'slide',
  	"section_theme" "enum__posts_v_blocks_carousel_section_theme",
  	"section_max_width" "enum__posts_v_blocks_carousel_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__posts_v_blocks_carousel_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__posts_v_blocks_carousel_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  CREATE TABLE "_posts_v_blocks_logos_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_image_id" integer,
  	"link_label" varchar,
  	"link_type" "enum__posts_v_blocks_logos_items_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_custom_page" "enum__posts_v_blocks_logos_items_link_custom_page",
  	"link_new_tab" boolean,
  	"_uuid" varchar
  );
  CREATE TABLE "_posts_v_blocks_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"align_variant" "enum__posts_v_blocks_logos_align_variant" DEFAULT 'center',
  	"section_theme" "enum__posts_v_blocks_logos_section_theme",
  	"section_max_width" "enum__posts_v_blocks_logos_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__posts_v_blocks_logos_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__posts_v_blocks_logos_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  CREATE TABLE "_posts_v_blocks_chart_ranges_data_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" numeric,
  	"_uuid" varchar
  );
  CREATE TABLE "_posts_v_blocks_chart_ranges" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  CREATE TABLE "_posts_v_blocks_chart" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading_eyebrow" varchar,
  	"heading_title" varchar,
  	"heading_description" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"section_theme" "enum__posts_v_blocks_chart_section_theme",
  	"section_max_width" "enum__posts_v_blocks_chart_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__posts_v_blocks_chart_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__posts_v_blocks_chart_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  CREATE TABLE "_posts_v_blocks_cta_band_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_label" varchar,
  	"link_appearance" "enum__posts_v_blocks_cta_band_actions_link_appearance" DEFAULT 'default',
  	"link_type" "enum__posts_v_blocks_cta_band_actions_link_type" DEFAULT 'reference',
  	"link_url" varchar,
  	"link_custom_page" "enum__posts_v_blocks_cta_band_actions_link_custom_page",
  	"link_new_tab" boolean,
  	"_uuid" varchar
  );
  CREATE TABLE "_posts_v_blocks_cta_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading_eyebrow" varchar,
  	"heading_title" varchar,
  	"heading_description" varchar,
  	"section_theme" "enum__posts_v_blocks_cta_band_section_theme",
  	"section_max_width" "enum__posts_v_blocks_cta_band_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__posts_v_blocks_cta_band_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__posts_v_blocks_cta_band_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  CREATE TABLE "_posts_v_blocks_newsletter" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading_eyebrow" varchar,
  	"heading_title" varchar,
  	"heading_description" varchar,
  	"input_placeholder" varchar,
  	"button_label" varchar,
  	"disclaimer" varchar,
  	"section_theme" "enum__posts_v_blocks_newsletter_section_theme",
  	"section_max_width" "enum__posts_v_blocks_newsletter_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__posts_v_blocks_newsletter_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__posts_v_blocks_newsletter_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  CREATE TABLE "_posts_v_blocks_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  CREATE TABLE "_posts_v_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"section_theme" "enum__posts_v_blocks_stats_section_theme",
  	"section_max_width" "enum__posts_v_blocks_stats_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__posts_v_blocks_stats_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__posts_v_blocks_stats_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  CREATE TABLE "_posts_v_blocks_raw_html" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"html" varchar,
  	"section_theme" "enum__posts_v_blocks_raw_html_section_theme",
  	"section_max_width" "enum__posts_v_blocks_raw_html_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__posts_v_blocks_raw_html_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__posts_v_blocks_raw_html_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  ALTER TABLE "posts_blocks_content_actions" ADD CONSTRAINT "posts_blocks_content_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_content" ADD CONSTRAINT "posts_blocks_content_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_content" ADD CONSTRAINT "posts_blocks_content_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_content" ADD CONSTRAINT "posts_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_faq_items" ADD CONSTRAINT "posts_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_faq" ADD CONSTRAINT "posts_blocks_faq_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_faq" ADD CONSTRAINT "posts_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "posts_blocks_testimonials_list_testimonial_items_testimonial_id_testimonials_id_fk" FOREIGN KEY ("testimonial_id") REFERENCES "public"."testimonials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "posts_blocks_testimonials_list_testimonial_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_testimonials_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_testimonials_list" ADD CONSTRAINT "posts_blocks_testimonials_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_testimonials_list" ADD CONSTRAINT "posts_blocks_testimonials_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_cards_grid_items" ADD CONSTRAINT "posts_blocks_cards_grid_items_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_cards_grid_items" ADD CONSTRAINT "posts_blocks_cards_grid_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_cards_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_cards_grid" ADD CONSTRAINT "posts_blocks_cards_grid_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_cards_grid" ADD CONSTRAINT "posts_blocks_cards_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_carousel_slides" ADD CONSTRAINT "posts_blocks_carousel_slides_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_carousel_slides" ADD CONSTRAINT "posts_blocks_carousel_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_carousel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_carousel" ADD CONSTRAINT "posts_blocks_carousel_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_carousel" ADD CONSTRAINT "posts_blocks_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_logos_items" ADD CONSTRAINT "posts_blocks_logos_items_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_logos_items" ADD CONSTRAINT "posts_blocks_logos_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_logos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_logos" ADD CONSTRAINT "posts_blocks_logos_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_logos" ADD CONSTRAINT "posts_blocks_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_chart_ranges_data_points" ADD CONSTRAINT "posts_blocks_chart_ranges_data_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_chart_ranges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_chart_ranges" ADD CONSTRAINT "posts_blocks_chart_ranges_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_chart"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_chart" ADD CONSTRAINT "posts_blocks_chart_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_chart" ADD CONSTRAINT "posts_blocks_chart_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_cta_band_actions" ADD CONSTRAINT "posts_blocks_cta_band_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_cta_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_cta_band" ADD CONSTRAINT "posts_blocks_cta_band_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_cta_band" ADD CONSTRAINT "posts_blocks_cta_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_newsletter" ADD CONSTRAINT "posts_blocks_newsletter_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_newsletter" ADD CONSTRAINT "posts_blocks_newsletter_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_stats_items" ADD CONSTRAINT "posts_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_stats" ADD CONSTRAINT "posts_blocks_stats_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_stats" ADD CONSTRAINT "posts_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_raw_html" ADD CONSTRAINT "posts_blocks_raw_html_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_raw_html" ADD CONSTRAINT "posts_blocks_raw_html_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_content_actions" ADD CONSTRAINT "_posts_v_blocks_content_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_content" ADD CONSTRAINT "_posts_v_blocks_content_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_content" ADD CONSTRAINT "_posts_v_blocks_content_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_content" ADD CONSTRAINT "_posts_v_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_faq_items" ADD CONSTRAINT "_posts_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_faq" ADD CONSTRAINT "_posts_v_blocks_faq_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_faq" ADD CONSTRAINT "_posts_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "_posts_v_blocks_testimonials_list_testimonial_items_testimonial_id_testimonials_id_fk" FOREIGN KEY ("testimonial_id") REFERENCES "public"."testimonials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "_posts_v_blocks_testimonials_list_testimonial_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_testimonials_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_testimonials_list" ADD CONSTRAINT "_posts_v_blocks_testimonials_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_testimonials_list" ADD CONSTRAINT "_posts_v_blocks_testimonials_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_cards_grid_items" ADD CONSTRAINT "_posts_v_blocks_cards_grid_items_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_cards_grid_items" ADD CONSTRAINT "_posts_v_blocks_cards_grid_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_cards_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_cards_grid" ADD CONSTRAINT "_posts_v_blocks_cards_grid_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_cards_grid" ADD CONSTRAINT "_posts_v_blocks_cards_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_carousel_slides" ADD CONSTRAINT "_posts_v_blocks_carousel_slides_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_carousel_slides" ADD CONSTRAINT "_posts_v_blocks_carousel_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_carousel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_carousel" ADD CONSTRAINT "_posts_v_blocks_carousel_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_carousel" ADD CONSTRAINT "_posts_v_blocks_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_logos_items" ADD CONSTRAINT "_posts_v_blocks_logos_items_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_logos_items" ADD CONSTRAINT "_posts_v_blocks_logos_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_logos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_logos" ADD CONSTRAINT "_posts_v_blocks_logos_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_logos" ADD CONSTRAINT "_posts_v_blocks_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_chart_ranges_data_points" ADD CONSTRAINT "_posts_v_blocks_chart_ranges_data_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_chart_ranges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_chart_ranges" ADD CONSTRAINT "_posts_v_blocks_chart_ranges_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_chart"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_chart" ADD CONSTRAINT "_posts_v_blocks_chart_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_chart" ADD CONSTRAINT "_posts_v_blocks_chart_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_cta_band_actions" ADD CONSTRAINT "_posts_v_blocks_cta_band_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_cta_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_cta_band" ADD CONSTRAINT "_posts_v_blocks_cta_band_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_cta_band" ADD CONSTRAINT "_posts_v_blocks_cta_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_newsletter" ADD CONSTRAINT "_posts_v_blocks_newsletter_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_newsletter" ADD CONSTRAINT "_posts_v_blocks_newsletter_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_stats_items" ADD CONSTRAINT "_posts_v_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_stats" ADD CONSTRAINT "_posts_v_blocks_stats_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_stats" ADD CONSTRAINT "_posts_v_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_raw_html" ADD CONSTRAINT "_posts_v_blocks_raw_html_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_raw_html" ADD CONSTRAINT "_posts_v_blocks_raw_html_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "posts_blocks_content_actions_order_idx" ON "posts_blocks_content_actions" USING btree ("_order");
  CREATE INDEX "posts_blocks_content_actions_parent_id_idx" ON "posts_blocks_content_actions" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_content_actions_locale_idx" ON "posts_blocks_content_actions" USING btree ("_locale");
  CREATE INDEX "posts_blocks_content_order_idx" ON "posts_blocks_content" USING btree ("_order");
  CREATE INDEX "posts_blocks_content_parent_id_idx" ON "posts_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_content_path_idx" ON "posts_blocks_content" USING btree ("_path");
  CREATE INDEX "posts_blocks_content_locale_idx" ON "posts_blocks_content" USING btree ("_locale");
  CREATE INDEX "posts_blocks_content_image_idx" ON "posts_blocks_content" USING btree ("image_id");
  CREATE INDEX "posts_blocks_content_section_background_section_backgrou_idx" ON "posts_blocks_content" USING btree ("section_background_media_id");
  CREATE INDEX "posts_blocks_faq_items_order_idx" ON "posts_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "posts_blocks_faq_items_parent_id_idx" ON "posts_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_faq_items_locale_idx" ON "posts_blocks_faq_items" USING btree ("_locale");
  CREATE INDEX "posts_blocks_faq_order_idx" ON "posts_blocks_faq" USING btree ("_order");
  CREATE INDEX "posts_blocks_faq_parent_id_idx" ON "posts_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_faq_path_idx" ON "posts_blocks_faq" USING btree ("_path");
  CREATE INDEX "posts_blocks_faq_locale_idx" ON "posts_blocks_faq" USING btree ("_locale");
  CREATE INDEX "posts_blocks_faq_section_background_section_background_m_idx" ON "posts_blocks_faq" USING btree ("section_background_media_id");
  CREATE INDEX "posts_blocks_testimonials_list_testimonial_items_order_idx" ON "posts_blocks_testimonials_list_testimonial_items" USING btree ("_order");
  CREATE INDEX "posts_blocks_testimonials_list_testimonial_items_parent_id_idx" ON "posts_blocks_testimonials_list_testimonial_items" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_testimonials_list_testimonial_items_locale_idx" ON "posts_blocks_testimonials_list_testimonial_items" USING btree ("_locale");
  CREATE INDEX "posts_blocks_testimonials_list_testimonial_items_testimo_idx" ON "posts_blocks_testimonials_list_testimonial_items" USING btree ("testimonial_id");
  CREATE INDEX "posts_blocks_testimonials_list_order_idx" ON "posts_blocks_testimonials_list" USING btree ("_order");
  CREATE INDEX "posts_blocks_testimonials_list_parent_id_idx" ON "posts_blocks_testimonials_list" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_testimonials_list_path_idx" ON "posts_blocks_testimonials_list" USING btree ("_path");
  CREATE INDEX "posts_blocks_testimonials_list_locale_idx" ON "posts_blocks_testimonials_list" USING btree ("_locale");
  CREATE INDEX "posts_blocks_testimonials_list_section_background_sectio_idx" ON "posts_blocks_testimonials_list" USING btree ("section_background_media_id");
  CREATE INDEX "posts_blocks_cards_grid_items_order_idx" ON "posts_blocks_cards_grid_items" USING btree ("_order");
  CREATE INDEX "posts_blocks_cards_grid_items_parent_id_idx" ON "posts_blocks_cards_grid_items" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_cards_grid_items_locale_idx" ON "posts_blocks_cards_grid_items" USING btree ("_locale");
  CREATE INDEX "posts_blocks_cards_grid_items_image_image_image_idx" ON "posts_blocks_cards_grid_items" USING btree ("image_image_id");
  CREATE INDEX "posts_blocks_cards_grid_order_idx" ON "posts_blocks_cards_grid" USING btree ("_order");
  CREATE INDEX "posts_blocks_cards_grid_parent_id_idx" ON "posts_blocks_cards_grid" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_cards_grid_path_idx" ON "posts_blocks_cards_grid" USING btree ("_path");
  CREATE INDEX "posts_blocks_cards_grid_locale_idx" ON "posts_blocks_cards_grid" USING btree ("_locale");
  CREATE INDEX "posts_blocks_cards_grid_section_background_section_backg_idx" ON "posts_blocks_cards_grid" USING btree ("section_background_media_id");
  CREATE INDEX "posts_blocks_carousel_slides_order_idx" ON "posts_blocks_carousel_slides" USING btree ("_order");
  CREATE INDEX "posts_blocks_carousel_slides_parent_id_idx" ON "posts_blocks_carousel_slides" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_carousel_slides_locale_idx" ON "posts_blocks_carousel_slides" USING btree ("_locale");
  CREATE INDEX "posts_blocks_carousel_slides_image_image_image_idx" ON "posts_blocks_carousel_slides" USING btree ("image_image_id");
  CREATE INDEX "posts_blocks_carousel_order_idx" ON "posts_blocks_carousel" USING btree ("_order");
  CREATE INDEX "posts_blocks_carousel_parent_id_idx" ON "posts_blocks_carousel" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_carousel_path_idx" ON "posts_blocks_carousel" USING btree ("_path");
  CREATE INDEX "posts_blocks_carousel_locale_idx" ON "posts_blocks_carousel" USING btree ("_locale");
  CREATE INDEX "posts_blocks_carousel_section_background_section_backgro_idx" ON "posts_blocks_carousel" USING btree ("section_background_media_id");
  CREATE INDEX "posts_blocks_logos_items_order_idx" ON "posts_blocks_logos_items" USING btree ("_order");
  CREATE INDEX "posts_blocks_logos_items_parent_id_idx" ON "posts_blocks_logos_items" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_logos_items_locale_idx" ON "posts_blocks_logos_items" USING btree ("_locale");
  CREATE INDEX "posts_blocks_logos_items_image_image_image_idx" ON "posts_blocks_logos_items" USING btree ("image_image_id");
  CREATE INDEX "posts_blocks_logos_order_idx" ON "posts_blocks_logos" USING btree ("_order");
  CREATE INDEX "posts_blocks_logos_parent_id_idx" ON "posts_blocks_logos" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_logos_path_idx" ON "posts_blocks_logos" USING btree ("_path");
  CREATE INDEX "posts_blocks_logos_locale_idx" ON "posts_blocks_logos" USING btree ("_locale");
  CREATE INDEX "posts_blocks_logos_section_background_section_background_idx" ON "posts_blocks_logos" USING btree ("section_background_media_id");
  CREATE INDEX "posts_blocks_chart_ranges_data_points_order_idx" ON "posts_blocks_chart_ranges_data_points" USING btree ("_order");
  CREATE INDEX "posts_blocks_chart_ranges_data_points_parent_id_idx" ON "posts_blocks_chart_ranges_data_points" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_chart_ranges_data_points_locale_idx" ON "posts_blocks_chart_ranges_data_points" USING btree ("_locale");
  CREATE INDEX "posts_blocks_chart_ranges_order_idx" ON "posts_blocks_chart_ranges" USING btree ("_order");
  CREATE INDEX "posts_blocks_chart_ranges_parent_id_idx" ON "posts_blocks_chart_ranges" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_chart_ranges_locale_idx" ON "posts_blocks_chart_ranges" USING btree ("_locale");
  CREATE INDEX "posts_blocks_chart_order_idx" ON "posts_blocks_chart" USING btree ("_order");
  CREATE INDEX "posts_blocks_chart_parent_id_idx" ON "posts_blocks_chart" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_chart_path_idx" ON "posts_blocks_chart" USING btree ("_path");
  CREATE INDEX "posts_blocks_chart_locale_idx" ON "posts_blocks_chart" USING btree ("_locale");
  CREATE INDEX "posts_blocks_chart_section_background_section_background_idx" ON "posts_blocks_chart" USING btree ("section_background_media_id");
  CREATE INDEX "posts_blocks_cta_band_actions_order_idx" ON "posts_blocks_cta_band_actions" USING btree ("_order");
  CREATE INDEX "posts_blocks_cta_band_actions_parent_id_idx" ON "posts_blocks_cta_band_actions" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_cta_band_actions_locale_idx" ON "posts_blocks_cta_band_actions" USING btree ("_locale");
  CREATE INDEX "posts_blocks_cta_band_order_idx" ON "posts_blocks_cta_band" USING btree ("_order");
  CREATE INDEX "posts_blocks_cta_band_parent_id_idx" ON "posts_blocks_cta_band" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_cta_band_path_idx" ON "posts_blocks_cta_band" USING btree ("_path");
  CREATE INDEX "posts_blocks_cta_band_locale_idx" ON "posts_blocks_cta_band" USING btree ("_locale");
  CREATE INDEX "posts_blocks_cta_band_section_background_section_backgro_idx" ON "posts_blocks_cta_band" USING btree ("section_background_media_id");
  CREATE INDEX "posts_blocks_newsletter_order_idx" ON "posts_blocks_newsletter" USING btree ("_order");
  CREATE INDEX "posts_blocks_newsletter_parent_id_idx" ON "posts_blocks_newsletter" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_newsletter_path_idx" ON "posts_blocks_newsletter" USING btree ("_path");
  CREATE INDEX "posts_blocks_newsletter_locale_idx" ON "posts_blocks_newsletter" USING btree ("_locale");
  CREATE INDEX "posts_blocks_newsletter_section_background_section_backg_idx" ON "posts_blocks_newsletter" USING btree ("section_background_media_id");
  CREATE INDEX "posts_blocks_stats_items_order_idx" ON "posts_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "posts_blocks_stats_items_parent_id_idx" ON "posts_blocks_stats_items" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_stats_items_locale_idx" ON "posts_blocks_stats_items" USING btree ("_locale");
  CREATE INDEX "posts_blocks_stats_order_idx" ON "posts_blocks_stats" USING btree ("_order");
  CREATE INDEX "posts_blocks_stats_parent_id_idx" ON "posts_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_stats_path_idx" ON "posts_blocks_stats" USING btree ("_path");
  CREATE INDEX "posts_blocks_stats_locale_idx" ON "posts_blocks_stats" USING btree ("_locale");
  CREATE INDEX "posts_blocks_stats_section_background_section_background_idx" ON "posts_blocks_stats" USING btree ("section_background_media_id");
  CREATE INDEX "posts_blocks_raw_html_order_idx" ON "posts_blocks_raw_html" USING btree ("_order");
  CREATE INDEX "posts_blocks_raw_html_parent_id_idx" ON "posts_blocks_raw_html" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_raw_html_path_idx" ON "posts_blocks_raw_html" USING btree ("_path");
  CREATE INDEX "posts_blocks_raw_html_locale_idx" ON "posts_blocks_raw_html" USING btree ("_locale");
  CREATE INDEX "posts_blocks_raw_html_section_background_section_backgro_idx" ON "posts_blocks_raw_html" USING btree ("section_background_media_id");
  CREATE INDEX "_posts_v_blocks_content_actions_order_idx" ON "_posts_v_blocks_content_actions" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_content_actions_parent_id_idx" ON "_posts_v_blocks_content_actions" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_content_actions_locale_idx" ON "_posts_v_blocks_content_actions" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_content_order_idx" ON "_posts_v_blocks_content" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_content_parent_id_idx" ON "_posts_v_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_content_path_idx" ON "_posts_v_blocks_content" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_content_locale_idx" ON "_posts_v_blocks_content" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_content_image_idx" ON "_posts_v_blocks_content" USING btree ("image_id");
  CREATE INDEX "_posts_v_blocks_content_section_background_section_backg_idx" ON "_posts_v_blocks_content" USING btree ("section_background_media_id");
  CREATE INDEX "_posts_v_blocks_faq_items_order_idx" ON "_posts_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_faq_items_parent_id_idx" ON "_posts_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_faq_items_locale_idx" ON "_posts_v_blocks_faq_items" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_faq_order_idx" ON "_posts_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_faq_parent_id_idx" ON "_posts_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_faq_path_idx" ON "_posts_v_blocks_faq" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_faq_locale_idx" ON "_posts_v_blocks_faq" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_faq_section_background_section_backgroun_idx" ON "_posts_v_blocks_faq" USING btree ("section_background_media_id");
  CREATE INDEX "_posts_v_blocks_testimonials_list_testimonial_items_order_idx" ON "_posts_v_blocks_testimonials_list_testimonial_items" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_testimonials_list_testimonial_items_parent_id_idx" ON "_posts_v_blocks_testimonials_list_testimonial_items" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_testimonials_list_testimonial_items_locale_idx" ON "_posts_v_blocks_testimonials_list_testimonial_items" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_testimonials_list_testimonial_items_test_idx" ON "_posts_v_blocks_testimonials_list_testimonial_items" USING btree ("testimonial_id");
  CREATE INDEX "_posts_v_blocks_testimonials_list_order_idx" ON "_posts_v_blocks_testimonials_list" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_testimonials_list_parent_id_idx" ON "_posts_v_blocks_testimonials_list" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_testimonials_list_path_idx" ON "_posts_v_blocks_testimonials_list" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_testimonials_list_locale_idx" ON "_posts_v_blocks_testimonials_list" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_testimonials_list_section_background_sec_idx" ON "_posts_v_blocks_testimonials_list" USING btree ("section_background_media_id");
  CREATE INDEX "_posts_v_blocks_cards_grid_items_order_idx" ON "_posts_v_blocks_cards_grid_items" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_cards_grid_items_parent_id_idx" ON "_posts_v_blocks_cards_grid_items" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_cards_grid_items_locale_idx" ON "_posts_v_blocks_cards_grid_items" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_cards_grid_items_image_image_image_idx" ON "_posts_v_blocks_cards_grid_items" USING btree ("image_image_id");
  CREATE INDEX "_posts_v_blocks_cards_grid_order_idx" ON "_posts_v_blocks_cards_grid" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_cards_grid_parent_id_idx" ON "_posts_v_blocks_cards_grid" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_cards_grid_path_idx" ON "_posts_v_blocks_cards_grid" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_cards_grid_locale_idx" ON "_posts_v_blocks_cards_grid" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_cards_grid_section_background_section_ba_idx" ON "_posts_v_blocks_cards_grid" USING btree ("section_background_media_id");
  CREATE INDEX "_posts_v_blocks_carousel_slides_order_idx" ON "_posts_v_blocks_carousel_slides" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_carousel_slides_parent_id_idx" ON "_posts_v_blocks_carousel_slides" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_carousel_slides_locale_idx" ON "_posts_v_blocks_carousel_slides" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_carousel_slides_image_image_image_idx" ON "_posts_v_blocks_carousel_slides" USING btree ("image_image_id");
  CREATE INDEX "_posts_v_blocks_carousel_order_idx" ON "_posts_v_blocks_carousel" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_carousel_parent_id_idx" ON "_posts_v_blocks_carousel" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_carousel_path_idx" ON "_posts_v_blocks_carousel" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_carousel_locale_idx" ON "_posts_v_blocks_carousel" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_carousel_section_background_section_back_idx" ON "_posts_v_blocks_carousel" USING btree ("section_background_media_id");
  CREATE INDEX "_posts_v_blocks_logos_items_order_idx" ON "_posts_v_blocks_logos_items" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_logos_items_parent_id_idx" ON "_posts_v_blocks_logos_items" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_logos_items_locale_idx" ON "_posts_v_blocks_logos_items" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_logos_items_image_image_image_idx" ON "_posts_v_blocks_logos_items" USING btree ("image_image_id");
  CREATE INDEX "_posts_v_blocks_logos_order_idx" ON "_posts_v_blocks_logos" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_logos_parent_id_idx" ON "_posts_v_blocks_logos" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_logos_path_idx" ON "_posts_v_blocks_logos" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_logos_locale_idx" ON "_posts_v_blocks_logos" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_logos_section_background_section_backgro_idx" ON "_posts_v_blocks_logos" USING btree ("section_background_media_id");
  CREATE INDEX "_posts_v_blocks_chart_ranges_data_points_order_idx" ON "_posts_v_blocks_chart_ranges_data_points" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_chart_ranges_data_points_parent_id_idx" ON "_posts_v_blocks_chart_ranges_data_points" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_chart_ranges_data_points_locale_idx" ON "_posts_v_blocks_chart_ranges_data_points" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_chart_ranges_order_idx" ON "_posts_v_blocks_chart_ranges" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_chart_ranges_parent_id_idx" ON "_posts_v_blocks_chart_ranges" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_chart_ranges_locale_idx" ON "_posts_v_blocks_chart_ranges" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_chart_order_idx" ON "_posts_v_blocks_chart" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_chart_parent_id_idx" ON "_posts_v_blocks_chart" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_chart_path_idx" ON "_posts_v_blocks_chart" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_chart_locale_idx" ON "_posts_v_blocks_chart" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_chart_section_background_section_backgro_idx" ON "_posts_v_blocks_chart" USING btree ("section_background_media_id");
  CREATE INDEX "_posts_v_blocks_cta_band_actions_order_idx" ON "_posts_v_blocks_cta_band_actions" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_cta_band_actions_parent_id_idx" ON "_posts_v_blocks_cta_band_actions" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_cta_band_actions_locale_idx" ON "_posts_v_blocks_cta_band_actions" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_cta_band_order_idx" ON "_posts_v_blocks_cta_band" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_cta_band_parent_id_idx" ON "_posts_v_blocks_cta_band" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_cta_band_path_idx" ON "_posts_v_blocks_cta_band" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_cta_band_locale_idx" ON "_posts_v_blocks_cta_band" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_cta_band_section_background_section_back_idx" ON "_posts_v_blocks_cta_band" USING btree ("section_background_media_id");
  CREATE INDEX "_posts_v_blocks_newsletter_order_idx" ON "_posts_v_blocks_newsletter" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_newsletter_parent_id_idx" ON "_posts_v_blocks_newsletter" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_newsletter_path_idx" ON "_posts_v_blocks_newsletter" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_newsletter_locale_idx" ON "_posts_v_blocks_newsletter" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_newsletter_section_background_section_ba_idx" ON "_posts_v_blocks_newsletter" USING btree ("section_background_media_id");
  CREATE INDEX "_posts_v_blocks_stats_items_order_idx" ON "_posts_v_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_stats_items_parent_id_idx" ON "_posts_v_blocks_stats_items" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_stats_items_locale_idx" ON "_posts_v_blocks_stats_items" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_stats_order_idx" ON "_posts_v_blocks_stats" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_stats_parent_id_idx" ON "_posts_v_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_stats_path_idx" ON "_posts_v_blocks_stats" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_stats_locale_idx" ON "_posts_v_blocks_stats" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_stats_section_background_section_backgro_idx" ON "_posts_v_blocks_stats" USING btree ("section_background_media_id");
  CREATE INDEX "_posts_v_blocks_raw_html_order_idx" ON "_posts_v_blocks_raw_html" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_raw_html_parent_id_idx" ON "_posts_v_blocks_raw_html" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_raw_html_path_idx" ON "_posts_v_blocks_raw_html" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_raw_html_locale_idx" ON "_posts_v_blocks_raw_html" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_raw_html_section_background_section_back_idx" ON "_posts_v_blocks_raw_html" USING btree ("section_background_media_id");
`)
  await db.execute(sql.raw(moveUp(LIVE)))
  await db.execute(sql.raw(moveUp(VERSIONS)))
  // Generated: the old FAQ / CTA group columns and tables go.
  await db.execute(sql`
  ALTER TABLE "posts_locales" DROP COLUMN "faq_heading_eyebrow";
  ALTER TABLE "posts_locales" DROP COLUMN "faq_heading_title";
  ALTER TABLE "posts_locales" DROP COLUMN "faq_heading_description";
  ALTER TABLE "posts_locales" DROP COLUMN "cta_heading_eyebrow";
  ALTER TABLE "posts_locales" DROP COLUMN "cta_heading_title";
  ALTER TABLE "posts_locales" DROP COLUMN "cta_heading_description";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_faq_heading_eyebrow";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_faq_heading_title";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_faq_heading_description";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_cta_heading_eyebrow";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_cta_heading_title";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_cta_heading_description";
  ALTER TABLE "posts_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_cta_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_version_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_version_cta_actions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "posts_faq_items" CASCADE;
  DROP TABLE "posts_cta_actions" CASCADE;
  DROP TABLE "_posts_v_version_faq_items" CASCADE;
  DROP TABLE "_posts_v_version_cta_actions" CASCADE;
  DROP TYPE "public"."enum_posts_cta_actions_type";
  DROP TYPE "public"."enum_posts_cta_actions_custom_page";
  DROP TYPE "public"."enum_posts_cta_actions_appearance";
  DROP TYPE "public"."enum__posts_v_version_cta_actions_type";
  DROP TYPE "public"."enum__posts_v_version_cta_actions_custom_page";
  DROP TYPE "public"."enum__posts_v_version_cta_actions_appearance";
`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Generated: the old FAQ / CTA group columns and tables.
  await db.execute(sql`
  CREATE TYPE "public"."enum_posts_cta_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_posts_cta_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_posts_cta_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__posts_v_version_cta_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__posts_v_version_cta_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__posts_v_version_cta_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TABLE "posts_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  CREATE TABLE "posts_cta_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_posts_cta_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_posts_cta_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum_posts_cta_actions_appearance" DEFAULT 'default'
  );
  CREATE TABLE "_posts_v_version_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  CREATE TABLE "_posts_v_version_cta_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__posts_v_version_cta_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum__posts_v_version_cta_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum__posts_v_version_cta_actions_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  ALTER TABLE "posts_locales" ADD COLUMN "faq_heading_eyebrow" varchar;
  ALTER TABLE "posts_locales" ADD COLUMN "faq_heading_title" varchar;
  ALTER TABLE "posts_locales" ADD COLUMN "faq_heading_description" varchar;
  ALTER TABLE "posts_locales" ADD COLUMN "cta_heading_eyebrow" varchar;
  ALTER TABLE "posts_locales" ADD COLUMN "cta_heading_title" varchar;
  ALTER TABLE "posts_locales" ADD COLUMN "cta_heading_description" varchar;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_faq_heading_eyebrow" varchar;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_faq_heading_title" varchar;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_faq_heading_description" varchar;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_cta_heading_eyebrow" varchar;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_cta_heading_title" varchar;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_cta_heading_description" varchar;
  ALTER TABLE "posts_faq_items" ADD CONSTRAINT "posts_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_cta_actions" ADD CONSTRAINT "posts_cta_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_version_faq_items" ADD CONSTRAINT "_posts_v_version_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_version_cta_actions" ADD CONSTRAINT "_posts_v_version_cta_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "posts_faq_items_order_idx" ON "posts_faq_items" USING btree ("_order");
  CREATE INDEX "posts_faq_items_parent_id_idx" ON "posts_faq_items" USING btree ("_parent_id");
  CREATE INDEX "posts_faq_items_locale_idx" ON "posts_faq_items" USING btree ("_locale");
  CREATE INDEX "posts_cta_actions_order_idx" ON "posts_cta_actions" USING btree ("_order");
  CREATE INDEX "posts_cta_actions_parent_id_idx" ON "posts_cta_actions" USING btree ("_parent_id");
  CREATE INDEX "posts_cta_actions_locale_idx" ON "posts_cta_actions" USING btree ("_locale");
  CREATE INDEX "_posts_v_version_faq_items_order_idx" ON "_posts_v_version_faq_items" USING btree ("_order");
  CREATE INDEX "_posts_v_version_faq_items_parent_id_idx" ON "_posts_v_version_faq_items" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_version_faq_items_locale_idx" ON "_posts_v_version_faq_items" USING btree ("_locale");
  CREATE INDEX "_posts_v_version_cta_actions_order_idx" ON "_posts_v_version_cta_actions" USING btree ("_order");
  CREATE INDEX "_posts_v_version_cta_actions_parent_id_idx" ON "_posts_v_version_cta_actions" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_version_cta_actions_locale_idx" ON "_posts_v_version_cta_actions" USING btree ("_locale");
`)
  await db.execute(sql.raw(moveDown(LIVE)))
  await db.execute(sql.raw(moveDown(VERSIONS)))
  // Generated: the posts' section tables go.
  await db.execute(sql`
  ALTER TABLE "posts_blocks_content_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_content" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_testimonials_list_testimonial_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_testimonials_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_cards_grid_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_cards_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_carousel_slides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_carousel" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_logos_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_chart_ranges_data_points" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_chart_ranges" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_chart" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_cta_band_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_cta_band" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_newsletter" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_stats_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_raw_html" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_content_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_content" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_testimonials_list_testimonial_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_testimonials_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_cards_grid_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_cards_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_carousel_slides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_carousel" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_logos_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_chart_ranges_data_points" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_chart_ranges" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_chart" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_cta_band_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_cta_band" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_newsletter" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_stats_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_raw_html" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "posts_blocks_content_actions" CASCADE;
  DROP TABLE "posts_blocks_content" CASCADE;
  DROP TABLE "posts_blocks_faq_items" CASCADE;
  DROP TABLE "posts_blocks_faq" CASCADE;
  DROP TABLE "posts_blocks_testimonials_list_testimonial_items" CASCADE;
  DROP TABLE "posts_blocks_testimonials_list" CASCADE;
  DROP TABLE "posts_blocks_cards_grid_items" CASCADE;
  DROP TABLE "posts_blocks_cards_grid" CASCADE;
  DROP TABLE "posts_blocks_carousel_slides" CASCADE;
  DROP TABLE "posts_blocks_carousel" CASCADE;
  DROP TABLE "posts_blocks_logos_items" CASCADE;
  DROP TABLE "posts_blocks_logos" CASCADE;
  DROP TABLE "posts_blocks_chart_ranges_data_points" CASCADE;
  DROP TABLE "posts_blocks_chart_ranges" CASCADE;
  DROP TABLE "posts_blocks_chart" CASCADE;
  DROP TABLE "posts_blocks_cta_band_actions" CASCADE;
  DROP TABLE "posts_blocks_cta_band" CASCADE;
  DROP TABLE "posts_blocks_newsletter" CASCADE;
  DROP TABLE "posts_blocks_stats_items" CASCADE;
  DROP TABLE "posts_blocks_stats" CASCADE;
  DROP TABLE "posts_blocks_raw_html" CASCADE;
  DROP TABLE "_posts_v_blocks_content_actions" CASCADE;
  DROP TABLE "_posts_v_blocks_content" CASCADE;
  DROP TABLE "_posts_v_blocks_faq_items" CASCADE;
  DROP TABLE "_posts_v_blocks_faq" CASCADE;
  DROP TABLE "_posts_v_blocks_testimonials_list_testimonial_items" CASCADE;
  DROP TABLE "_posts_v_blocks_testimonials_list" CASCADE;
  DROP TABLE "_posts_v_blocks_cards_grid_items" CASCADE;
  DROP TABLE "_posts_v_blocks_cards_grid" CASCADE;
  DROP TABLE "_posts_v_blocks_carousel_slides" CASCADE;
  DROP TABLE "_posts_v_blocks_carousel" CASCADE;
  DROP TABLE "_posts_v_blocks_logos_items" CASCADE;
  DROP TABLE "_posts_v_blocks_logos" CASCADE;
  DROP TABLE "_posts_v_blocks_chart_ranges_data_points" CASCADE;
  DROP TABLE "_posts_v_blocks_chart_ranges" CASCADE;
  DROP TABLE "_posts_v_blocks_chart" CASCADE;
  DROP TABLE "_posts_v_blocks_cta_band_actions" CASCADE;
  DROP TABLE "_posts_v_blocks_cta_band" CASCADE;
  DROP TABLE "_posts_v_blocks_newsletter" CASCADE;
  DROP TABLE "_posts_v_blocks_stats_items" CASCADE;
  DROP TABLE "_posts_v_blocks_stats" CASCADE;
  DROP TABLE "_posts_v_blocks_raw_html" CASCADE;
  DROP TYPE "public"."enum_posts_blocks_content_actions_link_appearance";
  DROP TYPE "public"."enum_posts_blocks_content_actions_link_type";
  DROP TYPE "public"."enum_posts_blocks_content_actions_link_custom_page";
  DROP TYPE "public"."enum_posts_blocks_content_layout";
  DROP TYPE "public"."enum_posts_blocks_content_section_theme";
  DROP TYPE "public"."enum_posts_blocks_content_section_max_width";
  DROP TYPE "public"."enum_posts_blocks_content_section_padding_y";
  DROP TYPE "public"."enum_posts_blocks_content_section_padding_x";
  DROP TYPE "public"."enum_posts_blocks_faq_section_theme";
  DROP TYPE "public"."enum_posts_blocks_faq_section_max_width";
  DROP TYPE "public"."enum_posts_blocks_faq_section_padding_y";
  DROP TYPE "public"."enum_posts_blocks_faq_section_padding_x";
  DROP TYPE "public"."enum_posts_blocks_testimonials_list_section_theme";
  DROP TYPE "public"."enum_posts_blocks_testimonials_list_section_max_width";
  DROP TYPE "public"."enum_posts_blocks_testimonials_list_section_padding_y";
  DROP TYPE "public"."enum_posts_blocks_testimonials_list_section_padding_x";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_items_icon";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_items_image_aspect_ratio";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_items_link_appearance";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_items_link_type";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_items_link_custom_page";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_columns";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_align_variant";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_rounded";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_background_color";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_section_theme";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_section_max_width";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_section_padding_y";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_section_padding_x";
  DROP TYPE "public"."enum_posts_blocks_carousel_effect";
  DROP TYPE "public"."enum_posts_blocks_carousel_section_theme";
  DROP TYPE "public"."enum_posts_blocks_carousel_section_max_width";
  DROP TYPE "public"."enum_posts_blocks_carousel_section_padding_y";
  DROP TYPE "public"."enum_posts_blocks_carousel_section_padding_x";
  DROP TYPE "public"."enum_posts_blocks_logos_items_link_type";
  DROP TYPE "public"."enum_posts_blocks_logos_items_link_custom_page";
  DROP TYPE "public"."enum_posts_blocks_logos_align_variant";
  DROP TYPE "public"."enum_posts_blocks_logos_section_theme";
  DROP TYPE "public"."enum_posts_blocks_logos_section_max_width";
  DROP TYPE "public"."enum_posts_blocks_logos_section_padding_y";
  DROP TYPE "public"."enum_posts_blocks_logos_section_padding_x";
  DROP TYPE "public"."enum_posts_blocks_chart_section_theme";
  DROP TYPE "public"."enum_posts_blocks_chart_section_max_width";
  DROP TYPE "public"."enum_posts_blocks_chart_section_padding_y";
  DROP TYPE "public"."enum_posts_blocks_chart_section_padding_x";
  DROP TYPE "public"."enum_posts_blocks_cta_band_actions_link_appearance";
  DROP TYPE "public"."enum_posts_blocks_cta_band_actions_link_type";
  DROP TYPE "public"."enum_posts_blocks_cta_band_actions_link_custom_page";
  DROP TYPE "public"."enum_posts_blocks_cta_band_section_theme";
  DROP TYPE "public"."enum_posts_blocks_cta_band_section_max_width";
  DROP TYPE "public"."enum_posts_blocks_cta_band_section_padding_y";
  DROP TYPE "public"."enum_posts_blocks_cta_band_section_padding_x";
  DROP TYPE "public"."enum_posts_blocks_newsletter_section_theme";
  DROP TYPE "public"."enum_posts_blocks_newsletter_section_max_width";
  DROP TYPE "public"."enum_posts_blocks_newsletter_section_padding_y";
  DROP TYPE "public"."enum_posts_blocks_newsletter_section_padding_x";
  DROP TYPE "public"."enum_posts_blocks_stats_section_theme";
  DROP TYPE "public"."enum_posts_blocks_stats_section_max_width";
  DROP TYPE "public"."enum_posts_blocks_stats_section_padding_y";
  DROP TYPE "public"."enum_posts_blocks_stats_section_padding_x";
  DROP TYPE "public"."enum_posts_blocks_raw_html_section_theme";
  DROP TYPE "public"."enum_posts_blocks_raw_html_section_max_width";
  DROP TYPE "public"."enum_posts_blocks_raw_html_section_padding_y";
  DROP TYPE "public"."enum_posts_blocks_raw_html_section_padding_x";
  DROP TYPE "public"."enum__posts_v_blocks_content_actions_link_appearance";
  DROP TYPE "public"."enum__posts_v_blocks_content_actions_link_type";
  DROP TYPE "public"."enum__posts_v_blocks_content_actions_link_custom_page";
  DROP TYPE "public"."enum__posts_v_blocks_content_layout";
  DROP TYPE "public"."enum__posts_v_blocks_content_section_theme";
  DROP TYPE "public"."enum__posts_v_blocks_content_section_max_width";
  DROP TYPE "public"."enum__posts_v_blocks_content_section_padding_y";
  DROP TYPE "public"."enum__posts_v_blocks_content_section_padding_x";
  DROP TYPE "public"."enum__posts_v_blocks_faq_section_theme";
  DROP TYPE "public"."enum__posts_v_blocks_faq_section_max_width";
  DROP TYPE "public"."enum__posts_v_blocks_faq_section_padding_y";
  DROP TYPE "public"."enum__posts_v_blocks_faq_section_padding_x";
  DROP TYPE "public"."enum__posts_v_blocks_testimonials_list_section_theme";
  DROP TYPE "public"."enum__posts_v_blocks_testimonials_list_section_max_width";
  DROP TYPE "public"."enum__posts_v_blocks_testimonials_list_section_padding_y";
  DROP TYPE "public"."enum__posts_v_blocks_testimonials_list_section_padding_x";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_items_icon";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_items_image_aspect_ratio";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_items_link_appearance";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_items_link_type";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_items_link_custom_page";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_columns";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_align_variant";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_rounded";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_background_color";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_section_theme";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_section_max_width";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_section_padding_y";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_section_padding_x";
  DROP TYPE "public"."enum__posts_v_blocks_carousel_effect";
  DROP TYPE "public"."enum__posts_v_blocks_carousel_section_theme";
  DROP TYPE "public"."enum__posts_v_blocks_carousel_section_max_width";
  DROP TYPE "public"."enum__posts_v_blocks_carousel_section_padding_y";
  DROP TYPE "public"."enum__posts_v_blocks_carousel_section_padding_x";
  DROP TYPE "public"."enum__posts_v_blocks_logos_items_link_type";
  DROP TYPE "public"."enum__posts_v_blocks_logos_items_link_custom_page";
  DROP TYPE "public"."enum__posts_v_blocks_logos_align_variant";
  DROP TYPE "public"."enum__posts_v_blocks_logos_section_theme";
  DROP TYPE "public"."enum__posts_v_blocks_logos_section_max_width";
  DROP TYPE "public"."enum__posts_v_blocks_logos_section_padding_y";
  DROP TYPE "public"."enum__posts_v_blocks_logos_section_padding_x";
  DROP TYPE "public"."enum__posts_v_blocks_chart_section_theme";
  DROP TYPE "public"."enum__posts_v_blocks_chart_section_max_width";
  DROP TYPE "public"."enum__posts_v_blocks_chart_section_padding_y";
  DROP TYPE "public"."enum__posts_v_blocks_chart_section_padding_x";
  DROP TYPE "public"."enum__posts_v_blocks_cta_band_actions_link_appearance";
  DROP TYPE "public"."enum__posts_v_blocks_cta_band_actions_link_type";
  DROP TYPE "public"."enum__posts_v_blocks_cta_band_actions_link_custom_page";
  DROP TYPE "public"."enum__posts_v_blocks_cta_band_section_theme";
  DROP TYPE "public"."enum__posts_v_blocks_cta_band_section_max_width";
  DROP TYPE "public"."enum__posts_v_blocks_cta_band_section_padding_y";
  DROP TYPE "public"."enum__posts_v_blocks_cta_band_section_padding_x";
  DROP TYPE "public"."enum__posts_v_blocks_newsletter_section_theme";
  DROP TYPE "public"."enum__posts_v_blocks_newsletter_section_max_width";
  DROP TYPE "public"."enum__posts_v_blocks_newsletter_section_padding_y";
  DROP TYPE "public"."enum__posts_v_blocks_newsletter_section_padding_x";
  DROP TYPE "public"."enum__posts_v_blocks_stats_section_theme";
  DROP TYPE "public"."enum__posts_v_blocks_stats_section_max_width";
  DROP TYPE "public"."enum__posts_v_blocks_stats_section_padding_y";
  DROP TYPE "public"."enum__posts_v_blocks_stats_section_padding_x";
  DROP TYPE "public"."enum__posts_v_blocks_raw_html_section_theme";
  DROP TYPE "public"."enum__posts_v_blocks_raw_html_section_max_width";
  DROP TYPE "public"."enum__posts_v_blocks_raw_html_section_padding_y";
  DROP TYPE "public"."enum__posts_v_blocks_raw_html_section_padding_x";
`)
}
