import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "posts_locales" ALTER COLUMN "meta_robots" SET DEFAULT 'noindex';
  ALTER TABLE "_posts_v_locales" ALTER COLUMN "version_meta_robots" SET DEFAULT 'noindex';
  ALTER TABLE "page_blocks_hero" DROP COLUMN "enabled";
  ALTER TABLE "page_blocks_hero" DROP COLUMN "color";
  ALTER TABLE "page_blocks_hero" DROP COLUMN "opacity";
  ALTER TABLE "_page_v_blocks_hero" DROP COLUMN "enabled";
  ALTER TABLE "_page_v_blocks_hero" DROP COLUMN "color";
  ALTER TABLE "_page_v_blocks_hero" DROP COLUMN "opacity";
  ALTER TABLE "presets_blocks_hero" DROP COLUMN "enabled";
  ALTER TABLE "presets_blocks_hero" DROP COLUMN "color";
  ALTER TABLE "presets_blocks_hero" DROP COLUMN "opacity";
  DROP TYPE "public"."enum_page_blocks_hero_color";
  DROP TYPE "public"."enum__page_v_blocks_hero_color";
  DROP TYPE "public"."enum_presets_blocks_hero_color";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_hero_color" AS ENUM('black', 'white');
  CREATE TYPE "public"."enum__page_v_blocks_hero_color" AS ENUM('black', 'white');
  CREATE TYPE "public"."enum_presets_blocks_hero_color" AS ENUM('black', 'white');
  ALTER TABLE "posts_locales" ALTER COLUMN "meta_robots" SET DEFAULT 'index';
  ALTER TABLE "_posts_v_locales" ALTER COLUMN "version_meta_robots" SET DEFAULT 'index';
  ALTER TABLE "page_blocks_hero" ADD COLUMN "enabled" boolean DEFAULT true;
  ALTER TABLE "page_blocks_hero" ADD COLUMN "color" "enum_page_blocks_hero_color" DEFAULT 'black';
  ALTER TABLE "page_blocks_hero" ADD COLUMN "opacity" numeric DEFAULT 40;
  ALTER TABLE "_page_v_blocks_hero" ADD COLUMN "enabled" boolean DEFAULT true;
  ALTER TABLE "_page_v_blocks_hero" ADD COLUMN "color" "enum__page_v_blocks_hero_color" DEFAULT 'black';
  ALTER TABLE "_page_v_blocks_hero" ADD COLUMN "opacity" numeric DEFAULT 40;
  ALTER TABLE "presets_blocks_hero" ADD COLUMN "enabled" boolean DEFAULT true;
  ALTER TABLE "presets_blocks_hero" ADD COLUMN "color" "enum_presets_blocks_hero_color" DEFAULT 'black';
  ALTER TABLE "presets_blocks_hero" ADD COLUMN "opacity" numeric DEFAULT 40;`)
}
