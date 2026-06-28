import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
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
  CREATE TYPE "public"."enum_gsec_status" AS ENUM('draft', 'published');
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
  CREATE TYPE "public"."enum__gsec_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__gsec_v_published_locale" AS ENUM('en', 'es');
  CREATE TABLE "page_blocks_global_section_slot" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"reference_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_global_section_slot" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"reference_id" integer,
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
  
  CREATE TABLE "gsec" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_gsec_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "gsec_locales" (
  	"title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "gsec_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locale" "_locales",
  	"page_id" integer,
  	"posts_id" integer
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
  
  CREATE TABLE "_gsec_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__gsec_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__gsec_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_gsec_v_locales" (
  	"version_title" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_gsec_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locale" "_locales",
  	"page_id" integer,
  	"posts_id" integer
  );
  
  CREATE TABLE "presets_blocks_global_section_slot" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"reference_id" integer NOT NULL,
  	"block_name" varchar
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "gsec_id" integer;
  ALTER TABLE "page_blocks_global_section_slot" ADD CONSTRAINT "page_blocks_global_section_slot_reference_id_gsec_id_fk" FOREIGN KEY ("reference_id") REFERENCES "public"."gsec"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_global_section_slot" ADD CONSTRAINT "page_blocks_global_section_slot_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_global_section_slot" ADD CONSTRAINT "_page_v_blocks_global_section_slot_reference_id_gsec_id_fk" FOREIGN KEY ("reference_id") REFERENCES "public"."gsec"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_global_section_slot" ADD CONSTRAINT "_page_v_blocks_global_section_slot_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
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
  ALTER TABLE "gsec_locales" ADD CONSTRAINT "gsec_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_rels" ADD CONSTRAINT "gsec_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_rels" ADD CONSTRAINT "gsec_rels_page_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_rels" ADD CONSTRAINT "gsec_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
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
  ALTER TABLE "_gsec_v" ADD CONSTRAINT "_gsec_v_parent_id_gsec_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."gsec"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_locales" ADD CONSTRAINT "_gsec_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_rels" ADD CONSTRAINT "_gsec_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_rels" ADD CONSTRAINT "_gsec_v_rels_page_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_rels" ADD CONSTRAINT "_gsec_v_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_global_section_slot" ADD CONSTRAINT "presets_blocks_global_section_slot_reference_id_gsec_id_fk" FOREIGN KEY ("reference_id") REFERENCES "public"."gsec"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_global_section_slot" ADD CONSTRAINT "presets_blocks_global_section_slot_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_global_section_slot_order_idx" ON "page_blocks_global_section_slot" USING btree ("_order");
  CREATE INDEX "page_blocks_global_section_slot_parent_id_idx" ON "page_blocks_global_section_slot" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_global_section_slot_path_idx" ON "page_blocks_global_section_slot" USING btree ("_path");
  CREATE INDEX "page_blocks_global_section_slot_locale_idx" ON "page_blocks_global_section_slot" USING btree ("_locale");
  CREATE INDEX "page_blocks_global_section_slot_reference_idx" ON "page_blocks_global_section_slot" USING btree ("reference_id");
  CREATE INDEX "_page_v_blocks_global_section_slot_order_idx" ON "_page_v_blocks_global_section_slot" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_global_section_slot_parent_id_idx" ON "_page_v_blocks_global_section_slot" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_global_section_slot_path_idx" ON "_page_v_blocks_global_section_slot" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_global_section_slot_locale_idx" ON "_page_v_blocks_global_section_slot" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_global_section_slot_reference_idx" ON "_page_v_blocks_global_section_slot" USING btree ("reference_id");
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
  CREATE INDEX "gsec_updated_at_idx" ON "gsec" USING btree ("updated_at");
  CREATE INDEX "gsec_created_at_idx" ON "gsec" USING btree ("created_at");
  CREATE INDEX "gsec__status_idx" ON "gsec" USING btree ("_status");
  CREATE UNIQUE INDEX "gsec_locales_locale_parent_id_unique" ON "gsec_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "gsec_rels_order_idx" ON "gsec_rels" USING btree ("order");
  CREATE INDEX "gsec_rels_parent_idx" ON "gsec_rels" USING btree ("parent_id");
  CREATE INDEX "gsec_rels_path_idx" ON "gsec_rels" USING btree ("path");
  CREATE INDEX "gsec_rels_locale_idx" ON "gsec_rels" USING btree ("locale");
  CREATE INDEX "gsec_rels_page_id_idx" ON "gsec_rels" USING btree ("page_id","locale");
  CREATE INDEX "gsec_rels_posts_id_idx" ON "gsec_rels" USING btree ("posts_id","locale");
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
  CREATE INDEX "_gsec_v_parent_idx" ON "_gsec_v" USING btree ("parent_id");
  CREATE INDEX "_gsec_v_version_version_updated_at_idx" ON "_gsec_v" USING btree ("version_updated_at");
  CREATE INDEX "_gsec_v_version_version_created_at_idx" ON "_gsec_v" USING btree ("version_created_at");
  CREATE INDEX "_gsec_v_version_version__status_idx" ON "_gsec_v" USING btree ("version__status");
  CREATE INDEX "_gsec_v_created_at_idx" ON "_gsec_v" USING btree ("created_at");
  CREATE INDEX "_gsec_v_updated_at_idx" ON "_gsec_v" USING btree ("updated_at");
  CREATE INDEX "_gsec_v_snapshot_idx" ON "_gsec_v" USING btree ("snapshot");
  CREATE INDEX "_gsec_v_published_locale_idx" ON "_gsec_v" USING btree ("published_locale");
  CREATE INDEX "_gsec_v_latest_idx" ON "_gsec_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_gsec_v_locales_locale_parent_id_unique" ON "_gsec_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_gsec_v_rels_order_idx" ON "_gsec_v_rels" USING btree ("order");
  CREATE INDEX "_gsec_v_rels_parent_idx" ON "_gsec_v_rels" USING btree ("parent_id");
  CREATE INDEX "_gsec_v_rels_path_idx" ON "_gsec_v_rels" USING btree ("path");
  CREATE INDEX "_gsec_v_rels_locale_idx" ON "_gsec_v_rels" USING btree ("locale");
  CREATE INDEX "_gsec_v_rels_page_id_idx" ON "_gsec_v_rels" USING btree ("page_id","locale");
  CREATE INDEX "_gsec_v_rels_posts_id_idx" ON "_gsec_v_rels" USING btree ("posts_id","locale");
  CREATE INDEX "presets_blocks_global_section_slot_order_idx" ON "presets_blocks_global_section_slot" USING btree ("_order");
  CREATE INDEX "presets_blocks_global_section_slot_parent_id_idx" ON "presets_blocks_global_section_slot" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_global_section_slot_path_idx" ON "presets_blocks_global_section_slot" USING btree ("_path");
  CREATE INDEX "presets_blocks_global_section_slot_reference_idx" ON "presets_blocks_global_section_slot" USING btree ("reference_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_global_section_fk" FOREIGN KEY ("gsec_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_gsec_id_idx" ON "payload_locked_documents_rels" USING btree ("gsec_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_global_section_slot" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_global_section_slot" DISABLE ROW LEVEL SECURITY;
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
  ALTER TABLE "gsec" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_rels" DISABLE ROW LEVEL SECURITY;
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
  ALTER TABLE "_gsec_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_global_section_slot" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "page_blocks_global_section_slot" CASCADE;
  DROP TABLE "_page_v_blocks_global_section_slot" CASCADE;
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
  DROP TABLE "gsec" CASCADE;
  DROP TABLE "gsec_locales" CASCADE;
  DROP TABLE "gsec_rels" CASCADE;
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
  DROP TABLE "_gsec_v" CASCADE;
  DROP TABLE "_gsec_v_locales" CASCADE;
  DROP TABLE "_gsec_v_rels" CASCADE;
  DROP TABLE "presets_blocks_global_section_slot" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_global_section_fk";
  
  DROP INDEX "payload_locked_documents_rels_gsec_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "gsec_id";
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
  DROP TYPE "public"."enum_gsec_status";
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
  DROP TYPE "public"."enum__gsec_v_version_status";
  DROP TYPE "public"."enum__gsec_v_published_locale";`)
}
