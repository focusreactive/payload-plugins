import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_people_directory_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_people_directory_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_people_directory_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_people_directory_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_people_directory_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_people_directory_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_people_directory_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_people_directory_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_people_directory_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_people_directory_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_people_directory_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_people_directory_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_people_directory_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_people_directory_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_people_directory_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_people_directory_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_people_directory_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_people_directory_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_people_directory_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_people_directory_section_padding_x" AS ENUM('none', 'base');
  CREATE TABLE "page_blocks_people_directory" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"section_theme" "enum_page_blocks_people_directory_section_theme",
  	"section_max_width" "enum_page_blocks_people_directory_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_people_directory_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_people_directory_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_people_directory" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"section_theme" "enum__page_v_blocks_people_directory_section_theme",
  	"section_max_width" "enum__page_v_blocks_people_directory_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_people_directory_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_people_directory_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_people_directory" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"section_theme" "enum_gsec_blocks_people_directory_section_theme",
  	"section_max_width" "enum_gsec_blocks_people_directory_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_people_directory_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_people_directory_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_people_directory" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"section_theme" "enum__gsec_v_blocks_people_directory_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_people_directory_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_people_directory_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_people_directory_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_people_directory" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"section_theme" "enum_presets_blocks_people_directory_section_theme",
  	"section_max_width" "enum_presets_blocks_people_directory_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_people_directory_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_people_directory_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_people_directory_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "person" ADD COLUMN "photo_id" integer;
  ALTER TABLE "page_blocks_people_directory" ADD CONSTRAINT "page_blocks_people_directory_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_people_directory" ADD CONSTRAINT "page_blocks_people_directory_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_people_directory" ADD CONSTRAINT "_page_v_blocks_people_directory_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_people_directory" ADD CONSTRAINT "_page_v_blocks_people_directory_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_people_directory" ADD CONSTRAINT "gsec_blocks_people_directory_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_people_directory" ADD CONSTRAINT "gsec_blocks_people_directory_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_people_directory" ADD CONSTRAINT "_gsec_v_blocks_people_directory_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_people_directory" ADD CONSTRAINT "_gsec_v_blocks_people_directory_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_people_directory" ADD CONSTRAINT "presets_blocks_people_directory_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_people_directory" ADD CONSTRAINT "presets_blocks_people_directory_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_people_directory_locales" ADD CONSTRAINT "presets_blocks_people_directory_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_people_directory"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_people_directory_order_idx" ON "page_blocks_people_directory" USING btree ("_order");
  CREATE INDEX "page_blocks_people_directory_parent_id_idx" ON "page_blocks_people_directory" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_people_directory_path_idx" ON "page_blocks_people_directory" USING btree ("_path");
  CREATE INDEX "page_blocks_people_directory_locale_idx" ON "page_blocks_people_directory" USING btree ("_locale");
  CREATE INDEX "page_blocks_people_directory_section_background_section__idx" ON "page_blocks_people_directory" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_people_directory_order_idx" ON "_page_v_blocks_people_directory" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_people_directory_parent_id_idx" ON "_page_v_blocks_people_directory" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_people_directory_path_idx" ON "_page_v_blocks_people_directory" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_people_directory_locale_idx" ON "_page_v_blocks_people_directory" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_people_directory_section_background_secti_idx" ON "_page_v_blocks_people_directory" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_people_directory_order_idx" ON "gsec_blocks_people_directory" USING btree ("_order");
  CREATE INDEX "gsec_blocks_people_directory_parent_id_idx" ON "gsec_blocks_people_directory" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_people_directory_path_idx" ON "gsec_blocks_people_directory" USING btree ("_path");
  CREATE INDEX "gsec_blocks_people_directory_locale_idx" ON "gsec_blocks_people_directory" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_people_directory_section_background_section__idx" ON "gsec_blocks_people_directory" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_people_directory_order_idx" ON "_gsec_v_blocks_people_directory" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_people_directory_parent_id_idx" ON "_gsec_v_blocks_people_directory" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_people_directory_path_idx" ON "_gsec_v_blocks_people_directory" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_people_directory_locale_idx" ON "_gsec_v_blocks_people_directory" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_people_directory_section_background_secti_idx" ON "_gsec_v_blocks_people_directory" USING btree ("section_background_media_id");
  CREATE INDEX "presets_blocks_people_directory_order_idx" ON "presets_blocks_people_directory" USING btree ("_order");
  CREATE INDEX "presets_blocks_people_directory_parent_id_idx" ON "presets_blocks_people_directory" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_people_directory_path_idx" ON "presets_blocks_people_directory" USING btree ("_path");
  CREATE INDEX "presets_blocks_people_directory_section_background_secti_idx" ON "presets_blocks_people_directory" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_people_directory_locales_locale_parent_id_uni" ON "presets_blocks_people_directory_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "person" ADD CONSTRAINT "person_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "person_photo_idx" ON "person" USING btree ("photo_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_people_directory" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_people_directory" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "gsec_blocks_people_directory" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_gsec_v_blocks_people_directory" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_people_directory" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_people_directory_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "page_blocks_people_directory" CASCADE;
  DROP TABLE "_page_v_blocks_people_directory" CASCADE;
  DROP TABLE "gsec_blocks_people_directory" CASCADE;
  DROP TABLE "_gsec_v_blocks_people_directory" CASCADE;
  DROP TABLE "presets_blocks_people_directory" CASCADE;
  DROP TABLE "presets_blocks_people_directory_locales" CASCADE;
  ALTER TABLE "person" DROP CONSTRAINT "person_photo_id_media_id_fk";
  
  DROP INDEX "person_photo_idx";
  ALTER TABLE "person" DROP COLUMN "photo_id";
  DROP TYPE "public"."enum_page_blocks_people_directory_section_theme";
  DROP TYPE "public"."enum_page_blocks_people_directory_section_max_width";
  DROP TYPE "public"."enum_page_blocks_people_directory_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_people_directory_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_people_directory_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_people_directory_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_people_directory_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_people_directory_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_people_directory_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_people_directory_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_people_directory_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_people_directory_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_people_directory_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_people_directory_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_people_directory_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_people_directory_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_people_directory_section_theme";
  DROP TYPE "public"."enum_presets_blocks_people_directory_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_people_directory_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_people_directory_section_padding_x";`)
}
