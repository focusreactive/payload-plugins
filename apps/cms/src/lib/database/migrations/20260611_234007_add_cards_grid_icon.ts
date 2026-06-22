import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_cards_grid_items_icon" AS ENUM('map', 'clock', 'zap', 'activity', 'layout-grid', 'sparkles', 'file-text', 'users', 'bar-chart-3', 'plug', 'shield', 'git-branch', 'gauge', 'bell', 'layers', 'workflow', 'calendar', 'compass', 'target', 'wand-2');
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_items_icon" AS ENUM('map', 'clock', 'zap', 'activity', 'layout-grid', 'sparkles', 'file-text', 'users', 'bar-chart-3', 'plug', 'shield', 'git-branch', 'gauge', 'bell', 'layers', 'workflow', 'calendar', 'compass', 'target', 'wand-2');
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_items_icon" AS ENUM('map', 'clock', 'zap', 'activity', 'layout-grid', 'sparkles', 'file-text', 'users', 'bar-chart-3', 'plug', 'shield', 'git-branch', 'gauge', 'bell', 'layers', 'workflow', 'calendar', 'compass', 'target', 'wand-2');
  ALTER TABLE "page_blocks_cards_grid_items" ADD COLUMN "icon" "enum_page_blocks_cards_grid_items_icon";
  ALTER TABLE "_page_v_blocks_cards_grid_items" ADD COLUMN "icon" "enum__page_v_blocks_cards_grid_items_icon";
  ALTER TABLE "presets_blocks_cards_grid_items" ADD COLUMN "icon" "enum_presets_blocks_cards_grid_items_icon";`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_cards_grid_items" DROP COLUMN "icon";
  ALTER TABLE "_page_v_blocks_cards_grid_items" DROP COLUMN "icon";
  ALTER TABLE "presets_blocks_cards_grid_items" DROP COLUMN "icon";
  DROP TYPE "public"."enum_page_blocks_cards_grid_items_icon";
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_items_icon";
  DROP TYPE "public"."enum_presets_blocks_cards_grid_items_icon";`);
}
