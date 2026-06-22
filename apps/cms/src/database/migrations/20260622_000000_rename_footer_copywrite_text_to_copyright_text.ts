import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "footer_locales" RENAME COLUMN "copywrite_text" TO "copyright_text";
  ALTER TABLE "_footer_v_locales" RENAME COLUMN "version_copywrite_text" TO "version_copyright_text";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "footer_locales" RENAME COLUMN "copyright_text" TO "copywrite_text";
  ALTER TABLE "_footer_v_locales" RENAME COLUMN "version_copyright_text" TO "version_copywrite_text";`)
}
