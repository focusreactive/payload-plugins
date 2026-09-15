import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_course_rail_source" AS ENUM('typed', 'talks');
  CREATE TYPE "public"."enum_page_blocks_talk_grid_layout" AS ENUM('grid', 'rail');
  CREATE TYPE "public"."enum__page_v_blocks_course_rail_source" AS ENUM('typed', 'talks');
  CREATE TYPE "public"."enum__page_v_blocks_talk_grid_layout" AS ENUM('grid', 'rail');
  CREATE TYPE "public"."enum_gsec_blocks_course_rail_source" AS ENUM('typed', 'talks');
  CREATE TYPE "public"."enum_gsec_blocks_talk_grid_layout" AS ENUM('grid', 'rail');
  CREATE TYPE "public"."enum__gsec_v_blocks_course_rail_source" AS ENUM('typed', 'talks');
  CREATE TYPE "public"."enum__gsec_v_blocks_talk_grid_layout" AS ENUM('grid', 'rail');
  CREATE TYPE "public"."enum_presets_blocks_course_rail_source" AS ENUM('typed', 'talks');
  CREATE TYPE "public"."enum_presets_blocks_talk_grid_layout" AS ENUM('grid', 'rail');
  ALTER TABLE "presets_blocks_course_rail_topics" ALTER COLUMN "label" DROP NOT NULL;
  ALTER TABLE "presets_blocks_course_rail_courses" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "page_blocks_course_rail" ADD COLUMN "source" "enum_page_blocks_course_rail_source" DEFAULT 'typed';
  ALTER TABLE "page_blocks_course_rail" ADD COLUMN "all_teachings_label" varchar;
  ALTER TABLE "page_blocks_course_rail" ADD COLUMN "limit" numeric DEFAULT 6;
  ALTER TABLE "page_blocks_talk_grid" ADD COLUMN "layout" "enum_page_blocks_talk_grid_layout" DEFAULT 'grid';
  ALTER TABLE "page_blocks_shopify_product" ADD COLUMN "show_buy_button" boolean DEFAULT true;
  ALTER TABLE "page_blocks_shopify_carousel" ADD COLUMN "show_buy_button" boolean DEFAULT false;
  ALTER TABLE "_page_v_blocks_course_rail" ADD COLUMN "source" "enum__page_v_blocks_course_rail_source" DEFAULT 'typed';
  ALTER TABLE "_page_v_blocks_course_rail" ADD COLUMN "all_teachings_label" varchar;
  ALTER TABLE "_page_v_blocks_course_rail" ADD COLUMN "limit" numeric DEFAULT 6;
  ALTER TABLE "_page_v_blocks_talk_grid" ADD COLUMN "layout" "enum__page_v_blocks_talk_grid_layout" DEFAULT 'grid';
  ALTER TABLE "_page_v_blocks_shopify_product" ADD COLUMN "show_buy_button" boolean DEFAULT true;
  ALTER TABLE "_page_v_blocks_shopify_carousel" ADD COLUMN "show_buy_button" boolean DEFAULT false;
  ALTER TABLE "talk" ADD COLUMN "cover_image_image_id" integer;
  ALTER TABLE "_talk_v" ADD COLUMN "version_cover_image_image_id" integer;
  ALTER TABLE "gsec_blocks_course_rail" ADD COLUMN "source" "enum_gsec_blocks_course_rail_source" DEFAULT 'typed';
  ALTER TABLE "gsec_blocks_course_rail" ADD COLUMN "all_teachings_label" varchar;
  ALTER TABLE "gsec_blocks_course_rail" ADD COLUMN "limit" numeric DEFAULT 6;
  ALTER TABLE "gsec_blocks_talk_grid" ADD COLUMN "layout" "enum_gsec_blocks_talk_grid_layout" DEFAULT 'grid';
  ALTER TABLE "gsec_blocks_shopify_product" ADD COLUMN "show_buy_button" boolean DEFAULT true;
  ALTER TABLE "gsec_blocks_shopify_carousel" ADD COLUMN "show_buy_button" boolean DEFAULT false;
  ALTER TABLE "_gsec_v_blocks_course_rail" ADD COLUMN "source" "enum__gsec_v_blocks_course_rail_source" DEFAULT 'typed';
  ALTER TABLE "_gsec_v_blocks_course_rail" ADD COLUMN "all_teachings_label" varchar;
  ALTER TABLE "_gsec_v_blocks_course_rail" ADD COLUMN "limit" numeric DEFAULT 6;
  ALTER TABLE "_gsec_v_blocks_talk_grid" ADD COLUMN "layout" "enum__gsec_v_blocks_talk_grid_layout" DEFAULT 'grid';
  ALTER TABLE "_gsec_v_blocks_shopify_product" ADD COLUMN "show_buy_button" boolean DEFAULT true;
  ALTER TABLE "_gsec_v_blocks_shopify_carousel" ADD COLUMN "show_buy_button" boolean DEFAULT false;
  ALTER TABLE "presets_blocks_course_rail" ADD COLUMN "source" "enum_presets_blocks_course_rail_source" DEFAULT 'typed' NOT NULL;
  ALTER TABLE "presets_blocks_course_rail" ADD COLUMN "limit" numeric DEFAULT 6;
  ALTER TABLE "presets_blocks_course_rail_locales" ADD COLUMN "all_teachings_label" varchar;
  ALTER TABLE "presets_blocks_talk_grid" ADD COLUMN "layout" "enum_presets_blocks_talk_grid_layout" DEFAULT 'grid' NOT NULL;
  ALTER TABLE "presets_blocks_shopify_product" ADD COLUMN "show_buy_button" boolean DEFAULT true;
  ALTER TABLE "presets_blocks_shopify_carousel" ADD COLUMN "show_buy_button" boolean DEFAULT false;
  ALTER TABLE "talk" ADD CONSTRAINT "talk_cover_image_image_id_media_id_fk" FOREIGN KEY ("cover_image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_talk_v" ADD CONSTRAINT "_talk_v_version_cover_image_image_id_media_id_fk" FOREIGN KEY ("version_cover_image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "talk_cover_image_cover_image_image_idx" ON "talk" USING btree ("cover_image_image_id");
  CREATE INDEX "_talk_v_version_cover_image_version_cover_image_image_idx" ON "_talk_v" USING btree ("version_cover_image_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "talk" DROP CONSTRAINT "talk_cover_image_image_id_media_id_fk";
  
  ALTER TABLE "_talk_v" DROP CONSTRAINT "_talk_v_version_cover_image_image_id_media_id_fk";
  
  DROP INDEX "talk_cover_image_cover_image_image_idx";
  DROP INDEX "_talk_v_version_cover_image_version_cover_image_image_idx";
  ALTER TABLE "presets_blocks_course_rail_topics" ALTER COLUMN "label" SET NOT NULL;
  ALTER TABLE "presets_blocks_course_rail_courses" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "page_blocks_course_rail" DROP COLUMN "source";
  ALTER TABLE "page_blocks_course_rail" DROP COLUMN "all_teachings_label";
  ALTER TABLE "page_blocks_course_rail" DROP COLUMN "limit";
  ALTER TABLE "page_blocks_talk_grid" DROP COLUMN "layout";
  ALTER TABLE "page_blocks_shopify_product" DROP COLUMN "show_buy_button";
  ALTER TABLE "page_blocks_shopify_carousel" DROP COLUMN "show_buy_button";
  ALTER TABLE "_page_v_blocks_course_rail" DROP COLUMN "source";
  ALTER TABLE "_page_v_blocks_course_rail" DROP COLUMN "all_teachings_label";
  ALTER TABLE "_page_v_blocks_course_rail" DROP COLUMN "limit";
  ALTER TABLE "_page_v_blocks_talk_grid" DROP COLUMN "layout";
  ALTER TABLE "_page_v_blocks_shopify_product" DROP COLUMN "show_buy_button";
  ALTER TABLE "_page_v_blocks_shopify_carousel" DROP COLUMN "show_buy_button";
  ALTER TABLE "talk" DROP COLUMN "cover_image_image_id";
  ALTER TABLE "_talk_v" DROP COLUMN "version_cover_image_image_id";
  ALTER TABLE "gsec_blocks_course_rail" DROP COLUMN "source";
  ALTER TABLE "gsec_blocks_course_rail" DROP COLUMN "all_teachings_label";
  ALTER TABLE "gsec_blocks_course_rail" DROP COLUMN "limit";
  ALTER TABLE "gsec_blocks_talk_grid" DROP COLUMN "layout";
  ALTER TABLE "gsec_blocks_shopify_product" DROP COLUMN "show_buy_button";
  ALTER TABLE "gsec_blocks_shopify_carousel" DROP COLUMN "show_buy_button";
  ALTER TABLE "_gsec_v_blocks_course_rail" DROP COLUMN "source";
  ALTER TABLE "_gsec_v_blocks_course_rail" DROP COLUMN "all_teachings_label";
  ALTER TABLE "_gsec_v_blocks_course_rail" DROP COLUMN "limit";
  ALTER TABLE "_gsec_v_blocks_talk_grid" DROP COLUMN "layout";
  ALTER TABLE "_gsec_v_blocks_shopify_product" DROP COLUMN "show_buy_button";
  ALTER TABLE "_gsec_v_blocks_shopify_carousel" DROP COLUMN "show_buy_button";
  ALTER TABLE "presets_blocks_course_rail" DROP COLUMN "source";
  ALTER TABLE "presets_blocks_course_rail" DROP COLUMN "limit";
  ALTER TABLE "presets_blocks_course_rail_locales" DROP COLUMN "all_teachings_label";
  ALTER TABLE "presets_blocks_talk_grid" DROP COLUMN "layout";
  ALTER TABLE "presets_blocks_shopify_product" DROP COLUMN "show_buy_button";
  ALTER TABLE "presets_blocks_shopify_carousel" DROP COLUMN "show_buy_button";
  DROP TYPE "public"."enum_page_blocks_course_rail_source";
  DROP TYPE "public"."enum_page_blocks_talk_grid_layout";
  DROP TYPE "public"."enum__page_v_blocks_course_rail_source";
  DROP TYPE "public"."enum__page_v_blocks_talk_grid_layout";
  DROP TYPE "public"."enum_gsec_blocks_course_rail_source";
  DROP TYPE "public"."enum_gsec_blocks_talk_grid_layout";
  DROP TYPE "public"."enum__gsec_v_blocks_course_rail_source";
  DROP TYPE "public"."enum__gsec_v_blocks_talk_grid_layout";
  DROP TYPE "public"."enum_presets_blocks_course_rail_source";
  DROP TYPE "public"."enum_presets_blocks_talk_grid_layout";`)
}
