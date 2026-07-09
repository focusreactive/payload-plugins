import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_hero_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_content_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_content" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_testimonials_list_testimonial_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_testimonials_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_cards_grid_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_cards_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_carousel_slides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_carousel" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_logos_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_chart_ranges_data_points" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_chart_ranges" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_chart" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_cta_band_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_cta_band" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_newsletter" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_stats_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_raw_html" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_hero_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_content_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_content" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_testimonials_list_testimonial_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_testimonials_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_cards_grid_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_cards_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_carousel_slides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_carousel" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_logos_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_chart_ranges_data_points" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_chart_ranges" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_chart" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_cta_band_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_cta_band" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_newsletter" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_stats_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_raw_html" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_hero_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_content_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_content" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_testimonials_list_testimonial_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_testimonials_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_cards_grid_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_cards_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_carousel_slides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_carousel" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_logos_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_chart_ranges_data_points" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_chart_ranges" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_chart" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_cta_band_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_cta_band" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_newsletter" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_stats_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_raw_html" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_hero_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_content_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_content" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_testimonials_list_testimonial_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_testimonials_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_cards_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_carousel_slides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_carousel" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_logos_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_chart_ranges_data_points" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_chart_ranges" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_chart" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_cta_band" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_newsletter" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_stats_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_raw_html" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_hero_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_hero_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_content_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_content" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_content_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_faq_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_testimonials_list_testimonial_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_testimonials_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_testimonials_list_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_cards_grid_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_cards_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_cards_grid_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_carousel_slides" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_carousel" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_carousel_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_logos_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_logos_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_chart_ranges_data_points" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_chart_ranges" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_chart_ranges_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_chart" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_chart_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_cta_band_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_cta_band" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_cta_band_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_newsletter" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_newsletter_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_stats_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_raw_html" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_raw_html_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "page_blocks_hero_actions" CASCADE;
  DROP TABLE "page_blocks_hero" CASCADE;
  DROP TABLE "page_blocks_content_actions" CASCADE;
  DROP TABLE "page_blocks_content" CASCADE;
  DROP TABLE "page_blocks_faq_items" CASCADE;
  DROP TABLE "page_blocks_faq" CASCADE;
  DROP TABLE "page_blocks_testimonials_list_testimonial_items" CASCADE;
  DROP TABLE "page_blocks_testimonials_list" CASCADE;
  DROP TABLE "page_blocks_cards_grid_items" CASCADE;
  DROP TABLE "page_blocks_cards_grid" CASCADE;
  DROP TABLE "page_blocks_carousel_slides" CASCADE;
  DROP TABLE "page_blocks_carousel" CASCADE;
  DROP TABLE "page_blocks_logos_items" CASCADE;
  DROP TABLE "page_blocks_logos" CASCADE;
  DROP TABLE "page_blocks_chart_ranges_data_points" CASCADE;
  DROP TABLE "page_blocks_chart_ranges" CASCADE;
  DROP TABLE "page_blocks_chart" CASCADE;
  DROP TABLE "page_blocks_cta_band_actions" CASCADE;
  DROP TABLE "page_blocks_cta_band" CASCADE;
  DROP TABLE "page_blocks_newsletter" CASCADE;
  DROP TABLE "page_blocks_stats_items" CASCADE;
  DROP TABLE "page_blocks_stats" CASCADE;
  DROP TABLE "page_blocks_raw_html" CASCADE;
  DROP TABLE "_page_v_blocks_hero_actions" CASCADE;
  DROP TABLE "_page_v_blocks_hero" CASCADE;
  DROP TABLE "_page_v_blocks_content_actions" CASCADE;
  DROP TABLE "_page_v_blocks_content" CASCADE;
  DROP TABLE "_page_v_blocks_faq_items" CASCADE;
  DROP TABLE "_page_v_blocks_faq" CASCADE;
  DROP TABLE "_page_v_blocks_testimonials_list_testimonial_items" CASCADE;
  DROP TABLE "_page_v_blocks_testimonials_list" CASCADE;
  DROP TABLE "_page_v_blocks_cards_grid_items" CASCADE;
  DROP TABLE "_page_v_blocks_cards_grid" CASCADE;
  DROP TABLE "_page_v_blocks_carousel_slides" CASCADE;
  DROP TABLE "_page_v_blocks_carousel" CASCADE;
  DROP TABLE "_page_v_blocks_logos_items" CASCADE;
  DROP TABLE "_page_v_blocks_logos" CASCADE;
  DROP TABLE "_page_v_blocks_chart_ranges_data_points" CASCADE;
  DROP TABLE "_page_v_blocks_chart_ranges" CASCADE;
  DROP TABLE "_page_v_blocks_chart" CASCADE;
  DROP TABLE "_page_v_blocks_cta_band_actions" CASCADE;
  DROP TABLE "_page_v_blocks_cta_band" CASCADE;
  DROP TABLE "_page_v_blocks_newsletter" CASCADE;
  DROP TABLE "_page_v_blocks_stats_items" CASCADE;
  DROP TABLE "_page_v_blocks_stats" CASCADE;
  DROP TABLE "_page_v_blocks_raw_html" CASCADE;
  DROP TABLE "gsec_blocks_hero_actions" CASCADE;
  DROP TABLE "gsec_blocks_hero" CASCADE;
  DROP TABLE "gsec_blocks_content_actions" CASCADE;
  DROP TABLE "gsec_blocks_content" CASCADE;
  DROP TABLE "gsec_blocks_faq_items" CASCADE;
  DROP TABLE "gsec_blocks_faq" CASCADE;
  DROP TABLE "gsec_blocks_testimonials_list_testimonial_items" CASCADE;
  DROP TABLE "gsec_blocks_testimonials_list" CASCADE;
  DROP TABLE "gsec_blocks_cards_grid_items" CASCADE;
  DROP TABLE "gsec_blocks_cards_grid" CASCADE;
  DROP TABLE "gsec_blocks_carousel_slides" CASCADE;
  DROP TABLE "gsec_blocks_carousel" CASCADE;
  DROP TABLE "gsec_blocks_logos_items" CASCADE;
  DROP TABLE "gsec_blocks_logos" CASCADE;
  DROP TABLE "gsec_blocks_chart_ranges_data_points" CASCADE;
  DROP TABLE "gsec_blocks_chart_ranges" CASCADE;
  DROP TABLE "gsec_blocks_chart" CASCADE;
  DROP TABLE "gsec_blocks_cta_band_actions" CASCADE;
  DROP TABLE "gsec_blocks_cta_band" CASCADE;
  DROP TABLE "gsec_blocks_newsletter" CASCADE;
  DROP TABLE "gsec_blocks_stats_items" CASCADE;
  DROP TABLE "gsec_blocks_stats" CASCADE;
  DROP TABLE "gsec_blocks_raw_html" CASCADE;
  DROP TABLE "_gsec_v_blocks_hero_actions" CASCADE;
  DROP TABLE "_gsec_v_blocks_hero" CASCADE;
  DROP TABLE "_gsec_v_blocks_content_actions" CASCADE;
  DROP TABLE "_gsec_v_blocks_content" CASCADE;
  DROP TABLE "_gsec_v_blocks_faq_items" CASCADE;
  DROP TABLE "_gsec_v_blocks_faq" CASCADE;
  DROP TABLE "_gsec_v_blocks_testimonials_list_testimonial_items" CASCADE;
  DROP TABLE "_gsec_v_blocks_testimonials_list" CASCADE;
  DROP TABLE "_gsec_v_blocks_cards_grid_items" CASCADE;
  DROP TABLE "_gsec_v_blocks_cards_grid" CASCADE;
  DROP TABLE "_gsec_v_blocks_carousel_slides" CASCADE;
  DROP TABLE "_gsec_v_blocks_carousel" CASCADE;
  DROP TABLE "_gsec_v_blocks_logos_items" CASCADE;
  DROP TABLE "_gsec_v_blocks_logos" CASCADE;
  DROP TABLE "_gsec_v_blocks_chart_ranges_data_points" CASCADE;
  DROP TABLE "_gsec_v_blocks_chart_ranges" CASCADE;
  DROP TABLE "_gsec_v_blocks_chart" CASCADE;
  DROP TABLE "_gsec_v_blocks_cta_band_actions" CASCADE;
  DROP TABLE "_gsec_v_blocks_cta_band" CASCADE;
  DROP TABLE "_gsec_v_blocks_newsletter" CASCADE;
  DROP TABLE "_gsec_v_blocks_stats_items" CASCADE;
  DROP TABLE "_gsec_v_blocks_stats" CASCADE;
  DROP TABLE "_gsec_v_blocks_raw_html" CASCADE;
  DROP TABLE "presets_blocks_hero_actions" CASCADE;
  DROP TABLE "presets_blocks_hero" CASCADE;
  DROP TABLE "presets_blocks_hero_locales" CASCADE;
  DROP TABLE "presets_blocks_content_actions" CASCADE;
  DROP TABLE "presets_blocks_content" CASCADE;
  DROP TABLE "presets_blocks_content_locales" CASCADE;
  DROP TABLE "presets_blocks_faq_items" CASCADE;
  DROP TABLE "presets_blocks_faq" CASCADE;
  DROP TABLE "presets_blocks_faq_locales" CASCADE;
  DROP TABLE "presets_blocks_testimonials_list_testimonial_items" CASCADE;
  DROP TABLE "presets_blocks_testimonials_list" CASCADE;
  DROP TABLE "presets_blocks_testimonials_list_locales" CASCADE;
  DROP TABLE "presets_blocks_cards_grid_items" CASCADE;
  DROP TABLE "presets_blocks_cards_grid" CASCADE;
  DROP TABLE "presets_blocks_cards_grid_locales" CASCADE;
  DROP TABLE "presets_blocks_carousel_slides" CASCADE;
  DROP TABLE "presets_blocks_carousel" CASCADE;
  DROP TABLE "presets_blocks_carousel_locales" CASCADE;
  DROP TABLE "presets_blocks_logos_items" CASCADE;
  DROP TABLE "presets_blocks_logos" CASCADE;
  DROP TABLE "presets_blocks_logos_locales" CASCADE;
  DROP TABLE "presets_blocks_chart_ranges_data_points" CASCADE;
  DROP TABLE "presets_blocks_chart_ranges" CASCADE;
  DROP TABLE "presets_blocks_chart_ranges_locales" CASCADE;
  DROP TABLE "presets_blocks_chart" CASCADE;
  DROP TABLE "presets_blocks_chart_locales" CASCADE;
  DROP TABLE "presets_blocks_cta_band_actions" CASCADE;
  DROP TABLE "presets_blocks_cta_band" CASCADE;
  DROP TABLE "presets_blocks_cta_band_locales" CASCADE;
  DROP TABLE "presets_blocks_newsletter" CASCADE;
  DROP TABLE "presets_blocks_newsletter_locales" CASCADE;
  DROP TABLE "presets_blocks_stats_items" CASCADE;
  DROP TABLE "presets_blocks_stats" CASCADE;
  DROP TABLE "presets_blocks_raw_html" CASCADE;
  DROP TABLE "presets_blocks_raw_html_locales" CASCADE;
  DROP INDEX "presets_rels_locale_idx";
  DROP INDEX "presets_rels_page_id_idx";
  DROP INDEX "presets_rels_posts_id_idx";
  CREATE INDEX "presets_rels_page_id_idx" ON "presets_rels" USING btree ("page_id");
  CREATE INDEX "presets_rels_posts_id_idx" ON "presets_rels" USING btree ("posts_id");
  ALTER TABLE "presets_rels" DROP COLUMN "locale";
  DROP TYPE "public"."enum_page_blocks_hero_actions_type";
  DROP TYPE "public"."enum_page_blocks_hero_actions_custom_page";
  DROP TYPE "public"."enum_page_blocks_hero_actions_appearance";
  DROP TYPE "public"."enum_page_blocks_hero_variant";
  DROP TYPE "public"."enum_page_blocks_hero_image_aspect_ratio";
  DROP TYPE "public"."enum_page_blocks_hero_section_theme";
  DROP TYPE "public"."enum_page_blocks_hero_section_max_width";
  DROP TYPE "public"."enum_page_blocks_hero_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_hero_section_padding_x";
  DROP TYPE "public"."sec_bg_ovrly";
  DROP TYPE "public"."enum_page_blocks_content_actions_type";
  DROP TYPE "public"."enum_page_blocks_content_actions_custom_page";
  DROP TYPE "public"."enum_page_blocks_content_actions_appearance";
  DROP TYPE "public"."enum_page_blocks_content_layout";
  DROP TYPE "public"."enum_page_blocks_content_section_theme";
  DROP TYPE "public"."enum_page_blocks_content_section_max_width";
  DROP TYPE "public"."enum_page_blocks_content_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_content_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_faq_section_theme";
  DROP TYPE "public"."enum_page_blocks_faq_section_max_width";
  DROP TYPE "public"."enum_page_blocks_faq_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_faq_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_testimonials_list_section_theme";
  DROP TYPE "public"."enum_page_blocks_testimonials_list_section_max_width";
  DROP TYPE "public"."enum_page_blocks_testimonials_list_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_testimonials_list_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_cards_grid_items_icon";
  DROP TYPE "public"."enum_page_blocks_cards_grid_items_image_aspect_ratio";
  DROP TYPE "public"."enum_page_blocks_cards_grid_items_link_type";
  DROP TYPE "public"."enum_page_blocks_cards_grid_items_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_cards_grid_items_link_appearance";
  DROP TYPE "public"."enum_page_blocks_cards_grid_items_align_variant";
  DROP TYPE "public"."enum_page_blocks_cards_grid_items_rounded";
  DROP TYPE "public"."enum_page_blocks_cards_grid_items_background_color";
  DROP TYPE "public"."enum_page_blocks_cards_grid_section_theme";
  DROP TYPE "public"."enum_page_blocks_cards_grid_section_max_width";
  DROP TYPE "public"."enum_page_blocks_cards_grid_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_cards_grid_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_carousel_slides_image_aspect_ratio";
  DROP TYPE "public"."enum_page_blocks_carousel_effect";
  DROP TYPE "public"."enum_page_blocks_carousel_section_theme";
  DROP TYPE "public"."enum_page_blocks_carousel_section_max_width";
  DROP TYPE "public"."enum_page_blocks_carousel_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_carousel_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_logos_items_image_aspect_ratio";
  DROP TYPE "public"."enum_page_blocks_logos_items_link_type";
  DROP TYPE "public"."enum_page_blocks_logos_items_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_logos_align_variant";
  DROP TYPE "public"."enum_page_blocks_logos_section_theme";
  DROP TYPE "public"."enum_page_blocks_logos_section_max_width";
  DROP TYPE "public"."enum_page_blocks_logos_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_logos_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_chart_section_theme";
  DROP TYPE "public"."enum_page_blocks_chart_section_max_width";
  DROP TYPE "public"."enum_page_blocks_chart_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_chart_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_cta_band_actions_type";
  DROP TYPE "public"."enum_page_blocks_cta_band_actions_custom_page";
  DROP TYPE "public"."enum_page_blocks_cta_band_actions_appearance";
  DROP TYPE "public"."enum_page_blocks_cta_band_section_theme";
  DROP TYPE "public"."enum_page_blocks_cta_band_section_max_width";
  DROP TYPE "public"."enum_page_blocks_cta_band_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_cta_band_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_newsletter_section_theme";
  DROP TYPE "public"."enum_page_blocks_newsletter_section_max_width";
  DROP TYPE "public"."enum_page_blocks_newsletter_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_newsletter_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_stats_section_theme";
  DROP TYPE "public"."enum_page_blocks_stats_section_max_width";
  DROP TYPE "public"."enum_page_blocks_stats_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_stats_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_raw_html_section_theme";
  DROP TYPE "public"."enum_page_blocks_raw_html_section_max_width";
  DROP TYPE "public"."enum_page_blocks_raw_html_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_raw_html_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_hero_actions_type";
  DROP TYPE "public"."enum__page_v_blocks_hero_actions_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_hero_actions_appearance";
  DROP TYPE "public"."enum__page_v_blocks_hero_variant";
  DROP TYPE "public"."enum__page_v_blocks_hero_image_aspect_ratio";
  DROP TYPE "public"."enum__page_v_blocks_hero_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_hero_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_hero_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_hero_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_content_actions_type";
  DROP TYPE "public"."enum__page_v_blocks_content_actions_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_content_actions_appearance";
  DROP TYPE "public"."enum__page_v_blocks_content_layout";
  DROP TYPE "public"."enum__page_v_blocks_content_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_content_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_content_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_content_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_faq_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_faq_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_faq_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_faq_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_testimonials_list_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_testimonials_list_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_testimonials_list_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_testimonials_list_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_items_icon";
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_items_image_aspect_ratio";
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_items_link_type";
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_items_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_items_link_appearance";
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_items_align_variant";
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_items_rounded";
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_items_background_color";
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_carousel_slides_image_aspect_ratio";
  DROP TYPE "public"."enum__page_v_blocks_carousel_effect";
  DROP TYPE "public"."enum__page_v_blocks_carousel_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_carousel_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_carousel_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_carousel_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_logos_items_image_aspect_ratio";
  DROP TYPE "public"."enum__page_v_blocks_logos_items_link_type";
  DROP TYPE "public"."enum__page_v_blocks_logos_items_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_logos_align_variant";
  DROP TYPE "public"."enum__page_v_blocks_logos_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_logos_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_logos_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_logos_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_chart_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_chart_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_chart_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_chart_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_cta_band_actions_type";
  DROP TYPE "public"."enum__page_v_blocks_cta_band_actions_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_cta_band_actions_appearance";
  DROP TYPE "public"."enum__page_v_blocks_cta_band_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_cta_band_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_cta_band_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_cta_band_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_newsletter_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_newsletter_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_newsletter_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_newsletter_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_stats_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_stats_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_stats_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_stats_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_raw_html_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_raw_html_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_raw_html_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_raw_html_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_hero_actions_type";
  DROP TYPE "public"."enum_gsec_blocks_hero_actions_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_hero_actions_appearance";
  DROP TYPE "public"."enum_gsec_blocks_hero_variant";
  DROP TYPE "public"."enum_gsec_blocks_hero_image_aspect_ratio";
  DROP TYPE "public"."enum_gsec_blocks_hero_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_hero_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_hero_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_hero_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_content_actions_type";
  DROP TYPE "public"."enum_gsec_blocks_content_actions_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_content_actions_appearance";
  DROP TYPE "public"."enum_gsec_blocks_content_layout";
  DROP TYPE "public"."enum_gsec_blocks_content_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_content_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_content_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_content_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_faq_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_faq_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_faq_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_faq_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_testimonials_list_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_testimonials_list_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_testimonials_list_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_testimonials_list_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_items_icon";
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_items_image_aspect_ratio";
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_items_link_type";
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_items_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_items_link_appearance";
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_items_align_variant";
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_items_rounded";
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_items_background_color";
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_carousel_slides_image_aspect_ratio";
  DROP TYPE "public"."enum_gsec_blocks_carousel_effect";
  DROP TYPE "public"."enum_gsec_blocks_carousel_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_carousel_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_carousel_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_carousel_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_logos_items_image_aspect_ratio";
  DROP TYPE "public"."enum_gsec_blocks_logos_items_link_type";
  DROP TYPE "public"."enum_gsec_blocks_logos_items_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_logos_align_variant";
  DROP TYPE "public"."enum_gsec_blocks_logos_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_logos_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_logos_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_logos_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_chart_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_chart_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_chart_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_chart_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_cta_band_actions_type";
  DROP TYPE "public"."enum_gsec_blocks_cta_band_actions_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_cta_band_actions_appearance";
  DROP TYPE "public"."enum_gsec_blocks_cta_band_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_cta_band_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_cta_band_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_cta_band_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_newsletter_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_newsletter_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_newsletter_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_newsletter_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_stats_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_stats_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_stats_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_stats_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_raw_html_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_raw_html_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_raw_html_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_raw_html_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_actions_type";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_actions_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_actions_appearance";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_variant";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_image_aspect_ratio";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_content_actions_type";
  DROP TYPE "public"."enum__gsec_v_blocks_content_actions_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_content_actions_appearance";
  DROP TYPE "public"."enum__gsec_v_blocks_content_layout";
  DROP TYPE "public"."enum__gsec_v_blocks_content_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_content_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_content_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_content_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_faq_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_faq_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_faq_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_faq_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_testimonials_list_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_testimonials_list_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_testimonials_list_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_testimonials_list_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_items_icon";
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_items_image_aspect_ratio";
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_items_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_items_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_items_link_appearance";
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_items_align_variant";
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_items_rounded";
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_items_background_color";
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_carousel_slides_image_aspect_ratio";
  DROP TYPE "public"."enum__gsec_v_blocks_carousel_effect";
  DROP TYPE "public"."enum__gsec_v_blocks_carousel_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_carousel_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_carousel_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_carousel_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_logos_items_image_aspect_ratio";
  DROP TYPE "public"."enum__gsec_v_blocks_logos_items_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_logos_items_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_logos_align_variant";
  DROP TYPE "public"."enum__gsec_v_blocks_logos_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_logos_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_logos_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_logos_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_chart_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_chart_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_chart_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_chart_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_cta_band_actions_type";
  DROP TYPE "public"."enum__gsec_v_blocks_cta_band_actions_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_cta_band_actions_appearance";
  DROP TYPE "public"."enum__gsec_v_blocks_cta_band_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_cta_band_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_cta_band_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_cta_band_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_newsletter_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_newsletter_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_newsletter_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_newsletter_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_stats_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_stats_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_stats_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_stats_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_raw_html_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_raw_html_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_raw_html_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_raw_html_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_hero_actions_type";
  DROP TYPE "public"."enum_presets_blocks_hero_actions_custom_page";
  DROP TYPE "public"."enum_presets_blocks_hero_actions_appearance";
  DROP TYPE "public"."enum_presets_blocks_hero_variant";
  DROP TYPE "public"."enum_presets_blocks_hero_image_aspect_ratio";
  DROP TYPE "public"."enum_presets_blocks_hero_section_theme";
  DROP TYPE "public"."enum_presets_blocks_hero_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_hero_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_hero_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_content_actions_type";
  DROP TYPE "public"."enum_presets_blocks_content_actions_custom_page";
  DROP TYPE "public"."enum_presets_blocks_content_actions_appearance";
  DROP TYPE "public"."enum_presets_blocks_content_layout";
  DROP TYPE "public"."enum_presets_blocks_content_section_theme";
  DROP TYPE "public"."enum_presets_blocks_content_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_content_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_content_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_faq_section_theme";
  DROP TYPE "public"."enum_presets_blocks_faq_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_faq_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_faq_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_testimonials_list_section_theme";
  DROP TYPE "public"."enum_presets_blocks_testimonials_list_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_testimonials_list_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_testimonials_list_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_cards_grid_items_icon";
  DROP TYPE "public"."enum_presets_blocks_cards_grid_items_image_aspect_ratio";
  DROP TYPE "public"."enum_presets_blocks_cards_grid_items_link_type";
  DROP TYPE "public"."enum_presets_blocks_cards_grid_items_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_cards_grid_items_link_appearance";
  DROP TYPE "public"."enum_presets_blocks_cards_grid_items_align_variant";
  DROP TYPE "public"."enum_presets_blocks_cards_grid_items_rounded";
  DROP TYPE "public"."enum_presets_blocks_cards_grid_items_background_color";
  DROP TYPE "public"."enum_presets_blocks_cards_grid_section_theme";
  DROP TYPE "public"."enum_presets_blocks_cards_grid_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_cards_grid_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_cards_grid_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_carousel_slides_image_aspect_ratio";
  DROP TYPE "public"."enum_presets_blocks_carousel_effect";
  DROP TYPE "public"."enum_presets_blocks_carousel_section_theme";
  DROP TYPE "public"."enum_presets_blocks_carousel_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_carousel_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_carousel_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_logos_items_image_aspect_ratio";
  DROP TYPE "public"."enum_presets_blocks_logos_items_link_type";
  DROP TYPE "public"."enum_presets_blocks_logos_items_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_logos_align_variant";
  DROP TYPE "public"."enum_presets_blocks_logos_section_theme";
  DROP TYPE "public"."enum_presets_blocks_logos_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_logos_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_logos_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_chart_section_theme";
  DROP TYPE "public"."enum_presets_blocks_chart_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_chart_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_chart_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_cta_band_actions_type";
  DROP TYPE "public"."enum_presets_blocks_cta_band_actions_custom_page";
  DROP TYPE "public"."enum_presets_blocks_cta_band_actions_appearance";
  DROP TYPE "public"."enum_presets_blocks_cta_band_section_theme";
  DROP TYPE "public"."enum_presets_blocks_cta_band_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_cta_band_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_cta_band_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_newsletter_section_theme";
  DROP TYPE "public"."enum_presets_blocks_newsletter_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_newsletter_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_newsletter_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_stats_section_theme";
  DROP TYPE "public"."enum_presets_blocks_stats_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_stats_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_stats_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_raw_html_section_theme";
  DROP TYPE "public"."enum_presets_blocks_raw_html_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_raw_html_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_raw_html_section_padding_x";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_hero_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_hero_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_hero_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_page_blocks_hero_variant" AS ENUM('showcase', 'centered');
  CREATE TYPE "public"."enum_page_blocks_hero_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum_page_blocks_hero_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_hero_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_hero_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_hero_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."sec_bg_ovrly" AS ENUM('black', 'white');
  CREATE TYPE "public"."enum_page_blocks_content_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_content_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_content_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_page_blocks_content_layout" AS ENUM('image-text', 'text-image');
  CREATE TYPE "public"."enum_page_blocks_content_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_content_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_content_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_content_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_faq_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_faq_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_faq_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_faq_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_testimonials_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_testimonials_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_testimonials_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_testimonials_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_cards_grid_items_icon" AS ENUM('map', 'clock', 'zap', 'activity', 'layout-grid', 'sparkles', 'file-text', 'users', 'bar-chart-3', 'plug', 'shield', 'git-branch', 'gauge', 'bell', 'layers', 'workflow', 'calendar', 'compass', 'target', 'wand-2');
  CREATE TYPE "public"."enum_page_blocks_cards_grid_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum_page_blocks_cards_grid_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_cards_grid_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_cards_grid_items_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_page_blocks_cards_grid_items_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_page_blocks_cards_grid_items_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum_page_blocks_cards_grid_items_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum_page_blocks_cards_grid_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_cards_grid_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_cards_grid_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_cards_grid_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_carousel_slides_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum_page_blocks_carousel_effect" AS ENUM('slide', 'fade', 'cube', 'flip', 'coverflow', 'cards');
  CREATE TYPE "public"."enum_page_blocks_carousel_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_carousel_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_carousel_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_carousel_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_logos_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum_page_blocks_logos_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_logos_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_logos_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_page_blocks_logos_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_logos_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_logos_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_logos_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_chart_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_chart_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_chart_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_chart_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_cta_band_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_cta_band_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_cta_band_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_page_blocks_cta_band_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_cta_band_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_cta_band_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_cta_band_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_newsletter_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_newsletter_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_newsletter_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_newsletter_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_stats_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_stats_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_stats_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_stats_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_raw_html_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_raw_html_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_raw_html_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_raw_html_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_hero_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_hero_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_hero_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__page_v_blocks_hero_variant" AS ENUM('showcase', 'centered');
  CREATE TYPE "public"."enum__page_v_blocks_hero_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum__page_v_blocks_hero_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_hero_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_hero_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_hero_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_content_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_content_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_content_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__page_v_blocks_content_layout" AS ENUM('image-text', 'text-image');
  CREATE TYPE "public"."enum__page_v_blocks_content_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_content_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_content_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_content_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_faq_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_faq_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_faq_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_faq_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_testimonials_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_testimonials_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_testimonials_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_testimonials_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_items_icon" AS ENUM('map', 'clock', 'zap', 'activity', 'layout-grid', 'sparkles', 'file-text', 'users', 'bar-chart-3', 'plug', 'shield', 'git-branch', 'gauge', 'bell', 'layers', 'workflow', 'calendar', 'compass', 'target', 'wand-2');
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_items_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_items_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_items_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_items_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_carousel_slides_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum__page_v_blocks_carousel_effect" AS ENUM('slide', 'fade', 'cube', 'flip', 'coverflow', 'cards');
  CREATE TYPE "public"."enum__page_v_blocks_carousel_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_carousel_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_carousel_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_carousel_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_logos_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum__page_v_blocks_logos_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_logos_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_logos_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum__page_v_blocks_logos_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_logos_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_logos_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_logos_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_chart_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_chart_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_chart_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_chart_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_cta_band_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_cta_band_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_cta_band_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__page_v_blocks_cta_band_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_cta_band_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_cta_band_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_cta_band_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_newsletter_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_newsletter_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_newsletter_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_newsletter_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_stats_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_stats_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_stats_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_stats_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_raw_html_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_raw_html_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_raw_html_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_raw_html_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_hero_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_hero_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_hero_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_gsec_blocks_hero_variant" AS ENUM('showcase', 'centered');
  CREATE TYPE "public"."enum_gsec_blocks_hero_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum_gsec_blocks_hero_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_hero_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_hero_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_hero_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_content_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_content_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_content_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_gsec_blocks_content_layout" AS ENUM('image-text', 'text-image');
  CREATE TYPE "public"."enum_gsec_blocks_content_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_content_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_content_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_content_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_faq_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_faq_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_faq_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_faq_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_testimonials_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_testimonials_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_testimonials_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_testimonials_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_items_icon" AS ENUM('map', 'clock', 'zap', 'activity', 'layout-grid', 'sparkles', 'file-text', 'users', 'bar-chart-3', 'plug', 'shield', 'git-branch', 'gauge', 'bell', 'layers', 'workflow', 'calendar', 'compass', 'target', 'wand-2');
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_items_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_items_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_items_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_items_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_carousel_slides_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum_gsec_blocks_carousel_effect" AS ENUM('slide', 'fade', 'cube', 'flip', 'coverflow', 'cards');
  CREATE TYPE "public"."enum_gsec_blocks_carousel_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_carousel_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_carousel_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_carousel_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_logos_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum_gsec_blocks_logos_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_logos_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_logos_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_gsec_blocks_logos_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_logos_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_logos_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_logos_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_chart_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_chart_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_chart_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_chart_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_cta_band_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_cta_band_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_cta_band_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_gsec_blocks_cta_band_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_cta_band_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_cta_band_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_cta_band_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_newsletter_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_newsletter_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_newsletter_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_newsletter_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_stats_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_stats_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_stats_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_stats_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_raw_html_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_raw_html_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_raw_html_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_raw_html_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_variant" AS ENUM('showcase', 'centered');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_content_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_content_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_content_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__gsec_v_blocks_content_layout" AS ENUM('image-text', 'text-image');
  CREATE TYPE "public"."enum__gsec_v_blocks_content_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_content_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_content_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_content_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_faq_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_faq_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_faq_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_faq_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_testimonials_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_testimonials_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_testimonials_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_testimonials_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_items_icon" AS ENUM('map', 'clock', 'zap', 'activity', 'layout-grid', 'sparkles', 'file-text', 'users', 'bar-chart-3', 'plug', 'shield', 'git-branch', 'gauge', 'bell', 'layers', 'workflow', 'calendar', 'compass', 'target', 'wand-2');
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_items_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_items_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_items_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_items_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_carousel_slides_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum__gsec_v_blocks_carousel_effect" AS ENUM('slide', 'fade', 'cube', 'flip', 'coverflow', 'cards');
  CREATE TYPE "public"."enum__gsec_v_blocks_carousel_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_carousel_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_carousel_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_carousel_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_logos_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum__gsec_v_blocks_logos_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_logos_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_logos_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum__gsec_v_blocks_logos_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_logos_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_logos_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_logos_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_chart_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_chart_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_chart_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_chart_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_cta_band_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_cta_band_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_cta_band_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__gsec_v_blocks_cta_band_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_cta_band_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_cta_band_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_cta_band_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_newsletter_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_newsletter_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_newsletter_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_newsletter_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_stats_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_stats_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_stats_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_stats_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_raw_html_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_raw_html_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_raw_html_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_raw_html_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_hero_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_hero_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_hero_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_presets_blocks_hero_variant" AS ENUM('showcase', 'centered');
  CREATE TYPE "public"."enum_presets_blocks_hero_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum_presets_blocks_hero_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_hero_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_hero_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_hero_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_content_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_content_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_content_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_presets_blocks_content_layout" AS ENUM('image-text', 'text-image');
  CREATE TYPE "public"."enum_presets_blocks_content_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_content_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_content_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_content_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_faq_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_faq_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_faq_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_faq_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_testimonials_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_testimonials_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_testimonials_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_testimonials_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_items_icon" AS ENUM('map', 'clock', 'zap', 'activity', 'layout-grid', 'sparkles', 'file-text', 'users', 'bar-chart-3', 'plug', 'shield', 'git-branch', 'gauge', 'bell', 'layers', 'workflow', 'calendar', 'compass', 'target', 'wand-2');
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_items_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_items_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_items_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_items_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_carousel_slides_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum_presets_blocks_carousel_effect" AS ENUM('slide', 'fade', 'cube', 'flip', 'coverflow', 'cards');
  CREATE TYPE "public"."enum_presets_blocks_carousel_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_carousel_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_carousel_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_carousel_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_logos_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum_presets_blocks_logos_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_logos_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_logos_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_presets_blocks_logos_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_logos_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_logos_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_logos_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_chart_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_chart_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_chart_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_chart_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_cta_band_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_cta_band_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_cta_band_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_presets_blocks_cta_band_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_cta_band_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_cta_band_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_cta_band_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_newsletter_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_newsletter_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_newsletter_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_newsletter_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_stats_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_stats_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_stats_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_stats_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_raw_html_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_raw_html_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_raw_html_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_raw_html_section_padding_x" AS ENUM('none', 'base');
  CREATE TABLE "page_blocks_hero_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_page_blocks_hero_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_page_blocks_hero_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum_page_blocks_hero_actions_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "page_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_page_blocks_hero_variant" DEFAULT 'showcase',
  	"eyebrow" varchar,
  	"title" varchar,
  	"rich_text" jsonb,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum_page_blocks_hero_image_aspect_ratio" DEFAULT '1/1',
  	"section_theme" "enum_page_blocks_hero_section_theme",
  	"section_max_width" "enum_page_blocks_hero_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_hero_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_hero_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_content_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_page_blocks_content_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_page_blocks_content_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum_page_blocks_content_actions_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "page_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"layout" "enum_page_blocks_content_layout" DEFAULT 'image-text',
  	"image_id" integer,
  	"content" jsonb,
  	"section_theme" "enum_page_blocks_content_section_theme",
  	"section_max_width" "enum_page_blocks_content_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_content_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_content_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "page_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"section_theme" "enum_page_blocks_faq_section_theme",
  	"section_max_width" "enum_page_blocks_faq_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_faq_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_faq_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
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
  
  CREATE TABLE "page_blocks_cards_grid_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_page_blocks_cards_grid_items_icon",
  	"title" varchar,
  	"description" varchar,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum_page_blocks_cards_grid_items_image_aspect_ratio" DEFAULT '1/1',
  	"link_type" "enum_page_blocks_cards_grid_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_page_blocks_cards_grid_items_link_custom_page",
  	"link_label" varchar,
  	"link_appearance" "enum_page_blocks_cards_grid_items_link_appearance" DEFAULT 'default',
  	"align_variant" "enum_page_blocks_cards_grid_items_align_variant" DEFAULT 'center',
  	"rounded" "enum_page_blocks_cards_grid_items_rounded" DEFAULT 'none',
  	"background_color" "enum_page_blocks_cards_grid_items_background_color" DEFAULT 'none'
  );
  
  CREATE TABLE "page_blocks_cards_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"columns" numeric DEFAULT 3,
  	"section_theme" "enum_page_blocks_cards_grid_section_theme",
  	"section_max_width" "enum_page_blocks_cards_grid_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_cards_grid_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_cards_grid_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_carousel_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum_page_blocks_carousel_slides_image_aspect_ratio" DEFAULT '1/1',
  	"text" jsonb
  );
  
  CREATE TABLE "page_blocks_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"effect" "enum_page_blocks_carousel_effect" DEFAULT 'slide',
  	"section_theme" "enum_page_blocks_carousel_section_theme",
  	"section_max_width" "enum_page_blocks_carousel_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_carousel_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_carousel_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_logos_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum_page_blocks_logos_items_image_aspect_ratio" DEFAULT '1/1',
  	"link_type" "enum_page_blocks_logos_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_page_blocks_logos_items_link_custom_page",
  	"link_label" varchar
  );
  
  CREATE TABLE "page_blocks_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"align_variant" "enum_page_blocks_logos_align_variant" DEFAULT 'center',
  	"section_theme" "enum_page_blocks_logos_section_theme",
  	"section_max_width" "enum_page_blocks_logos_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_logos_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_logos_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_chart_ranges_data_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" numeric
  );
  
  CREATE TABLE "page_blocks_chart_ranges" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "page_blocks_chart" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"section_theme" "enum_page_blocks_chart_section_theme",
  	"section_max_width" "enum_page_blocks_chart_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_chart_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_chart_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_cta_band_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_page_blocks_cta_band_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_page_blocks_cta_band_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum_page_blocks_cta_band_actions_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "page_blocks_cta_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"section_theme" "enum_page_blocks_cta_band_section_theme",
  	"section_max_width" "enum_page_blocks_cta_band_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_cta_band_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_cta_band_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_newsletter" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"input_placeholder" varchar,
  	"button_label" varchar,
  	"disclaimer" varchar,
  	"section_theme" "enum_page_blocks_newsletter_section_theme",
  	"section_max_width" "enum_page_blocks_newsletter_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_newsletter_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_newsletter_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "page_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_theme" "enum_page_blocks_stats_section_theme",
  	"section_max_width" "enum_page_blocks_stats_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_stats_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_stats_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_raw_html" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"html" varchar,
  	"section_theme" "enum_page_blocks_raw_html_section_theme",
  	"section_max_width" "enum_page_blocks_raw_html_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_raw_html_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_raw_html_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_hero_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__page_v_blocks_hero_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum__page_v_blocks_hero_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum__page_v_blocks_hero_actions_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__page_v_blocks_hero_variant" DEFAULT 'showcase',
  	"eyebrow" varchar,
  	"title" varchar,
  	"rich_text" jsonb,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum__page_v_blocks_hero_image_aspect_ratio" DEFAULT '1/1',
  	"section_theme" "enum__page_v_blocks_hero_section_theme",
  	"section_max_width" "enum__page_v_blocks_hero_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_hero_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_hero_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_content_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__page_v_blocks_content_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum__page_v_blocks_content_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum__page_v_blocks_content_actions_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"layout" "enum__page_v_blocks_content_layout" DEFAULT 'image-text',
  	"image_id" integer,
  	"content" jsonb,
  	"section_theme" "enum__page_v_blocks_content_section_theme",
  	"section_max_width" "enum__page_v_blocks_content_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_content_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_content_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"section_theme" "enum__page_v_blocks_faq_section_theme",
  	"section_max_width" "enum__page_v_blocks_faq_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_faq_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_faq_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
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
  
  CREATE TABLE "_page_v_blocks_cards_grid_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" "enum__page_v_blocks_cards_grid_items_icon",
  	"title" varchar,
  	"description" varchar,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum__page_v_blocks_cards_grid_items_image_aspect_ratio" DEFAULT '1/1',
  	"link_type" "enum__page_v_blocks_cards_grid_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__page_v_blocks_cards_grid_items_link_custom_page",
  	"link_label" varchar,
  	"link_appearance" "enum__page_v_blocks_cards_grid_items_link_appearance" DEFAULT 'default',
  	"align_variant" "enum__page_v_blocks_cards_grid_items_align_variant" DEFAULT 'center',
  	"rounded" "enum__page_v_blocks_cards_grid_items_rounded" DEFAULT 'none',
  	"background_color" "enum__page_v_blocks_cards_grid_items_background_color" DEFAULT 'none',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_cards_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"columns" numeric DEFAULT 3,
  	"section_theme" "enum__page_v_blocks_cards_grid_section_theme",
  	"section_max_width" "enum__page_v_blocks_cards_grid_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_cards_grid_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_cards_grid_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_carousel_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum__page_v_blocks_carousel_slides_image_aspect_ratio" DEFAULT '1/1',
  	"text" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"effect" "enum__page_v_blocks_carousel_effect" DEFAULT 'slide',
  	"section_theme" "enum__page_v_blocks_carousel_section_theme",
  	"section_max_width" "enum__page_v_blocks_carousel_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_carousel_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_carousel_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_logos_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum__page_v_blocks_logos_items_image_aspect_ratio" DEFAULT '1/1',
  	"link_type" "enum__page_v_blocks_logos_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__page_v_blocks_logos_items_link_custom_page",
  	"link_label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"align_variant" "enum__page_v_blocks_logos_align_variant" DEFAULT 'center',
  	"section_theme" "enum__page_v_blocks_logos_section_theme",
  	"section_max_width" "enum__page_v_blocks_logos_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_logos_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_logos_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_chart_ranges_data_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_chart_ranges" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_chart" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"section_theme" "enum__page_v_blocks_chart_section_theme",
  	"section_max_width" "enum__page_v_blocks_chart_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_chart_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_chart_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_cta_band_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__page_v_blocks_cta_band_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum__page_v_blocks_cta_band_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum__page_v_blocks_cta_band_actions_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_cta_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"section_theme" "enum__page_v_blocks_cta_band_section_theme",
  	"section_max_width" "enum__page_v_blocks_cta_band_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_cta_band_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_cta_band_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_newsletter" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"input_placeholder" varchar,
  	"button_label" varchar,
  	"disclaimer" varchar,
  	"section_theme" "enum__page_v_blocks_newsletter_section_theme",
  	"section_max_width" "enum__page_v_blocks_newsletter_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_newsletter_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_newsletter_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"section_theme" "enum__page_v_blocks_stats_section_theme",
  	"section_max_width" "enum__page_v_blocks_stats_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_stats_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_stats_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_raw_html" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"html" varchar,
  	"section_theme" "enum__page_v_blocks_raw_html_section_theme",
  	"section_max_width" "enum__page_v_blocks_raw_html_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_raw_html_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_raw_html_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_hero_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_gsec_blocks_hero_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_gsec_blocks_hero_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum_gsec_blocks_hero_actions_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "gsec_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_gsec_blocks_hero_variant" DEFAULT 'showcase',
  	"eyebrow" varchar,
  	"title" varchar,
  	"rich_text" jsonb,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum_gsec_blocks_hero_image_aspect_ratio" DEFAULT '1/1',
  	"section_theme" "enum_gsec_blocks_hero_section_theme",
  	"section_max_width" "enum_gsec_blocks_hero_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_hero_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_hero_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_content_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_gsec_blocks_content_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_gsec_blocks_content_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum_gsec_blocks_content_actions_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "gsec_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"layout" "enum_gsec_blocks_content_layout" DEFAULT 'image-text',
  	"image_id" integer,
  	"content" jsonb,
  	"section_theme" "enum_gsec_blocks_content_section_theme",
  	"section_max_width" "enum_gsec_blocks_content_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_content_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_content_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "gsec_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"section_theme" "enum_gsec_blocks_faq_section_theme",
  	"section_max_width" "enum_gsec_blocks_faq_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_faq_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_faq_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
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
  
  CREATE TABLE "gsec_blocks_cards_grid_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_gsec_blocks_cards_grid_items_icon",
  	"title" varchar,
  	"description" varchar,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum_gsec_blocks_cards_grid_items_image_aspect_ratio" DEFAULT '1/1',
  	"link_type" "enum_gsec_blocks_cards_grid_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_gsec_blocks_cards_grid_items_link_custom_page",
  	"link_label" varchar,
  	"link_appearance" "enum_gsec_blocks_cards_grid_items_link_appearance" DEFAULT 'default',
  	"align_variant" "enum_gsec_blocks_cards_grid_items_align_variant" DEFAULT 'center',
  	"rounded" "enum_gsec_blocks_cards_grid_items_rounded" DEFAULT 'none',
  	"background_color" "enum_gsec_blocks_cards_grid_items_background_color" DEFAULT 'none'
  );
  
  CREATE TABLE "gsec_blocks_cards_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"columns" numeric DEFAULT 3,
  	"section_theme" "enum_gsec_blocks_cards_grid_section_theme",
  	"section_max_width" "enum_gsec_blocks_cards_grid_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_cards_grid_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_cards_grid_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_carousel_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum_gsec_blocks_carousel_slides_image_aspect_ratio" DEFAULT '1/1',
  	"text" jsonb
  );
  
  CREATE TABLE "gsec_blocks_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"effect" "enum_gsec_blocks_carousel_effect" DEFAULT 'slide',
  	"section_theme" "enum_gsec_blocks_carousel_section_theme",
  	"section_max_width" "enum_gsec_blocks_carousel_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_carousel_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_carousel_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_logos_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum_gsec_blocks_logos_items_image_aspect_ratio" DEFAULT '1/1',
  	"link_type" "enum_gsec_blocks_logos_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_gsec_blocks_logos_items_link_custom_page",
  	"link_label" varchar
  );
  
  CREATE TABLE "gsec_blocks_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"align_variant" "enum_gsec_blocks_logos_align_variant" DEFAULT 'center',
  	"section_theme" "enum_gsec_blocks_logos_section_theme",
  	"section_max_width" "enum_gsec_blocks_logos_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_logos_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_logos_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_chart_ranges_data_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" numeric
  );
  
  CREATE TABLE "gsec_blocks_chart_ranges" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "gsec_blocks_chart" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"section_theme" "enum_gsec_blocks_chart_section_theme",
  	"section_max_width" "enum_gsec_blocks_chart_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_chart_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_chart_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_cta_band_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_gsec_blocks_cta_band_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_gsec_blocks_cta_band_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum_gsec_blocks_cta_band_actions_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "gsec_blocks_cta_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"section_theme" "enum_gsec_blocks_cta_band_section_theme",
  	"section_max_width" "enum_gsec_blocks_cta_band_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_cta_band_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_cta_band_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_newsletter" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"input_placeholder" varchar,
  	"button_label" varchar,
  	"disclaimer" varchar,
  	"section_theme" "enum_gsec_blocks_newsletter_section_theme",
  	"section_max_width" "enum_gsec_blocks_newsletter_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_newsletter_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_newsletter_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "gsec_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_theme" "enum_gsec_blocks_stats_section_theme",
  	"section_max_width" "enum_gsec_blocks_stats_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_stats_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_stats_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_raw_html" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"html" varchar,
  	"section_theme" "enum_gsec_blocks_raw_html_section_theme",
  	"section_max_width" "enum_gsec_blocks_raw_html_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_raw_html_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_raw_html_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_hero_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__gsec_v_blocks_hero_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum__gsec_v_blocks_hero_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum__gsec_v_blocks_hero_actions_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant" "enum__gsec_v_blocks_hero_variant" DEFAULT 'showcase',
  	"eyebrow" varchar,
  	"title" varchar,
  	"rich_text" jsonb,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum__gsec_v_blocks_hero_image_aspect_ratio" DEFAULT '1/1',
  	"section_theme" "enum__gsec_v_blocks_hero_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_hero_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_hero_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_hero_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_content_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__gsec_v_blocks_content_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum__gsec_v_blocks_content_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum__gsec_v_blocks_content_actions_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"layout" "enum__gsec_v_blocks_content_layout" DEFAULT 'image-text',
  	"image_id" integer,
  	"content" jsonb,
  	"section_theme" "enum__gsec_v_blocks_content_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_content_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_content_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_content_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"section_theme" "enum__gsec_v_blocks_faq_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_faq_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_faq_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_faq_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
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
  
  CREATE TABLE "_gsec_v_blocks_cards_grid_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon" "enum__gsec_v_blocks_cards_grid_items_icon",
  	"title" varchar,
  	"description" varchar,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum__gsec_v_blocks_cards_grid_items_image_aspect_ratio" DEFAULT '1/1',
  	"link_type" "enum__gsec_v_blocks_cards_grid_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__gsec_v_blocks_cards_grid_items_link_custom_page",
  	"link_label" varchar,
  	"link_appearance" "enum__gsec_v_blocks_cards_grid_items_link_appearance" DEFAULT 'default',
  	"align_variant" "enum__gsec_v_blocks_cards_grid_items_align_variant" DEFAULT 'center',
  	"rounded" "enum__gsec_v_blocks_cards_grid_items_rounded" DEFAULT 'none',
  	"background_color" "enum__gsec_v_blocks_cards_grid_items_background_color" DEFAULT 'none',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_cards_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"columns" numeric DEFAULT 3,
  	"section_theme" "enum__gsec_v_blocks_cards_grid_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_cards_grid_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_cards_grid_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_cards_grid_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_carousel_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum__gsec_v_blocks_carousel_slides_image_aspect_ratio" DEFAULT '1/1',
  	"text" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"effect" "enum__gsec_v_blocks_carousel_effect" DEFAULT 'slide',
  	"section_theme" "enum__gsec_v_blocks_carousel_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_carousel_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_carousel_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_carousel_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_logos_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum__gsec_v_blocks_logos_items_image_aspect_ratio" DEFAULT '1/1',
  	"link_type" "enum__gsec_v_blocks_logos_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__gsec_v_blocks_logos_items_link_custom_page",
  	"link_label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"align_variant" "enum__gsec_v_blocks_logos_align_variant" DEFAULT 'center',
  	"section_theme" "enum__gsec_v_blocks_logos_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_logos_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_logos_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_logos_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_chart_ranges_data_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_chart_ranges" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_chart" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"title" varchar,
  	"subtitle" varchar,
  	"section_theme" "enum__gsec_v_blocks_chart_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_chart_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_chart_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_chart_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_cta_band_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__gsec_v_blocks_cta_band_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum__gsec_v_blocks_cta_band_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum__gsec_v_blocks_cta_band_actions_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_cta_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"section_theme" "enum__gsec_v_blocks_cta_band_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_cta_band_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_cta_band_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_cta_band_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_newsletter" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"input_placeholder" varchar,
  	"button_label" varchar,
  	"disclaimer" varchar,
  	"section_theme" "enum__gsec_v_blocks_newsletter_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_newsletter_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_newsletter_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_newsletter_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"section_theme" "enum__gsec_v_blocks_stats_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_stats_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_stats_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_stats_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_raw_html" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"html" varchar,
  	"section_theme" "enum__gsec_v_blocks_raw_html_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_raw_html_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_raw_html_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_raw_html_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_hero_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_presets_blocks_hero_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_presets_blocks_hero_actions_custom_page",
  	"label" varchar NOT NULL,
  	"appearance" "enum_presets_blocks_hero_actions_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "presets_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "enum_presets_blocks_hero_variant" DEFAULT 'showcase' NOT NULL,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum_presets_blocks_hero_image_aspect_ratio" DEFAULT '1/1',
  	"section_theme" "enum_presets_blocks_hero_section_theme",
  	"section_max_width" "enum_presets_blocks_hero_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_hero_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_hero_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_hero_locales" (
  	"eyebrow" varchar,
  	"title" varchar,
  	"rich_text" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_content_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_presets_blocks_content_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_presets_blocks_content_actions_custom_page",
  	"label" varchar NOT NULL,
  	"appearance" "enum_presets_blocks_content_actions_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "presets_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"layout" "enum_presets_blocks_content_layout" DEFAULT 'image-text' NOT NULL,
  	"image_id" integer NOT NULL,
  	"section_theme" "enum_presets_blocks_content_section_theme",
  	"section_max_width" "enum_presets_blocks_content_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_content_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_content_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_content_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"content" jsonb NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" jsonb NOT NULL
  );
  
  CREATE TABLE "presets_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_theme" "enum_presets_blocks_faq_section_theme",
  	"section_max_width" "enum_presets_blocks_faq_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_faq_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_faq_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_faq_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
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
  
  CREATE TABLE "presets_blocks_cards_grid_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "enum_presets_blocks_cards_grid_items_icon",
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum_presets_blocks_cards_grid_items_image_aspect_ratio" DEFAULT '1/1',
  	"link_type" "enum_presets_blocks_cards_grid_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_presets_blocks_cards_grid_items_link_custom_page",
  	"link_label" varchar,
  	"link_appearance" "enum_presets_blocks_cards_grid_items_link_appearance" DEFAULT 'default',
  	"align_variant" "enum_presets_blocks_cards_grid_items_align_variant" DEFAULT 'center',
  	"rounded" "enum_presets_blocks_cards_grid_items_rounded" DEFAULT 'none',
  	"background_color" "enum_presets_blocks_cards_grid_items_background_color" DEFAULT 'none'
  );
  
  CREATE TABLE "presets_blocks_cards_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"columns" numeric DEFAULT 3,
  	"section_theme" "enum_presets_blocks_cards_grid_section_theme",
  	"section_max_width" "enum_presets_blocks_cards_grid_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_cards_grid_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_cards_grid_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_cards_grid_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_carousel_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_image_id" integer NOT NULL,
  	"image_aspect_ratio" "enum_presets_blocks_carousel_slides_image_aspect_ratio" DEFAULT '1/1',
  	"text" jsonb
  );
  
  CREATE TABLE "presets_blocks_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"effect" "enum_presets_blocks_carousel_effect" DEFAULT 'slide',
  	"section_theme" "enum_presets_blocks_carousel_section_theme",
  	"section_max_width" "enum_presets_blocks_carousel_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_carousel_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_carousel_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_carousel_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_logos_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_image_id" integer NOT NULL,
  	"image_aspect_ratio" "enum_presets_blocks_logos_items_image_aspect_ratio" DEFAULT '1/1',
  	"link_type" "enum_presets_blocks_logos_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_presets_blocks_logos_items_link_custom_page",
  	"link_label" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"align_variant" "enum_presets_blocks_logos_align_variant" DEFAULT 'center',
  	"section_theme" "enum_presets_blocks_logos_section_theme",
  	"section_max_width" "enum_presets_blocks_logos_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_logos_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_logos_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_logos_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_chart_ranges_data_points" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" numeric NOT NULL
  );
  
  CREATE TABLE "presets_blocks_chart_ranges" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "presets_blocks_chart_ranges_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_chart" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_theme" "enum_presets_blocks_chart_section_theme",
  	"section_max_width" "enum_presets_blocks_chart_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_chart_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_chart_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_chart_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"title" varchar NOT NULL,
  	"subtitle" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_cta_band_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_presets_blocks_cta_band_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_presets_blocks_cta_band_actions_custom_page",
  	"label" varchar NOT NULL,
  	"appearance" "enum_presets_blocks_cta_band_actions_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "presets_blocks_cta_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_theme" "enum_presets_blocks_cta_band_section_theme",
  	"section_max_width" "enum_presets_blocks_cta_band_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_cta_band_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_cta_band_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_cta_band_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_newsletter" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_theme" "enum_presets_blocks_newsletter_section_theme",
  	"section_max_width" "enum_presets_blocks_newsletter_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_newsletter_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_newsletter_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_newsletter_locales" (
  	"eyebrow" varchar,
  	"heading" varchar NOT NULL,
  	"input_placeholder" varchar NOT NULL,
  	"button_label" varchar NOT NULL,
  	"disclaimer" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_theme" "enum_presets_blocks_stats_section_theme",
  	"section_max_width" "enum_presets_blocks_stats_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_stats_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_stats_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_raw_html" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_theme" "enum_presets_blocks_raw_html_section_theme",
  	"section_max_width" "enum_presets_blocks_raw_html_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_raw_html_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_raw_html_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_raw_html_locales" (
  	"html" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  DROP INDEX "presets_rels_page_id_idx";
  DROP INDEX "presets_rels_posts_id_idx";
  ALTER TABLE "presets_rels" ADD COLUMN "locale" "_locales";
  ALTER TABLE "page_blocks_hero_actions" ADD CONSTRAINT "page_blocks_hero_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_hero" ADD CONSTRAINT "page_blocks_hero_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_hero" ADD CONSTRAINT "page_blocks_hero_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_hero" ADD CONSTRAINT "page_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_content_actions" ADD CONSTRAINT "page_blocks_content_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_content" ADD CONSTRAINT "page_blocks_content_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_content" ADD CONSTRAINT "page_blocks_content_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_content" ADD CONSTRAINT "page_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_faq_items" ADD CONSTRAINT "page_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_faq" ADD CONSTRAINT "page_blocks_faq_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_faq" ADD CONSTRAINT "page_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "page_blocks_testimonials_list_testimonial_items_testimonial_id_testimonials_id_fk" FOREIGN KEY ("testimonial_id") REFERENCES "public"."testimonials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "page_blocks_testimonials_list_testimonial_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_testimonials_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_testimonials_list" ADD CONSTRAINT "page_blocks_testimonials_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_testimonials_list" ADD CONSTRAINT "page_blocks_testimonials_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_cards_grid_items" ADD CONSTRAINT "page_blocks_cards_grid_items_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_cards_grid_items" ADD CONSTRAINT "page_blocks_cards_grid_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_cards_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_cards_grid" ADD CONSTRAINT "page_blocks_cards_grid_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_cards_grid" ADD CONSTRAINT "page_blocks_cards_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_carousel_slides" ADD CONSTRAINT "page_blocks_carousel_slides_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_carousel_slides" ADD CONSTRAINT "page_blocks_carousel_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_carousel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_carousel" ADD CONSTRAINT "page_blocks_carousel_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_carousel" ADD CONSTRAINT "page_blocks_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_logos_items" ADD CONSTRAINT "page_blocks_logos_items_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_logos_items" ADD CONSTRAINT "page_blocks_logos_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_logos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_logos" ADD CONSTRAINT "page_blocks_logos_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_logos" ADD CONSTRAINT "page_blocks_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_chart_ranges_data_points" ADD CONSTRAINT "page_blocks_chart_ranges_data_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_chart_ranges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_chart_ranges" ADD CONSTRAINT "page_blocks_chart_ranges_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_chart"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_chart" ADD CONSTRAINT "page_blocks_chart_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_chart" ADD CONSTRAINT "page_blocks_chart_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_cta_band_actions" ADD CONSTRAINT "page_blocks_cta_band_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_cta_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_cta_band" ADD CONSTRAINT "page_blocks_cta_band_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_cta_band" ADD CONSTRAINT "page_blocks_cta_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_newsletter" ADD CONSTRAINT "page_blocks_newsletter_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_newsletter" ADD CONSTRAINT "page_blocks_newsletter_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_stats_items" ADD CONSTRAINT "page_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_stats" ADD CONSTRAINT "page_blocks_stats_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_stats" ADD CONSTRAINT "page_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_raw_html" ADD CONSTRAINT "page_blocks_raw_html_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_raw_html" ADD CONSTRAINT "page_blocks_raw_html_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_hero_actions" ADD CONSTRAINT "_page_v_blocks_hero_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_hero" ADD CONSTRAINT "_page_v_blocks_hero_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_hero" ADD CONSTRAINT "_page_v_blocks_hero_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_hero" ADD CONSTRAINT "_page_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_content_actions" ADD CONSTRAINT "_page_v_blocks_content_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_content" ADD CONSTRAINT "_page_v_blocks_content_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_content" ADD CONSTRAINT "_page_v_blocks_content_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_content" ADD CONSTRAINT "_page_v_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_faq_items" ADD CONSTRAINT "_page_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_faq" ADD CONSTRAINT "_page_v_blocks_faq_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_faq" ADD CONSTRAINT "_page_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "_page_v_blocks_testimonials_list_testimonial_items_testimonial_id_testimonials_id_fk" FOREIGN KEY ("testimonial_id") REFERENCES "public"."testimonials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "_page_v_blocks_testimonials_list_testimonial_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_testimonials_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_testimonials_list" ADD CONSTRAINT "_page_v_blocks_testimonials_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_testimonials_list" ADD CONSTRAINT "_page_v_blocks_testimonials_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_cards_grid_items" ADD CONSTRAINT "_page_v_blocks_cards_grid_items_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_cards_grid_items" ADD CONSTRAINT "_page_v_blocks_cards_grid_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_cards_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_cards_grid" ADD CONSTRAINT "_page_v_blocks_cards_grid_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_cards_grid" ADD CONSTRAINT "_page_v_blocks_cards_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_carousel_slides" ADD CONSTRAINT "_page_v_blocks_carousel_slides_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_carousel_slides" ADD CONSTRAINT "_page_v_blocks_carousel_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_carousel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_carousel" ADD CONSTRAINT "_page_v_blocks_carousel_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_carousel" ADD CONSTRAINT "_page_v_blocks_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_logos_items" ADD CONSTRAINT "_page_v_blocks_logos_items_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_logos_items" ADD CONSTRAINT "_page_v_blocks_logos_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_logos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_logos" ADD CONSTRAINT "_page_v_blocks_logos_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_logos" ADD CONSTRAINT "_page_v_blocks_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_chart_ranges_data_points" ADD CONSTRAINT "_page_v_blocks_chart_ranges_data_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_chart_ranges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_chart_ranges" ADD CONSTRAINT "_page_v_blocks_chart_ranges_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_chart"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_chart" ADD CONSTRAINT "_page_v_blocks_chart_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_chart" ADD CONSTRAINT "_page_v_blocks_chart_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_cta_band_actions" ADD CONSTRAINT "_page_v_blocks_cta_band_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_cta_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_cta_band" ADD CONSTRAINT "_page_v_blocks_cta_band_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_cta_band" ADD CONSTRAINT "_page_v_blocks_cta_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_newsletter" ADD CONSTRAINT "_page_v_blocks_newsletter_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_newsletter" ADD CONSTRAINT "_page_v_blocks_newsletter_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_stats_items" ADD CONSTRAINT "_page_v_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_stats" ADD CONSTRAINT "_page_v_blocks_stats_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_stats" ADD CONSTRAINT "_page_v_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_raw_html" ADD CONSTRAINT "_page_v_blocks_raw_html_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_raw_html" ADD CONSTRAINT "_page_v_blocks_raw_html_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_hero_actions" ADD CONSTRAINT "gsec_blocks_hero_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_hero" ADD CONSTRAINT "gsec_blocks_hero_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_hero" ADD CONSTRAINT "gsec_blocks_hero_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_hero" ADD CONSTRAINT "gsec_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_content_actions" ADD CONSTRAINT "gsec_blocks_content_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_content" ADD CONSTRAINT "gsec_blocks_content_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_content" ADD CONSTRAINT "gsec_blocks_content_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_content" ADD CONSTRAINT "gsec_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_faq_items" ADD CONSTRAINT "gsec_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_faq" ADD CONSTRAINT "gsec_blocks_faq_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_faq" ADD CONSTRAINT "gsec_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "gsec_blocks_testimonials_list_testimonial_items_testimonial_id_testimonials_id_fk" FOREIGN KEY ("testimonial_id") REFERENCES "public"."testimonials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "gsec_blocks_testimonials_list_testimonial_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_testimonials_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_testimonials_list" ADD CONSTRAINT "gsec_blocks_testimonials_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_testimonials_list" ADD CONSTRAINT "gsec_blocks_testimonials_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_cards_grid_items" ADD CONSTRAINT "gsec_blocks_cards_grid_items_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_cards_grid_items" ADD CONSTRAINT "gsec_blocks_cards_grid_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_cards_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_cards_grid" ADD CONSTRAINT "gsec_blocks_cards_grid_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_cards_grid" ADD CONSTRAINT "gsec_blocks_cards_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_carousel_slides" ADD CONSTRAINT "gsec_blocks_carousel_slides_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_carousel_slides" ADD CONSTRAINT "gsec_blocks_carousel_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_carousel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_carousel" ADD CONSTRAINT "gsec_blocks_carousel_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_carousel" ADD CONSTRAINT "gsec_blocks_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_logos_items" ADD CONSTRAINT "gsec_blocks_logos_items_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_logos_items" ADD CONSTRAINT "gsec_blocks_logos_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_logos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_logos" ADD CONSTRAINT "gsec_blocks_logos_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_logos" ADD CONSTRAINT "gsec_blocks_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_chart_ranges_data_points" ADD CONSTRAINT "gsec_blocks_chart_ranges_data_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_chart_ranges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_chart_ranges" ADD CONSTRAINT "gsec_blocks_chart_ranges_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_chart"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_chart" ADD CONSTRAINT "gsec_blocks_chart_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_chart" ADD CONSTRAINT "gsec_blocks_chart_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_cta_band_actions" ADD CONSTRAINT "gsec_blocks_cta_band_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_cta_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_cta_band" ADD CONSTRAINT "gsec_blocks_cta_band_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_cta_band" ADD CONSTRAINT "gsec_blocks_cta_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_newsletter" ADD CONSTRAINT "gsec_blocks_newsletter_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_newsletter" ADD CONSTRAINT "gsec_blocks_newsletter_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_stats_items" ADD CONSTRAINT "gsec_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_stats" ADD CONSTRAINT "gsec_blocks_stats_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_stats" ADD CONSTRAINT "gsec_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_raw_html" ADD CONSTRAINT "gsec_blocks_raw_html_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_raw_html" ADD CONSTRAINT "gsec_blocks_raw_html_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_hero_actions" ADD CONSTRAINT "_gsec_v_blocks_hero_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_hero" ADD CONSTRAINT "_gsec_v_blocks_hero_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_hero" ADD CONSTRAINT "_gsec_v_blocks_hero_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_hero" ADD CONSTRAINT "_gsec_v_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_content_actions" ADD CONSTRAINT "_gsec_v_blocks_content_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_content" ADD CONSTRAINT "_gsec_v_blocks_content_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_content" ADD CONSTRAINT "_gsec_v_blocks_content_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_content" ADD CONSTRAINT "_gsec_v_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_faq_items" ADD CONSTRAINT "_gsec_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_faq" ADD CONSTRAINT "_gsec_v_blocks_faq_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_faq" ADD CONSTRAINT "_gsec_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "_gsec_v_blocks_testimonials_list_testimonial_items_testimonial_id_testimonials_id_fk" FOREIGN KEY ("testimonial_id") REFERENCES "public"."testimonials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "_gsec_v_blocks_testimonials_list_testimonial_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_testimonials_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_testimonials_list" ADD CONSTRAINT "_gsec_v_blocks_testimonials_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_testimonials_list" ADD CONSTRAINT "_gsec_v_blocks_testimonials_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" ADD CONSTRAINT "_gsec_v_blocks_cards_grid_items_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" ADD CONSTRAINT "_gsec_v_blocks_cards_grid_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_cards_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_cards_grid" ADD CONSTRAINT "_gsec_v_blocks_cards_grid_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_cards_grid" ADD CONSTRAINT "_gsec_v_blocks_cards_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_carousel_slides" ADD CONSTRAINT "_gsec_v_blocks_carousel_slides_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_carousel_slides" ADD CONSTRAINT "_gsec_v_blocks_carousel_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_carousel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_carousel" ADD CONSTRAINT "_gsec_v_blocks_carousel_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_carousel" ADD CONSTRAINT "_gsec_v_blocks_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_logos_items" ADD CONSTRAINT "_gsec_v_blocks_logos_items_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_logos_items" ADD CONSTRAINT "_gsec_v_blocks_logos_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_logos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_logos" ADD CONSTRAINT "_gsec_v_blocks_logos_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_logos" ADD CONSTRAINT "_gsec_v_blocks_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_chart_ranges_data_points" ADD CONSTRAINT "_gsec_v_blocks_chart_ranges_data_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_chart_ranges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_chart_ranges" ADD CONSTRAINT "_gsec_v_blocks_chart_ranges_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_chart"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_chart" ADD CONSTRAINT "_gsec_v_blocks_chart_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_chart" ADD CONSTRAINT "_gsec_v_blocks_chart_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_cta_band_actions" ADD CONSTRAINT "_gsec_v_blocks_cta_band_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_cta_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_cta_band" ADD CONSTRAINT "_gsec_v_blocks_cta_band_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_cta_band" ADD CONSTRAINT "_gsec_v_blocks_cta_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_newsletter" ADD CONSTRAINT "_gsec_v_blocks_newsletter_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_newsletter" ADD CONSTRAINT "_gsec_v_blocks_newsletter_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_stats_items" ADD CONSTRAINT "_gsec_v_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_stats" ADD CONSTRAINT "_gsec_v_blocks_stats_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_stats" ADD CONSTRAINT "_gsec_v_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_raw_html" ADD CONSTRAINT "_gsec_v_blocks_raw_html_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_raw_html" ADD CONSTRAINT "_gsec_v_blocks_raw_html_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_hero_actions" ADD CONSTRAINT "presets_blocks_hero_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_hero" ADD CONSTRAINT "presets_blocks_hero_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_hero" ADD CONSTRAINT "presets_blocks_hero_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_hero" ADD CONSTRAINT "presets_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_hero_locales" ADD CONSTRAINT "presets_blocks_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_content_actions" ADD CONSTRAINT "presets_blocks_content_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_content" ADD CONSTRAINT "presets_blocks_content_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_content" ADD CONSTRAINT "presets_blocks_content_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_content" ADD CONSTRAINT "presets_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_content_locales" ADD CONSTRAINT "presets_blocks_content_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_faq_items" ADD CONSTRAINT "presets_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_faq" ADD CONSTRAINT "presets_blocks_faq_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_faq" ADD CONSTRAINT "presets_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_faq_locales" ADD CONSTRAINT "presets_blocks_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "presets_blocks_testimonials_list_testimonial_items_testimonial_id_testimonials_id_fk" FOREIGN KEY ("testimonial_id") REFERENCES "public"."testimonials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_testimonials_list_testimonial_items" ADD CONSTRAINT "presets_blocks_testimonials_list_testimonial_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_testimonials_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_testimonials_list" ADD CONSTRAINT "presets_blocks_testimonials_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_testimonials_list" ADD CONSTRAINT "presets_blocks_testimonials_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_testimonials_list_locales" ADD CONSTRAINT "presets_blocks_testimonials_list_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_testimonials_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_cards_grid_items" ADD CONSTRAINT "presets_blocks_cards_grid_items_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_cards_grid_items" ADD CONSTRAINT "presets_blocks_cards_grid_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_cards_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_cards_grid" ADD CONSTRAINT "presets_blocks_cards_grid_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_cards_grid" ADD CONSTRAINT "presets_blocks_cards_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_cards_grid_locales" ADD CONSTRAINT "presets_blocks_cards_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_cards_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_carousel_slides" ADD CONSTRAINT "presets_blocks_carousel_slides_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_carousel_slides" ADD CONSTRAINT "presets_blocks_carousel_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_carousel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_carousel" ADD CONSTRAINT "presets_blocks_carousel_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_carousel" ADD CONSTRAINT "presets_blocks_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_carousel_locales" ADD CONSTRAINT "presets_blocks_carousel_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_carousel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_logos_items" ADD CONSTRAINT "presets_blocks_logos_items_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_logos_items" ADD CONSTRAINT "presets_blocks_logos_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_logos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_logos" ADD CONSTRAINT "presets_blocks_logos_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_logos" ADD CONSTRAINT "presets_blocks_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_logos_locales" ADD CONSTRAINT "presets_blocks_logos_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_logos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_chart_ranges_data_points" ADD CONSTRAINT "presets_blocks_chart_ranges_data_points_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_chart_ranges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_chart_ranges" ADD CONSTRAINT "presets_blocks_chart_ranges_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_chart"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_chart_ranges_locales" ADD CONSTRAINT "presets_blocks_chart_ranges_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_chart_ranges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_chart" ADD CONSTRAINT "presets_blocks_chart_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_chart" ADD CONSTRAINT "presets_blocks_chart_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_chart_locales" ADD CONSTRAINT "presets_blocks_chart_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_chart"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_cta_band_actions" ADD CONSTRAINT "presets_blocks_cta_band_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_cta_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_cta_band" ADD CONSTRAINT "presets_blocks_cta_band_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_cta_band" ADD CONSTRAINT "presets_blocks_cta_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_cta_band_locales" ADD CONSTRAINT "presets_blocks_cta_band_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_cta_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_newsletter" ADD CONSTRAINT "presets_blocks_newsletter_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_newsletter" ADD CONSTRAINT "presets_blocks_newsletter_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_newsletter_locales" ADD CONSTRAINT "presets_blocks_newsletter_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_newsletter"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_stats_items" ADD CONSTRAINT "presets_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_stats" ADD CONSTRAINT "presets_blocks_stats_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_stats" ADD CONSTRAINT "presets_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_raw_html" ADD CONSTRAINT "presets_blocks_raw_html_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_raw_html" ADD CONSTRAINT "presets_blocks_raw_html_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_raw_html_locales" ADD CONSTRAINT "presets_blocks_raw_html_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_raw_html"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_hero_actions_order_idx" ON "page_blocks_hero_actions" USING btree ("_order");
  CREATE INDEX "page_blocks_hero_actions_parent_id_idx" ON "page_blocks_hero_actions" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_hero_actions_locale_idx" ON "page_blocks_hero_actions" USING btree ("_locale");
  CREATE INDEX "page_blocks_hero_order_idx" ON "page_blocks_hero" USING btree ("_order");
  CREATE INDEX "page_blocks_hero_parent_id_idx" ON "page_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_hero_path_idx" ON "page_blocks_hero" USING btree ("_path");
  CREATE INDEX "page_blocks_hero_locale_idx" ON "page_blocks_hero" USING btree ("_locale");
  CREATE INDEX "page_blocks_hero_image_image_image_idx" ON "page_blocks_hero" USING btree ("image_image_id");
  CREATE INDEX "page_blocks_hero_section_background_section_background_m_idx" ON "page_blocks_hero" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_content_actions_order_idx" ON "page_blocks_content_actions" USING btree ("_order");
  CREATE INDEX "page_blocks_content_actions_parent_id_idx" ON "page_blocks_content_actions" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_content_actions_locale_idx" ON "page_blocks_content_actions" USING btree ("_locale");
  CREATE INDEX "page_blocks_content_order_idx" ON "page_blocks_content" USING btree ("_order");
  CREATE INDEX "page_blocks_content_parent_id_idx" ON "page_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_content_path_idx" ON "page_blocks_content" USING btree ("_path");
  CREATE INDEX "page_blocks_content_locale_idx" ON "page_blocks_content" USING btree ("_locale");
  CREATE INDEX "page_blocks_content_image_idx" ON "page_blocks_content" USING btree ("image_id");
  CREATE INDEX "page_blocks_content_section_background_section_backgroun_idx" ON "page_blocks_content" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_faq_items_order_idx" ON "page_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "page_blocks_faq_items_parent_id_idx" ON "page_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_faq_items_locale_idx" ON "page_blocks_faq_items" USING btree ("_locale");
  CREATE INDEX "page_blocks_faq_order_idx" ON "page_blocks_faq" USING btree ("_order");
  CREATE INDEX "page_blocks_faq_parent_id_idx" ON "page_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_faq_path_idx" ON "page_blocks_faq" USING btree ("_path");
  CREATE INDEX "page_blocks_faq_locale_idx" ON "page_blocks_faq" USING btree ("_locale");
  CREATE INDEX "page_blocks_faq_section_background_section_background_me_idx" ON "page_blocks_faq" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_testimonials_list_testimonial_items_order_idx" ON "page_blocks_testimonials_list_testimonial_items" USING btree ("_order");
  CREATE INDEX "page_blocks_testimonials_list_testimonial_items_parent_id_idx" ON "page_blocks_testimonials_list_testimonial_items" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_testimonials_list_testimonial_items_locale_idx" ON "page_blocks_testimonials_list_testimonial_items" USING btree ("_locale");
  CREATE INDEX "page_blocks_testimonials_list_testimonial_items_testimon_idx" ON "page_blocks_testimonials_list_testimonial_items" USING btree ("testimonial_id");
  CREATE INDEX "page_blocks_testimonials_list_order_idx" ON "page_blocks_testimonials_list" USING btree ("_order");
  CREATE INDEX "page_blocks_testimonials_list_parent_id_idx" ON "page_blocks_testimonials_list" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_testimonials_list_path_idx" ON "page_blocks_testimonials_list" USING btree ("_path");
  CREATE INDEX "page_blocks_testimonials_list_locale_idx" ON "page_blocks_testimonials_list" USING btree ("_locale");
  CREATE INDEX "page_blocks_testimonials_list_section_background_section_idx" ON "page_blocks_testimonials_list" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_cards_grid_items_order_idx" ON "page_blocks_cards_grid_items" USING btree ("_order");
  CREATE INDEX "page_blocks_cards_grid_items_parent_id_idx" ON "page_blocks_cards_grid_items" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_cards_grid_items_locale_idx" ON "page_blocks_cards_grid_items" USING btree ("_locale");
  CREATE INDEX "page_blocks_cards_grid_items_image_image_image_idx" ON "page_blocks_cards_grid_items" USING btree ("image_image_id");
  CREATE INDEX "page_blocks_cards_grid_order_idx" ON "page_blocks_cards_grid" USING btree ("_order");
  CREATE INDEX "page_blocks_cards_grid_parent_id_idx" ON "page_blocks_cards_grid" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_cards_grid_path_idx" ON "page_blocks_cards_grid" USING btree ("_path");
  CREATE INDEX "page_blocks_cards_grid_locale_idx" ON "page_blocks_cards_grid" USING btree ("_locale");
  CREATE INDEX "page_blocks_cards_grid_section_background_section_backgr_idx" ON "page_blocks_cards_grid" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_carousel_slides_order_idx" ON "page_blocks_carousel_slides" USING btree ("_order");
  CREATE INDEX "page_blocks_carousel_slides_parent_id_idx" ON "page_blocks_carousel_slides" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_carousel_slides_locale_idx" ON "page_blocks_carousel_slides" USING btree ("_locale");
  CREATE INDEX "page_blocks_carousel_slides_image_image_image_idx" ON "page_blocks_carousel_slides" USING btree ("image_image_id");
  CREATE INDEX "page_blocks_carousel_order_idx" ON "page_blocks_carousel" USING btree ("_order");
  CREATE INDEX "page_blocks_carousel_parent_id_idx" ON "page_blocks_carousel" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_carousel_path_idx" ON "page_blocks_carousel" USING btree ("_path");
  CREATE INDEX "page_blocks_carousel_locale_idx" ON "page_blocks_carousel" USING btree ("_locale");
  CREATE INDEX "page_blocks_carousel_section_background_section_backgrou_idx" ON "page_blocks_carousel" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_logos_items_order_idx" ON "page_blocks_logos_items" USING btree ("_order");
  CREATE INDEX "page_blocks_logos_items_parent_id_idx" ON "page_blocks_logos_items" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_logos_items_locale_idx" ON "page_blocks_logos_items" USING btree ("_locale");
  CREATE INDEX "page_blocks_logos_items_image_image_image_idx" ON "page_blocks_logos_items" USING btree ("image_image_id");
  CREATE INDEX "page_blocks_logos_order_idx" ON "page_blocks_logos" USING btree ("_order");
  CREATE INDEX "page_blocks_logos_parent_id_idx" ON "page_blocks_logos" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_logos_path_idx" ON "page_blocks_logos" USING btree ("_path");
  CREATE INDEX "page_blocks_logos_locale_idx" ON "page_blocks_logos" USING btree ("_locale");
  CREATE INDEX "page_blocks_logos_section_background_section_background__idx" ON "page_blocks_logos" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_chart_ranges_data_points_order_idx" ON "page_blocks_chart_ranges_data_points" USING btree ("_order");
  CREATE INDEX "page_blocks_chart_ranges_data_points_parent_id_idx" ON "page_blocks_chart_ranges_data_points" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_chart_ranges_data_points_locale_idx" ON "page_blocks_chart_ranges_data_points" USING btree ("_locale");
  CREATE INDEX "page_blocks_chart_ranges_order_idx" ON "page_blocks_chart_ranges" USING btree ("_order");
  CREATE INDEX "page_blocks_chart_ranges_parent_id_idx" ON "page_blocks_chart_ranges" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_chart_ranges_locale_idx" ON "page_blocks_chart_ranges" USING btree ("_locale");
  CREATE INDEX "page_blocks_chart_order_idx" ON "page_blocks_chart" USING btree ("_order");
  CREATE INDEX "page_blocks_chart_parent_id_idx" ON "page_blocks_chart" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_chart_path_idx" ON "page_blocks_chart" USING btree ("_path");
  CREATE INDEX "page_blocks_chart_locale_idx" ON "page_blocks_chart" USING btree ("_locale");
  CREATE INDEX "page_blocks_chart_section_background_section_background__idx" ON "page_blocks_chart" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_cta_band_actions_order_idx" ON "page_blocks_cta_band_actions" USING btree ("_order");
  CREATE INDEX "page_blocks_cta_band_actions_parent_id_idx" ON "page_blocks_cta_band_actions" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_cta_band_actions_locale_idx" ON "page_blocks_cta_band_actions" USING btree ("_locale");
  CREATE INDEX "page_blocks_cta_band_order_idx" ON "page_blocks_cta_band" USING btree ("_order");
  CREATE INDEX "page_blocks_cta_band_parent_id_idx" ON "page_blocks_cta_band" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_cta_band_path_idx" ON "page_blocks_cta_band" USING btree ("_path");
  CREATE INDEX "page_blocks_cta_band_locale_idx" ON "page_blocks_cta_band" USING btree ("_locale");
  CREATE INDEX "page_blocks_cta_band_section_background_section_backgrou_idx" ON "page_blocks_cta_band" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_newsletter_order_idx" ON "page_blocks_newsletter" USING btree ("_order");
  CREATE INDEX "page_blocks_newsletter_parent_id_idx" ON "page_blocks_newsletter" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_newsletter_path_idx" ON "page_blocks_newsletter" USING btree ("_path");
  CREATE INDEX "page_blocks_newsletter_locale_idx" ON "page_blocks_newsletter" USING btree ("_locale");
  CREATE INDEX "page_blocks_newsletter_section_background_section_backgr_idx" ON "page_blocks_newsletter" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_stats_items_order_idx" ON "page_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "page_blocks_stats_items_parent_id_idx" ON "page_blocks_stats_items" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_stats_items_locale_idx" ON "page_blocks_stats_items" USING btree ("_locale");
  CREATE INDEX "page_blocks_stats_order_idx" ON "page_blocks_stats" USING btree ("_order");
  CREATE INDEX "page_blocks_stats_parent_id_idx" ON "page_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_stats_path_idx" ON "page_blocks_stats" USING btree ("_path");
  CREATE INDEX "page_blocks_stats_locale_idx" ON "page_blocks_stats" USING btree ("_locale");
  CREATE INDEX "page_blocks_stats_section_background_section_background__idx" ON "page_blocks_stats" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_raw_html_order_idx" ON "page_blocks_raw_html" USING btree ("_order");
  CREATE INDEX "page_blocks_raw_html_parent_id_idx" ON "page_blocks_raw_html" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_raw_html_path_idx" ON "page_blocks_raw_html" USING btree ("_path");
  CREATE INDEX "page_blocks_raw_html_locale_idx" ON "page_blocks_raw_html" USING btree ("_locale");
  CREATE INDEX "page_blocks_raw_html_section_background_section_backgrou_idx" ON "page_blocks_raw_html" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_hero_actions_order_idx" ON "_page_v_blocks_hero_actions" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_hero_actions_parent_id_idx" ON "_page_v_blocks_hero_actions" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_hero_actions_locale_idx" ON "_page_v_blocks_hero_actions" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_hero_order_idx" ON "_page_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_hero_parent_id_idx" ON "_page_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_hero_path_idx" ON "_page_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_hero_locale_idx" ON "_page_v_blocks_hero" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_hero_image_image_image_idx" ON "_page_v_blocks_hero" USING btree ("image_image_id");
  CREATE INDEX "_page_v_blocks_hero_section_background_section_backgroun_idx" ON "_page_v_blocks_hero" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_content_actions_order_idx" ON "_page_v_blocks_content_actions" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_content_actions_parent_id_idx" ON "_page_v_blocks_content_actions" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_content_actions_locale_idx" ON "_page_v_blocks_content_actions" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_content_order_idx" ON "_page_v_blocks_content" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_content_parent_id_idx" ON "_page_v_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_content_path_idx" ON "_page_v_blocks_content" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_content_locale_idx" ON "_page_v_blocks_content" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_content_image_idx" ON "_page_v_blocks_content" USING btree ("image_id");
  CREATE INDEX "_page_v_blocks_content_section_background_section_backgr_idx" ON "_page_v_blocks_content" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_faq_items_order_idx" ON "_page_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_faq_items_parent_id_idx" ON "_page_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_faq_items_locale_idx" ON "_page_v_blocks_faq_items" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_faq_order_idx" ON "_page_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_faq_parent_id_idx" ON "_page_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_faq_path_idx" ON "_page_v_blocks_faq" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_faq_locale_idx" ON "_page_v_blocks_faq" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_faq_section_background_section_background_idx" ON "_page_v_blocks_faq" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_testimonials_list_testimonial_items_order_idx" ON "_page_v_blocks_testimonials_list_testimonial_items" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_testimonials_list_testimonial_items_parent_id_idx" ON "_page_v_blocks_testimonials_list_testimonial_items" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_testimonials_list_testimonial_items_locale_idx" ON "_page_v_blocks_testimonials_list_testimonial_items" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_testimonials_list_testimonial_items_testi_idx" ON "_page_v_blocks_testimonials_list_testimonial_items" USING btree ("testimonial_id");
  CREATE INDEX "_page_v_blocks_testimonials_list_order_idx" ON "_page_v_blocks_testimonials_list" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_testimonials_list_parent_id_idx" ON "_page_v_blocks_testimonials_list" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_testimonials_list_path_idx" ON "_page_v_blocks_testimonials_list" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_testimonials_list_locale_idx" ON "_page_v_blocks_testimonials_list" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_testimonials_list_section_background_sect_idx" ON "_page_v_blocks_testimonials_list" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_cards_grid_items_order_idx" ON "_page_v_blocks_cards_grid_items" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_cards_grid_items_parent_id_idx" ON "_page_v_blocks_cards_grid_items" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_cards_grid_items_locale_idx" ON "_page_v_blocks_cards_grid_items" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_cards_grid_items_image_image_image_idx" ON "_page_v_blocks_cards_grid_items" USING btree ("image_image_id");
  CREATE INDEX "_page_v_blocks_cards_grid_order_idx" ON "_page_v_blocks_cards_grid" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_cards_grid_parent_id_idx" ON "_page_v_blocks_cards_grid" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_cards_grid_path_idx" ON "_page_v_blocks_cards_grid" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_cards_grid_locale_idx" ON "_page_v_blocks_cards_grid" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_cards_grid_section_background_section_bac_idx" ON "_page_v_blocks_cards_grid" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_carousel_slides_order_idx" ON "_page_v_blocks_carousel_slides" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_carousel_slides_parent_id_idx" ON "_page_v_blocks_carousel_slides" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_carousel_slides_locale_idx" ON "_page_v_blocks_carousel_slides" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_carousel_slides_image_image_image_idx" ON "_page_v_blocks_carousel_slides" USING btree ("image_image_id");
  CREATE INDEX "_page_v_blocks_carousel_order_idx" ON "_page_v_blocks_carousel" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_carousel_parent_id_idx" ON "_page_v_blocks_carousel" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_carousel_path_idx" ON "_page_v_blocks_carousel" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_carousel_locale_idx" ON "_page_v_blocks_carousel" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_carousel_section_background_section_backg_idx" ON "_page_v_blocks_carousel" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_logos_items_order_idx" ON "_page_v_blocks_logos_items" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_logos_items_parent_id_idx" ON "_page_v_blocks_logos_items" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_logos_items_locale_idx" ON "_page_v_blocks_logos_items" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_logos_items_image_image_image_idx" ON "_page_v_blocks_logos_items" USING btree ("image_image_id");
  CREATE INDEX "_page_v_blocks_logos_order_idx" ON "_page_v_blocks_logos" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_logos_parent_id_idx" ON "_page_v_blocks_logos" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_logos_path_idx" ON "_page_v_blocks_logos" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_logos_locale_idx" ON "_page_v_blocks_logos" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_logos_section_background_section_backgrou_idx" ON "_page_v_blocks_logos" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_chart_ranges_data_points_order_idx" ON "_page_v_blocks_chart_ranges_data_points" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_chart_ranges_data_points_parent_id_idx" ON "_page_v_blocks_chart_ranges_data_points" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_chart_ranges_data_points_locale_idx" ON "_page_v_blocks_chart_ranges_data_points" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_chart_ranges_order_idx" ON "_page_v_blocks_chart_ranges" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_chart_ranges_parent_id_idx" ON "_page_v_blocks_chart_ranges" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_chart_ranges_locale_idx" ON "_page_v_blocks_chart_ranges" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_chart_order_idx" ON "_page_v_blocks_chart" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_chart_parent_id_idx" ON "_page_v_blocks_chart" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_chart_path_idx" ON "_page_v_blocks_chart" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_chart_locale_idx" ON "_page_v_blocks_chart" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_chart_section_background_section_backgrou_idx" ON "_page_v_blocks_chart" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_cta_band_actions_order_idx" ON "_page_v_blocks_cta_band_actions" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_cta_band_actions_parent_id_idx" ON "_page_v_blocks_cta_band_actions" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_cta_band_actions_locale_idx" ON "_page_v_blocks_cta_band_actions" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_cta_band_order_idx" ON "_page_v_blocks_cta_band" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_cta_band_parent_id_idx" ON "_page_v_blocks_cta_band" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_cta_band_path_idx" ON "_page_v_blocks_cta_band" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_cta_band_locale_idx" ON "_page_v_blocks_cta_band" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_cta_band_section_background_section_backg_idx" ON "_page_v_blocks_cta_band" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_newsletter_order_idx" ON "_page_v_blocks_newsletter" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_newsletter_parent_id_idx" ON "_page_v_blocks_newsletter" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_newsletter_path_idx" ON "_page_v_blocks_newsletter" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_newsletter_locale_idx" ON "_page_v_blocks_newsletter" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_newsletter_section_background_section_bac_idx" ON "_page_v_blocks_newsletter" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_stats_items_order_idx" ON "_page_v_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_stats_items_parent_id_idx" ON "_page_v_blocks_stats_items" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_stats_items_locale_idx" ON "_page_v_blocks_stats_items" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_stats_order_idx" ON "_page_v_blocks_stats" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_stats_parent_id_idx" ON "_page_v_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_stats_path_idx" ON "_page_v_blocks_stats" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_stats_locale_idx" ON "_page_v_blocks_stats" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_stats_section_background_section_backgrou_idx" ON "_page_v_blocks_stats" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_raw_html_order_idx" ON "_page_v_blocks_raw_html" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_raw_html_parent_id_idx" ON "_page_v_blocks_raw_html" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_raw_html_path_idx" ON "_page_v_blocks_raw_html" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_raw_html_locale_idx" ON "_page_v_blocks_raw_html" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_raw_html_section_background_section_backg_idx" ON "_page_v_blocks_raw_html" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_hero_actions_order_idx" ON "gsec_blocks_hero_actions" USING btree ("_order");
  CREATE INDEX "gsec_blocks_hero_actions_parent_id_idx" ON "gsec_blocks_hero_actions" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_hero_actions_locale_idx" ON "gsec_blocks_hero_actions" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_hero_order_idx" ON "gsec_blocks_hero" USING btree ("_order");
  CREATE INDEX "gsec_blocks_hero_parent_id_idx" ON "gsec_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_hero_path_idx" ON "gsec_blocks_hero" USING btree ("_path");
  CREATE INDEX "gsec_blocks_hero_locale_idx" ON "gsec_blocks_hero" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_hero_image_image_image_idx" ON "gsec_blocks_hero" USING btree ("image_image_id");
  CREATE INDEX "gsec_blocks_hero_section_background_section_background_m_idx" ON "gsec_blocks_hero" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_content_actions_order_idx" ON "gsec_blocks_content_actions" USING btree ("_order");
  CREATE INDEX "gsec_blocks_content_actions_parent_id_idx" ON "gsec_blocks_content_actions" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_content_actions_locale_idx" ON "gsec_blocks_content_actions" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_content_order_idx" ON "gsec_blocks_content" USING btree ("_order");
  CREATE INDEX "gsec_blocks_content_parent_id_idx" ON "gsec_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_content_path_idx" ON "gsec_blocks_content" USING btree ("_path");
  CREATE INDEX "gsec_blocks_content_locale_idx" ON "gsec_blocks_content" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_content_image_idx" ON "gsec_blocks_content" USING btree ("image_id");
  CREATE INDEX "gsec_blocks_content_section_background_section_backgroun_idx" ON "gsec_blocks_content" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_faq_items_order_idx" ON "gsec_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "gsec_blocks_faq_items_parent_id_idx" ON "gsec_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_faq_items_locale_idx" ON "gsec_blocks_faq_items" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_faq_order_idx" ON "gsec_blocks_faq" USING btree ("_order");
  CREATE INDEX "gsec_blocks_faq_parent_id_idx" ON "gsec_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_faq_path_idx" ON "gsec_blocks_faq" USING btree ("_path");
  CREATE INDEX "gsec_blocks_faq_locale_idx" ON "gsec_blocks_faq" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_faq_section_background_section_background_me_idx" ON "gsec_blocks_faq" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_testimonials_list_testimonial_items_order_idx" ON "gsec_blocks_testimonials_list_testimonial_items" USING btree ("_order");
  CREATE INDEX "gsec_blocks_testimonials_list_testimonial_items_parent_id_idx" ON "gsec_blocks_testimonials_list_testimonial_items" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_testimonials_list_testimonial_items_locale_idx" ON "gsec_blocks_testimonials_list_testimonial_items" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_testimonials_list_testimonial_items_testimon_idx" ON "gsec_blocks_testimonials_list_testimonial_items" USING btree ("testimonial_id");
  CREATE INDEX "gsec_blocks_testimonials_list_order_idx" ON "gsec_blocks_testimonials_list" USING btree ("_order");
  CREATE INDEX "gsec_blocks_testimonials_list_parent_id_idx" ON "gsec_blocks_testimonials_list" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_testimonials_list_path_idx" ON "gsec_blocks_testimonials_list" USING btree ("_path");
  CREATE INDEX "gsec_blocks_testimonials_list_locale_idx" ON "gsec_blocks_testimonials_list" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_testimonials_list_section_background_section_idx" ON "gsec_blocks_testimonials_list" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_cards_grid_items_order_idx" ON "gsec_blocks_cards_grid_items" USING btree ("_order");
  CREATE INDEX "gsec_blocks_cards_grid_items_parent_id_idx" ON "gsec_blocks_cards_grid_items" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_cards_grid_items_locale_idx" ON "gsec_blocks_cards_grid_items" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_cards_grid_items_image_image_image_idx" ON "gsec_blocks_cards_grid_items" USING btree ("image_image_id");
  CREATE INDEX "gsec_blocks_cards_grid_order_idx" ON "gsec_blocks_cards_grid" USING btree ("_order");
  CREATE INDEX "gsec_blocks_cards_grid_parent_id_idx" ON "gsec_blocks_cards_grid" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_cards_grid_path_idx" ON "gsec_blocks_cards_grid" USING btree ("_path");
  CREATE INDEX "gsec_blocks_cards_grid_locale_idx" ON "gsec_blocks_cards_grid" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_cards_grid_section_background_section_backgr_idx" ON "gsec_blocks_cards_grid" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_carousel_slides_order_idx" ON "gsec_blocks_carousel_slides" USING btree ("_order");
  CREATE INDEX "gsec_blocks_carousel_slides_parent_id_idx" ON "gsec_blocks_carousel_slides" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_carousel_slides_locale_idx" ON "gsec_blocks_carousel_slides" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_carousel_slides_image_image_image_idx" ON "gsec_blocks_carousel_slides" USING btree ("image_image_id");
  CREATE INDEX "gsec_blocks_carousel_order_idx" ON "gsec_blocks_carousel" USING btree ("_order");
  CREATE INDEX "gsec_blocks_carousel_parent_id_idx" ON "gsec_blocks_carousel" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_carousel_path_idx" ON "gsec_blocks_carousel" USING btree ("_path");
  CREATE INDEX "gsec_blocks_carousel_locale_idx" ON "gsec_blocks_carousel" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_carousel_section_background_section_backgrou_idx" ON "gsec_blocks_carousel" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_logos_items_order_idx" ON "gsec_blocks_logos_items" USING btree ("_order");
  CREATE INDEX "gsec_blocks_logos_items_parent_id_idx" ON "gsec_blocks_logos_items" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_logos_items_locale_idx" ON "gsec_blocks_logos_items" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_logos_items_image_image_image_idx" ON "gsec_blocks_logos_items" USING btree ("image_image_id");
  CREATE INDEX "gsec_blocks_logos_order_idx" ON "gsec_blocks_logos" USING btree ("_order");
  CREATE INDEX "gsec_blocks_logos_parent_id_idx" ON "gsec_blocks_logos" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_logos_path_idx" ON "gsec_blocks_logos" USING btree ("_path");
  CREATE INDEX "gsec_blocks_logos_locale_idx" ON "gsec_blocks_logos" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_logos_section_background_section_background__idx" ON "gsec_blocks_logos" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_chart_ranges_data_points_order_idx" ON "gsec_blocks_chart_ranges_data_points" USING btree ("_order");
  CREATE INDEX "gsec_blocks_chart_ranges_data_points_parent_id_idx" ON "gsec_blocks_chart_ranges_data_points" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_chart_ranges_data_points_locale_idx" ON "gsec_blocks_chart_ranges_data_points" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_chart_ranges_order_idx" ON "gsec_blocks_chart_ranges" USING btree ("_order");
  CREATE INDEX "gsec_blocks_chart_ranges_parent_id_idx" ON "gsec_blocks_chart_ranges" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_chart_ranges_locale_idx" ON "gsec_blocks_chart_ranges" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_chart_order_idx" ON "gsec_blocks_chart" USING btree ("_order");
  CREATE INDEX "gsec_blocks_chart_parent_id_idx" ON "gsec_blocks_chart" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_chart_path_idx" ON "gsec_blocks_chart" USING btree ("_path");
  CREATE INDEX "gsec_blocks_chart_locale_idx" ON "gsec_blocks_chart" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_chart_section_background_section_background__idx" ON "gsec_blocks_chart" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_cta_band_actions_order_idx" ON "gsec_blocks_cta_band_actions" USING btree ("_order");
  CREATE INDEX "gsec_blocks_cta_band_actions_parent_id_idx" ON "gsec_blocks_cta_band_actions" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_cta_band_actions_locale_idx" ON "gsec_blocks_cta_band_actions" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_cta_band_order_idx" ON "gsec_blocks_cta_band" USING btree ("_order");
  CREATE INDEX "gsec_blocks_cta_band_parent_id_idx" ON "gsec_blocks_cta_band" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_cta_band_path_idx" ON "gsec_blocks_cta_band" USING btree ("_path");
  CREATE INDEX "gsec_blocks_cta_band_locale_idx" ON "gsec_blocks_cta_band" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_cta_band_section_background_section_backgrou_idx" ON "gsec_blocks_cta_band" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_newsletter_order_idx" ON "gsec_blocks_newsletter" USING btree ("_order");
  CREATE INDEX "gsec_blocks_newsletter_parent_id_idx" ON "gsec_blocks_newsletter" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_newsletter_path_idx" ON "gsec_blocks_newsletter" USING btree ("_path");
  CREATE INDEX "gsec_blocks_newsletter_locale_idx" ON "gsec_blocks_newsletter" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_newsletter_section_background_section_backgr_idx" ON "gsec_blocks_newsletter" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_stats_items_order_idx" ON "gsec_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "gsec_blocks_stats_items_parent_id_idx" ON "gsec_blocks_stats_items" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_stats_items_locale_idx" ON "gsec_blocks_stats_items" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_stats_order_idx" ON "gsec_blocks_stats" USING btree ("_order");
  CREATE INDEX "gsec_blocks_stats_parent_id_idx" ON "gsec_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_stats_path_idx" ON "gsec_blocks_stats" USING btree ("_path");
  CREATE INDEX "gsec_blocks_stats_locale_idx" ON "gsec_blocks_stats" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_stats_section_background_section_background__idx" ON "gsec_blocks_stats" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_raw_html_order_idx" ON "gsec_blocks_raw_html" USING btree ("_order");
  CREATE INDEX "gsec_blocks_raw_html_parent_id_idx" ON "gsec_blocks_raw_html" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_raw_html_path_idx" ON "gsec_blocks_raw_html" USING btree ("_path");
  CREATE INDEX "gsec_blocks_raw_html_locale_idx" ON "gsec_blocks_raw_html" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_raw_html_section_background_section_backgrou_idx" ON "gsec_blocks_raw_html" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_hero_actions_order_idx" ON "_gsec_v_blocks_hero_actions" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_hero_actions_parent_id_idx" ON "_gsec_v_blocks_hero_actions" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_hero_actions_locale_idx" ON "_gsec_v_blocks_hero_actions" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_hero_order_idx" ON "_gsec_v_blocks_hero" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_hero_parent_id_idx" ON "_gsec_v_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_hero_path_idx" ON "_gsec_v_blocks_hero" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_hero_locale_idx" ON "_gsec_v_blocks_hero" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_hero_image_image_image_idx" ON "_gsec_v_blocks_hero" USING btree ("image_image_id");
  CREATE INDEX "_gsec_v_blocks_hero_section_background_section_backgroun_idx" ON "_gsec_v_blocks_hero" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_content_actions_order_idx" ON "_gsec_v_blocks_content_actions" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_content_actions_parent_id_idx" ON "_gsec_v_blocks_content_actions" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_content_actions_locale_idx" ON "_gsec_v_blocks_content_actions" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_content_order_idx" ON "_gsec_v_blocks_content" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_content_parent_id_idx" ON "_gsec_v_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_content_path_idx" ON "_gsec_v_blocks_content" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_content_locale_idx" ON "_gsec_v_blocks_content" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_content_image_idx" ON "_gsec_v_blocks_content" USING btree ("image_id");
  CREATE INDEX "_gsec_v_blocks_content_section_background_section_backgr_idx" ON "_gsec_v_blocks_content" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_faq_items_order_idx" ON "_gsec_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_faq_items_parent_id_idx" ON "_gsec_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_faq_items_locale_idx" ON "_gsec_v_blocks_faq_items" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_faq_order_idx" ON "_gsec_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_faq_parent_id_idx" ON "_gsec_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_faq_path_idx" ON "_gsec_v_blocks_faq" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_faq_locale_idx" ON "_gsec_v_blocks_faq" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_faq_section_background_section_background_idx" ON "_gsec_v_blocks_faq" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_testimonials_list_testimonial_items_order_idx" ON "_gsec_v_blocks_testimonials_list_testimonial_items" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_testimonials_list_testimonial_items_parent_id_idx" ON "_gsec_v_blocks_testimonials_list_testimonial_items" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_testimonials_list_testimonial_items_locale_idx" ON "_gsec_v_blocks_testimonials_list_testimonial_items" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_testimonials_list_testimonial_items_testi_idx" ON "_gsec_v_blocks_testimonials_list_testimonial_items" USING btree ("testimonial_id");
  CREATE INDEX "_gsec_v_blocks_testimonials_list_order_idx" ON "_gsec_v_blocks_testimonials_list" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_testimonials_list_parent_id_idx" ON "_gsec_v_blocks_testimonials_list" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_testimonials_list_path_idx" ON "_gsec_v_blocks_testimonials_list" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_testimonials_list_locale_idx" ON "_gsec_v_blocks_testimonials_list" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_testimonials_list_section_background_sect_idx" ON "_gsec_v_blocks_testimonials_list" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_cards_grid_items_order_idx" ON "_gsec_v_blocks_cards_grid_items" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_cards_grid_items_parent_id_idx" ON "_gsec_v_blocks_cards_grid_items" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_cards_grid_items_locale_idx" ON "_gsec_v_blocks_cards_grid_items" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_cards_grid_items_image_image_image_idx" ON "_gsec_v_blocks_cards_grid_items" USING btree ("image_image_id");
  CREATE INDEX "_gsec_v_blocks_cards_grid_order_idx" ON "_gsec_v_blocks_cards_grid" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_cards_grid_parent_id_idx" ON "_gsec_v_blocks_cards_grid" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_cards_grid_path_idx" ON "_gsec_v_blocks_cards_grid" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_cards_grid_locale_idx" ON "_gsec_v_blocks_cards_grid" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_cards_grid_section_background_section_bac_idx" ON "_gsec_v_blocks_cards_grid" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_carousel_slides_order_idx" ON "_gsec_v_blocks_carousel_slides" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_carousel_slides_parent_id_idx" ON "_gsec_v_blocks_carousel_slides" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_carousel_slides_locale_idx" ON "_gsec_v_blocks_carousel_slides" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_carousel_slides_image_image_image_idx" ON "_gsec_v_blocks_carousel_slides" USING btree ("image_image_id");
  CREATE INDEX "_gsec_v_blocks_carousel_order_idx" ON "_gsec_v_blocks_carousel" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_carousel_parent_id_idx" ON "_gsec_v_blocks_carousel" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_carousel_path_idx" ON "_gsec_v_blocks_carousel" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_carousel_locale_idx" ON "_gsec_v_blocks_carousel" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_carousel_section_background_section_backg_idx" ON "_gsec_v_blocks_carousel" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_logos_items_order_idx" ON "_gsec_v_blocks_logos_items" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_logos_items_parent_id_idx" ON "_gsec_v_blocks_logos_items" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_logos_items_locale_idx" ON "_gsec_v_blocks_logos_items" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_logos_items_image_image_image_idx" ON "_gsec_v_blocks_logos_items" USING btree ("image_image_id");
  CREATE INDEX "_gsec_v_blocks_logos_order_idx" ON "_gsec_v_blocks_logos" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_logos_parent_id_idx" ON "_gsec_v_blocks_logos" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_logos_path_idx" ON "_gsec_v_blocks_logos" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_logos_locale_idx" ON "_gsec_v_blocks_logos" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_logos_section_background_section_backgrou_idx" ON "_gsec_v_blocks_logos" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_chart_ranges_data_points_order_idx" ON "_gsec_v_blocks_chart_ranges_data_points" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_chart_ranges_data_points_parent_id_idx" ON "_gsec_v_blocks_chart_ranges_data_points" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_chart_ranges_data_points_locale_idx" ON "_gsec_v_blocks_chart_ranges_data_points" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_chart_ranges_order_idx" ON "_gsec_v_blocks_chart_ranges" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_chart_ranges_parent_id_idx" ON "_gsec_v_blocks_chart_ranges" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_chart_ranges_locale_idx" ON "_gsec_v_blocks_chart_ranges" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_chart_order_idx" ON "_gsec_v_blocks_chart" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_chart_parent_id_idx" ON "_gsec_v_blocks_chart" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_chart_path_idx" ON "_gsec_v_blocks_chart" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_chart_locale_idx" ON "_gsec_v_blocks_chart" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_chart_section_background_section_backgrou_idx" ON "_gsec_v_blocks_chart" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_cta_band_actions_order_idx" ON "_gsec_v_blocks_cta_band_actions" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_cta_band_actions_parent_id_idx" ON "_gsec_v_blocks_cta_band_actions" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_cta_band_actions_locale_idx" ON "_gsec_v_blocks_cta_band_actions" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_cta_band_order_idx" ON "_gsec_v_blocks_cta_band" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_cta_band_parent_id_idx" ON "_gsec_v_blocks_cta_band" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_cta_band_path_idx" ON "_gsec_v_blocks_cta_band" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_cta_band_locale_idx" ON "_gsec_v_blocks_cta_band" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_cta_band_section_background_section_backg_idx" ON "_gsec_v_blocks_cta_band" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_newsletter_order_idx" ON "_gsec_v_blocks_newsletter" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_newsletter_parent_id_idx" ON "_gsec_v_blocks_newsletter" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_newsletter_path_idx" ON "_gsec_v_blocks_newsletter" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_newsletter_locale_idx" ON "_gsec_v_blocks_newsletter" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_newsletter_section_background_section_bac_idx" ON "_gsec_v_blocks_newsletter" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_stats_items_order_idx" ON "_gsec_v_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_stats_items_parent_id_idx" ON "_gsec_v_blocks_stats_items" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_stats_items_locale_idx" ON "_gsec_v_blocks_stats_items" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_stats_order_idx" ON "_gsec_v_blocks_stats" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_stats_parent_id_idx" ON "_gsec_v_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_stats_path_idx" ON "_gsec_v_blocks_stats" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_stats_locale_idx" ON "_gsec_v_blocks_stats" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_stats_section_background_section_backgrou_idx" ON "_gsec_v_blocks_stats" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_raw_html_order_idx" ON "_gsec_v_blocks_raw_html" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_raw_html_parent_id_idx" ON "_gsec_v_blocks_raw_html" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_raw_html_path_idx" ON "_gsec_v_blocks_raw_html" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_raw_html_locale_idx" ON "_gsec_v_blocks_raw_html" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_raw_html_section_background_section_backg_idx" ON "_gsec_v_blocks_raw_html" USING btree ("section_background_media_id");
  CREATE INDEX "presets_blocks_hero_actions_order_idx" ON "presets_blocks_hero_actions" USING btree ("_order");
  CREATE INDEX "presets_blocks_hero_actions_parent_id_idx" ON "presets_blocks_hero_actions" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_hero_actions_locale_idx" ON "presets_blocks_hero_actions" USING btree ("_locale");
  CREATE INDEX "presets_blocks_hero_order_idx" ON "presets_blocks_hero" USING btree ("_order");
  CREATE INDEX "presets_blocks_hero_parent_id_idx" ON "presets_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_hero_path_idx" ON "presets_blocks_hero" USING btree ("_path");
  CREATE INDEX "presets_blocks_hero_image_image_image_idx" ON "presets_blocks_hero" USING btree ("image_image_id");
  CREATE INDEX "presets_blocks_hero_section_background_section_backgroun_idx" ON "presets_blocks_hero" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_hero_locales_locale_parent_id_unique" ON "presets_blocks_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_content_actions_order_idx" ON "presets_blocks_content_actions" USING btree ("_order");
  CREATE INDEX "presets_blocks_content_actions_parent_id_idx" ON "presets_blocks_content_actions" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_content_actions_locale_idx" ON "presets_blocks_content_actions" USING btree ("_locale");
  CREATE INDEX "presets_blocks_content_order_idx" ON "presets_blocks_content" USING btree ("_order");
  CREATE INDEX "presets_blocks_content_parent_id_idx" ON "presets_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_content_path_idx" ON "presets_blocks_content" USING btree ("_path");
  CREATE INDEX "presets_blocks_content_image_idx" ON "presets_blocks_content" USING btree ("image_id");
  CREATE INDEX "presets_blocks_content_section_background_section_backgr_idx" ON "presets_blocks_content" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_content_locales_locale_parent_id_unique" ON "presets_blocks_content_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_faq_items_order_idx" ON "presets_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "presets_blocks_faq_items_parent_id_idx" ON "presets_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_faq_items_locale_idx" ON "presets_blocks_faq_items" USING btree ("_locale");
  CREATE INDEX "presets_blocks_faq_order_idx" ON "presets_blocks_faq" USING btree ("_order");
  CREATE INDEX "presets_blocks_faq_parent_id_idx" ON "presets_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_faq_path_idx" ON "presets_blocks_faq" USING btree ("_path");
  CREATE INDEX "presets_blocks_faq_section_background_section_background_idx" ON "presets_blocks_faq" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_faq_locales_locale_parent_id_unique" ON "presets_blocks_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_testimonials_list_testimonial_items_order_idx" ON "presets_blocks_testimonials_list_testimonial_items" USING btree ("_order");
  CREATE INDEX "presets_blocks_testimonials_list_testimonial_items_parent_id_idx" ON "presets_blocks_testimonials_list_testimonial_items" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_testimonials_list_testimonial_items_testi_idx" ON "presets_blocks_testimonials_list_testimonial_items" USING btree ("testimonial_id");
  CREATE INDEX "presets_blocks_testimonials_list_order_idx" ON "presets_blocks_testimonials_list" USING btree ("_order");
  CREATE INDEX "presets_blocks_testimonials_list_parent_id_idx" ON "presets_blocks_testimonials_list" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_testimonials_list_path_idx" ON "presets_blocks_testimonials_list" USING btree ("_path");
  CREATE INDEX "presets_blocks_testimonials_list_section_background_sect_idx" ON "presets_blocks_testimonials_list" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_testimonials_list_locales_locale_parent_id_un" ON "presets_blocks_testimonials_list_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_cards_grid_items_order_idx" ON "presets_blocks_cards_grid_items" USING btree ("_order");
  CREATE INDEX "presets_blocks_cards_grid_items_parent_id_idx" ON "presets_blocks_cards_grid_items" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_cards_grid_items_locale_idx" ON "presets_blocks_cards_grid_items" USING btree ("_locale");
  CREATE INDEX "presets_blocks_cards_grid_items_image_image_image_idx" ON "presets_blocks_cards_grid_items" USING btree ("image_image_id");
  CREATE INDEX "presets_blocks_cards_grid_order_idx" ON "presets_blocks_cards_grid" USING btree ("_order");
  CREATE INDEX "presets_blocks_cards_grid_parent_id_idx" ON "presets_blocks_cards_grid" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_cards_grid_path_idx" ON "presets_blocks_cards_grid" USING btree ("_path");
  CREATE INDEX "presets_blocks_cards_grid_section_background_section_bac_idx" ON "presets_blocks_cards_grid" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_cards_grid_locales_locale_parent_id_unique" ON "presets_blocks_cards_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_carousel_slides_order_idx" ON "presets_blocks_carousel_slides" USING btree ("_order");
  CREATE INDEX "presets_blocks_carousel_slides_parent_id_idx" ON "presets_blocks_carousel_slides" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_carousel_slides_locale_idx" ON "presets_blocks_carousel_slides" USING btree ("_locale");
  CREATE INDEX "presets_blocks_carousel_slides_image_image_image_idx" ON "presets_blocks_carousel_slides" USING btree ("image_image_id");
  CREATE INDEX "presets_blocks_carousel_order_idx" ON "presets_blocks_carousel" USING btree ("_order");
  CREATE INDEX "presets_blocks_carousel_parent_id_idx" ON "presets_blocks_carousel" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_carousel_path_idx" ON "presets_blocks_carousel" USING btree ("_path");
  CREATE INDEX "presets_blocks_carousel_section_background_section_backg_idx" ON "presets_blocks_carousel" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_carousel_locales_locale_parent_id_unique" ON "presets_blocks_carousel_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_logos_items_order_idx" ON "presets_blocks_logos_items" USING btree ("_order");
  CREATE INDEX "presets_blocks_logos_items_parent_id_idx" ON "presets_blocks_logos_items" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_logos_items_locale_idx" ON "presets_blocks_logos_items" USING btree ("_locale");
  CREATE INDEX "presets_blocks_logos_items_image_image_image_idx" ON "presets_blocks_logos_items" USING btree ("image_image_id");
  CREATE INDEX "presets_blocks_logos_order_idx" ON "presets_blocks_logos" USING btree ("_order");
  CREATE INDEX "presets_blocks_logos_parent_id_idx" ON "presets_blocks_logos" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_logos_path_idx" ON "presets_blocks_logos" USING btree ("_path");
  CREATE INDEX "presets_blocks_logos_section_background_section_backgrou_idx" ON "presets_blocks_logos" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_logos_locales_locale_parent_id_unique" ON "presets_blocks_logos_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_chart_ranges_data_points_order_idx" ON "presets_blocks_chart_ranges_data_points" USING btree ("_order");
  CREATE INDEX "presets_blocks_chart_ranges_data_points_parent_id_idx" ON "presets_blocks_chart_ranges_data_points" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_chart_ranges_order_idx" ON "presets_blocks_chart_ranges" USING btree ("_order");
  CREATE INDEX "presets_blocks_chart_ranges_parent_id_idx" ON "presets_blocks_chart_ranges" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "presets_blocks_chart_ranges_locales_locale_parent_id_unique" ON "presets_blocks_chart_ranges_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_chart_order_idx" ON "presets_blocks_chart" USING btree ("_order");
  CREATE INDEX "presets_blocks_chart_parent_id_idx" ON "presets_blocks_chart" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_chart_path_idx" ON "presets_blocks_chart" USING btree ("_path");
  CREATE INDEX "presets_blocks_chart_section_background_section_backgrou_idx" ON "presets_blocks_chart" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_chart_locales_locale_parent_id_unique" ON "presets_blocks_chart_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_cta_band_actions_order_idx" ON "presets_blocks_cta_band_actions" USING btree ("_order");
  CREATE INDEX "presets_blocks_cta_band_actions_parent_id_idx" ON "presets_blocks_cta_band_actions" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_cta_band_actions_locale_idx" ON "presets_blocks_cta_band_actions" USING btree ("_locale");
  CREATE INDEX "presets_blocks_cta_band_order_idx" ON "presets_blocks_cta_band" USING btree ("_order");
  CREATE INDEX "presets_blocks_cta_band_parent_id_idx" ON "presets_blocks_cta_band" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_cta_band_path_idx" ON "presets_blocks_cta_band" USING btree ("_path");
  CREATE INDEX "presets_blocks_cta_band_section_background_section_backg_idx" ON "presets_blocks_cta_band" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_cta_band_locales_locale_parent_id_unique" ON "presets_blocks_cta_band_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_newsletter_order_idx" ON "presets_blocks_newsletter" USING btree ("_order");
  CREATE INDEX "presets_blocks_newsletter_parent_id_idx" ON "presets_blocks_newsletter" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_newsletter_path_idx" ON "presets_blocks_newsletter" USING btree ("_path");
  CREATE INDEX "presets_blocks_newsletter_section_background_section_bac_idx" ON "presets_blocks_newsletter" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_newsletter_locales_locale_parent_id_unique" ON "presets_blocks_newsletter_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_stats_items_order_idx" ON "presets_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "presets_blocks_stats_items_parent_id_idx" ON "presets_blocks_stats_items" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_stats_items_locale_idx" ON "presets_blocks_stats_items" USING btree ("_locale");
  CREATE INDEX "presets_blocks_stats_order_idx" ON "presets_blocks_stats" USING btree ("_order");
  CREATE INDEX "presets_blocks_stats_parent_id_idx" ON "presets_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_stats_path_idx" ON "presets_blocks_stats" USING btree ("_path");
  CREATE INDEX "presets_blocks_stats_section_background_section_backgrou_idx" ON "presets_blocks_stats" USING btree ("section_background_media_id");
  CREATE INDEX "presets_blocks_raw_html_order_idx" ON "presets_blocks_raw_html" USING btree ("_order");
  CREATE INDEX "presets_blocks_raw_html_parent_id_idx" ON "presets_blocks_raw_html" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_raw_html_path_idx" ON "presets_blocks_raw_html" USING btree ("_path");
  CREATE INDEX "presets_blocks_raw_html_section_background_section_backg_idx" ON "presets_blocks_raw_html" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_raw_html_locales_locale_parent_id_unique" ON "presets_blocks_raw_html_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_rels_locale_idx" ON "presets_rels" USING btree ("locale");
  CREATE INDEX "presets_rels_page_id_idx" ON "presets_rels" USING btree ("page_id","locale");
  CREATE INDEX "presets_rels_posts_id_idx" ON "presets_rels" USING btree ("posts_id","locale");`)
}
