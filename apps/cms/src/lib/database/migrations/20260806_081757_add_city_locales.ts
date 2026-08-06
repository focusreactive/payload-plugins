import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// city title/country become localized. The generated statements drop the old
// columns, so existing values are copied into the default locale first - do
// not reorder. down() restores the columns but cannot restore non-default
// locale values.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "cities_locales" (
  	"title" varchar NOT NULL,
  	"country" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );

  ALTER TABLE "cities_locales" ADD CONSTRAINT "cities_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "cities_locales_locale_parent_id_unique" ON "cities_locales" USING btree ("_locale","_parent_id");
  INSERT INTO "cities_locales" ("title", "country", "_locale", "_parent_id")
  SELECT "title", "country", 'en', "id" FROM "cities";
  ALTER TABLE "cities" DROP COLUMN "title";
  ALTER TABLE "cities" DROP COLUMN "country";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "cities" ADD COLUMN "title" varchar;
  ALTER TABLE "cities" ADD COLUMN "country" varchar;
  UPDATE "cities" SET "title" = "l"."title", "country" = "l"."country"
  FROM "cities_locales" "l" WHERE "l"."_parent_id" = "cities"."id" AND "l"."_locale" = 'en';
  ALTER TABLE "cities" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "cities" ALTER COLUMN "country" SET NOT NULL;
  DROP TABLE "cities_locales" CASCADE;`)
}
