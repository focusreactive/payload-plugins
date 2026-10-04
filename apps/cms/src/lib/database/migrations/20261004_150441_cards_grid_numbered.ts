import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_cards_grid" ADD COLUMN "numbered" boolean DEFAULT false;
  ALTER TABLE "_page_v_blocks_cards_grid" ADD COLUMN "numbered" boolean DEFAULT false;
  ALTER TABLE "gsec_blocks_cards_grid" ADD COLUMN "numbered" boolean DEFAULT false;
  ALTER TABLE "_gsec_v_blocks_cards_grid" ADD COLUMN "numbered" boolean DEFAULT false;
  ALTER TABLE "presets_blocks_cards_grid" ADD COLUMN "numbered" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_cards_grid" DROP COLUMN "numbered";
  ALTER TABLE "_page_v_blocks_cards_grid" DROP COLUMN "numbered";
  ALTER TABLE "gsec_blocks_cards_grid" DROP COLUMN "numbered";
  ALTER TABLE "_gsec_v_blocks_cards_grid" DROP COLUMN "numbered";
  ALTER TABLE "presets_blocks_cards_grid" DROP COLUMN "numbered";`)
}
