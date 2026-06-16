import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_hero" ALTER COLUMN "variant" SET DATA TYPE text;
  ALTER TABLE "page_blocks_hero" ALTER COLUMN "variant" SET DEFAULT 'showcase'::text;
  UPDATE "page_blocks_hero" SET "variant" = 'showcase' WHERE "variant" = 'media-background';
  DROP TYPE "public"."enum_page_blocks_hero_variant";
  CREATE TYPE "public"."enum_page_blocks_hero_variant" AS ENUM('showcase', 'centered');
  ALTER TABLE "page_blocks_hero" ALTER COLUMN "variant" SET DEFAULT 'showcase'::"public"."enum_page_blocks_hero_variant";
  ALTER TABLE "page_blocks_hero" ALTER COLUMN "variant" SET DATA TYPE "public"."enum_page_blocks_hero_variant" USING "variant"::"public"."enum_page_blocks_hero_variant";
  ALTER TABLE "_page_v_blocks_hero" ALTER COLUMN "variant" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_hero" ALTER COLUMN "variant" SET DEFAULT 'showcase'::text;
  UPDATE "_page_v_blocks_hero" SET "variant" = 'showcase' WHERE "variant" = 'media-background';
  DROP TYPE "public"."enum__page_v_blocks_hero_variant";
  CREATE TYPE "public"."enum__page_v_blocks_hero_variant" AS ENUM('showcase', 'centered');
  ALTER TABLE "_page_v_blocks_hero" ALTER COLUMN "variant" SET DEFAULT 'showcase'::"public"."enum__page_v_blocks_hero_variant";
  ALTER TABLE "_page_v_blocks_hero" ALTER COLUMN "variant" SET DATA TYPE "public"."enum__page_v_blocks_hero_variant" USING "variant"::"public"."enum__page_v_blocks_hero_variant";
  ALTER TABLE "presets_blocks_hero" ALTER COLUMN "variant" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_hero" ALTER COLUMN "variant" SET DEFAULT 'showcase'::text;
  UPDATE "presets_blocks_hero" SET "variant" = 'showcase' WHERE "variant" = 'media-background';
  DROP TYPE "public"."enum_presets_blocks_hero_variant";
  CREATE TYPE "public"."enum_presets_blocks_hero_variant" AS ENUM('showcase', 'centered');
  ALTER TABLE "presets_blocks_hero" ALTER COLUMN "variant" SET DEFAULT 'showcase'::"public"."enum_presets_blocks_hero_variant";
  ALTER TABLE "presets_blocks_hero" ALTER COLUMN "variant" SET DATA TYPE "public"."enum_presets_blocks_hero_variant" USING "variant"::"public"."enum_presets_blocks_hero_variant";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_hero" ALTER COLUMN "variant" SET DATA TYPE text;
  ALTER TABLE "page_blocks_hero" ALTER COLUMN "variant" SET DEFAULT 'media-background'::text;
  DROP TYPE "public"."enum_page_blocks_hero_variant";
  CREATE TYPE "public"."enum_page_blocks_hero_variant" AS ENUM('media-background', 'showcase', 'centered');
  ALTER TABLE "page_blocks_hero" ALTER COLUMN "variant" SET DEFAULT 'media-background'::"public"."enum_page_blocks_hero_variant";
  ALTER TABLE "page_blocks_hero" ALTER COLUMN "variant" SET DATA TYPE "public"."enum_page_blocks_hero_variant" USING "variant"::"public"."enum_page_blocks_hero_variant";
  ALTER TABLE "_page_v_blocks_hero" ALTER COLUMN "variant" SET DATA TYPE text;
  ALTER TABLE "_page_v_blocks_hero" ALTER COLUMN "variant" SET DEFAULT 'media-background'::text;
  DROP TYPE "public"."enum__page_v_blocks_hero_variant";
  CREATE TYPE "public"."enum__page_v_blocks_hero_variant" AS ENUM('media-background', 'showcase', 'centered');
  ALTER TABLE "_page_v_blocks_hero" ALTER COLUMN "variant" SET DEFAULT 'media-background'::"public"."enum__page_v_blocks_hero_variant";
  ALTER TABLE "_page_v_blocks_hero" ALTER COLUMN "variant" SET DATA TYPE "public"."enum__page_v_blocks_hero_variant" USING "variant"::"public"."enum__page_v_blocks_hero_variant";
  ALTER TABLE "presets_blocks_hero" ALTER COLUMN "variant" SET DATA TYPE text;
  ALTER TABLE "presets_blocks_hero" ALTER COLUMN "variant" SET DEFAULT 'media-background'::text;
  DROP TYPE "public"."enum_presets_blocks_hero_variant";
  CREATE TYPE "public"."enum_presets_blocks_hero_variant" AS ENUM('media-background', 'showcase', 'centered');
  ALTER TABLE "presets_blocks_hero" ALTER COLUMN "variant" SET DEFAULT 'media-background'::"public"."enum_presets_blocks_hero_variant";
  ALTER TABLE "presets_blocks_hero" ALTER COLUMN "variant" SET DATA TYPE "public"."enum_presets_blocks_hero_variant" USING "variant"::"public"."enum_presets_blocks_hero_variant";`)
}
