import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_page_blocks_cards_grid_items_icon" ADD VALUE 'star';
  ALTER TYPE "public"."enum_page_blocks_cards_grid_items_icon" ADD VALUE 'hourglass';
  ALTER TYPE "public"."enum_page_blocks_cards_grid_items_icon" ADD VALUE 'lightning';
  ALTER TYPE "public"."enum_page_blocks_cards_grid_items_icon" ADD VALUE 'lightbulb';
  ALTER TYPE "public"."enum_page_blocks_cards_grid_items_icon" ADD VALUE 'monitor';
  ALTER TYPE "public"."enum_page_blocks_cards_grid_items_icon" ADD VALUE 'notification-box';
  ALTER TYPE "public"."enum__page_v_blocks_cards_grid_items_icon" ADD VALUE 'star';
  ALTER TYPE "public"."enum__page_v_blocks_cards_grid_items_icon" ADD VALUE 'hourglass';
  ALTER TYPE "public"."enum__page_v_blocks_cards_grid_items_icon" ADD VALUE 'lightning';
  ALTER TYPE "public"."enum__page_v_blocks_cards_grid_items_icon" ADD VALUE 'lightbulb';
  ALTER TYPE "public"."enum__page_v_blocks_cards_grid_items_icon" ADD VALUE 'monitor';
  ALTER TYPE "public"."enum__page_v_blocks_cards_grid_items_icon" ADD VALUE 'notification-box';
  ALTER TYPE "public"."enum_gsec_blocks_cards_grid_items_icon" ADD VALUE 'star';
  ALTER TYPE "public"."enum_gsec_blocks_cards_grid_items_icon" ADD VALUE 'hourglass';
  ALTER TYPE "public"."enum_gsec_blocks_cards_grid_items_icon" ADD VALUE 'lightning';
  ALTER TYPE "public"."enum_gsec_blocks_cards_grid_items_icon" ADD VALUE 'lightbulb';
  ALTER TYPE "public"."enum_gsec_blocks_cards_grid_items_icon" ADD VALUE 'monitor';
  ALTER TYPE "public"."enum_gsec_blocks_cards_grid_items_icon" ADD VALUE 'notification-box';
  ALTER TYPE "public"."enum__gsec_v_blocks_cards_grid_items_icon" ADD VALUE 'star';
  ALTER TYPE "public"."enum__gsec_v_blocks_cards_grid_items_icon" ADD VALUE 'hourglass';
  ALTER TYPE "public"."enum__gsec_v_blocks_cards_grid_items_icon" ADD VALUE 'lightning';
  ALTER TYPE "public"."enum__gsec_v_blocks_cards_grid_items_icon" ADD VALUE 'lightbulb';
  ALTER TYPE "public"."enum__gsec_v_blocks_cards_grid_items_icon" ADD VALUE 'monitor';
  ALTER TYPE "public"."enum__gsec_v_blocks_cards_grid_items_icon" ADD VALUE 'notification-box';
  ALTER TYPE "public"."enum_presets_blocks_cards_grid_items_icon" ADD VALUE 'star';
  ALTER TYPE "public"."enum_presets_blocks_cards_grid_items_icon" ADD VALUE 'hourglass';
  ALTER TYPE "public"."enum_presets_blocks_cards_grid_items_icon" ADD VALUE 'lightning';
  ALTER TYPE "public"."enum_presets_blocks_cards_grid_items_icon" ADD VALUE 'lightbulb';
  ALTER TYPE "public"."enum_presets_blocks_cards_grid_items_icon" ADD VALUE 'monitor';
  ALTER TYPE "public"."enum_presets_blocks_cards_grid_items_icon" ADD VALUE 'notification-box';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   UPDATE "page_blocks_cards_grid_items" SET "icon" = NULL WHERE "icon"::text IN ('star', 'hourglass', 'lightning', 'lightbulb', 'monitor', 'notification-box');
  ALTER TABLE "page_blocks_cards_grid_items" ALTER COLUMN "icon" SET DATA TYPE text;
  DROP TYPE "public"."enum_page_blocks_cards_grid_items_icon";
  CREATE TYPE "public"."enum_page_blocks_cards_grid_items_icon" AS ENUM('map', 'clock', 'zap', 'activity', 'layout-grid', 'sparkles', 'file-text', 'users', 'bar-chart-3', 'plug', 'shield', 'git-branch', 'gauge', 'bell', 'layers', 'workflow', 'calendar', 'compass', 'target', 'wand-2');
  ALTER TABLE "page_blocks_cards_grid_items" ALTER COLUMN "icon" SET DATA TYPE "public"."enum_page_blocks_cards_grid_items_icon" USING "icon"::"public"."enum_page_blocks_cards_grid_items_icon";
  UPDATE "_page_v_blocks_cards_grid_items" SET "icon" = NULL WHERE "icon"::text IN ('star', 'hourglass', 'lightning', 'lightbulb', 'monitor', 'notification-box');
  ALTER TABLE "_page_v_blocks_cards_grid_items" ALTER COLUMN "icon" SET DATA TYPE text;
  DROP TYPE "public"."enum__page_v_blocks_cards_grid_items_icon";
  CREATE TYPE "public"."enum__page_v_blocks_cards_grid_items_icon" AS ENUM('map', 'clock', 'zap', 'activity', 'layout-grid', 'sparkles', 'file-text', 'users', 'bar-chart-3', 'plug', 'shield', 'git-branch', 'gauge', 'bell', 'layers', 'workflow', 'calendar', 'compass', 'target', 'wand-2');
  ALTER TABLE "_page_v_blocks_cards_grid_items" ALTER COLUMN "icon" SET DATA TYPE "public"."enum__page_v_blocks_cards_grid_items_icon" USING "icon"::"public"."enum__page_v_blocks_cards_grid_items_icon";
  UPDATE "gsec_blocks_cards_grid_items" SET "icon" = NULL WHERE "icon"::text IN ('star', 'hourglass', 'lightning', 'lightbulb', 'monitor', 'notification-box');
  ALTER TABLE "gsec_blocks_cards_grid_items" ALTER COLUMN "icon" SET DATA TYPE text;
  DROP TYPE "public"."enum_gsec_blocks_cards_grid_items_icon";
  CREATE TYPE "public"."enum_gsec_blocks_cards_grid_items_icon" AS ENUM('map', 'clock', 'zap', 'activity', 'layout-grid', 'sparkles', 'file-text', 'users', 'bar-chart-3', 'plug', 'shield', 'git-branch', 'gauge', 'bell', 'layers', 'workflow', 'calendar', 'compass', 'target', 'wand-2');
  ALTER TABLE "gsec_blocks_cards_grid_items" ALTER COLUMN "icon" SET DATA TYPE "public"."enum_gsec_blocks_cards_grid_items_icon" USING "icon"::"public"."enum_gsec_blocks_cards_grid_items_icon";
  UPDATE "_gsec_v_blocks_cards_grid_items" SET "icon" = NULL WHERE "icon"::text IN ('star', 'hourglass', 'lightning', 'lightbulb', 'monitor', 'notification-box');
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" ALTER COLUMN "icon" SET DATA TYPE text;
  DROP TYPE "public"."enum__gsec_v_blocks_cards_grid_items_icon";
  CREATE TYPE "public"."enum__gsec_v_blocks_cards_grid_items_icon" AS ENUM('map', 'clock', 'zap', 'activity', 'layout-grid', 'sparkles', 'file-text', 'users', 'bar-chart-3', 'plug', 'shield', 'git-branch', 'gauge', 'bell', 'layers', 'workflow', 'calendar', 'compass', 'target', 'wand-2');
  ALTER TABLE "_gsec_v_blocks_cards_grid_items" ALTER COLUMN "icon" SET DATA TYPE "public"."enum__gsec_v_blocks_cards_grid_items_icon" USING "icon"::"public"."enum__gsec_v_blocks_cards_grid_items_icon";
  UPDATE "presets_blocks_cards_grid_items" SET "icon" = NULL WHERE "icon"::text IN ('star', 'hourglass', 'lightning', 'lightbulb', 'monitor', 'notification-box');
  ALTER TABLE "presets_blocks_cards_grid_items" ALTER COLUMN "icon" SET DATA TYPE text;
  DROP TYPE "public"."enum_presets_blocks_cards_grid_items_icon";
  CREATE TYPE "public"."enum_presets_blocks_cards_grid_items_icon" AS ENUM('map', 'clock', 'zap', 'activity', 'layout-grid', 'sparkles', 'file-text', 'users', 'bar-chart-3', 'plug', 'shield', 'git-branch', 'gauge', 'bell', 'layers', 'workflow', 'calendar', 'compass', 'target', 'wand-2');
  ALTER TABLE "presets_blocks_cards_grid_items" ALTER COLUMN "icon" SET DATA TYPE "public"."enum_presets_blocks_cards_grid_items_icon" USING "icon"::"public"."enum_presets_blocks_cards_grid_items_icon";`)
}
