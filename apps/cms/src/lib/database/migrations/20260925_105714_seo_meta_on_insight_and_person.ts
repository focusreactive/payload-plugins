import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Hand-edited after merging with 20260925_105646_person_review_and_standfirsts, which already
// creates person_locales and _person_v_locales (people got drafts there), so this adds columns
// to both instead of creating the table a second time.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX "page_meta_meta_image_idx";
  DROP INDEX "_page_v_version_meta_version_meta_image_idx";
  DROP INDEX "posts_meta_meta_image_idx";
  DROP INDEX "_posts_v_version_meta_version_meta_image_idx";
  ALTER TABLE "insight_locales" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "insight_locales" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "person_locales" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "person_locales" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "_person_v_locales" ADD COLUMN "version_meta_title" varchar;
  ALTER TABLE "_person_v_locales" ADD COLUMN "version_meta_description" varchar;
  CREATE INDEX "page_meta_meta_image_idx" ON "page_locales" USING btree ("meta_image_id","_locale");
  CREATE INDEX "_page_v_version_meta_version_meta_image_idx" ON "_page_v_locales" USING btree ("version_meta_image_id","_locale");
  CREATE INDEX "posts_meta_meta_image_idx" ON "posts_locales" USING btree ("meta_image_id","_locale");
  CREATE INDEX "_posts_v_version_meta_version_meta_image_idx" ON "_posts_v_locales" USING btree ("version_meta_image_id","_locale");`)

  // SEO text fields now store a cleared value as null, so the "is empty" filter finds rows saved blank before this.
  await db.execute(sql`
  UPDATE "page_locales" SET "meta_title" = NULL WHERE btrim("meta_title") = '';
  UPDATE "page_locales" SET "meta_description" = NULL WHERE btrim("meta_description") = '';
  UPDATE "_page_v_locales" SET "version_meta_title" = NULL WHERE btrim("version_meta_title") = '';
  UPDATE "_page_v_locales" SET "version_meta_description" = NULL WHERE btrim("version_meta_description") = '';
  UPDATE "posts_locales" SET "meta_title" = NULL WHERE btrim("meta_title") = '';
  UPDATE "posts_locales" SET "meta_description" = NULL WHERE btrim("meta_description") = '';
  UPDATE "_posts_v_locales" SET "version_meta_title" = NULL WHERE btrim("version_meta_title") = '';
  UPDATE "_posts_v_locales" SET "version_meta_description" = NULL WHERE btrim("version_meta_description") = '';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "person_locales" DROP COLUMN "meta_title";
  ALTER TABLE "person_locales" DROP COLUMN "meta_description";
  ALTER TABLE "_person_v_locales" DROP COLUMN "version_meta_title";
  ALTER TABLE "_person_v_locales" DROP COLUMN "version_meta_description";
  DROP INDEX "page_meta_meta_image_idx";
  DROP INDEX "_page_v_version_meta_version_meta_image_idx";
  DROP INDEX "posts_meta_meta_image_idx";
  DROP INDEX "_posts_v_version_meta_version_meta_image_idx";
  CREATE INDEX "page_meta_meta_image_idx" ON "page_locales" USING btree ("meta_image_id");
  CREATE INDEX "_page_v_version_meta_version_meta_image_idx" ON "_page_v_locales" USING btree ("version_meta_image_id");
  CREATE INDEX "posts_meta_meta_image_idx" ON "posts_locales" USING btree ("meta_image_id");
  CREATE INDEX "_posts_v_version_meta_version_meta_image_idx" ON "_posts_v_locales" USING btree ("version_meta_image_id");
  ALTER TABLE "insight_locales" DROP COLUMN "meta_title";
  ALTER TABLE "insight_locales" DROP COLUMN "meta_description";`)
}
