import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts_locales" ADD COLUMN "reading_time" numeric;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_reading_time" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts_locales" DROP COLUMN "reading_time";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_reading_time";`)
}
