import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Slugs become localized so a translated page gets a translated URL segment
// instead of the English one under a language prefix.
//
// Hand-edited from the generated statements, which were unsafe twice over:
// they added "slug" to the _locales tables as NOT NULL (Postgres rejects that
// on a populated table) and dropped the base columns without copying the
// values, which would have emptied every slug and 404ed the whole estate.
// The copy below runs before the drop - do not reorder. Every existing locale
// row inherits the current slug, so nothing breaks at migration time; the seed
// then overwrites the Italian ones with real Italian slugs.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX "conditions_slug_idx";
  DROP INDEX "cities_slug_idx";
  DROP INDEX "generated_pages_slug_idx";
  DROP INDEX "_generated_pages_v_version_version_slug_idx";

  ALTER TABLE "conditions_locales" ADD COLUMN "generate_slug" boolean DEFAULT true;
  ALTER TABLE "conditions_locales" ADD COLUMN "slug" varchar;
  ALTER TABLE "cities_locales" ADD COLUMN "generate_slug" boolean DEFAULT true;
  ALTER TABLE "cities_locales" ADD COLUMN "slug" varchar;
  ALTER TABLE "generated_pages_locales" ADD COLUMN "slug" varchar;
  ALTER TABLE "_generated_pages_v_locales" ADD COLUMN "version_slug" varchar;

  UPDATE "conditions_locales" AS l
  SET "slug" = c."slug", "generate_slug" = c."generate_slug"
  FROM "conditions" c WHERE l."_parent_id" = c."id";

  UPDATE "cities_locales" AS l
  SET "slug" = c."slug", "generate_slug" = c."generate_slug"
  FROM "cities" c WHERE l."_parent_id" = c."id";

  UPDATE "generated_pages_locales" AS l
  SET "slug" = g."slug"
  FROM "generated_pages" g WHERE l."_parent_id" = g."id";

  UPDATE "_generated_pages_v_locales" AS l
  SET "version_slug" = v."version_slug"
  FROM "_generated_pages_v" v WHERE l."_parent_id" = v."id";

  ALTER TABLE "conditions_locales" ALTER COLUMN "slug" SET NOT NULL;
  ALTER TABLE "cities_locales" ALTER COLUMN "slug" SET NOT NULL;

  CREATE UNIQUE INDEX "conditions_slug_idx" ON "conditions_locales" USING btree ("slug","_locale");
  CREATE UNIQUE INDEX "cities_slug_idx" ON "cities_locales" USING btree ("slug","_locale");
  CREATE UNIQUE INDEX "generated_pages_slug_idx" ON "generated_pages_locales" USING btree ("slug","_locale");
  CREATE INDEX "_generated_pages_v_version_version_slug_idx" ON "_generated_pages_v_locales" USING btree ("version_slug","_locale");

  ALTER TABLE "conditions" DROP COLUMN "generate_slug";
  ALTER TABLE "conditions" DROP COLUMN "slug";
  ALTER TABLE "cities" DROP COLUMN "generate_slug";
  ALTER TABLE "cities" DROP COLUMN "slug";
  ALTER TABLE "generated_pages" DROP COLUMN "slug";
  ALTER TABLE "_generated_pages_v" DROP COLUMN "version_slug";`)
}

// Restores the single-slug shape from the default locale. Non-default locale
// slugs cannot survive a column that only holds one value per row.
export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX "conditions_slug_idx";
  DROP INDEX "cities_slug_idx";
  DROP INDEX "generated_pages_slug_idx";
  DROP INDEX "_generated_pages_v_version_version_slug_idx";

  ALTER TABLE "conditions" ADD COLUMN "generate_slug" boolean DEFAULT true;
  ALTER TABLE "conditions" ADD COLUMN "slug" varchar;
  ALTER TABLE "cities" ADD COLUMN "generate_slug" boolean DEFAULT true;
  ALTER TABLE "cities" ADD COLUMN "slug" varchar;
  ALTER TABLE "generated_pages" ADD COLUMN "slug" varchar;
  ALTER TABLE "_generated_pages_v" ADD COLUMN "version_slug" varchar;

  UPDATE "conditions" SET "slug" = l."slug", "generate_slug" = l."generate_slug"
  FROM "conditions_locales" l WHERE l."_parent_id" = "conditions"."id" AND l."_locale" = 'en';

  UPDATE "cities" SET "slug" = l."slug", "generate_slug" = l."generate_slug"
  FROM "cities_locales" l WHERE l."_parent_id" = "cities"."id" AND l."_locale" = 'en';

  UPDATE "generated_pages" SET "slug" = l."slug"
  FROM "generated_pages_locales" l WHERE l."_parent_id" = "generated_pages"."id" AND l."_locale" = 'en';

  UPDATE "_generated_pages_v" SET "version_slug" = l."version_slug"
  FROM "_generated_pages_v_locales" l WHERE l."_parent_id" = "_generated_pages_v"."id" AND l."_locale" = 'en';

  ALTER TABLE "conditions" ALTER COLUMN "slug" SET NOT NULL;
  ALTER TABLE "cities" ALTER COLUMN "slug" SET NOT NULL;

  CREATE UNIQUE INDEX "conditions_slug_idx" ON "conditions" USING btree ("slug");
  CREATE UNIQUE INDEX "cities_slug_idx" ON "cities" USING btree ("slug");
  CREATE UNIQUE INDEX "generated_pages_slug_idx" ON "generated_pages" USING btree ("slug");
  CREATE INDEX "_generated_pages_v_version_version_slug_idx" ON "_generated_pages_v" USING btree ("version_slug");

  ALTER TABLE "conditions_locales" DROP COLUMN "generate_slug";
  ALTER TABLE "conditions_locales" DROP COLUMN "slug";
  ALTER TABLE "cities_locales" DROP COLUMN "generate_slug";
  ALTER TABLE "cities_locales" DROP COLUMN "slug";
  ALTER TABLE "generated_pages_locales" DROP COLUMN "slug";
  ALTER TABLE "_generated_pages_v_locales" DROP COLUMN "version_slug";`)
}
