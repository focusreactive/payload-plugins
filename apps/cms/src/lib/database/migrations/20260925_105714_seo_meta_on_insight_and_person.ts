import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "person_locales" (
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  DROP INDEX "page_meta_meta_image_idx";
  DROP INDEX "_page_v_version_meta_version_meta_image_idx";
  DROP INDEX "posts_meta_meta_image_idx";
  DROP INDEX "_posts_v_version_meta_version_meta_image_idx";
  ALTER TABLE "insight_locales" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "insight_locales" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "person_locales" ADD CONSTRAINT "person_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "person_locales_locale_parent_id_unique" ON "person_locales" USING btree ("_locale","_parent_id");
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
   ALTER TABLE "person_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "person_locales" CASCADE;
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
