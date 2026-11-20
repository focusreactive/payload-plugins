import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Replaces the posts' fixed `faq` and `cta` groups with a localized `blocks` ("Sections") field
// offering the page section blocks. Existing FAQ / CTA content is carried over as an `faq` block and
// a `ctaBand` block per post and locale, for live rows and versions alike.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_posts_blocks_content_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_posts_blocks_content_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_posts_blocks_content_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_posts_blocks_content_layout" AS ENUM('image-text', 'text-image');
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
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_items_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_items_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_items_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_items_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_posts_blocks_cards_grid_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_blocks_carousel_effect" AS ENUM('slide', 'fade', 'cube', 'flip', 'coverflow', 'cards');
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
  CREATE TYPE "public"."enum_posts_blocks_cta_band_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_posts_blocks_cta_band_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_posts_blocks_cta_band_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
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
  CREATE TYPE "public"."enum__posts_v_blocks_content_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__posts_v_blocks_content_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__posts_v_blocks_content_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__posts_v_blocks_content_layout" AS ENUM('image-text', 'text-image');
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
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_items_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_items_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_items_rounded" AS ENUM('none', 'large');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_items_background_color" AS ENUM('none', 'light', 'dark', 'light-gray', 'dark-gray', 'gradient-2');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__posts_v_blocks_cards_grid_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__posts_v_blocks_carousel_effect" AS ENUM('slide', 'fade', 'cube', 'flip', 'coverflow', 'cards');
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
  CREATE TYPE "public"."enum__posts_v_blocks_cta_band_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__posts_v_blocks_cta_band_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__posts_v_blocks_cta_band_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
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
  	"type" "enum_posts_blocks_content_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_posts_blocks_content_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum_posts_blocks_content_actions_appearance" DEFAULT 'default'
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
  	"layout" "enum_posts_blocks_content_layout" DEFAULT 'image-text',
  	"image_id" integer,
  	"content" jsonb,
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
  	"icon" "enum_posts_blocks_cards_grid_items_icon",
  	"title" varchar,
  	"description" varchar,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum_posts_blocks_cards_grid_items_image_aspect_ratio" DEFAULT '1/1',
  	"link_type" "enum_posts_blocks_cards_grid_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_posts_blocks_cards_grid_items_link_custom_page",
  	"link_label" varchar,
  	"link_appearance" "enum_posts_blocks_cards_grid_items_link_appearance" DEFAULT 'default',
  	"align_variant" "enum_posts_blocks_cards_grid_items_align_variant" DEFAULT 'center',
  	"rounded" "enum_posts_blocks_cards_grid_items_rounded" DEFAULT 'none',
  	"background_color" "enum_posts_blocks_cards_grid_items_background_color" DEFAULT 'none'
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
  	"columns" numeric DEFAULT 3,
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
  	"link_type" "enum_posts_blocks_logos_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_posts_blocks_logos_items_link_custom_page",
  	"link_label" varchar
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
  	"type" "enum_posts_blocks_cta_band_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_posts_blocks_cta_band_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum_posts_blocks_cta_band_actions_appearance" DEFAULT 'default'
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
  	"type" "enum__posts_v_blocks_content_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum__posts_v_blocks_content_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum__posts_v_blocks_content_actions_appearance" DEFAULT 'default',
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
  	"layout" "enum__posts_v_blocks_content_layout" DEFAULT 'image-text',
  	"image_id" integer,
  	"content" jsonb,
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
  	"icon" "enum__posts_v_blocks_cards_grid_items_icon",
  	"title" varchar,
  	"description" varchar,
  	"image_image_id" integer,
  	"image_aspect_ratio" "enum__posts_v_blocks_cards_grid_items_image_aspect_ratio" DEFAULT '1/1',
  	"link_type" "enum__posts_v_blocks_cards_grid_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__posts_v_blocks_cards_grid_items_link_custom_page",
  	"link_label" varchar,
  	"link_appearance" "enum__posts_v_blocks_cards_grid_items_link_appearance" DEFAULT 'default',
  	"align_variant" "enum__posts_v_blocks_cards_grid_items_align_variant" DEFAULT 'center',
  	"rounded" "enum__posts_v_blocks_cards_grid_items_rounded" DEFAULT 'none',
  	"background_color" "enum__posts_v_blocks_cards_grid_items_background_color" DEFAULT 'none',
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
  	"columns" numeric DEFAULT 3,
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
  	"link_type" "enum__posts_v_blocks_logos_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__posts_v_blocks_logos_items_link_custom_page",
  	"link_label" varchar,
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
  	"type" "enum__posts_v_blocks_cta_band_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum__posts_v_blocks_cta_band_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum__posts_v_blocks_cta_band_actions_appearance" DEFAULT 'default',
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
  
