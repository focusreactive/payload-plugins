import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_global_section_slot" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "_page_v_blocks_global_section_slot" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "presets_blocks_global_section_slot" ADD COLUMN "_hidden" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_global_section_slot" DROP COLUMN "_hidden";
  ALTER TABLE "_page_v_blocks_global_section_slot" DROP COLUMN "_hidden";
  ALTER TABLE "presets_blocks_global_section_slot" DROP COLUMN "_hidden";`)
}
