import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres";

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "presets_blocks_cards_grid_locales" (
  	"eyebrow" varchar,
  	"heading" varchar,
  	"lead" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "presets_blocks_faq_locales" ALTER COLUMN "heading" DROP NOT NULL;
  ALTER TABLE "presets_blocks_cta_band_locales" ALTER COLUMN "heading" DROP NOT NULL;
  ALTER TABLE "page_blocks_content" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "page_blocks_content" ADD COLUMN "lead" varchar;
  ALTER TABLE "page_blocks_faq" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "page_blocks_testimonials_list" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "page_blocks_testimonials_list" ADD COLUMN "lead" varchar;
  ALTER TABLE "page_blocks_cards_grid" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "page_blocks_cards_grid" ADD COLUMN "heading" varchar;
  ALTER TABLE "page_blocks_cards_grid" ADD COLUMN "lead" varchar;
  ALTER TABLE "page_blocks_carousel" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "page_blocks_carousel" ADD COLUMN "heading" varchar;
  ALTER TABLE "page_blocks_carousel" ADD COLUMN "lead" varchar;
  ALTER TABLE "page_blocks_chart" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "page_blocks_chart" ADD COLUMN "heading" varchar;
  ALTER TABLE "page_blocks_chart" ADD COLUMN "lead" varchar;
  ALTER TABLE "page_blocks_cta_band" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_page_v_blocks_content" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_page_v_blocks_content" ADD COLUMN "lead" varchar;
  ALTER TABLE "_page_v_blocks_faq" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_page_v_blocks_testimonials_list" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_page_v_blocks_testimonials_list" ADD COLUMN "lead" varchar;
  ALTER TABLE "_page_v_blocks_cards_grid" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_page_v_blocks_cards_grid" ADD COLUMN "heading" varchar;
  ALTER TABLE "_page_v_blocks_cards_grid" ADD COLUMN "lead" varchar;
  ALTER TABLE "_page_v_blocks_carousel" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_page_v_blocks_carousel" ADD COLUMN "heading" varchar;
  ALTER TABLE "_page_v_blocks_carousel" ADD COLUMN "lead" varchar;
  ALTER TABLE "_page_v_blocks_chart" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_page_v_blocks_chart" ADD COLUMN "heading" varchar;
  ALTER TABLE "_page_v_blocks_chart" ADD COLUMN "lead" varchar;
  ALTER TABLE "_page_v_blocks_cta_band" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "presets_blocks_content_locales" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "presets_blocks_content_locales" ADD COLUMN "lead" varchar;
  ALTER TABLE "presets_blocks_faq_locales" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "presets_blocks_testimonials_list_locales" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "presets_blocks_testimonials_list_locales" ADD COLUMN "lead" varchar;
  ALTER TABLE "presets_blocks_carousel_locales" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "presets_blocks_carousel_locales" ADD COLUMN "heading" varchar;
  ALTER TABLE "presets_blocks_carousel_locales" ADD COLUMN "lead" varchar;
  ALTER TABLE "presets_blocks_chart_locales" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "presets_blocks_chart_locales" ADD COLUMN "heading" varchar;
  ALTER TABLE "presets_blocks_chart_locales" ADD COLUMN "lead" varchar;
  ALTER TABLE "presets_blocks_cta_band_locales" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "presets_blocks_cards_grid_locales" ADD CONSTRAINT "presets_blocks_cards_grid_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_cards_grid"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "presets_blocks_cards_grid_locales_locale_parent_id_unique" ON "presets_blocks_cards_grid_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "page_blocks_content" DROP COLUMN "badge";
  ALTER TABLE "page_blocks_faq" DROP COLUMN "badge";
  ALTER TABLE "page_blocks_testimonials_list" DROP COLUMN "subheading";
  ALTER TABLE "page_blocks_carousel" DROP COLUMN "text";
  ALTER TABLE "page_blocks_cta_band" DROP COLUMN "badge";
  ALTER TABLE "_page_v_blocks_content" DROP COLUMN "badge";
  ALTER TABLE "_page_v_blocks_faq" DROP COLUMN "badge";
  ALTER TABLE "_page_v_blocks_testimonials_list" DROP COLUMN "subheading";
  ALTER TABLE "_page_v_blocks_carousel" DROP COLUMN "text";
  ALTER TABLE "_page_v_blocks_cta_band" DROP COLUMN "badge";
  ALTER TABLE "presets_blocks_content_locales" DROP COLUMN "badge";
  ALTER TABLE "presets_blocks_faq_locales" DROP COLUMN "badge";
  ALTER TABLE "presets_blocks_testimonials_list_locales" DROP COLUMN "subheading";
  ALTER TABLE "presets_blocks_carousel_locales" DROP COLUMN "text";
  ALTER TABLE "presets_blocks_cta_band_locales" DROP COLUMN "badge";`);
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "presets_blocks_cards_grid_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "presets_blocks_cards_grid_locales" CASCADE;
  ALTER TABLE "presets_blocks_faq_locales" ALTER COLUMN "heading" SET NOT NULL;
  ALTER TABLE "presets_blocks_cta_band_locales" ALTER COLUMN "heading" SET NOT NULL;
  ALTER TABLE "page_blocks_content" ADD COLUMN "badge" varchar;
  ALTER TABLE "page_blocks_faq" ADD COLUMN "badge" varchar;
  ALTER TABLE "page_blocks_testimonials_list" ADD COLUMN "subheading" varchar;
  ALTER TABLE "page_blocks_carousel" ADD COLUMN "text" jsonb;
  ALTER TABLE "page_blocks_cta_band" ADD COLUMN "badge" varchar;
  ALTER TABLE "_page_v_blocks_content" ADD COLUMN "badge" varchar;
  ALTER TABLE "_page_v_blocks_faq" ADD COLUMN "badge" varchar;
  ALTER TABLE "_page_v_blocks_testimonials_list" ADD COLUMN "subheading" varchar;
  ALTER TABLE "_page_v_blocks_carousel" ADD COLUMN "text" jsonb;
  ALTER TABLE "_page_v_blocks_cta_band" ADD COLUMN "badge" varchar;
  ALTER TABLE "presets_blocks_content_locales" ADD COLUMN "badge" varchar;
  ALTER TABLE "presets_blocks_faq_locales" ADD COLUMN "badge" varchar;
  ALTER TABLE "presets_blocks_testimonials_list_locales" ADD COLUMN "subheading" varchar;
  ALTER TABLE "presets_blocks_carousel_locales" ADD COLUMN "text" jsonb;
  ALTER TABLE "presets_blocks_cta_band_locales" ADD COLUMN "badge" varchar;
  ALTER TABLE "page_blocks_content" DROP COLUMN "eyebrow";
  ALTER TABLE "page_blocks_content" DROP COLUMN "lead";
  ALTER TABLE "page_blocks_faq" DROP COLUMN "eyebrow";
  ALTER TABLE "page_blocks_testimonials_list" DROP COLUMN "eyebrow";
  ALTER TABLE "page_blocks_testimonials_list" DROP COLUMN "lead";
  ALTER TABLE "page_blocks_cards_grid" DROP COLUMN "eyebrow";
  ALTER TABLE "page_blocks_cards_grid" DROP COLUMN "heading";
  ALTER TABLE "page_blocks_cards_grid" DROP COLUMN "lead";
  ALTER TABLE "page_blocks_carousel" DROP COLUMN "eyebrow";
  ALTER TABLE "page_blocks_carousel" DROP COLUMN "heading";
  ALTER TABLE "page_blocks_carousel" DROP COLUMN "lead";
  ALTER TABLE "page_blocks_chart" DROP COLUMN "eyebrow";
  ALTER TABLE "page_blocks_chart" DROP COLUMN "heading";
  ALTER TABLE "page_blocks_chart" DROP COLUMN "lead";
  ALTER TABLE "page_blocks_cta_band" DROP COLUMN "eyebrow";
  ALTER TABLE "_page_v_blocks_content" DROP COLUMN "eyebrow";
  ALTER TABLE "_page_v_blocks_content" DROP COLUMN "lead";
  ALTER TABLE "_page_v_blocks_faq" DROP COLUMN "eyebrow";
  ALTER TABLE "_page_v_blocks_testimonials_list" DROP COLUMN "eyebrow";
  ALTER TABLE "_page_v_blocks_testimonials_list" DROP COLUMN "lead";
  ALTER TABLE "_page_v_blocks_cards_grid" DROP COLUMN "eyebrow";
  ALTER TABLE "_page_v_blocks_cards_grid" DROP COLUMN "heading";
  ALTER TABLE "_page_v_blocks_cards_grid" DROP COLUMN "lead";
  ALTER TABLE "_page_v_blocks_carousel" DROP COLUMN "eyebrow";
  ALTER TABLE "_page_v_blocks_carousel" DROP COLUMN "heading";
  ALTER TABLE "_page_v_blocks_carousel" DROP COLUMN "lead";
  ALTER TABLE "_page_v_blocks_chart" DROP COLUMN "eyebrow";
  ALTER TABLE "_page_v_blocks_chart" DROP COLUMN "heading";
  ALTER TABLE "_page_v_blocks_chart" DROP COLUMN "lead";
  ALTER TABLE "_page_v_blocks_cta_band" DROP COLUMN "eyebrow";
  ALTER TABLE "presets_blocks_content_locales" DROP COLUMN "eyebrow";
  ALTER TABLE "presets_blocks_content_locales" DROP COLUMN "lead";
  ALTER TABLE "presets_blocks_faq_locales" DROP COLUMN "eyebrow";
  ALTER TABLE "presets_blocks_testimonials_list_locales" DROP COLUMN "eyebrow";
  ALTER TABLE "presets_blocks_testimonials_list_locales" DROP COLUMN "lead";
  ALTER TABLE "presets_blocks_carousel_locales" DROP COLUMN "eyebrow";
  ALTER TABLE "presets_blocks_carousel_locales" DROP COLUMN "heading";
  ALTER TABLE "presets_blocks_carousel_locales" DROP COLUMN "lead";
  ALTER TABLE "presets_blocks_chart_locales" DROP COLUMN "eyebrow";
  ALTER TABLE "presets_blocks_chart_locales" DROP COLUMN "heading";
  ALTER TABLE "presets_blocks_chart_locales" DROP COLUMN "lead";
  ALTER TABLE "presets_blocks_cta_band_locales" DROP COLUMN "eyebrow";`);
}
