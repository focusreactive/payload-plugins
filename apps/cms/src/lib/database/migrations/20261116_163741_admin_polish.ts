import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_image_hero_crumbs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_image_hero_crumbs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_image_hero_crumbs" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "page_blocks_image_hero_crumbs" CASCADE;
  DROP TABLE "_page_v_blocks_image_hero_crumbs" CASCADE;
  DROP TABLE "presets_blocks_image_hero_crumbs" CASCADE;
  ALTER TABLE "site_settings" ADD COLUMN "general_favicon_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_general_favicon_id" integer;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_general_favicon_id_media_id_fk" FOREIGN KEY ("general_favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_general_favicon_id_media_id_fk" FOREIGN KEY ("version_general_favicon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_settings_general_general_favicon_idx" ON "site_settings" USING btree ("general_favicon_id");
  CREATE INDEX "_site_settings_v_version_general_version_general_favicon_idx" ON "_site_settings_v" USING btree ("version_general_favicon_id");
  ALTER TABLE "clinics_locales" DROP COLUMN "hero_crumb";
  ALTER TABLE "_clinics_v_locales" DROP COLUMN "version_hero_crumb";
  DROP TYPE "public"."enum_page_blocks_image_hero_crumbs_link_kind";
  DROP TYPE "public"."enum__page_v_blocks_image_hero_crumbs_link_kind";
  DROP TYPE "public"."enum_presets_blocks_image_hero_crumbs_link_kind";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_image_hero_crumbs_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__page_v_blocks_image_hero_crumbs_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_presets_blocks_image_hero_crumbs_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TABLE "page_blocks_image_hero_crumbs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"link_kind" "enum_page_blocks_image_hero_crumbs_link_kind" DEFAULT 'internal',
  	"link_new_tab" boolean,
  	"link_path" varchar,
  	"link_url" varchar
  );
  
  CREATE TABLE "_page_v_blocks_image_hero_crumbs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"link_kind" "enum__page_v_blocks_image_hero_crumbs_link_kind" DEFAULT 'internal',
  	"link_new_tab" boolean,
  	"link_path" varchar,
  	"link_url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "presets_blocks_image_hero_crumbs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"link_kind" "enum_presets_blocks_image_hero_crumbs_link_kind" DEFAULT 'internal',
  	"link_new_tab" boolean,
  	"link_path" varchar,
  	"link_url" varchar
  );
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_general_favicon_id_media_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_general_favicon_id_media_id_fk";
  
  DROP INDEX "site_settings_general_general_favicon_idx";
  DROP INDEX "_site_settings_v_version_general_version_general_favicon_idx";
  ALTER TABLE "clinics_locales" ADD COLUMN "hero_crumb" varchar;
  ALTER TABLE "_clinics_v_locales" ADD COLUMN "version_hero_crumb" varchar;
  ALTER TABLE "page_blocks_image_hero_crumbs" ADD CONSTRAINT "page_blocks_image_hero_crumbs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_image_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_image_hero_crumbs" ADD CONSTRAINT "_page_v_blocks_image_hero_crumbs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_image_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_image_hero_crumbs" ADD CONSTRAINT "presets_blocks_image_hero_crumbs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_image_hero"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_image_hero_crumbs_order_idx" ON "page_blocks_image_hero_crumbs" USING btree ("_order");
  CREATE INDEX "page_blocks_image_hero_crumbs_parent_id_idx" ON "page_blocks_image_hero_crumbs" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_image_hero_crumbs_locale_idx" ON "page_blocks_image_hero_crumbs" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_image_hero_crumbs_order_idx" ON "_page_v_blocks_image_hero_crumbs" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_image_hero_crumbs_parent_id_idx" ON "_page_v_blocks_image_hero_crumbs" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_image_hero_crumbs_locale_idx" ON "_page_v_blocks_image_hero_crumbs" USING btree ("_locale");
  CREATE INDEX "presets_blocks_image_hero_crumbs_order_idx" ON "presets_blocks_image_hero_crumbs" USING btree ("_order");
  CREATE INDEX "presets_blocks_image_hero_crumbs_parent_id_idx" ON "presets_blocks_image_hero_crumbs" USING btree ("_parent_id");
  ALTER TABLE "site_settings" DROP COLUMN "general_favicon_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_general_favicon_id";`)
}
