import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "_header_v" ADD COLUMN "autosave" boolean;
  ALTER TABLE "_footer_v" ADD COLUMN "autosave" boolean;
  CREATE INDEX "_header_v_autosave_idx" ON "_header_v" USING btree ("autosave");
  CREATE INDEX "_footer_v_autosave_idx" ON "_footer_v" USING btree ("autosave");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "_header_v_autosave_idx";
  DROP INDEX "_footer_v_autosave_idx";
  ALTER TABLE "_header_v" DROP COLUMN "autosave";
  ALTER TABLE "_footer_v" DROP COLUMN "autosave";`)
}
