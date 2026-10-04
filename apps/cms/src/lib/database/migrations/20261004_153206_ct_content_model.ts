import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_posts_list_source" AS ENUM('latest', 'category', 'author');
  CREATE TYPE "public"."enum_page_blocks_posts_list_layout" AS ENUM('grid', 'list', 'featured');
  CREATE TYPE "public"."enum_page_blocks_posts_list_view_all_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_posts_list_view_all_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_posts_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_posts_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_posts_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_posts_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_case_studies_items_sector" AS ENUM('automotive', 'agritech', 'finance', 'medical', 'other');
  CREATE TYPE "public"."enum_page_blocks_case_studies_filter_sector" AS ENUM('all', 'automotive', 'agritech', 'finance', 'medical', 'other');
  CREATE TYPE "public"."enum_page_blocks_case_studies_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_case_studies_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_case_studies_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_case_studies_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_form_fields_type" AS ENUM('text', 'email', 'tel', 'textarea', 'select', 'checkbox');
  CREATE TYPE "public"."enum_page_blocks_form_fields_width" AS ENUM('full', 'half');
  CREATE TYPE "public"."enum_page_blocks_form_mode" AS ENUM('internal', 'mautic');
  CREATE TYPE "public"."enum_page_blocks_form_success_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_form_success_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_form_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_form_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_form_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_form_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_video_embed_provider" AS ENUM('youtube');
  CREATE TYPE "public"."enum_page_blocks_video_embed_aspect" AS ENUM('16/9', '4/3');
  CREATE TYPE "public"."enum_page_blocks_video_embed_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_video_embed_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_video_embed_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_video_embed_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_posts_list_source" AS ENUM('latest', 'category', 'author');
  CREATE TYPE "public"."enum__page_v_blocks_posts_list_layout" AS ENUM('grid', 'list', 'featured');
  CREATE TYPE "public"."enum__page_v_blocks_posts_list_view_all_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_posts_list_view_all_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_posts_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_posts_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_posts_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_posts_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_case_studies_items_sector" AS ENUM('automotive', 'agritech', 'finance', 'medical', 'other');
  CREATE TYPE "public"."enum__page_v_blocks_case_studies_filter_sector" AS ENUM('all', 'automotive', 'agritech', 'finance', 'medical', 'other');
  CREATE TYPE "public"."enum__page_v_blocks_case_studies_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_case_studies_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_case_studies_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_case_studies_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_form_fields_type" AS ENUM('text', 'email', 'tel', 'textarea', 'select', 'checkbox');
  CREATE TYPE "public"."enum__page_v_blocks_form_fields_width" AS ENUM('full', 'half');
  CREATE TYPE "public"."enum__page_v_blocks_form_mode" AS ENUM('internal', 'mautic');
  CREATE TYPE "public"."enum__page_v_blocks_form_success_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_form_success_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_form_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_form_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_form_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_form_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_video_embed_provider" AS ENUM('youtube');
  CREATE TYPE "public"."enum__page_v_blocks_video_embed_aspect" AS ENUM('16/9', '4/3');
  CREATE TYPE "public"."enum__page_v_blocks_video_embed_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_video_embed_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_video_embed_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_video_embed_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_posts_content_format" AS ENUM('richText', 'markdown');
  CREATE TYPE "public"."enum__posts_v_version_content_format" AS ENUM('richText', 'markdown');
  CREATE TYPE "public"."enum_gsec_blocks_posts_list_source" AS ENUM('latest', 'category', 'author');
  CREATE TYPE "public"."enum_gsec_blocks_posts_list_layout" AS ENUM('grid', 'list', 'featured');
  CREATE TYPE "public"."enum_gsec_blocks_posts_list_view_all_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_posts_list_view_all_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_posts_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_posts_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_posts_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_posts_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_case_studies_items_sector" AS ENUM('automotive', 'agritech', 'finance', 'medical', 'other');
  CREATE TYPE "public"."enum_gsec_blocks_case_studies_filter_sector" AS ENUM('all', 'automotive', 'agritech', 'finance', 'medical', 'other');
  CREATE TYPE "public"."enum_gsec_blocks_case_studies_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_case_studies_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_case_studies_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_case_studies_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_form_fields_type" AS ENUM('text', 'email', 'tel', 'textarea', 'select', 'checkbox');
  CREATE TYPE "public"."enum_gsec_blocks_form_fields_width" AS ENUM('full', 'half');
  CREATE TYPE "public"."enum_gsec_blocks_form_mode" AS ENUM('internal', 'mautic');
  CREATE TYPE "public"."enum_gsec_blocks_form_success_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_form_success_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_form_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_form_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_form_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_form_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_video_embed_provider" AS ENUM('youtube');
  CREATE TYPE "public"."enum_gsec_blocks_video_embed_aspect" AS ENUM('16/9', '4/3');
  CREATE TYPE "public"."enum_gsec_blocks_video_embed_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_video_embed_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_video_embed_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_video_embed_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_posts_list_source" AS ENUM('latest', 'category', 'author');
  CREATE TYPE "public"."enum__gsec_v_blocks_posts_list_layout" AS ENUM('grid', 'list', 'featured');
  CREATE TYPE "public"."enum__gsec_v_blocks_posts_list_view_all_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_posts_list_view_all_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_posts_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_posts_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_posts_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_posts_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_case_studies_items_sector" AS ENUM('automotive', 'agritech', 'finance', 'medical', 'other');
  CREATE TYPE "public"."enum__gsec_v_blocks_case_studies_filter_sector" AS ENUM('all', 'automotive', 'agritech', 'finance', 'medical', 'other');
  CREATE TYPE "public"."enum__gsec_v_blocks_case_studies_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_case_studies_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_case_studies_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_case_studies_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_form_fields_type" AS ENUM('text', 'email', 'tel', 'textarea', 'select', 'checkbox');
  CREATE TYPE "public"."enum__gsec_v_blocks_form_fields_width" AS ENUM('full', 'half');
  CREATE TYPE "public"."enum__gsec_v_blocks_form_mode" AS ENUM('internal', 'mautic');
  CREATE TYPE "public"."enum__gsec_v_blocks_form_success_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_form_success_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_form_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_form_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_form_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_form_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_video_embed_provider" AS ENUM('youtube');
  CREATE TYPE "public"."enum__gsec_v_blocks_video_embed_aspect" AS ENUM('16/9', '4/3');
  CREATE TYPE "public"."enum__gsec_v_blocks_video_embed_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_video_embed_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_video_embed_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_video_embed_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_posts_list_source" AS ENUM('latest', 'category', 'author');
  CREATE TYPE "public"."enum_presets_blocks_posts_list_layout" AS ENUM('grid', 'list', 'featured');
  CREATE TYPE "public"."enum_presets_blocks_posts_list_view_all_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_posts_list_view_all_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_posts_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_posts_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_posts_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_posts_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_case_studies_items_sector" AS ENUM('automotive', 'agritech', 'finance', 'medical', 'other');
  CREATE TYPE "public"."enum_presets_blocks_case_studies_filter_sector" AS ENUM('all', 'automotive', 'agritech', 'finance', 'medical', 'other');
  CREATE TYPE "public"."enum_presets_blocks_case_studies_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_case_studies_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_case_studies_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_case_studies_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_form_fields_type" AS ENUM('text', 'email', 'tel', 'textarea', 'select', 'checkbox');
  CREATE TYPE "public"."enum_presets_blocks_form_fields_width" AS ENUM('full', 'half');
  CREATE TYPE "public"."enum_presets_blocks_form_mode" AS ENUM('internal', 'mautic');
  CREATE TYPE "public"."enum_presets_blocks_form_success_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_form_success_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_form_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_form_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_form_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_form_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_video_embed_provider" AS ENUM('youtube');
  CREATE TYPE "public"."enum_presets_blocks_video_embed_aspect" AS ENUM('16/9', '4/3');
  CREATE TYPE "public"."enum_presets_blocks_video_embed_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_video_embed_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_video_embed_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_video_embed_section_padding_x" AS ENUM('none', 'base');
  CREATE TABLE "page_blocks_posts_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"source" "enum_page_blocks_posts_list_source" DEFAULT 'latest',
  	"category_id" integer,
  	"author_id" integer,
  	"limit" numeric DEFAULT 3,
  	"layout" "enum_page_blocks_posts_list_layout" DEFAULT 'grid',
  	"view_all_type" "enum_page_blocks_posts_list_view_all_type" DEFAULT 'reference',
  	"view_all_new_tab" boolean,
  	"view_all_url" varchar,
  	"view_all_custom_page" "enum_page_blocks_posts_list_view_all_custom_page",
  	"view_all_label" varchar,
  	"section_theme" "enum_page_blocks_posts_list_section_theme",
  	"section_max_width" "enum_page_blocks_posts_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_posts_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_posts_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_case_studies_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"sector" "enum_page_blocks_case_studies_items_sector",
  	"technologies" varchar,
  	"problem" varchar,
  	"solution" varchar,
  	"result" varchar
  );
  
  CREATE TABLE "page_blocks_case_studies" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"filter_sector" "enum_page_blocks_case_studies_filter_sector" DEFAULT 'all',
  	"section_theme" "enum_page_blocks_case_studies_section_theme",
  	"section_max_width" "enum_page_blocks_case_studies_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_case_studies_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_case_studies_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_form_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"label" varchar,
  	"type" "enum_page_blocks_form_fields_type" DEFAULT 'text',
  	"placeholder" varchar,
  	"options" varchar,
  	"width" "enum_page_blocks_form_fields_width" DEFAULT 'full',
  	"required" boolean
  );
  
  CREATE TABLE "page_blocks_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"mode" "enum_page_blocks_form_mode" DEFAULT 'internal',
  	"form_name" varchar,
  	"mautic_form_id" varchar,
  	"mautic_action_url" varchar DEFAULT 'https://mautic.example.com/form/submit?formId=',
  	"submit_label" varchar,
  	"success_message" varchar,
  	"consent_text" varchar,
  	"success_link_type" "enum_page_blocks_form_success_link_type" DEFAULT 'reference',
  	"success_link_new_tab" boolean,
  	"success_link_url" varchar,
  	"success_link_custom_page" "enum_page_blocks_form_success_link_custom_page",
  	"success_link_label" varchar,
  	"section_theme" "enum_page_blocks_form_section_theme",
  	"section_max_width" "enum_page_blocks_form_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_form_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_form_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_video_embed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"provider" "enum_page_blocks_video_embed_provider" DEFAULT 'youtube',
  	"video_id" varchar,
  	"title" varchar,
  	"poster_id" integer,
  	"aspect" "enum_page_blocks_video_embed_aspect" DEFAULT '16/9',
  	"section_theme" "enum_page_blocks_video_embed_section_theme",
  	"section_max_width" "enum_page_blocks_video_embed_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_video_embed_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_video_embed_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_posts_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"source" "enum__page_v_blocks_posts_list_source" DEFAULT 'latest',
  	"category_id" integer,
  	"author_id" integer,
  	"limit" numeric DEFAULT 3,
  	"layout" "enum__page_v_blocks_posts_list_layout" DEFAULT 'grid',
  	"view_all_type" "enum__page_v_blocks_posts_list_view_all_type" DEFAULT 'reference',
  	"view_all_new_tab" boolean,
  	"view_all_url" varchar,
  	"view_all_custom_page" "enum__page_v_blocks_posts_list_view_all_custom_page",
  	"view_all_label" varchar,
  	"section_theme" "enum__page_v_blocks_posts_list_section_theme",
  	"section_max_width" "enum__page_v_blocks_posts_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_posts_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_posts_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_case_studies_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"sector" "enum__page_v_blocks_case_studies_items_sector",
  	"technologies" varchar,
  	"problem" varchar,
  	"solution" varchar,
  	"result" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_case_studies" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"filter_sector" "enum__page_v_blocks_case_studies_filter_sector" DEFAULT 'all',
  	"section_theme" "enum__page_v_blocks_case_studies_section_theme",
  	"section_max_width" "enum__page_v_blocks_case_studies_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_case_studies_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_case_studies_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_form_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"label" varchar,
  	"type" "enum__page_v_blocks_form_fields_type" DEFAULT 'text',
  	"placeholder" varchar,
  	"options" varchar,
  	"width" "enum__page_v_blocks_form_fields_width" DEFAULT 'full',
  	"required" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"mode" "enum__page_v_blocks_form_mode" DEFAULT 'internal',
  	"form_name" varchar,
  	"mautic_form_id" varchar,
  	"mautic_action_url" varchar DEFAULT 'https://mautic.example.com/form/submit?formId=',
  	"submit_label" varchar,
  	"success_message" varchar,
  	"consent_text" varchar,
  	"success_link_type" "enum__page_v_blocks_form_success_link_type" DEFAULT 'reference',
  	"success_link_new_tab" boolean,
  	"success_link_url" varchar,
  	"success_link_custom_page" "enum__page_v_blocks_form_success_link_custom_page",
  	"success_link_label" varchar,
  	"section_theme" "enum__page_v_blocks_form_section_theme",
  	"section_max_width" "enum__page_v_blocks_form_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_form_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_form_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_video_embed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"provider" "enum__page_v_blocks_video_embed_provider" DEFAULT 'youtube',
  	"video_id" varchar,
  	"title" varchar,
  	"poster_id" integer,
  	"aspect" "enum__page_v_blocks_video_embed_aspect" DEFAULT '16/9',
  	"section_theme" "enum__page_v_blocks_video_embed_section_theme",
  	"section_max_width" "enum__page_v_blocks_video_embed_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_video_embed_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_video_embed_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "authors_locales" (
  	"bio" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "gsec_blocks_posts_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"source" "enum_gsec_blocks_posts_list_source" DEFAULT 'latest',
  	"category_id" integer,
  	"author_id" integer,
  	"limit" numeric DEFAULT 3,
  	"layout" "enum_gsec_blocks_posts_list_layout" DEFAULT 'grid',
  	"view_all_type" "enum_gsec_blocks_posts_list_view_all_type" DEFAULT 'reference',
  	"view_all_new_tab" boolean,
  	"view_all_url" varchar,
  	"view_all_custom_page" "enum_gsec_blocks_posts_list_view_all_custom_page",
  	"view_all_label" varchar,
  	"section_theme" "enum_gsec_blocks_posts_list_section_theme",
  	"section_max_width" "enum_gsec_blocks_posts_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_posts_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_posts_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_case_studies_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"sector" "enum_gsec_blocks_case_studies_items_sector",
  	"technologies" varchar,
  	"problem" varchar,
  	"solution" varchar,
  	"result" varchar
  );
  
  CREATE TABLE "gsec_blocks_case_studies" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"filter_sector" "enum_gsec_blocks_case_studies_filter_sector" DEFAULT 'all',
  	"section_theme" "enum_gsec_blocks_case_studies_section_theme",
  	"section_max_width" "enum_gsec_blocks_case_studies_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_case_studies_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_case_studies_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_form_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"label" varchar,
  	"type" "enum_gsec_blocks_form_fields_type" DEFAULT 'text',
  	"placeholder" varchar,
  	"options" varchar,
  	"width" "enum_gsec_blocks_form_fields_width" DEFAULT 'full',
  	"required" boolean
  );
  
  CREATE TABLE "gsec_blocks_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"mode" "enum_gsec_blocks_form_mode" DEFAULT 'internal',
  	"form_name" varchar,
  	"mautic_form_id" varchar,
  	"mautic_action_url" varchar DEFAULT 'https://mautic.example.com/form/submit?formId=',
  	"submit_label" varchar,
  	"success_message" varchar,
  	"consent_text" varchar,
  	"success_link_type" "enum_gsec_blocks_form_success_link_type" DEFAULT 'reference',
  	"success_link_new_tab" boolean,
  	"success_link_url" varchar,
  	"success_link_custom_page" "enum_gsec_blocks_form_success_link_custom_page",
  	"success_link_label" varchar,
  	"section_theme" "enum_gsec_blocks_form_section_theme",
  	"section_max_width" "enum_gsec_blocks_form_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_form_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_form_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_video_embed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"provider" "enum_gsec_blocks_video_embed_provider" DEFAULT 'youtube',
  	"video_id" varchar,
  	"title" varchar,
  	"poster_id" integer,
  	"aspect" "enum_gsec_blocks_video_embed_aspect" DEFAULT '16/9',
  	"section_theme" "enum_gsec_blocks_video_embed_section_theme",
  	"section_max_width" "enum_gsec_blocks_video_embed_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_video_embed_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_video_embed_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_posts_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"source" "enum__gsec_v_blocks_posts_list_source" DEFAULT 'latest',
  	"category_id" integer,
  	"author_id" integer,
  	"limit" numeric DEFAULT 3,
  	"layout" "enum__gsec_v_blocks_posts_list_layout" DEFAULT 'grid',
  	"view_all_type" "enum__gsec_v_blocks_posts_list_view_all_type" DEFAULT 'reference',
  	"view_all_new_tab" boolean,
  	"view_all_url" varchar,
  	"view_all_custom_page" "enum__gsec_v_blocks_posts_list_view_all_custom_page",
  	"view_all_label" varchar,
  	"section_theme" "enum__gsec_v_blocks_posts_list_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_posts_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_posts_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_posts_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_case_studies_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"sector" "enum__gsec_v_blocks_case_studies_items_sector",
  	"technologies" varchar,
  	"problem" varchar,
  	"solution" varchar,
  	"result" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_case_studies" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"filter_sector" "enum__gsec_v_blocks_case_studies_filter_sector" DEFAULT 'all',
  	"section_theme" "enum__gsec_v_blocks_case_studies_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_case_studies_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_case_studies_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_case_studies_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_form_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"label" varchar,
  	"type" "enum__gsec_v_blocks_form_fields_type" DEFAULT 'text',
  	"placeholder" varchar,
  	"options" varchar,
  	"width" "enum__gsec_v_blocks_form_fields_width" DEFAULT 'full',
  	"required" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"mode" "enum__gsec_v_blocks_form_mode" DEFAULT 'internal',
  	"form_name" varchar,
  	"mautic_form_id" varchar,
  	"mautic_action_url" varchar DEFAULT 'https://mautic.example.com/form/submit?formId=',
  	"submit_label" varchar,
  	"success_message" varchar,
  	"consent_text" varchar,
  	"success_link_type" "enum__gsec_v_blocks_form_success_link_type" DEFAULT 'reference',
  	"success_link_new_tab" boolean,
  	"success_link_url" varchar,
  	"success_link_custom_page" "enum__gsec_v_blocks_form_success_link_custom_page",
  	"success_link_label" varchar,
  	"section_theme" "enum__gsec_v_blocks_form_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_form_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_form_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_form_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_video_embed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"provider" "enum__gsec_v_blocks_video_embed_provider" DEFAULT 'youtube',
  	"video_id" varchar,
  	"title" varchar,
  	"poster_id" integer,
  	"aspect" "enum__gsec_v_blocks_video_embed_aspect" DEFAULT '16/9',
  	"section_theme" "enum__gsec_v_blocks_video_embed_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_video_embed_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_video_embed_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_video_embed_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
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
  
  CREATE TABLE "presets_blocks_posts_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source" "enum_presets_blocks_posts_list_source" DEFAULT 'latest' NOT NULL,
  	"category_id" integer,
  	"author_id" integer,
  	"limit" numeric DEFAULT 3 NOT NULL,
  	"layout" "enum_presets_blocks_posts_list_layout" DEFAULT 'grid' NOT NULL,
  	"view_all_type" "enum_presets_blocks_posts_list_view_all_type" DEFAULT 'reference',
  	"view_all_new_tab" boolean,
  	"view_all_url" varchar,
  	"view_all_custom_page" "enum_presets_blocks_posts_list_view_all_custom_page",
  	"section_theme" "enum_presets_blocks_posts_list_section_theme",
  	"section_max_width" "enum_presets_blocks_posts_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_posts_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_posts_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_posts_list_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"view_all_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_case_studies_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"sector" "enum_presets_blocks_case_studies_items_sector" NOT NULL,
  	"technologies" varchar
  );
  
  CREATE TABLE "presets_blocks_case_studies_items_locales" (
  	"title" varchar NOT NULL,
  	"problem" varchar,
  	"solution" varchar,
  	"result" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_case_studies" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"filter_sector" "enum_presets_blocks_case_studies_filter_sector" DEFAULT 'all',
  	"section_theme" "enum_presets_blocks_case_studies_section_theme",
  	"section_max_width" "enum_presets_blocks_case_studies_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_case_studies_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_case_studies_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_case_studies_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_form_fields" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"type" "enum_presets_blocks_form_fields_type" DEFAULT 'text' NOT NULL,
  	"options" varchar,
  	"width" "enum_presets_blocks_form_fields_width" DEFAULT 'full',
  	"required" boolean
  );
  
  CREATE TABLE "presets_blocks_form_fields_locales" (
  	"label" varchar NOT NULL,
  	"placeholder" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_form" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"mode" "enum_presets_blocks_form_mode" DEFAULT 'internal' NOT NULL,
  	"form_name" varchar NOT NULL,
  	"mautic_form_id" varchar,
  	"mautic_action_url" varchar DEFAULT 'https://mautic.example.com/form/submit?formId=',
  	"success_link_type" "enum_presets_blocks_form_success_link_type" DEFAULT 'reference',
  	"success_link_new_tab" boolean,
  	"success_link_url" varchar,
  	"success_link_custom_page" "enum_presets_blocks_form_success_link_custom_page",
  	"section_theme" "enum_presets_blocks_form_section_theme",
  	"section_max_width" "enum_presets_blocks_form_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_form_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_form_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_form_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"submit_label" varchar,
  	"success_message" varchar,
  	"consent_text" varchar,
  	"success_link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_video_embed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"provider" "enum_presets_blocks_video_embed_provider" DEFAULT 'youtube' NOT NULL,
  	"video_id" varchar,
  	"poster_id" integer,
  	"aspect" "enum_presets_blocks_video_embed_aspect" DEFAULT '16/9',
  	"section_theme" "enum_presets_blocks_video_embed_section_theme",
  	"section_max_width" "enum_presets_blocks_video_embed_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_video_embed_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_video_embed_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_video_embed_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"title" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'author';
  ALTER TABLE "authors" ADD COLUMN "generate_slug" boolean DEFAULT true;
  ALTER TABLE "authors" ADD COLUMN "slug" varchar;
  ALTER TABLE "posts" ADD COLUMN "content_format" "enum_posts_content_format" DEFAULT 'richText';
  ALTER TABLE "posts" ADD COLUMN "source_url" varchar;
  ALTER TABLE "posts" ADD COLUMN "legacy_path" varchar;
  ALTER TABLE "posts_locales" ADD COLUMN "markdown" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_content_format" "enum__posts_v_version_content_format" DEFAULT 'richText';
  ALTER TABLE "_posts_v" ADD COLUMN "version_source_url" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_legacy_path" varchar;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_markdown" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "form_submissions_id" integer;
  ALTER TABLE "page_blocks_posts_list" ADD CONSTRAINT "page_blocks_posts_list_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_posts_list" ADD CONSTRAINT "page_blocks_posts_list_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_posts_list" ADD CONSTRAINT "page_blocks_posts_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_posts_list" ADD CONSTRAINT "page_blocks_posts_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_case_studies_items" ADD CONSTRAINT "page_blocks_case_studies_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_case_studies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_case_studies" ADD CONSTRAINT "page_blocks_case_studies_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_case_studies" ADD CONSTRAINT "page_blocks_case_studies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_form_fields" ADD CONSTRAINT "page_blocks_form_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_form" ADD CONSTRAINT "page_blocks_form_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_form" ADD CONSTRAINT "page_blocks_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_video_embed" ADD CONSTRAINT "page_blocks_video_embed_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_video_embed" ADD CONSTRAINT "page_blocks_video_embed_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_video_embed" ADD CONSTRAINT "page_blocks_video_embed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_posts_list" ADD CONSTRAINT "_page_v_blocks_posts_list_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_posts_list" ADD CONSTRAINT "_page_v_blocks_posts_list_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_posts_list" ADD CONSTRAINT "_page_v_blocks_posts_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_posts_list" ADD CONSTRAINT "_page_v_blocks_posts_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_case_studies_items" ADD CONSTRAINT "_page_v_blocks_case_studies_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_case_studies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_case_studies" ADD CONSTRAINT "_page_v_blocks_case_studies_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_case_studies" ADD CONSTRAINT "_page_v_blocks_case_studies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_form_fields" ADD CONSTRAINT "_page_v_blocks_form_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_form" ADD CONSTRAINT "_page_v_blocks_form_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_form" ADD CONSTRAINT "_page_v_blocks_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_video_embed" ADD CONSTRAINT "_page_v_blocks_video_embed_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_video_embed" ADD CONSTRAINT "_page_v_blocks_video_embed_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_video_embed" ADD CONSTRAINT "_page_v_blocks_video_embed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "authors_locales" ADD CONSTRAINT "authors_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_posts_list" ADD CONSTRAINT "gsec_blocks_posts_list_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_posts_list" ADD CONSTRAINT "gsec_blocks_posts_list_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_posts_list" ADD CONSTRAINT "gsec_blocks_posts_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_posts_list" ADD CONSTRAINT "gsec_blocks_posts_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_case_studies_items" ADD CONSTRAINT "gsec_blocks_case_studies_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_case_studies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_case_studies" ADD CONSTRAINT "gsec_blocks_case_studies_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_case_studies" ADD CONSTRAINT "gsec_blocks_case_studies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_form_fields" ADD CONSTRAINT "gsec_blocks_form_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_form" ADD CONSTRAINT "gsec_blocks_form_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_form" ADD CONSTRAINT "gsec_blocks_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_video_embed" ADD CONSTRAINT "gsec_blocks_video_embed_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_video_embed" ADD CONSTRAINT "gsec_blocks_video_embed_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_video_embed" ADD CONSTRAINT "gsec_blocks_video_embed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_posts_list" ADD CONSTRAINT "_gsec_v_blocks_posts_list_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_posts_list" ADD CONSTRAINT "_gsec_v_blocks_posts_list_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_posts_list" ADD CONSTRAINT "_gsec_v_blocks_posts_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_posts_list" ADD CONSTRAINT "_gsec_v_blocks_posts_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_case_studies_items" ADD CONSTRAINT "_gsec_v_blocks_case_studies_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_case_studies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_case_studies" ADD CONSTRAINT "_gsec_v_blocks_case_studies_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_case_studies" ADD CONSTRAINT "_gsec_v_blocks_case_studies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_form_fields" ADD CONSTRAINT "_gsec_v_blocks_form_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_form" ADD CONSTRAINT "_gsec_v_blocks_form_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_form" ADD CONSTRAINT "_gsec_v_blocks_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_video_embed" ADD CONSTRAINT "_gsec_v_blocks_video_embed_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_video_embed" ADD CONSTRAINT "_gsec_v_blocks_video_embed_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_video_embed" ADD CONSTRAINT "_gsec_v_blocks_video_embed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_posts_list" ADD CONSTRAINT "presets_blocks_posts_list_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_posts_list" ADD CONSTRAINT "presets_blocks_posts_list_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."authors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_posts_list" ADD CONSTRAINT "presets_blocks_posts_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_posts_list" ADD CONSTRAINT "presets_blocks_posts_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_posts_list_locales" ADD CONSTRAINT "presets_blocks_posts_list_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_posts_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_case_studies_items" ADD CONSTRAINT "presets_blocks_case_studies_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_case_studies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_case_studies_items_locales" ADD CONSTRAINT "presets_blocks_case_studies_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_case_studies_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_case_studies" ADD CONSTRAINT "presets_blocks_case_studies_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_case_studies" ADD CONSTRAINT "presets_blocks_case_studies_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_case_studies_locales" ADD CONSTRAINT "presets_blocks_case_studies_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_case_studies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_form_fields" ADD CONSTRAINT "presets_blocks_form_fields_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_form_fields_locales" ADD CONSTRAINT "presets_blocks_form_fields_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_form_fields"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_form" ADD CONSTRAINT "presets_blocks_form_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_form" ADD CONSTRAINT "presets_blocks_form_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_form_locales" ADD CONSTRAINT "presets_blocks_form_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_form"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_video_embed" ADD CONSTRAINT "presets_blocks_video_embed_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_video_embed" ADD CONSTRAINT "presets_blocks_video_embed_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_video_embed" ADD CONSTRAINT "presets_blocks_video_embed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_video_embed_locales" ADD CONSTRAINT "presets_blocks_video_embed_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_video_embed"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_posts_list_order_idx" ON "page_blocks_posts_list" USING btree ("_order");
  CREATE INDEX "page_blocks_posts_list_parent_id_idx" ON "page_blocks_posts_list" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_posts_list_path_idx" ON "page_blocks_posts_list" USING btree ("_path");
  CREATE INDEX "page_blocks_posts_list_locale_idx" ON "page_blocks_posts_list" USING btree ("_locale");
  CREATE INDEX "page_blocks_posts_list_category_idx" ON "page_blocks_posts_list" USING btree ("category_id");
  CREATE INDEX "page_blocks_posts_list_author_idx" ON "page_blocks_posts_list" USING btree ("author_id");
  CREATE INDEX "page_blocks_posts_list_section_background_section_backgr_idx" ON "page_blocks_posts_list" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_case_studies_items_order_idx" ON "page_blocks_case_studies_items" USING btree ("_order");
  CREATE INDEX "page_blocks_case_studies_items_parent_id_idx" ON "page_blocks_case_studies_items" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_case_studies_items_locale_idx" ON "page_blocks_case_studies_items" USING btree ("_locale");
  CREATE INDEX "page_blocks_case_studies_order_idx" ON "page_blocks_case_studies" USING btree ("_order");
  CREATE INDEX "page_blocks_case_studies_parent_id_idx" ON "page_blocks_case_studies" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_case_studies_path_idx" ON "page_blocks_case_studies" USING btree ("_path");
  CREATE INDEX "page_blocks_case_studies_locale_idx" ON "page_blocks_case_studies" USING btree ("_locale");
  CREATE INDEX "page_blocks_case_studies_section_background_section_back_idx" ON "page_blocks_case_studies" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_form_fields_order_idx" ON "page_blocks_form_fields" USING btree ("_order");
  CREATE INDEX "page_blocks_form_fields_parent_id_idx" ON "page_blocks_form_fields" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_form_fields_locale_idx" ON "page_blocks_form_fields" USING btree ("_locale");
  CREATE INDEX "page_blocks_form_order_idx" ON "page_blocks_form" USING btree ("_order");
  CREATE INDEX "page_blocks_form_parent_id_idx" ON "page_blocks_form" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_form_path_idx" ON "page_blocks_form" USING btree ("_path");
  CREATE INDEX "page_blocks_form_locale_idx" ON "page_blocks_form" USING btree ("_locale");
  CREATE INDEX "page_blocks_form_section_background_section_background_m_idx" ON "page_blocks_form" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_video_embed_order_idx" ON "page_blocks_video_embed" USING btree ("_order");
  CREATE INDEX "page_blocks_video_embed_parent_id_idx" ON "page_blocks_video_embed" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_video_embed_path_idx" ON "page_blocks_video_embed" USING btree ("_path");
  CREATE INDEX "page_blocks_video_embed_locale_idx" ON "page_blocks_video_embed" USING btree ("_locale");
  CREATE INDEX "page_blocks_video_embed_poster_idx" ON "page_blocks_video_embed" USING btree ("poster_id");
  CREATE INDEX "page_blocks_video_embed_section_background_section_backg_idx" ON "page_blocks_video_embed" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_posts_list_order_idx" ON "_page_v_blocks_posts_list" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_posts_list_parent_id_idx" ON "_page_v_blocks_posts_list" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_posts_list_path_idx" ON "_page_v_blocks_posts_list" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_posts_list_locale_idx" ON "_page_v_blocks_posts_list" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_posts_list_category_idx" ON "_page_v_blocks_posts_list" USING btree ("category_id");
  CREATE INDEX "_page_v_blocks_posts_list_author_idx" ON "_page_v_blocks_posts_list" USING btree ("author_id");
  CREATE INDEX "_page_v_blocks_posts_list_section_background_section_bac_idx" ON "_page_v_blocks_posts_list" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_case_studies_items_order_idx" ON "_page_v_blocks_case_studies_items" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_case_studies_items_parent_id_idx" ON "_page_v_blocks_case_studies_items" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_case_studies_items_locale_idx" ON "_page_v_blocks_case_studies_items" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_case_studies_order_idx" ON "_page_v_blocks_case_studies" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_case_studies_parent_id_idx" ON "_page_v_blocks_case_studies" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_case_studies_path_idx" ON "_page_v_blocks_case_studies" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_case_studies_locale_idx" ON "_page_v_blocks_case_studies" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_case_studies_section_background_section_b_idx" ON "_page_v_blocks_case_studies" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_form_fields_order_idx" ON "_page_v_blocks_form_fields" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_form_fields_parent_id_idx" ON "_page_v_blocks_form_fields" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_form_fields_locale_idx" ON "_page_v_blocks_form_fields" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_form_order_idx" ON "_page_v_blocks_form" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_form_parent_id_idx" ON "_page_v_blocks_form" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_form_path_idx" ON "_page_v_blocks_form" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_form_locale_idx" ON "_page_v_blocks_form" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_form_section_background_section_backgroun_idx" ON "_page_v_blocks_form" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_video_embed_order_idx" ON "_page_v_blocks_video_embed" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_video_embed_parent_id_idx" ON "_page_v_blocks_video_embed" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_video_embed_path_idx" ON "_page_v_blocks_video_embed" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_video_embed_locale_idx" ON "_page_v_blocks_video_embed" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_video_embed_poster_idx" ON "_page_v_blocks_video_embed" USING btree ("poster_id");
  CREATE INDEX "_page_v_blocks_video_embed_section_background_section_ba_idx" ON "_page_v_blocks_video_embed" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "authors_locales_locale_parent_id_unique" ON "authors_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "gsec_blocks_posts_list_order_idx" ON "gsec_blocks_posts_list" USING btree ("_order");
  CREATE INDEX "gsec_blocks_posts_list_parent_id_idx" ON "gsec_blocks_posts_list" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_posts_list_path_idx" ON "gsec_blocks_posts_list" USING btree ("_path");
  CREATE INDEX "gsec_blocks_posts_list_locale_idx" ON "gsec_blocks_posts_list" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_posts_list_category_idx" ON "gsec_blocks_posts_list" USING btree ("category_id");
  CREATE INDEX "gsec_blocks_posts_list_author_idx" ON "gsec_blocks_posts_list" USING btree ("author_id");
  CREATE INDEX "gsec_blocks_posts_list_section_background_section_backgr_idx" ON "gsec_blocks_posts_list" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_case_studies_items_order_idx" ON "gsec_blocks_case_studies_items" USING btree ("_order");
  CREATE INDEX "gsec_blocks_case_studies_items_parent_id_idx" ON "gsec_blocks_case_studies_items" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_case_studies_items_locale_idx" ON "gsec_blocks_case_studies_items" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_case_studies_order_idx" ON "gsec_blocks_case_studies" USING btree ("_order");
  CREATE INDEX "gsec_blocks_case_studies_parent_id_idx" ON "gsec_blocks_case_studies" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_case_studies_path_idx" ON "gsec_blocks_case_studies" USING btree ("_path");
  CREATE INDEX "gsec_blocks_case_studies_locale_idx" ON "gsec_blocks_case_studies" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_case_studies_section_background_section_back_idx" ON "gsec_blocks_case_studies" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_form_fields_order_idx" ON "gsec_blocks_form_fields" USING btree ("_order");
  CREATE INDEX "gsec_blocks_form_fields_parent_id_idx" ON "gsec_blocks_form_fields" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_form_fields_locale_idx" ON "gsec_blocks_form_fields" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_form_order_idx" ON "gsec_blocks_form" USING btree ("_order");
  CREATE INDEX "gsec_blocks_form_parent_id_idx" ON "gsec_blocks_form" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_form_path_idx" ON "gsec_blocks_form" USING btree ("_path");
  CREATE INDEX "gsec_blocks_form_locale_idx" ON "gsec_blocks_form" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_form_section_background_section_background_m_idx" ON "gsec_blocks_form" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_video_embed_order_idx" ON "gsec_blocks_video_embed" USING btree ("_order");
  CREATE INDEX "gsec_blocks_video_embed_parent_id_idx" ON "gsec_blocks_video_embed" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_video_embed_path_idx" ON "gsec_blocks_video_embed" USING btree ("_path");
  CREATE INDEX "gsec_blocks_video_embed_locale_idx" ON "gsec_blocks_video_embed" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_video_embed_poster_idx" ON "gsec_blocks_video_embed" USING btree ("poster_id");
  CREATE INDEX "gsec_blocks_video_embed_section_background_section_backg_idx" ON "gsec_blocks_video_embed" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_posts_list_order_idx" ON "_gsec_v_blocks_posts_list" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_posts_list_parent_id_idx" ON "_gsec_v_blocks_posts_list" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_posts_list_path_idx" ON "_gsec_v_blocks_posts_list" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_posts_list_locale_idx" ON "_gsec_v_blocks_posts_list" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_posts_list_category_idx" ON "_gsec_v_blocks_posts_list" USING btree ("category_id");
  CREATE INDEX "_gsec_v_blocks_posts_list_author_idx" ON "_gsec_v_blocks_posts_list" USING btree ("author_id");
  CREATE INDEX "_gsec_v_blocks_posts_list_section_background_section_bac_idx" ON "_gsec_v_blocks_posts_list" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_case_studies_items_order_idx" ON "_gsec_v_blocks_case_studies_items" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_case_studies_items_parent_id_idx" ON "_gsec_v_blocks_case_studies_items" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_case_studies_items_locale_idx" ON "_gsec_v_blocks_case_studies_items" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_case_studies_order_idx" ON "_gsec_v_blocks_case_studies" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_case_studies_parent_id_idx" ON "_gsec_v_blocks_case_studies" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_case_studies_path_idx" ON "_gsec_v_blocks_case_studies" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_case_studies_locale_idx" ON "_gsec_v_blocks_case_studies" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_case_studies_section_background_section_b_idx" ON "_gsec_v_blocks_case_studies" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_form_fields_order_idx" ON "_gsec_v_blocks_form_fields" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_form_fields_parent_id_idx" ON "_gsec_v_blocks_form_fields" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_form_fields_locale_idx" ON "_gsec_v_blocks_form_fields" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_form_order_idx" ON "_gsec_v_blocks_form" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_form_parent_id_idx" ON "_gsec_v_blocks_form" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_form_path_idx" ON "_gsec_v_blocks_form" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_form_locale_idx" ON "_gsec_v_blocks_form" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_form_section_background_section_backgroun_idx" ON "_gsec_v_blocks_form" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_video_embed_order_idx" ON "_gsec_v_blocks_video_embed" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_video_embed_parent_id_idx" ON "_gsec_v_blocks_video_embed" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_video_embed_path_idx" ON "_gsec_v_blocks_video_embed" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_video_embed_locale_idx" ON "_gsec_v_blocks_video_embed" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_video_embed_poster_idx" ON "_gsec_v_blocks_video_embed" USING btree ("poster_id");
  CREATE INDEX "_gsec_v_blocks_video_embed_section_background_section_ba_idx" ON "_gsec_v_blocks_video_embed" USING btree ("section_background_media_id");
  CREATE INDEX "form_submissions_updated_at_idx" ON "form_submissions" USING btree ("updated_at");
  CREATE INDEX "form_submissions_created_at_idx" ON "form_submissions" USING btree ("created_at");
  CREATE INDEX "presets_blocks_posts_list_order_idx" ON "presets_blocks_posts_list" USING btree ("_order");
  CREATE INDEX "presets_blocks_posts_list_parent_id_idx" ON "presets_blocks_posts_list" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_posts_list_path_idx" ON "presets_blocks_posts_list" USING btree ("_path");
  CREATE INDEX "presets_blocks_posts_list_category_idx" ON "presets_blocks_posts_list" USING btree ("category_id");
  CREATE INDEX "presets_blocks_posts_list_author_idx" ON "presets_blocks_posts_list" USING btree ("author_id");
  CREATE INDEX "presets_blocks_posts_list_section_background_section_bac_idx" ON "presets_blocks_posts_list" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_posts_list_locales_locale_parent_id_unique" ON "presets_blocks_posts_list_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_case_studies_items_order_idx" ON "presets_blocks_case_studies_items" USING btree ("_order");
  CREATE INDEX "presets_blocks_case_studies_items_parent_id_idx" ON "presets_blocks_case_studies_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "presets_blocks_case_studies_items_locales_locale_parent_id_u" ON "presets_blocks_case_studies_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_case_studies_order_idx" ON "presets_blocks_case_studies" USING btree ("_order");
  CREATE INDEX "presets_blocks_case_studies_parent_id_idx" ON "presets_blocks_case_studies" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_case_studies_path_idx" ON "presets_blocks_case_studies" USING btree ("_path");
  CREATE INDEX "presets_blocks_case_studies_section_background_section_b_idx" ON "presets_blocks_case_studies" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_case_studies_locales_locale_parent_id_unique" ON "presets_blocks_case_studies_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_form_fields_order_idx" ON "presets_blocks_form_fields" USING btree ("_order");
  CREATE INDEX "presets_blocks_form_fields_parent_id_idx" ON "presets_blocks_form_fields" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "presets_blocks_form_fields_locales_locale_parent_id_unique" ON "presets_blocks_form_fields_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_form_order_idx" ON "presets_blocks_form" USING btree ("_order");
  CREATE INDEX "presets_blocks_form_parent_id_idx" ON "presets_blocks_form" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_form_path_idx" ON "presets_blocks_form" USING btree ("_path");
  CREATE INDEX "presets_blocks_form_section_background_section_backgroun_idx" ON "presets_blocks_form" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_form_locales_locale_parent_id_unique" ON "presets_blocks_form_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_video_embed_order_idx" ON "presets_blocks_video_embed" USING btree ("_order");
  CREATE INDEX "presets_blocks_video_embed_parent_id_idx" ON "presets_blocks_video_embed" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_video_embed_path_idx" ON "presets_blocks_video_embed" USING btree ("_path");
  CREATE INDEX "presets_blocks_video_embed_poster_idx" ON "presets_blocks_video_embed" USING btree ("poster_id");
  CREATE INDEX "presets_blocks_video_embed_section_background_section_ba_idx" ON "presets_blocks_video_embed" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_video_embed_locales_locale_parent_id_unique" ON "presets_blocks_video_embed_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_form_submissions_fk" FOREIGN KEY ("form_submissions_id") REFERENCES "public"."form_submissions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "authors_slug_idx" ON "authors" USING btree ("slug");
  CREATE INDEX "payload_locked_documents_rels_form_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("form_submissions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_posts_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_case_studies_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_case_studies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_form_fields" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_form" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_video_embed" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_posts_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_case_studies_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_case_studies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_form_fields" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_form" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_video_embed" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "authors_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_posts_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_case_studies_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_case_studies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_form_fields" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_form" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_video_embed" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_posts_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_case_studies_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_case_studies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_form_fields" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_form" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_video_embed" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "form_submissions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_posts_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_posts_list_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_case_studies_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_case_studies_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_case_studies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_case_studies_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_form_fields" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_form_fields_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_form" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_form_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_video_embed" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_video_embed_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "page_blocks_posts_list" CASCADE;
  DROP TABLE "page_blocks_case_studies_items" CASCADE;
  DROP TABLE "page_blocks_case_studies" CASCADE;
  DROP TABLE "page_blocks_form_fields" CASCADE;
  DROP TABLE "page_blocks_form" CASCADE;
  DROP TABLE "page_blocks_video_embed" CASCADE;
  DROP TABLE "_page_v_blocks_posts_list" CASCADE;
  DROP TABLE "_page_v_blocks_case_studies_items" CASCADE;
  DROP TABLE "_page_v_blocks_case_studies" CASCADE;
  DROP TABLE "_page_v_blocks_form_fields" CASCADE;
  DROP TABLE "_page_v_blocks_form" CASCADE;
  DROP TABLE "_page_v_blocks_video_embed" CASCADE;
  DROP TABLE "authors_locales" CASCADE;
  DROP TABLE "gsec_blocks_posts_list" CASCADE;
  DROP TABLE "gsec_blocks_case_studies_items" CASCADE;
  DROP TABLE "gsec_blocks_case_studies" CASCADE;
  DROP TABLE "gsec_blocks_form_fields" CASCADE;
  DROP TABLE "gsec_blocks_form" CASCADE;
  DROP TABLE "gsec_blocks_video_embed" CASCADE;
  DROP TABLE "_gsec_v_blocks_posts_list" CASCADE;
  DROP TABLE "_gsec_v_blocks_case_studies_items" CASCADE;
  DROP TABLE "_gsec_v_blocks_case_studies" CASCADE;
  DROP TABLE "_gsec_v_blocks_form_fields" CASCADE;
  DROP TABLE "_gsec_v_blocks_form" CASCADE;
  DROP TABLE "_gsec_v_blocks_video_embed" CASCADE;
  DROP TABLE "form_submissions" CASCADE;
  DROP TABLE "presets_blocks_posts_list" CASCADE;
  DROP TABLE "presets_blocks_posts_list_locales" CASCADE;
  DROP TABLE "presets_blocks_case_studies_items" CASCADE;
  DROP TABLE "presets_blocks_case_studies_items_locales" CASCADE;
  DROP TABLE "presets_blocks_case_studies" CASCADE;
  DROP TABLE "presets_blocks_case_studies_locales" CASCADE;
  DROP TABLE "presets_blocks_form_fields" CASCADE;
  DROP TABLE "presets_blocks_form_fields_locales" CASCADE;
  DROP TABLE "presets_blocks_form" CASCADE;
  DROP TABLE "presets_blocks_form_locales" CASCADE;
  DROP TABLE "presets_blocks_video_embed" CASCADE;
  DROP TABLE "presets_blocks_video_embed_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_form_submissions_fk";
  
  DROP INDEX "authors_slug_idx";
  DROP INDEX "payload_locked_documents_rels_form_submissions_id_idx";
  ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'admin';
  ALTER TABLE "authors" DROP COLUMN "generate_slug";
  ALTER TABLE "authors" DROP COLUMN "slug";
  ALTER TABLE "posts" DROP COLUMN "content_format";
  ALTER TABLE "posts" DROP COLUMN "source_url";
  ALTER TABLE "posts" DROP COLUMN "legacy_path";
  ALTER TABLE "posts_locales" DROP COLUMN "markdown";
  ALTER TABLE "_posts_v" DROP COLUMN "version_content_format";
  ALTER TABLE "_posts_v" DROP COLUMN "version_source_url";
  ALTER TABLE "_posts_v" DROP COLUMN "version_legacy_path";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_markdown";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "form_submissions_id";
  DROP TYPE "public"."enum_page_blocks_posts_list_source";
  DROP TYPE "public"."enum_page_blocks_posts_list_layout";
  DROP TYPE "public"."enum_page_blocks_posts_list_view_all_type";
  DROP TYPE "public"."enum_page_blocks_posts_list_view_all_custom_page";
  DROP TYPE "public"."enum_page_blocks_posts_list_section_theme";
  DROP TYPE "public"."enum_page_blocks_posts_list_section_max_width";
  DROP TYPE "public"."enum_page_blocks_posts_list_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_posts_list_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_case_studies_items_sector";
  DROP TYPE "public"."enum_page_blocks_case_studies_filter_sector";
  DROP TYPE "public"."enum_page_blocks_case_studies_section_theme";
  DROP TYPE "public"."enum_page_blocks_case_studies_section_max_width";
  DROP TYPE "public"."enum_page_blocks_case_studies_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_case_studies_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_form_fields_type";
  DROP TYPE "public"."enum_page_blocks_form_fields_width";
  DROP TYPE "public"."enum_page_blocks_form_mode";
  DROP TYPE "public"."enum_page_blocks_form_success_link_type";
  DROP TYPE "public"."enum_page_blocks_form_success_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_form_section_theme";
  DROP TYPE "public"."enum_page_blocks_form_section_max_width";
  DROP TYPE "public"."enum_page_blocks_form_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_form_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_video_embed_provider";
  DROP TYPE "public"."enum_page_blocks_video_embed_aspect";
  DROP TYPE "public"."enum_page_blocks_video_embed_section_theme";
  DROP TYPE "public"."enum_page_blocks_video_embed_section_max_width";
  DROP TYPE "public"."enum_page_blocks_video_embed_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_video_embed_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_posts_list_source";
  DROP TYPE "public"."enum__page_v_blocks_posts_list_layout";
  DROP TYPE "public"."enum__page_v_blocks_posts_list_view_all_type";
  DROP TYPE "public"."enum__page_v_blocks_posts_list_view_all_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_posts_list_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_posts_list_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_posts_list_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_posts_list_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_case_studies_items_sector";
  DROP TYPE "public"."enum__page_v_blocks_case_studies_filter_sector";
  DROP TYPE "public"."enum__page_v_blocks_case_studies_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_case_studies_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_case_studies_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_case_studies_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_form_fields_type";
  DROP TYPE "public"."enum__page_v_blocks_form_fields_width";
  DROP TYPE "public"."enum__page_v_blocks_form_mode";
  DROP TYPE "public"."enum__page_v_blocks_form_success_link_type";
  DROP TYPE "public"."enum__page_v_blocks_form_success_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_form_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_form_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_form_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_form_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_video_embed_provider";
  DROP TYPE "public"."enum__page_v_blocks_video_embed_aspect";
  DROP TYPE "public"."enum__page_v_blocks_video_embed_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_video_embed_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_video_embed_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_video_embed_section_padding_x";
  DROP TYPE "public"."enum_posts_content_format";
  DROP TYPE "public"."enum__posts_v_version_content_format";
  DROP TYPE "public"."enum_gsec_blocks_posts_list_source";
  DROP TYPE "public"."enum_gsec_blocks_posts_list_layout";
  DROP TYPE "public"."enum_gsec_blocks_posts_list_view_all_type";
  DROP TYPE "public"."enum_gsec_blocks_posts_list_view_all_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_posts_list_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_posts_list_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_posts_list_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_posts_list_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_case_studies_items_sector";
  DROP TYPE "public"."enum_gsec_blocks_case_studies_filter_sector";
  DROP TYPE "public"."enum_gsec_blocks_case_studies_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_case_studies_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_case_studies_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_case_studies_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_form_fields_type";
  DROP TYPE "public"."enum_gsec_blocks_form_fields_width";
  DROP TYPE "public"."enum_gsec_blocks_form_mode";
  DROP TYPE "public"."enum_gsec_blocks_form_success_link_type";
  DROP TYPE "public"."enum_gsec_blocks_form_success_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_form_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_form_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_form_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_form_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_video_embed_provider";
  DROP TYPE "public"."enum_gsec_blocks_video_embed_aspect";
  DROP TYPE "public"."enum_gsec_blocks_video_embed_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_video_embed_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_video_embed_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_video_embed_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_posts_list_source";
  DROP TYPE "public"."enum__gsec_v_blocks_posts_list_layout";
  DROP TYPE "public"."enum__gsec_v_blocks_posts_list_view_all_type";
  DROP TYPE "public"."enum__gsec_v_blocks_posts_list_view_all_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_posts_list_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_posts_list_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_posts_list_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_posts_list_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_case_studies_items_sector";
  DROP TYPE "public"."enum__gsec_v_blocks_case_studies_filter_sector";
  DROP TYPE "public"."enum__gsec_v_blocks_case_studies_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_case_studies_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_case_studies_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_case_studies_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_form_fields_type";
  DROP TYPE "public"."enum__gsec_v_blocks_form_fields_width";
  DROP TYPE "public"."enum__gsec_v_blocks_form_mode";
  DROP TYPE "public"."enum__gsec_v_blocks_form_success_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_form_success_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_form_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_form_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_form_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_form_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_video_embed_provider";
  DROP TYPE "public"."enum__gsec_v_blocks_video_embed_aspect";
  DROP TYPE "public"."enum__gsec_v_blocks_video_embed_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_video_embed_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_video_embed_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_video_embed_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_posts_list_source";
  DROP TYPE "public"."enum_presets_blocks_posts_list_layout";
  DROP TYPE "public"."enum_presets_blocks_posts_list_view_all_type";
  DROP TYPE "public"."enum_presets_blocks_posts_list_view_all_custom_page";
  DROP TYPE "public"."enum_presets_blocks_posts_list_section_theme";
  DROP TYPE "public"."enum_presets_blocks_posts_list_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_posts_list_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_posts_list_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_case_studies_items_sector";
  DROP TYPE "public"."enum_presets_blocks_case_studies_filter_sector";
  DROP TYPE "public"."enum_presets_blocks_case_studies_section_theme";
  DROP TYPE "public"."enum_presets_blocks_case_studies_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_case_studies_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_case_studies_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_form_fields_type";
  DROP TYPE "public"."enum_presets_blocks_form_fields_width";
  DROP TYPE "public"."enum_presets_blocks_form_mode";
  DROP TYPE "public"."enum_presets_blocks_form_success_link_type";
  DROP TYPE "public"."enum_presets_blocks_form_success_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_form_section_theme";
  DROP TYPE "public"."enum_presets_blocks_form_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_form_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_form_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_video_embed_provider";
  DROP TYPE "public"."enum_presets_blocks_video_embed_aspect";
  DROP TYPE "public"."enum_presets_blocks_video_embed_section_theme";
  DROP TYPE "public"."enum_presets_blocks_video_embed_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_video_embed_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_video_embed_section_padding_x";`)
}
