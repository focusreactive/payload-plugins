import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// The content-layout enums are rebuilt through a text cast (not ALTER TYPE ... ADD VALUE):
// Postgres refuses to use a freshly added enum value — here as the new column default —
// inside the transaction that added it.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_footer_social_links_platform" AS ENUM('instagram', 'x', 'facebook', 'youtube', 'github', 'tiktok', 'linkedin');
  CREATE TYPE "public"."enum__footer_v_version_social_links_platform" AS ENUM('instagram', 'x', 'facebook', 'youtube', 'github', 'tiktok', 'linkedin');
  ALTER TABLE "page_blocks_content" ALTER COLUMN "layout" SET DATA TYPE text;
  ALTER TABLE "page_blocks_content" ALTER COLUMN "layout" SET DEFAULT 'stacked'::text;
  DROP TYPE "public"."enum_page_blocks_content_layout";
  CREATE TYPE "public"."enum_page_blocks_content_layout" AS ENUM('stacked', 'image-text', 'text-image');
  ALTER TABLE "page_blocks_content" ALTER COLUMN "layout" SET DEFAULT 'stacked'::"public"."enum_page_blocks_content_layout";
  ALTER TABLE "page_blocks_content" ALTER COLUMN "layout" SET DATA TYPE "public"."enum_page_blocks_content_layout" USING "layout"::"public"."enum_page_blocks_content_layout";
  ALTER TABLE "_page_v_blocks_content" ALTER COLUMN "layout" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_content" ALTER COLUMN "layout" SET DEFAULT 'stacked'::text;
  DROP TYPE "public"."enum__page_v_blocks_content_layout";
  CREATE TYPE "public"."enum__page_v_blocks_content_layout" AS ENUM('stacked', 'image-text', 'text-image');
  ALTER TABLE "_page_v_blocks_content" ALTER COLUMN "layout" SET DEFAULT 'stacked'::"public"."enum__page_v_blocks_content_layout";
  ALTER TABLE "_page_v_blocks_content" ALTER COLUMN "layout" SET DATA TYPE "public"."enum__page_v_blocks_content_layout" USING "layout"::"public"."enum__page_v_blocks_content_layout";
  ALTER TABLE "gsec_blocks_content" ALTER COLUMN "layout" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_content" ALTER COLUMN "layout" SET DEFAULT 'stacked'::text;
  DROP TYPE "public"."enum_gsec_blocks_content_layout";
  CREATE TYPE "public"."enum_gsec_blocks_content_layout" AS ENUM('stacked', 'image-text', 'text-image');
  ALTER TABLE "gsec_blocks_content" ALTER COLUMN "layout" SET DEFAULT 'stacked'::"public"."enum_gsec_blocks_content_layout";
  ALTER TABLE "gsec_blocks_content" ALTER COLUMN "layout" SET DATA TYPE "public"."enum_gsec_blocks_content_layout" USING "layout"::"public"."enum_gsec_blocks_content_layout";
  ALTER TABLE "_gsec_v_blocks_content" ALTER COLUMN "layout" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_content" ALTER COLUMN "layout" SET DEFAULT 'stacked'::text;
  DROP TYPE "public"."enum__gsec_v_blocks_content_layout";
  CREATE TYPE "public"."enum__gsec_v_blocks_content_layout" AS ENUM('stacked', 'image-text', 'text-image');
  ALTER TABLE "_gsec_v_blocks_content" ALTER COLUMN "layout" SET DEFAULT 'stacked'::"public"."enum__gsec_v_blocks_content_layout";
  ALTER TABLE "_gsec_v_blocks_content" ALTER COLUMN "layout" SET DATA TYPE "public"."enum__gsec_v_blocks_content_layout" USING "layout"::"public"."enum__gsec_v_blocks_content_layout";
  ALTER TABLE "presets_blocks_content" ALTER COLUMN "layout" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_content" ALTER COLUMN "layout" SET DEFAULT 'stacked'::text;
  DROP TYPE "public"."enum_presets_blocks_content_layout";
  CREATE TYPE "public"."enum_presets_blocks_content_layout" AS ENUM('stacked', 'image-text', 'text-image');
  ALTER TABLE "presets_blocks_content" ALTER COLUMN "layout" SET DEFAULT 'stacked'::"public"."enum_presets_blocks_content_layout";
  ALTER TABLE "presets_blocks_content" ALTER COLUMN "layout" SET DATA TYPE "public"."enum_presets_blocks_content_layout" USING "layout"::"public"."enum_presets_blocks_content_layout";
  CREATE TABLE "footer_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "enum_footer_social_links_platform",
  	"url" varchar
  );
  
  CREATE TABLE "_footer_v_version_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"platform" "enum__footer_v_version_social_links_platform",
  	"url" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "page_blocks_cards_grid_items" ALTER COLUMN "align_variant" SET DEFAULT 'left';
  ALTER TABLE "_page_v_blocks_cards_grid_items" ALTER COLUMN "align_variant" SET DEFAULT 'left';
  ALTER TABLE "gsec_blocks_cards_grid_items" ALTER COLUMN "align_variant" SET DEFAULT 'left';
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" ALTER COLUMN "align_variant" SET DEFAULT 'left';
  ALTER TABLE "presets_blocks_cards_grid_items" ALTER COLUMN "align_variant" SET DEFAULT 'left';
  ALTER TABLE "footer_social_links" ADD CONSTRAINT "footer_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v_version_social_links" ADD CONSTRAINT "_footer_v_version_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "footer_social_links_order_idx" ON "footer_social_links" USING btree ("_order");
  CREATE INDEX "footer_social_links_parent_id_idx" ON "footer_social_links" USING btree ("_parent_id");
  CREATE INDEX "_footer_v_version_social_links_order_idx" ON "_footer_v_version_social_links" USING btree ("_order");
  CREATE INDEX "_footer_v_version_social_links_parent_id_idx" ON "_footer_v_version_social_links" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "footer_social_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_footer_v_version_social_links" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "footer_social_links" CASCADE;
  DROP TABLE "_footer_v_version_social_links" CASCADE;
  ALTER TABLE "page_blocks_content" ALTER COLUMN "layout" SET DATA TYPE text;
  ALTER TABLE "page_blocks_content" ALTER COLUMN "layout" SET DEFAULT 'image-text'::text;
  UPDATE "page_blocks_content" SET "layout" = 'image-text' WHERE "layout" = 'stacked';
  DROP TYPE "public"."enum_page_blocks_content_layout";
  CREATE TYPE "public"."enum_page_blocks_content_layout" AS ENUM('image-text', 'text-image');
  ALTER TABLE "page_blocks_content" ALTER COLUMN "layout" SET DEFAULT 'image-text'::"public"."enum_page_blocks_content_layout";
  ALTER TABLE "page_blocks_content" ALTER COLUMN "layout" SET DATA TYPE "public"."enum_page_blocks_content_layout" USING "layout"::"public"."enum_page_blocks_content_layout";
  ALTER TABLE "_page_v_blocks_content" ALTER COLUMN "layout" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_content" ALTER COLUMN "layout" SET DEFAULT 'image-text'::text;
  UPDATE "_page_v_blocks_content" SET "layout" = 'image-text' WHERE "layout" = 'stacked';
  DROP TYPE "public"."enum__page_v_blocks_content_layout";
  CREATE TYPE "public"."enum__page_v_blocks_content_layout" AS ENUM('image-text', 'text-image');
  ALTER TABLE "_page_v_blocks_content" ALTER COLUMN "layout" SET DEFAULT 'image-text'::"public"."enum__page_v_blocks_content_layout";
  ALTER TABLE "_page_v_blocks_content" ALTER COLUMN "layout" SET DATA TYPE "public"."enum__page_v_blocks_content_layout" USING "layout"::"public"."enum__page_v_blocks_content_layout";
  ALTER TABLE "gsec_blocks_content" ALTER COLUMN "layout" SET DATA TYPE text;
  ALTER TABLE "gsec_blocks_content" ALTER COLUMN "layout" SET DEFAULT 'image-text'::text;
  UPDATE "gsec_blocks_content" SET "layout" = 'image-text' WHERE "layout" = 'stacked';
  DROP TYPE "public"."enum_gsec_blocks_content_layout";
  CREATE TYPE "public"."enum_gsec_blocks_content_layout" AS ENUM('image-text', 'text-image');
  ALTER TABLE "gsec_blocks_content" ALTER COLUMN "layout" SET DEFAULT 'image-text'::"public"."enum_gsec_blocks_content_layout";
  ALTER TABLE "gsec_blocks_content" ALTER COLUMN "layout" SET DATA TYPE "public"."enum_gsec_blocks_content_layout" USING "layout"::"public"."enum_gsec_blocks_content_layout";
  ALTER TABLE "_gsec_v_blocks_content" ALTER COLUMN "layout" SET DATA TYPE text;
  ALTER TABLE "_gsec_v_blocks_content" ALTER COLUMN "layout" SET DEFAULT 'image-text'::text;
  UPDATE "_gsec_v_blocks_content" SET "layout" = 'image-text' WHERE "layout" = 'stacked';
  DROP TYPE "public"."enum__gsec_v_blocks_content_layout";
  CREATE TYPE "public"."enum__gsec_v_blocks_content_layout" AS ENUM('image-text', 'text-image');
  ALTER TABLE "_gsec_v_blocks_content" ALTER COLUMN "layout" SET DEFAULT 'image-text'::"public"."enum__gsec_v_blocks_content_layout";
  ALTER TABLE "_gsec_v_blocks_content" ALTER COLUMN "layout" SET DATA TYPE "public"."enum__gsec_v_blocks_content_layout" USING "layout"::"public"."enum__gsec_v_blocks_content_layout";
  ALTER TABLE "presets_blocks_content" ALTER COLUMN "layout" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_content" ALTER COLUMN "layout" SET DEFAULT 'image-text'::text;
  UPDATE "presets_blocks_content" SET "layout" = 'image-text' WHERE "layout" = 'stacked';
  DROP TYPE "public"."enum_presets_blocks_content_layout";
  CREATE TYPE "public"."enum_presets_blocks_content_layout" AS ENUM('image-text', 'text-image');
  ALTER TABLE "presets_blocks_content" ALTER COLUMN "layout" SET DEFAULT 'image-text'::"public"."enum_presets_blocks_content_layout";
  ALTER TABLE "presets_blocks_content" ALTER COLUMN "layout" SET DATA TYPE "public"."enum_presets_blocks_content_layout" USING "layout"::"public"."enum_presets_blocks_content_layout";
  ALTER TABLE "page_blocks_cards_grid_items" ALTER COLUMN "align_variant" SET DEFAULT 'center';
  ALTER TABLE "_page_v_blocks_cards_grid_items" ALTER COLUMN "align_variant" SET DEFAULT 'center';
  ALTER TABLE "gsec_blocks_cards_grid_items" ALTER COLUMN "align_variant" SET DEFAULT 'center';
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" ALTER COLUMN "align_variant" SET DEFAULT 'center';
  ALTER TABLE "presets_blocks_cards_grid_items" ALTER COLUMN "align_variant" SET DEFAULT 'center';
  DROP TYPE "public"."enum_footer_social_links_platform";
  DROP TYPE "public"."enum__footer_v_version_social_links_platform";`)
}
