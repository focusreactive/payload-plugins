import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_faq" ADD COLUMN "badge" varchar;
  ALTER TABLE "page_blocks_faq" ADD COLUMN "lead" varchar;
  ALTER TABLE "_page_v_blocks_faq" ADD COLUMN "badge" varchar;
  ALTER TABLE "_page_v_blocks_faq" ADD COLUMN "lead" varchar;
  ALTER TABLE "presets_blocks_faq_locales" ADD COLUMN "badge" varchar;
  ALTER TABLE "presets_blocks_faq_locales" ADD COLUMN "lead" varchar;`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_faq" DROP COLUMN "badge";
  ALTER TABLE "page_blocks_faq" DROP COLUMN "lead";
  ALTER TABLE "_page_v_blocks_faq" DROP COLUMN "badge";
  ALTER TABLE "_page_v_blocks_faq" DROP COLUMN "lead";
  ALTER TABLE "presets_blocks_faq_locales" DROP COLUMN "badge";
  ALTER TABLE "presets_blocks_faq_locales" DROP COLUMN "lead";`);
}
