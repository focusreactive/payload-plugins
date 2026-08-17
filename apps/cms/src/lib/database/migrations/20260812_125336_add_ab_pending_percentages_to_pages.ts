import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page" DROP COLUMN "_abvariantpercentages";
  ALTER TABLE "_page_v" DROP COLUMN "version__abvariantpercentages";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page" ADD COLUMN "_abvariantpercentages" jsonb;
  ALTER TABLE "_page_v" ADD COLUMN "version__abvariantpercentages" jsonb;`)
}
