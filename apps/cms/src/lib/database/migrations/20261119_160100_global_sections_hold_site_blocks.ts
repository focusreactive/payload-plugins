import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_gsec_blocks_logo_strip_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_gsec_blocks_logo_strip_arrangement" AS ENUM('rotate', 'wrap', 'wrapTablet');
  CREATE TYPE "public"."enum_gsec_blocks_icon_list_layout" AS ENUM('list', 'image');
  CREATE TYPE "public"."enum_gsec_blocks_icon_list_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_gsec_blocks_media_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_gsec_blocks_media_text_image_style" AS ENUM('framed', 'plain');
  CREATE TYPE "public"."enum_gsec_blocks_media_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum_gsec_blocks_media_text_size" AS ENUM('regular', 'full', 'small');
  CREATE TYPE "public"."enum_gsec_blocks_media_text_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_gsec_blocks_insurance_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_gsec_blocks_doc_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_gsec_blocks_doc_slider_bottom_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_gsec_blocks_rev_slider_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_gsec_blocks_rev_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_gsec_blocks_cond_grid_list_heading_level" AS ENUM('h3', 'h2');
  CREATE TYPE "public"."enum_gsec_blocks_cond_grid_title_level" AS ENUM('h5', 'h3');
  CREATE TYPE "public"."enum_gsec_blocks_cond_grid_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_gsec_blocks_cond_grid_video_position" AS ENUM('afterText', 'afterList');
  CREATE TYPE "public"."enum_gsec_blocks_cond_grid_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_gsec_blocks_before_after_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_gsec_blocks_treat_cards_heading_align" AS ENUM('left', 'center');
  CREATE TYPE "public"."enum_gsec_blocks_treat_cards_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_gsec_blocks_post_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_gsec_blocks_site_cta_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_gsec_blocks_center_text_kind" AS ENUM('text', 'faq', 'quote', 'doctors');
  CREATE TYPE "public"."enum_gsec_blocks_center_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_gsec_blocks_center_text_button_style" AS ENUM('filled', 'outline');
  CREATE TYPE "public"."enum_gsec_blocks_center_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_gsec_blocks_center_text_background" AS ENUM('bg', 'white', 'light-blue', 'yellow');
  CREATE TYPE "public"."enum_gsec_stky_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_gsec_stky_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TYPE "public"."enum_gsec_blocks_results_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_gsec_blocks_results_align" AS ENUM('start', 'center');
  CREATE TYPE "public"."enum_gsec_blocks_state_docs_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_gsec_blocks_quiz_demo_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__gsec_v_blocks_logo_strip_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__gsec_v_blocks_logo_strip_arrangement" AS ENUM('rotate', 'wrap', 'wrapTablet');
  CREATE TYPE "public"."enum__gsec_v_blocks_icon_list_layout" AS ENUM('list', 'image');
  CREATE TYPE "public"."enum__gsec_v_blocks_icon_list_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__gsec_v_blocks_media_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__gsec_v_blocks_media_text_image_style" AS ENUM('framed', 'plain');
  CREATE TYPE "public"."enum__gsec_v_blocks_media_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum__gsec_v_blocks_media_text_size" AS ENUM('regular', 'full', 'small');
  CREATE TYPE "public"."enum__gsec_v_blocks_media_text_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__gsec_v_blocks_insurance_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__gsec_v_blocks_doc_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__gsec_v_blocks_doc_slider_bottom_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__gsec_v_blocks_rev_slider_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__gsec_v_blocks_rev_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__gsec_v_blocks_cond_grid_list_heading_level" AS ENUM('h3', 'h2');
  CREATE TYPE "public"."enum__gsec_v_blocks_cond_grid_title_level" AS ENUM('h5', 'h3');
  CREATE TYPE "public"."enum__gsec_v_blocks_cond_grid_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__gsec_v_blocks_cond_grid_video_position" AS ENUM('afterText', 'afterList');
  CREATE TYPE "public"."enum__gsec_v_blocks_cond_grid_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__gsec_v_blocks_before_after_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__gsec_v_blocks_treat_cards_heading_align" AS ENUM('left', 'center');
  CREATE TYPE "public"."enum__gsec_v_blocks_treat_cards_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__gsec_v_blocks_post_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__gsec_v_blocks_site_cta_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__gsec_v_blocks_center_text_kind" AS ENUM('text', 'faq', 'quote', 'doctors');
  CREATE TYPE "public"."enum__gsec_v_blocks_center_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__gsec_v_blocks_center_text_button_style" AS ENUM('filled', 'outline');
  CREATE TYPE "public"."enum__gsec_v_blocks_center_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__gsec_v_blocks_center_text_background" AS ENUM('bg', 'white', 'light-blue', 'yellow');
  CREATE TYPE "public"."enum___gsec_v_stky_v_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum___gsec_v_stky_v_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TYPE "public"."enum__gsec_v_blocks_results_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__gsec_v_blocks_results_align" AS ENUM('start', 'center');
  CREATE TYPE "public"."enum__gsec_v_blocks_state_docs_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__gsec_v_blocks_quiz_demo_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TABLE "gsec_blocks_logo_strip_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "gsec_blocks_logo_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"background" "enum_gsec_blocks_logo_strip_background" DEFAULT 'none',
  	"arrangement" "enum_gsec_blocks_logo_strip_arrangement" DEFAULT 'rotate',
  	"anchor" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_icon_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"title" varchar,
  	"accent_title" jsonb,
  	"text" varchar
  );
  
  CREATE TABLE "gsec_blocks_icon_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"layout" "enum_gsec_blocks_icon_list_layout" DEFAULT 'list',
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"intro" jsonb,
  	"image_id" integer,
  	"button_text" varchar,
  	"button_link_kind" "enum_gsec_blocks_icon_list_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_media_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_gsec_blocks_media_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"image_id" integer,
  	"image_style" "enum_gsec_blocks_media_text_image_style" DEFAULT 'framed',
  	"video_url" varchar,
  	"side" "enum_gsec_blocks_media_text_side" DEFAULT 'left',
  	"size" "enum_gsec_blocks_media_text_size" DEFAULT 'regular',
  	"background" "enum_gsec_blocks_media_text_background" DEFAULT 'none',
  	"anchor" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_insurance_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "gsec_blocks_insurance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_gsec_blocks_insurance_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_doc_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_gsec_blocks_doc_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"bottom_button_text" varchar,
  	"bottom_button_link_kind" "enum_gsec_blocks_doc_slider_bottom_button_link_kind" DEFAULT 'internal',
  	"bottom_button_link_new_tab" boolean,
  	"bottom_button_link_path" varchar,
  	"bottom_button_link_url" varchar,
  	"image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_rev_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"note" varchar,
  	"limit" numeric,
  	"heading_level" "enum_gsec_blocks_rev_slider_heading_level" DEFAULT 'h3',
  	"button_text" varchar,
  	"button_link_kind" "enum_gsec_blocks_rev_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_cond_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"list_heading" varchar,
  	"list_heading_level" "enum_gsec_blocks_cond_grid_list_heading_level" DEFAULT 'h3',
  	"link_text" varchar,
  	"title_level" "enum_gsec_blocks_cond_grid_title_level" DEFAULT 'h5',
  	"show_more_text" varchar,
  	"show_less_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_gsec_blocks_cond_grid_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"video_url" varchar,
  	"video_position" "enum_gsec_blocks_cond_grid_video_position" DEFAULT 'afterText',
  	"video_heading" varchar,
  	"video_cover_id" integer,
  	"background" "enum_gsec_blocks_cond_grid_background" DEFAULT 'white',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_before_after_pairs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"before_id" integer,
  	"after_id" integer
  );
  
  CREATE TABLE "gsec_blocks_before_after" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_gsec_blocks_before_after_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_treat_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"heading_align" "enum_gsec_blocks_treat_cards_heading_align" DEFAULT 'left',
  	"text" jsonb,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_gsec_blocks_treat_cards_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_post_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_gsec_blocks_post_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"limit" numeric DEFAULT 6,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_site_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_gsec_blocks_site_cta_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_center_text_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "gsec_blocks_center_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" jsonb,
  	"kind" "enum_gsec_blocks_center_text_kind" DEFAULT 'text',
  	"first_open" boolean DEFAULT false,
  	"faq_schema" boolean DEFAULT true,
  	"quote" varchar,
  	"quote_by_id" integer,
  	"closing_text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_gsec_blocks_center_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"button_style" "enum_gsec_blocks_center_text_button_style" DEFAULT 'filled',
  	"heading_level" "enum_gsec_blocks_center_text_heading_level" DEFAULT 'h2',
  	"background" "enum_gsec_blocks_center_text_background" DEFAULT 'bg',
  	"anchor" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_stky_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_gsec_stky_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum_gsec_stky_chapters_note_size" DEFAULT 'regular'
  );
  
  CREATE TABLE "gsec_stky" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_results_items_symptoms" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"name" varchar
  );
  
  CREATE TABLE "gsec_blocks_results_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"place" varchar,
  	"rating" numeric DEFAULT 5,
  	"source_logo_id" integer,
  	"before_id" integer,
  	"after_id" integer
  );
  
  CREATE TABLE "gsec_blocks_results" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"note" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_gsec_blocks_results_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"align" "enum_gsec_blocks_results_align" DEFAULT 'start',
  	"symptoms_label" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_state_sites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"state_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_state_docs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"state_id" integer,
  	"card_button_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_gsec_blocks_state_docs_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_loc_accord_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"name" varchar
  );
  
  CREATE TABLE "gsec_blocks_loc_accord" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"all_link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_clinic_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"accredit_heading" jsonb,
  	"accredit_text" jsonb,
  	"accredit_image_id" integer,
  	"doctor_button" varchar,
  	"hours_heading" varchar,
  	"near_heading" varchar,
  	"text" jsonb,
  	"directions_heading" varchar,
  	"directions" jsonb,
  	"clinic_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_quiz_demo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_gsec_blocks_quiz_demo_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_trending" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_blog_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tags_title" varchar,
  	"all_text" varchar,
  	"heading" varchar,
  	"more_text" varchar,
  	"page_size" numeric DEFAULT 8,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  CREATE TABLE "_gsec_v_blocks_logo_strip_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_logo_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"background" "enum__gsec_v_blocks_logo_strip_background" DEFAULT 'none',
  	"arrangement" "enum__gsec_v_blocks_logo_strip_arrangement" DEFAULT 'rotate',
  	"anchor" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_icon_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"title" varchar,
  	"accent_title" jsonb,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_icon_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"layout" "enum__gsec_v_blocks_icon_list_layout" DEFAULT 'list',
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"intro" jsonb,
  	"image_id" integer,
  	"button_text" varchar,
  	"button_link_kind" "enum__gsec_v_blocks_icon_list_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_media_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__gsec_v_blocks_media_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"image_id" integer,
  	"image_style" "enum__gsec_v_blocks_media_text_image_style" DEFAULT 'framed',
  	"video_url" varchar,
  	"side" "enum__gsec_v_blocks_media_text_side" DEFAULT 'left',
  	"size" "enum__gsec_v_blocks_media_text_size" DEFAULT 'regular',
  	"background" "enum__gsec_v_blocks_media_text_background" DEFAULT 'none',
  	"anchor" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_insurance_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_insurance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__gsec_v_blocks_insurance_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_doc_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__gsec_v_blocks_doc_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"bottom_button_text" varchar,
  	"bottom_button_link_kind" "enum__gsec_v_blocks_doc_slider_bottom_button_link_kind" DEFAULT 'internal',
  	"bottom_button_link_new_tab" boolean,
  	"bottom_button_link_path" varchar,
  	"bottom_button_link_url" varchar,
  	"image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_rev_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"note" varchar,
  	"limit" numeric,
  	"heading_level" "enum__gsec_v_blocks_rev_slider_heading_level" DEFAULT 'h3',
  	"button_text" varchar,
  	"button_link_kind" "enum__gsec_v_blocks_rev_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_cond_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"list_heading" varchar,
  	"list_heading_level" "enum__gsec_v_blocks_cond_grid_list_heading_level" DEFAULT 'h3',
  	"link_text" varchar,
  	"title_level" "enum__gsec_v_blocks_cond_grid_title_level" DEFAULT 'h5',
  	"show_more_text" varchar,
  	"show_less_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__gsec_v_blocks_cond_grid_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"video_url" varchar,
  	"video_position" "enum__gsec_v_blocks_cond_grid_video_position" DEFAULT 'afterText',
  	"video_heading" varchar,
  	"video_cover_id" integer,
  	"background" "enum__gsec_v_blocks_cond_grid_background" DEFAULT 'white',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_before_after_pairs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"before_id" integer,
  	"after_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_before_after" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__gsec_v_blocks_before_after_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_treat_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"heading_align" "enum__gsec_v_blocks_treat_cards_heading_align" DEFAULT 'left',
  	"text" jsonb,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__gsec_v_blocks_treat_cards_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_post_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__gsec_v_blocks_post_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"limit" numeric DEFAULT 6,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_site_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__gsec_v_blocks_site_cta_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_center_text_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_center_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" jsonb,
  	"kind" "enum__gsec_v_blocks_center_text_kind" DEFAULT 'text',
  	"first_open" boolean DEFAULT false,
  	"faq_schema" boolean DEFAULT true,
  	"quote" varchar,
  	"quote_by_id" integer,
  	"closing_text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__gsec_v_blocks_center_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"button_style" "enum__gsec_v_blocks_center_text_button_style" DEFAULT 'filled',
  	"heading_level" "enum__gsec_v_blocks_center_text_heading_level" DEFAULT 'h2',
  	"background" "enum__gsec_v_blocks_center_text_background" DEFAULT 'bg',
  	"anchor" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "__gsec_v_stky_v_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum___gsec_v_stky_v_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum___gsec_v_stky_v_chapters_note_size" DEFAULT 'regular',
  	"_uuid" varchar
  );
  
  CREATE TABLE "__gsec_v_stky_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_results_items_symptoms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_results_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"place" varchar,
  	"rating" numeric DEFAULT 5,
  	"source_logo_id" integer,
  	"before_id" integer,
  	"after_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_results" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"note" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__gsec_v_blocks_results_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"align" "enum__gsec_v_blocks_results_align" DEFAULT 'start',
  	"symptoms_label" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_state_sites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"state_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_state_docs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"state_id" integer,
  	"card_button_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__gsec_v_blocks_state_docs_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_loc_accord_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_loc_accord" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"all_link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_clinic_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"accredit_heading" jsonb,
  	"accredit_text" jsonb,
  	"accredit_image_id" integer,
  	"doctor_button" varchar,
  	"hours_heading" varchar,
  	"near_heading" varchar,
  	"text" jsonb,
  	"directions_heading" varchar,
  	"directions" jsonb,
  	"clinic_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_quiz_demo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__gsec_v_blocks_quiz_demo_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_trending" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_blog_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tags_title" varchar,
  	"all_text" varchar,
  	"heading" varchar,
  	"more_text" varchar,
  	"page_size" numeric DEFAULT 8,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  ALTER TABLE "gsec_rels" ADD COLUMN "states_id" integer;
  ALTER TABLE "gsec_rels" ADD COLUMN "clinics_id" integer;
  ALTER TABLE "gsec_rels" ADD COLUMN "doctors_id" integer;
  ALTER TABLE "gsec_rels" ADD COLUMN "treatments_id" integer;
  ALTER TABLE "gsec_rels" ADD COLUMN "conditions_id" integer;
  ALTER TABLE "gsec_rels" ADD COLUMN "testimonials_id" integer;
  ALTER TABLE "gsec_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "_gsec_v_rels" ADD COLUMN "states_id" integer;
  ALTER TABLE "_gsec_v_rels" ADD COLUMN "clinics_id" integer;
  ALTER TABLE "_gsec_v_rels" ADD COLUMN "doctors_id" integer;
  ALTER TABLE "_gsec_v_rels" ADD COLUMN "treatments_id" integer;
  ALTER TABLE "_gsec_v_rels" ADD COLUMN "conditions_id" integer;
  ALTER TABLE "_gsec_v_rels" ADD COLUMN "testimonials_id" integer;
  ALTER TABLE "_gsec_v_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "gsec_blocks_logo_strip_logos" ADD CONSTRAINT "gsec_blocks_logo_strip_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_logo_strip_logos" ADD CONSTRAINT "gsec_blocks_logo_strip_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_logo_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_logo_strip" ADD CONSTRAINT "gsec_blocks_logo_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_icon_list_items" ADD CONSTRAINT "gsec_blocks_icon_list_items_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_icon_list_items" ADD CONSTRAINT "gsec_blocks_icon_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_icon_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_icon_list" ADD CONSTRAINT "gsec_blocks_icon_list_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_icon_list" ADD CONSTRAINT "gsec_blocks_icon_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_media_text" ADD CONSTRAINT "gsec_blocks_media_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_media_text" ADD CONSTRAINT "gsec_blocks_media_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_insurance_logos" ADD CONSTRAINT "gsec_blocks_insurance_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_insurance_logos" ADD CONSTRAINT "gsec_blocks_insurance_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_insurance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_insurance" ADD CONSTRAINT "gsec_blocks_insurance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_doc_slider" ADD CONSTRAINT "gsec_blocks_doc_slider_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_doc_slider" ADD CONSTRAINT "gsec_blocks_doc_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_rev_slider" ADD CONSTRAINT "gsec_blocks_rev_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_cond_grid" ADD CONSTRAINT "gsec_blocks_cond_grid_video_cover_id_media_id_fk" FOREIGN KEY ("video_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_cond_grid" ADD CONSTRAINT "gsec_blocks_cond_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_before_after_pairs" ADD CONSTRAINT "gsec_blocks_before_after_pairs_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_before_after_pairs" ADD CONSTRAINT "gsec_blocks_before_after_pairs_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_before_after_pairs" ADD CONSTRAINT "gsec_blocks_before_after_pairs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_before_after"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_before_after" ADD CONSTRAINT "gsec_blocks_before_after_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_treat_cards" ADD CONSTRAINT "gsec_blocks_treat_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_post_slider" ADD CONSTRAINT "gsec_blocks_post_slider_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_post_slider" ADD CONSTRAINT "gsec_blocks_post_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_site_cta" ADD CONSTRAINT "gsec_blocks_site_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_center_text_faqs" ADD CONSTRAINT "gsec_blocks_center_text_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_center_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_center_text" ADD CONSTRAINT "gsec_blocks_center_text_quote_by_id_doctors_id_fk" FOREIGN KEY ("quote_by_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_center_text" ADD CONSTRAINT "gsec_blocks_center_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_stky_chapters" ADD CONSTRAINT "gsec_stky_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_stky_chapters" ADD CONSTRAINT "gsec_stky_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_stky"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_stky" ADD CONSTRAINT "gsec_stky_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_results_items_symptoms" ADD CONSTRAINT "gsec_blocks_results_items_symptoms_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_results_items_symptoms" ADD CONSTRAINT "gsec_blocks_results_items_symptoms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_results_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_results_items" ADD CONSTRAINT "gsec_blocks_results_items_source_logo_id_media_id_fk" FOREIGN KEY ("source_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_results_items" ADD CONSTRAINT "gsec_blocks_results_items_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_results_items" ADD CONSTRAINT "gsec_blocks_results_items_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_results_items" ADD CONSTRAINT "gsec_blocks_results_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_results" ADD CONSTRAINT "gsec_blocks_results_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_state_sites" ADD CONSTRAINT "gsec_blocks_state_sites_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_state_sites" ADD CONSTRAINT "gsec_blocks_state_sites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_state_docs" ADD CONSTRAINT "gsec_blocks_state_docs_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_state_docs" ADD CONSTRAINT "gsec_blocks_state_docs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_loc_accord_areas" ADD CONSTRAINT "gsec_blocks_loc_accord_areas_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_loc_accord_areas" ADD CONSTRAINT "gsec_blocks_loc_accord_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_loc_accord"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_loc_accord" ADD CONSTRAINT "gsec_blocks_loc_accord_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_clinic_info" ADD CONSTRAINT "gsec_blocks_clinic_info_accredit_image_id_media_id_fk" FOREIGN KEY ("accredit_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_clinic_info" ADD CONSTRAINT "gsec_blocks_clinic_info_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_clinic_info" ADD CONSTRAINT "gsec_blocks_clinic_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_quiz_demo" ADD CONSTRAINT "gsec_blocks_quiz_demo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_trending" ADD CONSTRAINT "gsec_blocks_trending_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_blog_list" ADD CONSTRAINT "gsec_blocks_blog_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_texts" ADD CONSTRAINT "gsec_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_logo_strip_logos" ADD CONSTRAINT "_gsec_v_blocks_logo_strip_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_logo_strip_logos" ADD CONSTRAINT "_gsec_v_blocks_logo_strip_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_logo_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_logo_strip" ADD CONSTRAINT "_gsec_v_blocks_logo_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_icon_list_items" ADD CONSTRAINT "_gsec_v_blocks_icon_list_items_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_icon_list_items" ADD CONSTRAINT "_gsec_v_blocks_icon_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_icon_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_icon_list" ADD CONSTRAINT "_gsec_v_blocks_icon_list_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_icon_list" ADD CONSTRAINT "_gsec_v_blocks_icon_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_media_text" ADD CONSTRAINT "_gsec_v_blocks_media_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_media_text" ADD CONSTRAINT "_gsec_v_blocks_media_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_insurance_logos" ADD CONSTRAINT "_gsec_v_blocks_insurance_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_insurance_logos" ADD CONSTRAINT "_gsec_v_blocks_insurance_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_insurance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_insurance" ADD CONSTRAINT "_gsec_v_blocks_insurance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_doc_slider" ADD CONSTRAINT "_gsec_v_blocks_doc_slider_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_doc_slider" ADD CONSTRAINT "_gsec_v_blocks_doc_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_rev_slider" ADD CONSTRAINT "_gsec_v_blocks_rev_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_cond_grid" ADD CONSTRAINT "_gsec_v_blocks_cond_grid_video_cover_id_media_id_fk" FOREIGN KEY ("video_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_cond_grid" ADD CONSTRAINT "_gsec_v_blocks_cond_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_before_after_pairs" ADD CONSTRAINT "_gsec_v_blocks_before_after_pairs_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_before_after_pairs" ADD CONSTRAINT "_gsec_v_blocks_before_after_pairs_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_before_after_pairs" ADD CONSTRAINT "_gsec_v_blocks_before_after_pairs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_before_after"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_before_after" ADD CONSTRAINT "_gsec_v_blocks_before_after_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_treat_cards" ADD CONSTRAINT "_gsec_v_blocks_treat_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_post_slider" ADD CONSTRAINT "_gsec_v_blocks_post_slider_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_post_slider" ADD CONSTRAINT "_gsec_v_blocks_post_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_site_cta" ADD CONSTRAINT "_gsec_v_blocks_site_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_center_text_faqs" ADD CONSTRAINT "_gsec_v_blocks_center_text_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_center_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_center_text" ADD CONSTRAINT "_gsec_v_blocks_center_text_quote_by_id_doctors_id_fk" FOREIGN KEY ("quote_by_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_center_text" ADD CONSTRAINT "_gsec_v_blocks_center_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "__gsec_v_stky_v_chapters" ADD CONSTRAINT "__gsec_v_stky_v_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "__gsec_v_stky_v_chapters" ADD CONSTRAINT "__gsec_v_stky_v_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."__gsec_v_stky_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "__gsec_v_stky_v" ADD CONSTRAINT "__gsec_v_stky_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_results_items_symptoms" ADD CONSTRAINT "_gsec_v_blocks_results_items_symptoms_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_results_items_symptoms" ADD CONSTRAINT "_gsec_v_blocks_results_items_symptoms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_results_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_results_items" ADD CONSTRAINT "_gsec_v_blocks_results_items_source_logo_id_media_id_fk" FOREIGN KEY ("source_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_results_items" ADD CONSTRAINT "_gsec_v_blocks_results_items_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_results_items" ADD CONSTRAINT "_gsec_v_blocks_results_items_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_results_items" ADD CONSTRAINT "_gsec_v_blocks_results_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_results" ADD CONSTRAINT "_gsec_v_blocks_results_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_state_sites" ADD CONSTRAINT "_gsec_v_blocks_state_sites_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_state_sites" ADD CONSTRAINT "_gsec_v_blocks_state_sites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_state_docs" ADD CONSTRAINT "_gsec_v_blocks_state_docs_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_state_docs" ADD CONSTRAINT "_gsec_v_blocks_state_docs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_loc_accord_areas" ADD CONSTRAINT "_gsec_v_blocks_loc_accord_areas_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_loc_accord_areas" ADD CONSTRAINT "_gsec_v_blocks_loc_accord_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_loc_accord"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_loc_accord" ADD CONSTRAINT "_gsec_v_blocks_loc_accord_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_clinic_info" ADD CONSTRAINT "_gsec_v_blocks_clinic_info_accredit_image_id_media_id_fk" FOREIGN KEY ("accredit_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_clinic_info" ADD CONSTRAINT "_gsec_v_blocks_clinic_info_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_clinic_info" ADD CONSTRAINT "_gsec_v_blocks_clinic_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_quiz_demo" ADD CONSTRAINT "_gsec_v_blocks_quiz_demo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_trending" ADD CONSTRAINT "_gsec_v_blocks_trending_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_blog_list" ADD CONSTRAINT "_gsec_v_blocks_blog_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_texts" ADD CONSTRAINT "_gsec_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "gsec_blocks_logo_strip_logos_order_idx" ON "gsec_blocks_logo_strip_logos" USING btree ("_order");
  CREATE INDEX "gsec_blocks_logo_strip_logos_parent_id_idx" ON "gsec_blocks_logo_strip_logos" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_logo_strip_logos_locale_idx" ON "gsec_blocks_logo_strip_logos" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_logo_strip_logos_image_idx" ON "gsec_blocks_logo_strip_logos" USING btree ("image_id");
  CREATE INDEX "gsec_blocks_logo_strip_order_idx" ON "gsec_blocks_logo_strip" USING btree ("_order");
  CREATE INDEX "gsec_blocks_logo_strip_parent_id_idx" ON "gsec_blocks_logo_strip" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_logo_strip_path_idx" ON "gsec_blocks_logo_strip" USING btree ("_path");
  CREATE INDEX "gsec_blocks_logo_strip_locale_idx" ON "gsec_blocks_logo_strip" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_icon_list_items_order_idx" ON "gsec_blocks_icon_list_items" USING btree ("_order");
  CREATE INDEX "gsec_blocks_icon_list_items_parent_id_idx" ON "gsec_blocks_icon_list_items" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_icon_list_items_locale_idx" ON "gsec_blocks_icon_list_items" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_icon_list_items_icon_idx" ON "gsec_blocks_icon_list_items" USING btree ("icon_id");
  CREATE INDEX "gsec_blocks_icon_list_order_idx" ON "gsec_blocks_icon_list" USING btree ("_order");
  CREATE INDEX "gsec_blocks_icon_list_parent_id_idx" ON "gsec_blocks_icon_list" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_icon_list_path_idx" ON "gsec_blocks_icon_list" USING btree ("_path");
  CREATE INDEX "gsec_blocks_icon_list_locale_idx" ON "gsec_blocks_icon_list" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_icon_list_image_idx" ON "gsec_blocks_icon_list" USING btree ("image_id");
  CREATE INDEX "gsec_blocks_media_text_order_idx" ON "gsec_blocks_media_text" USING btree ("_order");
  CREATE INDEX "gsec_blocks_media_text_parent_id_idx" ON "gsec_blocks_media_text" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_media_text_path_idx" ON "gsec_blocks_media_text" USING btree ("_path");
  CREATE INDEX "gsec_blocks_media_text_locale_idx" ON "gsec_blocks_media_text" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_media_text_image_idx" ON "gsec_blocks_media_text" USING btree ("image_id");
  CREATE INDEX "gsec_blocks_insurance_logos_order_idx" ON "gsec_blocks_insurance_logos" USING btree ("_order");
  CREATE INDEX "gsec_blocks_insurance_logos_parent_id_idx" ON "gsec_blocks_insurance_logos" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_insurance_logos_locale_idx" ON "gsec_blocks_insurance_logos" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_insurance_logos_image_idx" ON "gsec_blocks_insurance_logos" USING btree ("image_id");
  CREATE INDEX "gsec_blocks_insurance_order_idx" ON "gsec_blocks_insurance" USING btree ("_order");
  CREATE INDEX "gsec_blocks_insurance_parent_id_idx" ON "gsec_blocks_insurance" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_insurance_path_idx" ON "gsec_blocks_insurance" USING btree ("_path");
  CREATE INDEX "gsec_blocks_insurance_locale_idx" ON "gsec_blocks_insurance" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_doc_slider_order_idx" ON "gsec_blocks_doc_slider" USING btree ("_order");
  CREATE INDEX "gsec_blocks_doc_slider_parent_id_idx" ON "gsec_blocks_doc_slider" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_doc_slider_path_idx" ON "gsec_blocks_doc_slider" USING btree ("_path");
  CREATE INDEX "gsec_blocks_doc_slider_locale_idx" ON "gsec_blocks_doc_slider" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_doc_slider_image_idx" ON "gsec_blocks_doc_slider" USING btree ("image_id");
  CREATE INDEX "gsec_blocks_rev_slider_order_idx" ON "gsec_blocks_rev_slider" USING btree ("_order");
  CREATE INDEX "gsec_blocks_rev_slider_parent_id_idx" ON "gsec_blocks_rev_slider" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_rev_slider_path_idx" ON "gsec_blocks_rev_slider" USING btree ("_path");
  CREATE INDEX "gsec_blocks_rev_slider_locale_idx" ON "gsec_blocks_rev_slider" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_cond_grid_order_idx" ON "gsec_blocks_cond_grid" USING btree ("_order");
  CREATE INDEX "gsec_blocks_cond_grid_parent_id_idx" ON "gsec_blocks_cond_grid" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_cond_grid_path_idx" ON "gsec_blocks_cond_grid" USING btree ("_path");
  CREATE INDEX "gsec_blocks_cond_grid_locale_idx" ON "gsec_blocks_cond_grid" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_cond_grid_video_cover_idx" ON "gsec_blocks_cond_grid" USING btree ("video_cover_id");
  CREATE INDEX "gsec_blocks_before_after_pairs_order_idx" ON "gsec_blocks_before_after_pairs" USING btree ("_order");
  CREATE INDEX "gsec_blocks_before_after_pairs_parent_id_idx" ON "gsec_blocks_before_after_pairs" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_before_after_pairs_locale_idx" ON "gsec_blocks_before_after_pairs" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_before_after_pairs_before_idx" ON "gsec_blocks_before_after_pairs" USING btree ("before_id");
  CREATE INDEX "gsec_blocks_before_after_pairs_after_idx" ON "gsec_blocks_before_after_pairs" USING btree ("after_id");
  CREATE INDEX "gsec_blocks_before_after_order_idx" ON "gsec_blocks_before_after" USING btree ("_order");
  CREATE INDEX "gsec_blocks_before_after_parent_id_idx" ON "gsec_blocks_before_after" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_before_after_path_idx" ON "gsec_blocks_before_after" USING btree ("_path");
  CREATE INDEX "gsec_blocks_before_after_locale_idx" ON "gsec_blocks_before_after" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_treat_cards_order_idx" ON "gsec_blocks_treat_cards" USING btree ("_order");
  CREATE INDEX "gsec_blocks_treat_cards_parent_id_idx" ON "gsec_blocks_treat_cards" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_treat_cards_path_idx" ON "gsec_blocks_treat_cards" USING btree ("_path");
  CREATE INDEX "gsec_blocks_treat_cards_locale_idx" ON "gsec_blocks_treat_cards" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_post_slider_order_idx" ON "gsec_blocks_post_slider" USING btree ("_order");
  CREATE INDEX "gsec_blocks_post_slider_parent_id_idx" ON "gsec_blocks_post_slider" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_post_slider_path_idx" ON "gsec_blocks_post_slider" USING btree ("_path");
  CREATE INDEX "gsec_blocks_post_slider_locale_idx" ON "gsec_blocks_post_slider" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_post_slider_logo_idx" ON "gsec_blocks_post_slider" USING btree ("logo_id");
  CREATE INDEX "gsec_blocks_site_cta_order_idx" ON "gsec_blocks_site_cta" USING btree ("_order");
  CREATE INDEX "gsec_blocks_site_cta_parent_id_idx" ON "gsec_blocks_site_cta" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_site_cta_path_idx" ON "gsec_blocks_site_cta" USING btree ("_path");
  CREATE INDEX "gsec_blocks_site_cta_locale_idx" ON "gsec_blocks_site_cta" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_center_text_faqs_order_idx" ON "gsec_blocks_center_text_faqs" USING btree ("_order");
  CREATE INDEX "gsec_blocks_center_text_faqs_parent_id_idx" ON "gsec_blocks_center_text_faqs" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_center_text_faqs_locale_idx" ON "gsec_blocks_center_text_faqs" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_center_text_order_idx" ON "gsec_blocks_center_text" USING btree ("_order");
  CREATE INDEX "gsec_blocks_center_text_parent_id_idx" ON "gsec_blocks_center_text" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_center_text_path_idx" ON "gsec_blocks_center_text" USING btree ("_path");
  CREATE INDEX "gsec_blocks_center_text_locale_idx" ON "gsec_blocks_center_text" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_center_text_quote_by_idx" ON "gsec_blocks_center_text" USING btree ("quote_by_id");
  CREATE INDEX "gsec_stky_chapters_order_idx" ON "gsec_stky_chapters" USING btree ("_order");
  CREATE INDEX "gsec_stky_chapters_parent_id_idx" ON "gsec_stky_chapters" USING btree ("_parent_id");
  CREATE INDEX "gsec_stky_chapters_locale_idx" ON "gsec_stky_chapters" USING btree ("_locale");
  CREATE INDEX "gsec_stky_chapters_image_idx" ON "gsec_stky_chapters" USING btree ("image_id");
  CREATE INDEX "gsec_stky_order_idx" ON "gsec_stky" USING btree ("_order");
  CREATE INDEX "gsec_stky_parent_id_idx" ON "gsec_stky" USING btree ("_parent_id");
  CREATE INDEX "gsec_stky_path_idx" ON "gsec_stky" USING btree ("_path");
  CREATE INDEX "gsec_stky_locale_idx" ON "gsec_stky" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_results_items_symptoms_order_idx" ON "gsec_blocks_results_items_symptoms" USING btree ("_order");
  CREATE INDEX "gsec_blocks_results_items_symptoms_parent_id_idx" ON "gsec_blocks_results_items_symptoms" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_results_items_symptoms_locale_idx" ON "gsec_blocks_results_items_symptoms" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_results_items_symptoms_icon_idx" ON "gsec_blocks_results_items_symptoms" USING btree ("icon_id");
  CREATE INDEX "gsec_blocks_results_items_order_idx" ON "gsec_blocks_results_items" USING btree ("_order");
  CREATE INDEX "gsec_blocks_results_items_parent_id_idx" ON "gsec_blocks_results_items" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_results_items_locale_idx" ON "gsec_blocks_results_items" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_results_items_source_logo_idx" ON "gsec_blocks_results_items" USING btree ("source_logo_id");
  CREATE INDEX "gsec_blocks_results_items_before_idx" ON "gsec_blocks_results_items" USING btree ("before_id");
  CREATE INDEX "gsec_blocks_results_items_after_idx" ON "gsec_blocks_results_items" USING btree ("after_id");
  CREATE INDEX "gsec_blocks_results_order_idx" ON "gsec_blocks_results" USING btree ("_order");
  CREATE INDEX "gsec_blocks_results_parent_id_idx" ON "gsec_blocks_results" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_results_path_idx" ON "gsec_blocks_results" USING btree ("_path");
  CREATE INDEX "gsec_blocks_results_locale_idx" ON "gsec_blocks_results" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_state_sites_order_idx" ON "gsec_blocks_state_sites" USING btree ("_order");
  CREATE INDEX "gsec_blocks_state_sites_parent_id_idx" ON "gsec_blocks_state_sites" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_state_sites_path_idx" ON "gsec_blocks_state_sites" USING btree ("_path");
  CREATE INDEX "gsec_blocks_state_sites_locale_idx" ON "gsec_blocks_state_sites" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_state_sites_state_idx" ON "gsec_blocks_state_sites" USING btree ("state_id");
  CREATE INDEX "gsec_blocks_state_docs_order_idx" ON "gsec_blocks_state_docs" USING btree ("_order");
  CREATE INDEX "gsec_blocks_state_docs_parent_id_idx" ON "gsec_blocks_state_docs" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_state_docs_path_idx" ON "gsec_blocks_state_docs" USING btree ("_path");
  CREATE INDEX "gsec_blocks_state_docs_locale_idx" ON "gsec_blocks_state_docs" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_state_docs_state_idx" ON "gsec_blocks_state_docs" USING btree ("state_id");
  CREATE INDEX "gsec_blocks_loc_accord_areas_order_idx" ON "gsec_blocks_loc_accord_areas" USING btree ("_order");
  CREATE INDEX "gsec_blocks_loc_accord_areas_parent_id_idx" ON "gsec_blocks_loc_accord_areas" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_loc_accord_areas_locale_idx" ON "gsec_blocks_loc_accord_areas" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_loc_accord_areas_state_idx" ON "gsec_blocks_loc_accord_areas" USING btree ("state_id");
  CREATE INDEX "gsec_blocks_loc_accord_order_idx" ON "gsec_blocks_loc_accord" USING btree ("_order");
  CREATE INDEX "gsec_blocks_loc_accord_parent_id_idx" ON "gsec_blocks_loc_accord" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_loc_accord_path_idx" ON "gsec_blocks_loc_accord" USING btree ("_path");
  CREATE INDEX "gsec_blocks_loc_accord_locale_idx" ON "gsec_blocks_loc_accord" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_clinic_info_order_idx" ON "gsec_blocks_clinic_info" USING btree ("_order");
  CREATE INDEX "gsec_blocks_clinic_info_parent_id_idx" ON "gsec_blocks_clinic_info" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_clinic_info_path_idx" ON "gsec_blocks_clinic_info" USING btree ("_path");
  CREATE INDEX "gsec_blocks_clinic_info_locale_idx" ON "gsec_blocks_clinic_info" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_clinic_info_accredit_accredit_image_idx" ON "gsec_blocks_clinic_info" USING btree ("accredit_image_id");
  CREATE INDEX "gsec_blocks_clinic_info_clinic_idx" ON "gsec_blocks_clinic_info" USING btree ("clinic_id");
  CREATE INDEX "gsec_blocks_quiz_demo_order_idx" ON "gsec_blocks_quiz_demo" USING btree ("_order");
  CREATE INDEX "gsec_blocks_quiz_demo_parent_id_idx" ON "gsec_blocks_quiz_demo" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_quiz_demo_path_idx" ON "gsec_blocks_quiz_demo" USING btree ("_path");
  CREATE INDEX "gsec_blocks_quiz_demo_locale_idx" ON "gsec_blocks_quiz_demo" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_trending_order_idx" ON "gsec_blocks_trending" USING btree ("_order");
  CREATE INDEX "gsec_blocks_trending_parent_id_idx" ON "gsec_blocks_trending" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_trending_path_idx" ON "gsec_blocks_trending" USING btree ("_path");
  CREATE INDEX "gsec_blocks_trending_locale_idx" ON "gsec_blocks_trending" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_blog_list_order_idx" ON "gsec_blocks_blog_list" USING btree ("_order");
  CREATE INDEX "gsec_blocks_blog_list_parent_id_idx" ON "gsec_blocks_blog_list" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_blog_list_path_idx" ON "gsec_blocks_blog_list" USING btree ("_path");
  CREATE INDEX "gsec_blocks_blog_list_locale_idx" ON "gsec_blocks_blog_list" USING btree ("_locale");
  CREATE INDEX "gsec_texts_order_parent" ON "gsec_texts" USING btree ("order","parent_id");
  CREATE INDEX "gsec_texts_locale_parent" ON "gsec_texts" USING btree ("locale","parent_id");
  CREATE INDEX "_gsec_v_blocks_logo_strip_logos_order_idx" ON "_gsec_v_blocks_logo_strip_logos" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_logo_strip_logos_parent_id_idx" ON "_gsec_v_blocks_logo_strip_logos" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_logo_strip_logos_locale_idx" ON "_gsec_v_blocks_logo_strip_logos" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_logo_strip_logos_image_idx" ON "_gsec_v_blocks_logo_strip_logos" USING btree ("image_id");
  CREATE INDEX "_gsec_v_blocks_logo_strip_order_idx" ON "_gsec_v_blocks_logo_strip" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_logo_strip_parent_id_idx" ON "_gsec_v_blocks_logo_strip" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_logo_strip_path_idx" ON "_gsec_v_blocks_logo_strip" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_logo_strip_locale_idx" ON "_gsec_v_blocks_logo_strip" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_icon_list_items_order_idx" ON "_gsec_v_blocks_icon_list_items" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_icon_list_items_parent_id_idx" ON "_gsec_v_blocks_icon_list_items" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_icon_list_items_locale_idx" ON "_gsec_v_blocks_icon_list_items" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_icon_list_items_icon_idx" ON "_gsec_v_blocks_icon_list_items" USING btree ("icon_id");
  CREATE INDEX "_gsec_v_blocks_icon_list_order_idx" ON "_gsec_v_blocks_icon_list" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_icon_list_parent_id_idx" ON "_gsec_v_blocks_icon_list" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_icon_list_path_idx" ON "_gsec_v_blocks_icon_list" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_icon_list_locale_idx" ON "_gsec_v_blocks_icon_list" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_icon_list_image_idx" ON "_gsec_v_blocks_icon_list" USING btree ("image_id");
  CREATE INDEX "_gsec_v_blocks_media_text_order_idx" ON "_gsec_v_blocks_media_text" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_media_text_parent_id_idx" ON "_gsec_v_blocks_media_text" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_media_text_path_idx" ON "_gsec_v_blocks_media_text" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_media_text_locale_idx" ON "_gsec_v_blocks_media_text" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_media_text_image_idx" ON "_gsec_v_blocks_media_text" USING btree ("image_id");
  CREATE INDEX "_gsec_v_blocks_insurance_logos_order_idx" ON "_gsec_v_blocks_insurance_logos" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_insurance_logos_parent_id_idx" ON "_gsec_v_blocks_insurance_logos" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_insurance_logos_locale_idx" ON "_gsec_v_blocks_insurance_logos" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_insurance_logos_image_idx" ON "_gsec_v_blocks_insurance_logos" USING btree ("image_id");
  CREATE INDEX "_gsec_v_blocks_insurance_order_idx" ON "_gsec_v_blocks_insurance" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_insurance_parent_id_idx" ON "_gsec_v_blocks_insurance" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_insurance_path_idx" ON "_gsec_v_blocks_insurance" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_insurance_locale_idx" ON "_gsec_v_blocks_insurance" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_doc_slider_order_idx" ON "_gsec_v_blocks_doc_slider" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_doc_slider_parent_id_idx" ON "_gsec_v_blocks_doc_slider" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_doc_slider_path_idx" ON "_gsec_v_blocks_doc_slider" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_doc_slider_locale_idx" ON "_gsec_v_blocks_doc_slider" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_doc_slider_image_idx" ON "_gsec_v_blocks_doc_slider" USING btree ("image_id");
  CREATE INDEX "_gsec_v_blocks_rev_slider_order_idx" ON "_gsec_v_blocks_rev_slider" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_rev_slider_parent_id_idx" ON "_gsec_v_blocks_rev_slider" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_rev_slider_path_idx" ON "_gsec_v_blocks_rev_slider" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_rev_slider_locale_idx" ON "_gsec_v_blocks_rev_slider" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_cond_grid_order_idx" ON "_gsec_v_blocks_cond_grid" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_cond_grid_parent_id_idx" ON "_gsec_v_blocks_cond_grid" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_cond_grid_path_idx" ON "_gsec_v_blocks_cond_grid" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_cond_grid_locale_idx" ON "_gsec_v_blocks_cond_grid" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_cond_grid_video_cover_idx" ON "_gsec_v_blocks_cond_grid" USING btree ("video_cover_id");
  CREATE INDEX "_gsec_v_blocks_before_after_pairs_order_idx" ON "_gsec_v_blocks_before_after_pairs" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_before_after_pairs_parent_id_idx" ON "_gsec_v_blocks_before_after_pairs" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_before_after_pairs_locale_idx" ON "_gsec_v_blocks_before_after_pairs" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_before_after_pairs_before_idx" ON "_gsec_v_blocks_before_after_pairs" USING btree ("before_id");
  CREATE INDEX "_gsec_v_blocks_before_after_pairs_after_idx" ON "_gsec_v_blocks_before_after_pairs" USING btree ("after_id");
  CREATE INDEX "_gsec_v_blocks_before_after_order_idx" ON "_gsec_v_blocks_before_after" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_before_after_parent_id_idx" ON "_gsec_v_blocks_before_after" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_before_after_path_idx" ON "_gsec_v_blocks_before_after" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_before_after_locale_idx" ON "_gsec_v_blocks_before_after" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_treat_cards_order_idx" ON "_gsec_v_blocks_treat_cards" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_treat_cards_parent_id_idx" ON "_gsec_v_blocks_treat_cards" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_treat_cards_path_idx" ON "_gsec_v_blocks_treat_cards" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_treat_cards_locale_idx" ON "_gsec_v_blocks_treat_cards" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_post_slider_order_idx" ON "_gsec_v_blocks_post_slider" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_post_slider_parent_id_idx" ON "_gsec_v_blocks_post_slider" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_post_slider_path_idx" ON "_gsec_v_blocks_post_slider" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_post_slider_locale_idx" ON "_gsec_v_blocks_post_slider" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_post_slider_logo_idx" ON "_gsec_v_blocks_post_slider" USING btree ("logo_id");
  CREATE INDEX "_gsec_v_blocks_site_cta_order_idx" ON "_gsec_v_blocks_site_cta" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_site_cta_parent_id_idx" ON "_gsec_v_blocks_site_cta" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_site_cta_path_idx" ON "_gsec_v_blocks_site_cta" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_site_cta_locale_idx" ON "_gsec_v_blocks_site_cta" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_center_text_faqs_order_idx" ON "_gsec_v_blocks_center_text_faqs" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_center_text_faqs_parent_id_idx" ON "_gsec_v_blocks_center_text_faqs" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_center_text_faqs_locale_idx" ON "_gsec_v_blocks_center_text_faqs" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_center_text_order_idx" ON "_gsec_v_blocks_center_text" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_center_text_parent_id_idx" ON "_gsec_v_blocks_center_text" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_center_text_path_idx" ON "_gsec_v_blocks_center_text" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_center_text_locale_idx" ON "_gsec_v_blocks_center_text" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_center_text_quote_by_idx" ON "_gsec_v_blocks_center_text" USING btree ("quote_by_id");
  CREATE INDEX "__gsec_v_stky_v_chapters_order_idx" ON "__gsec_v_stky_v_chapters" USING btree ("_order");
  CREATE INDEX "__gsec_v_stky_v_chapters_parent_id_idx" ON "__gsec_v_stky_v_chapters" USING btree ("_parent_id");
  CREATE INDEX "__gsec_v_stky_v_chapters_locale_idx" ON "__gsec_v_stky_v_chapters" USING btree ("_locale");
  CREATE INDEX "__gsec_v_stky_v_chapters_image_idx" ON "__gsec_v_stky_v_chapters" USING btree ("image_id");
  CREATE INDEX "__gsec_v_stky_v_order_idx" ON "__gsec_v_stky_v" USING btree ("_order");
  CREATE INDEX "__gsec_v_stky_v_parent_id_idx" ON "__gsec_v_stky_v" USING btree ("_parent_id");
  CREATE INDEX "__gsec_v_stky_v_path_idx" ON "__gsec_v_stky_v" USING btree ("_path");
  CREATE INDEX "__gsec_v_stky_v_locale_idx" ON "__gsec_v_stky_v" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_results_items_symptoms_order_idx" ON "_gsec_v_blocks_results_items_symptoms" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_results_items_symptoms_parent_id_idx" ON "_gsec_v_blocks_results_items_symptoms" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_results_items_symptoms_locale_idx" ON "_gsec_v_blocks_results_items_symptoms" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_results_items_symptoms_icon_idx" ON "_gsec_v_blocks_results_items_symptoms" USING btree ("icon_id");
  CREATE INDEX "_gsec_v_blocks_results_items_order_idx" ON "_gsec_v_blocks_results_items" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_results_items_parent_id_idx" ON "_gsec_v_blocks_results_items" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_results_items_locale_idx" ON "_gsec_v_blocks_results_items" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_results_items_source_logo_idx" ON "_gsec_v_blocks_results_items" USING btree ("source_logo_id");
  CREATE INDEX "_gsec_v_blocks_results_items_before_idx" ON "_gsec_v_blocks_results_items" USING btree ("before_id");
  CREATE INDEX "_gsec_v_blocks_results_items_after_idx" ON "_gsec_v_blocks_results_items" USING btree ("after_id");
  CREATE INDEX "_gsec_v_blocks_results_order_idx" ON "_gsec_v_blocks_results" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_results_parent_id_idx" ON "_gsec_v_blocks_results" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_results_path_idx" ON "_gsec_v_blocks_results" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_results_locale_idx" ON "_gsec_v_blocks_results" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_state_sites_order_idx" ON "_gsec_v_blocks_state_sites" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_state_sites_parent_id_idx" ON "_gsec_v_blocks_state_sites" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_state_sites_path_idx" ON "_gsec_v_blocks_state_sites" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_state_sites_locale_idx" ON "_gsec_v_blocks_state_sites" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_state_sites_state_idx" ON "_gsec_v_blocks_state_sites" USING btree ("state_id");
  CREATE INDEX "_gsec_v_blocks_state_docs_order_idx" ON "_gsec_v_blocks_state_docs" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_state_docs_parent_id_idx" ON "_gsec_v_blocks_state_docs" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_state_docs_path_idx" ON "_gsec_v_blocks_state_docs" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_state_docs_locale_idx" ON "_gsec_v_blocks_state_docs" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_state_docs_state_idx" ON "_gsec_v_blocks_state_docs" USING btree ("state_id");
  CREATE INDEX "_gsec_v_blocks_loc_accord_areas_order_idx" ON "_gsec_v_blocks_loc_accord_areas" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_loc_accord_areas_parent_id_idx" ON "_gsec_v_blocks_loc_accord_areas" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_loc_accord_areas_locale_idx" ON "_gsec_v_blocks_loc_accord_areas" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_loc_accord_areas_state_idx" ON "_gsec_v_blocks_loc_accord_areas" USING btree ("state_id");
  CREATE INDEX "_gsec_v_blocks_loc_accord_order_idx" ON "_gsec_v_blocks_loc_accord" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_loc_accord_parent_id_idx" ON "_gsec_v_blocks_loc_accord" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_loc_accord_path_idx" ON "_gsec_v_blocks_loc_accord" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_loc_accord_locale_idx" ON "_gsec_v_blocks_loc_accord" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_clinic_info_order_idx" ON "_gsec_v_blocks_clinic_info" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_clinic_info_parent_id_idx" ON "_gsec_v_blocks_clinic_info" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_clinic_info_path_idx" ON "_gsec_v_blocks_clinic_info" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_clinic_info_locale_idx" ON "_gsec_v_blocks_clinic_info" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_clinic_info_accredit_accredit_image_idx" ON "_gsec_v_blocks_clinic_info" USING btree ("accredit_image_id");
  CREATE INDEX "_gsec_v_blocks_clinic_info_clinic_idx" ON "_gsec_v_blocks_clinic_info" USING btree ("clinic_id");
  CREATE INDEX "_gsec_v_blocks_quiz_demo_order_idx" ON "_gsec_v_blocks_quiz_demo" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_quiz_demo_parent_id_idx" ON "_gsec_v_blocks_quiz_demo" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_quiz_demo_path_idx" ON "_gsec_v_blocks_quiz_demo" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_quiz_demo_locale_idx" ON "_gsec_v_blocks_quiz_demo" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_trending_order_idx" ON "_gsec_v_blocks_trending" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_trending_parent_id_idx" ON "_gsec_v_blocks_trending" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_trending_path_idx" ON "_gsec_v_blocks_trending" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_trending_locale_idx" ON "_gsec_v_blocks_trending" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_blog_list_order_idx" ON "_gsec_v_blocks_blog_list" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_blog_list_parent_id_idx" ON "_gsec_v_blocks_blog_list" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_blog_list_path_idx" ON "_gsec_v_blocks_blog_list" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_blog_list_locale_idx" ON "_gsec_v_blocks_blog_list" USING btree ("_locale");
  CREATE INDEX "_gsec_v_texts_order_parent" ON "_gsec_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_gsec_v_texts_locale_parent" ON "_gsec_v_texts" USING btree ("locale","parent_id");
  ALTER TABLE "gsec_rels" ADD CONSTRAINT "gsec_rels_states_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_rels" ADD CONSTRAINT "gsec_rels_clinics_fk" FOREIGN KEY ("clinics_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_rels" ADD CONSTRAINT "gsec_rels_doctors_fk" FOREIGN KEY ("doctors_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_rels" ADD CONSTRAINT "gsec_rels_treatments_fk" FOREIGN KEY ("treatments_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_rels" ADD CONSTRAINT "gsec_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_rels" ADD CONSTRAINT "gsec_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_rels" ADD CONSTRAINT "gsec_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_rels" ADD CONSTRAINT "_gsec_v_rels_states_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_rels" ADD CONSTRAINT "_gsec_v_rels_clinics_fk" FOREIGN KEY ("clinics_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_rels" ADD CONSTRAINT "_gsec_v_rels_doctors_fk" FOREIGN KEY ("doctors_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_rels" ADD CONSTRAINT "_gsec_v_rels_treatments_fk" FOREIGN KEY ("treatments_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_rels" ADD CONSTRAINT "_gsec_v_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_rels" ADD CONSTRAINT "_gsec_v_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_rels" ADD CONSTRAINT "_gsec_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "gsec_rels_states_id_idx" ON "gsec_rels" USING btree ("states_id","locale");
  CREATE INDEX "gsec_rels_clinics_id_idx" ON "gsec_rels" USING btree ("clinics_id","locale");
  CREATE INDEX "gsec_rels_doctors_id_idx" ON "gsec_rels" USING btree ("doctors_id","locale");
  CREATE INDEX "gsec_rels_treatments_id_idx" ON "gsec_rels" USING btree ("treatments_id","locale");
  CREATE INDEX "gsec_rels_conditions_id_idx" ON "gsec_rels" USING btree ("conditions_id","locale");
  CREATE INDEX "gsec_rels_testimonials_id_idx" ON "gsec_rels" USING btree ("testimonials_id","locale");
  CREATE INDEX "gsec_rels_categories_id_idx" ON "gsec_rels" USING btree ("categories_id","locale");
  CREATE INDEX "_gsec_v_rels_states_id_idx" ON "_gsec_v_rels" USING btree ("states_id","locale");
  CREATE INDEX "_gsec_v_rels_clinics_id_idx" ON "_gsec_v_rels" USING btree ("clinics_id","locale");
  CREATE INDEX "_gsec_v_rels_doctors_id_idx" ON "_gsec_v_rels" USING btree ("doctors_id","locale");
  CREATE INDEX "_gsec_v_rels_treatments_id_idx" ON "_gsec_v_rels" USING btree ("treatments_id","locale");
  CREATE INDEX "_gsec_v_rels_conditions_id_idx" ON "_gsec_v_rels" USING btree ("conditions_id","locale");
  CREATE INDEX "_gsec_v_rels_testimonials_id_idx" ON "_gsec_v_rels" USING btree ("testimonials_id","locale");
  CREATE INDEX "_gsec_v_rels_categories_id_idx" ON "_gsec_v_rels" USING btree ("categories_id","locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "gsec_blocks_logo_strip_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_logo_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_icon_list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_icon_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_media_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_insurance_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_insurance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_doc_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_rev_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_cond_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_before_after_pairs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_before_after" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_treat_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_post_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_site_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_center_text_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_center_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_stky_chapters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_stky" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_results_items_symptoms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_results_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_results" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_state_sites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_state_docs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_loc_accord_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_loc_accord" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_clinic_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_quiz_demo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_trending" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_blog_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_logo_strip_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_logo_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_icon_list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_icon_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_media_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_insurance_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_insurance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_doc_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_rev_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_cond_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_before_after_pairs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_before_after" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_treat_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_post_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_site_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_center_text_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_center_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "__gsec_v_stky_v_chapters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "__gsec_v_stky_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_results_items_symptoms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_results_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_results" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_state_sites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_state_docs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_loc_accord_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_loc_accord" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_clinic_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_quiz_demo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_trending" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_blog_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_texts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "gsec_blocks_logo_strip_logos" CASCADE;
  DROP TABLE "gsec_blocks_logo_strip" CASCADE;
  DROP TABLE "gsec_blocks_icon_list_items" CASCADE;
  DROP TABLE "gsec_blocks_icon_list" CASCADE;
  DROP TABLE "gsec_blocks_media_text" CASCADE;
  DROP TABLE "gsec_blocks_insurance_logos" CASCADE;
  DROP TABLE "gsec_blocks_insurance" CASCADE;
  DROP TABLE "gsec_blocks_doc_slider" CASCADE;
  DROP TABLE "gsec_blocks_rev_slider" CASCADE;
  DROP TABLE "gsec_blocks_cond_grid" CASCADE;
  DROP TABLE "gsec_blocks_before_after_pairs" CASCADE;
  DROP TABLE "gsec_blocks_before_after" CASCADE;
  DROP TABLE "gsec_blocks_treat_cards" CASCADE;
  DROP TABLE "gsec_blocks_post_slider" CASCADE;
  DROP TABLE "gsec_blocks_site_cta" CASCADE;
  DROP TABLE "gsec_blocks_center_text_faqs" CASCADE;
  DROP TABLE "gsec_blocks_center_text" CASCADE;
  DROP TABLE "gsec_stky_chapters" CASCADE;
  DROP TABLE "gsec_stky" CASCADE;
  DROP TABLE "gsec_blocks_results_items_symptoms" CASCADE;
  DROP TABLE "gsec_blocks_results_items" CASCADE;
  DROP TABLE "gsec_blocks_results" CASCADE;
  DROP TABLE "gsec_blocks_state_sites" CASCADE;
  DROP TABLE "gsec_blocks_state_docs" CASCADE;
  DROP TABLE "gsec_blocks_loc_accord_areas" CASCADE;
  DROP TABLE "gsec_blocks_loc_accord" CASCADE;
  DROP TABLE "gsec_blocks_clinic_info" CASCADE;
  DROP TABLE "gsec_blocks_quiz_demo" CASCADE;
  DROP TABLE "gsec_blocks_trending" CASCADE;
  DROP TABLE "gsec_blocks_blog_list" CASCADE;
  DROP TABLE "gsec_texts" CASCADE;
  DROP TABLE "_gsec_v_blocks_logo_strip_logos" CASCADE;
  DROP TABLE "_gsec_v_blocks_logo_strip" CASCADE;
  DROP TABLE "_gsec_v_blocks_icon_list_items" CASCADE;
  DROP TABLE "_gsec_v_blocks_icon_list" CASCADE;
  DROP TABLE "_gsec_v_blocks_media_text" CASCADE;
  DROP TABLE "_gsec_v_blocks_insurance_logos" CASCADE;
  DROP TABLE "_gsec_v_blocks_insurance" CASCADE;
  DROP TABLE "_gsec_v_blocks_doc_slider" CASCADE;
  DROP TABLE "_gsec_v_blocks_rev_slider" CASCADE;
  DROP TABLE "_gsec_v_blocks_cond_grid" CASCADE;
  DROP TABLE "_gsec_v_blocks_before_after_pairs" CASCADE;
  DROP TABLE "_gsec_v_blocks_before_after" CASCADE;
  DROP TABLE "_gsec_v_blocks_treat_cards" CASCADE;
  DROP TABLE "_gsec_v_blocks_post_slider" CASCADE;
  DROP TABLE "_gsec_v_blocks_site_cta" CASCADE;
  DROP TABLE "_gsec_v_blocks_center_text_faqs" CASCADE;
  DROP TABLE "_gsec_v_blocks_center_text" CASCADE;
  DROP TABLE "__gsec_v_stky_v_chapters" CASCADE;
  DROP TABLE "__gsec_v_stky_v" CASCADE;
  DROP TABLE "_gsec_v_blocks_results_items_symptoms" CASCADE;
  DROP TABLE "_gsec_v_blocks_results_items" CASCADE;
  DROP TABLE "_gsec_v_blocks_results" CASCADE;
  DROP TABLE "_gsec_v_blocks_state_sites" CASCADE;
  DROP TABLE "_gsec_v_blocks_state_docs" CASCADE;
  DROP TABLE "_gsec_v_blocks_loc_accord_areas" CASCADE;
  DROP TABLE "_gsec_v_blocks_loc_accord" CASCADE;
  DROP TABLE "_gsec_v_blocks_clinic_info" CASCADE;
  DROP TABLE "_gsec_v_blocks_quiz_demo" CASCADE;
  DROP TABLE "_gsec_v_blocks_trending" CASCADE;
  DROP TABLE "_gsec_v_blocks_blog_list" CASCADE;
  DROP TABLE "_gsec_v_texts" CASCADE;
  ALTER TABLE "gsec_rels" DROP CONSTRAINT "gsec_rels_states_fk";
  
  ALTER TABLE "gsec_rels" DROP CONSTRAINT "gsec_rels_clinics_fk";
  
  ALTER TABLE "gsec_rels" DROP CONSTRAINT "gsec_rels_doctors_fk";
  
  ALTER TABLE "gsec_rels" DROP CONSTRAINT "gsec_rels_treatments_fk";
  
  ALTER TABLE "gsec_rels" DROP CONSTRAINT "gsec_rels_conditions_fk";
  
  ALTER TABLE "gsec_rels" DROP CONSTRAINT "gsec_rels_testimonials_fk";
  
  ALTER TABLE "gsec_rels" DROP CONSTRAINT "gsec_rels_categories_fk";
  
  ALTER TABLE "_gsec_v_rels" DROP CONSTRAINT "_gsec_v_rels_states_fk";
  
  ALTER TABLE "_gsec_v_rels" DROP CONSTRAINT "_gsec_v_rels_clinics_fk";
  
  ALTER TABLE "_gsec_v_rels" DROP CONSTRAINT "_gsec_v_rels_doctors_fk";
  
  ALTER TABLE "_gsec_v_rels" DROP CONSTRAINT "_gsec_v_rels_treatments_fk";
  
  ALTER TABLE "_gsec_v_rels" DROP CONSTRAINT "_gsec_v_rels_conditions_fk";
  
  ALTER TABLE "_gsec_v_rels" DROP CONSTRAINT "_gsec_v_rels_testimonials_fk";
  
  ALTER TABLE "_gsec_v_rels" DROP CONSTRAINT "_gsec_v_rels_categories_fk";
  
  DROP INDEX "gsec_rels_states_id_idx";
  DROP INDEX "gsec_rels_clinics_id_idx";
  DROP INDEX "gsec_rels_doctors_id_idx";
  DROP INDEX "gsec_rels_treatments_id_idx";
  DROP INDEX "gsec_rels_conditions_id_idx";
  DROP INDEX "gsec_rels_testimonials_id_idx";
  DROP INDEX "gsec_rels_categories_id_idx";
  DROP INDEX "_gsec_v_rels_states_id_idx";
  DROP INDEX "_gsec_v_rels_clinics_id_idx";
  DROP INDEX "_gsec_v_rels_doctors_id_idx";
  DROP INDEX "_gsec_v_rels_treatments_id_idx";
  DROP INDEX "_gsec_v_rels_conditions_id_idx";
  DROP INDEX "_gsec_v_rels_testimonials_id_idx";
  DROP INDEX "_gsec_v_rels_categories_id_idx";
  ALTER TABLE "gsec_rels" DROP COLUMN "states_id";
  ALTER TABLE "gsec_rels" DROP COLUMN "clinics_id";
  ALTER TABLE "gsec_rels" DROP COLUMN "doctors_id";
  ALTER TABLE "gsec_rels" DROP COLUMN "treatments_id";
  ALTER TABLE "gsec_rels" DROP COLUMN "conditions_id";
  ALTER TABLE "gsec_rels" DROP COLUMN "testimonials_id";
  ALTER TABLE "gsec_rels" DROP COLUMN "categories_id";
  ALTER TABLE "_gsec_v_rels" DROP COLUMN "states_id";
  ALTER TABLE "_gsec_v_rels" DROP COLUMN "clinics_id";
  ALTER TABLE "_gsec_v_rels" DROP COLUMN "doctors_id";
  ALTER TABLE "_gsec_v_rels" DROP COLUMN "treatments_id";
  ALTER TABLE "_gsec_v_rels" DROP COLUMN "conditions_id";
  ALTER TABLE "_gsec_v_rels" DROP COLUMN "testimonials_id";
  ALTER TABLE "_gsec_v_rels" DROP COLUMN "categories_id";
  DROP TYPE "public"."enum_gsec_blocks_logo_strip_background";
  DROP TYPE "public"."enum_gsec_blocks_logo_strip_arrangement";
  DROP TYPE "public"."enum_gsec_blocks_icon_list_layout";
  DROP TYPE "public"."enum_gsec_blocks_icon_list_button_link_kind";
  DROP TYPE "public"."enum_gsec_blocks_media_text_button_link_kind";
  DROP TYPE "public"."enum_gsec_blocks_media_text_image_style";
  DROP TYPE "public"."enum_gsec_blocks_media_text_side";
  DROP TYPE "public"."enum_gsec_blocks_media_text_size";
  DROP TYPE "public"."enum_gsec_blocks_media_text_background";
  DROP TYPE "public"."enum_gsec_blocks_insurance_button_link_kind";
  DROP TYPE "public"."enum_gsec_blocks_doc_slider_button_link_kind";
  DROP TYPE "public"."enum_gsec_blocks_doc_slider_bottom_button_link_kind";
  DROP TYPE "public"."enum_gsec_blocks_rev_slider_heading_level";
  DROP TYPE "public"."enum_gsec_blocks_rev_slider_button_link_kind";
  DROP TYPE "public"."enum_gsec_blocks_cond_grid_list_heading_level";
  DROP TYPE "public"."enum_gsec_blocks_cond_grid_title_level";
  DROP TYPE "public"."enum_gsec_blocks_cond_grid_button_link_kind";
  DROP TYPE "public"."enum_gsec_blocks_cond_grid_video_position";
  DROP TYPE "public"."enum_gsec_blocks_cond_grid_background";
  DROP TYPE "public"."enum_gsec_blocks_before_after_button_link_kind";
  DROP TYPE "public"."enum_gsec_blocks_treat_cards_heading_align";
  DROP TYPE "public"."enum_gsec_blocks_treat_cards_button_link_kind";
  DROP TYPE "public"."enum_gsec_blocks_post_slider_button_link_kind";
  DROP TYPE "public"."enum_gsec_blocks_site_cta_button_link_kind";
  DROP TYPE "public"."enum_gsec_blocks_center_text_kind";
  DROP TYPE "public"."enum_gsec_blocks_center_text_button_link_kind";
  DROP TYPE "public"."enum_gsec_blocks_center_text_button_style";
  DROP TYPE "public"."enum_gsec_blocks_center_text_heading_level";
  DROP TYPE "public"."enum_gsec_blocks_center_text_background";
  DROP TYPE "public"."enum_gsec_stky_chapters_button_link_kind";
  DROP TYPE "public"."enum_gsec_stky_chapters_note_size";
  DROP TYPE "public"."enum_gsec_blocks_results_button_link_kind";
  DROP TYPE "public"."enum_gsec_blocks_results_align";
  DROP TYPE "public"."enum_gsec_blocks_state_docs_button_link_kind";
  DROP TYPE "public"."enum_gsec_blocks_quiz_demo_button_link_kind";
  DROP TYPE "public"."enum__gsec_v_blocks_logo_strip_background";
  DROP TYPE "public"."enum__gsec_v_blocks_logo_strip_arrangement";
  DROP TYPE "public"."enum__gsec_v_blocks_icon_list_layout";
  DROP TYPE "public"."enum__gsec_v_blocks_icon_list_button_link_kind";
  DROP TYPE "public"."enum__gsec_v_blocks_media_text_button_link_kind";
  DROP TYPE "public"."enum__gsec_v_blocks_media_text_image_style";
  DROP TYPE "public"."enum__gsec_v_blocks_media_text_side";
  DROP TYPE "public"."enum__gsec_v_blocks_media_text_size";
  DROP TYPE "public"."enum__gsec_v_blocks_media_text_background";
  DROP TYPE "public"."enum__gsec_v_blocks_insurance_button_link_kind";
  DROP TYPE "public"."enum__gsec_v_blocks_doc_slider_button_link_kind";
  DROP TYPE "public"."enum__gsec_v_blocks_doc_slider_bottom_button_link_kind";
  DROP TYPE "public"."enum__gsec_v_blocks_rev_slider_heading_level";
  DROP TYPE "public"."enum__gsec_v_blocks_rev_slider_button_link_kind";
  DROP TYPE "public"."enum__gsec_v_blocks_cond_grid_list_heading_level";
  DROP TYPE "public"."enum__gsec_v_blocks_cond_grid_title_level";
  DROP TYPE "public"."enum__gsec_v_blocks_cond_grid_button_link_kind";
  DROP TYPE "public"."enum__gsec_v_blocks_cond_grid_video_position";
  DROP TYPE "public"."enum__gsec_v_blocks_cond_grid_background";
  DROP TYPE "public"."enum__gsec_v_blocks_before_after_button_link_kind";
  DROP TYPE "public"."enum__gsec_v_blocks_treat_cards_heading_align";
  DROP TYPE "public"."enum__gsec_v_blocks_treat_cards_button_link_kind";
  DROP TYPE "public"."enum__gsec_v_blocks_post_slider_button_link_kind";
  DROP TYPE "public"."enum__gsec_v_blocks_site_cta_button_link_kind";
  DROP TYPE "public"."enum__gsec_v_blocks_center_text_kind";
  DROP TYPE "public"."enum__gsec_v_blocks_center_text_button_link_kind";
  DROP TYPE "public"."enum__gsec_v_blocks_center_text_button_style";
  DROP TYPE "public"."enum__gsec_v_blocks_center_text_heading_level";
  DROP TYPE "public"."enum__gsec_v_blocks_center_text_background";
  DROP TYPE "public"."enum___gsec_v_stky_v_chapters_button_link_kind";
  DROP TYPE "public"."enum___gsec_v_stky_v_chapters_note_size";
  DROP TYPE "public"."enum__gsec_v_blocks_results_button_link_kind";
  DROP TYPE "public"."enum__gsec_v_blocks_results_align";
  DROP TYPE "public"."enum__gsec_v_blocks_state_docs_button_link_kind";
  DROP TYPE "public"."enum__gsec_v_blocks_quiz_demo_button_link_kind";`)
}
