import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "_page_v" ADD COLUMN "autosave" boolean;
  ALTER TABLE "_posts_v" ADD COLUMN "autosave" boolean;
  ALTER TABLE "_gsec_v" ADD COLUMN "autosave" boolean;
  CREATE INDEX "_page_v_autosave_idx" ON "_page_v" USING btree ("autosave");
  CREATE INDEX "_posts_v_autosave_idx" ON "_posts_v" USING btree ("autosave");
  CREATE INDEX "_gsec_v_autosave_idx" ON "_gsec_v" USING btree ("autosave");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "_page_v_autosave_idx";
  DROP INDEX "_posts_v_autosave_idx";
  DROP INDEX "_gsec_v_autosave_idx";
  ALTER TABLE "_page_v" DROP COLUMN "autosave";
  ALTER TABLE "_posts_v" DROP COLUMN "autosave";
  ALTER TABLE "_gsec_v" DROP COLUMN "autosave";`)
}