`)

  await db.execute(sql`
  -- Carry each post's legacy FAQ / CTA groups into the new localized "blocks" (Sections) field:
  -- one FAQ block and one CTA band block per post and locale, for the live rows and every version.
  --   FAQ: moved when the locale has at least one FAQ item (the old page only rendered it then).
  --   CTA: moved when the locale has a heading title or an action. The old page hid a CTA without a
  --        title, so such a block is moved with "_hidden" = true. It keeps the old look: dark theme,
  --        no vertical padding.

  CREATE TEMP TABLE "tmp_post_sections" AS
  SELECT
    "keys"."parent_id",
    "keys"."locale",
    "l"."faq_heading_eyebrow", "l"."faq_heading_title", "l"."faq_heading_description",
    "l"."cta_heading_eyebrow", "l"."cta_heading_title", "l"."cta_heading_description",
    EXISTS (SELECT 1 FROM "posts_faq_items" "i" WHERE "i"."_parent_id" = "keys"."parent_id" AND "i"."_locale" = "keys"."locale") AS "has_faq",
    COALESCE(btrim("l"."cta_heading_title"), '') <> '' AS "cta_visible",
    EXISTS (SELECT 1 FROM "posts_cta_actions" "a" WHERE "a"."_parent_id" = "keys"."parent_id" AND "a"."_locale" = "keys"."locale") AS "has_cta_actions",
    substr(md5(random()::text || clock_timestamp()::text || 'faq'), 1, 24) AS "faq_block_id",
    substr(md5(random()::text || clock_timestamp()::text || 'cta'), 1, 24) AS "cta_block_id"
  FROM (
    SELECT "_parent_id" AS "parent_id", "_locale" AS "locale" FROM "posts_locales"
    UNION SELECT "_parent_id", "_locale" FROM "posts_faq_items"
    UNION SELECT "_parent_id", "_locale" FROM "posts_cta_actions"
  ) AS "keys"
  LEFT JOIN "posts_locales" "l" ON "l"."_parent_id" = "keys"."parent_id" AND "l"."_locale" = "keys"."locale";

  INSERT INTO "posts_blocks_faq" ("_order", "_parent_id", "_path", "_locale", "id", "heading_eyebrow", "heading_title", "heading_description")
  SELECT 1, "parent_id", 'blocks', "locale", "faq_block_id", "faq_heading_eyebrow", "faq_heading_title", "faq_heading_description"
  FROM "tmp_post_sections" WHERE "has_faq";

  INSERT INTO "posts_blocks_faq_items" ("_order", "_parent_id", "_locale", "id", "question", "answer")
  SELECT "i"."_order", "s"."faq_block_id", "i"."_locale", "i"."id", "i"."question", "i"."answer"
  FROM "posts_faq_items" "i"
  JOIN "tmp_post_sections" "s" ON "s"."parent_id" = "i"."_parent_id" AND "s"."locale" = "i"."_locale";

  INSERT INTO "posts_blocks_cta_band" ("_order", "_parent_id", "_path", "_locale", "id", "heading_eyebrow", "heading_title", "heading_description", "section_theme", "section_padding_y", "_hidden")
  SELECT CASE WHEN "has_faq" THEN 2 ELSE 1 END, "parent_id", 'blocks', "locale", "cta_block_id", "cta_heading_eyebrow", "cta_heading_title", "cta_heading_description", 'dark', 'none', NOT "cta_visible"
  FROM "tmp_post_sections" WHERE "cta_visible" OR "has_cta_actions";

  INSERT INTO "posts_blocks_cta_band_actions" ("_order", "_parent_id", "_locale", "id", "type", "new_tab", "url", "custom_page", "label", "appearance")
  SELECT "a"."_order", "s"."cta_block_id", "a"."_locale", "a"."id",
    "a"."type"::text::"enum_posts_blocks_cta_band_actions_type", "a"."new_tab", "a"."url",
    "a"."custom_page"::text::"enum_posts_blocks_cta_band_actions_custom_page", "a"."label",
    "a"."appearance"::text::"enum_posts_blocks_cta_band_actions_appearance"
  FROM "posts_cta_actions" "a"
  JOIN "tmp_post_sections" "s" ON "s"."parent_id" = "a"."_parent_id" AND "s"."locale" = "a"."_locale";

  -- Reference links of CTA actions live in posts_rels, addressed by path.
  UPDATE "posts_rels" "r"
  SET "path" = 'blocks.' || CASE WHEN "s"."has_faq" THEN 1 ELSE 0 END || substring("r"."path" FROM '^cta([.]actions[.][0-9]+[.].*)$')
  FROM "tmp_post_sections" "s"
  WHERE "r"."parent_id" = "s"."parent_id" AND "r"."locale" = "s"."locale" AND "r"."path" LIKE 'cta.actions.%';
  DELETE FROM "posts_rels" WHERE "path" LIKE 'cta.%' OR "path" LIKE 'faq.%';

  -- Same for versions (drafts/history). Version block ids are serial, so they are reserved up front.
  CREATE TEMP TABLE "tmp_post_version_sections" AS
  SELECT "base".*,
    CASE WHEN "base"."has_faq" THEN nextval(pg_get_serial_sequence('"_posts_v_blocks_faq"', 'id')) END AS "faq_block_id",
    CASE WHEN "base"."cta_visible" OR "base"."has_cta_actions" THEN nextval(pg_get_serial_sequence('"_posts_v_blocks_cta_band"', 'id')) END AS "cta_block_id"
  FROM (
    SELECT
      "keys"."parent_id",
      "keys"."locale",
      "l"."version_faq_heading_eyebrow" AS "faq_heading_eyebrow", "l"."version_faq_heading_title" AS "faq_heading_title", "l"."version_faq_heading_description" AS "faq_heading_description",
      "l"."version_cta_heading_eyebrow" AS "cta_heading_eyebrow", "l"."version_cta_heading_title" AS "cta_heading_title", "l"."version_cta_heading_description" AS "cta_heading_description",
      EXISTS (SELECT 1 FROM "_posts_v_version_faq_items" "i" WHERE "i"."_parent_id" = "keys"."parent_id" AND "i"."_locale" = "keys"."locale") AS "has_faq",
      COALESCE(btrim("l"."version_cta_heading_title"), '') <> '' AS "cta_visible",
      EXISTS (SELECT 1 FROM "_posts_v_version_cta_actions" "a" WHERE "a"."_parent_id" = "keys"."parent_id" AND "a"."_locale" = "keys"."locale") AS "has_cta_actions"
    FROM (
      SELECT "_parent_id" AS "parent_id", "_locale" AS "locale" FROM "_posts_v_locales"
      UNION SELECT "_parent_id", "_locale" FROM "_posts_v_version_faq_items"
      UNION SELECT "_parent_id", "_locale" FROM "_posts_v_version_cta_actions"
    ) AS "keys"
    LEFT JOIN "_posts_v_locales" "l" ON "l"."_parent_id" = "keys"."parent_id" AND "l"."_locale" = "keys"."locale"
  ) AS "base";

  INSERT INTO "_posts_v_blocks_faq" ("_order", "_parent_id", "_path", "_locale", "id", "heading_eyebrow", "heading_title", "heading_description", "_uuid")
  SELECT 1, "parent_id", 'version.blocks', "locale", "faq_block_id", "faq_heading_eyebrow", "faq_heading_title", "faq_heading_description", substr(md5(random()::text || clock_timestamp()::text), 1, 24)
  FROM "tmp_post_version_sections" WHERE "faq_block_id" IS NOT NULL;

  INSERT INTO "_posts_v_blocks_faq_items" ("_order", "_parent_id", "_locale", "question", "answer", "_uuid")
  SELECT "i"."_order", "s"."faq_block_id", "i"."_locale", "i"."question", "i"."answer", "i"."_uuid"
  FROM "_posts_v_version_faq_items" "i"
  JOIN "tmp_post_version_sections" "s" ON "s"."parent_id" = "i"."_parent_id" AND "s"."locale" = "i"."_locale";

  INSERT INTO "_posts_v_blocks_cta_band" ("_order", "_parent_id", "_path", "_locale", "id", "heading_eyebrow", "heading_title", "heading_description", "section_theme", "section_padding_y", "_hidden", "_uuid")
  SELECT CASE WHEN "has_faq" THEN 2 ELSE 1 END, "parent_id", 'version.blocks', "locale", "cta_block_id", "cta_heading_eyebrow", "cta_heading_title", "cta_heading_description", 'dark', 'none', NOT "cta_visible", substr(md5(random()::text || clock_timestamp()::text), 1, 24)
  FROM "tmp_post_version_sections" WHERE "cta_block_id" IS NOT NULL;

  INSERT INTO "_posts_v_blocks_cta_band_actions" ("_order", "_parent_id", "_locale", "type", "new_tab", "url", "custom_page", "label", "appearance", "_uuid")
  SELECT "a"."_order", "s"."cta_block_id", "a"."_locale",
    "a"."type"::text::"enum__posts_v_blocks_cta_band_actions_type", "a"."new_tab", "a"."url",
    "a"."custom_page"::text::"enum__posts_v_blocks_cta_band_actions_custom_page", "a"."label",
    "a"."appearance"::text::"enum__posts_v_blocks_cta_band_actions_appearance", "a"."_uuid"
  FROM "_posts_v_version_cta_actions" "a"
  JOIN "tmp_post_version_sections" "s" ON "s"."parent_id" = "a"."_parent_id" AND "s"."locale" = "a"."_locale";

  UPDATE "_posts_v_rels" "r"
  SET "path" = 'version.blocks.' || CASE WHEN "s"."has_faq" THEN 1 ELSE 0 END || substring("r"."path" FROM '^version[.]cta([.]actions[.][0-9]+[.].*)$')
  FROM "tmp_post_version_sections" "s"
  WHERE "r"."parent_id" = "s"."parent_id" AND "r"."locale" = "s"."locale" AND "r"."path" LIKE 'version.cta.actions.%';
  DELETE FROM "_posts_v_rels" WHERE "path" LIKE 'version.cta.%' OR "path" LIKE 'version.faq.%';

  DROP TABLE "tmp_post_sections";
  DROP TABLE "tmp_post_version_sections";
