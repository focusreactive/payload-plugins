import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Hand-trimmed to the Stats block. The generator also emitted schema drift already present on the
// sandbox databases (payload_jobs, the folder-type enum rebuild, two column defaults); replaying
// those would fail on CREATE TABLE payload_jobs, so they stay out of this migration.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_stats_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_stats_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_stats_layout" AS ENUM('accentLine', 'splitImage');
  CREATE TYPE "public"."enum__page_v_blocks_stats_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_stats_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_stats_layout" AS ENUM('accentLine', 'splitImage');
  CREATE TYPE "public"."enum_gsec_blocks_stats_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_stats_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_stats_layout" AS ENUM('accentLine', 'splitImage');
  CREATE TYPE "public"."enum__gsec_v_blocks_stats_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_stats_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_stats_layout" AS ENUM('accentLine', 'splitImage');
  CREATE TYPE "public"."enum_presets_blocks_stats_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_stats_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_stats_layout" AS ENUM('accentLine', 'splitImage');
  CREATE TABLE "presets_blocks_stats_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  ALTER TABLE "page_blocks_stats_items" ADD COLUMN "description" varchar;
  ALTER TABLE "page_blocks_stats_items" ADD COLUMN "link_type" "enum_page_blocks_stats_items_link_type" DEFAULT 'reference';
  ALTER TABLE "page_blocks_stats_items" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "page_blocks_stats_items" ADD COLUMN "link_url" varchar;
  ALTER TABLE "page_blocks_stats_items" ADD COLUMN "link_custom_page" "enum_page_blocks_stats_items_link_custom_page";
  ALTER TABLE "page_blocks_stats_items" ADD COLUMN "link_label" varchar;
  ALTER TABLE "page_blocks_stats" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "page_blocks_stats" ADD COLUMN "heading" varchar;
  ALTER TABLE "page_blocks_stats" ADD COLUMN "description" varchar;
  ALTER TABLE "page_blocks_stats" ADD COLUMN "layout" "enum_page_blocks_stats_layout" DEFAULT 'accentLine';
  ALTER TABLE "page_blocks_stats" ADD COLUMN "image_id" integer;
  ALTER TABLE "_page_v_blocks_stats_items" ADD COLUMN "description" varchar;
  ALTER TABLE "_page_v_blocks_stats_items" ADD COLUMN "link_type" "enum__page_v_blocks_stats_items_link_type" DEFAULT 'reference';
  ALTER TABLE "_page_v_blocks_stats_items" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "_page_v_blocks_stats_items" ADD COLUMN "link_url" varchar;
  ALTER TABLE "_page_v_blocks_stats_items" ADD COLUMN "link_custom_page" "enum__page_v_blocks_stats_items_link_custom_page";
  ALTER TABLE "_page_v_blocks_stats_items" ADD COLUMN "link_label" varchar;
  ALTER TABLE "_page_v_blocks_stats" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_page_v_blocks_stats" ADD COLUMN "heading" varchar;
  ALTER TABLE "_page_v_blocks_stats" ADD COLUMN "description" varchar;
  ALTER TABLE "_page_v_blocks_stats" ADD COLUMN "layout" "enum__page_v_blocks_stats_layout" DEFAULT 'accentLine';
  ALTER TABLE "_page_v_blocks_stats" ADD COLUMN "image_id" integer;
  ALTER TABLE "gsec_blocks_stats_items" ADD COLUMN "description" varchar;
  ALTER TABLE "gsec_blocks_stats_items" ADD COLUMN "link_type" "enum_gsec_blocks_stats_items_link_type" DEFAULT 'reference';
  ALTER TABLE "gsec_blocks_stats_items" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "gsec_blocks_stats_items" ADD COLUMN "link_url" varchar;
  ALTER TABLE "gsec_blocks_stats_items" ADD COLUMN "link_custom_page" "enum_gsec_blocks_stats_items_link_custom_page";
  ALTER TABLE "gsec_blocks_stats_items" ADD COLUMN "link_label" varchar;
  ALTER TABLE "gsec_blocks_stats" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "gsec_blocks_stats" ADD COLUMN "heading" varchar;
  ALTER TABLE "gsec_blocks_stats" ADD COLUMN "description" varchar;
  ALTER TABLE "gsec_blocks_stats" ADD COLUMN "layout" "enum_gsec_blocks_stats_layout" DEFAULT 'accentLine';
  ALTER TABLE "gsec_blocks_stats" ADD COLUMN "image_id" integer;
  ALTER TABLE "_gsec_v_blocks_stats_items" ADD COLUMN "description" varchar;
  ALTER TABLE "_gsec_v_blocks_stats_items" ADD COLUMN "link_type" "enum__gsec_v_blocks_stats_items_link_type" DEFAULT 'reference';
  ALTER TABLE "_gsec_v_blocks_stats_items" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "_gsec_v_blocks_stats_items" ADD COLUMN "link_url" varchar;
  ALTER TABLE "_gsec_v_blocks_stats_items" ADD COLUMN "link_custom_page" "enum__gsec_v_blocks_stats_items_link_custom_page";
  ALTER TABLE "_gsec_v_blocks_stats_items" ADD COLUMN "link_label" varchar;
  ALTER TABLE "_gsec_v_blocks_stats" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_gsec_v_blocks_stats" ADD COLUMN "heading" varchar;
  ALTER TABLE "_gsec_v_blocks_stats" ADD COLUMN "description" varchar;
  ALTER TABLE "_gsec_v_blocks_stats" ADD COLUMN "layout" "enum__gsec_v_blocks_stats_layout" DEFAULT 'accentLine';
  ALTER TABLE "_gsec_v_blocks_stats" ADD COLUMN "image_id" integer;
  ALTER TABLE "presets_blocks_stats_items" ADD COLUMN "description" varchar;
  ALTER TABLE "presets_blocks_stats_items" ADD COLUMN "link_type" "enum_presets_blocks_stats_items_link_type" DEFAULT 'reference';
  ALTER TABLE "presets_blocks_stats_items" ADD COLUMN "link_new_tab" boolean;
  ALTER TABLE "presets_blocks_stats_items" ADD COLUMN "link_url" varchar;
  ALTER TABLE "presets_blocks_stats_items" ADD COLUMN "link_custom_page" "enum_presets_blocks_stats_items_link_custom_page";
  ALTER TABLE "presets_blocks_stats_items" ADD COLUMN "link_label" varchar;
  ALTER TABLE "presets_blocks_stats" ADD COLUMN "layout" "enum_presets_blocks_stats_layout" DEFAULT 'accentLine';
  ALTER TABLE "presets_blocks_stats" ADD COLUMN "image_id" integer;
  ALTER TABLE "presets_blocks_stats_locales" ADD CONSTRAINT "presets_blocks_stats_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "presets_blocks_stats_locales_locale_parent_id_unique" ON "presets_blocks_stats_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "page_blocks_stats" ADD CONSTRAINT "page_blocks_stats_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_stats" ADD CONSTRAINT "_page_v_blocks_stats_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_stats" ADD CONSTRAINT "gsec_blocks_stats_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_stats" ADD CONSTRAINT "_gsec_v_blocks_stats_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_stats" ADD CONSTRAINT "presets_blocks_stats_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "page_blocks_stats_image_idx" ON "page_blocks_stats" USING btree ("image_id");
  CREATE INDEX "_page_v_blocks_stats_image_idx" ON "_page_v_blocks_stats" USING btree ("image_id");
  CREATE INDEX "gsec_blocks_stats_image_idx" ON "gsec_blocks_stats" USING btree ("image_id");
  CREATE INDEX "_gsec_v_blocks_stats_image_idx" ON "_gsec_v_blocks_stats" USING btree ("image_id");
  CREATE INDEX "presets_blocks_stats_image_idx" ON "presets_blocks_stats" USING btree ("image_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presets_blocks_stats_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "presets_blocks_stats_locales" CASCADE;
  ALTER TABLE "page_blocks_stats" DROP CONSTRAINT "page_blocks_stats_image_id_media_id_fk";
  ALTER TABLE "_page_v_blocks_stats" DROP CONSTRAINT "_page_v_blocks_stats_image_id_media_id_fk";
  ALTER TABLE "gsec_blocks_stats" DROP CONSTRAINT "gsec_blocks_stats_image_id_media_id_fk";
  ALTER TABLE "_gsec_v_blocks_stats" DROP CONSTRAINT "_gsec_v_blocks_stats_image_id_media_id_fk";
  ALTER TABLE "presets_blocks_stats" DROP CONSTRAINT "presets_blocks_stats_image_id_media_id_fk";
  DROP INDEX "page_blocks_stats_image_idx";
  DROP INDEX "_page_v_blocks_stats_image_idx";
  DROP INDEX "gsec_blocks_stats_image_idx";
  DROP INDEX "_gsec_v_blocks_stats_image_idx";
  DROP INDEX "presets_blocks_stats_image_idx";
  ALTER TABLE "page_blocks_stats_items" DROP COLUMN "description";
  ALTER TABLE "page_blocks_stats_items" DROP COLUMN "link_type";
  ALTER TABLE "page_blocks_stats_items" DROP COLUMN "link_new_tab";
  ALTER TABLE "page_blocks_stats_items" DROP COLUMN "link_url";
  ALTER TABLE "page_blocks_stats_items" DROP COLUMN "link_custom_page";
  ALTER TABLE "page_blocks_stats_items" DROP COLUMN "link_label";
  ALTER TABLE "page_blocks_stats" DROP COLUMN "eyebrow";
  ALTER TABLE "page_blocks_stats" DROP COLUMN "heading";
  ALTER TABLE "page_blocks_stats" DROP COLUMN "description";
  ALTER TABLE "page_blocks_stats" DROP COLUMN "layout";
  ALTER TABLE "page_blocks_stats" DROP COLUMN "image_id";
  ALTER TABLE "_page_v_blocks_stats_items" DROP COLUMN "description";
  ALTER TABLE "_page_v_blocks_stats_items" DROP COLUMN "link_type";
  ALTER TABLE "_page_v_blocks_stats_items" DROP COLUMN "link_new_tab";
  ALTER TABLE "_page_v_blocks_stats_items" DROP COLUMN "link_url";
  ALTER TABLE "_page_v_blocks_stats_items" DROP COLUMN "link_custom_page";
  ALTER TABLE "_page_v_blocks_stats_items" DROP COLUMN "link_label";
  ALTER TABLE "_page_v_blocks_stats" DROP COLUMN "eyebrow";
  ALTER TABLE "_page_v_blocks_stats" DROP COLUMN "heading";
  ALTER TABLE "_page_v_blocks_stats" DROP COLUMN "description";
  ALTER TABLE "_page_v_blocks_stats" DROP COLUMN "layout";
  ALTER TABLE "_page_v_blocks_stats" DROP COLUMN "image_id";
  ALTER TABLE "gsec_blocks_stats_items" DROP COLUMN "description";
  ALTER TABLE "gsec_blocks_stats_items" DROP COLUMN "link_type";
  ALTER TABLE "gsec_blocks_stats_items" DROP COLUMN "link_new_tab";
  ALTER TABLE "gsec_blocks_stats_items" DROP COLUMN "link_url";
  ALTER TABLE "gsec_blocks_stats_items" DROP COLUMN "link_custom_page";
  ALTER TABLE "gsec_blocks_stats_items" DROP COLUMN "link_label";
  ALTER TABLE "gsec_blocks_stats" DROP COLUMN "eyebrow";
  ALTER TABLE "gsec_blocks_stats" DROP COLUMN "heading";
  ALTER TABLE "gsec_blocks_stats" DROP COLUMN "description";
  ALTER TABLE "gsec_blocks_stats" DROP COLUMN "layout";
  ALTER TABLE "gsec_blocks_stats" DROP COLUMN "image_id";
  ALTER TABLE "_gsec_v_blocks_stats_items" DROP COLUMN "description";
  ALTER TABLE "_gsec_v_blocks_stats_items" DROP COLUMN "link_type";
  ALTER TABLE "_gsec_v_blocks_stats_items" DROP COLUMN "link_new_tab";
  ALTER TABLE "_gsec_v_blocks_stats_items" DROP COLUMN "link_url";
  ALTER TABLE "_gsec_v_blocks_stats_items" DROP COLUMN "link_custom_page";
  ALTER TABLE "_gsec_v_blocks_stats_items" DROP COLUMN "link_label";
  ALTER TABLE "_gsec_v_blocks_stats" DROP COLUMN "eyebrow";
  ALTER TABLE "_gsec_v_blocks_stats" DROP COLUMN "heading";
  ALTER TABLE "_gsec_v_blocks_stats" DROP COLUMN "description";
  ALTER TABLE "_gsec_v_blocks_stats" DROP COLUMN "layout";
  ALTER TABLE "_gsec_v_blocks_stats" DROP COLUMN "image_id";
  ALTER TABLE "presets_blocks_stats_items" DROP COLUMN "description";
  ALTER TABLE "presets_blocks_stats_items" DROP COLUMN "link_type";
  ALTER TABLE "presets_blocks_stats_items" DROP COLUMN "link_new_tab";
  ALTER TABLE "presets_blocks_stats_items" DROP COLUMN "link_url";
  ALTER TABLE "presets_blocks_stats_items" DROP COLUMN "link_custom_page";
  ALTER TABLE "presets_blocks_stats_items" DROP COLUMN "link_label";
  ALTER TABLE "presets_blocks_stats" DROP COLUMN "layout";
  ALTER TABLE "presets_blocks_stats" DROP COLUMN "image_id";
  DROP TYPE "public"."enum_page_blocks_stats_items_link_type";
  DROP TYPE "public"."enum_page_blocks_stats_items_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_stats_layout";
  DROP TYPE "public"."enum__page_v_blocks_stats_items_link_type";
  DROP TYPE "public"."enum__page_v_blocks_stats_items_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_stats_layout";
  DROP TYPE "public"."enum_gsec_blocks_stats_items_link_type";
  DROP TYPE "public"."enum_gsec_blocks_stats_items_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_stats_layout";
  DROP TYPE "public"."enum__gsec_v_blocks_stats_items_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_stats_items_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_stats_layout";
  DROP TYPE "public"."enum_presets_blocks_stats_items_link_type";
  DROP TYPE "public"."enum_presets_blocks_stats_items_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_stats_layout";`)
}
