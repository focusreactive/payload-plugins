import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_settings_seo_default_twitter_card" AS ENUM('summary_large_image', 'summary');
  CREATE TYPE "public"."enum_site_settings_blog_meta_robots" AS ENUM('index', 'noindex');
  CREATE TYPE "public"."enum__site_settings_v_version_seo_default_twitter_card" AS ENUM('summary_large_image', 'summary');
  CREATE TYPE "public"."enum__site_settings_v_version_blog_meta_robots" AS ENUM('index', 'noindex');
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_header_id_header_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_footer_id_footer_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_admin_logo_id_media_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_admin_icon_id_media_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_default_og_image_id_media_id_fk";
  
  ALTER TABLE "site_settings_locales" DROP CONSTRAINT "site_settings_locales_blog_blog_meta_image_id_media_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_header_id_header_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_footer_id_footer_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_admin_logo_id_media_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_admin_icon_id_media_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_default_og_image_id_media_id_fk";
  
  ALTER TABLE "_site_settings_v_locales" DROP CONSTRAINT "_site_settings_v_locales_version_blog_blog_meta_image_id_media_id_fk";
  
  DROP INDEX "site_settings_header_idx";
  DROP INDEX "site_settings_footer_idx";
  DROP INDEX "site_settings_admin_logo_idx";
  DROP INDEX "site_settings_admin_icon_idx";
  DROP INDEX "site_settings_default_og_image_idx";
  DROP INDEX "site_settings_blog_blog_meta_blog_blog_meta_image_idx";
  DROP INDEX "_site_settings_v_version_version_header_idx";
  DROP INDEX "_site_settings_v_version_version_footer_idx";
  DROP INDEX "_site_settings_v_version_version_admin_logo_idx";
  DROP INDEX "_site_settings_v_version_version_admin_icon_idx";
  DROP INDEX "_site_settings_v_version_version_default_og_image_idx";
  DROP INDEX "_site_settings_v_version_blog_blog_meta_version_blog_blo_idx";
  ALTER TABLE "site_settings" ADD COLUMN "admin_panel_logo_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "admin_panel_icon_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "seo_default_og_image_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "seo_default_twitter_card" "enum_site_settings_seo_default_twitter_card" DEFAULT 'summary_large_image';
  ALTER TABLE "site_settings" ADD COLUMN "not_found_header_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "not_found_footer_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "blog_header_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "blog_footer_id" integer;
  ALTER TABLE "site_settings_locales" ADD COLUMN "general_site_name" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "seo_default_og_title" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "seo_og_site_name" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "seo_default_description" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "seo_default_og_description" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "seo_twitter_site" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "seo_twitter_creator" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "blog_title" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "blog_description" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "blog_meta_title" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "blog_meta_image_id" integer;
  ALTER TABLE "site_settings_locales" ADD COLUMN "blog_meta_description" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "blog_meta_robots" "enum_site_settings_blog_meta_robots" DEFAULT 'index';
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_admin_panel_logo_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_admin_panel_icon_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_seo_default_og_image_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_seo_default_twitter_card" "enum__site_settings_v_version_seo_default_twitter_card" DEFAULT 'summary_large_image';
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_not_found_header_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_not_found_footer_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_blog_header_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_blog_footer_id" integer;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_general_site_name" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_seo_default_og_title" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_seo_og_site_name" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_seo_default_description" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_seo_default_og_description" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_seo_twitter_site" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_seo_twitter_creator" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_blog_title" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_blog_description" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_blog_meta_title" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_blog_meta_image_id" integer;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_blog_meta_description" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_blog_meta_robots" "enum__site_settings_v_version_blog_meta_robots" DEFAULT 'index';
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_admin_panel_logo_id_media_id_fk" FOREIGN KEY ("admin_panel_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_admin_panel_icon_id_media_id_fk" FOREIGN KEY ("admin_panel_icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_seo_default_og_image_id_media_id_fk" FOREIGN KEY ("seo_default_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_not_found_header_id_header_id_fk" FOREIGN KEY ("not_found_header_id") REFERENCES "public"."header"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_not_found_footer_id_footer_id_fk" FOREIGN KEY ("not_found_footer_id") REFERENCES "public"."footer"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_blog_header_id_header_id_fk" FOREIGN KEY ("blog_header_id") REFERENCES "public"."header"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_blog_footer_id_footer_id_fk" FOREIGN KEY ("blog_footer_id") REFERENCES "public"."footer"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_locales" ADD CONSTRAINT "site_settings_locales_blog_meta_image_id_media_id_fk" FOREIGN KEY ("blog_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_admin_panel_logo_id_media_id_fk" FOREIGN KEY ("version_admin_panel_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_admin_panel_icon_id_media_id_fk" FOREIGN KEY ("version_admin_panel_icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_seo_default_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_default_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_not_found_header_id_header_id_fk" FOREIGN KEY ("version_not_found_header_id") REFERENCES "public"."header"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_not_found_footer_id_footer_id_fk" FOREIGN KEY ("version_not_found_footer_id") REFERENCES "public"."footer"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_blog_header_id_header_id_fk" FOREIGN KEY ("version_blog_header_id") REFERENCES "public"."header"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_blog_footer_id_footer_id_fk" FOREIGN KEY ("version_blog_footer_id") REFERENCES "public"."footer"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v_locales" ADD CONSTRAINT "_site_settings_v_locales_version_blog_meta_image_id_media_id_fk" FOREIGN KEY ("version_blog_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_settings_admin_panel_admin_panel_logo_idx" ON "site_settings" USING btree ("admin_panel_logo_id");
  CREATE INDEX "site_settings_admin_panel_admin_panel_icon_idx" ON "site_settings" USING btree ("admin_panel_icon_id");
  CREATE INDEX "site_settings_seo_seo_default_og_image_idx" ON "site_settings" USING btree ("seo_default_og_image_id");
  CREATE INDEX "site_settings_not_found_not_found_header_idx" ON "site_settings" USING btree ("not_found_header_id");
  CREATE INDEX "site_settings_not_found_not_found_footer_idx" ON "site_settings" USING btree ("not_found_footer_id");
  CREATE INDEX "site_settings_blog_blog_header_idx" ON "site_settings" USING btree ("blog_header_id");
  CREATE INDEX "site_settings_blog_blog_footer_idx" ON "site_settings" USING btree ("blog_footer_id");
  CREATE INDEX "site_settings_blog_meta_blog_meta_image_idx" ON "site_settings_locales" USING btree ("blog_meta_image_id");
  CREATE INDEX "_site_settings_v_version_admin_panel_version_admin_panel_idx" ON "_site_settings_v" USING btree ("version_admin_panel_logo_id");
  CREATE INDEX "_site_settings_v_version_admin_panel_version_admin_pan_1_idx" ON "_site_settings_v" USING btree ("version_admin_panel_icon_id");
  CREATE INDEX "_site_settings_v_version_seo_version_seo_default_og_imag_idx" ON "_site_settings_v" USING btree ("version_seo_default_og_image_id");
  CREATE INDEX "_site_settings_v_version_not_found_version_not_found_hea_idx" ON "_site_settings_v" USING btree ("version_not_found_header_id");
  CREATE INDEX "_site_settings_v_version_not_found_version_not_found_foo_idx" ON "_site_settings_v" USING btree ("version_not_found_footer_id");
  CREATE INDEX "_site_settings_v_version_blog_version_blog_header_idx" ON "_site_settings_v" USING btree ("version_blog_header_id");
  CREATE INDEX "_site_settings_v_version_blog_version_blog_footer_idx" ON "_site_settings_v" USING btree ("version_blog_footer_id");
  CREATE INDEX "_site_settings_v_version_blog_meta_version_blog_meta_ima_idx" ON "_site_settings_v_locales" USING btree ("version_blog_meta_image_id");
  ALTER TABLE "site_settings" DROP COLUMN "header_id";
  ALTER TABLE "site_settings" DROP COLUMN "footer_id";
  ALTER TABLE "site_settings" DROP COLUMN "admin_logo_id";
  ALTER TABLE "site_settings" DROP COLUMN "admin_icon_id";
  ALTER TABLE "site_settings" DROP COLUMN "default_og_image_id";
  ALTER TABLE "site_settings" DROP COLUMN "default_twitter_card";
  ALTER TABLE "site_settings_locales" DROP COLUMN "site_name";
  ALTER TABLE "site_settings_locales" DROP COLUMN "default_og_title";
  ALTER TABLE "site_settings_locales" DROP COLUMN "og_site_name";
  ALTER TABLE "site_settings_locales" DROP COLUMN "default_description";
  ALTER TABLE "site_settings_locales" DROP COLUMN "default_og_description";
  ALTER TABLE "site_settings_locales" DROP COLUMN "twitter_site";
  ALTER TABLE "site_settings_locales" DROP COLUMN "twitter_creator";
  ALTER TABLE "site_settings_locales" DROP COLUMN "blog_blog_title";
  ALTER TABLE "site_settings_locales" DROP COLUMN "blog_blog_description";
  ALTER TABLE "site_settings_locales" DROP COLUMN "blog_blog_meta_title";
  ALTER TABLE "site_settings_locales" DROP COLUMN "blog_blog_meta_image_id";
  ALTER TABLE "site_settings_locales" DROP COLUMN "blog_blog_meta_description";
  ALTER TABLE "site_settings_locales" DROP COLUMN "blog_blog_meta_robots";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_header_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_footer_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_admin_logo_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_admin_icon_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_default_og_image_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_default_twitter_card";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_site_name";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_default_og_title";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_og_site_name";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_default_description";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_default_og_description";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_twitter_site";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_twitter_creator";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_blog_blog_title";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_blog_blog_description";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_blog_blog_meta_title";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_blog_blog_meta_image_id";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_blog_blog_meta_description";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_blog_blog_meta_robots";
  DROP TYPE "public"."enum_site_settings_default_twitter_card";
  DROP TYPE "public"."enum_site_settings_blog_blog_meta_robots";
  DROP TYPE "public"."enum__site_settings_v_version_default_twitter_card";
  DROP TYPE "public"."enum__site_settings_v_version_blog_blog_meta_robots";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_settings_default_twitter_card" AS ENUM('summary_large_image', 'summary');
  CREATE TYPE "public"."enum_site_settings_blog_blog_meta_robots" AS ENUM('index', 'noindex');
  CREATE TYPE "public"."enum__site_settings_v_version_default_twitter_card" AS ENUM('summary_large_image', 'summary');
  CREATE TYPE "public"."enum__site_settings_v_version_blog_blog_meta_robots" AS ENUM('index', 'noindex');
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_admin_panel_logo_id_media_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_admin_panel_icon_id_media_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_seo_default_og_image_id_media_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_not_found_header_id_header_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_not_found_footer_id_footer_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_blog_header_id_header_id_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_blog_footer_id_footer_id_fk";
  
  ALTER TABLE "site_settings_locales" DROP CONSTRAINT "site_settings_locales_blog_meta_image_id_media_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_admin_panel_logo_id_media_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_admin_panel_icon_id_media_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_seo_default_og_image_id_media_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_not_found_header_id_header_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_not_found_footer_id_footer_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_blog_header_id_header_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_blog_footer_id_footer_id_fk";
  
  ALTER TABLE "_site_settings_v_locales" DROP CONSTRAINT "_site_settings_v_locales_version_blog_meta_image_id_media_id_fk";
  
  DROP INDEX "site_settings_admin_panel_admin_panel_logo_idx";
  DROP INDEX "site_settings_admin_panel_admin_panel_icon_idx";
  DROP INDEX "site_settings_seo_seo_default_og_image_idx";
  DROP INDEX "site_settings_not_found_not_found_header_idx";
  DROP INDEX "site_settings_not_found_not_found_footer_idx";
  DROP INDEX "site_settings_blog_blog_header_idx";
  DROP INDEX "site_settings_blog_blog_footer_idx";
  DROP INDEX "site_settings_blog_meta_blog_meta_image_idx";
  DROP INDEX "_site_settings_v_version_admin_panel_version_admin_panel_idx";
  DROP INDEX "_site_settings_v_version_admin_panel_version_admin_pan_1_idx";
  DROP INDEX "_site_settings_v_version_seo_version_seo_default_og_imag_idx";
  DROP INDEX "_site_settings_v_version_not_found_version_not_found_hea_idx";
  DROP INDEX "_site_settings_v_version_not_found_version_not_found_foo_idx";
  DROP INDEX "_site_settings_v_version_blog_version_blog_header_idx";
  DROP INDEX "_site_settings_v_version_blog_version_blog_footer_idx";
  DROP INDEX "_site_settings_v_version_blog_meta_version_blog_meta_ima_idx";
  ALTER TABLE "site_settings" ADD COLUMN "header_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "footer_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "admin_logo_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "admin_icon_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "default_og_image_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "default_twitter_card" "enum_site_settings_default_twitter_card" DEFAULT 'summary_large_image';
  ALTER TABLE "site_settings_locales" ADD COLUMN "site_name" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "default_og_title" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "og_site_name" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "default_description" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "default_og_description" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "twitter_site" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "twitter_creator" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "blog_blog_title" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "blog_blog_description" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "blog_blog_meta_title" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "blog_blog_meta_image_id" integer;
  ALTER TABLE "site_settings_locales" ADD COLUMN "blog_blog_meta_description" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "blog_blog_meta_robots" "enum_site_settings_blog_blog_meta_robots" DEFAULT 'index';
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_header_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_footer_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_admin_logo_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_admin_icon_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_default_og_image_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_default_twitter_card" "enum__site_settings_v_version_default_twitter_card" DEFAULT 'summary_large_image';
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_site_name" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_default_og_title" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_og_site_name" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_default_description" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_default_og_description" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_twitter_site" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_twitter_creator" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_blog_blog_title" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_blog_blog_description" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_blog_blog_meta_title" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_blog_blog_meta_image_id" integer;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_blog_blog_meta_description" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_blog_blog_meta_robots" "enum__site_settings_v_version_blog_blog_meta_robots" DEFAULT 'index';
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_header_id_header_id_fk" FOREIGN KEY ("header_id") REFERENCES "public"."header"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_footer_id_footer_id_fk" FOREIGN KEY ("footer_id") REFERENCES "public"."footer"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_admin_logo_id_media_id_fk" FOREIGN KEY ("admin_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_admin_icon_id_media_id_fk" FOREIGN KEY ("admin_icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_default_og_image_id_media_id_fk" FOREIGN KEY ("default_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings_locales" ADD CONSTRAINT "site_settings_locales_blog_blog_meta_image_id_media_id_fk" FOREIGN KEY ("blog_blog_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_header_id_header_id_fk" FOREIGN KEY ("version_header_id") REFERENCES "public"."header"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_footer_id_footer_id_fk" FOREIGN KEY ("version_footer_id") REFERENCES "public"."footer"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_admin_logo_id_media_id_fk" FOREIGN KEY ("version_admin_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_admin_icon_id_media_id_fk" FOREIGN KEY ("version_admin_icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_default_og_image_id_media_id_fk" FOREIGN KEY ("version_default_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v_locales" ADD CONSTRAINT "_site_settings_v_locales_version_blog_blog_meta_image_id_media_id_fk" FOREIGN KEY ("version_blog_blog_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_settings_header_idx" ON "site_settings" USING btree ("header_id");
  CREATE INDEX "site_settings_footer_idx" ON "site_settings" USING btree ("footer_id");
  CREATE INDEX "site_settings_admin_logo_idx" ON "site_settings" USING btree ("admin_logo_id");
  CREATE INDEX "site_settings_admin_icon_idx" ON "site_settings" USING btree ("admin_icon_id");
  CREATE INDEX "site_settings_default_og_image_idx" ON "site_settings" USING btree ("default_og_image_id");
  CREATE INDEX "site_settings_blog_blog_meta_blog_blog_meta_image_idx" ON "site_settings_locales" USING btree ("blog_blog_meta_image_id");
  CREATE INDEX "_site_settings_v_version_version_header_idx" ON "_site_settings_v" USING btree ("version_header_id");
  CREATE INDEX "_site_settings_v_version_version_footer_idx" ON "_site_settings_v" USING btree ("version_footer_id");
  CREATE INDEX "_site_settings_v_version_version_admin_logo_idx" ON "_site_settings_v" USING btree ("version_admin_logo_id");
  CREATE INDEX "_site_settings_v_version_version_admin_icon_idx" ON "_site_settings_v" USING btree ("version_admin_icon_id");
  CREATE INDEX "_site_settings_v_version_version_default_og_image_idx" ON "_site_settings_v" USING btree ("version_default_og_image_id");
  CREATE INDEX "_site_settings_v_version_blog_blog_meta_version_blog_blo_idx" ON "_site_settings_v_locales" USING btree ("version_blog_blog_meta_image_id");
  ALTER TABLE "site_settings" DROP COLUMN "admin_panel_logo_id";
  ALTER TABLE "site_settings" DROP COLUMN "admin_panel_icon_id";
  ALTER TABLE "site_settings" DROP COLUMN "seo_default_og_image_id";
  ALTER TABLE "site_settings" DROP COLUMN "seo_default_twitter_card";
  ALTER TABLE "site_settings" DROP COLUMN "not_found_header_id";
  ALTER TABLE "site_settings" DROP COLUMN "not_found_footer_id";
  ALTER TABLE "site_settings" DROP COLUMN "blog_header_id";
  ALTER TABLE "site_settings" DROP COLUMN "blog_footer_id";
  ALTER TABLE "site_settings_locales" DROP COLUMN "general_site_name";
  ALTER TABLE "site_settings_locales" DROP COLUMN "seo_default_og_title";
  ALTER TABLE "site_settings_locales" DROP COLUMN "seo_og_site_name";
  ALTER TABLE "site_settings_locales" DROP COLUMN "seo_default_description";
  ALTER TABLE "site_settings_locales" DROP COLUMN "seo_default_og_description";
  ALTER TABLE "site_settings_locales" DROP COLUMN "seo_twitter_site";
  ALTER TABLE "site_settings_locales" DROP COLUMN "seo_twitter_creator";
  ALTER TABLE "site_settings_locales" DROP COLUMN "blog_title";
  ALTER TABLE "site_settings_locales" DROP COLUMN "blog_description";
  ALTER TABLE "site_settings_locales" DROP COLUMN "blog_meta_title";
  ALTER TABLE "site_settings_locales" DROP COLUMN "blog_meta_image_id";
  ALTER TABLE "site_settings_locales" DROP COLUMN "blog_meta_description";
  ALTER TABLE "site_settings_locales" DROP COLUMN "blog_meta_robots";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_admin_panel_logo_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_admin_panel_icon_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_seo_default_og_image_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_seo_default_twitter_card";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_not_found_header_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_not_found_footer_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_blog_header_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_blog_footer_id";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_general_site_name";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_seo_default_og_title";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_seo_og_site_name";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_seo_default_description";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_seo_default_og_description";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_seo_twitter_site";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_seo_twitter_creator";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_blog_title";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_blog_description";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_blog_meta_title";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_blog_meta_image_id";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_blog_meta_description";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_blog_meta_robots";
  DROP TYPE "public"."enum_site_settings_seo_default_twitter_card";
  DROP TYPE "public"."enum_site_settings_blog_meta_robots";
  DROP TYPE "public"."enum__site_settings_v_version_seo_default_twitter_card";
  DROP TYPE "public"."enum__site_settings_v_version_blog_meta_robots";`)
}
