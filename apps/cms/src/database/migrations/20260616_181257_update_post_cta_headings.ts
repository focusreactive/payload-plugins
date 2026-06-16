import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts_locales" ADD COLUMN "cta_description" varchar;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_cta_description" varchar;
  ALTER TABLE "posts_locales" DROP COLUMN "cta_lead";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_cta_lead";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts_locales" ADD COLUMN "cta_lead" varchar;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_cta_lead" varchar;
  ALTER TABLE "posts_locales" DROP COLUMN "cta_description";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_cta_description";`)
}
