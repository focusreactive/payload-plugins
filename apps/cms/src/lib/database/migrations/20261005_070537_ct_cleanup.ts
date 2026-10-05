import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Spanish is gone: drop its localized rows so the locale enums can be recreated without 'es'.
  await db.execute(sql`
   DO $$
  DECLARE r record;
  BEGIN
    FOR r IN SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND udt_name = '_locales'
    LOOP
      EXECUTE format('DELETE FROM %I WHERE %I = %L', r.table_name, r.column_name, 'es');
    END LOOP;
    FOR r IN SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND column_name = 'published_locale'
    LOOP
      EXECUTE format('UPDATE %I SET %I = NULL WHERE %I::text = %L', r.table_name, r.column_name, r.column_name, 'es');
    END LOOP;
  END $$;
  ALTER TABLE "page_blocks_testimonials_list_testimonial_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_testimonials_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_testimonials_list_testimonial_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_testimonials_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "testimonials" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "testimonials_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_testimonials_list_testimonial_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_testimonials_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_testimonials_list_testimonial_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_testimonials_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "document_embeddings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "form_submissions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_testimonials_list_testimonial_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_testimonials_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_testimonials_list_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "page_blocks_testimonials_list_testimonial_items" CASCADE;
  DROP TABLE "page_blocks_testimonials_list" CASCADE;
  DROP TABLE "_page_v_blocks_testimonials_list_testimonial_items" CASCADE;
  DROP TABLE "_page_v_blocks_testimonials_list" CASCADE;
  DROP TABLE "testimonials" CASCADE;
  DROP TABLE "testimonials_locales" CASCADE;
  DROP TABLE "gsec_blocks_testimonials_list_testimonial_items" CASCADE;
  DROP TABLE "gsec_blocks_testimonials_list" CASCADE;
  DROP TABLE "_gsec_v_blocks_testimonials_list_testimonial_items" CASCADE;
  DROP TABLE "_gsec_v_blocks_testimonials_list" CASCADE;
  DROP TABLE "document_embeddings" CASCADE;
  DROP TABLE "form_submissions" CASCADE;
  DROP TABLE "presets_blocks_testimonials_list_testimonial_items" CASCADE;
  DROP TABLE "presets_blocks_testimonials_list" CASCADE;
  DROP TABLE "presets_blocks_testimonials_list_locales" CASCADE;
  ALTER TABLE "page_blocks_form" RENAME COLUMN "form_name" TO "mautic_form_name";
  ALTER TABLE "_page_v_blocks_form" RENAME COLUMN "form_name" TO "mautic_form_name";
  ALTER TABLE "gsec_blocks_form" RENAME COLUMN "form_name" TO "mautic_form_name";
  ALTER TABLE "_gsec_v_blocks_form" RENAME COLUMN "form_name" TO "mautic_form_name";
  ALTER TABLE "presets_blocks_form" RENAME COLUMN "form_name" TO "mautic_form_name";
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_testimonials_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_document_embeddings_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_form_submissions_fk";
  
  ALTER TABLE "media_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_hero_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_hero" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_content_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_content" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_faq_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_faq" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_cards_grid_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_cards_grid" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_carousel_slides" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_carousel" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_logos_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_logos" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_chart_ranges_data_points" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_chart_ranges" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_chart" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_cta_band_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_cta_band" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_newsletter" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_stats_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_stats" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_posts_list" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_case_studies_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_case_studies" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_form_fields" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_form" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_video_embed" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_raw_html" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_global_section_slot" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_breadcrumbs" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_hero_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_hero" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_content_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_content" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_faq_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_faq" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_cards_grid_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_cards_grid" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_carousel_slides" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_carousel" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_logos_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_logos" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_chart_ranges_data_points" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_chart_ranges" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_chart" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_cta_band_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_cta_band" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_newsletter" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_stats_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_stats" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_posts_list" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_case_studies_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_case_studies" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_form_fields" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_form" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_video_embed" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_raw_html" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_global_section_slot" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_version_breadcrumbs" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "categories_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "authors_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "posts_faq_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "posts_cta_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "posts_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "posts_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "_posts_v_version_faq_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_posts_v_version_cta_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_posts_v_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_posts_v_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "header_nav_items_dropdown_links" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "header_nav_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "header_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "header_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "header_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "_header_v_version_nav_items_dropdown_links" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_header_v_version_nav_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_header_v_version_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_header_v_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_header_v_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "footer_link_groups_links" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "footer_link_groups" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "footer_legal_links" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "footer_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "footer_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "_footer_v_version_link_groups_links" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_footer_v_version_link_groups" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_footer_v_version_legal_links" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_footer_v_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_footer_v_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_hero_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_hero" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_content_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_content" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_faq_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_faq" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_cards_grid_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_cards_grid" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_carousel_slides" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_carousel" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_logos_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_logos" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_chart_ranges_data_points" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_chart_ranges" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_chart" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_cta_band_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_cta_band" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_newsletter" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_stats_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_stats" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_posts_list" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_case_studies_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_case_studies" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_form_fields" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_form" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_video_embed" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_raw_html" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_hero_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_hero" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_content_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_content" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_faq_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_faq" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_cards_grid" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_carousel_slides" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_carousel" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_logos_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_logos" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_chart_ranges_data_points" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_chart_ranges" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_chart" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_cta_band" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_newsletter" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_stats_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_stats" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_posts_list" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_case_studies_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_case_studies" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_form_fields" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_form" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_video_embed" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_raw_html" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "redirects_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "redirects_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_hero_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_hero_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_content_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_content_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_faq_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_faq_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_cards_grid_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_cards_grid_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_carousel_slides" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_carousel_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_logos_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_logos_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_chart_ranges_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_chart_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_cta_band_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_cta_band_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_newsletter_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_stats_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_posts_list_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_case_studies_items_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_case_studies_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_form_fields_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_form_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_video_embed_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_raw_html_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "site_settings_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_site_settings_v_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  DROP TYPE "public"."_locales";
  CREATE TYPE "public"."_locales" AS ENUM('en', 'de', 'ja');
  ALTER TABLE "media_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_hero_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_hero" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_content_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_content" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_faq_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_faq" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_cards_grid_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_cards_grid" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_carousel_slides" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_carousel" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_logos_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_logos" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_chart_ranges_data_points" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_chart_ranges" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_chart" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_cta_band_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_cta_band" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_newsletter" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_stats_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_stats" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_posts_list" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_case_studies_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_case_studies" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_form_fields" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_form" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_video_embed" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_raw_html" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_global_section_slot" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_breadcrumbs" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_rels" ALTER COLUMN "locale" SET DATA TYPE "public"."_locales" USING "locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_hero_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_hero" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_content_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_content" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_faq_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_faq" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_cards_grid_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_cards_grid" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_carousel_slides" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_carousel" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_logos_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_logos" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_chart_ranges_data_points" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_chart_ranges" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_chart" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_cta_band_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_cta_band" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_newsletter" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_stats_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_stats" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_posts_list" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_case_studies_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_case_studies" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_form_fields" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_form" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_video_embed" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_raw_html" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_global_section_slot" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_version_breadcrumbs" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_rels" ALTER COLUMN "locale" SET DATA TYPE "public"."_locales" USING "locale"::"public"."_locales";
  ALTER TABLE "categories_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "authors_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "posts_faq_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "posts_cta_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "posts_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "posts_rels" ALTER COLUMN "locale" SET DATA TYPE "public"."_locales" USING "locale"::"public"."_locales";
  ALTER TABLE "_posts_v_version_faq_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_posts_v_version_cta_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_posts_v_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_posts_v_rels" ALTER COLUMN "locale" SET DATA TYPE "public"."_locales" USING "locale"::"public"."_locales";
  ALTER TABLE "header_nav_items_dropdown_links" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "header_nav_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "header_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "header_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "header_rels" ALTER COLUMN "locale" SET DATA TYPE "public"."_locales" USING "locale"::"public"."_locales";
  ALTER TABLE "_header_v_version_nav_items_dropdown_links" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_header_v_version_nav_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_header_v_version_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_header_v_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_header_v_rels" ALTER COLUMN "locale" SET DATA TYPE "public"."_locales" USING "locale"::"public"."_locales";
  ALTER TABLE "footer_link_groups_links" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "footer_link_groups" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "footer_legal_links" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "footer_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "footer_rels" ALTER COLUMN "locale" SET DATA TYPE "public"."_locales" USING "locale"::"public"."_locales";
  ALTER TABLE "_footer_v_version_link_groups_links" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_footer_v_version_link_groups" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_footer_v_version_legal_links" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_footer_v_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_footer_v_rels" ALTER COLUMN "locale" SET DATA TYPE "public"."_locales" USING "locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_hero_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_hero" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_content_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_content" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_faq_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_faq" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_cards_grid_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_cards_grid" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_carousel_slides" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_carousel" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_logos_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_logos" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_chart_ranges_data_points" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_chart_ranges" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_chart" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_cta_band_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_cta_band" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_newsletter" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_stats_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_stats" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_posts_list" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_case_studies_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_case_studies" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_form_fields" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_form" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_video_embed" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_raw_html" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_rels" ALTER COLUMN "locale" SET DATA TYPE "public"."_locales" USING "locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_hero_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_hero" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_content_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_content" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_faq_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_faq" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_cards_grid" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_carousel_slides" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_carousel" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_logos_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_logos" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_chart_ranges_data_points" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_chart_ranges" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_chart" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_cta_band" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_newsletter" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_stats_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_stats" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_posts_list" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_case_studies_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_case_studies" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_form_fields" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_form" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_video_embed" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_raw_html" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_rels" ALTER COLUMN "locale" SET DATA TYPE "public"."_locales" USING "locale"::"public"."_locales";
  ALTER TABLE "redirects_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "redirects_rels" ALTER COLUMN "locale" SET DATA TYPE "public"."_locales" USING "locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_hero_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_hero_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_content_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_content_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_faq_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_faq_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_cards_grid_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_cards_grid_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_carousel_slides" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_carousel_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_logos_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_logos_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_chart_ranges_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_chart_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_cta_band_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_cta_band_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_newsletter_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_stats_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_posts_list_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_case_studies_items_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_case_studies_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_form_fields_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_form_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_video_embed_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_raw_html_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_rels" ALTER COLUMN "locale" SET DATA TYPE "public"."_locales" USING "locale"::"public"."_locales";
  ALTER TABLE "site_settings_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_site_settings_v_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v" ALTER COLUMN "published_locale" SET DATA TYPE text;
  DROP TYPE "public"."enum__page_v_published_locale";
  CREATE TYPE "public"."enum__page_v_published_locale" AS ENUM('en', 'de', 'ja');
  ALTER TABLE "_page_v" ALTER COLUMN "published_locale" SET DATA TYPE "public"."enum__page_v_published_locale" USING "published_locale"::"public"."enum__page_v_published_locale";
  ALTER TABLE "_posts_v" ALTER COLUMN "published_locale" SET DATA TYPE text;
  DROP TYPE "public"."enum__posts_v_published_locale";
  CREATE TYPE "public"."enum__posts_v_published_locale" AS ENUM('en', 'de', 'ja');
  ALTER TABLE "_posts_v" ALTER COLUMN "published_locale" SET DATA TYPE "public"."enum__posts_v_published_locale" USING "published_locale"::"public"."enum__posts_v_published_locale";
  ALTER TABLE "_header_v" ALTER COLUMN "published_locale" SET DATA TYPE text;
  DROP TYPE "public"."enum__header_v_published_locale";
  CREATE TYPE "public"."enum__header_v_published_locale" AS ENUM('en', 'de', 'ja');
  ALTER TABLE "_header_v" ALTER COLUMN "published_locale" SET DATA TYPE "public"."enum__header_v_published_locale" USING "published_locale"::"public"."enum__header_v_published_locale";
  ALTER TABLE "_footer_v" ALTER COLUMN "published_locale" SET DATA TYPE text;
  DROP TYPE "public"."enum__footer_v_published_locale";
  CREATE TYPE "public"."enum__footer_v_published_locale" AS ENUM('en', 'de', 'ja');
  ALTER TABLE "_footer_v" ALTER COLUMN "published_locale" SET DATA TYPE "public"."enum__footer_v_published_locale" USING "published_locale"::"public"."enum__footer_v_published_locale";
  ALTER TABLE "_gsec_v" ALTER COLUMN "published_locale" SET DATA TYPE text;
  DROP TYPE "public"."enum__gsec_v_published_locale";
  CREATE TYPE "public"."enum__gsec_v_published_locale" AS ENUM('en', 'de', 'ja');
  ALTER TABLE "_gsec_v" ALTER COLUMN "published_locale" SET DATA TYPE "public"."enum__gsec_v_published_locale" USING "published_locale"::"public"."enum__gsec_v_published_locale";
  ALTER TABLE "_site_settings_v" ALTER COLUMN "published_locale" SET DATA TYPE text;
  DROP TYPE "public"."enum__site_settings_v_published_locale";
  CREATE TYPE "public"."enum__site_settings_v_published_locale" AS ENUM('en', 'de', 'ja');
  ALTER TABLE "_site_settings_v" ALTER COLUMN "published_locale" SET DATA TYPE "public"."enum__site_settings_v_published_locale" USING "published_locale"::"public"."enum__site_settings_v_published_locale";
  DROP INDEX "payload_locked_documents_rels_testimonials_id_idx";
  DROP INDEX "payload_locked_documents_rels_document_embeddings_id_idx";
  DROP INDEX "payload_locked_documents_rels_form_submissions_id_idx";
  UPDATE "presets_blocks_form" SET "mautic_form_id" = '' WHERE "mautic_form_id" IS NULL;
  ALTER TABLE "presets_blocks_form" ALTER COLUMN "mautic_form_id" SET NOT NULL;
  ALTER TABLE "site_settings" ADD COLUMN "integrations_mautic_url" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "integrations_newsletter_form_mautic_form_id" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "integrations_newsletter_form_mautic_form_name" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_integrations_mautic_url" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_integrations_newsletter_form_mautic_form_id" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_integrations_newsletter_form_mautic_form_name" varchar;
  ALTER TABLE "page_blocks_form" DROP COLUMN "mode";
  ALTER TABLE "page_blocks_form" DROP COLUMN "mautic_action_url";
  ALTER TABLE "_page_v_blocks_form" DROP COLUMN "mode";
  ALTER TABLE "_page_v_blocks_form" DROP COLUMN "mautic_action_url";
  ALTER TABLE "posts" DROP COLUMN "content_format";
  ALTER TABLE "_posts_v" DROP COLUMN "version_content_format";
  ALTER TABLE "gsec_blocks_form" DROP COLUMN "mode";
  ALTER TABLE "gsec_blocks_form" DROP COLUMN "mautic_action_url";
  ALTER TABLE "_gsec_v_blocks_form" DROP COLUMN "mode";
  ALTER TABLE "_gsec_v_blocks_form" DROP COLUMN "mautic_action_url";
  ALTER TABLE "presets_blocks_form" DROP COLUMN "mode";
  ALTER TABLE "presets_blocks_form" DROP COLUMN "mautic_action_url";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "testimonials_create";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "testimonials_update";
  ALTER TABLE "payload_mcp_api_keys" DROP COLUMN "testimonials_delete";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "testimonials_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "document_embeddings_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "form_submissions_id";
  DROP TYPE "public"."enum_page_blocks_testimonials_list_section_theme";
  DROP TYPE "public"."enum_page_blocks_testimonials_list_section_max_width";
  DROP TYPE "public"."enum_page_blocks_testimonials_list_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_testimonials_list_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_form_mode";
  DROP TYPE "public"."enum__page_v_blocks_testimonials_list_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_testimonials_list_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_testimonials_list_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_testimonials_list_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_form_mode";
  DROP TYPE "public"."enum_posts_content_format";
  DROP TYPE "public"."enum__posts_v_version_content_format";
  DROP TYPE "public"."enum_gsec_blocks_testimonials_list_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_testimonials_list_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_testimonials_list_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_testimonials_list_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_form_mode";
  DROP TYPE "public"."enum__gsec_v_blocks_testimonials_list_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_testimonials_list_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_testimonials_list_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_testimonials_list_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_form_mode";
  DROP TYPE "public"."enum_document_embeddings_collection";
  DROP TYPE "public"."enum_presets_blocks_testimonials_list_section_theme";
  DROP TYPE "public"."enum_presets_blocks_testimonials_list_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_testimonials_list_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_testimonials_list_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_form_mode";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_testimonials_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_testimonials_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_testimonials_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_testimonials_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_form_mode" AS ENUM('internal', 'mautic');
  CREATE TYPE "public"."enum__page_v_blocks_testimonials_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_testimonials_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_testimonials_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_testimonials_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_form_mode" AS ENUM('internal', 'mautic');
  CREATE TYPE "public"."enum_posts_content_format" AS ENUM('richText', 'markdown');
  CREATE TYPE "public"."enum__posts_v_version_content_format" AS ENUM('richText', 'markdown');
  CREATE TYPE "public"."enum_gsec_blocks_testimonials_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_testimonials_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_testimonials_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_testimonials_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_form_mode" AS ENUM('internal', 'mautic');
  CREATE TYPE "public"."enum__gsec_v_blocks_testimonials_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_testimonials_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_testimonials_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_testimonials_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_form_mode" AS ENUM('internal', 'mautic');
  CREATE TYPE "public"."enum_document_embeddings_collection" AS ENUM('page', 'post');
  CREATE TYPE "public"."enum_presets_blocks_testimonials_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_testimonials_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_testimonials_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_testimonials_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_form_mode" AS ENUM('internal', 'mautic');
  ALTER TYPE "public"."_locales" ADD VALUE 'es' BEFORE 'de';
  ALTER TYPE "public"."enum__page_v_published_locale" ADD VALUE 'es' BEFORE 'de';
  ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE 'es' BEFORE 'de';
  ALTER TYPE "public"."enum__header_v_published_locale" ADD VALUE 'es' BEFORE 'de';
  ALTER TYPE "public"."enum__footer_v_published_locale" ADD VALUE 'es' BEFORE 'de';
  ALTER TYPE "public"."enum__gsec_v_published_locale" ADD VALUE 'es' BEFORE 'de';
  ALTER TYPE "public"."enum__site_settings_v_published_locale" ADD VALUE 'es' BEFORE 'de';
  CREATE TABLE "page_blocks_testimonials_list_testimonial_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"testimonial_id" integer
  );
  
  CREATE TABLE "page_blocks_testimonials_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"show_rating" boolean DEFAULT true,
  	"show_avatar" boolean DEFAULT true,
  	"duration" numeric DEFAULT 60,
  	"section_theme" "enum_page_blocks_testimonials_list_section_theme",
  	"section_max_width" "enum_page_blocks_testimonials_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_testimonials_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_testimonials_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_testimonials_list_testimonial_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"testimonial_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_testimonials_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"show_rating" boolean DEFAULT true,
  	"show_avatar" boolean DEFAULT true,
  	"duration" numeric DEFAULT 60,
  	"section_theme" "enum__page_v_blocks_testimonials_list_section_theme",
  	"section_max_width" "enum__page_v_blocks_testimonials_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_testimonials_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_testimonials_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "testimonials" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"author" varchar NOT NULL,
  	"company" varchar,
  	"rating" numeric DEFAULT 5,
  	"avatar_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "testimonials_locales" (
  	"position" varchar,
  	"content" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "gsec_blocks_testimonials_list_testimonial_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"testimonial_id" integer
  );
  
  CREATE TABLE "gsec_blocks_testimonials_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"show_rating" boolean DEFAULT true,
  	"show_avatar" boolean DEFAULT true,
  	"duration" numeric DEFAULT 60,
  	"section_theme" "enum_gsec_blocks_testimonials_list_section_theme",
  	"section_max_width" "enum_gsec_blocks_testimonials_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_testimonials_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_testimonials_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_testimonials_list_testimonial_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"testimonial_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_testimonials_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"show_rating" boolean DEFAULT true,
  	"show_avatar" boolean DEFAULT true,
  	"duration" numeric DEFAULT 60,
  	"section_theme" "enum__gsec_v_blocks_testimonials_list_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_testimonials_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_testimonials_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_testimonials_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "document_embeddings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"document_id" varchar NOT NULL,
  	"collection" "enum_document_embeddings_collection" NOT NULL,
  	"locale" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "form_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"form_name" varchar NOT NULL,
  	"email" varchar,
  	"page" varchar,
  	"referrer" varchar,
  	"utm_source" varchar,
  	"utm_medium" varchar,
  	"utm_campaign" varchar,
  	"utm_term" varchar,
  	"utm_content" varchar,
  	"data" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "presets_blocks_testimonials_list_testimonial_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"testimonial_id" integer NOT NULL
  );
  
  CREATE TABLE "presets_blocks_testimonials_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"show_rating" boolean DEFAULT true,
  	"show_avatar" boolean DEFAULT true,
  	"duration" numeric DEFAULT 60,
  	"section_theme" "enum_presets_blocks_testimonials_list_section_theme",
  	"section_max_width" "enum_presets_blocks_testimonials_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_testimonials_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_testimonials_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_testimonials_list_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "presets_blocks_form" ALTER COLUMN "mautic_form_id" DROP NOT NULL;
  ALTER TABLE "page_blocks_form" ADD COLUMN "mode" "enum_page_blocks_form_mode" DEFAULT 'internal';
  ALTER TABLE "page_blocks_form" RENAME COLUMN "mautic_form_name" TO "form_name";
  ALTER TABLE "page_blocks_form" ADD COLUMN "mautic_action_url" varchar DEFAULT 'https://mautic.example.com/form/submit?formId=';
  ALTER TABLE "_page_v_blocks_form" ADD COLUMN "mode" "enum__page_v_blocks_form_mode" DEFAULT 'internal';
  ALTER TABLE "_page_v_blocks_form" RENAME COLUMN "mautic_form_name" TO "form_name";
  ALTER TABLE "_page_v_blocks_form" ADD COLUMN "mautic_action_url" varchar DEFAULT 'https://mautic.example.com/form/submit?formId=';
  ALTER TABLE "posts" ADD COLUMN "content_format" "enum_posts_content_format" DEFAULT 'richText';
  ALTER TABLE "_posts_v" ADD COLUMN "version_content_format" "enum__posts_v_version_content_format" DEFAULT 'richText';
  ALTER TABLE "gsec_blocks_form" ADD COLUMN "mode" "enum_gsec_blocks_form_mode" DEFAULT 'internal';
  ALTER TABLE "gsec_blocks_form" RENAME COLUMN "mautic_form_name" TO "form_name";
  ALTER TABLE "gsec_blocks_form" ADD COLUMN "mautic_action_url" varchar DEFAULT 'https://mautic.example.com/form/submit?formId=';
  ALTER TABLE "_gsec_v_blocks_form" ADD COLUMN "mode" "enum__gsec_v_blocks_form_mode" DEFAULT 'internal';
  ALTER TABLE "_gsec_v_blocks_form" RENAME COLUMN "mautic_form_name" TO "form_name";
  ALTER TABLE "_gsec_v_blocks_form" ADD COLUMN "mautic_action_url" varchar DEFAULT 'https://mautic.example.com/form/submit?formId=';
  ALTER TABLE "presets_blocks_form" ADD COLUMN "mode" "enum_presets_blocks_form_mode" DEFAULT 'internal' NOT NULL;
  ALTER TABLE "presets_blocks_form" RENAME COLUMN "mautic_form_name" TO "form_name";
  ALTER TABLE "presets_blocks_form" ADD COLUMN "mautic_action_url" varchar DEFAULT 'https://mautic.example.com/form/submit?formId=';
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "testimonials_create" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "testimonials_update" boolean DEFAULT false;
  ALTER TABLE "payload_mcp_api_keys" ADD COLUMN "testimonials_delete" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "testimonials_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "document_embeddings_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "form_submissions_id" integer;
  ALTER TABLE "page_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "page_blocks_testimonials_list_testimonial_items_testimonial_id_testimonials_id_fk" FOREIGN KEY ("testimonial_id") REFERENCES "public"."testimonials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "page_blocks_testimonials_list_testimonial_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_testimonials_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_testimonials_list" ADD CONSTRAINT "page_blocks_testimonials_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_testimonials_list" ADD CONSTRAINT "page_blocks_testimonials_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "_page_v_blocks_testimonials_list_testimonial_items_testimonial_id_testimonials_id_fk" FOREIGN KEY ("testimonial_id") REFERENCES "public"."testimonials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "_page_v_blocks_testimonials_list_testimonial_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_testimonials_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_testimonials_list" ADD CONSTRAINT "_page_v_blocks_testimonials_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_testimonials_list" ADD CONSTRAINT "_page_v_blocks_testimonials_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "testimonials_locales" ADD CONSTRAINT "testimonials_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "gsec_blocks_testimonials_list_testimonial_items_testimonial_id_testimonials_id_fk" FOREIGN KEY ("testimonial_id") REFERENCES "public"."testimonials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "gsec_blocks_testimonials_list_testimonial_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_testimonials_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_testimonials_list" ADD CONSTRAINT "gsec_blocks_testimonials_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_testimonials_list" ADD CONSTRAINT "gsec_blocks_testimonials_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "_gsec_v_blocks_testimonials_list_testimonial_items_testimonial_id_testimonials_id_fk" FOREIGN KEY ("testimonial_id") REFERENCES "public"."testimonials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "_gsec_v_blocks_testimonials_list_testimonial_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_testimonials_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_testimonials_list" ADD CONSTRAINT "_gsec_v_blocks_testimonials_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_testimonials_list" ADD CONSTRAINT "_gsec_v_blocks_testimonials_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "presets_blocks_testimonials_list_testimonial_items_testimonial_id_testimonials_id_fk" FOREIGN KEY ("testimonial_id") REFERENCES "public"."testimonials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "presets_blocks_testimonials_list_testimonial_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_testimonials_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_testimonials_list" ADD CONSTRAINT "presets_blocks_testimonials_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_testimonials_list" ADD CONSTRAINT "presets_blocks_testimonials_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_testimonials_list_locales" ADD CONSTRAINT "presets_blocks_testimonials_list_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_testimonials_list"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_testimonials_list_testimonial_items_order_idx" ON "page_blocks_testimonials_list_testimonial_items" USING btree ("_order");
  CREATE INDEX "page_blocks_testimonials_list_testimonial_items_parent_id_idx" ON "page_blocks_testimonials_list_testimonial_items" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_testimonials_list_testimonial_items_locale_idx" ON "page_blocks_testimonials_list_testimonial_items" USING btree ("_locale");
  CREATE INDEX "page_blocks_testimonials_list_testimonial_items_testimon_idx" ON "page_blocks_testimonials_list_testimonial_items" USING btree ("testimonial_id");
  CREATE INDEX "page_blocks_testimonials_list_order_idx" ON "page_blocks_testimonials_list" USING btree ("_order");
  CREATE INDEX "page_blocks_testimonials_list_parent_id_idx" ON "page_blocks_testimonials_list" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_testimonials_list_path_idx" ON "page_blocks_testimonials_list" USING btree ("_path");
  CREATE INDEX "page_blocks_testimonials_list_locale_idx" ON "page_blocks_testimonials_list" USING btree ("_locale");
  CREATE INDEX "page_blocks_testimonials_list_section_background_section_idx" ON "page_blocks_testimonials_list" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_testimonials_list_testimonial_items_order_idx" ON "_page_v_blocks_testimonials_list_testimonial_items" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_testimonials_list_testimonial_items_parent_id_idx" ON "_page_v_blocks_testimonials_list_testimonial_items" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_testimonials_list_testimonial_items_locale_idx" ON "_page_v_blocks_testimonials_list_testimonial_items" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_testimonials_list_testimonial_items_testi_idx" ON "_page_v_blocks_testimonials_list_testimonial_items" USING btree ("testimonial_id");
  CREATE INDEX "_page_v_blocks_testimonials_list_order_idx" ON "_page_v_blocks_testimonials_list" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_testimonials_list_parent_id_idx" ON "_page_v_blocks_testimonials_list" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_testimonials_list_path_idx" ON "_page_v_blocks_testimonials_list" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_testimonials_list_locale_idx" ON "_page_v_blocks_testimonials_list" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_testimonials_list_section_background_sect_idx" ON "_page_v_blocks_testimonials_list" USING btree ("section_background_media_id");
  CREATE INDEX "testimonials_avatar_idx" ON "testimonials" USING btree ("avatar_id");
  CREATE INDEX "testimonials_updated_at_idx" ON "testimonials" USING btree ("updated_at");
  CREATE INDEX "testimonials_created_at_idx" ON "testimonials" USING btree ("created_at");
  CREATE UNIQUE INDEX "testimonials_locales_locale_parent_id_unique" ON "testimonials_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "gsec_blocks_testimonials_list_testimonial_items_order_idx" ON "gsec_blocks_testimonials_list_testimonial_items" USING btree ("_order");
  CREATE INDEX "gsec_blocks_testimonials_list_testimonial_items_parent_id_idx" ON "gsec_blocks_testimonials_list_testimonial_items" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_testimonials_list_testimonial_items_locale_idx" ON "gsec_blocks_testimonials_list_testimonial_items" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_testimonials_list_testimonial_items_testimon_idx" ON "gsec_blocks_testimonials_list_testimonial_items" USING btree ("testimonial_id");
  CREATE INDEX "gsec_blocks_testimonials_list_order_idx" ON "gsec_blocks_testimonials_list" USING btree ("_order");
  CREATE INDEX "gsec_blocks_testimonials_list_parent_id_idx" ON "gsec_blocks_testimonials_list" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_testimonials_list_path_idx" ON "gsec_blocks_testimonials_list" USING btree ("_path");
  CREATE INDEX "gsec_blocks_testimonials_list_locale_idx" ON "gsec_blocks_testimonials_list" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_testimonials_list_section_background_section_idx" ON "gsec_blocks_testimonials_list" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_testimonials_list_testimonial_items_order_idx" ON "_gsec_v_blocks_testimonials_list_testimonial_items" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_testimonials_list_testimonial_items_parent_id_idx" ON "_gsec_v_blocks_testimonials_list_testimonial_items" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_testimonials_list_testimonial_items_locale_idx" ON "_gsec_v_blocks_testimonials_list_testimonial_items" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_testimonials_list_testimonial_items_testi_idx" ON "_gsec_v_blocks_testimonials_list_testimonial_items" USING btree ("testimonial_id");
  CREATE INDEX "_gsec_v_blocks_testimonials_list_order_idx" ON "_gsec_v_blocks_testimonials_list" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_testimonials_list_parent_id_idx" ON "_gsec_v_blocks_testimonials_list" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_testimonials_list_path_idx" ON "_gsec_v_blocks_testimonials_list" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_testimonials_list_locale_idx" ON "_gsec_v_blocks_testimonials_list" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_testimonials_list_section_background_sect_idx" ON "_gsec_v_blocks_testimonials_list" USING btree ("section_background_media_id");
  CREATE INDEX "document_embeddings_updated_at_idx" ON "document_embeddings" USING btree ("updated_at");
  CREATE INDEX "document_embeddings_created_at_idx" ON "document_embeddings" USING btree ("created_at");
  CREATE INDEX "form_submissions_updated_at_idx" ON "form_submissions" USING btree ("updated_at");
  CREATE INDEX "form_submissions_created_at_idx" ON "form_submissions" USING btree ("created_at");
  CREATE INDEX "presets_blocks_testimonials_list_testimonial_items_order_idx" ON "presets_blocks_testimonials_list_testimonial_items" USING btree ("_order");
  CREATE INDEX "presets_blocks_testimonials_list_testimonial_items_parent_id_idx" ON "presets_blocks_testimonials_list_testimonial_items" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_testimonials_list_testimonial_items_testi_idx" ON "presets_blocks_testimonials_list_testimonial_items" USING btree ("testimonial_id");
  CREATE INDEX "presets_blocks_testimonials_list_order_idx" ON "presets_blocks_testimonials_list" USING btree ("_order");
  CREATE INDEX "presets_blocks_testimonials_list_parent_id_idx" ON "presets_blocks_testimonials_list" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_testimonials_list_path_idx" ON "presets_blocks_testimonials_list" USING btree ("_path");
  CREATE INDEX "presets_blocks_testimonials_list_section_background_sect_idx" ON "presets_blocks_testimonials_list" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_testimonials_list_locales_locale_parent_id_un" ON "presets_blocks_testimonials_list_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_document_embeddings_fk" FOREIGN KEY ("document_embeddings_id") REFERENCES "public"."document_embeddings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_form_submissions_fk" FOREIGN KEY ("form_submissions_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_testimonials_id_idx" ON "payload_locked_documents_rels" USING btree ("testimonials_id");
  CREATE INDEX "payload_locked_documents_rels_document_embeddings_id_idx" ON "payload_locked_documents_rels" USING btree ("document_embeddings_id");
  CREATE INDEX "payload_locked_documents_rels_form_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("form_submissions_id");
  ALTER TABLE "site_settings" DROP COLUMN "integrations_mautic_url";
  ALTER TABLE "site_settings" DROP COLUMN "integrations_newsletter_form_mautic_form_id";
  ALTER TABLE "site_settings" DROP COLUMN "integrations_newsletter_form_mautic_form_name";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_integrations_mautic_url";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_integrations_newsletter_form_mautic_form_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_integrations_newsletter_form_mautic_form_name";`)
}
