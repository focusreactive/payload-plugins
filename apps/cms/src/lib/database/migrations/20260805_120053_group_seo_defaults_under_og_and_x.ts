import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_settings_seo_x_card" AS ENUM('summary_large_image', 'summary');
  CREATE TYPE "public"."enum__site_settings_v_version_seo_x_card" AS ENUM('summary_large_image', 'summary');
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_global_section_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_seo_default_og_image_id_media_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_seo_default_og_image_id_media_id_fk";
  
  DROP INDEX "site_settings_seo_seo_default_og_image_idx";
  DROP INDEX "_site_settings_v_version_seo_version_seo_default_og_imag_idx";
  ALTER TABLE "site_settings" ADD COLUMN "seo_og_image_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "seo_x_card" "enum_site_settings_seo_x_card" DEFAULT 'summary_large_image';
  ALTER TABLE "site_settings_locales" ADD COLUMN "seo_og_title" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "seo_og_description" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "seo_x_site" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "seo_x_creator" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_seo_og_image_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_seo_x_card" "enum__site_settings_v_version_seo_x_card" DEFAULT 'summary_large_image';
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_seo_og_title" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_seo_og_description" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_seo_x_site" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_seo_x_creator" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_global_block_fk" FOREIGN KEY ("gsec_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_seo_og_image_id_media_id_fk" FOREIGN KEY ("seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_seo_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_settings_seo_og_seo_og_image_idx" ON "site_settings" USING btree ("seo_og_image_id");
  CREATE INDEX "_site_settings_v_version_seo_og_version_seo_og_image_idx" ON "_site_settings_v" USING btree ("version_seo_og_image_id");
  ALTER TABLE "site_settings" DROP COLUMN "seo_default_og_image_id";
  ALTER TABLE "site_settings" DROP COLUMN "seo_default_twitter_card";
  ALTER TABLE "site_settings_locales" DROP COLUMN "seo_default_og_title";
  ALTER TABLE "site_settings_locales" DROP COLUMN "seo_default_og_description";
  ALTER TABLE "site_settings_locales" DROP COLUMN "seo_twitter_site";
  ALTER TABLE "site_settings_locales" DROP COLUMN "seo_twitter_creator";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_seo_default_og_image_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_seo_default_twitter_card";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_seo_default_og_title";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_seo_default_og_description";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_seo_twitter_site";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_seo_twitter_creator";
  DROP TYPE "public"."enum_site_settings_seo_default_twitter_card";
  DROP TYPE "public"."enum__site_settings_v_version_seo_default_twitter_card";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_site_settings_seo_default_twitter_card" AS ENUM('summary_large_image', 'summary');
  CREATE TYPE "public"."enum__site_settings_v_version_seo_default_twitter_card" AS ENUM('summary_large_image', 'summary');
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_global_block_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_seo_og_image_id_media_id_fk";
  
  ALTER TABLE "_site_settings_v" DROP CONSTRAINT "_site_settings_v_version_seo_og_image_id_media_id_fk";
  
  DROP INDEX "site_settings_seo_og_seo_og_image_idx";
  DROP INDEX "_site_settings_v_version_seo_og_version_seo_og_image_idx";
  ALTER TABLE "site_settings" ADD COLUMN "seo_default_og_image_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "seo_default_twitter_card" "enum_site_settings_seo_default_twitter_card" DEFAULT 'summary_large_image';
  ALTER TABLE "site_settings_locales" ADD COLUMN "seo_default_og_title" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "seo_default_og_description" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "seo_twitter_site" varchar;
  ALTER TABLE "site_settings_locales" ADD COLUMN "seo_twitter_creator" varchar;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_seo_default_og_image_id" integer;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_seo_default_twitter_card" "enum__site_settings_v_version_seo_default_twitter_card" DEFAULT 'summary_large_image';
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_seo_default_og_title" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_seo_default_og_description" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_seo_twitter_site" varchar;
  ALTER TABLE "_site_settings_v_locales" ADD COLUMN "version_seo_twitter_creator" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_global_section_fk" FOREIGN KEY ("gsec_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_seo_default_og_image_id_media_id_fk" FOREIGN KEY ("seo_default_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_seo_default_og_image_id_media_id_fk" FOREIGN KEY ("version_seo_default_og_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "site_settings_seo_seo_default_og_image_idx" ON "site_settings" USING btree ("seo_default_og_image_id");
  CREATE INDEX "_site_settings_v_version_seo_version_seo_default_og_imag_idx" ON "_site_settings_v" USING btree ("version_seo_default_og_image_id");
  ALTER TABLE "site_settings" DROP COLUMN "seo_og_image_id";
  ALTER TABLE "site_settings" DROP COLUMN "seo_x_card";
  ALTER TABLE "site_settings_locales" DROP COLUMN "seo_og_title";
  ALTER TABLE "site_settings_locales" DROP COLUMN "seo_og_description";
  ALTER TABLE "site_settings_locales" DROP COLUMN "seo_x_site";
  ALTER TABLE "site_settings_locales" DROP COLUMN "seo_x_creator";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_seo_og_image_id";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_seo_x_card";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_seo_og_title";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_seo_og_description";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_seo_x_site";
  ALTER TABLE "_site_settings_v_locales" DROP COLUMN "version_seo_x_creator";
  DROP TYPE "public"."enum_site_settings_seo_x_card";
  DROP TYPE "public"."enum__site_settings_v_version_seo_x_card";`)
}
