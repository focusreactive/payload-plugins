import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "presets_blocks_logos_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "page_blocks_logos" ADD COLUMN "label" varchar;
  ALTER TABLE "_page_v_blocks_logos" ADD COLUMN "label" varchar;
  ALTER TABLE "presets_blocks_logos_locales" ADD CONSTRAINT "presets_blocks_logos_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_logos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "presets_blocks_logos_locales_locale_parent_id_unique" ON "presets_blocks_logos_locales" USING btree ("_locale","_parent_id");`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "presets_blocks_logos_locales" CASCADE;
  ALTER TABLE "page_blocks_logos" DROP COLUMN "label";
  ALTER TABLE "_page_v_blocks_logos" DROP COLUMN "label";`);
}
