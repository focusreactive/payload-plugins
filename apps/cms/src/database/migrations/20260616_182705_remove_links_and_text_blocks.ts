import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "page_blocks_text_section" CASCADE;
  DROP TABLE "page_blocks_links_list_links" CASCADE;
  DROP TABLE "page_blocks_links_list" CASCADE;
  DROP TABLE "_page_v_blocks_text_section" CASCADE;
  DROP TABLE "_page_v_blocks_links_list_links" CASCADE;
  DROP TABLE "_page_v_blocks_links_list" CASCADE;
  DROP TABLE "presets_blocks_text_section" CASCADE;
  DROP TABLE "presets_blocks_text_section_locales" CASCADE;
  DROP TABLE "presets_blocks_links_list_links" CASCADE;
  DROP TABLE "presets_blocks_links_list" CASCADE;
  DROP TYPE "public"."enum_page_blocks_text_section_section_theme";
  DROP TYPE "public"."enum_page_blocks_text_section_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_text_section_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_text_section_section_max_width";
  DROP TYPE "public"."enum_page_blocks_links_list_links_link_type";
  DROP TYPE "public"."enum_page_blocks_links_list_links_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_links_list_links_link_appearance";
  DROP TYPE "public"."enum_page_blocks_links_list_align_variant";
  DROP TYPE "public"."enum_page_blocks_links_list_section_theme";
  DROP TYPE "public"."enum_page_blocks_links_list_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_links_list_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_links_list_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_text_section_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_text_section_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_text_section_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_text_section_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_links_list_links_link_type";
  DROP TYPE "public"."enum__page_v_blocks_links_list_links_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_links_list_links_link_appearance";
  DROP TYPE "public"."enum__page_v_blocks_links_list_align_variant";
  DROP TYPE "public"."enum__page_v_blocks_links_list_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_links_list_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_links_list_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_links_list_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_text_section_section_theme";
  DROP TYPE "public"."enum_presets_blocks_text_section_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_text_section_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_text_section_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_links_list_links_link_type";
  DROP TYPE "public"."enum_presets_blocks_links_list_links_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_links_list_links_link_appearance";
  DROP TYPE "public"."enum_presets_blocks_links_list_align_variant";
  DROP TYPE "public"."enum_presets_blocks_links_list_section_theme";
  DROP TYPE "public"."enum_presets_blocks_links_list_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_links_list_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_links_list_section_max_width";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_text_section_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_text_section_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_text_section_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_text_section_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_links_list_links_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_links_list_links_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_links_list_links_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_page_blocks_links_list_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_page_blocks_links_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_links_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_links_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_links_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_text_section_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_text_section_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_text_section_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_text_section_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_links_list_links_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_links_list_links_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_links_list_links_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum__page_v_blocks_links_list_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum__page_v_blocks_links_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_links_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_links_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_links_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_text_section_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_text_section_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_text_section_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_text_section_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_links_list_links_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_links_list_links_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_links_list_links_link_appearance" AS ENUM('default', 'outline', 'accent', 'ghost', 'link');
  CREATE TYPE "public"."enum_presets_blocks_links_list_align_variant" AS ENUM('left', 'center', 'right');
  CREATE TYPE "public"."enum_presets_blocks_links_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_links_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_links_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_links_list_section_max_width" AS ENUM('none', 'base');
  CREATE TABLE "page_blocks_text_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" jsonb,
  	"section_theme" "enum_page_blocks_text_section_section_theme",
  	"section_padding_y" "enum_page_blocks_text_section_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_text_section_section_padding_x" DEFAULT 'base',
  	"section_max_width" "enum_page_blocks_text_section_section_max_width" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_links_list_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_page_blocks_links_list_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_page_blocks_links_list_links_link_custom_page",
  	"link_label" varchar,
  	"link_appearance" "enum_page_blocks_links_list_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "page_blocks_links_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"align_variant" "enum_page_blocks_links_list_align_variant" DEFAULT 'left',
  	"section_theme" "enum_page_blocks_links_list_section_theme",
  	"section_padding_y" "enum_page_blocks_links_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_links_list_section_padding_x" DEFAULT 'base',
  	"section_max_width" "enum_page_blocks_links_list_section_max_width" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_text_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" jsonb,
  	"section_theme" "enum__page_v_blocks_text_section_section_theme",
  	"section_padding_y" "enum__page_v_blocks_text_section_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_text_section_section_padding_x" DEFAULT 'base',
  	"section_max_width" "enum__page_v_blocks_text_section_section_max_width" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_links_list_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_type" "enum__page_v_blocks_links_list_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__page_v_blocks_links_list_links_link_custom_page",
  	"link_label" varchar,
  	"link_appearance" "enum__page_v_blocks_links_list_links_link_appearance" DEFAULT 'default',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_links_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"align_variant" "enum__page_v_blocks_links_list_align_variant" DEFAULT 'left',
  	"section_theme" "enum__page_v_blocks_links_list_section_theme",
  	"section_padding_y" "enum__page_v_blocks_links_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_links_list_section_padding_x" DEFAULT 'base',
  	"section_max_width" "enum__page_v_blocks_links_list_section_max_width" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_text_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_theme" "enum_presets_blocks_text_section_section_theme",
  	"section_padding_y" "enum_presets_blocks_text_section_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_text_section_section_padding_x" DEFAULT 'base',
  	"section_max_width" "enum_presets_blocks_text_section_section_max_width" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_text_section_locales" (
  	"text" jsonb NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_links_list_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_presets_blocks_links_list_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_presets_blocks_links_list_links_link_custom_page",
  	"link_label" varchar NOT NULL,
  	"link_appearance" "enum_presets_blocks_links_list_links_link_appearance" DEFAULT 'default'
  );
  
  CREATE TABLE "presets_blocks_links_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"align_variant" "enum_presets_blocks_links_list_align_variant" DEFAULT 'left',
  	"section_theme" "enum_presets_blocks_links_list_section_theme",
  	"section_padding_y" "enum_presets_blocks_links_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_links_list_section_padding_x" DEFAULT 'base',
  	"section_max_width" "enum_presets_blocks_links_list_section_max_width" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"block_name" varchar
  );
  
  ALTER TABLE "page_blocks_text_section" ADD CONSTRAINT "page_blocks_text_section_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_text_section" ADD CONSTRAINT "page_blocks_text_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_links_list_links" ADD CONSTRAINT "page_blocks_links_list_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_links_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_links_list" ADD CONSTRAINT "page_blocks_links_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_links_list" ADD CONSTRAINT "page_blocks_links_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_text_section" ADD CONSTRAINT "_page_v_blocks_text_section_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_text_section" ADD CONSTRAINT "_page_v_blocks_text_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_links_list_links" ADD CONSTRAINT "_page_v_blocks_links_list_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_links_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_links_list" ADD CONSTRAINT "_page_v_blocks_links_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_links_list" ADD CONSTRAINT "_page_v_blocks_links_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_text_section" ADD CONSTRAINT "presets_blocks_text_section_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_text_section" ADD CONSTRAINT "presets_blocks_text_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_text_section_locales" ADD CONSTRAINT "presets_blocks_text_section_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_text_section"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_links_list_links" ADD CONSTRAINT "presets_blocks_links_list_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_links_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_links_list" ADD CONSTRAINT "presets_blocks_links_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_links_list" ADD CONSTRAINT "presets_blocks_links_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_text_section_order_idx" ON "page_blocks_text_section" USING btree ("_order");
  CREATE INDEX "page_blocks_text_section_parent_id_idx" ON "page_blocks_text_section" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_text_section_path_idx" ON "page_blocks_text_section" USING btree ("_path");
  CREATE INDEX "page_blocks_text_section_locale_idx" ON "page_blocks_text_section" USING btree ("_locale");
  CREATE INDEX "page_blocks_text_section_section_background_section_back_idx" ON "page_blocks_text_section" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_links_list_links_order_idx" ON "page_blocks_links_list_links" USING btree ("_order");
  CREATE INDEX "page_blocks_links_list_links_parent_id_idx" ON "page_blocks_links_list_links" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_links_list_links_locale_idx" ON "page_blocks_links_list_links" USING btree ("_locale");
  CREATE INDEX "page_blocks_links_list_order_idx" ON "page_blocks_links_list" USING btree ("_order");
  CREATE INDEX "page_blocks_links_list_parent_id_idx" ON "page_blocks_links_list" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_links_list_path_idx" ON "page_blocks_links_list" USING btree ("_path");
  CREATE INDEX "page_blocks_links_list_locale_idx" ON "page_blocks_links_list" USING btree ("_locale");
  CREATE INDEX "page_blocks_links_list_section_background_section_backgr_idx" ON "page_blocks_links_list" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_text_section_order_idx" ON "_page_v_blocks_text_section" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_text_section_parent_id_idx" ON "_page_v_blocks_text_section" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_text_section_path_idx" ON "_page_v_blocks_text_section" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_text_section_locale_idx" ON "_page_v_blocks_text_section" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_text_section_section_background_section_b_idx" ON "_page_v_blocks_text_section" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_links_list_links_order_idx" ON "_page_v_blocks_links_list_links" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_links_list_links_parent_id_idx" ON "_page_v_blocks_links_list_links" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_links_list_links_locale_idx" ON "_page_v_blocks_links_list_links" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_links_list_order_idx" ON "_page_v_blocks_links_list" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_links_list_parent_id_idx" ON "_page_v_blocks_links_list" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_links_list_path_idx" ON "_page_v_blocks_links_list" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_links_list_locale_idx" ON "_page_v_blocks_links_list" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_links_list_section_background_section_bac_idx" ON "_page_v_blocks_links_list" USING btree ("section_background_media_id");
  CREATE INDEX "presets_blocks_text_section_order_idx" ON "presets_blocks_text_section" USING btree ("_order");
  CREATE INDEX "presets_blocks_text_section_parent_id_idx" ON "presets_blocks_text_section" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_text_section_path_idx" ON "presets_blocks_text_section" USING btree ("_path");
  CREATE INDEX "presets_blocks_text_section_section_background_section_b_idx" ON "presets_blocks_text_section" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_text_section_locales_locale_parent_id_unique" ON "presets_blocks_text_section_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_links_list_links_order_idx" ON "presets_blocks_links_list_links" USING btree ("_order");
  CREATE INDEX "presets_blocks_links_list_links_parent_id_idx" ON "presets_blocks_links_list_links" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_links_list_links_locale_idx" ON "presets_blocks_links_list_links" USING btree ("_locale");
  CREATE INDEX "presets_blocks_links_list_order_idx" ON "presets_blocks_links_list" USING btree ("_order");
  CREATE INDEX "presets_blocks_links_list_parent_id_idx" ON "presets_blocks_links_list" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_links_list_path_idx" ON "presets_blocks_links_list" USING btree ("_path");
  CREATE INDEX "presets_blocks_links_list_section_background_section_bac_idx" ON "presets_blocks_links_list" USING btree ("section_background_media_id");`)
}
