import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_talk_grid_source" AS ENUM('recent', 'topic', 'kind', 'selected');
  CREATE TYPE "public"."enum_page_blocks_talk_grid_kind" AS ENUM('featured-talk', 'short-talk', 'special-lesson', 'student-qa', 'study-group-discussion', 'article', 'blog', 'letter', 'insight-timer-talk');
  CREATE TYPE "public"."enum_page_blocks_talk_grid_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_talk_grid_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_talk_grid_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_talk_grid_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_topic_chips_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_topic_chips_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_topic_chips_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_topic_chips_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_shopify_product_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_shopify_product_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_shopify_product_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_shopify_product_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_talk_grid_source" AS ENUM('recent', 'topic', 'kind', 'selected');
  CREATE TYPE "public"."enum__page_v_blocks_talk_grid_kind" AS ENUM('featured-talk', 'short-talk', 'special-lesson', 'student-qa', 'study-group-discussion', 'article', 'blog', 'letter', 'insight-timer-talk');
  CREATE TYPE "public"."enum__page_v_blocks_talk_grid_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_talk_grid_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_talk_grid_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_talk_grid_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_topic_chips_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_topic_chips_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_topic_chips_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_topic_chips_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_shopify_product_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_shopify_product_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_shopify_product_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_shopify_product_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_talk_kind" AS ENUM('featured-talk', 'short-talk', 'special-lesson', 'student-qa', 'study-group-discussion', 'article', 'blog', 'letter', 'insight-timer-talk');
  CREATE TYPE "public"."enum_talk_required_tier" AS ENUM('visitor', 'basic', 'premium', 'all-access');
  CREATE TYPE "public"."enum_talk_ai_status" AS ENUM('awaiting-review', 'approved');
  CREATE TYPE "public"."enum_talk_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_talk_meta_robots" AS ENUM('index', 'noindex');
  CREATE TYPE "public"."enum__talk_v_version_kind" AS ENUM('featured-talk', 'short-talk', 'special-lesson', 'student-qa', 'study-group-discussion', 'article', 'blog', 'letter', 'insight-timer-talk');
  CREATE TYPE "public"."enum__talk_v_version_required_tier" AS ENUM('visitor', 'basic', 'premium', 'all-access');
  CREATE TYPE "public"."enum__talk_v_version_ai_status" AS ENUM('awaiting-review', 'approved');
  CREATE TYPE "public"."enum__talk_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__talk_v_published_locale" AS ENUM('en', 'es');
  CREATE TYPE "public"."enum__talk_v_version_meta_robots" AS ENUM('index', 'noindex');
  CREATE TYPE "public"."enum_topic_meta_robots" AS ENUM('index', 'noindex');
  CREATE TYPE "public"."enum_gsec_blocks_talk_grid_source" AS ENUM('recent', 'topic', 'kind', 'selected');
  CREATE TYPE "public"."enum_gsec_blocks_talk_grid_kind" AS ENUM('featured-talk', 'short-talk', 'special-lesson', 'student-qa', 'study-group-discussion', 'article', 'blog', 'letter', 'insight-timer-talk');
  CREATE TYPE "public"."enum_gsec_blocks_talk_grid_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_talk_grid_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_talk_grid_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_talk_grid_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_topic_chips_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_topic_chips_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_topic_chips_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_topic_chips_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_shopify_product_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_shopify_product_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_shopify_product_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_shopify_product_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_talk_grid_source" AS ENUM('recent', 'topic', 'kind', 'selected');
  CREATE TYPE "public"."enum__gsec_v_blocks_talk_grid_kind" AS ENUM('featured-talk', 'short-talk', 'special-lesson', 'student-qa', 'study-group-discussion', 'article', 'blog', 'letter', 'insight-timer-talk');
  CREATE TYPE "public"."enum__gsec_v_blocks_talk_grid_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_talk_grid_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_talk_grid_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_talk_grid_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_topic_chips_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_topic_chips_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_topic_chips_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_topic_chips_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_shopify_product_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_shopify_product_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_shopify_product_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_shopify_product_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_talk_grid_source" AS ENUM('recent', 'topic', 'kind', 'selected');
  CREATE TYPE "public"."enum_presets_blocks_talk_grid_kind" AS ENUM('featured-talk', 'short-talk', 'special-lesson', 'student-qa', 'study-group-discussion', 'article', 'blog', 'letter', 'insight-timer-talk');
  CREATE TYPE "public"."enum_presets_blocks_talk_grid_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_talk_grid_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_talk_grid_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_talk_grid_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_topic_chips_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_topic_chips_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_topic_chips_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_topic_chips_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_shopify_product_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_shopify_product_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_shopify_product_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_shopify_product_section_padding_x" AS ENUM('none', 'base');
  CREATE TABLE "page_blocks_talk_grid_talk_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"talk_id" integer
  );
  
  CREATE TABLE "page_blocks_talk_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"source" "enum_page_blocks_talk_grid_source" DEFAULT 'recent',
  	"topic_id" integer,
  	"kind" "enum_page_blocks_talk_grid_kind",
  	"limit" numeric DEFAULT 6,
  	"show_kind" boolean DEFAULT true,
  	"show_tier" boolean DEFAULT true,
  	"section_theme" "enum_page_blocks_talk_grid_section_theme",
  	"section_max_width" "enum_page_blocks_talk_grid_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_talk_grid_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_talk_grid_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_topic_chips_topic_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"topic_id" integer
  );
  
  CREATE TABLE "page_blocks_topic_chips" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"section_theme" "enum_page_blocks_topic_chips_section_theme",
  	"section_max_width" "enum_page_blocks_topic_chips_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_topic_chips_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_topic_chips_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_shopify_product" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"product_handle" varchar,
  	"show_price" boolean DEFAULT true,
  	"section_theme" "enum_page_blocks_shopify_product_section_theme",
  	"section_max_width" "enum_page_blocks_shopify_product_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_shopify_product_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_shopify_product_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_talk_grid_talk_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"talk_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_talk_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"source" "enum__page_v_blocks_talk_grid_source" DEFAULT 'recent',
  	"topic_id" integer,
  	"kind" "enum__page_v_blocks_talk_grid_kind",
  	"limit" numeric DEFAULT 6,
  	"show_kind" boolean DEFAULT true,
  	"show_tier" boolean DEFAULT true,
  	"section_theme" "enum__page_v_blocks_talk_grid_section_theme",
  	"section_max_width" "enum__page_v_blocks_talk_grid_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_talk_grid_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_talk_grid_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_topic_chips_topic_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"topic_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_topic_chips" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"section_theme" "enum__page_v_blocks_topic_chips_section_theme",
  	"section_max_width" "enum__page_v_blocks_topic_chips_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_topic_chips_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_topic_chips_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_shopify_product" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"product_handle" varchar,
  	"show_price" boolean DEFAULT true,
  	"section_theme" "enum__page_v_blocks_shopify_product_section_theme",
  	"section_max_width" "enum__page_v_blocks_shopify_product_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_shopify_product_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_shopify_product_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "talk_ai_takeaways" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"takeaway" varchar
  );
  
  CREATE TABLE "talk_ai_questions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar
  );
  
  CREATE TABLE "talk_ai_pull_quotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"speaker_name" varchar,
  	"start_seconds" numeric
  );
  
  CREATE TABLE "talk" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"kind" "enum_talk_kind",
  	"required_tier" "enum_talk_required_tier" DEFAULT 'visitor',
  	"published_at" timestamp(3) with time zone,
  	"duration_seconds" numeric,
  	"audio_url" varchar,
  	"ai_status" "enum_talk_ai_status" DEFAULT 'awaiting-review',
  	"transcript_segments" jsonb,
  	"source_url" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_talk_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "talk_locales" (
  	"title" varchar,
  	"teaser" varchar,
  	"body" jsonb,
  	"ai_summary" varchar,
  	"transcript" varchar,
  	"meta_title" varchar,
  	"meta_image_id" integer,
  	"meta_description" varchar,
  	"meta_robots" "enum_talk_meta_robots" DEFAULT 'index',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "talk_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topic_id" integer
  );
  
  CREATE TABLE "_talk_v_version_ai_takeaways" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"takeaway" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_talk_v_version_ai_questions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_talk_v_version_ai_pull_quotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"speaker_name" varchar,
  	"start_seconds" numeric,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_talk_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_kind" "enum__talk_v_version_kind",
  	"version_required_tier" "enum__talk_v_version_required_tier" DEFAULT 'visitor',
  	"version_published_at" timestamp(3) with time zone,
  	"version_duration_seconds" numeric,
  	"version_audio_url" varchar,
  	"version_ai_status" "enum__talk_v_version_ai_status" DEFAULT 'awaiting-review',
  	"version_transcript_segments" jsonb,
  	"version_source_url" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__talk_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__talk_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_talk_v_locales" (
  	"version_title" varchar,
  	"version_teaser" varchar,
  	"version_body" jsonb,
  	"version_ai_summary" varchar,
  	"version_transcript" varchar,
  	"version_meta_title" varchar,
  	"version_meta_image_id" integer,
  	"version_meta_description" varchar,
  	"version_meta_robots" "enum__talk_v_version_meta_robots" DEFAULT 'index',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_talk_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"topic_id" integer
  );
  
  CREATE TABLE "topic" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "topic_locales" (
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"meta_title" varchar,
  	"meta_image_id" integer,
  	"meta_description" varchar,
  	"meta_robots" "enum_topic_meta_robots" DEFAULT 'index',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "gsec_blocks_talk_grid_talk_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"talk_id" integer
  );
  
  CREATE TABLE "gsec_blocks_talk_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"source" "enum_gsec_blocks_talk_grid_source" DEFAULT 'recent',
  	"topic_id" integer,
  	"kind" "enum_gsec_blocks_talk_grid_kind",
  	"limit" numeric DEFAULT 6,
  	"show_kind" boolean DEFAULT true,
  	"show_tier" boolean DEFAULT true,
  	"section_theme" "enum_gsec_blocks_talk_grid_section_theme",
  	"section_max_width" "enum_gsec_blocks_talk_grid_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_talk_grid_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_talk_grid_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_topic_chips_topic_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"topic_id" integer
  );
  
  CREATE TABLE "gsec_blocks_topic_chips" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"section_theme" "enum_gsec_blocks_topic_chips_section_theme",
  	"section_max_width" "enum_gsec_blocks_topic_chips_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_topic_chips_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_topic_chips_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_shopify_product" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"product_handle" varchar,
  	"show_price" boolean DEFAULT true,
  	"section_theme" "enum_gsec_blocks_shopify_product_section_theme",
  	"section_max_width" "enum_gsec_blocks_shopify_product_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_shopify_product_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_shopify_product_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_talk_grid_talk_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"talk_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_talk_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"source" "enum__gsec_v_blocks_talk_grid_source" DEFAULT 'recent',
  	"topic_id" integer,
  	"kind" "enum__gsec_v_blocks_talk_grid_kind",
  	"limit" numeric DEFAULT 6,
  	"show_kind" boolean DEFAULT true,
  	"show_tier" boolean DEFAULT true,
  	"section_theme" "enum__gsec_v_blocks_talk_grid_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_talk_grid_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_talk_grid_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_talk_grid_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_topic_chips_topic_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"topic_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_topic_chips" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"section_theme" "enum__gsec_v_blocks_topic_chips_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_topic_chips_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_topic_chips_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_topic_chips_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_shopify_product" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"product_handle" varchar,
  	"show_price" boolean DEFAULT true,
  	"section_theme" "enum__gsec_v_blocks_shopify_product_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_shopify_product_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_shopify_product_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_shopify_product_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_talk_grid_talk_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"talk_id" integer
  );
  
  CREATE TABLE "presets_blocks_talk_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"source" "enum_presets_blocks_talk_grid_source" DEFAULT 'recent' NOT NULL,
  	"topic_id" integer,
  	"kind" "enum_presets_blocks_talk_grid_kind",
  	"limit" numeric DEFAULT 6,
  	"show_kind" boolean DEFAULT true,
  	"show_tier" boolean DEFAULT true,
  	"section_theme" "enum_presets_blocks_talk_grid_section_theme",
  	"section_max_width" "enum_presets_blocks_talk_grid_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_talk_grid_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_talk_grid_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_talk_grid_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_topic_chips_topic_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"topic_id" integer NOT NULL
  );
  
  CREATE TABLE "presets_blocks_topic_chips" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_theme" "enum_presets_blocks_topic_chips_section_theme",
  	"section_max_width" "enum_presets_blocks_topic_chips_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_topic_chips_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_topic_chips_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_topic_chips_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_shopify_product" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_handle" varchar NOT NULL,
  	"show_price" boolean DEFAULT true,
  	"section_theme" "enum_presets_blocks_shopify_product_section_theme",
  	"section_max_width" "enum_presets_blocks_shopify_product_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_shopify_product_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_shopify_product_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_shopify_product_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "talk_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "topic_id" integer;
  ALTER TABLE "page_blocks_talk_grid_talk_items" ADD CONSTRAINT "page_blocks_talk_grid_talk_items_talk_id_talk_id_fk" FOREIGN KEY ("talk_id") REFERENCES "public"."talk"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_talk_grid_talk_items" ADD CONSTRAINT "page_blocks_talk_grid_talk_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_talk_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_talk_grid" ADD CONSTRAINT "page_blocks_talk_grid_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_talk_grid" ADD CONSTRAINT "page_blocks_talk_grid_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_talk_grid" ADD CONSTRAINT "page_blocks_talk_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_topic_chips_topic_items" ADD CONSTRAINT "page_blocks_topic_chips_topic_items_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_topic_chips_topic_items" ADD CONSTRAINT "page_blocks_topic_chips_topic_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_topic_chips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_topic_chips" ADD CONSTRAINT "page_blocks_topic_chips_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_topic_chips" ADD CONSTRAINT "page_blocks_topic_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_shopify_product" ADD CONSTRAINT "page_blocks_shopify_product_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_shopify_product" ADD CONSTRAINT "page_blocks_shopify_product_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_talk_grid_talk_items" ADD CONSTRAINT "_page_v_blocks_talk_grid_talk_items_talk_id_talk_id_fk" FOREIGN KEY ("talk_id") REFERENCES "public"."talk"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_talk_grid_talk_items" ADD CONSTRAINT "_page_v_blocks_talk_grid_talk_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_talk_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_talk_grid" ADD CONSTRAINT "_page_v_blocks_talk_grid_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_talk_grid" ADD CONSTRAINT "_page_v_blocks_talk_grid_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_talk_grid" ADD CONSTRAINT "_page_v_blocks_talk_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_topic_chips_topic_items" ADD CONSTRAINT "_page_v_blocks_topic_chips_topic_items_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_topic_chips_topic_items" ADD CONSTRAINT "_page_v_blocks_topic_chips_topic_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_topic_chips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_topic_chips" ADD CONSTRAINT "_page_v_blocks_topic_chips_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_topic_chips" ADD CONSTRAINT "_page_v_blocks_topic_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_shopify_product" ADD CONSTRAINT "_page_v_blocks_shopify_product_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_shopify_product" ADD CONSTRAINT "_page_v_blocks_shopify_product_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "talk_ai_takeaways" ADD CONSTRAINT "talk_ai_takeaways_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."talk"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "talk_ai_questions" ADD CONSTRAINT "talk_ai_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."talk"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "talk_ai_pull_quotes" ADD CONSTRAINT "talk_ai_pull_quotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."talk"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "talk_locales" ADD CONSTRAINT "talk_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "talk_locales" ADD CONSTRAINT "talk_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."talk"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "talk_rels" ADD CONSTRAINT "talk_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."talk"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "talk_rels" ADD CONSTRAINT "talk_rels_topic_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_talk_v_version_ai_takeaways" ADD CONSTRAINT "_talk_v_version_ai_takeaways_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_talk_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_talk_v_version_ai_questions" ADD CONSTRAINT "_talk_v_version_ai_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_talk_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_talk_v_version_ai_pull_quotes" ADD CONSTRAINT "_talk_v_version_ai_pull_quotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_talk_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_talk_v" ADD CONSTRAINT "_talk_v_parent_id_talk_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."talk"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_talk_v_locales" ADD CONSTRAINT "_talk_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_talk_v_locales" ADD CONSTRAINT "_talk_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_talk_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_talk_v_rels" ADD CONSTRAINT "_talk_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_talk_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_talk_v_rels" ADD CONSTRAINT "_talk_v_rels_topic_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "topic_locales" ADD CONSTRAINT "topic_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "topic_locales" ADD CONSTRAINT "topic_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."topic"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_talk_grid_talk_items" ADD CONSTRAINT "gsec_blocks_talk_grid_talk_items_talk_id_talk_id_fk" FOREIGN KEY ("talk_id") REFERENCES "public"."talk"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_talk_grid_talk_items" ADD CONSTRAINT "gsec_blocks_talk_grid_talk_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_talk_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_talk_grid" ADD CONSTRAINT "gsec_blocks_talk_grid_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_talk_grid" ADD CONSTRAINT "gsec_blocks_talk_grid_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_talk_grid" ADD CONSTRAINT "gsec_blocks_talk_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_topic_chips_topic_items" ADD CONSTRAINT "gsec_blocks_topic_chips_topic_items_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_topic_chips_topic_items" ADD CONSTRAINT "gsec_blocks_topic_chips_topic_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_topic_chips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_topic_chips" ADD CONSTRAINT "gsec_blocks_topic_chips_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_topic_chips" ADD CONSTRAINT "gsec_blocks_topic_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_shopify_product" ADD CONSTRAINT "gsec_blocks_shopify_product_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_shopify_product" ADD CONSTRAINT "gsec_blocks_shopify_product_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_talk_grid_talk_items" ADD CONSTRAINT "_gsec_v_blocks_talk_grid_talk_items_talk_id_talk_id_fk" FOREIGN KEY ("talk_id") REFERENCES "public"."talk"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_talk_grid_talk_items" ADD CONSTRAINT "_gsec_v_blocks_talk_grid_talk_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_talk_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_talk_grid" ADD CONSTRAINT "_gsec_v_blocks_talk_grid_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_talk_grid" ADD CONSTRAINT "_gsec_v_blocks_talk_grid_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_talk_grid" ADD CONSTRAINT "_gsec_v_blocks_talk_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_topic_chips_topic_items" ADD CONSTRAINT "_gsec_v_blocks_topic_chips_topic_items_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_topic_chips_topic_items" ADD CONSTRAINT "_gsec_v_blocks_topic_chips_topic_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_topic_chips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_topic_chips" ADD CONSTRAINT "_gsec_v_blocks_topic_chips_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_topic_chips" ADD CONSTRAINT "_gsec_v_blocks_topic_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_shopify_product" ADD CONSTRAINT "_gsec_v_blocks_shopify_product_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_shopify_product" ADD CONSTRAINT "_gsec_v_blocks_shopify_product_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_talk_grid_talk_items" ADD CONSTRAINT "presets_blocks_talk_grid_talk_items_talk_id_talk_id_fk" FOREIGN KEY ("talk_id") REFERENCES "public"."talk"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_talk_grid_talk_items" ADD CONSTRAINT "presets_blocks_talk_grid_talk_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_talk_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_talk_grid" ADD CONSTRAINT "presets_blocks_talk_grid_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_talk_grid" ADD CONSTRAINT "presets_blocks_talk_grid_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_talk_grid" ADD CONSTRAINT "presets_blocks_talk_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_talk_grid_locales" ADD CONSTRAINT "presets_blocks_talk_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_talk_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_topic_chips_topic_items" ADD CONSTRAINT "presets_blocks_topic_chips_topic_items_topic_id_topic_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_topic_chips_topic_items" ADD CONSTRAINT "presets_blocks_topic_chips_topic_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_topic_chips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_topic_chips" ADD CONSTRAINT "presets_blocks_topic_chips_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_topic_chips" ADD CONSTRAINT "presets_blocks_topic_chips_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_topic_chips_locales" ADD CONSTRAINT "presets_blocks_topic_chips_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_topic_chips"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_shopify_product" ADD CONSTRAINT "presets_blocks_shopify_product_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_shopify_product" ADD CONSTRAINT "presets_blocks_shopify_product_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_shopify_product_locales" ADD CONSTRAINT "presets_blocks_shopify_product_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_shopify_product"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_talk_grid_talk_items_order_idx" ON "page_blocks_talk_grid_talk_items" USING btree ("_order");
  CREATE INDEX "page_blocks_talk_grid_talk_items_parent_id_idx" ON "page_blocks_talk_grid_talk_items" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_talk_grid_talk_items_locale_idx" ON "page_blocks_talk_grid_talk_items" USING btree ("_locale");
  CREATE INDEX "page_blocks_talk_grid_talk_items_talk_idx" ON "page_blocks_talk_grid_talk_items" USING btree ("talk_id");
  CREATE INDEX "page_blocks_talk_grid_order_idx" ON "page_blocks_talk_grid" USING btree ("_order");
  CREATE INDEX "page_blocks_talk_grid_parent_id_idx" ON "page_blocks_talk_grid" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_talk_grid_path_idx" ON "page_blocks_talk_grid" USING btree ("_path");
  CREATE INDEX "page_blocks_talk_grid_locale_idx" ON "page_blocks_talk_grid" USING btree ("_locale");
  CREATE INDEX "page_blocks_talk_grid_topic_idx" ON "page_blocks_talk_grid" USING btree ("topic_id");
  CREATE INDEX "page_blocks_talk_grid_section_background_section_backgro_idx" ON "page_blocks_talk_grid" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_topic_chips_topic_items_order_idx" ON "page_blocks_topic_chips_topic_items" USING btree ("_order");
  CREATE INDEX "page_blocks_topic_chips_topic_items_parent_id_idx" ON "page_blocks_topic_chips_topic_items" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_topic_chips_topic_items_locale_idx" ON "page_blocks_topic_chips_topic_items" USING btree ("_locale");
  CREATE INDEX "page_blocks_topic_chips_topic_items_topic_idx" ON "page_blocks_topic_chips_topic_items" USING btree ("topic_id");
  CREATE INDEX "page_blocks_topic_chips_order_idx" ON "page_blocks_topic_chips" USING btree ("_order");
  CREATE INDEX "page_blocks_topic_chips_parent_id_idx" ON "page_blocks_topic_chips" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_topic_chips_path_idx" ON "page_blocks_topic_chips" USING btree ("_path");
  CREATE INDEX "page_blocks_topic_chips_locale_idx" ON "page_blocks_topic_chips" USING btree ("_locale");
  CREATE INDEX "page_blocks_topic_chips_section_background_section_backg_idx" ON "page_blocks_topic_chips" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_shopify_product_order_idx" ON "page_blocks_shopify_product" USING btree ("_order");
  CREATE INDEX "page_blocks_shopify_product_parent_id_idx" ON "page_blocks_shopify_product" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_shopify_product_path_idx" ON "page_blocks_shopify_product" USING btree ("_path");
  CREATE INDEX "page_blocks_shopify_product_locale_idx" ON "page_blocks_shopify_product" USING btree ("_locale");
  CREATE INDEX "page_blocks_shopify_product_section_background_section_b_idx" ON "page_blocks_shopify_product" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_talk_grid_talk_items_order_idx" ON "_page_v_blocks_talk_grid_talk_items" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_talk_grid_talk_items_parent_id_idx" ON "_page_v_blocks_talk_grid_talk_items" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_talk_grid_talk_items_locale_idx" ON "_page_v_blocks_talk_grid_talk_items" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_talk_grid_talk_items_talk_idx" ON "_page_v_blocks_talk_grid_talk_items" USING btree ("talk_id");
  CREATE INDEX "_page_v_blocks_talk_grid_order_idx" ON "_page_v_blocks_talk_grid" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_talk_grid_parent_id_idx" ON "_page_v_blocks_talk_grid" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_talk_grid_path_idx" ON "_page_v_blocks_talk_grid" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_talk_grid_locale_idx" ON "_page_v_blocks_talk_grid" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_talk_grid_topic_idx" ON "_page_v_blocks_talk_grid" USING btree ("topic_id");
  CREATE INDEX "_page_v_blocks_talk_grid_section_background_section_back_idx" ON "_page_v_blocks_talk_grid" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_topic_chips_topic_items_order_idx" ON "_page_v_blocks_topic_chips_topic_items" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_topic_chips_topic_items_parent_id_idx" ON "_page_v_blocks_topic_chips_topic_items" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_topic_chips_topic_items_locale_idx" ON "_page_v_blocks_topic_chips_topic_items" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_topic_chips_topic_items_topic_idx" ON "_page_v_blocks_topic_chips_topic_items" USING btree ("topic_id");
  CREATE INDEX "_page_v_blocks_topic_chips_order_idx" ON "_page_v_blocks_topic_chips" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_topic_chips_parent_id_idx" ON "_page_v_blocks_topic_chips" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_topic_chips_path_idx" ON "_page_v_blocks_topic_chips" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_topic_chips_locale_idx" ON "_page_v_blocks_topic_chips" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_topic_chips_section_background_section_ba_idx" ON "_page_v_blocks_topic_chips" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_shopify_product_order_idx" ON "_page_v_blocks_shopify_product" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_shopify_product_parent_id_idx" ON "_page_v_blocks_shopify_product" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_shopify_product_path_idx" ON "_page_v_blocks_shopify_product" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_shopify_product_locale_idx" ON "_page_v_blocks_shopify_product" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_shopify_product_section_background_sectio_idx" ON "_page_v_blocks_shopify_product" USING btree ("section_background_media_id");
  CREATE INDEX "talk_ai_takeaways_order_idx" ON "talk_ai_takeaways" USING btree ("_order");
  CREATE INDEX "talk_ai_takeaways_parent_id_idx" ON "talk_ai_takeaways" USING btree ("_parent_id");
  CREATE INDEX "talk_ai_takeaways_locale_idx" ON "talk_ai_takeaways" USING btree ("_locale");
  CREATE INDEX "talk_ai_questions_order_idx" ON "talk_ai_questions" USING btree ("_order");
  CREATE INDEX "talk_ai_questions_parent_id_idx" ON "talk_ai_questions" USING btree ("_parent_id");
  CREATE INDEX "talk_ai_questions_locale_idx" ON "talk_ai_questions" USING btree ("_locale");
  CREATE INDEX "talk_ai_pull_quotes_order_idx" ON "talk_ai_pull_quotes" USING btree ("_order");
  CREATE INDEX "talk_ai_pull_quotes_parent_id_idx" ON "talk_ai_pull_quotes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "talk_slug_idx" ON "talk" USING btree ("slug");
  CREATE INDEX "talk_updated_at_idx" ON "talk" USING btree ("updated_at");
  CREATE INDEX "talk_created_at_idx" ON "talk" USING btree ("created_at");
  CREATE INDEX "talk__status_idx" ON "talk" USING btree ("_status");
  CREATE INDEX "talk_meta_meta_image_idx" ON "talk_locales" USING btree ("meta_image_id");
  CREATE UNIQUE INDEX "talk_locales_locale_parent_id_unique" ON "talk_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "talk_rels_order_idx" ON "talk_rels" USING btree ("order");
  CREATE INDEX "talk_rels_parent_idx" ON "talk_rels" USING btree ("parent_id");
  CREATE INDEX "talk_rels_path_idx" ON "talk_rels" USING btree ("path");
  CREATE INDEX "talk_rels_topic_id_idx" ON "talk_rels" USING btree ("topic_id");
  CREATE INDEX "_talk_v_version_ai_takeaways_order_idx" ON "_talk_v_version_ai_takeaways" USING btree ("_order");
  CREATE INDEX "_talk_v_version_ai_takeaways_parent_id_idx" ON "_talk_v_version_ai_takeaways" USING btree ("_parent_id");
  CREATE INDEX "_talk_v_version_ai_takeaways_locale_idx" ON "_talk_v_version_ai_takeaways" USING btree ("_locale");
  CREATE INDEX "_talk_v_version_ai_questions_order_idx" ON "_talk_v_version_ai_questions" USING btree ("_order");
  CREATE INDEX "_talk_v_version_ai_questions_parent_id_idx" ON "_talk_v_version_ai_questions" USING btree ("_parent_id");
  CREATE INDEX "_talk_v_version_ai_questions_locale_idx" ON "_talk_v_version_ai_questions" USING btree ("_locale");
  CREATE INDEX "_talk_v_version_ai_pull_quotes_order_idx" ON "_talk_v_version_ai_pull_quotes" USING btree ("_order");
  CREATE INDEX "_talk_v_version_ai_pull_quotes_parent_id_idx" ON "_talk_v_version_ai_pull_quotes" USING btree ("_parent_id");
  CREATE INDEX "_talk_v_parent_idx" ON "_talk_v" USING btree ("parent_id");
  CREATE INDEX "_talk_v_version_version_slug_idx" ON "_talk_v" USING btree ("version_slug");
  CREATE INDEX "_talk_v_version_version_updated_at_idx" ON "_talk_v" USING btree ("version_updated_at");
  CREATE INDEX "_talk_v_version_version_created_at_idx" ON "_talk_v" USING btree ("version_created_at");
  CREATE INDEX "_talk_v_version_version__status_idx" ON "_talk_v" USING btree ("version__status");
  CREATE INDEX "_talk_v_created_at_idx" ON "_talk_v" USING btree ("created_at");
  CREATE INDEX "_talk_v_updated_at_idx" ON "_talk_v" USING btree ("updated_at");
  CREATE INDEX "_talk_v_snapshot_idx" ON "_talk_v" USING btree ("snapshot");
  CREATE INDEX "_talk_v_published_locale_idx" ON "_talk_v" USING btree ("published_locale");
  CREATE INDEX "_talk_v_latest_idx" ON "_talk_v" USING btree ("latest");
  CREATE INDEX "_talk_v_version_meta_version_meta_image_idx" ON "_talk_v_locales" USING btree ("version_meta_image_id");
  CREATE UNIQUE INDEX "_talk_v_locales_locale_parent_id_unique" ON "_talk_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_talk_v_rels_order_idx" ON "_talk_v_rels" USING btree ("order");
  CREATE INDEX "_talk_v_rels_parent_idx" ON "_talk_v_rels" USING btree ("parent_id");
  CREATE INDEX "_talk_v_rels_path_idx" ON "_talk_v_rels" USING btree ("path");
  CREATE INDEX "_talk_v_rels_topic_id_idx" ON "_talk_v_rels" USING btree ("topic_id");
  CREATE UNIQUE INDEX "topic_slug_idx" ON "topic" USING btree ("slug");
  CREATE INDEX "topic_updated_at_idx" ON "topic" USING btree ("updated_at");
  CREATE INDEX "topic_created_at_idx" ON "topic" USING btree ("created_at");
  CREATE INDEX "topic_meta_meta_image_idx" ON "topic_locales" USING btree ("meta_image_id");
  CREATE UNIQUE INDEX "topic_locales_locale_parent_id_unique" ON "topic_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "gsec_blocks_talk_grid_talk_items_order_idx" ON "gsec_blocks_talk_grid_talk_items" USING btree ("_order");
  CREATE INDEX "gsec_blocks_talk_grid_talk_items_parent_id_idx" ON "gsec_blocks_talk_grid_talk_items" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_talk_grid_talk_items_locale_idx" ON "gsec_blocks_talk_grid_talk_items" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_talk_grid_talk_items_talk_idx" ON "gsec_blocks_talk_grid_talk_items" USING btree ("talk_id");
  CREATE INDEX "gsec_blocks_talk_grid_order_idx" ON "gsec_blocks_talk_grid" USING btree ("_order");
  CREATE INDEX "gsec_blocks_talk_grid_parent_id_idx" ON "gsec_blocks_talk_grid" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_talk_grid_path_idx" ON "gsec_blocks_talk_grid" USING btree ("_path");
  CREATE INDEX "gsec_blocks_talk_grid_locale_idx" ON "gsec_blocks_talk_grid" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_talk_grid_topic_idx" ON "gsec_blocks_talk_grid" USING btree ("topic_id");
  CREATE INDEX "gsec_blocks_talk_grid_section_background_section_backgro_idx" ON "gsec_blocks_talk_grid" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_topic_chips_topic_items_order_idx" ON "gsec_blocks_topic_chips_topic_items" USING btree ("_order");
  CREATE INDEX "gsec_blocks_topic_chips_topic_items_parent_id_idx" ON "gsec_blocks_topic_chips_topic_items" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_topic_chips_topic_items_locale_idx" ON "gsec_blocks_topic_chips_topic_items" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_topic_chips_topic_items_topic_idx" ON "gsec_blocks_topic_chips_topic_items" USING btree ("topic_id");
  CREATE INDEX "gsec_blocks_topic_chips_order_idx" ON "gsec_blocks_topic_chips" USING btree ("_order");
  CREATE INDEX "gsec_blocks_topic_chips_parent_id_idx" ON "gsec_blocks_topic_chips" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_topic_chips_path_idx" ON "gsec_blocks_topic_chips" USING btree ("_path");
  CREATE INDEX "gsec_blocks_topic_chips_locale_idx" ON "gsec_blocks_topic_chips" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_topic_chips_section_background_section_backg_idx" ON "gsec_blocks_topic_chips" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_shopify_product_order_idx" ON "gsec_blocks_shopify_product" USING btree ("_order");
  CREATE INDEX "gsec_blocks_shopify_product_parent_id_idx" ON "gsec_blocks_shopify_product" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_shopify_product_path_idx" ON "gsec_blocks_shopify_product" USING btree ("_path");
  CREATE INDEX "gsec_blocks_shopify_product_locale_idx" ON "gsec_blocks_shopify_product" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_shopify_product_section_background_section_b_idx" ON "gsec_blocks_shopify_product" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_talk_grid_talk_items_order_idx" ON "_gsec_v_blocks_talk_grid_talk_items" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_talk_grid_talk_items_parent_id_idx" ON "_gsec_v_blocks_talk_grid_talk_items" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_talk_grid_talk_items_locale_idx" ON "_gsec_v_blocks_talk_grid_talk_items" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_talk_grid_talk_items_talk_idx" ON "_gsec_v_blocks_talk_grid_talk_items" USING btree ("talk_id");
  CREATE INDEX "_gsec_v_blocks_talk_grid_order_idx" ON "_gsec_v_blocks_talk_grid" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_talk_grid_parent_id_idx" ON "_gsec_v_blocks_talk_grid" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_talk_grid_path_idx" ON "_gsec_v_blocks_talk_grid" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_talk_grid_locale_idx" ON "_gsec_v_blocks_talk_grid" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_talk_grid_topic_idx" ON "_gsec_v_blocks_talk_grid" USING btree ("topic_id");
  CREATE INDEX "_gsec_v_blocks_talk_grid_section_background_section_back_idx" ON "_gsec_v_blocks_talk_grid" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_topic_chips_topic_items_order_idx" ON "_gsec_v_blocks_topic_chips_topic_items" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_topic_chips_topic_items_parent_id_idx" ON "_gsec_v_blocks_topic_chips_topic_items" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_topic_chips_topic_items_locale_idx" ON "_gsec_v_blocks_topic_chips_topic_items" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_topic_chips_topic_items_topic_idx" ON "_gsec_v_blocks_topic_chips_topic_items" USING btree ("topic_id");
  CREATE INDEX "_gsec_v_blocks_topic_chips_order_idx" ON "_gsec_v_blocks_topic_chips" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_topic_chips_parent_id_idx" ON "_gsec_v_blocks_topic_chips" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_topic_chips_path_idx" ON "_gsec_v_blocks_topic_chips" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_topic_chips_locale_idx" ON "_gsec_v_blocks_topic_chips" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_topic_chips_section_background_section_ba_idx" ON "_gsec_v_blocks_topic_chips" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_shopify_product_order_idx" ON "_gsec_v_blocks_shopify_product" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_shopify_product_parent_id_idx" ON "_gsec_v_blocks_shopify_product" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_shopify_product_path_idx" ON "_gsec_v_blocks_shopify_product" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_shopify_product_locale_idx" ON "_gsec_v_blocks_shopify_product" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_shopify_product_section_background_sectio_idx" ON "_gsec_v_blocks_shopify_product" USING btree ("section_background_media_id");
  CREATE INDEX "presets_blocks_talk_grid_talk_items_order_idx" ON "presets_blocks_talk_grid_talk_items" USING btree ("_order");
  CREATE INDEX "presets_blocks_talk_grid_talk_items_parent_id_idx" ON "presets_blocks_talk_grid_talk_items" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_talk_grid_talk_items_talk_idx" ON "presets_blocks_talk_grid_talk_items" USING btree ("talk_id");
  CREATE INDEX "presets_blocks_talk_grid_order_idx" ON "presets_blocks_talk_grid" USING btree ("_order");
  CREATE INDEX "presets_blocks_talk_grid_parent_id_idx" ON "presets_blocks_talk_grid" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_talk_grid_path_idx" ON "presets_blocks_talk_grid" USING btree ("_path");
  CREATE INDEX "presets_blocks_talk_grid_topic_idx" ON "presets_blocks_talk_grid" USING btree ("topic_id");
  CREATE INDEX "presets_blocks_talk_grid_section_background_section_back_idx" ON "presets_blocks_talk_grid" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_talk_grid_locales_locale_parent_id_unique" ON "presets_blocks_talk_grid_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_topic_chips_topic_items_order_idx" ON "presets_blocks_topic_chips_topic_items" USING btree ("_order");
  CREATE INDEX "presets_blocks_topic_chips_topic_items_parent_id_idx" ON "presets_blocks_topic_chips_topic_items" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_topic_chips_topic_items_topic_idx" ON "presets_blocks_topic_chips_topic_items" USING btree ("topic_id");
  CREATE INDEX "presets_blocks_topic_chips_order_idx" ON "presets_blocks_topic_chips" USING btree ("_order");
  CREATE INDEX "presets_blocks_topic_chips_parent_id_idx" ON "presets_blocks_topic_chips" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_topic_chips_path_idx" ON "presets_blocks_topic_chips" USING btree ("_path");
  CREATE INDEX "presets_blocks_topic_chips_section_background_section_ba_idx" ON "presets_blocks_topic_chips" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_topic_chips_locales_locale_parent_id_unique" ON "presets_blocks_topic_chips_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_shopify_product_order_idx" ON "presets_blocks_shopify_product" USING btree ("_order");
  CREATE INDEX "presets_blocks_shopify_product_parent_id_idx" ON "presets_blocks_shopify_product" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_shopify_product_path_idx" ON "presets_blocks_shopify_product" USING btree ("_path");
  CREATE INDEX "presets_blocks_shopify_product_section_background_sectio_idx" ON "presets_blocks_shopify_product" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_shopify_product_locales_locale_parent_id_uniq" ON "presets_blocks_shopify_product_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_talk_fk" FOREIGN KEY ("talk_id") REFERENCES "public"."talk"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_topic_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topic"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_talk_id_idx" ON "payload_locked_documents_rels" USING btree ("talk_id");
  CREATE INDEX "payload_locked_documents_rels_topic_id_idx" ON "payload_locked_documents_rels" USING btree ("topic_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_talk_grid_talk_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_talk_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_topic_chips_topic_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_topic_chips" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_shopify_product" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_talk_grid_talk_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_talk_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_topic_chips_topic_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_topic_chips" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_shopify_product" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "talk_ai_takeaways" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "talk_ai_questions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "talk_ai_pull_quotes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "talk" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "talk_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "talk_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_talk_v_version_ai_takeaways" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_talk_v_version_ai_questions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_talk_v_version_ai_pull_quotes" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_talk_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_talk_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_talk_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "topic" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "topic_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_talk_grid_talk_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_talk_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_topic_chips_topic_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_topic_chips" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_shopify_product" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_talk_grid_talk_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_talk_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_topic_chips_topic_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_topic_chips" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_shopify_product" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_talk_grid_talk_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_talk_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_talk_grid_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_topic_chips_topic_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_topic_chips" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_topic_chips_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_shopify_product" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_shopify_product_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "page_blocks_talk_grid_talk_items" CASCADE;
  DROP TABLE "page_blocks_talk_grid" CASCADE;
  DROP TABLE "page_blocks_topic_chips_topic_items" CASCADE;
  DROP TABLE "page_blocks_topic_chips" CASCADE;
  DROP TABLE "page_blocks_shopify_product" CASCADE;
  DROP TABLE "_page_v_blocks_talk_grid_talk_items" CASCADE;
  DROP TABLE "_page_v_blocks_talk_grid" CASCADE;
  DROP TABLE "_page_v_blocks_topic_chips_topic_items" CASCADE;
  DROP TABLE "_page_v_blocks_topic_chips" CASCADE;
  DROP TABLE "_page_v_blocks_shopify_product" CASCADE;
  DROP TABLE "talk_ai_takeaways" CASCADE;
  DROP TABLE "talk_ai_questions" CASCADE;
  DROP TABLE "talk_ai_pull_quotes" CASCADE;
  DROP TABLE "talk" CASCADE;
  DROP TABLE "talk_locales" CASCADE;
  DROP TABLE "talk_rels" CASCADE;
  DROP TABLE "_talk_v_version_ai_takeaways" CASCADE;
  DROP TABLE "_talk_v_version_ai_questions" CASCADE;
  DROP TABLE "_talk_v_version_ai_pull_quotes" CASCADE;
  DROP TABLE "_talk_v" CASCADE;
  DROP TABLE "_talk_v_locales" CASCADE;
  DROP TABLE "_talk_v_rels" CASCADE;
  DROP TABLE "topic" CASCADE;
  DROP TABLE "topic_locales" CASCADE;
  DROP TABLE "gsec_blocks_talk_grid_talk_items" CASCADE;
  DROP TABLE "gsec_blocks_talk_grid" CASCADE;
  DROP TABLE "gsec_blocks_topic_chips_topic_items" CASCADE;
  DROP TABLE "gsec_blocks_topic_chips" CASCADE;
  DROP TABLE "gsec_blocks_shopify_product" CASCADE;
  DROP TABLE "_gsec_v_blocks_talk_grid_talk_items" CASCADE;
  DROP TABLE "_gsec_v_blocks_talk_grid" CASCADE;
  DROP TABLE "_gsec_v_blocks_topic_chips_topic_items" CASCADE;
  DROP TABLE "_gsec_v_blocks_topic_chips" CASCADE;
  DROP TABLE "_gsec_v_blocks_shopify_product" CASCADE;
  DROP TABLE "presets_blocks_talk_grid_talk_items" CASCADE;
  DROP TABLE "presets_blocks_talk_grid" CASCADE;
  DROP TABLE "presets_blocks_talk_grid_locales" CASCADE;
  DROP TABLE "presets_blocks_topic_chips_topic_items" CASCADE;
  DROP TABLE "presets_blocks_topic_chips" CASCADE;
  DROP TABLE "presets_blocks_topic_chips_locales" CASCADE;
  DROP TABLE "presets_blocks_shopify_product" CASCADE;
  DROP TABLE "presets_blocks_shopify_product_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_talk_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_topic_fk";
  
  DROP INDEX "payload_locked_documents_rels_talk_id_idx";
  DROP INDEX "payload_locked_documents_rels_topic_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "talk_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "topic_id";
  DROP TYPE "public"."enum_page_blocks_talk_grid_source";
  DROP TYPE "public"."enum_page_blocks_talk_grid_kind";
  DROP TYPE "public"."enum_page_blocks_talk_grid_section_theme";
  DROP TYPE "public"."enum_page_blocks_talk_grid_section_max_width";
  DROP TYPE "public"."enum_page_blocks_talk_grid_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_talk_grid_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_topic_chips_section_theme";
  DROP TYPE "public"."enum_page_blocks_topic_chips_section_max_width";
  DROP TYPE "public"."enum_page_blocks_topic_chips_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_topic_chips_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_shopify_product_section_theme";
  DROP TYPE "public"."enum_page_blocks_shopify_product_section_max_width";
  DROP TYPE "public"."enum_page_blocks_shopify_product_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_shopify_product_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_talk_grid_source";
  DROP TYPE "public"."enum__page_v_blocks_talk_grid_kind";
  DROP TYPE "public"."enum__page_v_blocks_talk_grid_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_talk_grid_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_talk_grid_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_talk_grid_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_topic_chips_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_topic_chips_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_topic_chips_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_topic_chips_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_shopify_product_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_shopify_product_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_shopify_product_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_shopify_product_section_padding_x";
  DROP TYPE "public"."enum_talk_kind";
  DROP TYPE "public"."enum_talk_required_tier";
  DROP TYPE "public"."enum_talk_ai_status";
  DROP TYPE "public"."enum_talk_status";
  DROP TYPE "public"."enum_talk_meta_robots";
  DROP TYPE "public"."enum__talk_v_version_kind";
  DROP TYPE "public"."enum__talk_v_version_required_tier";
  DROP TYPE "public"."enum__talk_v_version_ai_status";
  DROP TYPE "public"."enum__talk_v_version_status";
  DROP TYPE "public"."enum__talk_v_published_locale";
  DROP TYPE "public"."enum__talk_v_version_meta_robots";
  DROP TYPE "public"."enum_topic_meta_robots";
  DROP TYPE "public"."enum_gsec_blocks_talk_grid_source";
  DROP TYPE "public"."enum_gsec_blocks_talk_grid_kind";
  DROP TYPE "public"."enum_gsec_blocks_talk_grid_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_talk_grid_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_talk_grid_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_talk_grid_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_topic_chips_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_topic_chips_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_topic_chips_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_topic_chips_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_shopify_product_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_shopify_product_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_shopify_product_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_shopify_product_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_talk_grid_source";
  DROP TYPE "public"."enum__gsec_v_blocks_talk_grid_kind";
  DROP TYPE "public"."enum__gsec_v_blocks_talk_grid_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_talk_grid_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_talk_grid_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_talk_grid_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_topic_chips_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_topic_chips_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_topic_chips_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_topic_chips_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_shopify_product_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_shopify_product_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_shopify_product_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_shopify_product_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_talk_grid_source";
  DROP TYPE "public"."enum_presets_blocks_talk_grid_kind";
  DROP TYPE "public"."enum_presets_blocks_talk_grid_section_theme";
  DROP TYPE "public"."enum_presets_blocks_talk_grid_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_talk_grid_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_talk_grid_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_topic_chips_section_theme";
  DROP TYPE "public"."enum_presets_blocks_topic_chips_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_topic_chips_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_topic_chips_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_shopify_product_section_theme";
  DROP TYPE "public"."enum_presets_blocks_shopify_product_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_shopify_product_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_shopify_product_section_padding_x";`)
}