`)

  await db.execute(sql`
  DROP TABLE "posts_faq_items" CASCADE;
  DROP TABLE "posts_cta_actions" CASCADE;
  DROP TABLE "_posts_v_version_faq_items" CASCADE;
  DROP TABLE "_posts_v_version_cta_actions" CASCADE;
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
  DROP TYPE "public"."enum_posts_cta_actions_type";
  DROP TYPE "public"."enum_posts_cta_actions_custom_page";
  DROP TYPE "public"."enum_posts_cta_actions_appearance";
  DROP TYPE "public"."enum__posts_v_version_cta_actions_type";
  DROP TYPE "public"."enum__posts_v_version_cta_actions_custom_page";
  DROP TYPE "public"."enum__posts_v_version_cta_actions_appearance";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
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
`)

  await db.execute(sql`
  -- Move the first FAQ block and the first CTA band block of each post/locale (live rows and
  -- versions) back into the legacy faq / cta groups. Other sections have no legacy home and are
  -- dropped with their tables below.

  CREATE TEMP TABLE "tmp_post_faq" AS
  SELECT DISTINCT ON ("_parent_id", "_locale") * FROM "posts_blocks_faq" ORDER BY "_parent_id", "_locale", "_order";
  CREATE TEMP TABLE "tmp_post_cta" AS
  SELECT DISTINCT ON ("_parent_id", "_locale") * FROM "posts_blocks_cta_band" ORDER BY "_parent_id", "_locale", "_order";

  UPDATE "posts_locales" "l"
  SET "faq_heading_eyebrow" = "f"."heading_eyebrow", "faq_heading_title" = "f"."heading_title", "faq_heading_description" = "f"."heading_description"
  FROM "tmp_post_faq" "f" WHERE "f"."_parent_id" = "l"."_parent_id" AND "f"."_locale" = "l"."_locale";
  UPDATE "posts_locales" "l"
  SET "cta_heading_eyebrow" = "c"."heading_eyebrow", "cta_heading_title" = "c"."heading_title", "cta_heading_description" = "c"."heading_description"
  FROM "tmp_post_cta" "c" WHERE "c"."_parent_id" = "l"."_parent_id" AND "c"."_locale" = "l"."_locale";

  INSERT INTO "posts_faq_items" ("_order", "_parent_id", "_locale", "id", "question", "answer")
  SELECT "i"."_order", "f"."_parent_id", "i"."_locale", "i"."id", "i"."question", "i"."answer"
  FROM "posts_blocks_faq_items" "i" JOIN "tmp_post_faq" "f" ON "f"."id" = "i"."_parent_id" AND "f"."_locale" = "i"."_locale";

  INSERT INTO "posts_cta_actions" ("_order", "_parent_id", "_locale", "id", "type", "new_tab", "url", "custom_page", "label", "appearance")
  SELECT "a"."_order", "c"."_parent_id", "a"."_locale", "a"."id",
    "a"."type"::text::"enum_posts_cta_actions_type", "a"."new_tab", "a"."url",
    "a"."custom_page"::text::"enum_posts_cta_actions_custom_page", "a"."label",
    "a"."appearance"::text::"enum_posts_cta_actions_appearance"
  FROM "posts_blocks_cta_band_actions" "a" JOIN "tmp_post_cta" "c" ON "c"."id" = "a"."_parent_id" AND "c"."_locale" = "a"."_locale";

  UPDATE "posts_rels" "r"
  SET "path" = 'cta' || substring("r"."path" FROM '^blocks[.][0-9]+([.]actions[.][0-9]+[.].*)$')
  FROM "tmp_post_cta" "c"
  WHERE "r"."parent_id" = "c"."_parent_id" AND "r"."locale" = "c"."_locale"
    AND "r"."path" LIKE 'blocks.' || ("c"."_order" - 1) || '.actions.%';
  DELETE FROM "posts_rels" WHERE "path" LIKE 'blocks.%';

  CREATE TEMP TABLE "tmp_post_v_faq" AS
  SELECT DISTINCT ON ("_parent_id", "_locale") * FROM "_posts_v_blocks_faq" ORDER BY "_parent_id", "_locale", "_order";
  CREATE TEMP TABLE "tmp_post_v_cta" AS
  SELECT DISTINCT ON ("_parent_id", "_locale") * FROM "_posts_v_blocks_cta_band" ORDER BY "_parent_id", "_locale", "_order";

  UPDATE "_posts_v_locales" "l"
  SET "version_faq_heading_eyebrow" = "f"."heading_eyebrow", "version_faq_heading_title" = "f"."heading_title", "version_faq_heading_description" = "f"."heading_description"
  FROM "tmp_post_v_faq" "f" WHERE "f"."_parent_id" = "l"."_parent_id" AND "f"."_locale" = "l"."_locale";
  UPDATE "_posts_v_locales" "l"
  SET "version_cta_heading_eyebrow" = "c"."heading_eyebrow", "version_cta_heading_title" = "c"."heading_title", "version_cta_heading_description" = "c"."heading_description"
  FROM "tmp_post_v_cta" "c" WHERE "c"."_parent_id" = "l"."_parent_id" AND "c"."_locale" = "l"."_locale";

  INSERT INTO "_posts_v_version_faq_items" ("_order", "_parent_id", "_locale", "question", "answer", "_uuid")
  SELECT "i"."_order", "f"."_parent_id", "i"."_locale", "i"."question", "i"."answer", "i"."_uuid"
  FROM "_posts_v_blocks_faq_items" "i" JOIN "tmp_post_v_faq" "f" ON "f"."id" = "i"."_parent_id" AND "f"."_locale" = "i"."_locale";

  INSERT INTO "_posts_v_version_cta_actions" ("_order", "_parent_id", "_locale", "type", "new_tab", "url", "custom_page", "label", "appearance", "_uuid")
  SELECT "a"."_order", "c"."_parent_id", "a"."_locale",
    "a"."type"::text::"enum__posts_v_version_cta_actions_type", "a"."new_tab", "a"."url",
    "a"."custom_page"::text::"enum__posts_v_version_cta_actions_custom_page", "a"."label",
    "a"."appearance"::text::"enum__posts_v_version_cta_actions_appearance", "a"."_uuid"
  FROM "_posts_v_blocks_cta_band_actions" "a" JOIN "tmp_post_v_cta" "c" ON "c"."id" = "a"."_parent_id" AND "c"."_locale" = "a"."_locale";

  UPDATE "_posts_v_rels" "r"
  SET "path" = 'version.cta' || substring("r"."path" FROM '^version[.]blocks[.][0-9]+([.]actions[.][0-9]+[.].*)$')
  FROM "tmp_post_v_cta" "c"
  WHERE "r"."parent_id" = "c"."_parent_id" AND "r"."locale" = "c"."_locale"
    AND "r"."path" LIKE 'version.blocks.' || ("c"."_order" - 1) || '.actions.%';
  DELETE FROM "_posts_v_rels" WHERE "path" LIKE 'version.blocks.%';

  DROP TABLE "tmp_post_faq";
  DROP TABLE "tmp_post_cta";
  DROP TABLE "tmp_post_v_faq";
  DROP TABLE "tmp_post_v_cta";
