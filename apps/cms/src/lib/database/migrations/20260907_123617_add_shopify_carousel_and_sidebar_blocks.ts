import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_sidebar_section_sidebar_links_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_sidebar_section_sidebar_links_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_sidebar_section_sidebar_position" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum_page_blocks_sidebar_section_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_sidebar_section_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_sidebar_section_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_sidebar_section_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_shopify_carousel_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_shopify_carousel_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_shopify_carousel_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_shopify_carousel_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_sidebar_section_sidebar_links_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_sidebar_section_sidebar_links_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_sidebar_section_sidebar_position" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum__page_v_blocks_sidebar_section_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_sidebar_section_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_sidebar_section_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_sidebar_section_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_shopify_carousel_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_shopify_carousel_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_shopify_carousel_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_shopify_carousel_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_sidebar_section_sidebar_links_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_sidebar_section_sidebar_links_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_sidebar_section_sidebar_position" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum_gsec_blocks_sidebar_section_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_sidebar_section_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_sidebar_section_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_sidebar_section_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_shopify_carousel_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_shopify_carousel_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_shopify_carousel_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_shopify_carousel_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_sidebar_section_sidebar_links_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_sidebar_section_sidebar_links_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_sidebar_section_sidebar_position" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum__gsec_v_blocks_sidebar_section_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_sidebar_section_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_sidebar_section_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_sidebar_section_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_shopify_carousel_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_shopify_carousel_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_shopify_carousel_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_shopify_carousel_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_sidebar_section_sidebar_links_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_sidebar_section_sidebar_links_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_sidebar_section_sidebar_position" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum_presets_blocks_sidebar_section_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_sidebar_section_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_sidebar_section_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_sidebar_section_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_shopify_carousel_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_shopify_carousel_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_shopify_carousel_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_shopify_carousel_section_padding_x" AS ENUM('none', 'base');
  CREATE TABLE "page_blocks_sidebar_section_sidebar_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_page_blocks_sidebar_section_sidebar_links_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_page_blocks_sidebar_section_sidebar_links_custom_page",
  	"label" varchar
  );
  
  CREATE TABLE "page_blocks_sidebar_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"body" jsonb,
  	"sidebar_heading" varchar,
  	"sidebar_position" "enum_page_blocks_sidebar_section_sidebar_position" DEFAULT 'right',
  	"section_theme" "enum_page_blocks_sidebar_section_section_theme",
  	"section_max_width" "enum_page_blocks_sidebar_section_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_sidebar_section_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_sidebar_section_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_shopify_carousel_product_handles" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"handle" varchar
  );
  
  CREATE TABLE "page_blocks_shopify_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"show_price" boolean DEFAULT true,
  	"section_theme" "enum_page_blocks_shopify_carousel_section_theme",
  	"section_max_width" "enum_page_blocks_shopify_carousel_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_shopify_carousel_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_shopify_carousel_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_sidebar_section_sidebar_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__page_v_blocks_sidebar_section_sidebar_links_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum__page_v_blocks_sidebar_section_sidebar_links_custom_page",
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_sidebar_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"body" jsonb,
  	"sidebar_heading" varchar,
  	"sidebar_position" "enum__page_v_blocks_sidebar_section_sidebar_position" DEFAULT 'right',
  	"section_theme" "enum__page_v_blocks_sidebar_section_section_theme",
  	"section_max_width" "enum__page_v_blocks_sidebar_section_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_sidebar_section_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_sidebar_section_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_shopify_carousel_product_handles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"handle" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_shopify_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"show_price" boolean DEFAULT true,
  	"section_theme" "enum__page_v_blocks_shopify_carousel_section_theme",
  	"section_max_width" "enum__page_v_blocks_shopify_carousel_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_shopify_carousel_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_shopify_carousel_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_sidebar_section_sidebar_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_gsec_blocks_sidebar_section_sidebar_links_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_gsec_blocks_sidebar_section_sidebar_links_custom_page",
  	"label" varchar
  );
  
  CREATE TABLE "gsec_blocks_sidebar_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"body" jsonb,
  	"sidebar_heading" varchar,
  	"sidebar_position" "enum_gsec_blocks_sidebar_section_sidebar_position" DEFAULT 'right',
  	"section_theme" "enum_gsec_blocks_sidebar_section_section_theme",
  	"section_max_width" "enum_gsec_blocks_sidebar_section_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_sidebar_section_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_sidebar_section_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_shopify_carousel_product_handles" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"handle" varchar
  );
  
  CREATE TABLE "gsec_blocks_shopify_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"show_price" boolean DEFAULT true,
  	"section_theme" "enum_gsec_blocks_shopify_carousel_section_theme",
  	"section_max_width" "enum_gsec_blocks_shopify_carousel_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_shopify_carousel_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_shopify_carousel_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_sidebar_section_sidebar_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum__gsec_v_blocks_sidebar_section_sidebar_links_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum__gsec_v_blocks_sidebar_section_sidebar_links_custom_page",
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_sidebar_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"body" jsonb,
  	"sidebar_heading" varchar,
  	"sidebar_position" "enum__gsec_v_blocks_sidebar_section_sidebar_position" DEFAULT 'right',
  	"section_theme" "enum__gsec_v_blocks_sidebar_section_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_sidebar_section_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_sidebar_section_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_sidebar_section_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_shopify_carousel_product_handles" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"handle" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_shopify_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"show_price" boolean DEFAULT true,
  	"section_theme" "enum__gsec_v_blocks_shopify_carousel_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_shopify_carousel_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_shopify_carousel_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_shopify_carousel_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_sidebar_section_sidebar_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" "enum_presets_blocks_sidebar_section_sidebar_links_type" DEFAULT 'reference',
  	"new_tab" boolean,
  	"url" varchar,
  	"custom_page" "enum_presets_blocks_sidebar_section_sidebar_links_custom_page",
  	"label" varchar
  );
  
  CREATE TABLE "presets_blocks_sidebar_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"sidebar_position" "enum_presets_blocks_sidebar_section_sidebar_position" DEFAULT 'right' NOT NULL,
  	"section_theme" "enum_presets_blocks_sidebar_section_section_theme",
  	"section_max_width" "enum_presets_blocks_sidebar_section_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_sidebar_section_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_sidebar_section_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_sidebar_section_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"body" jsonb NOT NULL,
  	"sidebar_heading" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_shopify_carousel_product_handles" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"handle" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_shopify_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"show_price" boolean DEFAULT true,
  	"section_theme" "enum_presets_blocks_shopify_carousel_section_theme",
  	"section_max_width" "enum_presets_blocks_shopify_carousel_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_shopify_carousel_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_shopify_carousel_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_shopify_carousel_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "page_blocks_sidebar_section_sidebar_links" ADD CONSTRAINT "page_blocks_sidebar_section_sidebar_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_sidebar_section"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_sidebar_section" ADD CONSTRAINT "page_blocks_sidebar_section_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_sidebar_section" ADD CONSTRAINT "page_blocks_sidebar_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_shopify_carousel_product_handles" ADD CONSTRAINT "page_blocks_shopify_carousel_product_handles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_shopify_carousel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_shopify_carousel" ADD CONSTRAINT "page_blocks_shopify_carousel_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_shopify_carousel" ADD CONSTRAINT "page_blocks_shopify_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_sidebar_section_sidebar_links" ADD CONSTRAINT "_page_v_blocks_sidebar_section_sidebar_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_sidebar_section"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_sidebar_section" ADD CONSTRAINT "_page_v_blocks_sidebar_section_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_sidebar_section" ADD CONSTRAINT "_page_v_blocks_sidebar_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_shopify_carousel_product_handles" ADD CONSTRAINT "_page_v_blocks_shopify_carousel_product_handles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_shopify_carousel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_shopify_carousel" ADD CONSTRAINT "_page_v_blocks_shopify_carousel_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_shopify_carousel" ADD CONSTRAINT "_page_v_blocks_shopify_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_sidebar_section_sidebar_links" ADD CONSTRAINT "gsec_blocks_sidebar_section_sidebar_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_sidebar_section"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_sidebar_section" ADD CONSTRAINT "gsec_blocks_sidebar_section_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_sidebar_section" ADD CONSTRAINT "gsec_blocks_sidebar_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_shopify_carousel_product_handles" ADD CONSTRAINT "gsec_blocks_shopify_carousel_product_handles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_shopify_carousel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_shopify_carousel" ADD CONSTRAINT "gsec_blocks_shopify_carousel_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_shopify_carousel" ADD CONSTRAINT "gsec_blocks_shopify_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_sidebar_section_sidebar_links" ADD CONSTRAINT "_gsec_v_blocks_sidebar_section_sidebar_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_sidebar_section"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_sidebar_section" ADD CONSTRAINT "_gsec_v_blocks_sidebar_section_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_sidebar_section" ADD CONSTRAINT "_gsec_v_blocks_sidebar_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_shopify_carousel_product_handles" ADD CONSTRAINT "_gsec_v_blocks_shopify_carousel_product_handles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_shopify_carousel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_shopify_carousel" ADD CONSTRAINT "_gsec_v_blocks_shopify_carousel_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_shopify_carousel" ADD CONSTRAINT "_gsec_v_blocks_shopify_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_sidebar_section_sidebar_links" ADD CONSTRAINT "presets_blocks_sidebar_section_sidebar_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_sidebar_section"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_sidebar_section" ADD CONSTRAINT "presets_blocks_sidebar_section_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_sidebar_section" ADD CONSTRAINT "presets_blocks_sidebar_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_sidebar_section_locales" ADD CONSTRAINT "presets_blocks_sidebar_section_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_sidebar_section"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_shopify_carousel_product_handles" ADD CONSTRAINT "presets_blocks_shopify_carousel_product_handles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_shopify_carousel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_shopify_carousel" ADD CONSTRAINT "presets_blocks_shopify_carousel_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_shopify_carousel" ADD CONSTRAINT "presets_blocks_shopify_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_shopify_carousel_locales" ADD CONSTRAINT "presets_blocks_shopify_carousel_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_shopify_carousel"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_sidebar_section_sidebar_links_order_idx" ON "page_blocks_sidebar_section_sidebar_links" USING btree ("_order");
  CREATE INDEX "page_blocks_sidebar_section_sidebar_links_parent_id_idx" ON "page_blocks_sidebar_section_sidebar_links" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_sidebar_section_sidebar_links_locale_idx" ON "page_blocks_sidebar_section_sidebar_links" USING btree ("_locale");
  CREATE INDEX "page_blocks_sidebar_section_order_idx" ON "page_blocks_sidebar_section" USING btree ("_order");
  CREATE INDEX "page_blocks_sidebar_section_parent_id_idx" ON "page_blocks_sidebar_section" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_sidebar_section_path_idx" ON "page_blocks_sidebar_section" USING btree ("_path");
  CREATE INDEX "page_blocks_sidebar_section_locale_idx" ON "page_blocks_sidebar_section" USING btree ("_locale");
  CREATE INDEX "page_blocks_sidebar_section_section_background_section_b_idx" ON "page_blocks_sidebar_section" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_shopify_carousel_product_handles_order_idx" ON "page_blocks_shopify_carousel_product_handles" USING btree ("_order");
  CREATE INDEX "page_blocks_shopify_carousel_product_handles_parent_id_idx" ON "page_blocks_shopify_carousel_product_handles" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_shopify_carousel_product_handles_locale_idx" ON "page_blocks_shopify_carousel_product_handles" USING btree ("_locale");
  CREATE INDEX "page_blocks_shopify_carousel_order_idx" ON "page_blocks_shopify_carousel" USING btree ("_order");
  CREATE INDEX "page_blocks_shopify_carousel_parent_id_idx" ON "page_blocks_shopify_carousel" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_shopify_carousel_path_idx" ON "page_blocks_shopify_carousel" USING btree ("_path");
  CREATE INDEX "page_blocks_shopify_carousel_locale_idx" ON "page_blocks_shopify_carousel" USING btree ("_locale");
  CREATE INDEX "page_blocks_shopify_carousel_section_background_section__idx" ON "page_blocks_shopify_carousel" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_sidebar_section_sidebar_links_order_idx" ON "_page_v_blocks_sidebar_section_sidebar_links" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_sidebar_section_sidebar_links_parent_id_idx" ON "_page_v_blocks_sidebar_section_sidebar_links" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_sidebar_section_sidebar_links_locale_idx" ON "_page_v_blocks_sidebar_section_sidebar_links" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_sidebar_section_order_idx" ON "_page_v_blocks_sidebar_section" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_sidebar_section_parent_id_idx" ON "_page_v_blocks_sidebar_section" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_sidebar_section_path_idx" ON "_page_v_blocks_sidebar_section" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_sidebar_section_locale_idx" ON "_page_v_blocks_sidebar_section" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_sidebar_section_section_background_sectio_idx" ON "_page_v_blocks_sidebar_section" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_shopify_carousel_product_handles_order_idx" ON "_page_v_blocks_shopify_carousel_product_handles" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_shopify_carousel_product_handles_parent_id_idx" ON "_page_v_blocks_shopify_carousel_product_handles" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_shopify_carousel_product_handles_locale_idx" ON "_page_v_blocks_shopify_carousel_product_handles" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_shopify_carousel_order_idx" ON "_page_v_blocks_shopify_carousel" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_shopify_carousel_parent_id_idx" ON "_page_v_blocks_shopify_carousel" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_shopify_carousel_path_idx" ON "_page_v_blocks_shopify_carousel" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_shopify_carousel_locale_idx" ON "_page_v_blocks_shopify_carousel" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_shopify_carousel_section_background_secti_idx" ON "_page_v_blocks_shopify_carousel" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_sidebar_section_sidebar_links_order_idx" ON "gsec_blocks_sidebar_section_sidebar_links" USING btree ("_order");
  CREATE INDEX "gsec_blocks_sidebar_section_sidebar_links_parent_id_idx" ON "gsec_blocks_sidebar_section_sidebar_links" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_sidebar_section_sidebar_links_locale_idx" ON "gsec_blocks_sidebar_section_sidebar_links" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_sidebar_section_order_idx" ON "gsec_blocks_sidebar_section" USING btree ("_order");
  CREATE INDEX "gsec_blocks_sidebar_section_parent_id_idx" ON "gsec_blocks_sidebar_section" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_sidebar_section_path_idx" ON "gsec_blocks_sidebar_section" USING btree ("_path");
  CREATE INDEX "gsec_blocks_sidebar_section_locale_idx" ON "gsec_blocks_sidebar_section" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_sidebar_section_section_background_section_b_idx" ON "gsec_blocks_sidebar_section" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_shopify_carousel_product_handles_order_idx" ON "gsec_blocks_shopify_carousel_product_handles" USING btree ("_order");
  CREATE INDEX "gsec_blocks_shopify_carousel_product_handles_parent_id_idx" ON "gsec_blocks_shopify_carousel_product_handles" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_shopify_carousel_product_handles_locale_idx" ON "gsec_blocks_shopify_carousel_product_handles" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_shopify_carousel_order_idx" ON "gsec_blocks_shopify_carousel" USING btree ("_order");
  CREATE INDEX "gsec_blocks_shopify_carousel_parent_id_idx" ON "gsec_blocks_shopify_carousel" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_shopify_carousel_path_idx" ON "gsec_blocks_shopify_carousel" USING btree ("_path");
  CREATE INDEX "gsec_blocks_shopify_carousel_locale_idx" ON "gsec_blocks_shopify_carousel" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_shopify_carousel_section_background_section__idx" ON "gsec_blocks_shopify_carousel" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_sidebar_section_sidebar_links_order_idx" ON "_gsec_v_blocks_sidebar_section_sidebar_links" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_sidebar_section_sidebar_links_parent_id_idx" ON "_gsec_v_blocks_sidebar_section_sidebar_links" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_sidebar_section_sidebar_links_locale_idx" ON "_gsec_v_blocks_sidebar_section_sidebar_links" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_sidebar_section_order_idx" ON "_gsec_v_blocks_sidebar_section" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_sidebar_section_parent_id_idx" ON "_gsec_v_blocks_sidebar_section" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_sidebar_section_path_idx" ON "_gsec_v_blocks_sidebar_section" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_sidebar_section_locale_idx" ON "_gsec_v_blocks_sidebar_section" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_sidebar_section_section_background_sectio_idx" ON "_gsec_v_blocks_sidebar_section" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_shopify_carousel_product_handles_order_idx" ON "_gsec_v_blocks_shopify_carousel_product_handles" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_shopify_carousel_product_handles_parent_id_idx" ON "_gsec_v_blocks_shopify_carousel_product_handles" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_shopify_carousel_product_handles_locale_idx" ON "_gsec_v_blocks_shopify_carousel_product_handles" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_shopify_carousel_order_idx" ON "_gsec_v_blocks_shopify_carousel" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_shopify_carousel_parent_id_idx" ON "_gsec_v_blocks_shopify_carousel" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_shopify_carousel_path_idx" ON "_gsec_v_blocks_shopify_carousel" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_shopify_carousel_locale_idx" ON "_gsec_v_blocks_shopify_carousel" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_shopify_carousel_section_background_secti_idx" ON "_gsec_v_blocks_shopify_carousel" USING btree ("section_background_media_id");
  CREATE INDEX "presets_blocks_sidebar_section_sidebar_links_order_idx" ON "presets_blocks_sidebar_section_sidebar_links" USING btree ("_order");
  CREATE INDEX "presets_blocks_sidebar_section_sidebar_links_parent_id_idx" ON "presets_blocks_sidebar_section_sidebar_links" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_sidebar_section_sidebar_links_locale_idx" ON "presets_blocks_sidebar_section_sidebar_links" USING btree ("_locale");
  CREATE INDEX "presets_blocks_sidebar_section_order_idx" ON "presets_blocks_sidebar_section" USING btree ("_order");
  CREATE INDEX "presets_blocks_sidebar_section_parent_id_idx" ON "presets_blocks_sidebar_section" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_sidebar_section_path_idx" ON "presets_blocks_sidebar_section" USING btree ("_path");
  CREATE INDEX "presets_blocks_sidebar_section_section_background_sectio_idx" ON "presets_blocks_sidebar_section" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_sidebar_section_locales_locale_parent_id_uniq" ON "presets_blocks_sidebar_section_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_shopify_carousel_product_handles_order_idx" ON "presets_blocks_shopify_carousel_product_handles" USING btree ("_order");
  CREATE INDEX "presets_blocks_shopify_carousel_product_handles_parent_id_idx" ON "presets_blocks_shopify_carousel_product_handles" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_shopify_carousel_order_idx" ON "presets_blocks_shopify_carousel" USING btree ("_order");
  CREATE INDEX "presets_blocks_shopify_carousel_parent_id_idx" ON "presets_blocks_shopify_carousel" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_shopify_carousel_path_idx" ON "presets_blocks_shopify_carousel" USING btree ("_path");
  CREATE INDEX "presets_blocks_shopify_carousel_section_background_secti_idx" ON "presets_blocks_shopify_carousel" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_shopify_carousel_locales_locale_parent_id_uni" ON "presets_blocks_shopify_carousel_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "page_blocks_sidebar_section_sidebar_links" CASCADE;
  DROP TABLE "page_blocks_sidebar_section" CASCADE;
  DROP TABLE "page_blocks_shopify_carousel_product_handles" CASCADE;
  DROP TABLE "page_blocks_shopify_carousel" CASCADE;
  DROP TABLE "_page_v_blocks_sidebar_section_sidebar_links" CASCADE;
  DROP TABLE "_page_v_blocks_sidebar_section" CASCADE;
  DROP TABLE "_page_v_blocks_shopify_carousel_product_handles" CASCADE;
  DROP TABLE "_page_v_blocks_shopify_carousel" CASCADE;
  DROP TABLE "gsec_blocks_sidebar_section_sidebar_links" CASCADE;
  DROP TABLE "gsec_blocks_sidebar_section" CASCADE;
  DROP TABLE "gsec_blocks_shopify_carousel_product_handles" CASCADE;
  DROP TABLE "gsec_blocks_shopify_carousel" CASCADE;
  DROP TABLE "_gsec_v_blocks_sidebar_section_sidebar_links" CASCADE;
  DROP TABLE "_gsec_v_blocks_sidebar_section" CASCADE;
  DROP TABLE "_gsec_v_blocks_shopify_carousel_product_handles" CASCADE;
  DROP TABLE "_gsec_v_blocks_shopify_carousel" CASCADE;
  DROP TABLE "presets_blocks_sidebar_section_sidebar_links" CASCADE;
  DROP TABLE "presets_blocks_sidebar_section" CASCADE;
  DROP TABLE "presets_blocks_sidebar_section_locales" CASCADE;
  DROP TABLE "presets_blocks_shopify_carousel_product_handles" CASCADE;
  DROP TABLE "presets_blocks_shopify_carousel" CASCADE;
  DROP TABLE "presets_blocks_shopify_carousel_locales" CASCADE;
  DROP TYPE "public"."enum_page_blocks_sidebar_section_sidebar_links_type";
  DROP TYPE "public"."enum_page_blocks_sidebar_section_sidebar_links_custom_page";
  DROP TYPE "public"."enum_page_blocks_sidebar_section_sidebar_position";
  DROP TYPE "public"."enum_page_blocks_sidebar_section_section_theme";
  DROP TYPE "public"."enum_page_blocks_sidebar_section_section_max_width";
  DROP TYPE "public"."enum_page_blocks_sidebar_section_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_sidebar_section_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_shopify_carousel_section_theme";
  DROP TYPE "public"."enum_page_blocks_shopify_carousel_section_max_width";
  DROP TYPE "public"."enum_page_blocks_shopify_carousel_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_shopify_carousel_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_sidebar_section_sidebar_links_type";
  DROP TYPE "public"."enum__page_v_blocks_sidebar_section_sidebar_links_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_sidebar_section_sidebar_position";
  DROP TYPE "public"."enum__page_v_blocks_sidebar_section_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_sidebar_section_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_sidebar_section_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_sidebar_section_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_shopify_carousel_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_shopify_carousel_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_shopify_carousel_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_shopify_carousel_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_sidebar_section_sidebar_links_type";
  DROP TYPE "public"."enum_gsec_blocks_sidebar_section_sidebar_links_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_sidebar_section_sidebar_position";
  DROP TYPE "public"."enum_gsec_blocks_sidebar_section_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_sidebar_section_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_sidebar_section_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_sidebar_section_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_shopify_carousel_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_shopify_carousel_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_shopify_carousel_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_shopify_carousel_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_sidebar_section_sidebar_links_type";
  DROP TYPE "public"."enum__gsec_v_blocks_sidebar_section_sidebar_links_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_sidebar_section_sidebar_position";
  DROP TYPE "public"."enum__gsec_v_blocks_sidebar_section_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_sidebar_section_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_sidebar_section_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_sidebar_section_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_shopify_carousel_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_shopify_carousel_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_shopify_carousel_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_shopify_carousel_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_sidebar_section_sidebar_links_type";
  DROP TYPE "public"."enum_presets_blocks_sidebar_section_sidebar_links_custom_page";
  DROP TYPE "public"."enum_presets_blocks_sidebar_section_sidebar_position";
  DROP TYPE "public"."enum_presets_blocks_sidebar_section_section_theme";
  DROP TYPE "public"."enum_presets_blocks_sidebar_section_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_sidebar_section_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_sidebar_section_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_shopify_carousel_section_theme";
  DROP TYPE "public"."enum_presets_blocks_shopify_carousel_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_shopify_carousel_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_shopify_carousel_section_padding_x";`)
}
