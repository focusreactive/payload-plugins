import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_vacancies_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_vacancies_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_vacancies_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_vacancies_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_vacancies_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_vacancies_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_vacancies_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_vacancies_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_vacancies_workplace" AS ENUM('onSite', 'hybrid', 'remote');
  CREATE TYPE "public"."enum_vacancies_employment_type" AS ENUM('fullTime', 'partTime', 'contract', 'internship');
  CREATE TYPE "public"."enum_vacancies_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_vacancies_meta_robots" AS ENUM('index', 'noindex');
  CREATE TYPE "public"."enum__vacancies_v_version_workplace" AS ENUM('onSite', 'hybrid', 'remote');
  CREATE TYPE "public"."enum__vacancies_v_version_employment_type" AS ENUM('fullTime', 'partTime', 'contract', 'internship');
  CREATE TYPE "public"."enum__vacancies_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__vacancies_v_published_locale" AS ENUM('en', 'de', 'ja');
  CREATE TYPE "public"."enum__vacancies_v_version_meta_robots" AS ENUM('index', 'noindex');
  CREATE TYPE "public"."enum_gsec_blocks_vacancies_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_vacancies_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_vacancies_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_vacancies_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_vacancies_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_vacancies_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_vacancies_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_vacancies_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_vacancies_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_vacancies_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_vacancies_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_vacancies_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TABLE "page_blocks_vacancies_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"empty_text" varchar DEFAULT 'No open roles right now. Check back soon.',
  	"section_theme" "enum_page_blocks_vacancies_list_section_theme",
  	"section_max_width" "enum_page_blocks_vacancies_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_vacancies_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_vacancies_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_vacancies_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"empty_text" varchar DEFAULT 'No open roles right now. Check back soon.',
  	"section_theme" "enum__page_v_blocks_vacancies_list_section_theme",
  	"section_max_width" "enum__page_v_blocks_vacancies_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_vacancies_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_vacancies_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "vacancies" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"apply_mautic_form_id" varchar,
  	"apply_mautic_form_name" varchar,
  	"apply_email" varchar,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"workplace" "enum_vacancies_workplace" DEFAULT 'hybrid',
  	"employment_type" "enum_vacancies_employment_type" DEFAULT 'fullTime',
  	"published_at" timestamp(3) with time zone,
  	"closes_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_vacancies_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "vacancies_locales" (
  	"title" varchar,
  	"summary" varchar,
  	"description" jsonb,
  	"meta_title" varchar,
  	"meta_image_id" integer,
  	"meta_description" varchar,
  	"meta_robots" "enum_vacancies_meta_robots" DEFAULT 'index',
  	"department" varchar,
  	"location" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_vacancies_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_apply_mautic_form_id" varchar,
  	"version_apply_mautic_form_name" varchar,
  	"version_apply_email" varchar,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_workplace" "enum__vacancies_v_version_workplace" DEFAULT 'hybrid',
  	"version_employment_type" "enum__vacancies_v_version_employment_type" DEFAULT 'fullTime',
  	"version_published_at" timestamp(3) with time zone,
  	"version_closes_at" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__vacancies_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__vacancies_v_published_locale",
  	"latest" boolean
  );
  
  CREATE TABLE "_vacancies_v_locales" (
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_description" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_image_id" integer,
  	"version_meta_description" varchar,
  	"version_meta_robots" "enum__vacancies_v_version_meta_robots" DEFAULT 'index',
  	"version_department" varchar,
  	"version_location" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "gsec_blocks_vacancies_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"empty_text" varchar DEFAULT 'No open roles right now. Check back soon.',
  	"section_theme" "enum_gsec_blocks_vacancies_list_section_theme",
  	"section_max_width" "enum_gsec_blocks_vacancies_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_vacancies_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_vacancies_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_vacancies_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"empty_text" varchar DEFAULT 'No open roles right now. Check back soon.',
  	"section_theme" "enum__gsec_v_blocks_vacancies_list_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_vacancies_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_vacancies_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_vacancies_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_vacancies_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_theme" "enum_presets_blocks_vacancies_list_section_theme",
  	"section_max_width" "enum_presets_blocks_vacancies_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_vacancies_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_vacancies_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_vacancies_list_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"empty_text" varchar DEFAULT 'No open roles right now. Check back soon.',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "vacancies_id" integer;
  ALTER TABLE "page_blocks_vacancies_list" ADD CONSTRAINT "page_blocks_vacancies_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_vacancies_list" ADD CONSTRAINT "page_blocks_vacancies_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_vacancies_list" ADD CONSTRAINT "_page_v_blocks_vacancies_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_vacancies_list" ADD CONSTRAINT "_page_v_blocks_vacancies_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "vacancies_locales" ADD CONSTRAINT "vacancies_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "vacancies_locales" ADD CONSTRAINT "vacancies_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."vacancies"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_vacancies_v" ADD CONSTRAINT "_vacancies_v_parent_id_vacancies_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."vacancies"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_vacancies_v_locales" ADD CONSTRAINT "_vacancies_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_vacancies_v_locales" ADD CONSTRAINT "_vacancies_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_vacancies_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_vacancies_list" ADD CONSTRAINT "gsec_blocks_vacancies_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_vacancies_list" ADD CONSTRAINT "gsec_blocks_vacancies_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_vacancies_list" ADD CONSTRAINT "_gsec_v_blocks_vacancies_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_vacancies_list" ADD CONSTRAINT "_gsec_v_blocks_vacancies_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_vacancies_list" ADD CONSTRAINT "presets_blocks_vacancies_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_vacancies_list" ADD CONSTRAINT "presets_blocks_vacancies_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_vacancies_list_locales" ADD CONSTRAINT "presets_blocks_vacancies_list_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_vacancies_list"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_vacancies_list_order_idx" ON "page_blocks_vacancies_list" USING btree ("_order");
  CREATE INDEX "page_blocks_vacancies_list_parent_id_idx" ON "page_blocks_vacancies_list" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_vacancies_list_path_idx" ON "page_blocks_vacancies_list" USING btree ("_path");
  CREATE INDEX "page_blocks_vacancies_list_locale_idx" ON "page_blocks_vacancies_list" USING btree ("_locale");
  CREATE INDEX "page_blocks_vacancies_list_section_background_section_ba_idx" ON "page_blocks_vacancies_list" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_vacancies_list_order_idx" ON "_page_v_blocks_vacancies_list" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_vacancies_list_parent_id_idx" ON "_page_v_blocks_vacancies_list" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_vacancies_list_path_idx" ON "_page_v_blocks_vacancies_list" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_vacancies_list_locale_idx" ON "_page_v_blocks_vacancies_list" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_vacancies_list_section_background_section_idx" ON "_page_v_blocks_vacancies_list" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "vacancies_slug_idx" ON "vacancies" USING btree ("slug");
  CREATE INDEX "vacancies_updated_at_idx" ON "vacancies" USING btree ("updated_at");
  CREATE INDEX "vacancies_created_at_idx" ON "vacancies" USING btree ("created_at");
  CREATE INDEX "vacancies__status_idx" ON "vacancies" USING btree ("_status");
  CREATE INDEX "vacancies_meta_meta_image_idx" ON "vacancies_locales" USING btree ("meta_image_id");
  CREATE UNIQUE INDEX "vacancies_locales_locale_parent_id_unique" ON "vacancies_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_vacancies_v_parent_idx" ON "_vacancies_v" USING btree ("parent_id");
  CREATE INDEX "_vacancies_v_version_version_slug_idx" ON "_vacancies_v" USING btree ("version_slug");
  CREATE INDEX "_vacancies_v_version_version_updated_at_idx" ON "_vacancies_v" USING btree ("version_updated_at");
  CREATE INDEX "_vacancies_v_version_version_created_at_idx" ON "_vacancies_v" USING btree ("version_created_at");
  CREATE INDEX "_vacancies_v_version_version__status_idx" ON "_vacancies_v" USING btree ("version__status");
  CREATE INDEX "_vacancies_v_created_at_idx" ON "_vacancies_v" USING btree ("created_at");
  CREATE INDEX "_vacancies_v_updated_at_idx" ON "_vacancies_v" USING btree ("updated_at");
  CREATE INDEX "_vacancies_v_snapshot_idx" ON "_vacancies_v" USING btree ("snapshot");
  CREATE INDEX "_vacancies_v_published_locale_idx" ON "_vacancies_v" USING btree ("published_locale");
  CREATE INDEX "_vacancies_v_latest_idx" ON "_vacancies_v" USING btree ("latest");
  CREATE INDEX "_vacancies_v_version_meta_version_meta_image_idx" ON "_vacancies_v_locales" USING btree ("version_meta_image_id");
  CREATE UNIQUE INDEX "_vacancies_v_locales_locale_parent_id_unique" ON "_vacancies_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "gsec_blocks_vacancies_list_order_idx" ON "gsec_blocks_vacancies_list" USING btree ("_order");
  CREATE INDEX "gsec_blocks_vacancies_list_parent_id_idx" ON "gsec_blocks_vacancies_list" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_vacancies_list_path_idx" ON "gsec_blocks_vacancies_list" USING btree ("_path");
  CREATE INDEX "gsec_blocks_vacancies_list_locale_idx" ON "gsec_blocks_vacancies_list" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_vacancies_list_section_background_section_ba_idx" ON "gsec_blocks_vacancies_list" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_vacancies_list_order_idx" ON "_gsec_v_blocks_vacancies_list" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_vacancies_list_parent_id_idx" ON "_gsec_v_blocks_vacancies_list" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_vacancies_list_path_idx" ON "_gsec_v_blocks_vacancies_list" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_vacancies_list_locale_idx" ON "_gsec_v_blocks_vacancies_list" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_vacancies_list_section_background_section_idx" ON "_gsec_v_blocks_vacancies_list" USING btree ("section_background_media_id");
  CREATE INDEX "presets_blocks_vacancies_list_order_idx" ON "presets_blocks_vacancies_list" USING btree ("_order");
  CREATE INDEX "presets_blocks_vacancies_list_parent_id_idx" ON "presets_blocks_vacancies_list" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_vacancies_list_path_idx" ON "presets_blocks_vacancies_list" USING btree ("_path");
  CREATE INDEX "presets_blocks_vacancies_list_section_background_section_idx" ON "presets_blocks_vacancies_list" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_vacancies_list_locales_locale_parent_id_uniqu" ON "presets_blocks_vacancies_list_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_vacancies_fk" FOREIGN KEY ("vacancies_id") REFERENCES "public"."vacancies"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_vacancies_id_idx" ON "payload_locked_documents_rels" USING btree ("vacancies_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_vacancies_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_vacancies_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vacancies" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "vacancies_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_vacancies_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_vacancies_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_vacancies_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_vacancies_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_vacancies_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_vacancies_list_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "page_blocks_vacancies_list" CASCADE;
  DROP TABLE "_page_v_blocks_vacancies_list" CASCADE;
  DROP TABLE "vacancies" CASCADE;
  DROP TABLE "vacancies_locales" CASCADE;
  DROP TABLE "_vacancies_v" CASCADE;
  DROP TABLE "_vacancies_v_locales" CASCADE;
  DROP TABLE "gsec_blocks_vacancies_list" CASCADE;
  DROP TABLE "_gsec_v_blocks_vacancies_list" CASCADE;
  DROP TABLE "presets_blocks_vacancies_list" CASCADE;
  DROP TABLE "presets_blocks_vacancies_list_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_vacancies_fk";
  
  DROP INDEX "payload_locked_documents_rels_vacancies_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "vacancies_id";
  DROP TYPE "public"."enum_page_blocks_vacancies_list_section_theme";
  DROP TYPE "public"."enum_page_blocks_vacancies_list_section_max_width";
  DROP TYPE "public"."enum_page_blocks_vacancies_list_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_vacancies_list_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_vacancies_list_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_vacancies_list_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_vacancies_list_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_vacancies_list_section_padding_x";
  DROP TYPE "public"."enum_vacancies_workplace";
  DROP TYPE "public"."enum_vacancies_employment_type";
  DROP TYPE "public"."enum_vacancies_status";
  DROP TYPE "public"."enum_vacancies_meta_robots";
  DROP TYPE "public"."enum__vacancies_v_version_workplace";
  DROP TYPE "public"."enum__vacancies_v_version_employment_type";
  DROP TYPE "public"."enum__vacancies_v_version_status";
  DROP TYPE "public"."enum__vacancies_v_published_locale";
  DROP TYPE "public"."enum__vacancies_v_version_meta_robots";
  DROP TYPE "public"."enum_gsec_blocks_vacancies_list_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_vacancies_list_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_vacancies_list_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_vacancies_list_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_vacancies_list_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_vacancies_list_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_vacancies_list_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_vacancies_list_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_vacancies_list_section_theme";
  DROP TYPE "public"."enum_presets_blocks_vacancies_list_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_vacancies_list_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_vacancies_list_section_padding_x";`)
}
