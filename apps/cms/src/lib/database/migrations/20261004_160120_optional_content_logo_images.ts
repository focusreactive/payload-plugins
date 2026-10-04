import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presets_blocks_content" ALTER COLUMN "image_id" DROP NOT NULL;
  ALTER TABLE "presets_blocks_logos_items" ALTER COLUMN "image_image_id" DROP NOT NULL;
  ALTER TABLE "presets_blocks_logos_items" ALTER COLUMN "link_label" DROP NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presets_blocks_content" ALTER COLUMN "image_id" SET NOT NULL;
  ALTER TABLE "presets_blocks_logos_items" ALTER COLUMN "image_image_id" SET NOT NULL;
  ALTER TABLE "presets_blocks_logos_items" ALTER COLUMN "link_label" SET NOT NULL;`)
}
