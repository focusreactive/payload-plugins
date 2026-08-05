import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// NOTE: down() is irreversible once any row holds the 'it' locale - it recreates
// the locale enums without 'it' and the column casts throw on existing Italian
// content. Treat this migration as forward-only on a database with content.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_generated_pages_blocks_faq_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_generated_pages_blocks_faq_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_generated_pages_blocks_faq_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_generated_pages_blocks_faq_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_generated_pages_blocks_content_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_generated_pages_blocks_content_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_generated_pages_blocks_content_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_generated_pages_blocks_content_layout" AS ENUM('image-text', 'text-image');
  CREATE TYPE "public"."enum_generated_pages_blocks_content_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_generated_pages_blocks_content_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_generated_pages_blocks_content_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_generated_pages_blocks_content_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_generated_pages_blocks_stats_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_generated_pages_blocks_stats_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_generated_pages_blocks_stats_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_generated_pages_blocks_stats_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_generated_pages_blocks_cta_band_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_generated_pages_blocks_cta_band_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_generated_pages_blocks_cta_band_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_generated_pages_blocks_cta_band_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_generated_pages_blocks_cta_band_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_generated_pages_blocks_cta_band_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_generated_pages_blocks_cta_band_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_generated_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_faq_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_faq_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_faq_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_faq_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_content_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_content_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_content_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_content_layout" AS ENUM('image-text', 'text-image');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_content_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_content_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_content_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_content_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_stats_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_stats_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_stats_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_stats_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_cta_band_actions_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_cta_band_actions_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_cta_band_actions_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_cta_band_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_cta_band_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_cta_band_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__generated_pages_v_blocks_cta_band_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__generated_pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__generated_pages_v_published_locale" AS ENUM('en', 'es', 'it');
  ALTER TYPE "public"."_locales" ADD VALUE 'it';
  ALTER TYPE "public"."enum__page_v_published_locale" ADD VALUE 'it';
  ALTER TYPE "public"."enum__gsec_v_published_locale" ADD VALUE 'it';
  ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE 'it';
  ALTER TYPE "public"."enum__header_v_published_locale" ADD VALUE 'it';
  ALTER TYPE "public"."enum__footer_v_published_locale" ADD VALUE 'it';
  ALTER TYPE "public"."enum__site_settings_v_published_locale" ADD VALUE 'it';
  CREATE TABLE "conditions_symptoms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"symptom" varchar NOT NULL
  );
  
  CREATE TABLE "conditions_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL
  );
  
  CREATE TABLE "conditions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "conditions_locales" (
  	"title" varchar NOT NULL,
  	"intro" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "cities_narrative_hints" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"hint" varchar NOT NULL
  );
  
  CREATE TABLE "cities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"country" varchar NOT NULL,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "generated_pages_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "generated_pages_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"section_theme" "enum_generated_pages_blocks_faq_section_theme",
  	"section_max_width" "enum_generated_pages_blocks_faq_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_generated_pages_blocks_faq_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_generated_pages_blocks_faq_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "generated_pages_blocks_content_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_generated_pages_blocks_content_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_generated_pages_blocks_content_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum_generated_pages_blocks_content_actions_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "generated_pages_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"layout" "enum_generated_pages_blocks_content_layout" DEFAULT 'image-text',
  	"image_id" integer,
  	"content" jsonb,
  	"section_theme" "enum_generated_pages_blocks_content_section_theme",
  	"section_max_width" "enum_generated_pages_blocks_content_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_generated_pages_blocks_content_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_generated_pages_blocks_content_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "generated_pages_blocks_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "generated_pages_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_theme" "enum_generated_pages_blocks_stats_section_theme",
  	"section_max_width" "enum_generated_pages_blocks_stats_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_generated_pages_blocks_stats_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_generated_pages_blocks_stats_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "generated_pages_blocks_cta_band_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_generated_pages_blocks_cta_band_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_generated_pages_blocks_cta_band_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum_generated_pages_blocks_cta_band_actions_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "generated_pages_blocks_cta_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"section_theme" "enum_generated_pages_blocks_cta_band_section_theme",
  	"section_max_width" "enum_generated_pages_blocks_cta_band_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_generated_pages_blocks_cta_band_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_generated_pages_blocks_cta_band_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "generated_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"header_id" integer,
  	"footer_id" integer,
  	"condition_id" integer,
  	"city_id" integer,
  	"slug" varchar,
  	"provenance_generated_at" timestamp(3) with time zone,
  	"provenance_generation_model" varchar,
  	"provenance_generation_inputs" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_generated_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "generated_pages_locales" (
  	"title" varchar,
  	"narrative" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "generated_pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locale" "_locales",
  	"page_id" integer,
  	"posts_id" integer
  );
  
  CREATE TABLE "_generated_pages_v_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_generated_pages_v_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"section_theme" "enum__generated_pages_v_blocks_faq_section_theme",
  	"section_max_width" "enum__generated_pages_v_blocks_faq_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__generated_pages_v_blocks_faq_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__generated_pages_v_blocks_faq_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_generated_pages_v_blocks_content_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__generated_pages_v_blocks_content_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum__generated_pages_v_blocks_content_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum__generated_pages_v_blocks_content_actions_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_generated_pages_v_blocks_content" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"layout" "enum__generated_pages_v_blocks_content_layout" DEFAULT 'image-text',
  	"image_id" integer,
  	"content" jsonb,
  	"section_theme" "enum__generated_pages_v_blocks_content_section_theme",
  	"section_max_width" "enum__generated_pages_v_blocks_content_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__generated_pages_v_blocks_content_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__generated_pages_v_blocks_content_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_generated_pages_v_blocks_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_generated_pages_v_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"section_theme" "enum__generated_pages_v_blocks_stats_section_theme",
  	"section_max_width" "enum__generated_pages_v_blocks_stats_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__generated_pages_v_blocks_stats_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__generated_pages_v_blocks_stats_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_generated_pages_v_blocks_cta_band_actions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__generated_pages_v_blocks_cta_band_actions_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum__generated_pages_v_blocks_cta_band_actions_custom_page",
  	"label" varchar,
  	"appearance" "enum__generated_pages_v_blocks_cta_band_actions_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_generated_pages_v_blocks_cta_band" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"section_theme" "enum__generated_pages_v_blocks_cta_band_section_theme",
  	"section_max_width" "enum__generated_pages_v_blocks_cta_band_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__generated_pages_v_blocks_cta_band_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__generated_pages_v_blocks_cta_band_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_generated_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_header_id" integer,
  	"version_footer_id" integer,
  	"version_condition_id" integer,
  	"version_city_id" integer,
  	"version_slug" varchar,
  	"version_provenance_generated_at" timestamp(3) with time zone,
  	"version_provenance_generation_model" varchar,
  	"version_provenance_generation_inputs" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__generated_pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__generated_pages_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_generated_pages_v_locales" (
  	"version_title" varchar,
  	"version_narrative" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_generated_pages_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locale" "_locales",
  	"page_id" integer,
  	"posts_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "conditions_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "cities_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "generated_pages_id" integer;
  ALTER TABLE "conditions_symptoms" ADD CONSTRAINT "conditions_symptoms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_faq" ADD CONSTRAINT "conditions_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_locales" ADD CONSTRAINT "conditions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "cities_narrative_hints" ADD CONSTRAINT "cities_narrative_hints_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "generated_pages_blocks_faq_items" ADD CONSTRAINT "generated_pages_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."generated_pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "generated_pages_blocks_faq" ADD CONSTRAINT "generated_pages_blocks_faq_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "generated_pages_blocks_faq" ADD CONSTRAINT "generated_pages_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."generated_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "generated_pages_blocks_content_actions" ADD CONSTRAINT "generated_pages_blocks_content_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."generated_pages_blocks_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "generated_pages_blocks_content" ADD CONSTRAINT "generated_pages_blocks_content_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "generated_pages_blocks_content" ADD CONSTRAINT "generated_pages_blocks_content_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "generated_pages_blocks_content" ADD CONSTRAINT "generated_pages_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."generated_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "generated_pages_blocks_stats_items" ADD CONSTRAINT "generated_pages_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."generated_pages_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "generated_pages_blocks_stats" ADD CONSTRAINT "generated_pages_blocks_stats_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "generated_pages_blocks_stats" ADD CONSTRAINT "generated_pages_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."generated_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "generated_pages_blocks_cta_band_actions" ADD CONSTRAINT "generated_pages_blocks_cta_band_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."generated_pages_blocks_cta_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "generated_pages_blocks_cta_band" ADD CONSTRAINT "generated_pages_blocks_cta_band_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "generated_pages_blocks_cta_band" ADD CONSTRAINT "generated_pages_blocks_cta_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."generated_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "generated_pages" ADD CONSTRAINT "generated_pages_header_id_header_id_fk" FOREIGN KEY ("header_id") REFERENCES "public"."header"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "generated_pages" ADD CONSTRAINT "generated_pages_footer_id_footer_id_fk" FOREIGN KEY ("footer_id") REFERENCES "public"."footer"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "generated_pages" ADD CONSTRAINT "generated_pages_condition_id_conditions_id_fk" FOREIGN KEY ("condition_id") REFERENCES "public"."conditions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "generated_pages" ADD CONSTRAINT "generated_pages_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "generated_pages_locales" ADD CONSTRAINT "generated_pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."generated_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "generated_pages_rels" ADD CONSTRAINT "generated_pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."generated_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "generated_pages_rels" ADD CONSTRAINT "generated_pages_rels_page_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "generated_pages_rels" ADD CONSTRAINT "generated_pages_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_generated_pages_v_blocks_faq_items" ADD CONSTRAINT "_generated_pages_v_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_generated_pages_v_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_generated_pages_v_blocks_faq" ADD CONSTRAINT "_generated_pages_v_blocks_faq_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_generated_pages_v_blocks_faq" ADD CONSTRAINT "_generated_pages_v_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_generated_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_generated_pages_v_blocks_content_actions" ADD CONSTRAINT "_generated_pages_v_blocks_content_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_generated_pages_v_blocks_content"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_generated_pages_v_blocks_content" ADD CONSTRAINT "_generated_pages_v_blocks_content_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_generated_pages_v_blocks_content" ADD CONSTRAINT "_generated_pages_v_blocks_content_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_generated_pages_v_blocks_content" ADD CONSTRAINT "_generated_pages_v_blocks_content_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_generated_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_generated_pages_v_blocks_stats_items" ADD CONSTRAINT "_generated_pages_v_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_generated_pages_v_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_generated_pages_v_blocks_stats" ADD CONSTRAINT "_generated_pages_v_blocks_stats_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_generated_pages_v_blocks_stats" ADD CONSTRAINT "_generated_pages_v_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_generated_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_generated_pages_v_blocks_cta_band_actions" ADD CONSTRAINT "_generated_pages_v_blocks_cta_band_actions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_generated_pages_v_blocks_cta_band"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_generated_pages_v_blocks_cta_band" ADD CONSTRAINT "_generated_pages_v_blocks_cta_band_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_generated_pages_v_blocks_cta_band" ADD CONSTRAINT "_generated_pages_v_blocks_cta_band_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_generated_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_generated_pages_v" ADD CONSTRAINT "_generated_pages_v_parent_id_generated_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."generated_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_generated_pages_v" ADD CONSTRAINT "_generated_pages_v_version_header_id_header_id_fk" FOREIGN KEY ("version_header_id") REFERENCES "public"."header"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_generated_pages_v" ADD CONSTRAINT "_generated_pages_v_version_footer_id_footer_id_fk" FOREIGN KEY ("version_footer_id") REFERENCES "public"."footer"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_generated_pages_v" ADD CONSTRAINT "_generated_pages_v_version_condition_id_conditions_id_fk" FOREIGN KEY ("version_condition_id") REFERENCES "public"."conditions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_generated_pages_v" ADD CONSTRAINT "_generated_pages_v_version_city_id_cities_id_fk" FOREIGN KEY ("version_city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_generated_pages_v_locales" ADD CONSTRAINT "_generated_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_generated_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_generated_pages_v_rels" ADD CONSTRAINT "_generated_pages_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_generated_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_generated_pages_v_rels" ADD CONSTRAINT "_generated_pages_v_rels_page_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_generated_pages_v_rels" ADD CONSTRAINT "_generated_pages_v_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "conditions_symptoms_order_idx" ON "conditions_symptoms" USING btree ("_order");
  CREATE INDEX "conditions_symptoms_parent_id_idx" ON "conditions_symptoms" USING btree ("_parent_id");
  CREATE INDEX "conditions_symptoms_locale_idx" ON "conditions_symptoms" USING btree ("_locale");
  CREATE INDEX "conditions_faq_order_idx" ON "conditions_faq" USING btree ("_order");
  CREATE INDEX "conditions_faq_parent_id_idx" ON "conditions_faq" USING btree ("_parent_id");
  CREATE INDEX "conditions_faq_locale_idx" ON "conditions_faq" USING btree ("_locale");
  CREATE UNIQUE INDEX "conditions_slug_idx" ON "conditions" USING btree ("slug");
  CREATE INDEX "conditions_updated_at_idx" ON "conditions" USING btree ("updated_at");
  CREATE INDEX "conditions_created_at_idx" ON "conditions" USING btree ("created_at");
  CREATE UNIQUE INDEX "conditions_locales_locale_parent_id_unique" ON "conditions_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "cities_narrative_hints_order_idx" ON "cities_narrative_hints" USING btree ("_order");
  CREATE INDEX "cities_narrative_hints_parent_id_idx" ON "cities_narrative_hints" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "cities_slug_idx" ON "cities" USING btree ("slug");
  CREATE INDEX "cities_updated_at_idx" ON "cities" USING btree ("updated_at");
  CREATE INDEX "cities_created_at_idx" ON "cities" USING btree ("created_at");
  CREATE INDEX "generated_pages_blocks_faq_items_order_idx" ON "generated_pages_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "generated_pages_blocks_faq_items_parent_id_idx" ON "generated_pages_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "generated_pages_blocks_faq_items_locale_idx" ON "generated_pages_blocks_faq_items" USING btree ("_locale");
  CREATE INDEX "generated_pages_blocks_faq_order_idx" ON "generated_pages_blocks_faq" USING btree ("_order");
  CREATE INDEX "generated_pages_blocks_faq_parent_id_idx" ON "generated_pages_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "generated_pages_blocks_faq_path_idx" ON "generated_pages_blocks_faq" USING btree ("_path");
  CREATE INDEX "generated_pages_blocks_faq_locale_idx" ON "generated_pages_blocks_faq" USING btree ("_locale");
  CREATE INDEX "generated_pages_blocks_faq_section_background_section_ba_idx" ON "generated_pages_blocks_faq" USING btree ("section_background_media_id");
  CREATE INDEX "generated_pages_blocks_content_actions_order_idx" ON "generated_pages_blocks_content_actions" USING btree ("_order");
  CREATE INDEX "generated_pages_blocks_content_actions_parent_id_idx" ON "generated_pages_blocks_content_actions" USING btree ("_parent_id");
  CREATE INDEX "generated_pages_blocks_content_actions_locale_idx" ON "generated_pages_blocks_content_actions" USING btree ("_locale");
  CREATE INDEX "generated_pages_blocks_content_order_idx" ON "generated_pages_blocks_content" USING btree ("_order");
  CREATE INDEX "generated_pages_blocks_content_parent_id_idx" ON "generated_pages_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "generated_pages_blocks_content_path_idx" ON "generated_pages_blocks_content" USING btree ("_path");
  CREATE INDEX "generated_pages_blocks_content_locale_idx" ON "generated_pages_blocks_content" USING btree ("_locale");
  CREATE INDEX "generated_pages_blocks_content_image_idx" ON "generated_pages_blocks_content" USING btree ("image_id");
  CREATE INDEX "generated_pages_blocks_content_section_background_sectio_idx" ON "generated_pages_blocks_content" USING btree ("section_background_media_id");
  CREATE INDEX "generated_pages_blocks_stats_items_order_idx" ON "generated_pages_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "generated_pages_blocks_stats_items_parent_id_idx" ON "generated_pages_blocks_stats_items" USING btree ("_parent_id");
  CREATE INDEX "generated_pages_blocks_stats_items_locale_idx" ON "generated_pages_blocks_stats_items" USING btree ("_locale");
  CREATE INDEX "generated_pages_blocks_stats_order_idx" ON "generated_pages_blocks_stats" USING btree ("_order");
  CREATE INDEX "generated_pages_blocks_stats_parent_id_idx" ON "generated_pages_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "generated_pages_blocks_stats_path_idx" ON "generated_pages_blocks_stats" USING btree ("_path");
  CREATE INDEX "generated_pages_blocks_stats_locale_idx" ON "generated_pages_blocks_stats" USING btree ("_locale");
  CREATE INDEX "generated_pages_blocks_stats_section_background_section__idx" ON "generated_pages_blocks_stats" USING btree ("section_background_media_id");
  CREATE INDEX "generated_pages_blocks_cta_band_actions_order_idx" ON "generated_pages_blocks_cta_band_actions" USING btree ("_order");
  CREATE INDEX "generated_pages_blocks_cta_band_actions_parent_id_idx" ON "generated_pages_blocks_cta_band_actions" USING btree ("_parent_id");
  CREATE INDEX "generated_pages_blocks_cta_band_actions_locale_idx" ON "generated_pages_blocks_cta_band_actions" USING btree ("_locale");
  CREATE INDEX "generated_pages_blocks_cta_band_order_idx" ON "generated_pages_blocks_cta_band" USING btree ("_order");
  CREATE INDEX "generated_pages_blocks_cta_band_parent_id_idx" ON "generated_pages_blocks_cta_band" USING btree ("_parent_id");
  CREATE INDEX "generated_pages_blocks_cta_band_path_idx" ON "generated_pages_blocks_cta_band" USING btree ("_path");
  CREATE INDEX "generated_pages_blocks_cta_band_locale_idx" ON "generated_pages_blocks_cta_band" USING btree ("_locale");
  CREATE INDEX "generated_pages_blocks_cta_band_section_background_secti_idx" ON "generated_pages_blocks_cta_band" USING btree ("section_background_media_id");
  CREATE INDEX "generated_pages_header_idx" ON "generated_pages" USING btree ("header_id");
  CREATE INDEX "generated_pages_footer_idx" ON "generated_pages" USING btree ("footer_id");
  CREATE INDEX "generated_pages_condition_idx" ON "generated_pages" USING btree ("condition_id");
  CREATE INDEX "generated_pages_city_idx" ON "generated_pages" USING btree ("city_id");
  CREATE UNIQUE INDEX "generated_pages_slug_idx" ON "generated_pages" USING btree ("slug");
  CREATE INDEX "generated_pages_updated_at_idx" ON "generated_pages" USING btree ("updated_at");
  CREATE INDEX "generated_pages_created_at_idx" ON "generated_pages" USING btree ("created_at");
  CREATE INDEX "generated_pages__status_idx" ON "generated_pages" USING btree ("_status");
  CREATE UNIQUE INDEX "generated_pages_locales_locale_parent_id_unique" ON "generated_pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "generated_pages_rels_order_idx" ON "generated_pages_rels" USING btree ("order");
  CREATE INDEX "generated_pages_rels_parent_idx" ON "generated_pages_rels" USING btree ("parent_id");
  CREATE INDEX "generated_pages_rels_path_idx" ON "generated_pages_rels" USING btree ("path");
  CREATE INDEX "generated_pages_rels_locale_idx" ON "generated_pages_rels" USING btree ("locale");
  CREATE INDEX "generated_pages_rels_page_id_idx" ON "generated_pages_rels" USING btree ("page_id","locale");
  CREATE INDEX "generated_pages_rels_posts_id_idx" ON "generated_pages_rels" USING btree ("posts_id","locale");
  CREATE INDEX "_generated_pages_v_blocks_faq_items_order_idx" ON "_generated_pages_v_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "_generated_pages_v_blocks_faq_items_parent_id_idx" ON "_generated_pages_v_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "_generated_pages_v_blocks_faq_items_locale_idx" ON "_generated_pages_v_blocks_faq_items" USING btree ("_locale");
  CREATE INDEX "_generated_pages_v_blocks_faq_order_idx" ON "_generated_pages_v_blocks_faq" USING btree ("_order");
  CREATE INDEX "_generated_pages_v_blocks_faq_parent_id_idx" ON "_generated_pages_v_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "_generated_pages_v_blocks_faq_path_idx" ON "_generated_pages_v_blocks_faq" USING btree ("_path");
  CREATE INDEX "_generated_pages_v_blocks_faq_locale_idx" ON "_generated_pages_v_blocks_faq" USING btree ("_locale");
  CREATE INDEX "_generated_pages_v_blocks_faq_section_background_section_idx" ON "_generated_pages_v_blocks_faq" USING btree ("section_background_media_id");
  CREATE INDEX "_generated_pages_v_blocks_content_actions_order_idx" ON "_generated_pages_v_blocks_content_actions" USING btree ("_order");
  CREATE INDEX "_generated_pages_v_blocks_content_actions_parent_id_idx" ON "_generated_pages_v_blocks_content_actions" USING btree ("_parent_id");
  CREATE INDEX "_generated_pages_v_blocks_content_actions_locale_idx" ON "_generated_pages_v_blocks_content_actions" USING btree ("_locale");
  CREATE INDEX "_generated_pages_v_blocks_content_order_idx" ON "_generated_pages_v_blocks_content" USING btree ("_order");
  CREATE INDEX "_generated_pages_v_blocks_content_parent_id_idx" ON "_generated_pages_v_blocks_content" USING btree ("_parent_id");
  CREATE INDEX "_generated_pages_v_blocks_content_path_idx" ON "_generated_pages_v_blocks_content" USING btree ("_path");
  CREATE INDEX "_generated_pages_v_blocks_content_locale_idx" ON "_generated_pages_v_blocks_content" USING btree ("_locale");
  CREATE INDEX "_generated_pages_v_blocks_content_image_idx" ON "_generated_pages_v_blocks_content" USING btree ("image_id");
  CREATE INDEX "_generated_pages_v_blocks_content_section_background_sec_idx" ON "_generated_pages_v_blocks_content" USING btree ("section_background_media_id");
  CREATE INDEX "_generated_pages_v_blocks_stats_items_order_idx" ON "_generated_pages_v_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "_generated_pages_v_blocks_stats_items_parent_id_idx" ON "_generated_pages_v_blocks_stats_items" USING btree ("_parent_id");
  CREATE INDEX "_generated_pages_v_blocks_stats_items_locale_idx" ON "_generated_pages_v_blocks_stats_items" USING btree ("_locale");
  CREATE INDEX "_generated_pages_v_blocks_stats_order_idx" ON "_generated_pages_v_blocks_stats" USING btree ("_order");
  CREATE INDEX "_generated_pages_v_blocks_stats_parent_id_idx" ON "_generated_pages_v_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "_generated_pages_v_blocks_stats_path_idx" ON "_generated_pages_v_blocks_stats" USING btree ("_path");
  CREATE INDEX "_generated_pages_v_blocks_stats_locale_idx" ON "_generated_pages_v_blocks_stats" USING btree ("_locale");
  CREATE INDEX "_generated_pages_v_blocks_stats_section_background_secti_idx" ON "_generated_pages_v_blocks_stats" USING btree ("section_background_media_id");
  CREATE INDEX "_generated_pages_v_blocks_cta_band_actions_order_idx" ON "_generated_pages_v_blocks_cta_band_actions" USING btree ("_order");
  CREATE INDEX "_generated_pages_v_blocks_cta_band_actions_parent_id_idx" ON "_generated_pages_v_blocks_cta_band_actions" USING btree ("_parent_id");
  CREATE INDEX "_generated_pages_v_blocks_cta_band_actions_locale_idx" ON "_generated_pages_v_blocks_cta_band_actions" USING btree ("_locale");
  CREATE INDEX "_generated_pages_v_blocks_cta_band_order_idx" ON "_generated_pages_v_blocks_cta_band" USING btree ("_order");
  CREATE INDEX "_generated_pages_v_blocks_cta_band_parent_id_idx" ON "_generated_pages_v_blocks_cta_band" USING btree ("_parent_id");
  CREATE INDEX "_generated_pages_v_blocks_cta_band_path_idx" ON "_generated_pages_v_blocks_cta_band" USING btree ("_path");
  CREATE INDEX "_generated_pages_v_blocks_cta_band_locale_idx" ON "_generated_pages_v_blocks_cta_band" USING btree ("_locale");
  CREATE INDEX "_generated_pages_v_blocks_cta_band_section_background_se_idx" ON "_generated_pages_v_blocks_cta_band" USING btree ("section_background_media_id");
  CREATE INDEX "_generated_pages_v_parent_idx" ON "_generated_pages_v" USING btree ("parent_id");
  CREATE INDEX "_generated_pages_v_version_version_header_idx" ON "_generated_pages_v" USING btree ("version_header_id");
  CREATE INDEX "_generated_pages_v_version_version_footer_idx" ON "_generated_pages_v" USING btree ("version_footer_id");
  CREATE INDEX "_generated_pages_v_version_version_condition_idx" ON "_generated_pages_v" USING btree ("version_condition_id");
  CREATE INDEX "_generated_pages_v_version_version_city_idx" ON "_generated_pages_v" USING btree ("version_city_id");
  CREATE INDEX "_generated_pages_v_version_version_slug_idx" ON "_generated_pages_v" USING btree ("version_slug");
  CREATE INDEX "_generated_pages_v_version_version_updated_at_idx" ON "_generated_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_generated_pages_v_version_version_created_at_idx" ON "_generated_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_generated_pages_v_version_version__status_idx" ON "_generated_pages_v" USING btree ("version__status");
  CREATE INDEX "_generated_pages_v_created_at_idx" ON "_generated_pages_v" USING btree ("created_at");
  CREATE INDEX "_generated_pages_v_updated_at_idx" ON "_generated_pages_v" USING btree ("updated_at");
  CREATE INDEX "_generated_pages_v_snapshot_idx" ON "_generated_pages_v" USING btree ("snapshot");
  CREATE INDEX "_generated_pages_v_published_locale_idx" ON "_generated_pages_v" USING btree ("published_locale");
  CREATE INDEX "_generated_pages_v_latest_idx" ON "_generated_pages_v" USING btree ("latest");
  CREATE UNIQUE INDEX "_generated_pages_v_locales_locale_parent_id_unique" ON "_generated_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_generated_pages_v_rels_order_idx" ON "_generated_pages_v_rels" USING btree ("order");
  CREATE INDEX "_generated_pages_v_rels_parent_idx" ON "_generated_pages_v_rels" USING btree ("parent_id");
  CREATE INDEX "_generated_pages_v_rels_path_idx" ON "_generated_pages_v_rels" USING btree ("path");
  CREATE INDEX "_generated_pages_v_rels_locale_idx" ON "_generated_pages_v_rels" USING btree ("locale");
  CREATE INDEX "_generated_pages_v_rels_page_id_idx" ON "_generated_pages_v_rels" USING btree ("page_id","locale");
  CREATE INDEX "_generated_pages_v_rels_posts_id_idx" ON "_generated_pages_v_rels" USING btree ("posts_id","locale");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cities_fk" FOREIGN KEY ("cities_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_generated_pages_fk" FOREIGN KEY ("generated_pages_id") REFERENCES "public"."generated_pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_conditions_id_idx" ON "payload_locked_documents_rels" USING btree ("conditions_id");
  CREATE INDEX "payload_locked_documents_rels_cities_id_idx" ON "payload_locked_documents_rels" USING btree ("cities_id");
  CREATE INDEX "payload_locked_documents_rels_generated_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("generated_pages_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "conditions_symptoms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cities_narrative_hints" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "cities" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "generated_pages_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "generated_pages_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "generated_pages_blocks_content_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "generated_pages_blocks_content" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "generated_pages_blocks_stats_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "generated_pages_blocks_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "generated_pages_blocks_cta_band_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "generated_pages_blocks_cta_band" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "generated_pages" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "generated_pages_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "generated_pages_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_generated_pages_v_blocks_faq_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_generated_pages_v_blocks_faq" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_generated_pages_v_blocks_content_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_generated_pages_v_blocks_content" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_generated_pages_v_blocks_stats_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_generated_pages_v_blocks_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_generated_pages_v_blocks_cta_band_actions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_generated_pages_v_blocks_cta_band" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_generated_pages_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_generated_pages_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_generated_pages_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "conditions_symptoms" CASCADE;
  DROP TABLE "conditions_faq" CASCADE;
  DROP TABLE "conditions" CASCADE;
  DROP TABLE "conditions_locales" CASCADE;
  DROP TABLE "cities_narrative_hints" CASCADE;
  DROP TABLE "cities" CASCADE;
  DROP TABLE "generated_pages_blocks_faq_items" CASCADE;
  DROP TABLE "generated_pages_blocks_faq" CASCADE;
  DROP TABLE "generated_pages_blocks_content_actions" CASCADE;
  DROP TABLE "generated_pages_blocks_content" CASCADE;
  DROP TABLE "generated_pages_blocks_stats_items" CASCADE;
  DROP TABLE "generated_pages_blocks_stats" CASCADE;
  DROP TABLE "generated_pages_blocks_cta_band_actions" CASCADE;
  DROP TABLE "generated_pages_blocks_cta_band" CASCADE;
  DROP TABLE "generated_pages" CASCADE;
  DROP TABLE "generated_pages_locales" CASCADE;
  DROP TABLE "generated_pages_rels" CASCADE;
  DROP TABLE "_generated_pages_v_blocks_faq_items" CASCADE;
  DROP TABLE "_generated_pages_v_blocks_faq" CASCADE;
  DROP TABLE "_generated_pages_v_blocks_content_actions" CASCADE;
  DROP TABLE "_generated_pages_v_blocks_content" CASCADE;
  DROP TABLE "_generated_pages_v_blocks_stats_items" CASCADE;
  DROP TABLE "_generated_pages_v_blocks_stats" CASCADE;
  DROP TABLE "_generated_pages_v_blocks_cta_band_actions" CASCADE;
  DROP TABLE "_generated_pages_v_blocks_cta_band" CASCADE;
  DROP TABLE "_generated_pages_v" CASCADE;
  DROP TABLE "_generated_pages_v_locales" CASCADE;
  DROP TABLE "_generated_pages_v_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_conditions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_cities_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_generated_pages_fk";
  
  ALTER TABLE "media_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_hero_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_hero" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_content_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_content" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_faq_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_faq" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_testimonials_list_testimonial_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "page_blocks_testimonials_list" ALTER COLUMN "_locale" SET DATA TYPE text;
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
  ALTER TABLE "_page_v_blocks_testimonials_list_testimonial_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_testimonials_list" ALTER COLUMN "_locale" SET DATA TYPE text;
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
  ALTER TABLE "_page_v_blocks_raw_html" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_global_section_slot" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_version_breadcrumbs" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_page_v_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_hero_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_hero" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_content_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_content" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_faq_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_faq" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_testimonials_list_testimonial_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_testimonials_list" ALTER COLUMN "_locale" SET DATA TYPE text;
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
  ALTER TABLE "gsec_blocks_raw_html" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "gsec_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_hero_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_hero" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_content_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_content" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_faq_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_faq" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_testimonials_list_testimonial_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_testimonials_list" ALTER COLUMN "_locale" SET DATA TYPE text;
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
  ALTER TABLE "_gsec_v_blocks_raw_html" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "categories_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "posts_faq_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "posts_cta_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "posts_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "posts_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "_posts_v_version_faq_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_posts_v_version_cta_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_posts_v_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_posts_v_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "testimonials_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
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
  ALTER TABLE "redirects_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "redirects_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_hero_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_hero_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_content_actions" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_content_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_faq_items" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_faq_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_testimonials_list_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
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
  ALTER TABLE "presets_blocks_raw_html_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "presets_rels" ALTER COLUMN "locale" SET DATA TYPE text;
  ALTER TABLE "site_settings_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  ALTER TABLE "_site_settings_v_locales" ALTER COLUMN "_locale" SET DATA TYPE text;
  DROP TYPE "public"."_locales";
  CREATE TYPE "public"."_locales" AS ENUM('en', 'es');
  ALTER TABLE "media_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_hero_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_hero" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_content_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_content" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_faq_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_faq" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_testimonials_list_testimonial_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "page_blocks_testimonials_list" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
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
  ALTER TABLE "_page_v_blocks_testimonials_list_testimonial_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_testimonials_list" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
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
  ALTER TABLE "_page_v_blocks_raw_html" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_blocks_global_section_slot" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_version_breadcrumbs" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v_rels" ALTER COLUMN "locale" SET DATA TYPE "public"."_locales" USING "locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_hero_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_hero" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_content_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_content" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_faq_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_faq" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_testimonials_list_testimonial_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_blocks_testimonials_list" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
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
  ALTER TABLE "gsec_blocks_raw_html" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "gsec_rels" ALTER COLUMN "locale" SET DATA TYPE "public"."_locales" USING "locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_hero_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_hero" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_content_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_content" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_faq_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_faq" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_testimonials_list_testimonial_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_blocks_testimonials_list" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
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
  ALTER TABLE "_gsec_v_blocks_raw_html" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_gsec_v_rels" ALTER COLUMN "locale" SET DATA TYPE "public"."_locales" USING "locale"::"public"."_locales";
  ALTER TABLE "categories_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "posts_faq_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "posts_cta_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "posts_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "posts_rels" ALTER COLUMN "locale" SET DATA TYPE "public"."_locales" USING "locale"::"public"."_locales";
  ALTER TABLE "_posts_v_version_faq_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_posts_v_version_cta_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_posts_v_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_posts_v_rels" ALTER COLUMN "locale" SET DATA TYPE "public"."_locales" USING "locale"::"public"."_locales";
  ALTER TABLE "testimonials_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
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
  ALTER TABLE "redirects_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "redirects_rels" ALTER COLUMN "locale" SET DATA TYPE "public"."_locales" USING "locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_hero_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_hero_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_content_actions" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_content_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_faq_items" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_faq_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_blocks_testimonials_list_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
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
  ALTER TABLE "presets_blocks_raw_html_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "presets_rels" ALTER COLUMN "locale" SET DATA TYPE "public"."_locales" USING "locale"::"public"."_locales";
  ALTER TABLE "site_settings_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_site_settings_v_locales" ALTER COLUMN "_locale" SET DATA TYPE "public"."_locales" USING "_locale"::"public"."_locales";
  ALTER TABLE "_page_v" ALTER COLUMN "published_locale" SET DATA TYPE text;
  DROP TYPE "public"."enum__page_v_published_locale";
  CREATE TYPE "public"."enum__page_v_published_locale" AS ENUM('en', 'es');
  ALTER TABLE "_page_v" ALTER COLUMN "published_locale" SET DATA TYPE "public"."enum__page_v_published_locale" USING "published_locale"::"public"."enum__page_v_published_locale";
  ALTER TABLE "_gsec_v" ALTER COLUMN "published_locale" SET DATA TYPE text;
  DROP TYPE "public"."enum__gsec_v_published_locale";
  CREATE TYPE "public"."enum__gsec_v_published_locale" AS ENUM('en', 'es');
  ALTER TABLE "_gsec_v" ALTER COLUMN "published_locale" SET DATA TYPE "public"."enum__gsec_v_published_locale" USING "published_locale"::"public"."enum__gsec_v_published_locale";
  ALTER TABLE "_posts_v" ALTER COLUMN "published_locale" SET DATA TYPE text;
  DROP TYPE "public"."enum__posts_v_published_locale";
  CREATE TYPE "public"."enum__posts_v_published_locale" AS ENUM('en', 'es');
  ALTER TABLE "_posts_v" ALTER COLUMN "published_locale" SET DATA TYPE "public"."enum__posts_v_published_locale" USING "published_locale"::"public"."enum__posts_v_published_locale";
  ALTER TABLE "_header_v" ALTER COLUMN "published_locale" SET DATA TYPE text;
  DROP TYPE "public"."enum__header_v_published_locale";
  CREATE TYPE "public"."enum__header_v_published_locale" AS ENUM('en', 'es');
  ALTER TABLE "_header_v" ALTER COLUMN "published_locale" SET DATA TYPE "public"."enum__header_v_published_locale" USING "published_locale"::"public"."enum__header_v_published_locale";
  ALTER TABLE "_footer_v" ALTER COLUMN "published_locale" SET DATA TYPE text;
  DROP TYPE "public"."enum__footer_v_published_locale";
  CREATE TYPE "public"."enum__footer_v_published_locale" AS ENUM('en', 'es');
  ALTER TABLE "_footer_v" ALTER COLUMN "published_locale" SET DATA TYPE "public"."enum__footer_v_published_locale" USING "published_locale"::"public"."enum__footer_v_published_locale";
  ALTER TABLE "_site_settings_v" ALTER COLUMN "published_locale" SET DATA TYPE text;
  DROP TYPE "public"."enum__site_settings_v_published_locale";
  CREATE TYPE "public"."enum__site_settings_v_published_locale" AS ENUM('en', 'es');
  ALTER TABLE "_site_settings_v" ALTER COLUMN "published_locale" SET DATA TYPE "public"."enum__site_settings_v_published_locale" USING "published_locale"::"public"."enum__site_settings_v_published_locale";
  DROP INDEX "payload_locked_documents_rels_conditions_id_idx";
  DROP INDEX "payload_locked_documents_rels_cities_id_idx";
  DROP INDEX "payload_locked_documents_rels_generated_pages_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "conditions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "cities_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "generated_pages_id";
  DROP TYPE "public"."enum_generated_pages_blocks_faq_section_theme";
  DROP TYPE "public"."enum_generated_pages_blocks_faq_section_max_width";
  DROP TYPE "public"."enum_generated_pages_blocks_faq_section_padding_y";
  DROP TYPE "public"."enum_generated_pages_blocks_faq_section_padding_x";
  DROP TYPE "public"."enum_generated_pages_blocks_content_actions_type";
  DROP TYPE "public"."enum_generated_pages_blocks_content_actions_custom_page";
  DROP TYPE "public"."enum_generated_pages_blocks_content_actions_appearance";
  DROP TYPE "public"."enum_generated_pages_blocks_content_layout";
  DROP TYPE "public"."enum_generated_pages_blocks_content_section_theme";
  DROP TYPE "public"."enum_generated_pages_blocks_content_section_max_width";
  DROP TYPE "public"."enum_generated_pages_blocks_content_section_padding_y";
  DROP TYPE "public"."enum_generated_pages_blocks_content_section_padding_x";
  DROP TYPE "public"."enum_generated_pages_blocks_stats_section_theme";
  DROP TYPE "public"."enum_generated_pages_blocks_stats_section_max_width";
  DROP TYPE "public"."enum_generated_pages_blocks_stats_section_padding_y";
  DROP TYPE "public"."enum_generated_pages_blocks_stats_section_padding_x";
  DROP TYPE "public"."enum_generated_pages_blocks_cta_band_actions_type";
  DROP TYPE "public"."enum_generated_pages_blocks_cta_band_actions_custom_page";
  DROP TYPE "public"."enum_generated_pages_blocks_cta_band_actions_appearance";
  DROP TYPE "public"."enum_generated_pages_blocks_cta_band_section_theme";
  DROP TYPE "public"."enum_generated_pages_blocks_cta_band_section_max_width";
  DROP TYPE "public"."enum_generated_pages_blocks_cta_band_section_padding_y";
  DROP TYPE "public"."enum_generated_pages_blocks_cta_band_section_padding_x";
  DROP TYPE "public"."enum_generated_pages_status";
  DROP TYPE "public"."enum__generated_pages_v_blocks_faq_section_theme";
  DROP TYPE "public"."enum__generated_pages_v_blocks_faq_section_max_width";
  DROP TYPE "public"."enum__generated_pages_v_blocks_faq_section_padding_y";
  DROP TYPE "public"."enum__generated_pages_v_blocks_faq_section_padding_x";
  DROP TYPE "public"."enum__generated_pages_v_blocks_content_actions_type";
  DROP TYPE "public"."enum__generated_pages_v_blocks_content_actions_custom_page";
  DROP TYPE "public"."enum__generated_pages_v_blocks_content_actions_appearance";
  DROP TYPE "public"."enum__generated_pages_v_blocks_content_layout";
  DROP TYPE "public"."enum__generated_pages_v_blocks_content_section_theme";
  DROP TYPE "public"."enum__generated_pages_v_blocks_content_section_max_width";
  DROP TYPE "public"."enum__generated_pages_v_blocks_content_section_padding_y";
  DROP TYPE "public"."enum__generated_pages_v_blocks_content_section_padding_x";
  DROP TYPE "public"."enum__generated_pages_v_blocks_stats_section_theme";
  DROP TYPE "public"."enum__generated_pages_v_blocks_stats_section_max_width";
  DROP TYPE "public"."enum__generated_pages_v_blocks_stats_section_padding_y";
  DROP TYPE "public"."enum__generated_pages_v_blocks_stats_section_padding_x";
  DROP TYPE "public"."enum__generated_pages_v_blocks_cta_band_actions_type";
  DROP TYPE "public"."enum__generated_pages_v_blocks_cta_band_actions_custom_page";
  DROP TYPE "public"."enum__generated_pages_v_blocks_cta_band_actions_appearance";
  DROP TYPE "public"."enum__generated_pages_v_blocks_cta_band_section_theme";
  DROP TYPE "public"."enum__generated_pages_v_blocks_cta_band_section_max_width";
  DROP TYPE "public"."enum__generated_pages_v_blocks_cta_band_section_padding_y";
  DROP TYPE "public"."enum__generated_pages_v_blocks_cta_band_section_padding_x";
  DROP TYPE "public"."enum__generated_pages_v_version_status";
  DROP TYPE "public"."enum__generated_pages_v_published_locale";`)
}
