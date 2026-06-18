import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_hero" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "page_blocks_content" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "page_blocks_faq" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "page_blocks_testimonials_list" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "page_blocks_cards_grid" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "page_blocks_carousel" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "page_blocks_logos" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "page_blocks_chart" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "page_blocks_cta_band" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "page_blocks_newsletter" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "page_blocks_stats" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "page_blocks_raw_html" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "_page_v_blocks_hero" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "_page_v_blocks_content" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "_page_v_blocks_faq" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "_page_v_blocks_testimonials_list" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "_page_v_blocks_cards_grid" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "_page_v_blocks_carousel" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "_page_v_blocks_logos" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "_page_v_blocks_chart" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "_page_v_blocks_cta_band" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "_page_v_blocks_newsletter" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "_page_v_blocks_stats" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "_page_v_blocks_raw_html" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "presets_blocks_hero" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "presets_blocks_content" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "presets_blocks_faq" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "presets_blocks_testimonials_list" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "presets_blocks_cards_grid" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "presets_blocks_carousel" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "presets_blocks_logos" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "presets_blocks_chart" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "presets_blocks_cta_band" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "presets_blocks_newsletter" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "presets_blocks_stats" ADD COLUMN "_hidden" boolean DEFAULT false;
  ALTER TABLE "presets_blocks_raw_html" ADD COLUMN "_hidden" boolean DEFAULT false;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_hero" DROP COLUMN "_hidden";
  ALTER TABLE "page_blocks_content" DROP COLUMN "_hidden";
  ALTER TABLE "page_blocks_faq" DROP COLUMN "_hidden";
  ALTER TABLE "page_blocks_testimonials_list" DROP COLUMN "_hidden";
  ALTER TABLE "page_blocks_cards_grid" DROP COLUMN "_hidden";
  ALTER TABLE "page_blocks_carousel" DROP COLUMN "_hidden";
  ALTER TABLE "page_blocks_logos" DROP COLUMN "_hidden";
  ALTER TABLE "page_blocks_chart" DROP COLUMN "_hidden";
  ALTER TABLE "page_blocks_cta_band" DROP COLUMN "_hidden";
  ALTER TABLE "page_blocks_newsletter" DROP COLUMN "_hidden";
  ALTER TABLE "page_blocks_stats" DROP COLUMN "_hidden";
  ALTER TABLE "page_blocks_raw_html" DROP COLUMN "_hidden";
  ALTER TABLE "_page_v_blocks_hero" DROP COLUMN "_hidden";
  ALTER TABLE "_page_v_blocks_content" DROP COLUMN "_hidden";
  ALTER TABLE "_page_v_blocks_faq" DROP COLUMN "_hidden";
  ALTER TABLE "_page_v_blocks_testimonials_list" DROP COLUMN "_hidden";
  ALTER TABLE "_page_v_blocks_cards_grid" DROP COLUMN "_hidden";
  ALTER TABLE "_page_v_blocks_carousel" DROP COLUMN "_hidden";
  ALTER TABLE "_page_v_blocks_logos" DROP COLUMN "_hidden";
  ALTER TABLE "_page_v_blocks_chart" DROP COLUMN "_hidden";
  ALTER TABLE "_page_v_blocks_cta_band" DROP COLUMN "_hidden";
  ALTER TABLE "_page_v_blocks_newsletter" DROP COLUMN "_hidden";
  ALTER TABLE "_page_v_blocks_stats" DROP COLUMN "_hidden";
  ALTER TABLE "_page_v_blocks_raw_html" DROP COLUMN "_hidden";
  ALTER TABLE "presets_blocks_hero" DROP COLUMN "_hidden";
  ALTER TABLE "presets_blocks_content" DROP COLUMN "_hidden";
  ALTER TABLE "presets_blocks_faq" DROP COLUMN "_hidden";
  ALTER TABLE "presets_blocks_testimonials_list" DROP COLUMN "_hidden";
  ALTER TABLE "presets_blocks_cards_grid" DROP COLUMN "_hidden";
  ALTER TABLE "presets_blocks_carousel" DROP COLUMN "_hidden";
  ALTER TABLE "presets_blocks_logos" DROP COLUMN "_hidden";
  ALTER TABLE "presets_blocks_chart" DROP COLUMN "_hidden";
  ALTER TABLE "presets_blocks_cta_band" DROP COLUMN "_hidden";
  ALTER TABLE "presets_blocks_newsletter" DROP COLUMN "_hidden";
  ALTER TABLE "presets_blocks_stats" DROP COLUMN "_hidden";
  ALTER TABLE "presets_blocks_raw_html" DROP COLUMN "_hidden";`)
}
