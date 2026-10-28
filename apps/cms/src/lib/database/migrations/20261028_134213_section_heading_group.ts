import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "page_blocks_content" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "page_blocks_content" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "page_blocks_content" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "_page_v_blocks_content" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "_page_v_blocks_content" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "_page_v_blocks_content" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "gsec_blocks_content" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "gsec_blocks_content" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "gsec_blocks_content" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "_gsec_v_blocks_content" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "_gsec_v_blocks_content" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "_gsec_v_blocks_content" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "presets_blocks_content_locales" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "presets_blocks_content_locales" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "presets_blocks_content_locales" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "page_blocks_faq" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "page_blocks_faq" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "page_blocks_faq" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "_page_v_blocks_faq" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "_page_v_blocks_faq" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "_page_v_blocks_faq" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "gsec_blocks_faq" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "gsec_blocks_faq" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "gsec_blocks_faq" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "_gsec_v_blocks_faq" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "_gsec_v_blocks_faq" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "_gsec_v_blocks_faq" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "presets_blocks_faq_locales" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "presets_blocks_faq_locales" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "presets_blocks_faq_locales" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "page_blocks_cta_band" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "page_blocks_cta_band" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "page_blocks_cta_band" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "_page_v_blocks_cta_band" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "_page_v_blocks_cta_band" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "_page_v_blocks_cta_band" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "gsec_blocks_cta_band" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "gsec_blocks_cta_band" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "gsec_blocks_cta_band" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "_gsec_v_blocks_cta_band" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "_gsec_v_blocks_cta_band" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "_gsec_v_blocks_cta_band" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "presets_blocks_cta_band_locales" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "presets_blocks_cta_band_locales" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "presets_blocks_cta_band_locales" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "page_blocks_carousel" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "page_blocks_carousel" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "page_blocks_carousel" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "_page_v_blocks_carousel" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "_page_v_blocks_carousel" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "_page_v_blocks_carousel" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "gsec_blocks_carousel" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "gsec_blocks_carousel" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "gsec_blocks_carousel" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "_gsec_v_blocks_carousel" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "_gsec_v_blocks_carousel" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "_gsec_v_blocks_carousel" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "presets_blocks_carousel_locales" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "presets_blocks_carousel_locales" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "presets_blocks_carousel_locales" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "page_blocks_chart" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "page_blocks_chart" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "page_blocks_chart" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "_page_v_blocks_chart" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "_page_v_blocks_chart" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "_page_v_blocks_chart" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "gsec_blocks_chart" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "gsec_blocks_chart" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "gsec_blocks_chart" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "_gsec_v_blocks_chart" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "_gsec_v_blocks_chart" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "_gsec_v_blocks_chart" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "presets_blocks_chart_locales" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "presets_blocks_chart_locales" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "presets_blocks_chart_locales" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "page_blocks_cards_grid" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "page_blocks_cards_grid" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "page_blocks_cards_grid" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "_page_v_blocks_cards_grid" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "_page_v_blocks_cards_grid" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "_page_v_blocks_cards_grid" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "gsec_blocks_cards_grid" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "gsec_blocks_cards_grid" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "gsec_blocks_cards_grid" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "_gsec_v_blocks_cards_grid" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "_gsec_v_blocks_cards_grid" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "_gsec_v_blocks_cards_grid" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "presets_blocks_cards_grid_locales" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "presets_blocks_cards_grid_locales" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "presets_blocks_cards_grid_locales" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "page_blocks_testimonials_list" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "page_blocks_testimonials_list" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "page_blocks_testimonials_list" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "_page_v_blocks_testimonials_list" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "_page_v_blocks_testimonials_list" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "_page_v_blocks_testimonials_list" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "gsec_blocks_testimonials_list" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "gsec_blocks_testimonials_list" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "gsec_blocks_testimonials_list" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "_gsec_v_blocks_testimonials_list" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "_gsec_v_blocks_testimonials_list" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "_gsec_v_blocks_testimonials_list" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "presets_blocks_testimonials_list_locales" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "presets_blocks_testimonials_list_locales" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "presets_blocks_testimonials_list_locales" RENAME COLUMN "description" TO "heading_description";
  ALTER TABLE "page_blocks_newsletter" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "page_blocks_newsletter" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "page_blocks_newsletter" ADD COLUMN "heading_description" varchar;
  ALTER TABLE "_page_v_blocks_newsletter" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "_page_v_blocks_newsletter" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "_page_v_blocks_newsletter" ADD COLUMN "heading_description" varchar;
  ALTER TABLE "gsec_blocks_newsletter" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "gsec_blocks_newsletter" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "gsec_blocks_newsletter" ADD COLUMN "heading_description" varchar;
  ALTER TABLE "_gsec_v_blocks_newsletter" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "_gsec_v_blocks_newsletter" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "_gsec_v_blocks_newsletter" ADD COLUMN "heading_description" varchar;
  ALTER TABLE "presets_blocks_newsletter_locales" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "presets_blocks_newsletter_locales" RENAME COLUMN "heading" TO "heading_title";
  ALTER TABLE "presets_blocks_newsletter_locales" ADD COLUMN "heading_description" varchar;
  ALTER TABLE "presets_blocks_newsletter_locales" ALTER COLUMN "heading_title" DROP NOT NULL;
  ALTER TABLE "page_blocks_hero" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "page_blocks_hero" RENAME COLUMN "title" TO "heading_title";
  ALTER TABLE "page_blocks_hero" ADD COLUMN "heading_description" varchar;
  UPDATE "page_blocks_hero" SET "heading_description" = (
    SELECT string_agg(block_text, E'\n' ORDER BY block_index)
    FROM (
      SELECT block_index, string_agg(text_node #>> '{}', '' ORDER BY text_index) AS block_text
      FROM jsonb_array_elements("rich_text" -> 'root' -> 'children') WITH ORDINALITY AS blocks(block, block_index),
        jsonb_path_query(block, 'strict $.**.text') WITH ORDINALITY AS texts(text_node, text_index)
      GROUP BY block_index
    ) AS rich_text_blocks
  )
  WHERE "rich_text" IS NOT NULL;
  ALTER TABLE "page_blocks_hero" DROP COLUMN "rich_text";
  ALTER TABLE "_page_v_blocks_hero" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "_page_v_blocks_hero" RENAME COLUMN "title" TO "heading_title";
  ALTER TABLE "_page_v_blocks_hero" ADD COLUMN "heading_description" varchar;
  UPDATE "_page_v_blocks_hero" SET "heading_description" = (
    SELECT string_agg(block_text, E'\n' ORDER BY block_index)
    FROM (
      SELECT block_index, string_agg(text_node #>> '{}', '' ORDER BY text_index) AS block_text
      FROM jsonb_array_elements("rich_text" -> 'root' -> 'children') WITH ORDINALITY AS blocks(block, block_index),
        jsonb_path_query(block, 'strict $.**.text') WITH ORDINALITY AS texts(text_node, text_index)
      GROUP BY block_index
    ) AS rich_text_blocks
  )
  WHERE "rich_text" IS NOT NULL;
  ALTER TABLE "_page_v_blocks_hero" DROP COLUMN "rich_text";
  ALTER TABLE "gsec_blocks_hero" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "gsec_blocks_hero" RENAME COLUMN "title" TO "heading_title";
  ALTER TABLE "gsec_blocks_hero" ADD COLUMN "heading_description" varchar;
  UPDATE "gsec_blocks_hero" SET "heading_description" = (
    SELECT string_agg(block_text, E'\n' ORDER BY block_index)
    FROM (
      SELECT block_index, string_agg(text_node #>> '{}', '' ORDER BY text_index) AS block_text
      FROM jsonb_array_elements("rich_text" -> 'root' -> 'children') WITH ORDINALITY AS blocks(block, block_index),
        jsonb_path_query(block, 'strict $.**.text') WITH ORDINALITY AS texts(text_node, text_index)
      GROUP BY block_index
    ) AS rich_text_blocks
  )
  WHERE "rich_text" IS NOT NULL;
  ALTER TABLE "gsec_blocks_hero" DROP COLUMN "rich_text";
  ALTER TABLE "_gsec_v_blocks_hero" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "_gsec_v_blocks_hero" RENAME COLUMN "title" TO "heading_title";
  ALTER TABLE "_gsec_v_blocks_hero" ADD COLUMN "heading_description" varchar;
  UPDATE "_gsec_v_blocks_hero" SET "heading_description" = (
    SELECT string_agg(block_text, E'\n' ORDER BY block_index)
    FROM (
      SELECT block_index, string_agg(text_node #>> '{}', '' ORDER BY text_index) AS block_text
      FROM jsonb_array_elements("rich_text" -> 'root' -> 'children') WITH ORDINALITY AS blocks(block, block_index),
        jsonb_path_query(block, 'strict $.**.text') WITH ORDINALITY AS texts(text_node, text_index)
      GROUP BY block_index
    ) AS rich_text_blocks
  )
  WHERE "rich_text" IS NOT NULL;
  ALTER TABLE "_gsec_v_blocks_hero" DROP COLUMN "rich_text";
  ALTER TABLE "presets_blocks_hero_locales" RENAME COLUMN "eyebrow" TO "heading_eyebrow";
  ALTER TABLE "presets_blocks_hero_locales" RENAME COLUMN "title" TO "heading_title";
  ALTER TABLE "presets_blocks_hero_locales" ADD COLUMN "heading_description" varchar;
  UPDATE "presets_blocks_hero_locales" SET "heading_description" = (
    SELECT string_agg(block_text, E'\n' ORDER BY block_index)
    FROM (
      SELECT block_index, string_agg(text_node #>> '{}', '' ORDER BY text_index) AS block_text
      FROM jsonb_array_elements("rich_text" -> 'root' -> 'children') WITH ORDINALITY AS blocks(block, block_index),
        jsonb_path_query(block, 'strict $.**.text') WITH ORDINALITY AS texts(text_node, text_index)
      GROUP BY block_index
    ) AS rich_text_blocks
  )
  WHERE "rich_text" IS NOT NULL;
  ALTER TABLE "presets_blocks_hero_locales" DROP COLUMN "rich_text";
  ALTER TABLE "posts_locales" RENAME COLUMN "faq_heading" TO "faq_heading_title";
  ALTER TABLE "posts_locales" ADD COLUMN "faq_heading_eyebrow" varchar;
  ALTER TABLE "posts_locales" ADD COLUMN "faq_heading_description" varchar;
  ALTER TABLE "posts_locales" RENAME COLUMN "cta_eyebrow" TO "cta_heading_eyebrow";
  ALTER TABLE "posts_locales" RENAME COLUMN "cta_heading" TO "cta_heading_title";
  ALTER TABLE "posts_locales" RENAME COLUMN "cta_description" TO "cta_heading_description";
  ALTER TABLE "_posts_v_locales" RENAME COLUMN "version_faq_heading" TO "version_faq_heading_title";
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_faq_heading_eyebrow" varchar;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_faq_heading_description" varchar;
  ALTER TABLE "_posts_v_locales" RENAME COLUMN "version_cta_eyebrow" TO "version_cta_heading_eyebrow";
  ALTER TABLE "_posts_v_locales" RENAME COLUMN "version_cta_heading" TO "version_cta_heading_title";
  ALTER TABLE "_posts_v_locales" RENAME COLUMN "version_cta_description" TO "version_cta_heading_description";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "_posts_v_locales" RENAME COLUMN "version_cta_heading_description" TO "version_cta_description";
  ALTER TABLE "_posts_v_locales" RENAME COLUMN "version_cta_heading_title" TO "version_cta_heading";
  ALTER TABLE "_posts_v_locales" RENAME COLUMN "version_cta_heading_eyebrow" TO "version_cta_eyebrow";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_faq_heading_description";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_faq_heading_eyebrow";
  ALTER TABLE "_posts_v_locales" RENAME COLUMN "version_faq_heading_title" TO "version_faq_heading";
  ALTER TABLE "posts_locales" RENAME COLUMN "cta_heading_description" TO "cta_description";
  ALTER TABLE "posts_locales" RENAME COLUMN "cta_heading_title" TO "cta_heading";
  ALTER TABLE "posts_locales" RENAME COLUMN "cta_heading_eyebrow" TO "cta_eyebrow";
  ALTER TABLE "posts_locales" DROP COLUMN "faq_heading_description";
  ALTER TABLE "posts_locales" DROP COLUMN "faq_heading_eyebrow";
  ALTER TABLE "posts_locales" RENAME COLUMN "faq_heading_title" TO "faq_heading";
  ALTER TABLE "presets_blocks_hero_locales" ADD COLUMN "rich_text" jsonb;
  UPDATE "presets_blocks_hero_locales" SET "rich_text" = jsonb_build_object('root', jsonb_build_object(
    'type', 'root', 'format', '', 'indent', 0, 'version', 1, 'direction', 'ltr',
    'children', jsonb_build_array(jsonb_build_object(
      'type', 'paragraph', 'format', '', 'indent', 0, 'version', 1, 'direction', 'ltr', 'textFormat', 0,
      'children', jsonb_build_array(jsonb_build_object(
        'type', 'text', 'text', "heading_description", 'detail', 0, 'format', 0, 'mode', 'normal', 'style', '', 'version', 1
      ))
    ))
  ))
  WHERE "heading_description" IS NOT NULL;
  ALTER TABLE "presets_blocks_hero_locales" DROP COLUMN "heading_description";
  ALTER TABLE "presets_blocks_hero_locales" RENAME COLUMN "heading_title" TO "title";
  ALTER TABLE "presets_blocks_hero_locales" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "_gsec_v_blocks_hero" ADD COLUMN "rich_text" jsonb;
  UPDATE "_gsec_v_blocks_hero" SET "rich_text" = jsonb_build_object('root', jsonb_build_object(
    'type', 'root', 'format', '', 'indent', 0, 'version', 1, 'direction', 'ltr',
    'children', jsonb_build_array(jsonb_build_object(
      'type', 'paragraph', 'format', '', 'indent', 0, 'version', 1, 'direction', 'ltr', 'textFormat', 0,
      'children', jsonb_build_array(jsonb_build_object(
        'type', 'text', 'text', "heading_description", 'detail', 0, 'format', 0, 'mode', 'normal', 'style', '', 'version', 1
      ))
    ))
  ))
  WHERE "heading_description" IS NOT NULL;
  ALTER TABLE "_gsec_v_blocks_hero" DROP COLUMN "heading_description";
  ALTER TABLE "_gsec_v_blocks_hero" RENAME COLUMN "heading_title" TO "title";
  ALTER TABLE "_gsec_v_blocks_hero" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "gsec_blocks_hero" ADD COLUMN "rich_text" jsonb;
  UPDATE "gsec_blocks_hero" SET "rich_text" = jsonb_build_object('root', jsonb_build_object(
    'type', 'root', 'format', '', 'indent', 0, 'version', 1, 'direction', 'ltr',
    'children', jsonb_build_array(jsonb_build_object(
      'type', 'paragraph', 'format', '', 'indent', 0, 'version', 1, 'direction', 'ltr', 'textFormat', 0,
      'children', jsonb_build_array(jsonb_build_object(
        'type', 'text', 'text', "heading_description", 'detail', 0, 'format', 0, 'mode', 'normal', 'style', '', 'version', 1
      ))
    ))
  ))
  WHERE "heading_description" IS NOT NULL;
  ALTER TABLE "gsec_blocks_hero" DROP COLUMN "heading_description";
  ALTER TABLE "gsec_blocks_hero" RENAME COLUMN "heading_title" TO "title";
  ALTER TABLE "gsec_blocks_hero" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "_page_v_blocks_hero" ADD COLUMN "rich_text" jsonb;
  UPDATE "_page_v_blocks_hero" SET "rich_text" = jsonb_build_object('root', jsonb_build_object(
    'type', 'root', 'format', '', 'indent', 0, 'version', 1, 'direction', 'ltr',
    'children', jsonb_build_array(jsonb_build_object(
      'type', 'paragraph', 'format', '', 'indent', 0, 'version', 1, 'direction', 'ltr', 'textFormat', 0,
      'children', jsonb_build_array(jsonb_build_object(
        'type', 'text', 'text', "heading_description", 'detail', 0, 'format', 0, 'mode', 'normal', 'style', '', 'version', 1
      ))
    ))
  ))
  WHERE "heading_description" IS NOT NULL;
  ALTER TABLE "_page_v_blocks_hero" DROP COLUMN "heading_description";
  ALTER TABLE "_page_v_blocks_hero" RENAME COLUMN "heading_title" TO "title";
  ALTER TABLE "_page_v_blocks_hero" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "page_blocks_hero" ADD COLUMN "rich_text" jsonb;
  UPDATE "page_blocks_hero" SET "rich_text" = jsonb_build_object('root', jsonb_build_object(
    'type', 'root', 'format', '', 'indent', 0, 'version', 1, 'direction', 'ltr',
    'children', jsonb_build_array(jsonb_build_object(
      'type', 'paragraph', 'format', '', 'indent', 0, 'version', 1, 'direction', 'ltr', 'textFormat', 0,
      'children', jsonb_build_array(jsonb_build_object(
        'type', 'text', 'text', "heading_description", 'detail', 0, 'format', 0, 'mode', 'normal', 'style', '', 'version', 1
      ))
    ))
  ))
  WHERE "heading_description" IS NOT NULL;
  ALTER TABLE "page_blocks_hero" DROP COLUMN "heading_description";
  ALTER TABLE "page_blocks_hero" RENAME COLUMN "heading_title" TO "title";
  ALTER TABLE "page_blocks_hero" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  UPDATE "presets_blocks_newsletter_locales" SET "heading_title" = '' WHERE "heading_title" IS NULL;
  ALTER TABLE "presets_blocks_newsletter_locales" ALTER COLUMN "heading_title" SET NOT NULL;
  ALTER TABLE "presets_blocks_newsletter_locales" DROP COLUMN "heading_description";
  ALTER TABLE "presets_blocks_newsletter_locales" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "presets_blocks_newsletter_locales" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "_gsec_v_blocks_newsletter" DROP COLUMN "heading_description";
  ALTER TABLE "_gsec_v_blocks_newsletter" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "_gsec_v_blocks_newsletter" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "gsec_blocks_newsletter" DROP COLUMN "heading_description";
  ALTER TABLE "gsec_blocks_newsletter" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "gsec_blocks_newsletter" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "_page_v_blocks_newsletter" DROP COLUMN "heading_description";
  ALTER TABLE "_page_v_blocks_newsletter" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "_page_v_blocks_newsletter" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "page_blocks_newsletter" DROP COLUMN "heading_description";
  ALTER TABLE "page_blocks_newsletter" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "page_blocks_newsletter" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "presets_blocks_testimonials_list_locales" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "presets_blocks_testimonials_list_locales" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "presets_blocks_testimonials_list_locales" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "_gsec_v_blocks_testimonials_list" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "_gsec_v_blocks_testimonials_list" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "_gsec_v_blocks_testimonials_list" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "gsec_blocks_testimonials_list" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "gsec_blocks_testimonials_list" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "gsec_blocks_testimonials_list" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "_page_v_blocks_testimonials_list" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "_page_v_blocks_testimonials_list" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "_page_v_blocks_testimonials_list" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "page_blocks_testimonials_list" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "page_blocks_testimonials_list" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "page_blocks_testimonials_list" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "presets_blocks_cards_grid_locales" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "presets_blocks_cards_grid_locales" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "presets_blocks_cards_grid_locales" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "_gsec_v_blocks_cards_grid" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "_gsec_v_blocks_cards_grid" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "_gsec_v_blocks_cards_grid" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "gsec_blocks_cards_grid" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "gsec_blocks_cards_grid" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "gsec_blocks_cards_grid" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "_page_v_blocks_cards_grid" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "_page_v_blocks_cards_grid" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "_page_v_blocks_cards_grid" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "page_blocks_cards_grid" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "page_blocks_cards_grid" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "page_blocks_cards_grid" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "presets_blocks_chart_locales" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "presets_blocks_chart_locales" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "presets_blocks_chart_locales" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "_gsec_v_blocks_chart" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "_gsec_v_blocks_chart" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "_gsec_v_blocks_chart" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "gsec_blocks_chart" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "gsec_blocks_chart" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "gsec_blocks_chart" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "_page_v_blocks_chart" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "_page_v_blocks_chart" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "_page_v_blocks_chart" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "page_blocks_chart" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "page_blocks_chart" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "page_blocks_chart" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "presets_blocks_carousel_locales" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "presets_blocks_carousel_locales" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "presets_blocks_carousel_locales" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "_gsec_v_blocks_carousel" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "_gsec_v_blocks_carousel" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "_gsec_v_blocks_carousel" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "gsec_blocks_carousel" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "gsec_blocks_carousel" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "gsec_blocks_carousel" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "_page_v_blocks_carousel" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "_page_v_blocks_carousel" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "_page_v_blocks_carousel" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "page_blocks_carousel" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "page_blocks_carousel" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "page_blocks_carousel" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "presets_blocks_cta_band_locales" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "presets_blocks_cta_band_locales" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "presets_blocks_cta_band_locales" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "_gsec_v_blocks_cta_band" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "_gsec_v_blocks_cta_band" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "_gsec_v_blocks_cta_band" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "gsec_blocks_cta_band" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "gsec_blocks_cta_band" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "gsec_blocks_cta_band" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "_page_v_blocks_cta_band" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "_page_v_blocks_cta_band" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "_page_v_blocks_cta_band" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "page_blocks_cta_band" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "page_blocks_cta_band" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "page_blocks_cta_band" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "presets_blocks_faq_locales" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "presets_blocks_faq_locales" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "presets_blocks_faq_locales" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "_gsec_v_blocks_faq" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "_gsec_v_blocks_faq" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "_gsec_v_blocks_faq" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "gsec_blocks_faq" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "gsec_blocks_faq" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "gsec_blocks_faq" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "_page_v_blocks_faq" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "_page_v_blocks_faq" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "_page_v_blocks_faq" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "page_blocks_faq" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "page_blocks_faq" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "page_blocks_faq" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "presets_blocks_content_locales" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "presets_blocks_content_locales" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "presets_blocks_content_locales" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "_gsec_v_blocks_content" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "_gsec_v_blocks_content" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "_gsec_v_blocks_content" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "gsec_blocks_content" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "gsec_blocks_content" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "gsec_blocks_content" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "_page_v_blocks_content" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "_page_v_blocks_content" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "_page_v_blocks_content" RENAME COLUMN "heading_eyebrow" TO "eyebrow";
  ALTER TABLE "page_blocks_content" RENAME COLUMN "heading_description" TO "description";
  ALTER TABLE "page_blocks_content" RENAME COLUMN "heading_title" TO "heading";
  ALTER TABLE "page_blocks_content" RENAME COLUMN "heading_eyebrow" TO "eyebrow";`)
}
