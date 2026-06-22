import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "footer_locales" ADD COLUMN "copyright_text" varchar;
  ALTER TABLE "_footer_v_locales" ADD COLUMN "version_copyright_text" varchar;
  ALTER TABLE "footer_locales" DROP COLUMN "copywrite_text";
  ALTER TABLE "_footer_v_locales" DROP COLUMN "version_copywrite_text";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "footer_locales" ADD COLUMN "copywrite_text" varchar;
  ALTER TABLE "_footer_v_locales" ADD COLUMN "version_copywrite_text" varchar;
  ALTER TABLE "footer_locales" DROP COLUMN "copyright_text";
  ALTER TABLE "_footer_v_locales" DROP COLUMN "version_copyright_text";`)
}
