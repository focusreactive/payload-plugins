import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_stats_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_stats_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_stats_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_stats_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_stats_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_stats_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_stats_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_stats_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_stats_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_stats_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_stats_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_stats_section_max_width" AS ENUM('none', 'base');
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
  	"section_padding_y" "enum_page_blocks_stats_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_stats_section_padding_x" DEFAULT 'base',
  	"section_max_width" "enum_page_blocks_stats_section_max_width" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
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
  	"section_padding_y" "enum__page_v_blocks_stats_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_stats_section_padding_x" DEFAULT 'base',
  	"section_max_width" "enum__page_v_blocks_stats_section_max_width" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_uuid" varchar,
  	"block_name" varchar
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
  	"section_padding_y" "enum_presets_blocks_stats_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_stats_section_padding_x" DEFAULT 'base',
  	"section_max_width" "enum_presets_blocks_stats_section_max_width" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"block_name" varchar
  );
  
  ALTER TABLE "page_blocks_stats_items" ADD CONSTRAINT "page_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_stats" ADD CONSTRAINT "page_blocks_stats_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_stats" ADD CONSTRAINT "page_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_stats_items" ADD CONSTRAINT "_page_v_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_stats" ADD CONSTRAINT "_page_v_blocks_stats_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_stats" ADD CONSTRAINT "_page_v_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_stats_items" ADD CONSTRAINT "presets_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_stats" ADD CONSTRAINT "presets_blocks_stats_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_stats" ADD CONSTRAINT "presets_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_stats_items_order_idx" ON "page_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "page_blocks_stats_items_parent_id_idx" ON "page_blocks_stats_items" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_stats_items_locale_idx" ON "page_blocks_stats_items" USING btree ("_locale");
  CREATE INDEX "page_blocks_stats_order_idx" ON "page_blocks_stats" USING btree ("_order");
  CREATE INDEX "page_blocks_stats_parent_id_idx" ON "page_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_stats_path_idx" ON "page_blocks_stats" USING btree ("_path");
  CREATE INDEX "page_blocks_stats_locale_idx" ON "page_blocks_stats" USING btree ("_locale");
  CREATE INDEX "page_blocks_stats_section_background_section_background__idx" ON "page_blocks_stats" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_stats_items_order_idx" ON "_page_v_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_stats_items_parent_id_idx" ON "_page_v_blocks_stats_items" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_stats_items_locale_idx" ON "_page_v_blocks_stats_items" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_stats_order_idx" ON "_page_v_blocks_stats" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_stats_parent_id_idx" ON "_page_v_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_stats_path_idx" ON "_page_v_blocks_stats" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_stats_locale_idx" ON "_page_v_blocks_stats" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_stats_section_background_section_backgrou_idx" ON "_page_v_blocks_stats" USING btree ("section_background_media_id");
  CREATE INDEX "presets_blocks_stats_items_order_idx" ON "presets_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "presets_blocks_stats_items_parent_id_idx" ON "presets_blocks_stats_items" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_stats_items_locale_idx" ON "presets_blocks_stats_items" USING btree ("_locale");
  CREATE INDEX "presets_blocks_stats_order_idx" ON "presets_blocks_stats" USING btree ("_order");
  CREATE INDEX "presets_blocks_stats_parent_id_idx" ON "presets_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_stats_path_idx" ON "presets_blocks_stats" USING btree ("_path");
  CREATE INDEX "presets_blocks_stats_section_background_section_backgrou_idx" ON "presets_blocks_stats" USING btree ("section_background_media_id");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "page_blocks_stats_items" CASCADE;
  DROP TABLE "page_blocks_stats" CASCADE;
  DROP TABLE "_page_v_blocks_stats_items" CASCADE;
  DROP TABLE "_page_v_blocks_stats" CASCADE;
  DROP TABLE "presets_blocks_stats_items" CASCADE;
  DROP TABLE "presets_blocks_stats" CASCADE;
  DROP TYPE "public"."enum_page_blocks_stats_section_theme";
  DROP TYPE "public"."enum_page_blocks_stats_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_stats_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_stats_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_stats_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_stats_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_stats_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_stats_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_stats_section_theme";
  DROP TYPE "public"."enum_presets_blocks_stats_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_stats_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_stats_section_max_width";`);
}
