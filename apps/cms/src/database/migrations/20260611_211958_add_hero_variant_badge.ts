import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_hero_variant" AS ENUM('media-background', 'showcase', 'centered');
  CREATE TYPE "public"."enum__page_v_blocks_hero_variant" AS ENUM('media-background', 'showcase', 'centered');
  CREATE TYPE "public"."enum_presets_blocks_hero_variant" AS ENUM('media-background', 'showcase', 'centered');
  ALTER TABLE "presets_blocks_hero" ALTER COLUMN "image_image_id" DROP NOT NULL;
  ALTER TABLE "page_blocks_hero" ADD COLUMN "variant" "enum_page_blocks_hero_variant" DEFAULT 'media-background';
  ALTER TABLE "page_blocks_hero" ADD COLUMN "badge" varchar;
  ALTER TABLE "_page_v_blocks_hero" ADD COLUMN "variant" "enum__page_v_blocks_hero_variant" DEFAULT 'media-background';
  ALTER TABLE "_page_v_blocks_hero" ADD COLUMN "badge" varchar;
  ALTER TABLE "presets_blocks_hero" ADD COLUMN "variant" "enum_presets_blocks_hero_variant" DEFAULT 'media-background' NOT NULL;
  ALTER TABLE "presets_blocks_hero_locales" ADD COLUMN "badge" varchar;`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presets_blocks_hero" ALTER COLUMN "image_image_id" SET NOT NULL;
  ALTER TABLE "page_blocks_hero" DROP COLUMN "variant";
  ALTER TABLE "page_blocks_hero" DROP COLUMN "badge";
  ALTER TABLE "_page_v_blocks_hero" DROP COLUMN "variant";
  ALTER TABLE "_page_v_blocks_hero" DROP COLUMN "badge";
  ALTER TABLE "presets_blocks_hero" DROP COLUMN "variant";
  ALTER TABLE "presets_blocks_hero_locales" DROP COLUMN "badge";
  DROP TYPE "public"."enum_page_blocks_hero_variant";
  DROP TYPE "public"."enum__page_v_blocks_hero_variant";
  DROP TYPE "public"."enum_presets_blocks_hero_variant";`);
}