`)

  await db.execute(sql`
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
  DROP TYPE "public"."enum_posts_blocks_content_actions_type";
  DROP TYPE "public"."enum_posts_blocks_content_actions_custom_page";
  DROP TYPE "public"."enum_posts_blocks_content_actions_appearance";
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
  DROP TYPE "public"."enum_posts_blocks_cards_grid_items_link_type";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_items_link_custom_page";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_items_link_appearance";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_items_align_variant";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_items_rounded";
  DROP TYPE "public"."enum_posts_blocks_cards_grid_items_background_color";
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
  DROP TYPE "public"."enum_posts_blocks_cta_band_actions_type";
  DROP TYPE "public"."enum_posts_blocks_cta_band_actions_custom_page";
  DROP TYPE "public"."enum_posts_blocks_cta_band_actions_appearance";
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
  DROP TYPE "public"."enum__posts_v_blocks_content_actions_type";
  DROP TYPE "public"."enum__posts_v_blocks_content_actions_custom_page";
  DROP TYPE "public"."enum__posts_v_blocks_content_actions_appearance";
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
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_items_link_type";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_items_link_custom_page";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_items_link_appearance";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_items_align_variant";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_items_rounded";
  DROP TYPE "public"."enum__posts_v_blocks_cards_grid_items_background_color";
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
  DROP TYPE "public"."enum__posts_v_blocks_cta_band_actions_type";
  DROP TYPE "public"."enum__posts_v_blocks_cta_band_actions_custom_page";
  DROP TYPE "public"."enum__posts_v_blocks_cta_band_actions_appearance";
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
  DROP TYPE "public"."enum__posts_v_blocks_raw_html_section_padding_x";`)
}
