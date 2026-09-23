import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_stats_items" ADD COLUMN "image_id" integer;
  ALTER TABLE "_page_v_blocks_stats_items" ADD COLUMN "image_id" integer;
  ALTER TABLE "gsec_blocks_stats_items" ADD COLUMN "image_id" integer;
  ALTER TABLE "_gsec_v_blocks_stats_items" ADD COLUMN "image_id" integer;
  ALTER TABLE "presets_blocks_stats_items" ADD COLUMN "image_id" integer;
  ALTER TABLE "page_blocks_stats_items" ADD CONSTRAINT "page_blocks_stats_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_stats_items" ADD CONSTRAINT "_page_v_blocks_stats_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_stats_items" ADD CONSTRAINT "gsec_blocks_stats_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_stats_items" ADD CONSTRAINT "_gsec_v_blocks_stats_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_stats_items" ADD CONSTRAINT "presets_blocks_stats_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "page_blocks_stats_items_image_idx" ON "page_blocks_stats_items" USING btree ("image_id");
  CREATE INDEX "_page_v_blocks_stats_items_image_idx" ON "_page_v_blocks_stats_items" USING btree ("image_id");
  CREATE INDEX "gsec_blocks_stats_items_image_idx" ON "gsec_blocks_stats_items" USING btree ("image_id");
  CREATE INDEX "_gsec_v_blocks_stats_items_image_idx" ON "_gsec_v_blocks_stats_items" USING btree ("image_id");
  CREATE INDEX "presets_blocks_stats_items_image_idx" ON "presets_blocks_stats_items" USING btree ("image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_stats_items" DROP CONSTRAINT "page_blocks_stats_items_image_id_media_id_fk";
  
  ALTER TABLE "_page_v_blocks_stats_items" DROP CONSTRAINT "_page_v_blocks_stats_items_image_id_media_id_fk";
  
  ALTER TABLE "gsec_blocks_stats_items" DROP CONSTRAINT "gsec_blocks_stats_items_image_id_media_id_fk";
  
  ALTER TABLE "_gsec_v_blocks_stats_items" DROP CONSTRAINT "_gsec_v_blocks_stats_items_image_id_media_id_fk";
  
  ALTER TABLE "presets_blocks_stats_items" DROP CONSTRAINT "presets_blocks_stats_items_image_id_media_id_fk";
  
  DROP INDEX "page_blocks_stats_items_image_idx";
  DROP INDEX "_page_v_blocks_stats_items_image_idx";
  DROP INDEX "gsec_blocks_stats_items_image_idx";
  DROP INDEX "_gsec_v_blocks_stats_items_image_idx";
  DROP INDEX "presets_blocks_stats_items_image_idx";
  ALTER TABLE "page_blocks_stats_items" DROP COLUMN "image_id";
  ALTER TABLE "_page_v_blocks_stats_items" DROP COLUMN "image_id";
  ALTER TABLE "gsec_blocks_stats_items" DROP COLUMN "image_id";
  ALTER TABLE "_gsec_v_blocks_stats_items" DROP COLUMN "image_id";
  ALTER TABLE "presets_blocks_stats_items" DROP COLUMN "image_id";`)
}
