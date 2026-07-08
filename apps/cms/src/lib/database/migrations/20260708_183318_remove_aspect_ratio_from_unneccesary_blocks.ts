import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_carousel_slides" DROP COLUMN "image_aspect_ratio";
  ALTER TABLE "page_blocks_logos_items" DROP COLUMN "image_aspect_ratio";
  ALTER TABLE "_page_v_blocks_carousel_slides" DROP COLUMN "image_aspect_ratio";
  ALTER TABLE "_page_v_blocks_logos_items" DROP COLUMN "image_aspect_ratio";
  ALTER TABLE "gsec_blocks_carousel_slides" DROP COLUMN "image_aspect_ratio";
  ALTER TABLE "gsec_blocks_logos_items" DROP COLUMN "image_aspect_ratio";
  ALTER TABLE "_gsec_v_blocks_carousel_slides" DROP COLUMN "image_aspect_ratio";
  ALTER TABLE "_gsec_v_blocks_logos_items" DROP COLUMN "image_aspect_ratio";
  ALTER TABLE "presets_blocks_carousel_slides" DROP COLUMN "image_aspect_ratio";
  ALTER TABLE "presets_blocks_logos_items" DROP COLUMN "image_aspect_ratio";
  DROP TYPE "public"."enum_page_blocks_carousel_slides_image_aspect_ratio";
  DROP TYPE "public"."enum_page_blocks_logos_items_image_aspect_ratio";
  DROP TYPE "public"."enum__page_v_blocks_carousel_slides_image_aspect_ratio";
  DROP TYPE "public"."enum__page_v_blocks_logos_items_image_aspect_ratio";
  DROP TYPE "public"."enum_gsec_blocks_carousel_slides_image_aspect_ratio";
  DROP TYPE "public"."enum_gsec_blocks_logos_items_image_aspect_ratio";
  DROP TYPE "public"."enum__gsec_v_blocks_carousel_slides_image_aspect_ratio";
  DROP TYPE "public"."enum__gsec_v_blocks_logos_items_image_aspect_ratio";
  DROP TYPE "public"."enum_presets_blocks_carousel_slides_image_aspect_ratio";
  DROP TYPE "public"."enum_presets_blocks_logos_items_image_aspect_ratio";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_carousel_slides_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum_page_blocks_logos_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum__page_v_blocks_carousel_slides_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum__page_v_blocks_logos_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum_gsec_blocks_carousel_slides_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum_gsec_blocks_logos_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum__gsec_v_blocks_carousel_slides_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum__gsec_v_blocks_logos_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum_presets_blocks_carousel_slides_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  CREATE TYPE "public"."enum_presets_blocks_logos_items_image_aspect_ratio" AS ENUM('16/9', '3/2', '4/3', '1/1', '9/16', '1/2', '4/1', '3/1', 'auto');
  ALTER TABLE "page_blocks_carousel_slides" ADD COLUMN "image_aspect_ratio" "enum_page_blocks_carousel_slides_image_aspect_ratio" DEFAULT '1/1';
  ALTER TABLE "page_blocks_logos_items" ADD COLUMN "image_aspect_ratio" "enum_page_blocks_logos_items_image_aspect_ratio" DEFAULT '1/1';
  ALTER TABLE "_page_v_blocks_carousel_slides" ADD COLUMN "image_aspect_ratio" "enum__page_v_blocks_carousel_slides_image_aspect_ratio" DEFAULT '1/1';
  ALTER TABLE "_page_v_blocks_logos_items" ADD COLUMN "image_aspect_ratio" "enum__page_v_blocks_logos_items_image_aspect_ratio" DEFAULT '1/1';
  ALTER TABLE "gsec_blocks_carousel_slides" ADD COLUMN "image_aspect_ratio" "enum_gsec_blocks_carousel_slides_image_aspect_ratio" DEFAULT '1/1';
  ALTER TABLE "gsec_blocks_logos_items" ADD COLUMN "image_aspect_ratio" "enum_gsec_blocks_logos_items_image_aspect_ratio" DEFAULT '1/1';
  ALTER TABLE "_gsec_v_blocks_carousel_slides" ADD COLUMN "image_aspect_ratio" "enum__gsec_v_blocks_carousel_slides_image_aspect_ratio" DEFAULT '1/1';
  ALTER TABLE "_gsec_v_blocks_logos_items" ADD COLUMN "image_aspect_ratio" "enum__gsec_v_blocks_logos_items_image_aspect_ratio" DEFAULT '1/1';
  ALTER TABLE "presets_blocks_carousel_slides" ADD COLUMN "image_aspect_ratio" "enum_presets_blocks_carousel_slides_image_aspect_ratio" DEFAULT '1/1';
  ALTER TABLE "presets_blocks_logos_items" ADD COLUMN "image_aspect_ratio" "enum_presets_blocks_logos_items_image_aspect_ratio" DEFAULT '1/1';`)
}
