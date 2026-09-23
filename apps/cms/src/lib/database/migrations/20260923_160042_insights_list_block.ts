import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Hand-trimmed to the Insights list block. The generator also re-emitted drift the sandbox
// database already has (payload_jobs and friends), which would fail on replay.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_insights_list_markets" AS ENUM('uk-europe', 'canada', 'greater-china', 'se-asia', 'usa', 'japan', 'korea', 'nordics', 'south-america');
  CREATE TYPE "public"."enum_page_blocks_insights_list_view_all_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_insights_list_view_all_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_insights_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_insights_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_insights_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_insights_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_insights_list_markets" AS ENUM('uk-europe', 'canada', 'greater-china', 'se-asia', 'usa', 'japan', 'korea', 'nordics', 'south-america');
  CREATE TYPE "public"."enum__page_v_blocks_insights_list_view_all_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_insights_list_view_all_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_insights_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_insights_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_insights_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_insights_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_insights_list_markets" AS ENUM('uk-europe', 'canada', 'greater-china', 'se-asia', 'usa', 'japan', 'korea', 'nordics', 'south-america');
  CREATE TYPE "public"."enum_gsec_blocks_insights_list_view_all_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_insights_list_view_all_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_insights_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_insights_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_insights_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_insights_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_insights_list_markets" AS ENUM('uk-europe', 'canada', 'greater-china', 'se-asia', 'usa', 'japan', 'korea', 'nordics', 'south-america');
  CREATE TYPE "public"."enum__gsec_v_blocks_insights_list_view_all_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_insights_list_view_all_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_insights_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_insights_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_insights_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_insights_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_insights_list_markets" AS ENUM('uk-europe', 'canada', 'greater-china', 'se-asia', 'usa', 'japan', 'korea', 'nordics', 'south-america');
  CREATE TYPE "public"."enum_presets_blocks_insights_list_view_all_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_insights_list_view_all_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_insights_list_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_insights_list_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_insights_list_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_insights_list_section_padding_x" AS ENUM('none', 'base');
  CREATE TABLE "page_blocks_insights_list_markets" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_page_blocks_insights_list_markets",
  	"locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL
  );
  CREATE TABLE "page_blocks_insights_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"limit" numeric DEFAULT 6,
  	"view_all_type" "enum_page_blocks_insights_list_view_all_type" DEFAULT 'reference',
  	"view_all_new_tab" boolean,
  	"view_all_url" varchar,
  	"view_all_custom_page" "enum_page_blocks_insights_list_view_all_custom_page",
  	"view_all_label" varchar,
  	"section_theme" "enum_page_blocks_insights_list_section_theme",
  	"section_max_width" "enum_page_blocks_insights_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_insights_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_insights_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  CREATE TABLE "_page_v_blocks_insights_list_markets" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__page_v_blocks_insights_list_markets",
  	"locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL
  );
  CREATE TABLE "_page_v_blocks_insights_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"limit" numeric DEFAULT 6,
  	"view_all_type" "enum__page_v_blocks_insights_list_view_all_type" DEFAULT 'reference',
  	"view_all_new_tab" boolean,
  	"view_all_url" varchar,
  	"view_all_custom_page" "enum__page_v_blocks_insights_list_view_all_custom_page",
  	"view_all_label" varchar,
  	"section_theme" "enum__page_v_blocks_insights_list_section_theme",
  	"section_max_width" "enum__page_v_blocks_insights_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_insights_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_insights_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  CREATE TABLE "gsec_blocks_insights_list_markets" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_gsec_blocks_insights_list_markets",
  	"locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL
  );
  CREATE TABLE "gsec_blocks_insights_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"limit" numeric DEFAULT 6,
  	"view_all_type" "enum_gsec_blocks_insights_list_view_all_type" DEFAULT 'reference',
  	"view_all_new_tab" boolean,
  	"view_all_url" varchar,
  	"view_all_custom_page" "enum_gsec_blocks_insights_list_view_all_custom_page",
  	"view_all_label" varchar,
  	"section_theme" "enum_gsec_blocks_insights_list_section_theme",
  	"section_max_width" "enum_gsec_blocks_insights_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_insights_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_insights_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  CREATE TABLE "_gsec_v_blocks_insights_list_markets" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__gsec_v_blocks_insights_list_markets",
  	"locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL
  );
  CREATE TABLE "_gsec_v_blocks_insights_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"limit" numeric DEFAULT 6,
  	"view_all_type" "enum__gsec_v_blocks_insights_list_view_all_type" DEFAULT 'reference',
  	"view_all_new_tab" boolean,
  	"view_all_url" varchar,
  	"view_all_custom_page" "enum__gsec_v_blocks_insights_list_view_all_custom_page",
  	"view_all_label" varchar,
  	"section_theme" "enum__gsec_v_blocks_insights_list_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_insights_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_insights_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_insights_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  CREATE TABLE "presets_blocks_insights_list_markets" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_presets_blocks_insights_list_markets",
  	"id" serial PRIMARY KEY NOT NULL
  );
  CREATE TABLE "presets_blocks_insights_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"limit" numeric DEFAULT 6,
  	"view_all_type" "enum_presets_blocks_insights_list_view_all_type" DEFAULT 'reference',
  	"view_all_new_tab" boolean,
  	"view_all_url" varchar,
  	"view_all_custom_page" "enum_presets_blocks_insights_list_view_all_custom_page",
  	"section_theme" "enum_presets_blocks_insights_list_section_theme",
  	"section_max_width" "enum_presets_blocks_insights_list_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_insights_list_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_insights_list_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  CREATE TABLE "presets_blocks_insights_list_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"view_all_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  ALTER TABLE "page_blocks_insights_list_markets" ADD CONSTRAINT "page_blocks_insights_list_markets_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."page_blocks_insights_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_insights_list" ADD CONSTRAINT "page_blocks_insights_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_insights_list" ADD CONSTRAINT "page_blocks_insights_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_insights_list_markets" ADD CONSTRAINT "_page_v_blocks_insights_list_markets_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_page_v_blocks_insights_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_insights_list" ADD CONSTRAINT "_page_v_blocks_insights_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_insights_list" ADD CONSTRAINT "_page_v_blocks_insights_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_insights_list_markets" ADD CONSTRAINT "gsec_blocks_insights_list_markets_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."gsec_blocks_insights_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_insights_list" ADD CONSTRAINT "gsec_blocks_insights_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_insights_list" ADD CONSTRAINT "gsec_blocks_insights_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_insights_list_markets" ADD CONSTRAINT "_gsec_v_blocks_insights_list_markets_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_gsec_v_blocks_insights_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_insights_list" ADD CONSTRAINT "_gsec_v_blocks_insights_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_insights_list" ADD CONSTRAINT "_gsec_v_blocks_insights_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_insights_list_markets" ADD CONSTRAINT "presets_blocks_insights_list_markets_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."presets_blocks_insights_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_insights_list" ADD CONSTRAINT "presets_blocks_insights_list_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_insights_list" ADD CONSTRAINT "presets_blocks_insights_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_insights_list_locales" ADD CONSTRAINT "presets_blocks_insights_list_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_insights_list"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_insights_list_markets_order_idx" ON "page_blocks_insights_list_markets" USING btree ("order");
  CREATE INDEX "page_blocks_insights_list_markets_parent_idx" ON "page_blocks_insights_list_markets" USING btree ("parent_id");
  CREATE INDEX "page_blocks_insights_list_markets_locale_idx" ON "page_blocks_insights_list_markets" USING btree ("locale");
  CREATE INDEX "page_blocks_insights_list_order_idx" ON "page_blocks_insights_list" USING btree ("_order");
  CREATE INDEX "page_blocks_insights_list_parent_id_idx" ON "page_blocks_insights_list" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_insights_list_path_idx" ON "page_blocks_insights_list" USING btree ("_path");
  CREATE INDEX "page_blocks_insights_list_locale_idx" ON "page_blocks_insights_list" USING btree ("_locale");
  CREATE INDEX "page_blocks_insights_list_section_background_section_bac_idx" ON "page_blocks_insights_list" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_insights_list_markets_order_idx" ON "_page_v_blocks_insights_list_markets" USING btree ("order");
  CREATE INDEX "_page_v_blocks_insights_list_markets_parent_idx" ON "_page_v_blocks_insights_list_markets" USING btree ("parent_id");
  CREATE INDEX "_page_v_blocks_insights_list_markets_locale_idx" ON "_page_v_blocks_insights_list_markets" USING btree ("locale");
  CREATE INDEX "_page_v_blocks_insights_list_order_idx" ON "_page_v_blocks_insights_list" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_insights_list_parent_id_idx" ON "_page_v_blocks_insights_list" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_insights_list_path_idx" ON "_page_v_blocks_insights_list" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_insights_list_locale_idx" ON "_page_v_blocks_insights_list" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_insights_list_section_background_section__idx" ON "_page_v_blocks_insights_list" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_insights_list_markets_order_idx" ON "gsec_blocks_insights_list_markets" USING btree ("order");
  CREATE INDEX "gsec_blocks_insights_list_markets_parent_idx" ON "gsec_blocks_insights_list_markets" USING btree ("parent_id");
  CREATE INDEX "gsec_blocks_insights_list_markets_locale_idx" ON "gsec_blocks_insights_list_markets" USING btree ("locale");
  CREATE INDEX "gsec_blocks_insights_list_order_idx" ON "gsec_blocks_insights_list" USING btree ("_order");
  CREATE INDEX "gsec_blocks_insights_list_parent_id_idx" ON "gsec_blocks_insights_list" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_insights_list_path_idx" ON "gsec_blocks_insights_list" USING btree ("_path");
  CREATE INDEX "gsec_blocks_insights_list_locale_idx" ON "gsec_blocks_insights_list" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_insights_list_section_background_section_bac_idx" ON "gsec_blocks_insights_list" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_insights_list_markets_order_idx" ON "_gsec_v_blocks_insights_list_markets" USING btree ("order");
  CREATE INDEX "_gsec_v_blocks_insights_list_markets_parent_idx" ON "_gsec_v_blocks_insights_list_markets" USING btree ("parent_id");
  CREATE INDEX "_gsec_v_blocks_insights_list_markets_locale_idx" ON "_gsec_v_blocks_insights_list_markets" USING btree ("locale");
  CREATE INDEX "_gsec_v_blocks_insights_list_order_idx" ON "_gsec_v_blocks_insights_list" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_insights_list_parent_id_idx" ON "_gsec_v_blocks_insights_list" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_insights_list_path_idx" ON "_gsec_v_blocks_insights_list" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_insights_list_locale_idx" ON "_gsec_v_blocks_insights_list" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_insights_list_section_background_section__idx" ON "_gsec_v_blocks_insights_list" USING btree ("section_background_media_id");
  CREATE INDEX "presets_blocks_insights_list_markets_order_idx" ON "presets_blocks_insights_list_markets" USING btree ("order");
  CREATE INDEX "presets_blocks_insights_list_markets_parent_idx" ON "presets_blocks_insights_list_markets" USING btree ("parent_id");
  CREATE INDEX "presets_blocks_insights_list_order_idx" ON "presets_blocks_insights_list" USING btree ("_order");
  CREATE INDEX "presets_blocks_insights_list_parent_id_idx" ON "presets_blocks_insights_list" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_insights_list_path_idx" ON "presets_blocks_insights_list" USING btree ("_path");
  CREATE INDEX "presets_blocks_insights_list_section_background_section__idx" ON "presets_blocks_insights_list" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_insights_list_locales_locale_parent_id_unique" ON "presets_blocks_insights_list_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "page_blocks_insights_list_markets" CASCADE;
  DROP TABLE "page_blocks_insights_list" CASCADE;
  DROP TABLE "_page_v_blocks_insights_list_markets" CASCADE;
  DROP TABLE "_page_v_blocks_insights_list" CASCADE;
  DROP TABLE "gsec_blocks_insights_list_markets" CASCADE;
  DROP TABLE "gsec_blocks_insights_list" CASCADE;
  DROP TABLE "_gsec_v_blocks_insights_list_markets" CASCADE;
  DROP TABLE "_gsec_v_blocks_insights_list" CASCADE;
  DROP TABLE "presets_blocks_insights_list_markets" CASCADE;
  DROP TABLE "presets_blocks_insights_list" CASCADE;
  DROP TABLE "presets_blocks_insights_list_locales" CASCADE;
  DROP TYPE "public"."enum_page_blocks_insights_list_markets";
  DROP TYPE "public"."enum_page_blocks_insights_list_view_all_type";
  DROP TYPE "public"."enum_page_blocks_insights_list_view_all_custom_page";
  DROP TYPE "public"."enum_page_blocks_insights_list_section_theme";
  DROP TYPE "public"."enum_page_blocks_insights_list_section_max_width";
  DROP TYPE "public"."enum_page_blocks_insights_list_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_insights_list_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_insights_list_markets";
  DROP TYPE "public"."enum__page_v_blocks_insights_list_view_all_type";
  DROP TYPE "public"."enum__page_v_blocks_insights_list_view_all_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_insights_list_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_insights_list_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_insights_list_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_insights_list_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_insights_list_markets";
  DROP TYPE "public"."enum_gsec_blocks_insights_list_view_all_type";
  DROP TYPE "public"."enum_gsec_blocks_insights_list_view_all_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_insights_list_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_insights_list_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_insights_list_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_insights_list_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_insights_list_markets";
  DROP TYPE "public"."enum__gsec_v_blocks_insights_list_view_all_type";
  DROP TYPE "public"."enum__gsec_v_blocks_insights_list_view_all_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_insights_list_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_insights_list_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_insights_list_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_insights_list_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_insights_list_markets";
  DROP TYPE "public"."enum_presets_blocks_insights_list_view_all_type";
  DROP TYPE "public"."enum_presets_blocks_insights_list_view_all_custom_page";
  DROP TYPE "public"."enum_presets_blocks_insights_list_section_theme";
  DROP TYPE "public"."enum_presets_blocks_insights_list_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_insights_list_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_insights_list_section_padding_x";`)
}
