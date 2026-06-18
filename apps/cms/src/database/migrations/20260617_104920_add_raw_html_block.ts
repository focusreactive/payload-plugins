import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_raw_html_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_raw_html_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_raw_html_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_raw_html_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_raw_html_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_raw_html_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_raw_html_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_raw_html_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_raw_html_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_raw_html_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_raw_html_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_raw_html_section_padding_x" AS ENUM('none', 'base');
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
  	"_uuid" varchar,
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
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_raw_html_locales" (
  	"html" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "page_blocks_raw_html" ADD CONSTRAINT "page_blocks_raw_html_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_raw_html" ADD CONSTRAINT "page_blocks_raw_html_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_raw_html" ADD CONSTRAINT "_page_v_blocks_raw_html_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_raw_html" ADD CONSTRAINT "_page_v_blocks_raw_html_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_raw_html" ADD CONSTRAINT "presets_blocks_raw_html_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_raw_html" ADD CONSTRAINT "presets_blocks_raw_html_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_raw_html_locales" ADD CONSTRAINT "presets_blocks_raw_html_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_raw_html"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_raw_html_order_idx" ON "page_blocks_raw_html" USING btree ("_order");
  CREATE INDEX "page_blocks_raw_html_parent_id_idx" ON "page_blocks_raw_html" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_raw_html_path_idx" ON "page_blocks_raw_html" USING btree ("_path");
  CREATE INDEX "page_blocks_raw_html_locale_idx" ON "page_blocks_raw_html" USING btree ("_locale");
  CREATE INDEX "page_blocks_raw_html_section_background_section_backgrou_idx" ON "page_blocks_raw_html" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_raw_html_order_idx" ON "_page_v_blocks_raw_html" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_raw_html_parent_id_idx" ON "_page_v_blocks_raw_html" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_raw_html_path_idx" ON "_page_v_blocks_raw_html" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_raw_html_locale_idx" ON "_page_v_blocks_raw_html" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_raw_html_section_background_section_backg_idx" ON "_page_v_blocks_raw_html" USING btree ("section_background_media_id");
  CREATE INDEX "presets_blocks_raw_html_order_idx" ON "presets_blocks_raw_html" USING btree ("_order");
  CREATE INDEX "presets_blocks_raw_html_parent_id_idx" ON "presets_blocks_raw_html" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_raw_html_path_idx" ON "presets_blocks_raw_html" USING btree ("_path");
  CREATE INDEX "presets_blocks_raw_html_section_background_section_backg_idx" ON "presets_blocks_raw_html" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_raw_html_locales_locale_parent_id_unique" ON "presets_blocks_raw_html_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "page_blocks_raw_html" CASCADE;
  DROP TABLE "_page_v_blocks_raw_html" CASCADE;
  DROP TABLE "presets_blocks_raw_html" CASCADE;
  DROP TABLE "presets_blocks_raw_html_locales" CASCADE;
  DROP TYPE "public"."enum_page_blocks_raw_html_section_theme";
  DROP TYPE "public"."enum_page_blocks_raw_html_section_max_width";
  DROP TYPE "public"."enum_page_blocks_raw_html_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_raw_html_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_raw_html_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_raw_html_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_raw_html_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_raw_html_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_raw_html_section_theme";
  DROP TYPE "public"."enum_presets_blocks_raw_html_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_raw_html_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_raw_html_section_padding_x";`)
}
