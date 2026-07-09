import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_wb_hero_compact_cards_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_hero_compact_cards_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_hero_today_links_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_hero_today_links_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_hero_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_hero_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_awards_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_awards_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_awards_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_awards_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_events_events_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_events_events_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_events_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_events_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_events_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_events_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_brands_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_brands_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_research_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_research_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_research_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_research_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_research_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_research_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_people_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_people_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_people_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_people_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_featured_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_featured_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_featured_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_featured_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_news_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_news_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_news_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_news_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_news_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_news_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_analysis_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_analysis_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_analysis_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_analysis_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_analysis_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_analysis_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_more_read_stories_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_more_read_stories_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_more_read_most_read_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_more_read_most_read_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_sponsors_cards_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_sponsors_cards_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_sponsors_primary_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_sponsors_primary_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_sponsors_secondary_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_sponsors_secondary_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_wb_subscribe_plans_tag_tone" AS ENUM('paid', 'free');
  CREATE TYPE "public"."enum_page_blocks_wb_subscribe_privacy_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_wb_subscribe_privacy_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_hero_compact_cards_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_hero_compact_cards_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_hero_today_links_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_hero_today_links_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_hero_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_hero_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_awards_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_awards_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_awards_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_awards_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_events_events_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_events_events_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_events_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_events_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_events_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_events_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_brands_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_brands_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_research_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_research_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_research_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_research_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_research_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_research_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_people_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_people_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_people_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_people_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_featured_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_featured_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_featured_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_featured_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_news_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_news_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_news_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_news_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_news_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_news_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_analysis_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_analysis_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_analysis_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_analysis_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_analysis_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_analysis_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_more_read_stories_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_more_read_stories_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_more_read_most_read_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_more_read_most_read_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_sponsors_cards_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_sponsors_cards_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_sponsors_primary_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_sponsors_primary_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_sponsors_secondary_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_sponsors_secondary_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_wb_subscribe_plans_tag_tone" AS ENUM('paid', 'free');
  CREATE TYPE "public"."enum__page_v_blocks_wb_subscribe_privacy_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_wb_subscribe_privacy_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_hero_compact_cards_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_hero_compact_cards_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_hero_today_links_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_hero_today_links_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_hero_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_hero_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_awards_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_awards_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_awards_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_awards_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_events_events_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_events_events_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_events_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_events_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_events_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_events_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_brands_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_brands_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_research_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_research_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_research_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_research_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_research_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_research_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_people_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_people_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_people_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_people_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_featured_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_featured_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_featured_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_featured_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_news_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_news_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_news_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_news_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_news_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_news_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_analysis_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_analysis_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_analysis_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_analysis_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_analysis_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_analysis_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_more_read_stories_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_more_read_stories_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_more_read_most_read_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_more_read_most_read_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_sponsors_cards_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_sponsors_cards_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_sponsors_primary_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_sponsors_primary_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_sponsors_secondary_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_sponsors_secondary_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_wb_subscribe_plans_tag_tone" AS ENUM('paid', 'free');
  CREATE TYPE "public"."enum_gsec_blocks_wb_subscribe_privacy_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_wb_subscribe_privacy_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_hero_compact_cards_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_hero_compact_cards_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_hero_today_links_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_hero_today_links_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_hero_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_hero_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_awards_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_awards_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_awards_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_awards_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_events_events_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_events_events_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_events_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_events_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_events_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_events_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_brands_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_brands_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_research_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_research_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_research_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_research_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_research_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_research_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_people_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_people_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_people_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_people_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_featured_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_featured_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_featured_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_featured_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_news_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_news_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_news_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_news_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_news_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_news_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_analysis_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_analysis_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_analysis_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_analysis_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_analysis_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_analysis_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_more_read_stories_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_more_read_stories_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_more_read_most_read_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_more_read_most_read_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_sponsors_cards_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_sponsors_cards_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_sponsors_primary_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_sponsors_primary_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_sponsors_secondary_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_sponsors_secondary_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_subscribe_plans_tag_tone" AS ENUM('paid', 'free');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_subscribe_privacy_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_wb_subscribe_privacy_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_hero_compact_cards_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_hero_compact_cards_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_hero_today_links_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_hero_today_links_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_hero_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_hero_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_awards_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_awards_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_awards_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_awards_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_events_events_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_events_events_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_events_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_events_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_events_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_events_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_brands_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_brands_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_research_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_research_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_research_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_research_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_research_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_research_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_people_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_people_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_people_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_people_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_featured_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_featured_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_featured_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_featured_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_news_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_news_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_news_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_news_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_news_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_news_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_analysis_items_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_analysis_items_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_analysis_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_analysis_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_analysis_featured_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_analysis_featured_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_more_read_stories_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_more_read_stories_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_more_read_most_read_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_more_read_most_read_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_sponsors_cards_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_sponsors_cards_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_sponsors_primary_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_sponsors_primary_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_sponsors_secondary_cta_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_sponsors_secondary_cta_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_wb_subscribe_plans_tag_tone" AS ENUM('paid', 'free');
  CREATE TYPE "public"."enum_presets_blocks_wb_subscribe_privacy_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_wb_subscribe_privacy_link_custom_page" AS ENUM('blog', 'search');
  CREATE TABLE "page_blocks_wb_hero_compact_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"status" varchar,
  	"title" varchar,
  	"text" varchar,
  	"brand" varchar,
  	"link_type" "enum_page_blocks_wb_hero_compact_cards_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_page_blocks_wb_hero_compact_cards_link_custom_page",
  	"link_label" varchar
  );
  
  CREATE TABLE "page_blocks_wb_hero_today_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"brand" varchar,
  	"title" varchar,
  	"link_type" "enum_page_blocks_wb_hero_today_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_page_blocks_wb_hero_today_links_link_custom_page"
  );
  
  CREATE TABLE "page_blocks_wb_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"date" varchar,
  	"featured_image_id" integer,
  	"featured_category" varchar,
  	"featured_brand" varchar,
  	"featured_title" varchar,
  	"featured_excerpt" varchar,
  	"featured_link_type" "enum_page_blocks_wb_hero_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum_page_blocks_wb_hero_featured_link_custom_page",
  	"featured_link_label" varchar,
  	"show_today_strip" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_wb_awards_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"region" varchar,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum_page_blocks_wb_awards_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_page_blocks_wb_awards_items_link_custom_page",
  	"link_label" varchar
  );
  
  CREATE TABLE "page_blocks_wb_awards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_page_blocks_wb_awards_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_page_blocks_wb_awards_cta_custom_page",
  	"cta_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_wb_events_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" varchar,
  	"date" varchar,
  	"location" varchar,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum_page_blocks_wb_events_events_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_page_blocks_wb_events_events_link_custom_page",
  	"link_label" varchar
  );
  
  CREATE TABLE "page_blocks_wb_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_page_blocks_wb_events_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_page_blocks_wb_events_cta_custom_page",
  	"cta_label" varchar,
  	"featured_image_id" integer,
  	"featured_pill" varchar,
  	"featured_date" varchar,
  	"featured_location" varchar,
  	"featured_title" varchar,
  	"featured_description" varchar,
  	"featured_link_type" "enum_page_blocks_wb_events_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum_page_blocks_wb_events_featured_link_custom_page",
  	"featured_link_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_wb_brands_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"number" varchar,
  	"brand" varchar,
  	"description" varchar,
  	"latest_highlight" varchar,
  	"latest_cta" varchar,
  	"link_type" "enum_page_blocks_wb_brands_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_page_blocks_wb_brands_items_link_custom_page"
  );
  
  CREATE TABLE "page_blocks_wb_brands" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"title_second_line" varchar,
  	"subtitle" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_wb_research_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" varchar,
  	"type" varchar,
  	"title" varchar,
  	"desc" varchar,
  	"link_type" "enum_page_blocks_wb_research_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_page_blocks_wb_research_items_link_custom_page",
  	"link_label" varchar
  );
  
  CREATE TABLE "page_blocks_wb_research" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_page_blocks_wb_research_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_page_blocks_wb_research_cta_custom_page",
  	"cta_label" varchar,
  	"featured_image_id" integer,
  	"featured_pill" varchar,
  	"featured_meta" varchar,
  	"featured_title" varchar,
  	"featured_excerpt" varchar,
  	"featured_link_type" "enum_page_blocks_wb_research_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum_page_blocks_wb_research_featured_link_custom_page",
  	"featured_link_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_wb_people_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" varchar,
  	"category" varchar,
  	"region" varchar,
  	"title" varchar,
  	"link_type" "enum_page_blocks_wb_people_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_page_blocks_wb_people_items_link_custom_page"
  );
  
  CREATE TABLE "page_blocks_wb_people" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_page_blocks_wb_people_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_page_blocks_wb_people_cta_custom_page",
  	"cta_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_wb_featured_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"category" varchar,
  	"brand" varchar,
  	"title" varchar,
  	"description" varchar,
  	"date" varchar,
  	"link_type" "enum_page_blocks_wb_featured_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_page_blocks_wb_featured_items_link_custom_page"
  );
  
  CREATE TABLE "page_blocks_wb_featured" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_page_blocks_wb_featured_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_page_blocks_wb_featured_cta_custom_page",
  	"cta_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_wb_news_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category" varchar,
  	"date" varchar,
  	"title" varchar,
  	"text" varchar,
  	"link_type" "enum_page_blocks_wb_news_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_page_blocks_wb_news_items_link_custom_page"
  );
  
  CREATE TABLE "page_blocks_wb_news" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_page_blocks_wb_news_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_page_blocks_wb_news_cta_custom_page",
  	"cta_label" varchar,
  	"featured_image_id" integer,
  	"featured_category" varchar,
  	"featured_date" varchar,
  	"featured_title" varchar,
  	"featured_description" varchar,
  	"featured_byline" varchar,
  	"featured_link_type" "enum_page_blocks_wb_news_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum_page_blocks_wb_news_featured_link_custom_page",
  	"featured_link_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_wb_analysis_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category" varchar,
  	"date" varchar,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum_page_blocks_wb_analysis_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_page_blocks_wb_analysis_items_link_custom_page"
  );
  
  CREATE TABLE "page_blocks_wb_analysis" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_page_blocks_wb_analysis_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_page_blocks_wb_analysis_cta_custom_page",
  	"cta_label" varchar,
  	"featured_image_id" integer,
  	"featured_category" varchar,
  	"featured_date" varchar,
  	"featured_title" varchar,
  	"featured_excerpt" varchar,
  	"featured_link_type" "enum_page_blocks_wb_analysis_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum_page_blocks_wb_analysis_featured_link_custom_page",
  	"featured_link_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_wb_more_read_stories" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category" varchar,
  	"title" varchar,
  	"link_type" "enum_page_blocks_wb_more_read_stories_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_page_blocks_wb_more_read_stories_link_custom_page"
  );
  
  CREATE TABLE "page_blocks_wb_more_read_most_read" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"rank" varchar,
  	"category" varchar,
  	"title" varchar,
  	"link_type" "enum_page_blocks_wb_more_read_most_read_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_page_blocks_wb_more_read_most_read_link_custom_page"
  );
  
  CREATE TABLE "page_blocks_wb_more_read" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"stories_heading" varchar,
  	"most_read_heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_wb_sponsors_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum_page_blocks_wb_sponsors_cards_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_page_blocks_wb_sponsors_cards_link_custom_page",
  	"link_label" varchar
  );
  
  CREATE TABLE "page_blocks_wb_sponsors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"description" varchar,
  	"primary_cta_type" "enum_page_blocks_wb_sponsors_primary_cta_type" DEFAULT 'reference',
  	"primary_cta_new_tab" boolean,
  	"primary_cta_url" varchar,
  	"primary_cta_custom_page" "enum_page_blocks_wb_sponsors_primary_cta_custom_page",
  	"primary_cta_label" varchar,
  	"secondary_cta_type" "enum_page_blocks_wb_sponsors_secondary_cta_type" DEFAULT 'reference',
  	"secondary_cta_new_tab" boolean,
  	"secondary_cta_url" varchar,
  	"secondary_cta_custom_page" "enum_page_blocks_wb_sponsors_secondary_cta_custom_page",
  	"secondary_cta_label" varchar,
  	"trusted_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_wb_subscribe_plans" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"title" varchar,
  	"tag_label" varchar,
  	"tag_tone" "enum_page_blocks_wb_subscribe_plans_tag_tone",
  	"description" varchar,
  	"cta" varchar,
  	"note" varchar
  );
  
  CREATE TABLE "page_blocks_wb_subscribe_regions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"region" varchar
  );
  
  CREATE TABLE "page_blocks_wb_subscribe" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"default_plan_value" varchar,
  	"details_label" varchar,
  	"email_placeholder" varchar,
  	"first_name_placeholder" varchar,
  	"last_name_placeholder" varchar,
  	"company_placeholder" varchar,
  	"default_region" varchar,
  	"agree_label" varchar,
  	"submit_label" varchar,
  	"error_message" varchar,
  	"privacy_text" varchar,
  	"privacy_link_type" "enum_page_blocks_wb_subscribe_privacy_link_type" DEFAULT 'reference',
  	"privacy_link_new_tab" boolean,
  	"privacy_link_url" varchar,
  	"privacy_link_custom_page" "enum_page_blocks_wb_subscribe_privacy_link_custom_page",
  	"privacy_link_label" varchar,
  	"success_title" varchar,
  	"success_body" varchar,
  	"success_cta_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  CREATE TABLE "_page_v_blocks_wb_hero_compact_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"status" varchar,
  	"title" varchar,
  	"text" varchar,
  	"brand" varchar,
  	"link_type" "enum__page_v_blocks_wb_hero_compact_cards_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__page_v_blocks_wb_hero_compact_cards_link_custom_page",
  	"link_label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_hero_today_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"brand" varchar,
  	"title" varchar,
  	"link_type" "enum__page_v_blocks_wb_hero_today_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__page_v_blocks_wb_hero_today_links_link_custom_page",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"date" varchar,
  	"featured_image_id" integer,
  	"featured_category" varchar,
  	"featured_brand" varchar,
  	"featured_title" varchar,
  	"featured_excerpt" varchar,
  	"featured_link_type" "enum__page_v_blocks_wb_hero_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum__page_v_blocks_wb_hero_featured_link_custom_page",
  	"featured_link_label" varchar,
  	"show_today_strip" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_awards_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"region" varchar,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum__page_v_blocks_wb_awards_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__page_v_blocks_wb_awards_items_link_custom_page",
  	"link_label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_awards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum__page_v_blocks_wb_awards_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum__page_v_blocks_wb_awards_cta_custom_page",
  	"cta_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_events_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" varchar,
  	"date" varchar,
  	"location" varchar,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum__page_v_blocks_wb_events_events_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__page_v_blocks_wb_events_events_link_custom_page",
  	"link_label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum__page_v_blocks_wb_events_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum__page_v_blocks_wb_events_cta_custom_page",
  	"cta_label" varchar,
  	"featured_image_id" integer,
  	"featured_pill" varchar,
  	"featured_date" varchar,
  	"featured_location" varchar,
  	"featured_title" varchar,
  	"featured_description" varchar,
  	"featured_link_type" "enum__page_v_blocks_wb_events_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum__page_v_blocks_wb_events_featured_link_custom_page",
  	"featured_link_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_brands_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" varchar,
  	"brand" varchar,
  	"description" varchar,
  	"latest_highlight" varchar,
  	"latest_cta" varchar,
  	"link_type" "enum__page_v_blocks_wb_brands_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__page_v_blocks_wb_brands_items_link_custom_page",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_brands" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"title_second_line" varchar,
  	"subtitle" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_research_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" varchar,
  	"type" varchar,
  	"title" varchar,
  	"desc" varchar,
  	"link_type" "enum__page_v_blocks_wb_research_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__page_v_blocks_wb_research_items_link_custom_page",
  	"link_label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_research" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum__page_v_blocks_wb_research_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum__page_v_blocks_wb_research_cta_custom_page",
  	"cta_label" varchar,
  	"featured_image_id" integer,
  	"featured_pill" varchar,
  	"featured_meta" varchar,
  	"featured_title" varchar,
  	"featured_excerpt" varchar,
  	"featured_link_type" "enum__page_v_blocks_wb_research_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum__page_v_blocks_wb_research_featured_link_custom_page",
  	"featured_link_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_people_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" varchar,
  	"category" varchar,
  	"region" varchar,
  	"title" varchar,
  	"link_type" "enum__page_v_blocks_wb_people_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__page_v_blocks_wb_people_items_link_custom_page",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_people" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum__page_v_blocks_wb_people_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum__page_v_blocks_wb_people_cta_custom_page",
  	"cta_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_featured_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"category" varchar,
  	"brand" varchar,
  	"title" varchar,
  	"description" varchar,
  	"date" varchar,
  	"link_type" "enum__page_v_blocks_wb_featured_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__page_v_blocks_wb_featured_items_link_custom_page",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_featured" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum__page_v_blocks_wb_featured_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum__page_v_blocks_wb_featured_cta_custom_page",
  	"cta_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_news_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"category" varchar,
  	"date" varchar,
  	"title" varchar,
  	"text" varchar,
  	"link_type" "enum__page_v_blocks_wb_news_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__page_v_blocks_wb_news_items_link_custom_page",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_news" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum__page_v_blocks_wb_news_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum__page_v_blocks_wb_news_cta_custom_page",
  	"cta_label" varchar,
  	"featured_image_id" integer,
  	"featured_category" varchar,
  	"featured_date" varchar,
  	"featured_title" varchar,
  	"featured_description" varchar,
  	"featured_byline" varchar,
  	"featured_link_type" "enum__page_v_blocks_wb_news_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum__page_v_blocks_wb_news_featured_link_custom_page",
  	"featured_link_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_analysis_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"category" varchar,
  	"date" varchar,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum__page_v_blocks_wb_analysis_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__page_v_blocks_wb_analysis_items_link_custom_page",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_analysis" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum__page_v_blocks_wb_analysis_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum__page_v_blocks_wb_analysis_cta_custom_page",
  	"cta_label" varchar,
  	"featured_image_id" integer,
  	"featured_category" varchar,
  	"featured_date" varchar,
  	"featured_title" varchar,
  	"featured_excerpt" varchar,
  	"featured_link_type" "enum__page_v_blocks_wb_analysis_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum__page_v_blocks_wb_analysis_featured_link_custom_page",
  	"featured_link_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_more_read_stories" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"category" varchar,
  	"title" varchar,
  	"link_type" "enum__page_v_blocks_wb_more_read_stories_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__page_v_blocks_wb_more_read_stories_link_custom_page",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_more_read_most_read" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"rank" varchar,
  	"category" varchar,
  	"title" varchar,
  	"link_type" "enum__page_v_blocks_wb_more_read_most_read_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__page_v_blocks_wb_more_read_most_read_link_custom_page",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_more_read" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"stories_heading" varchar,
  	"most_read_heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_sponsors_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum__page_v_blocks_wb_sponsors_cards_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__page_v_blocks_wb_sponsors_cards_link_custom_page",
  	"link_label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_sponsors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"description" varchar,
  	"primary_cta_type" "enum__page_v_blocks_wb_sponsors_primary_cta_type" DEFAULT 'reference',
  	"primary_cta_new_tab" boolean,
  	"primary_cta_url" varchar,
  	"primary_cta_custom_page" "enum__page_v_blocks_wb_sponsors_primary_cta_custom_page",
  	"primary_cta_label" varchar,
  	"secondary_cta_type" "enum__page_v_blocks_wb_sponsors_secondary_cta_type" DEFAULT 'reference',
  	"secondary_cta_new_tab" boolean,
  	"secondary_cta_url" varchar,
  	"secondary_cta_custom_page" "enum__page_v_blocks_wb_sponsors_secondary_cta_custom_page",
  	"secondary_cta_label" varchar,
  	"trusted_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_subscribe_plans" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"title" varchar,
  	"tag_label" varchar,
  	"tag_tone" "enum__page_v_blocks_wb_subscribe_plans_tag_tone",
  	"description" varchar,
  	"cta" varchar,
  	"note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_subscribe_regions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"region" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_wb_subscribe" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"default_plan_value" varchar,
  	"details_label" varchar,
  	"email_placeholder" varchar,
  	"first_name_placeholder" varchar,
  	"last_name_placeholder" varchar,
  	"company_placeholder" varchar,
  	"default_region" varchar,
  	"agree_label" varchar,
  	"submit_label" varchar,
  	"error_message" varchar,
  	"privacy_text" varchar,
  	"privacy_link_type" "enum__page_v_blocks_wb_subscribe_privacy_link_type" DEFAULT 'reference',
  	"privacy_link_new_tab" boolean,
  	"privacy_link_url" varchar,
  	"privacy_link_custom_page" "enum__page_v_blocks_wb_subscribe_privacy_link_custom_page",
  	"privacy_link_label" varchar,
  	"success_title" varchar,
  	"success_body" varchar,
  	"success_cta_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  CREATE TABLE "gsec_blocks_wb_hero_compact_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"status" varchar,
  	"title" varchar,
  	"text" varchar,
  	"brand" varchar,
  	"link_type" "enum_gsec_blocks_wb_hero_compact_cards_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_gsec_blocks_wb_hero_compact_cards_link_custom_page",
  	"link_label" varchar
  );
  
  CREATE TABLE "gsec_blocks_wb_hero_today_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"brand" varchar,
  	"title" varchar,
  	"link_type" "enum_gsec_blocks_wb_hero_today_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_gsec_blocks_wb_hero_today_links_link_custom_page"
  );
  
  CREATE TABLE "gsec_blocks_wb_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"date" varchar,
  	"featured_image_id" integer,
  	"featured_category" varchar,
  	"featured_brand" varchar,
  	"featured_title" varchar,
  	"featured_excerpt" varchar,
  	"featured_link_type" "enum_gsec_blocks_wb_hero_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum_gsec_blocks_wb_hero_featured_link_custom_page",
  	"featured_link_label" varchar,
  	"show_today_strip" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_wb_awards_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"region" varchar,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum_gsec_blocks_wb_awards_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_gsec_blocks_wb_awards_items_link_custom_page",
  	"link_label" varchar
  );
  
  CREATE TABLE "gsec_blocks_wb_awards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_gsec_blocks_wb_awards_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_gsec_blocks_wb_awards_cta_custom_page",
  	"cta_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_wb_events_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" varchar,
  	"date" varchar,
  	"location" varchar,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum_gsec_blocks_wb_events_events_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_gsec_blocks_wb_events_events_link_custom_page",
  	"link_label" varchar
  );
  
  CREATE TABLE "gsec_blocks_wb_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_gsec_blocks_wb_events_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_gsec_blocks_wb_events_cta_custom_page",
  	"cta_label" varchar,
  	"featured_image_id" integer,
  	"featured_pill" varchar,
  	"featured_date" varchar,
  	"featured_location" varchar,
  	"featured_title" varchar,
  	"featured_description" varchar,
  	"featured_link_type" "enum_gsec_blocks_wb_events_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum_gsec_blocks_wb_events_featured_link_custom_page",
  	"featured_link_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_wb_brands_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"number" varchar,
  	"brand" varchar,
  	"description" varchar,
  	"latest_highlight" varchar,
  	"latest_cta" varchar,
  	"link_type" "enum_gsec_blocks_wb_brands_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_gsec_blocks_wb_brands_items_link_custom_page"
  );
  
  CREATE TABLE "gsec_blocks_wb_brands" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"title_second_line" varchar,
  	"subtitle" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_wb_research_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" varchar,
  	"type" varchar,
  	"title" varchar,
  	"desc" varchar,
  	"link_type" "enum_gsec_blocks_wb_research_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_gsec_blocks_wb_research_items_link_custom_page",
  	"link_label" varchar
  );
  
  CREATE TABLE "gsec_blocks_wb_research" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_gsec_blocks_wb_research_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_gsec_blocks_wb_research_cta_custom_page",
  	"cta_label" varchar,
  	"featured_image_id" integer,
  	"featured_pill" varchar,
  	"featured_meta" varchar,
  	"featured_title" varchar,
  	"featured_excerpt" varchar,
  	"featured_link_type" "enum_gsec_blocks_wb_research_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum_gsec_blocks_wb_research_featured_link_custom_page",
  	"featured_link_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_wb_people_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" varchar,
  	"category" varchar,
  	"region" varchar,
  	"title" varchar,
  	"link_type" "enum_gsec_blocks_wb_people_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_gsec_blocks_wb_people_items_link_custom_page"
  );
  
  CREATE TABLE "gsec_blocks_wb_people" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_gsec_blocks_wb_people_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_gsec_blocks_wb_people_cta_custom_page",
  	"cta_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_wb_featured_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"category" varchar,
  	"brand" varchar,
  	"title" varchar,
  	"description" varchar,
  	"date" varchar,
  	"link_type" "enum_gsec_blocks_wb_featured_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_gsec_blocks_wb_featured_items_link_custom_page"
  );
  
  CREATE TABLE "gsec_blocks_wb_featured" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_gsec_blocks_wb_featured_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_gsec_blocks_wb_featured_cta_custom_page",
  	"cta_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_wb_news_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category" varchar,
  	"date" varchar,
  	"title" varchar,
  	"text" varchar,
  	"link_type" "enum_gsec_blocks_wb_news_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_gsec_blocks_wb_news_items_link_custom_page"
  );
  
  CREATE TABLE "gsec_blocks_wb_news" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_gsec_blocks_wb_news_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_gsec_blocks_wb_news_cta_custom_page",
  	"cta_label" varchar,
  	"featured_image_id" integer,
  	"featured_category" varchar,
  	"featured_date" varchar,
  	"featured_title" varchar,
  	"featured_description" varchar,
  	"featured_byline" varchar,
  	"featured_link_type" "enum_gsec_blocks_wb_news_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum_gsec_blocks_wb_news_featured_link_custom_page",
  	"featured_link_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_wb_analysis_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category" varchar,
  	"date" varchar,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum_gsec_blocks_wb_analysis_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_gsec_blocks_wb_analysis_items_link_custom_page"
  );
  
  CREATE TABLE "gsec_blocks_wb_analysis" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_gsec_blocks_wb_analysis_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_gsec_blocks_wb_analysis_cta_custom_page",
  	"cta_label" varchar,
  	"featured_image_id" integer,
  	"featured_category" varchar,
  	"featured_date" varchar,
  	"featured_title" varchar,
  	"featured_excerpt" varchar,
  	"featured_link_type" "enum_gsec_blocks_wb_analysis_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum_gsec_blocks_wb_analysis_featured_link_custom_page",
  	"featured_link_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_wb_more_read_stories" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category" varchar,
  	"title" varchar,
  	"link_type" "enum_gsec_blocks_wb_more_read_stories_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_gsec_blocks_wb_more_read_stories_link_custom_page"
  );
  
  CREATE TABLE "gsec_blocks_wb_more_read_most_read" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"rank" varchar,
  	"category" varchar,
  	"title" varchar,
  	"link_type" "enum_gsec_blocks_wb_more_read_most_read_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_gsec_blocks_wb_more_read_most_read_link_custom_page"
  );
  
  CREATE TABLE "gsec_blocks_wb_more_read" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"stories_heading" varchar,
  	"most_read_heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_wb_sponsors_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum_gsec_blocks_wb_sponsors_cards_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_gsec_blocks_wb_sponsors_cards_link_custom_page",
  	"link_label" varchar
  );
  
  CREATE TABLE "gsec_blocks_wb_sponsors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"description" varchar,
  	"primary_cta_type" "enum_gsec_blocks_wb_sponsors_primary_cta_type" DEFAULT 'reference',
  	"primary_cta_new_tab" boolean,
  	"primary_cta_url" varchar,
  	"primary_cta_custom_page" "enum_gsec_blocks_wb_sponsors_primary_cta_custom_page",
  	"primary_cta_label" varchar,
  	"secondary_cta_type" "enum_gsec_blocks_wb_sponsors_secondary_cta_type" DEFAULT 'reference',
  	"secondary_cta_new_tab" boolean,
  	"secondary_cta_url" varchar,
  	"secondary_cta_custom_page" "enum_gsec_blocks_wb_sponsors_secondary_cta_custom_page",
  	"secondary_cta_label" varchar,
  	"trusted_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_wb_subscribe_plans" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"title" varchar,
  	"tag_label" varchar,
  	"tag_tone" "enum_gsec_blocks_wb_subscribe_plans_tag_tone",
  	"description" varchar,
  	"cta" varchar,
  	"note" varchar
  );
  
  CREATE TABLE "gsec_blocks_wb_subscribe_regions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"region" varchar
  );
  
  CREATE TABLE "gsec_blocks_wb_subscribe" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"default_plan_value" varchar,
  	"details_label" varchar,
  	"email_placeholder" varchar,
  	"first_name_placeholder" varchar,
  	"last_name_placeholder" varchar,
  	"company_placeholder" varchar,
  	"default_region" varchar,
  	"agree_label" varchar,
  	"submit_label" varchar,
  	"error_message" varchar,
  	"privacy_text" varchar,
  	"privacy_link_type" "enum_gsec_blocks_wb_subscribe_privacy_link_type" DEFAULT 'reference',
  	"privacy_link_new_tab" boolean,
  	"privacy_link_url" varchar,
  	"privacy_link_custom_page" "enum_gsec_blocks_wb_subscribe_privacy_link_custom_page",
  	"privacy_link_label" varchar,
  	"success_title" varchar,
  	"success_body" varchar,
  	"success_cta_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_hero_compact_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"status" varchar,
  	"title" varchar,
  	"text" varchar,
  	"brand" varchar,
  	"link_type" "enum__gsec_v_blocks_wb_hero_compact_cards_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__gsec_v_blocks_wb_hero_compact_cards_link_custom_page",
  	"link_label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_hero_today_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"brand" varchar,
  	"title" varchar,
  	"link_type" "enum__gsec_v_blocks_wb_hero_today_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__gsec_v_blocks_wb_hero_today_links_link_custom_page",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"date" varchar,
  	"featured_image_id" integer,
  	"featured_category" varchar,
  	"featured_brand" varchar,
  	"featured_title" varchar,
  	"featured_excerpt" varchar,
  	"featured_link_type" "enum__gsec_v_blocks_wb_hero_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum__gsec_v_blocks_wb_hero_featured_link_custom_page",
  	"featured_link_label" varchar,
  	"show_today_strip" boolean DEFAULT true,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_awards_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"region" varchar,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum__gsec_v_blocks_wb_awards_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__gsec_v_blocks_wb_awards_items_link_custom_page",
  	"link_label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_awards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum__gsec_v_blocks_wb_awards_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum__gsec_v_blocks_wb_awards_cta_custom_page",
  	"cta_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_events_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" varchar,
  	"date" varchar,
  	"location" varchar,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum__gsec_v_blocks_wb_events_events_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__gsec_v_blocks_wb_events_events_link_custom_page",
  	"link_label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum__gsec_v_blocks_wb_events_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum__gsec_v_blocks_wb_events_cta_custom_page",
  	"cta_label" varchar,
  	"featured_image_id" integer,
  	"featured_pill" varchar,
  	"featured_date" varchar,
  	"featured_location" varchar,
  	"featured_title" varchar,
  	"featured_description" varchar,
  	"featured_link_type" "enum__gsec_v_blocks_wb_events_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum__gsec_v_blocks_wb_events_featured_link_custom_page",
  	"featured_link_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_brands_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" varchar,
  	"brand" varchar,
  	"description" varchar,
  	"latest_highlight" varchar,
  	"latest_cta" varchar,
  	"link_type" "enum__gsec_v_blocks_wb_brands_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__gsec_v_blocks_wb_brands_items_link_custom_page",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_brands" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"title_second_line" varchar,
  	"subtitle" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_research_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" varchar,
  	"type" varchar,
  	"title" varchar,
  	"desc" varchar,
  	"link_type" "enum__gsec_v_blocks_wb_research_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__gsec_v_blocks_wb_research_items_link_custom_page",
  	"link_label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_research" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum__gsec_v_blocks_wb_research_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum__gsec_v_blocks_wb_research_cta_custom_page",
  	"cta_label" varchar,
  	"featured_image_id" integer,
  	"featured_pill" varchar,
  	"featured_meta" varchar,
  	"featured_title" varchar,
  	"featured_excerpt" varchar,
  	"featured_link_type" "enum__gsec_v_blocks_wb_research_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum__gsec_v_blocks_wb_research_featured_link_custom_page",
  	"featured_link_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_people_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"date" varchar,
  	"category" varchar,
  	"region" varchar,
  	"title" varchar,
  	"link_type" "enum__gsec_v_blocks_wb_people_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__gsec_v_blocks_wb_people_items_link_custom_page",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_people" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum__gsec_v_blocks_wb_people_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum__gsec_v_blocks_wb_people_cta_custom_page",
  	"cta_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_featured_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"category" varchar,
  	"brand" varchar,
  	"title" varchar,
  	"description" varchar,
  	"date" varchar,
  	"link_type" "enum__gsec_v_blocks_wb_featured_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__gsec_v_blocks_wb_featured_items_link_custom_page",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_featured" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum__gsec_v_blocks_wb_featured_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum__gsec_v_blocks_wb_featured_cta_custom_page",
  	"cta_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_news_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"category" varchar,
  	"date" varchar,
  	"title" varchar,
  	"text" varchar,
  	"link_type" "enum__gsec_v_blocks_wb_news_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__gsec_v_blocks_wb_news_items_link_custom_page",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_news" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum__gsec_v_blocks_wb_news_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum__gsec_v_blocks_wb_news_cta_custom_page",
  	"cta_label" varchar,
  	"featured_image_id" integer,
  	"featured_category" varchar,
  	"featured_date" varchar,
  	"featured_title" varchar,
  	"featured_description" varchar,
  	"featured_byline" varchar,
  	"featured_link_type" "enum__gsec_v_blocks_wb_news_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum__gsec_v_blocks_wb_news_featured_link_custom_page",
  	"featured_link_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_analysis_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"category" varchar,
  	"date" varchar,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum__gsec_v_blocks_wb_analysis_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__gsec_v_blocks_wb_analysis_items_link_custom_page",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_analysis" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum__gsec_v_blocks_wb_analysis_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum__gsec_v_blocks_wb_analysis_cta_custom_page",
  	"cta_label" varchar,
  	"featured_image_id" integer,
  	"featured_category" varchar,
  	"featured_date" varchar,
  	"featured_title" varchar,
  	"featured_excerpt" varchar,
  	"featured_link_type" "enum__gsec_v_blocks_wb_analysis_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum__gsec_v_blocks_wb_analysis_featured_link_custom_page",
  	"featured_link_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_more_read_stories" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"category" varchar,
  	"title" varchar,
  	"link_type" "enum__gsec_v_blocks_wb_more_read_stories_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__gsec_v_blocks_wb_more_read_stories_link_custom_page",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_more_read_most_read" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"rank" varchar,
  	"category" varchar,
  	"title" varchar,
  	"link_type" "enum__gsec_v_blocks_wb_more_read_most_read_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__gsec_v_blocks_wb_more_read_most_read_link_custom_page",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_more_read" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"stories_heading" varchar,
  	"most_read_heading" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_sponsors_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum__gsec_v_blocks_wb_sponsors_cards_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__gsec_v_blocks_wb_sponsors_cards_link_custom_page",
  	"link_label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_sponsors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"description" varchar,
  	"primary_cta_type" "enum__gsec_v_blocks_wb_sponsors_primary_cta_type" DEFAULT 'reference',
  	"primary_cta_new_tab" boolean,
  	"primary_cta_url" varchar,
  	"primary_cta_custom_page" "enum__gsec_v_blocks_wb_sponsors_primary_cta_custom_page",
  	"primary_cta_label" varchar,
  	"secondary_cta_type" "enum__gsec_v_blocks_wb_sponsors_secondary_cta_type" DEFAULT 'reference',
  	"secondary_cta_new_tab" boolean,
  	"secondary_cta_url" varchar,
  	"secondary_cta_custom_page" "enum__gsec_v_blocks_wb_sponsors_secondary_cta_custom_page",
  	"secondary_cta_label" varchar,
  	"trusted_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_subscribe_plans" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"title" varchar,
  	"tag_label" varchar,
  	"tag_tone" "enum__gsec_v_blocks_wb_subscribe_plans_tag_tone",
  	"description" varchar,
  	"cta" varchar,
  	"note" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_subscribe_regions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"region" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_wb_subscribe" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"default_plan_value" varchar,
  	"details_label" varchar,
  	"email_placeholder" varchar,
  	"first_name_placeholder" varchar,
  	"last_name_placeholder" varchar,
  	"company_placeholder" varchar,
  	"default_region" varchar,
  	"agree_label" varchar,
  	"submit_label" varchar,
  	"error_message" varchar,
  	"privacy_text" varchar,
  	"privacy_link_type" "enum__gsec_v_blocks_wb_subscribe_privacy_link_type" DEFAULT 'reference',
  	"privacy_link_new_tab" boolean,
  	"privacy_link_url" varchar,
  	"privacy_link_custom_page" "enum__gsec_v_blocks_wb_subscribe_privacy_link_custom_page",
  	"privacy_link_label" varchar,
  	"success_title" varchar,
  	"success_body" varchar,
  	"success_cta_label" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  CREATE TABLE "presets_blocks_wb_hero_compact_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"status" varchar,
  	"title" varchar,
  	"text" varchar,
  	"brand" varchar,
  	"link_type" "enum_presets_blocks_wb_hero_compact_cards_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_presets_blocks_wb_hero_compact_cards_link_custom_page"
  );
  
  CREATE TABLE "presets_blocks_wb_hero_compact_cards_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_wb_hero_today_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"brand" varchar,
  	"title" varchar,
  	"link_type" "enum_presets_blocks_wb_hero_today_links_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_presets_blocks_wb_hero_today_links_link_custom_page"
  );
  
  CREATE TABLE "presets_blocks_wb_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"date" varchar,
  	"featured_image_id" integer,
  	"featured_category" varchar,
  	"featured_brand" varchar,
  	"featured_title" varchar,
  	"featured_excerpt" varchar,
  	"featured_link_type" "enum_presets_blocks_wb_hero_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum_presets_blocks_wb_hero_featured_link_custom_page",
  	"show_today_strip" boolean DEFAULT true,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_wb_hero_locales" (
  	"featured_link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_wb_awards_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"region" varchar,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum_presets_blocks_wb_awards_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_presets_blocks_wb_awards_items_link_custom_page"
  );
  
  CREATE TABLE "presets_blocks_wb_awards_items_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_wb_awards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_presets_blocks_wb_awards_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_presets_blocks_wb_awards_cta_custom_page",
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_wb_awards_locales" (
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_wb_events_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"type" varchar,
  	"date" varchar,
  	"location" varchar,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum_presets_blocks_wb_events_events_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_presets_blocks_wb_events_events_link_custom_page"
  );
  
  CREATE TABLE "presets_blocks_wb_events_events_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_wb_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_presets_blocks_wb_events_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_presets_blocks_wb_events_cta_custom_page",
  	"featured_image_id" integer,
  	"featured_pill" varchar,
  	"featured_date" varchar,
  	"featured_location" varchar,
  	"featured_title" varchar,
  	"featured_description" varchar,
  	"featured_link_type" "enum_presets_blocks_wb_events_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum_presets_blocks_wb_events_featured_link_custom_page",
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_wb_events_locales" (
  	"cta_label" varchar,
  	"featured_link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_wb_brands_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"number" varchar,
  	"brand" varchar,
  	"description" varchar,
  	"latest_highlight" varchar,
  	"latest_cta" varchar,
  	"link_type" "enum_presets_blocks_wb_brands_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_presets_blocks_wb_brands_items_link_custom_page"
  );
  
  CREATE TABLE "presets_blocks_wb_brands" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"title_second_line" varchar,
  	"subtitle" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_wb_research_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" varchar,
  	"type" varchar,
  	"title" varchar,
  	"desc" varchar,
  	"link_type" "enum_presets_blocks_wb_research_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_presets_blocks_wb_research_items_link_custom_page"
  );
  
  CREATE TABLE "presets_blocks_wb_research_items_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_wb_research" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_presets_blocks_wb_research_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_presets_blocks_wb_research_cta_custom_page",
  	"featured_image_id" integer,
  	"featured_pill" varchar,
  	"featured_meta" varchar,
  	"featured_title" varchar,
  	"featured_excerpt" varchar,
  	"featured_link_type" "enum_presets_blocks_wb_research_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum_presets_blocks_wb_research_featured_link_custom_page",
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_wb_research_locales" (
  	"cta_label" varchar,
  	"featured_link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_wb_people_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"date" varchar,
  	"category" varchar,
  	"region" varchar,
  	"title" varchar,
  	"link_type" "enum_presets_blocks_wb_people_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_presets_blocks_wb_people_items_link_custom_page"
  );
  
  CREATE TABLE "presets_blocks_wb_people" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_presets_blocks_wb_people_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_presets_blocks_wb_people_cta_custom_page",
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_wb_people_locales" (
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_wb_featured_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"category" varchar,
  	"brand" varchar,
  	"title" varchar,
  	"description" varchar,
  	"date" varchar,
  	"link_type" "enum_presets_blocks_wb_featured_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_presets_blocks_wb_featured_items_link_custom_page"
  );
  
  CREATE TABLE "presets_blocks_wb_featured" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_presets_blocks_wb_featured_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_presets_blocks_wb_featured_cta_custom_page",
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_wb_featured_locales" (
  	"cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_wb_news_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category" varchar,
  	"date" varchar,
  	"title" varchar,
  	"text" varchar,
  	"link_type" "enum_presets_blocks_wb_news_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_presets_blocks_wb_news_items_link_custom_page"
  );
  
  CREATE TABLE "presets_blocks_wb_news" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_presets_blocks_wb_news_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_presets_blocks_wb_news_cta_custom_page",
  	"featured_image_id" integer,
  	"featured_category" varchar,
  	"featured_date" varchar,
  	"featured_title" varchar,
  	"featured_description" varchar,
  	"featured_byline" varchar,
  	"featured_link_type" "enum_presets_blocks_wb_news_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum_presets_blocks_wb_news_featured_link_custom_page",
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_wb_news_locales" (
  	"cta_label" varchar,
  	"featured_link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_wb_analysis_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category" varchar,
  	"date" varchar,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum_presets_blocks_wb_analysis_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_presets_blocks_wb_analysis_items_link_custom_page"
  );
  
  CREATE TABLE "presets_blocks_wb_analysis" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"cta_type" "enum_presets_blocks_wb_analysis_cta_type" DEFAULT 'reference',
  	"cta_new_tab" boolean,
  	"cta_url" varchar,
  	"cta_custom_page" "enum_presets_blocks_wb_analysis_cta_custom_page",
  	"featured_image_id" integer,
  	"featured_category" varchar,
  	"featured_date" varchar,
  	"featured_title" varchar,
  	"featured_excerpt" varchar,
  	"featured_link_type" "enum_presets_blocks_wb_analysis_featured_link_type" DEFAULT 'reference',
  	"featured_link_new_tab" boolean,
  	"featured_link_url" varchar,
  	"featured_link_custom_page" "enum_presets_blocks_wb_analysis_featured_link_custom_page",
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_wb_analysis_locales" (
  	"cta_label" varchar,
  	"featured_link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_wb_more_read_stories" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"category" varchar,
  	"title" varchar,
  	"link_type" "enum_presets_blocks_wb_more_read_stories_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_presets_blocks_wb_more_read_stories_link_custom_page"
  );
  
  CREATE TABLE "presets_blocks_wb_more_read_most_read" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"rank" varchar,
  	"category" varchar,
  	"title" varchar,
  	"link_type" "enum_presets_blocks_wb_more_read_most_read_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_presets_blocks_wb_more_read_most_read_link_custom_page"
  );
  
  CREATE TABLE "presets_blocks_wb_more_read" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"stories_heading" varchar,
  	"most_read_heading" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_wb_sponsors_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"link_type" "enum_presets_blocks_wb_sponsors_cards_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_presets_blocks_wb_sponsors_cards_link_custom_page"
  );
  
  CREATE TABLE "presets_blocks_wb_sponsors_cards_locales" (
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_wb_sponsors" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"description" varchar,
  	"primary_cta_type" "enum_presets_blocks_wb_sponsors_primary_cta_type" DEFAULT 'reference',
  	"primary_cta_new_tab" boolean,
  	"primary_cta_url" varchar,
  	"primary_cta_custom_page" "enum_presets_blocks_wb_sponsors_primary_cta_custom_page",
  	"secondary_cta_type" "enum_presets_blocks_wb_sponsors_secondary_cta_type" DEFAULT 'reference',
  	"secondary_cta_new_tab" boolean,
  	"secondary_cta_url" varchar,
  	"secondary_cta_custom_page" "enum_presets_blocks_wb_sponsors_secondary_cta_custom_page",
  	"trusted_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_wb_sponsors_locales" (
  	"primary_cta_label" varchar,
  	"secondary_cta_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_wb_subscribe_plans" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"title" varchar,
  	"tag_label" varchar,
  	"tag_tone" "enum_presets_blocks_wb_subscribe_plans_tag_tone",
  	"description" varchar,
  	"cta" varchar,
  	"note" varchar
  );
  
  CREATE TABLE "presets_blocks_wb_subscribe_regions" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"region" varchar
  );
  
  CREATE TABLE "presets_blocks_wb_subscribe" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"title" varchar,
  	"default_plan_value" varchar,
  	"details_label" varchar,
  	"email_placeholder" varchar,
  	"first_name_placeholder" varchar,
  	"last_name_placeholder" varchar,
  	"company_placeholder" varchar,
  	"default_region" varchar,
  	"agree_label" varchar,
  	"submit_label" varchar,
  	"error_message" varchar,
  	"privacy_text" varchar,
  	"privacy_link_type" "enum_presets_blocks_wb_subscribe_privacy_link_type" DEFAULT 'reference',
  	"privacy_link_new_tab" boolean,
  	"privacy_link_url" varchar,
  	"privacy_link_custom_page" "enum_presets_blocks_wb_subscribe_privacy_link_custom_page",
  	"success_title" varchar,
  	"success_body" varchar,
  	"success_cta_label" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_wb_subscribe_locales" (
  	"privacy_link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  ALTER TABLE "page_blocks_wb_hero_compact_cards" ADD CONSTRAINT "page_blocks_wb_hero_compact_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_wb_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_hero_today_links" ADD CONSTRAINT "page_blocks_wb_hero_today_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_wb_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_hero" ADD CONSTRAINT "page_blocks_wb_hero_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_hero" ADD CONSTRAINT "page_blocks_wb_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_awards_items" ADD CONSTRAINT "page_blocks_wb_awards_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_wb_awards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_awards" ADD CONSTRAINT "page_blocks_wb_awards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_events_events" ADD CONSTRAINT "page_blocks_wb_events_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_wb_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_events" ADD CONSTRAINT "page_blocks_wb_events_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_events" ADD CONSTRAINT "page_blocks_wb_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_brands_items" ADD CONSTRAINT "page_blocks_wb_brands_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_wb_brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_brands" ADD CONSTRAINT "page_blocks_wb_brands_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_research_items" ADD CONSTRAINT "page_blocks_wb_research_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_wb_research"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_research" ADD CONSTRAINT "page_blocks_wb_research_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_research" ADD CONSTRAINT "page_blocks_wb_research_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_people_items" ADD CONSTRAINT "page_blocks_wb_people_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_wb_people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_people" ADD CONSTRAINT "page_blocks_wb_people_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_featured_items" ADD CONSTRAINT "page_blocks_wb_featured_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_featured_items" ADD CONSTRAINT "page_blocks_wb_featured_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_wb_featured"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_featured" ADD CONSTRAINT "page_blocks_wb_featured_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_news_items" ADD CONSTRAINT "page_blocks_wb_news_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_wb_news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_news" ADD CONSTRAINT "page_blocks_wb_news_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_news" ADD CONSTRAINT "page_blocks_wb_news_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_analysis_items" ADD CONSTRAINT "page_blocks_wb_analysis_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_wb_analysis"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_analysis" ADD CONSTRAINT "page_blocks_wb_analysis_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_analysis" ADD CONSTRAINT "page_blocks_wb_analysis_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_more_read_stories" ADD CONSTRAINT "page_blocks_wb_more_read_stories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_wb_more_read"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_more_read_most_read" ADD CONSTRAINT "page_blocks_wb_more_read_most_read_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_wb_more_read"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_more_read" ADD CONSTRAINT "page_blocks_wb_more_read_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_sponsors_cards" ADD CONSTRAINT "page_blocks_wb_sponsors_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_wb_sponsors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_sponsors" ADD CONSTRAINT "page_blocks_wb_sponsors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_subscribe_plans" ADD CONSTRAINT "page_blocks_wb_subscribe_plans_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_wb_subscribe"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_subscribe_regions" ADD CONSTRAINT "page_blocks_wb_subscribe_regions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_wb_subscribe"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_wb_subscribe" ADD CONSTRAINT "page_blocks_wb_subscribe_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_texts" ADD CONSTRAINT "page_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_hero_compact_cards" ADD CONSTRAINT "_page_v_blocks_wb_hero_compact_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_wb_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_hero_today_links" ADD CONSTRAINT "_page_v_blocks_wb_hero_today_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_wb_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_hero" ADD CONSTRAINT "_page_v_blocks_wb_hero_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_hero" ADD CONSTRAINT "_page_v_blocks_wb_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_awards_items" ADD CONSTRAINT "_page_v_blocks_wb_awards_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_wb_awards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_awards" ADD CONSTRAINT "_page_v_blocks_wb_awards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_events_events" ADD CONSTRAINT "_page_v_blocks_wb_events_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_wb_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_events" ADD CONSTRAINT "_page_v_blocks_wb_events_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_events" ADD CONSTRAINT "_page_v_blocks_wb_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_brands_items" ADD CONSTRAINT "_page_v_blocks_wb_brands_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_wb_brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_brands" ADD CONSTRAINT "_page_v_blocks_wb_brands_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_research_items" ADD CONSTRAINT "_page_v_blocks_wb_research_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_wb_research"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_research" ADD CONSTRAINT "_page_v_blocks_wb_research_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_research" ADD CONSTRAINT "_page_v_blocks_wb_research_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_people_items" ADD CONSTRAINT "_page_v_blocks_wb_people_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_wb_people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_people" ADD CONSTRAINT "_page_v_blocks_wb_people_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_featured_items" ADD CONSTRAINT "_page_v_blocks_wb_featured_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_featured_items" ADD CONSTRAINT "_page_v_blocks_wb_featured_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_wb_featured"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_featured" ADD CONSTRAINT "_page_v_blocks_wb_featured_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_news_items" ADD CONSTRAINT "_page_v_blocks_wb_news_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_wb_news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_news" ADD CONSTRAINT "_page_v_blocks_wb_news_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_news" ADD CONSTRAINT "_page_v_blocks_wb_news_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_analysis_items" ADD CONSTRAINT "_page_v_blocks_wb_analysis_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_wb_analysis"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_analysis" ADD CONSTRAINT "_page_v_blocks_wb_analysis_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_analysis" ADD CONSTRAINT "_page_v_blocks_wb_analysis_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_more_read_stories" ADD CONSTRAINT "_page_v_blocks_wb_more_read_stories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_wb_more_read"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_more_read_most_read" ADD CONSTRAINT "_page_v_blocks_wb_more_read_most_read_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_wb_more_read"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_more_read" ADD CONSTRAINT "_page_v_blocks_wb_more_read_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_sponsors_cards" ADD CONSTRAINT "_page_v_blocks_wb_sponsors_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_wb_sponsors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_sponsors" ADD CONSTRAINT "_page_v_blocks_wb_sponsors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_subscribe_plans" ADD CONSTRAINT "_page_v_blocks_wb_subscribe_plans_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_wb_subscribe"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_subscribe_regions" ADD CONSTRAINT "_page_v_blocks_wb_subscribe_regions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_wb_subscribe"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_wb_subscribe" ADD CONSTRAINT "_page_v_blocks_wb_subscribe_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_texts" ADD CONSTRAINT "_page_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_hero_compact_cards" ADD CONSTRAINT "gsec_blocks_wb_hero_compact_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_wb_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_hero_today_links" ADD CONSTRAINT "gsec_blocks_wb_hero_today_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_wb_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_hero" ADD CONSTRAINT "gsec_blocks_wb_hero_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_hero" ADD CONSTRAINT "gsec_blocks_wb_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_awards_items" ADD CONSTRAINT "gsec_blocks_wb_awards_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_wb_awards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_awards" ADD CONSTRAINT "gsec_blocks_wb_awards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_events_events" ADD CONSTRAINT "gsec_blocks_wb_events_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_wb_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_events" ADD CONSTRAINT "gsec_blocks_wb_events_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_events" ADD CONSTRAINT "gsec_blocks_wb_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_brands_items" ADD CONSTRAINT "gsec_blocks_wb_brands_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_wb_brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_brands" ADD CONSTRAINT "gsec_blocks_wb_brands_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_research_items" ADD CONSTRAINT "gsec_blocks_wb_research_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_wb_research"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_research" ADD CONSTRAINT "gsec_blocks_wb_research_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_research" ADD CONSTRAINT "gsec_blocks_wb_research_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_people_items" ADD CONSTRAINT "gsec_blocks_wb_people_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_wb_people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_people" ADD CONSTRAINT "gsec_blocks_wb_people_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_featured_items" ADD CONSTRAINT "gsec_blocks_wb_featured_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_featured_items" ADD CONSTRAINT "gsec_blocks_wb_featured_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_wb_featured"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_featured" ADD CONSTRAINT "gsec_blocks_wb_featured_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_news_items" ADD CONSTRAINT "gsec_blocks_wb_news_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_wb_news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_news" ADD CONSTRAINT "gsec_blocks_wb_news_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_news" ADD CONSTRAINT "gsec_blocks_wb_news_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_analysis_items" ADD CONSTRAINT "gsec_blocks_wb_analysis_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_wb_analysis"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_analysis" ADD CONSTRAINT "gsec_blocks_wb_analysis_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_analysis" ADD CONSTRAINT "gsec_blocks_wb_analysis_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_more_read_stories" ADD CONSTRAINT "gsec_blocks_wb_more_read_stories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_wb_more_read"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_more_read_most_read" ADD CONSTRAINT "gsec_blocks_wb_more_read_most_read_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_wb_more_read"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_more_read" ADD CONSTRAINT "gsec_blocks_wb_more_read_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_sponsors_cards" ADD CONSTRAINT "gsec_blocks_wb_sponsors_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_wb_sponsors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_sponsors" ADD CONSTRAINT "gsec_blocks_wb_sponsors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_subscribe_plans" ADD CONSTRAINT "gsec_blocks_wb_subscribe_plans_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_wb_subscribe"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_subscribe_regions" ADD CONSTRAINT "gsec_blocks_wb_subscribe_regions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_wb_subscribe"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_wb_subscribe" ADD CONSTRAINT "gsec_blocks_wb_subscribe_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_texts" ADD CONSTRAINT "gsec_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_hero_compact_cards" ADD CONSTRAINT "_gsec_v_blocks_wb_hero_compact_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_wb_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_hero_today_links" ADD CONSTRAINT "_gsec_v_blocks_wb_hero_today_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_wb_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_hero" ADD CONSTRAINT "_gsec_v_blocks_wb_hero_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_hero" ADD CONSTRAINT "_gsec_v_blocks_wb_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_awards_items" ADD CONSTRAINT "_gsec_v_blocks_wb_awards_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_wb_awards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_awards" ADD CONSTRAINT "_gsec_v_blocks_wb_awards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_events_events" ADD CONSTRAINT "_gsec_v_blocks_wb_events_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_wb_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_events" ADD CONSTRAINT "_gsec_v_blocks_wb_events_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_events" ADD CONSTRAINT "_gsec_v_blocks_wb_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_brands_items" ADD CONSTRAINT "_gsec_v_blocks_wb_brands_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_wb_brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_brands" ADD CONSTRAINT "_gsec_v_blocks_wb_brands_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_research_items" ADD CONSTRAINT "_gsec_v_blocks_wb_research_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_wb_research"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_research" ADD CONSTRAINT "_gsec_v_blocks_wb_research_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_research" ADD CONSTRAINT "_gsec_v_blocks_wb_research_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_people_items" ADD CONSTRAINT "_gsec_v_blocks_wb_people_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_wb_people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_people" ADD CONSTRAINT "_gsec_v_blocks_wb_people_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_featured_items" ADD CONSTRAINT "_gsec_v_blocks_wb_featured_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_featured_items" ADD CONSTRAINT "_gsec_v_blocks_wb_featured_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_wb_featured"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_featured" ADD CONSTRAINT "_gsec_v_blocks_wb_featured_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_news_items" ADD CONSTRAINT "_gsec_v_blocks_wb_news_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_wb_news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_news" ADD CONSTRAINT "_gsec_v_blocks_wb_news_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_news" ADD CONSTRAINT "_gsec_v_blocks_wb_news_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_analysis_items" ADD CONSTRAINT "_gsec_v_blocks_wb_analysis_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_wb_analysis"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_analysis" ADD CONSTRAINT "_gsec_v_blocks_wb_analysis_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_analysis" ADD CONSTRAINT "_gsec_v_blocks_wb_analysis_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_more_read_stories" ADD CONSTRAINT "_gsec_v_blocks_wb_more_read_stories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_wb_more_read"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_more_read_most_read" ADD CONSTRAINT "_gsec_v_blocks_wb_more_read_most_read_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_wb_more_read"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_more_read" ADD CONSTRAINT "_gsec_v_blocks_wb_more_read_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_sponsors_cards" ADD CONSTRAINT "_gsec_v_blocks_wb_sponsors_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_wb_sponsors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_sponsors" ADD CONSTRAINT "_gsec_v_blocks_wb_sponsors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_subscribe_plans" ADD CONSTRAINT "_gsec_v_blocks_wb_subscribe_plans_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_wb_subscribe"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_subscribe_regions" ADD CONSTRAINT "_gsec_v_blocks_wb_subscribe_regions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_wb_subscribe"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_wb_subscribe" ADD CONSTRAINT "_gsec_v_blocks_wb_subscribe_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_texts" ADD CONSTRAINT "_gsec_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_hero_compact_cards" ADD CONSTRAINT "presets_blocks_wb_hero_compact_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_hero_compact_cards_locales" ADD CONSTRAINT "presets_blocks_wb_hero_compact_cards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_hero_compact_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_hero_today_links" ADD CONSTRAINT "presets_blocks_wb_hero_today_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_hero" ADD CONSTRAINT "presets_blocks_wb_hero_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_hero" ADD CONSTRAINT "presets_blocks_wb_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_hero_locales" ADD CONSTRAINT "presets_blocks_wb_hero_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_awards_items" ADD CONSTRAINT "presets_blocks_wb_awards_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_awards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_awards_items_locales" ADD CONSTRAINT "presets_blocks_wb_awards_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_awards_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_awards" ADD CONSTRAINT "presets_blocks_wb_awards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_awards_locales" ADD CONSTRAINT "presets_blocks_wb_awards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_awards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_events_events" ADD CONSTRAINT "presets_blocks_wb_events_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_events_events_locales" ADD CONSTRAINT "presets_blocks_wb_events_events_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_events_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_events" ADD CONSTRAINT "presets_blocks_wb_events_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_events" ADD CONSTRAINT "presets_blocks_wb_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_events_locales" ADD CONSTRAINT "presets_blocks_wb_events_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_brands_items" ADD CONSTRAINT "presets_blocks_wb_brands_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_brands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_brands" ADD CONSTRAINT "presets_blocks_wb_brands_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_research_items" ADD CONSTRAINT "presets_blocks_wb_research_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_research"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_research_items_locales" ADD CONSTRAINT "presets_blocks_wb_research_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_research_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_research" ADD CONSTRAINT "presets_blocks_wb_research_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_research" ADD CONSTRAINT "presets_blocks_wb_research_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_research_locales" ADD CONSTRAINT "presets_blocks_wb_research_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_research"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_people_items" ADD CONSTRAINT "presets_blocks_wb_people_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_people" ADD CONSTRAINT "presets_blocks_wb_people_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_people_locales" ADD CONSTRAINT "presets_blocks_wb_people_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_featured_items" ADD CONSTRAINT "presets_blocks_wb_featured_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_featured_items" ADD CONSTRAINT "presets_blocks_wb_featured_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_featured"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_featured" ADD CONSTRAINT "presets_blocks_wb_featured_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_featured_locales" ADD CONSTRAINT "presets_blocks_wb_featured_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_featured"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_news_items" ADD CONSTRAINT "presets_blocks_wb_news_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_news" ADD CONSTRAINT "presets_blocks_wb_news_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_news" ADD CONSTRAINT "presets_blocks_wb_news_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_news_locales" ADD CONSTRAINT "presets_blocks_wb_news_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_news"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_analysis_items" ADD CONSTRAINT "presets_blocks_wb_analysis_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_analysis"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_analysis" ADD CONSTRAINT "presets_blocks_wb_analysis_featured_image_id_media_id_fk" FOREIGN KEY ("featured_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_analysis" ADD CONSTRAINT "presets_blocks_wb_analysis_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_analysis_locales" ADD CONSTRAINT "presets_blocks_wb_analysis_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_analysis"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_more_read_stories" ADD CONSTRAINT "presets_blocks_wb_more_read_stories_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_more_read"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_more_read_most_read" ADD CONSTRAINT "presets_blocks_wb_more_read_most_read_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_more_read"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_more_read" ADD CONSTRAINT "presets_blocks_wb_more_read_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_sponsors_cards" ADD CONSTRAINT "presets_blocks_wb_sponsors_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_sponsors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_sponsors_cards_locales" ADD CONSTRAINT "presets_blocks_wb_sponsors_cards_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_sponsors_cards"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_sponsors" ADD CONSTRAINT "presets_blocks_wb_sponsors_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_sponsors_locales" ADD CONSTRAINT "presets_blocks_wb_sponsors_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_sponsors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_subscribe_plans" ADD CONSTRAINT "presets_blocks_wb_subscribe_plans_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_subscribe"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_subscribe_regions" ADD CONSTRAINT "presets_blocks_wb_subscribe_regions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_subscribe"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_subscribe" ADD CONSTRAINT "presets_blocks_wb_subscribe_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_wb_subscribe_locales" ADD CONSTRAINT "presets_blocks_wb_subscribe_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_wb_subscribe"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_texts" ADD CONSTRAINT "presets_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_wb_hero_compact_cards_order_idx" ON "page_blocks_wb_hero_compact_cards" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_hero_compact_cards_parent_id_idx" ON "page_blocks_wb_hero_compact_cards" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_hero_compact_cards_locale_idx" ON "page_blocks_wb_hero_compact_cards" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_hero_today_links_order_idx" ON "page_blocks_wb_hero_today_links" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_hero_today_links_parent_id_idx" ON "page_blocks_wb_hero_today_links" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_hero_today_links_locale_idx" ON "page_blocks_wb_hero_today_links" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_hero_order_idx" ON "page_blocks_wb_hero" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_hero_parent_id_idx" ON "page_blocks_wb_hero" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_hero_path_idx" ON "page_blocks_wb_hero" USING btree ("_path");
  CREATE INDEX "page_blocks_wb_hero_locale_idx" ON "page_blocks_wb_hero" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_hero_featured_featured_image_idx" ON "page_blocks_wb_hero" USING btree ("featured_image_id");
  CREATE INDEX "page_blocks_wb_awards_items_order_idx" ON "page_blocks_wb_awards_items" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_awards_items_parent_id_idx" ON "page_blocks_wb_awards_items" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_awards_items_locale_idx" ON "page_blocks_wb_awards_items" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_awards_order_idx" ON "page_blocks_wb_awards" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_awards_parent_id_idx" ON "page_blocks_wb_awards" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_awards_path_idx" ON "page_blocks_wb_awards" USING btree ("_path");
  CREATE INDEX "page_blocks_wb_awards_locale_idx" ON "page_blocks_wb_awards" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_events_events_order_idx" ON "page_blocks_wb_events_events" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_events_events_parent_id_idx" ON "page_blocks_wb_events_events" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_events_events_locale_idx" ON "page_blocks_wb_events_events" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_events_order_idx" ON "page_blocks_wb_events" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_events_parent_id_idx" ON "page_blocks_wb_events" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_events_path_idx" ON "page_blocks_wb_events" USING btree ("_path");
  CREATE INDEX "page_blocks_wb_events_locale_idx" ON "page_blocks_wb_events" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_events_featured_featured_image_idx" ON "page_blocks_wb_events" USING btree ("featured_image_id");
  CREATE INDEX "page_blocks_wb_brands_items_order_idx" ON "page_blocks_wb_brands_items" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_brands_items_parent_id_idx" ON "page_blocks_wb_brands_items" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_brands_items_locale_idx" ON "page_blocks_wb_brands_items" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_brands_order_idx" ON "page_blocks_wb_brands" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_brands_parent_id_idx" ON "page_blocks_wb_brands" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_brands_path_idx" ON "page_blocks_wb_brands" USING btree ("_path");
  CREATE INDEX "page_blocks_wb_brands_locale_idx" ON "page_blocks_wb_brands" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_research_items_order_idx" ON "page_blocks_wb_research_items" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_research_items_parent_id_idx" ON "page_blocks_wb_research_items" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_research_items_locale_idx" ON "page_blocks_wb_research_items" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_research_order_idx" ON "page_blocks_wb_research" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_research_parent_id_idx" ON "page_blocks_wb_research" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_research_path_idx" ON "page_blocks_wb_research" USING btree ("_path");
  CREATE INDEX "page_blocks_wb_research_locale_idx" ON "page_blocks_wb_research" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_research_featured_featured_image_idx" ON "page_blocks_wb_research" USING btree ("featured_image_id");
  CREATE INDEX "page_blocks_wb_people_items_order_idx" ON "page_blocks_wb_people_items" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_people_items_parent_id_idx" ON "page_blocks_wb_people_items" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_people_items_locale_idx" ON "page_blocks_wb_people_items" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_people_order_idx" ON "page_blocks_wb_people" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_people_parent_id_idx" ON "page_blocks_wb_people" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_people_path_idx" ON "page_blocks_wb_people" USING btree ("_path");
  CREATE INDEX "page_blocks_wb_people_locale_idx" ON "page_blocks_wb_people" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_featured_items_order_idx" ON "page_blocks_wb_featured_items" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_featured_items_parent_id_idx" ON "page_blocks_wb_featured_items" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_featured_items_locale_idx" ON "page_blocks_wb_featured_items" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_featured_items_image_idx" ON "page_blocks_wb_featured_items" USING btree ("image_id");
  CREATE INDEX "page_blocks_wb_featured_order_idx" ON "page_blocks_wb_featured" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_featured_parent_id_idx" ON "page_blocks_wb_featured" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_featured_path_idx" ON "page_blocks_wb_featured" USING btree ("_path");
  CREATE INDEX "page_blocks_wb_featured_locale_idx" ON "page_blocks_wb_featured" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_news_items_order_idx" ON "page_blocks_wb_news_items" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_news_items_parent_id_idx" ON "page_blocks_wb_news_items" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_news_items_locale_idx" ON "page_blocks_wb_news_items" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_news_order_idx" ON "page_blocks_wb_news" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_news_parent_id_idx" ON "page_blocks_wb_news" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_news_path_idx" ON "page_blocks_wb_news" USING btree ("_path");
  CREATE INDEX "page_blocks_wb_news_locale_idx" ON "page_blocks_wb_news" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_news_featured_featured_image_idx" ON "page_blocks_wb_news" USING btree ("featured_image_id");
  CREATE INDEX "page_blocks_wb_analysis_items_order_idx" ON "page_blocks_wb_analysis_items" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_analysis_items_parent_id_idx" ON "page_blocks_wb_analysis_items" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_analysis_items_locale_idx" ON "page_blocks_wb_analysis_items" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_analysis_order_idx" ON "page_blocks_wb_analysis" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_analysis_parent_id_idx" ON "page_blocks_wb_analysis" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_analysis_path_idx" ON "page_blocks_wb_analysis" USING btree ("_path");
  CREATE INDEX "page_blocks_wb_analysis_locale_idx" ON "page_blocks_wb_analysis" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_analysis_featured_featured_image_idx" ON "page_blocks_wb_analysis" USING btree ("featured_image_id");
  CREATE INDEX "page_blocks_wb_more_read_stories_order_idx" ON "page_blocks_wb_more_read_stories" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_more_read_stories_parent_id_idx" ON "page_blocks_wb_more_read_stories" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_more_read_stories_locale_idx" ON "page_blocks_wb_more_read_stories" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_more_read_most_read_order_idx" ON "page_blocks_wb_more_read_most_read" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_more_read_most_read_parent_id_idx" ON "page_blocks_wb_more_read_most_read" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_more_read_most_read_locale_idx" ON "page_blocks_wb_more_read_most_read" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_more_read_order_idx" ON "page_blocks_wb_more_read" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_more_read_parent_id_idx" ON "page_blocks_wb_more_read" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_more_read_path_idx" ON "page_blocks_wb_more_read" USING btree ("_path");
  CREATE INDEX "page_blocks_wb_more_read_locale_idx" ON "page_blocks_wb_more_read" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_sponsors_cards_order_idx" ON "page_blocks_wb_sponsors_cards" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_sponsors_cards_parent_id_idx" ON "page_blocks_wb_sponsors_cards" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_sponsors_cards_locale_idx" ON "page_blocks_wb_sponsors_cards" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_sponsors_order_idx" ON "page_blocks_wb_sponsors" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_sponsors_parent_id_idx" ON "page_blocks_wb_sponsors" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_sponsors_path_idx" ON "page_blocks_wb_sponsors" USING btree ("_path");
  CREATE INDEX "page_blocks_wb_sponsors_locale_idx" ON "page_blocks_wb_sponsors" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_subscribe_plans_order_idx" ON "page_blocks_wb_subscribe_plans" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_subscribe_plans_parent_id_idx" ON "page_blocks_wb_subscribe_plans" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_subscribe_plans_locale_idx" ON "page_blocks_wb_subscribe_plans" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_subscribe_regions_order_idx" ON "page_blocks_wb_subscribe_regions" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_subscribe_regions_parent_id_idx" ON "page_blocks_wb_subscribe_regions" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_subscribe_regions_locale_idx" ON "page_blocks_wb_subscribe_regions" USING btree ("_locale");
  CREATE INDEX "page_blocks_wb_subscribe_order_idx" ON "page_blocks_wb_subscribe" USING btree ("_order");
  CREATE INDEX "page_blocks_wb_subscribe_parent_id_idx" ON "page_blocks_wb_subscribe" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_wb_subscribe_path_idx" ON "page_blocks_wb_subscribe" USING btree ("_path");
  CREATE INDEX "page_blocks_wb_subscribe_locale_idx" ON "page_blocks_wb_subscribe" USING btree ("_locale");
  CREATE INDEX "page_texts_order_parent" ON "page_texts" USING btree ("order","parent_id");
  CREATE INDEX "page_texts_locale_parent" ON "page_texts" USING btree ("locale","parent_id");
  CREATE INDEX "_page_v_blocks_wb_hero_compact_cards_order_idx" ON "_page_v_blocks_wb_hero_compact_cards" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_hero_compact_cards_parent_id_idx" ON "_page_v_blocks_wb_hero_compact_cards" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_hero_compact_cards_locale_idx" ON "_page_v_blocks_wb_hero_compact_cards" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_hero_today_links_order_idx" ON "_page_v_blocks_wb_hero_today_links" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_hero_today_links_parent_id_idx" ON "_page_v_blocks_wb_hero_today_links" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_hero_today_links_locale_idx" ON "_page_v_blocks_wb_hero_today_links" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_hero_order_idx" ON "_page_v_blocks_wb_hero" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_hero_parent_id_idx" ON "_page_v_blocks_wb_hero" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_hero_path_idx" ON "_page_v_blocks_wb_hero" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_wb_hero_locale_idx" ON "_page_v_blocks_wb_hero" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_hero_featured_featured_image_idx" ON "_page_v_blocks_wb_hero" USING btree ("featured_image_id");
  CREATE INDEX "_page_v_blocks_wb_awards_items_order_idx" ON "_page_v_blocks_wb_awards_items" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_awards_items_parent_id_idx" ON "_page_v_blocks_wb_awards_items" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_awards_items_locale_idx" ON "_page_v_blocks_wb_awards_items" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_awards_order_idx" ON "_page_v_blocks_wb_awards" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_awards_parent_id_idx" ON "_page_v_blocks_wb_awards" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_awards_path_idx" ON "_page_v_blocks_wb_awards" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_wb_awards_locale_idx" ON "_page_v_blocks_wb_awards" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_events_events_order_idx" ON "_page_v_blocks_wb_events_events" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_events_events_parent_id_idx" ON "_page_v_blocks_wb_events_events" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_events_events_locale_idx" ON "_page_v_blocks_wb_events_events" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_events_order_idx" ON "_page_v_blocks_wb_events" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_events_parent_id_idx" ON "_page_v_blocks_wb_events" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_events_path_idx" ON "_page_v_blocks_wb_events" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_wb_events_locale_idx" ON "_page_v_blocks_wb_events" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_events_featured_featured_image_idx" ON "_page_v_blocks_wb_events" USING btree ("featured_image_id");
  CREATE INDEX "_page_v_blocks_wb_brands_items_order_idx" ON "_page_v_blocks_wb_brands_items" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_brands_items_parent_id_idx" ON "_page_v_blocks_wb_brands_items" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_brands_items_locale_idx" ON "_page_v_blocks_wb_brands_items" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_brands_order_idx" ON "_page_v_blocks_wb_brands" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_brands_parent_id_idx" ON "_page_v_blocks_wb_brands" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_brands_path_idx" ON "_page_v_blocks_wb_brands" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_wb_brands_locale_idx" ON "_page_v_blocks_wb_brands" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_research_items_order_idx" ON "_page_v_blocks_wb_research_items" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_research_items_parent_id_idx" ON "_page_v_blocks_wb_research_items" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_research_items_locale_idx" ON "_page_v_blocks_wb_research_items" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_research_order_idx" ON "_page_v_blocks_wb_research" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_research_parent_id_idx" ON "_page_v_blocks_wb_research" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_research_path_idx" ON "_page_v_blocks_wb_research" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_wb_research_locale_idx" ON "_page_v_blocks_wb_research" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_research_featured_featured_image_idx" ON "_page_v_blocks_wb_research" USING btree ("featured_image_id");
  CREATE INDEX "_page_v_blocks_wb_people_items_order_idx" ON "_page_v_blocks_wb_people_items" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_people_items_parent_id_idx" ON "_page_v_blocks_wb_people_items" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_people_items_locale_idx" ON "_page_v_blocks_wb_people_items" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_people_order_idx" ON "_page_v_blocks_wb_people" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_people_parent_id_idx" ON "_page_v_blocks_wb_people" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_people_path_idx" ON "_page_v_blocks_wb_people" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_wb_people_locale_idx" ON "_page_v_blocks_wb_people" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_featured_items_order_idx" ON "_page_v_blocks_wb_featured_items" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_featured_items_parent_id_idx" ON "_page_v_blocks_wb_featured_items" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_featured_items_locale_idx" ON "_page_v_blocks_wb_featured_items" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_featured_items_image_idx" ON "_page_v_blocks_wb_featured_items" USING btree ("image_id");
  CREATE INDEX "_page_v_blocks_wb_featured_order_idx" ON "_page_v_blocks_wb_featured" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_featured_parent_id_idx" ON "_page_v_blocks_wb_featured" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_featured_path_idx" ON "_page_v_blocks_wb_featured" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_wb_featured_locale_idx" ON "_page_v_blocks_wb_featured" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_news_items_order_idx" ON "_page_v_blocks_wb_news_items" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_news_items_parent_id_idx" ON "_page_v_blocks_wb_news_items" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_news_items_locale_idx" ON "_page_v_blocks_wb_news_items" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_news_order_idx" ON "_page_v_blocks_wb_news" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_news_parent_id_idx" ON "_page_v_blocks_wb_news" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_news_path_idx" ON "_page_v_blocks_wb_news" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_wb_news_locale_idx" ON "_page_v_blocks_wb_news" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_news_featured_featured_image_idx" ON "_page_v_blocks_wb_news" USING btree ("featured_image_id");
  CREATE INDEX "_page_v_blocks_wb_analysis_items_order_idx" ON "_page_v_blocks_wb_analysis_items" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_analysis_items_parent_id_idx" ON "_page_v_blocks_wb_analysis_items" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_analysis_items_locale_idx" ON "_page_v_blocks_wb_analysis_items" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_analysis_order_idx" ON "_page_v_blocks_wb_analysis" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_analysis_parent_id_idx" ON "_page_v_blocks_wb_analysis" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_analysis_path_idx" ON "_page_v_blocks_wb_analysis" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_wb_analysis_locale_idx" ON "_page_v_blocks_wb_analysis" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_analysis_featured_featured_image_idx" ON "_page_v_blocks_wb_analysis" USING btree ("featured_image_id");
  CREATE INDEX "_page_v_blocks_wb_more_read_stories_order_idx" ON "_page_v_blocks_wb_more_read_stories" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_more_read_stories_parent_id_idx" ON "_page_v_blocks_wb_more_read_stories" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_more_read_stories_locale_idx" ON "_page_v_blocks_wb_more_read_stories" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_more_read_most_read_order_idx" ON "_page_v_blocks_wb_more_read_most_read" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_more_read_most_read_parent_id_idx" ON "_page_v_blocks_wb_more_read_most_read" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_more_read_most_read_locale_idx" ON "_page_v_blocks_wb_more_read_most_read" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_more_read_order_idx" ON "_page_v_blocks_wb_more_read" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_more_read_parent_id_idx" ON "_page_v_blocks_wb_more_read" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_more_read_path_idx" ON "_page_v_blocks_wb_more_read" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_wb_more_read_locale_idx" ON "_page_v_blocks_wb_more_read" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_sponsors_cards_order_idx" ON "_page_v_blocks_wb_sponsors_cards" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_sponsors_cards_parent_id_idx" ON "_page_v_blocks_wb_sponsors_cards" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_sponsors_cards_locale_idx" ON "_page_v_blocks_wb_sponsors_cards" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_sponsors_order_idx" ON "_page_v_blocks_wb_sponsors" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_sponsors_parent_id_idx" ON "_page_v_blocks_wb_sponsors" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_sponsors_path_idx" ON "_page_v_blocks_wb_sponsors" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_wb_sponsors_locale_idx" ON "_page_v_blocks_wb_sponsors" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_subscribe_plans_order_idx" ON "_page_v_blocks_wb_subscribe_plans" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_subscribe_plans_parent_id_idx" ON "_page_v_blocks_wb_subscribe_plans" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_subscribe_plans_locale_idx" ON "_page_v_blocks_wb_subscribe_plans" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_subscribe_regions_order_idx" ON "_page_v_blocks_wb_subscribe_regions" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_subscribe_regions_parent_id_idx" ON "_page_v_blocks_wb_subscribe_regions" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_subscribe_regions_locale_idx" ON "_page_v_blocks_wb_subscribe_regions" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_wb_subscribe_order_idx" ON "_page_v_blocks_wb_subscribe" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_wb_subscribe_parent_id_idx" ON "_page_v_blocks_wb_subscribe" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_wb_subscribe_path_idx" ON "_page_v_blocks_wb_subscribe" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_wb_subscribe_locale_idx" ON "_page_v_blocks_wb_subscribe" USING btree ("_locale");
  CREATE INDEX "_page_v_texts_order_parent" ON "_page_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_page_v_texts_locale_parent" ON "_page_v_texts" USING btree ("locale","parent_id");
  CREATE INDEX "gsec_blocks_wb_hero_compact_cards_order_idx" ON "gsec_blocks_wb_hero_compact_cards" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_hero_compact_cards_parent_id_idx" ON "gsec_blocks_wb_hero_compact_cards" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_hero_compact_cards_locale_idx" ON "gsec_blocks_wb_hero_compact_cards" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_hero_today_links_order_idx" ON "gsec_blocks_wb_hero_today_links" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_hero_today_links_parent_id_idx" ON "gsec_blocks_wb_hero_today_links" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_hero_today_links_locale_idx" ON "gsec_blocks_wb_hero_today_links" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_hero_order_idx" ON "gsec_blocks_wb_hero" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_hero_parent_id_idx" ON "gsec_blocks_wb_hero" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_hero_path_idx" ON "gsec_blocks_wb_hero" USING btree ("_path");
  CREATE INDEX "gsec_blocks_wb_hero_locale_idx" ON "gsec_blocks_wb_hero" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_hero_featured_featured_image_idx" ON "gsec_blocks_wb_hero" USING btree ("featured_image_id");
  CREATE INDEX "gsec_blocks_wb_awards_items_order_idx" ON "gsec_blocks_wb_awards_items" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_awards_items_parent_id_idx" ON "gsec_blocks_wb_awards_items" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_awards_items_locale_idx" ON "gsec_blocks_wb_awards_items" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_awards_order_idx" ON "gsec_blocks_wb_awards" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_awards_parent_id_idx" ON "gsec_blocks_wb_awards" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_awards_path_idx" ON "gsec_blocks_wb_awards" USING btree ("_path");
  CREATE INDEX "gsec_blocks_wb_awards_locale_idx" ON "gsec_blocks_wb_awards" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_events_events_order_idx" ON "gsec_blocks_wb_events_events" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_events_events_parent_id_idx" ON "gsec_blocks_wb_events_events" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_events_events_locale_idx" ON "gsec_blocks_wb_events_events" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_events_order_idx" ON "gsec_blocks_wb_events" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_events_parent_id_idx" ON "gsec_blocks_wb_events" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_events_path_idx" ON "gsec_blocks_wb_events" USING btree ("_path");
  CREATE INDEX "gsec_blocks_wb_events_locale_idx" ON "gsec_blocks_wb_events" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_events_featured_featured_image_idx" ON "gsec_blocks_wb_events" USING btree ("featured_image_id");
  CREATE INDEX "gsec_blocks_wb_brands_items_order_idx" ON "gsec_blocks_wb_brands_items" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_brands_items_parent_id_idx" ON "gsec_blocks_wb_brands_items" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_brands_items_locale_idx" ON "gsec_blocks_wb_brands_items" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_brands_order_idx" ON "gsec_blocks_wb_brands" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_brands_parent_id_idx" ON "gsec_blocks_wb_brands" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_brands_path_idx" ON "gsec_blocks_wb_brands" USING btree ("_path");
  CREATE INDEX "gsec_blocks_wb_brands_locale_idx" ON "gsec_blocks_wb_brands" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_research_items_order_idx" ON "gsec_blocks_wb_research_items" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_research_items_parent_id_idx" ON "gsec_blocks_wb_research_items" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_research_items_locale_idx" ON "gsec_blocks_wb_research_items" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_research_order_idx" ON "gsec_blocks_wb_research" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_research_parent_id_idx" ON "gsec_blocks_wb_research" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_research_path_idx" ON "gsec_blocks_wb_research" USING btree ("_path");
  CREATE INDEX "gsec_blocks_wb_research_locale_idx" ON "gsec_blocks_wb_research" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_research_featured_featured_image_idx" ON "gsec_blocks_wb_research" USING btree ("featured_image_id");
  CREATE INDEX "gsec_blocks_wb_people_items_order_idx" ON "gsec_blocks_wb_people_items" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_people_items_parent_id_idx" ON "gsec_blocks_wb_people_items" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_people_items_locale_idx" ON "gsec_blocks_wb_people_items" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_people_order_idx" ON "gsec_blocks_wb_people" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_people_parent_id_idx" ON "gsec_blocks_wb_people" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_people_path_idx" ON "gsec_blocks_wb_people" USING btree ("_path");
  CREATE INDEX "gsec_blocks_wb_people_locale_idx" ON "gsec_blocks_wb_people" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_featured_items_order_idx" ON "gsec_blocks_wb_featured_items" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_featured_items_parent_id_idx" ON "gsec_blocks_wb_featured_items" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_featured_items_locale_idx" ON "gsec_blocks_wb_featured_items" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_featured_items_image_idx" ON "gsec_blocks_wb_featured_items" USING btree ("image_id");
  CREATE INDEX "gsec_blocks_wb_featured_order_idx" ON "gsec_blocks_wb_featured" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_featured_parent_id_idx" ON "gsec_blocks_wb_featured" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_featured_path_idx" ON "gsec_blocks_wb_featured" USING btree ("_path");
  CREATE INDEX "gsec_blocks_wb_featured_locale_idx" ON "gsec_blocks_wb_featured" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_news_items_order_idx" ON "gsec_blocks_wb_news_items" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_news_items_parent_id_idx" ON "gsec_blocks_wb_news_items" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_news_items_locale_idx" ON "gsec_blocks_wb_news_items" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_news_order_idx" ON "gsec_blocks_wb_news" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_news_parent_id_idx" ON "gsec_blocks_wb_news" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_news_path_idx" ON "gsec_blocks_wb_news" USING btree ("_path");
  CREATE INDEX "gsec_blocks_wb_news_locale_idx" ON "gsec_blocks_wb_news" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_news_featured_featured_image_idx" ON "gsec_blocks_wb_news" USING btree ("featured_image_id");
  CREATE INDEX "gsec_blocks_wb_analysis_items_order_idx" ON "gsec_blocks_wb_analysis_items" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_analysis_items_parent_id_idx" ON "gsec_blocks_wb_analysis_items" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_analysis_items_locale_idx" ON "gsec_blocks_wb_analysis_items" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_analysis_order_idx" ON "gsec_blocks_wb_analysis" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_analysis_parent_id_idx" ON "gsec_blocks_wb_analysis" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_analysis_path_idx" ON "gsec_blocks_wb_analysis" USING btree ("_path");
  CREATE INDEX "gsec_blocks_wb_analysis_locale_idx" ON "gsec_blocks_wb_analysis" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_analysis_featured_featured_image_idx" ON "gsec_blocks_wb_analysis" USING btree ("featured_image_id");
  CREATE INDEX "gsec_blocks_wb_more_read_stories_order_idx" ON "gsec_blocks_wb_more_read_stories" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_more_read_stories_parent_id_idx" ON "gsec_blocks_wb_more_read_stories" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_more_read_stories_locale_idx" ON "gsec_blocks_wb_more_read_stories" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_more_read_most_read_order_idx" ON "gsec_blocks_wb_more_read_most_read" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_more_read_most_read_parent_id_idx" ON "gsec_blocks_wb_more_read_most_read" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_more_read_most_read_locale_idx" ON "gsec_blocks_wb_more_read_most_read" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_more_read_order_idx" ON "gsec_blocks_wb_more_read" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_more_read_parent_id_idx" ON "gsec_blocks_wb_more_read" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_more_read_path_idx" ON "gsec_blocks_wb_more_read" USING btree ("_path");
  CREATE INDEX "gsec_blocks_wb_more_read_locale_idx" ON "gsec_blocks_wb_more_read" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_sponsors_cards_order_idx" ON "gsec_blocks_wb_sponsors_cards" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_sponsors_cards_parent_id_idx" ON "gsec_blocks_wb_sponsors_cards" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_sponsors_cards_locale_idx" ON "gsec_blocks_wb_sponsors_cards" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_sponsors_order_idx" ON "gsec_blocks_wb_sponsors" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_sponsors_parent_id_idx" ON "gsec_blocks_wb_sponsors" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_sponsors_path_idx" ON "gsec_blocks_wb_sponsors" USING btree ("_path");
  CREATE INDEX "gsec_blocks_wb_sponsors_locale_idx" ON "gsec_blocks_wb_sponsors" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_subscribe_plans_order_idx" ON "gsec_blocks_wb_subscribe_plans" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_subscribe_plans_parent_id_idx" ON "gsec_blocks_wb_subscribe_plans" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_subscribe_plans_locale_idx" ON "gsec_blocks_wb_subscribe_plans" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_subscribe_regions_order_idx" ON "gsec_blocks_wb_subscribe_regions" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_subscribe_regions_parent_id_idx" ON "gsec_blocks_wb_subscribe_regions" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_subscribe_regions_locale_idx" ON "gsec_blocks_wb_subscribe_regions" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_wb_subscribe_order_idx" ON "gsec_blocks_wb_subscribe" USING btree ("_order");
  CREATE INDEX "gsec_blocks_wb_subscribe_parent_id_idx" ON "gsec_blocks_wb_subscribe" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_wb_subscribe_path_idx" ON "gsec_blocks_wb_subscribe" USING btree ("_path");
  CREATE INDEX "gsec_blocks_wb_subscribe_locale_idx" ON "gsec_blocks_wb_subscribe" USING btree ("_locale");
  CREATE INDEX "gsec_texts_order_parent" ON "gsec_texts" USING btree ("order","parent_id");
  CREATE INDEX "gsec_texts_locale_parent" ON "gsec_texts" USING btree ("locale","parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_hero_compact_cards_order_idx" ON "_gsec_v_blocks_wb_hero_compact_cards" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_hero_compact_cards_parent_id_idx" ON "_gsec_v_blocks_wb_hero_compact_cards" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_hero_compact_cards_locale_idx" ON "_gsec_v_blocks_wb_hero_compact_cards" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_hero_today_links_order_idx" ON "_gsec_v_blocks_wb_hero_today_links" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_hero_today_links_parent_id_idx" ON "_gsec_v_blocks_wb_hero_today_links" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_hero_today_links_locale_idx" ON "_gsec_v_blocks_wb_hero_today_links" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_hero_order_idx" ON "_gsec_v_blocks_wb_hero" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_hero_parent_id_idx" ON "_gsec_v_blocks_wb_hero" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_hero_path_idx" ON "_gsec_v_blocks_wb_hero" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_wb_hero_locale_idx" ON "_gsec_v_blocks_wb_hero" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_hero_featured_featured_image_idx" ON "_gsec_v_blocks_wb_hero" USING btree ("featured_image_id");
  CREATE INDEX "_gsec_v_blocks_wb_awards_items_order_idx" ON "_gsec_v_blocks_wb_awards_items" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_awards_items_parent_id_idx" ON "_gsec_v_blocks_wb_awards_items" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_awards_items_locale_idx" ON "_gsec_v_blocks_wb_awards_items" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_awards_order_idx" ON "_gsec_v_blocks_wb_awards" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_awards_parent_id_idx" ON "_gsec_v_blocks_wb_awards" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_awards_path_idx" ON "_gsec_v_blocks_wb_awards" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_wb_awards_locale_idx" ON "_gsec_v_blocks_wb_awards" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_events_events_order_idx" ON "_gsec_v_blocks_wb_events_events" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_events_events_parent_id_idx" ON "_gsec_v_blocks_wb_events_events" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_events_events_locale_idx" ON "_gsec_v_blocks_wb_events_events" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_events_order_idx" ON "_gsec_v_blocks_wb_events" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_events_parent_id_idx" ON "_gsec_v_blocks_wb_events" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_events_path_idx" ON "_gsec_v_blocks_wb_events" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_wb_events_locale_idx" ON "_gsec_v_blocks_wb_events" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_events_featured_featured_image_idx" ON "_gsec_v_blocks_wb_events" USING btree ("featured_image_id");
  CREATE INDEX "_gsec_v_blocks_wb_brands_items_order_idx" ON "_gsec_v_blocks_wb_brands_items" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_brands_items_parent_id_idx" ON "_gsec_v_blocks_wb_brands_items" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_brands_items_locale_idx" ON "_gsec_v_blocks_wb_brands_items" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_brands_order_idx" ON "_gsec_v_blocks_wb_brands" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_brands_parent_id_idx" ON "_gsec_v_blocks_wb_brands" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_brands_path_idx" ON "_gsec_v_blocks_wb_brands" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_wb_brands_locale_idx" ON "_gsec_v_blocks_wb_brands" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_research_items_order_idx" ON "_gsec_v_blocks_wb_research_items" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_research_items_parent_id_idx" ON "_gsec_v_blocks_wb_research_items" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_research_items_locale_idx" ON "_gsec_v_blocks_wb_research_items" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_research_order_idx" ON "_gsec_v_blocks_wb_research" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_research_parent_id_idx" ON "_gsec_v_blocks_wb_research" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_research_path_idx" ON "_gsec_v_blocks_wb_research" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_wb_research_locale_idx" ON "_gsec_v_blocks_wb_research" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_research_featured_featured_image_idx" ON "_gsec_v_blocks_wb_research" USING btree ("featured_image_id");
  CREATE INDEX "_gsec_v_blocks_wb_people_items_order_idx" ON "_gsec_v_blocks_wb_people_items" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_people_items_parent_id_idx" ON "_gsec_v_blocks_wb_people_items" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_people_items_locale_idx" ON "_gsec_v_blocks_wb_people_items" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_people_order_idx" ON "_gsec_v_blocks_wb_people" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_people_parent_id_idx" ON "_gsec_v_blocks_wb_people" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_people_path_idx" ON "_gsec_v_blocks_wb_people" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_wb_people_locale_idx" ON "_gsec_v_blocks_wb_people" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_featured_items_order_idx" ON "_gsec_v_blocks_wb_featured_items" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_featured_items_parent_id_idx" ON "_gsec_v_blocks_wb_featured_items" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_featured_items_locale_idx" ON "_gsec_v_blocks_wb_featured_items" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_featured_items_image_idx" ON "_gsec_v_blocks_wb_featured_items" USING btree ("image_id");
  CREATE INDEX "_gsec_v_blocks_wb_featured_order_idx" ON "_gsec_v_blocks_wb_featured" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_featured_parent_id_idx" ON "_gsec_v_blocks_wb_featured" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_featured_path_idx" ON "_gsec_v_blocks_wb_featured" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_wb_featured_locale_idx" ON "_gsec_v_blocks_wb_featured" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_news_items_order_idx" ON "_gsec_v_blocks_wb_news_items" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_news_items_parent_id_idx" ON "_gsec_v_blocks_wb_news_items" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_news_items_locale_idx" ON "_gsec_v_blocks_wb_news_items" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_news_order_idx" ON "_gsec_v_blocks_wb_news" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_news_parent_id_idx" ON "_gsec_v_blocks_wb_news" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_news_path_idx" ON "_gsec_v_blocks_wb_news" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_wb_news_locale_idx" ON "_gsec_v_blocks_wb_news" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_news_featured_featured_image_idx" ON "_gsec_v_blocks_wb_news" USING btree ("featured_image_id");
  CREATE INDEX "_gsec_v_blocks_wb_analysis_items_order_idx" ON "_gsec_v_blocks_wb_analysis_items" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_analysis_items_parent_id_idx" ON "_gsec_v_blocks_wb_analysis_items" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_analysis_items_locale_idx" ON "_gsec_v_blocks_wb_analysis_items" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_analysis_order_idx" ON "_gsec_v_blocks_wb_analysis" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_analysis_parent_id_idx" ON "_gsec_v_blocks_wb_analysis" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_analysis_path_idx" ON "_gsec_v_blocks_wb_analysis" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_wb_analysis_locale_idx" ON "_gsec_v_blocks_wb_analysis" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_analysis_featured_featured_image_idx" ON "_gsec_v_blocks_wb_analysis" USING btree ("featured_image_id");
  CREATE INDEX "_gsec_v_blocks_wb_more_read_stories_order_idx" ON "_gsec_v_blocks_wb_more_read_stories" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_more_read_stories_parent_id_idx" ON "_gsec_v_blocks_wb_more_read_stories" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_more_read_stories_locale_idx" ON "_gsec_v_blocks_wb_more_read_stories" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_more_read_most_read_order_idx" ON "_gsec_v_blocks_wb_more_read_most_read" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_more_read_most_read_parent_id_idx" ON "_gsec_v_blocks_wb_more_read_most_read" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_more_read_most_read_locale_idx" ON "_gsec_v_blocks_wb_more_read_most_read" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_more_read_order_idx" ON "_gsec_v_blocks_wb_more_read" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_more_read_parent_id_idx" ON "_gsec_v_blocks_wb_more_read" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_more_read_path_idx" ON "_gsec_v_blocks_wb_more_read" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_wb_more_read_locale_idx" ON "_gsec_v_blocks_wb_more_read" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_sponsors_cards_order_idx" ON "_gsec_v_blocks_wb_sponsors_cards" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_sponsors_cards_parent_id_idx" ON "_gsec_v_blocks_wb_sponsors_cards" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_sponsors_cards_locale_idx" ON "_gsec_v_blocks_wb_sponsors_cards" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_sponsors_order_idx" ON "_gsec_v_blocks_wb_sponsors" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_sponsors_parent_id_idx" ON "_gsec_v_blocks_wb_sponsors" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_sponsors_path_idx" ON "_gsec_v_blocks_wb_sponsors" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_wb_sponsors_locale_idx" ON "_gsec_v_blocks_wb_sponsors" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_subscribe_plans_order_idx" ON "_gsec_v_blocks_wb_subscribe_plans" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_subscribe_plans_parent_id_idx" ON "_gsec_v_blocks_wb_subscribe_plans" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_subscribe_plans_locale_idx" ON "_gsec_v_blocks_wb_subscribe_plans" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_subscribe_regions_order_idx" ON "_gsec_v_blocks_wb_subscribe_regions" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_subscribe_regions_parent_id_idx" ON "_gsec_v_blocks_wb_subscribe_regions" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_subscribe_regions_locale_idx" ON "_gsec_v_blocks_wb_subscribe_regions" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_wb_subscribe_order_idx" ON "_gsec_v_blocks_wb_subscribe" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_wb_subscribe_parent_id_idx" ON "_gsec_v_blocks_wb_subscribe" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_wb_subscribe_path_idx" ON "_gsec_v_blocks_wb_subscribe" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_wb_subscribe_locale_idx" ON "_gsec_v_blocks_wb_subscribe" USING btree ("_locale");
  CREATE INDEX "_gsec_v_texts_order_parent" ON "_gsec_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_gsec_v_texts_locale_parent" ON "_gsec_v_texts" USING btree ("locale","parent_id");
  CREATE INDEX "presets_blocks_wb_hero_compact_cards_order_idx" ON "presets_blocks_wb_hero_compact_cards" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_hero_compact_cards_parent_id_idx" ON "presets_blocks_wb_hero_compact_cards" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "presets_blocks_wb_hero_compact_cards_locales_locale_parent_i" ON "presets_blocks_wb_hero_compact_cards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_wb_hero_today_links_order_idx" ON "presets_blocks_wb_hero_today_links" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_hero_today_links_parent_id_idx" ON "presets_blocks_wb_hero_today_links" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_hero_order_idx" ON "presets_blocks_wb_hero" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_hero_parent_id_idx" ON "presets_blocks_wb_hero" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_hero_path_idx" ON "presets_blocks_wb_hero" USING btree ("_path");
  CREATE INDEX "presets_blocks_wb_hero_featured_featured_image_idx" ON "presets_blocks_wb_hero" USING btree ("featured_image_id");
  CREATE UNIQUE INDEX "presets_blocks_wb_hero_locales_locale_parent_id_unique" ON "presets_blocks_wb_hero_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_wb_awards_items_order_idx" ON "presets_blocks_wb_awards_items" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_awards_items_parent_id_idx" ON "presets_blocks_wb_awards_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "presets_blocks_wb_awards_items_locales_locale_parent_id_uniq" ON "presets_blocks_wb_awards_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_wb_awards_order_idx" ON "presets_blocks_wb_awards" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_awards_parent_id_idx" ON "presets_blocks_wb_awards" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_awards_path_idx" ON "presets_blocks_wb_awards" USING btree ("_path");
  CREATE UNIQUE INDEX "presets_blocks_wb_awards_locales_locale_parent_id_unique" ON "presets_blocks_wb_awards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_wb_events_events_order_idx" ON "presets_blocks_wb_events_events" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_events_events_parent_id_idx" ON "presets_blocks_wb_events_events" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "presets_blocks_wb_events_events_locales_locale_parent_id_uni" ON "presets_blocks_wb_events_events_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_wb_events_order_idx" ON "presets_blocks_wb_events" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_events_parent_id_idx" ON "presets_blocks_wb_events" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_events_path_idx" ON "presets_blocks_wb_events" USING btree ("_path");
  CREATE INDEX "presets_blocks_wb_events_featured_featured_image_idx" ON "presets_blocks_wb_events" USING btree ("featured_image_id");
  CREATE UNIQUE INDEX "presets_blocks_wb_events_locales_locale_parent_id_unique" ON "presets_blocks_wb_events_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_wb_brands_items_order_idx" ON "presets_blocks_wb_brands_items" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_brands_items_parent_id_idx" ON "presets_blocks_wb_brands_items" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_brands_order_idx" ON "presets_blocks_wb_brands" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_brands_parent_id_idx" ON "presets_blocks_wb_brands" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_brands_path_idx" ON "presets_blocks_wb_brands" USING btree ("_path");
  CREATE INDEX "presets_blocks_wb_research_items_order_idx" ON "presets_blocks_wb_research_items" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_research_items_parent_id_idx" ON "presets_blocks_wb_research_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "presets_blocks_wb_research_items_locales_locale_parent_id_un" ON "presets_blocks_wb_research_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_wb_research_order_idx" ON "presets_blocks_wb_research" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_research_parent_id_idx" ON "presets_blocks_wb_research" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_research_path_idx" ON "presets_blocks_wb_research" USING btree ("_path");
  CREATE INDEX "presets_blocks_wb_research_featured_featured_image_idx" ON "presets_blocks_wb_research" USING btree ("featured_image_id");
  CREATE UNIQUE INDEX "presets_blocks_wb_research_locales_locale_parent_id_unique" ON "presets_blocks_wb_research_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_wb_people_items_order_idx" ON "presets_blocks_wb_people_items" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_people_items_parent_id_idx" ON "presets_blocks_wb_people_items" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_people_order_idx" ON "presets_blocks_wb_people" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_people_parent_id_idx" ON "presets_blocks_wb_people" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_people_path_idx" ON "presets_blocks_wb_people" USING btree ("_path");
  CREATE UNIQUE INDEX "presets_blocks_wb_people_locales_locale_parent_id_unique" ON "presets_blocks_wb_people_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_wb_featured_items_order_idx" ON "presets_blocks_wb_featured_items" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_featured_items_parent_id_idx" ON "presets_blocks_wb_featured_items" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_featured_items_image_idx" ON "presets_blocks_wb_featured_items" USING btree ("image_id");
  CREATE INDEX "presets_blocks_wb_featured_order_idx" ON "presets_blocks_wb_featured" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_featured_parent_id_idx" ON "presets_blocks_wb_featured" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_featured_path_idx" ON "presets_blocks_wb_featured" USING btree ("_path");
  CREATE UNIQUE INDEX "presets_blocks_wb_featured_locales_locale_parent_id_unique" ON "presets_blocks_wb_featured_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_wb_news_items_order_idx" ON "presets_blocks_wb_news_items" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_news_items_parent_id_idx" ON "presets_blocks_wb_news_items" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_news_order_idx" ON "presets_blocks_wb_news" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_news_parent_id_idx" ON "presets_blocks_wb_news" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_news_path_idx" ON "presets_blocks_wb_news" USING btree ("_path");
  CREATE INDEX "presets_blocks_wb_news_featured_featured_image_idx" ON "presets_blocks_wb_news" USING btree ("featured_image_id");
  CREATE UNIQUE INDEX "presets_blocks_wb_news_locales_locale_parent_id_unique" ON "presets_blocks_wb_news_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_wb_analysis_items_order_idx" ON "presets_blocks_wb_analysis_items" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_analysis_items_parent_id_idx" ON "presets_blocks_wb_analysis_items" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_analysis_order_idx" ON "presets_blocks_wb_analysis" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_analysis_parent_id_idx" ON "presets_blocks_wb_analysis" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_analysis_path_idx" ON "presets_blocks_wb_analysis" USING btree ("_path");
  CREATE INDEX "presets_blocks_wb_analysis_featured_featured_image_idx" ON "presets_blocks_wb_analysis" USING btree ("featured_image_id");
  CREATE UNIQUE INDEX "presets_blocks_wb_analysis_locales_locale_parent_id_unique" ON "presets_blocks_wb_analysis_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_wb_more_read_stories_order_idx" ON "presets_blocks_wb_more_read_stories" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_more_read_stories_parent_id_idx" ON "presets_blocks_wb_more_read_stories" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_more_read_most_read_order_idx" ON "presets_blocks_wb_more_read_most_read" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_more_read_most_read_parent_id_idx" ON "presets_blocks_wb_more_read_most_read" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_more_read_order_idx" ON "presets_blocks_wb_more_read" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_more_read_parent_id_idx" ON "presets_blocks_wb_more_read" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_more_read_path_idx" ON "presets_blocks_wb_more_read" USING btree ("_path");
  CREATE INDEX "presets_blocks_wb_sponsors_cards_order_idx" ON "presets_blocks_wb_sponsors_cards" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_sponsors_cards_parent_id_idx" ON "presets_blocks_wb_sponsors_cards" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "presets_blocks_wb_sponsors_cards_locales_locale_parent_id_un" ON "presets_blocks_wb_sponsors_cards_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_wb_sponsors_order_idx" ON "presets_blocks_wb_sponsors" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_sponsors_parent_id_idx" ON "presets_blocks_wb_sponsors" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_sponsors_path_idx" ON "presets_blocks_wb_sponsors" USING btree ("_path");
  CREATE UNIQUE INDEX "presets_blocks_wb_sponsors_locales_locale_parent_id_unique" ON "presets_blocks_wb_sponsors_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_wb_subscribe_plans_order_idx" ON "presets_blocks_wb_subscribe_plans" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_subscribe_plans_parent_id_idx" ON "presets_blocks_wb_subscribe_plans" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_subscribe_regions_order_idx" ON "presets_blocks_wb_subscribe_regions" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_subscribe_regions_parent_id_idx" ON "presets_blocks_wb_subscribe_regions" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_subscribe_order_idx" ON "presets_blocks_wb_subscribe" USING btree ("_order");
  CREATE INDEX "presets_blocks_wb_subscribe_parent_id_idx" ON "presets_blocks_wb_subscribe" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_wb_subscribe_path_idx" ON "presets_blocks_wb_subscribe" USING btree ("_path");
  CREATE UNIQUE INDEX "presets_blocks_wb_subscribe_locales_locale_parent_id_unique" ON "presets_blocks_wb_subscribe_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_texts_order_parent" ON "presets_texts" USING btree ("order","parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "page_blocks_wb_hero_compact_cards" CASCADE;
  DROP TABLE "page_blocks_wb_hero_today_links" CASCADE;
  DROP TABLE "page_blocks_wb_hero" CASCADE;
  DROP TABLE "page_blocks_wb_awards_items" CASCADE;
  DROP TABLE "page_blocks_wb_awards" CASCADE;
  DROP TABLE "page_blocks_wb_events_events" CASCADE;
  DROP TABLE "page_blocks_wb_events" CASCADE;
  DROP TABLE "page_blocks_wb_brands_items" CASCADE;
  DROP TABLE "page_blocks_wb_brands" CASCADE;
  DROP TABLE "page_blocks_wb_research_items" CASCADE;
  DROP TABLE "page_blocks_wb_research" CASCADE;
  DROP TABLE "page_blocks_wb_people_items" CASCADE;
  DROP TABLE "page_blocks_wb_people" CASCADE;
  DROP TABLE "page_blocks_wb_featured_items" CASCADE;
  DROP TABLE "page_blocks_wb_featured" CASCADE;
  DROP TABLE "page_blocks_wb_news_items" CASCADE;
  DROP TABLE "page_blocks_wb_news" CASCADE;
  DROP TABLE "page_blocks_wb_analysis_items" CASCADE;
  DROP TABLE "page_blocks_wb_analysis" CASCADE;
  DROP TABLE "page_blocks_wb_more_read_stories" CASCADE;
  DROP TABLE "page_blocks_wb_more_read_most_read" CASCADE;
  DROP TABLE "page_blocks_wb_more_read" CASCADE;
  DROP TABLE "page_blocks_wb_sponsors_cards" CASCADE;
  DROP TABLE "page_blocks_wb_sponsors" CASCADE;
  DROP TABLE "page_blocks_wb_subscribe_plans" CASCADE;
  DROP TABLE "page_blocks_wb_subscribe_regions" CASCADE;
  DROP TABLE "page_blocks_wb_subscribe" CASCADE;
  DROP TABLE "page_texts" CASCADE;
  DROP TABLE "_page_v_blocks_wb_hero_compact_cards" CASCADE;
  DROP TABLE "_page_v_blocks_wb_hero_today_links" CASCADE;
  DROP TABLE "_page_v_blocks_wb_hero" CASCADE;
  DROP TABLE "_page_v_blocks_wb_awards_items" CASCADE;
  DROP TABLE "_page_v_blocks_wb_awards" CASCADE;
  DROP TABLE "_page_v_blocks_wb_events_events" CASCADE;
  DROP TABLE "_page_v_blocks_wb_events" CASCADE;
  DROP TABLE "_page_v_blocks_wb_brands_items" CASCADE;
  DROP TABLE "_page_v_blocks_wb_brands" CASCADE;
  DROP TABLE "_page_v_blocks_wb_research_items" CASCADE;
  DROP TABLE "_page_v_blocks_wb_research" CASCADE;
  DROP TABLE "_page_v_blocks_wb_people_items" CASCADE;
  DROP TABLE "_page_v_blocks_wb_people" CASCADE;
  DROP TABLE "_page_v_blocks_wb_featured_items" CASCADE;
  DROP TABLE "_page_v_blocks_wb_featured" CASCADE;
  DROP TABLE "_page_v_blocks_wb_news_items" CASCADE;
  DROP TABLE "_page_v_blocks_wb_news" CASCADE;
  DROP TABLE "_page_v_blocks_wb_analysis_items" CASCADE;
  DROP TABLE "_page_v_blocks_wb_analysis" CASCADE;
  DROP TABLE "_page_v_blocks_wb_more_read_stories" CASCADE;
  DROP TABLE "_page_v_blocks_wb_more_read_most_read" CASCADE;
  DROP TABLE "_page_v_blocks_wb_more_read" CASCADE;
  DROP TABLE "_page_v_blocks_wb_sponsors_cards" CASCADE;
  DROP TABLE "_page_v_blocks_wb_sponsors" CASCADE;
  DROP TABLE "_page_v_blocks_wb_subscribe_plans" CASCADE;
  DROP TABLE "_page_v_blocks_wb_subscribe_regions" CASCADE;
  DROP TABLE "_page_v_blocks_wb_subscribe" CASCADE;
  DROP TABLE "_page_v_texts" CASCADE;
  DROP TABLE "gsec_blocks_wb_hero_compact_cards" CASCADE;
  DROP TABLE "gsec_blocks_wb_hero_today_links" CASCADE;
  DROP TABLE "gsec_blocks_wb_hero" CASCADE;
  DROP TABLE "gsec_blocks_wb_awards_items" CASCADE;
  DROP TABLE "gsec_blocks_wb_awards" CASCADE;
  DROP TABLE "gsec_blocks_wb_events_events" CASCADE;
  DROP TABLE "gsec_blocks_wb_events" CASCADE;
  DROP TABLE "gsec_blocks_wb_brands_items" CASCADE;
  DROP TABLE "gsec_blocks_wb_brands" CASCADE;
  DROP TABLE "gsec_blocks_wb_research_items" CASCADE;
  DROP TABLE "gsec_blocks_wb_research" CASCADE;
  DROP TABLE "gsec_blocks_wb_people_items" CASCADE;
  DROP TABLE "gsec_blocks_wb_people" CASCADE;
  DROP TABLE "gsec_blocks_wb_featured_items" CASCADE;
  DROP TABLE "gsec_blocks_wb_featured" CASCADE;
  DROP TABLE "gsec_blocks_wb_news_items" CASCADE;
  DROP TABLE "gsec_blocks_wb_news" CASCADE;
  DROP TABLE "gsec_blocks_wb_analysis_items" CASCADE;
  DROP TABLE "gsec_blocks_wb_analysis" CASCADE;
  DROP TABLE "gsec_blocks_wb_more_read_stories" CASCADE;
  DROP TABLE "gsec_blocks_wb_more_read_most_read" CASCADE;
  DROP TABLE "gsec_blocks_wb_more_read" CASCADE;
  DROP TABLE "gsec_blocks_wb_sponsors_cards" CASCADE;
  DROP TABLE "gsec_blocks_wb_sponsors" CASCADE;
  DROP TABLE "gsec_blocks_wb_subscribe_plans" CASCADE;
  DROP TABLE "gsec_blocks_wb_subscribe_regions" CASCADE;
  DROP TABLE "gsec_blocks_wb_subscribe" CASCADE;
  DROP TABLE "gsec_texts" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_hero_compact_cards" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_hero_today_links" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_hero" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_awards_items" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_awards" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_events_events" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_events" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_brands_items" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_brands" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_research_items" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_research" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_people_items" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_people" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_featured_items" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_featured" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_news_items" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_news" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_analysis_items" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_analysis" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_more_read_stories" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_more_read_most_read" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_more_read" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_sponsors_cards" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_sponsors" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_subscribe_plans" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_subscribe_regions" CASCADE;
  DROP TABLE "_gsec_v_blocks_wb_subscribe" CASCADE;
  DROP TABLE "_gsec_v_texts" CASCADE;
  DROP TABLE "presets_blocks_wb_hero_compact_cards" CASCADE;
  DROP TABLE "presets_blocks_wb_hero_compact_cards_locales" CASCADE;
  DROP TABLE "presets_blocks_wb_hero_today_links" CASCADE;
  DROP TABLE "presets_blocks_wb_hero" CASCADE;
  DROP TABLE "presets_blocks_wb_hero_locales" CASCADE;
  DROP TABLE "presets_blocks_wb_awards_items" CASCADE;
  DROP TABLE "presets_blocks_wb_awards_items_locales" CASCADE;
  DROP TABLE "presets_blocks_wb_awards" CASCADE;
  DROP TABLE "presets_blocks_wb_awards_locales" CASCADE;
  DROP TABLE "presets_blocks_wb_events_events" CASCADE;
  DROP TABLE "presets_blocks_wb_events_events_locales" CASCADE;
  DROP TABLE "presets_blocks_wb_events" CASCADE;
  DROP TABLE "presets_blocks_wb_events_locales" CASCADE;
  DROP TABLE "presets_blocks_wb_brands_items" CASCADE;
  DROP TABLE "presets_blocks_wb_brands" CASCADE;
  DROP TABLE "presets_blocks_wb_research_items" CASCADE;
  DROP TABLE "presets_blocks_wb_research_items_locales" CASCADE;
  DROP TABLE "presets_blocks_wb_research" CASCADE;
  DROP TABLE "presets_blocks_wb_research_locales" CASCADE;
  DROP TABLE "presets_blocks_wb_people_items" CASCADE;
  DROP TABLE "presets_blocks_wb_people" CASCADE;
  DROP TABLE "presets_blocks_wb_people_locales" CASCADE;
  DROP TABLE "presets_blocks_wb_featured_items" CASCADE;
  DROP TABLE "presets_blocks_wb_featured" CASCADE;
  DROP TABLE "presets_blocks_wb_featured_locales" CASCADE;
  DROP TABLE "presets_blocks_wb_news_items" CASCADE;
  DROP TABLE "presets_blocks_wb_news" CASCADE;
  DROP TABLE "presets_blocks_wb_news_locales" CASCADE;
  DROP TABLE "presets_blocks_wb_analysis_items" CASCADE;
  DROP TABLE "presets_blocks_wb_analysis" CASCADE;
  DROP TABLE "presets_blocks_wb_analysis_locales" CASCADE;
  DROP TABLE "presets_blocks_wb_more_read_stories" CASCADE;
  DROP TABLE "presets_blocks_wb_more_read_most_read" CASCADE;
  DROP TABLE "presets_blocks_wb_more_read" CASCADE;
  DROP TABLE "presets_blocks_wb_sponsors_cards" CASCADE;
  DROP TABLE "presets_blocks_wb_sponsors_cards_locales" CASCADE;
  DROP TABLE "presets_blocks_wb_sponsors" CASCADE;
  DROP TABLE "presets_blocks_wb_sponsors_locales" CASCADE;
  DROP TABLE "presets_blocks_wb_subscribe_plans" CASCADE;
  DROP TABLE "presets_blocks_wb_subscribe_regions" CASCADE;
  DROP TABLE "presets_blocks_wb_subscribe" CASCADE;
  DROP TABLE "presets_blocks_wb_subscribe_locales" CASCADE;
  DROP TABLE "presets_texts" CASCADE;
  DROP TYPE "public"."enum_page_blocks_wb_hero_compact_cards_link_type";
  DROP TYPE "public"."enum_page_blocks_wb_hero_compact_cards_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_hero_today_links_link_type";
  DROP TYPE "public"."enum_page_blocks_wb_hero_today_links_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_hero_featured_link_type";
  DROP TYPE "public"."enum_page_blocks_wb_hero_featured_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_awards_items_link_type";
  DROP TYPE "public"."enum_page_blocks_wb_awards_items_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_awards_cta_type";
  DROP TYPE "public"."enum_page_blocks_wb_awards_cta_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_events_events_link_type";
  DROP TYPE "public"."enum_page_blocks_wb_events_events_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_events_cta_type";
  DROP TYPE "public"."enum_page_blocks_wb_events_cta_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_events_featured_link_type";
  DROP TYPE "public"."enum_page_blocks_wb_events_featured_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_brands_items_link_type";
  DROP TYPE "public"."enum_page_blocks_wb_brands_items_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_research_items_link_type";
  DROP TYPE "public"."enum_page_blocks_wb_research_items_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_research_cta_type";
  DROP TYPE "public"."enum_page_blocks_wb_research_cta_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_research_featured_link_type";
  DROP TYPE "public"."enum_page_blocks_wb_research_featured_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_people_items_link_type";
  DROP TYPE "public"."enum_page_blocks_wb_people_items_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_people_cta_type";
  DROP TYPE "public"."enum_page_blocks_wb_people_cta_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_featured_items_link_type";
  DROP TYPE "public"."enum_page_blocks_wb_featured_items_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_featured_cta_type";
  DROP TYPE "public"."enum_page_blocks_wb_featured_cta_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_news_items_link_type";
  DROP TYPE "public"."enum_page_blocks_wb_news_items_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_news_cta_type";
  DROP TYPE "public"."enum_page_blocks_wb_news_cta_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_news_featured_link_type";
  DROP TYPE "public"."enum_page_blocks_wb_news_featured_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_analysis_items_link_type";
  DROP TYPE "public"."enum_page_blocks_wb_analysis_items_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_analysis_cta_type";
  DROP TYPE "public"."enum_page_blocks_wb_analysis_cta_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_analysis_featured_link_type";
  DROP TYPE "public"."enum_page_blocks_wb_analysis_featured_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_more_read_stories_link_type";
  DROP TYPE "public"."enum_page_blocks_wb_more_read_stories_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_more_read_most_read_link_type";
  DROP TYPE "public"."enum_page_blocks_wb_more_read_most_read_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_sponsors_cards_link_type";
  DROP TYPE "public"."enum_page_blocks_wb_sponsors_cards_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_sponsors_primary_cta_type";
  DROP TYPE "public"."enum_page_blocks_wb_sponsors_primary_cta_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_sponsors_secondary_cta_type";
  DROP TYPE "public"."enum_page_blocks_wb_sponsors_secondary_cta_custom_page";
  DROP TYPE "public"."enum_page_blocks_wb_subscribe_plans_tag_tone";
  DROP TYPE "public"."enum_page_blocks_wb_subscribe_privacy_link_type";
  DROP TYPE "public"."enum_page_blocks_wb_subscribe_privacy_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_hero_compact_cards_link_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_hero_compact_cards_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_hero_today_links_link_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_hero_today_links_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_hero_featured_link_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_hero_featured_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_awards_items_link_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_awards_items_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_awards_cta_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_awards_cta_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_events_events_link_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_events_events_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_events_cta_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_events_cta_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_events_featured_link_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_events_featured_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_brands_items_link_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_brands_items_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_research_items_link_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_research_items_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_research_cta_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_research_cta_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_research_featured_link_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_research_featured_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_people_items_link_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_people_items_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_people_cta_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_people_cta_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_featured_items_link_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_featured_items_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_featured_cta_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_featured_cta_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_news_items_link_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_news_items_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_news_cta_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_news_cta_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_news_featured_link_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_news_featured_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_analysis_items_link_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_analysis_items_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_analysis_cta_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_analysis_cta_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_analysis_featured_link_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_analysis_featured_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_more_read_stories_link_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_more_read_stories_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_more_read_most_read_link_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_more_read_most_read_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_sponsors_cards_link_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_sponsors_cards_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_sponsors_primary_cta_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_sponsors_primary_cta_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_sponsors_secondary_cta_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_sponsors_secondary_cta_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_wb_subscribe_plans_tag_tone";
  DROP TYPE "public"."enum__page_v_blocks_wb_subscribe_privacy_link_type";
  DROP TYPE "public"."enum__page_v_blocks_wb_subscribe_privacy_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_hero_compact_cards_link_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_hero_compact_cards_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_hero_today_links_link_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_hero_today_links_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_hero_featured_link_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_hero_featured_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_awards_items_link_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_awards_items_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_awards_cta_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_awards_cta_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_events_events_link_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_events_events_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_events_cta_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_events_cta_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_events_featured_link_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_events_featured_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_brands_items_link_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_brands_items_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_research_items_link_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_research_items_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_research_cta_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_research_cta_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_research_featured_link_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_research_featured_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_people_items_link_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_people_items_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_people_cta_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_people_cta_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_featured_items_link_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_featured_items_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_featured_cta_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_featured_cta_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_news_items_link_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_news_items_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_news_cta_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_news_cta_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_news_featured_link_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_news_featured_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_analysis_items_link_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_analysis_items_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_analysis_cta_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_analysis_cta_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_analysis_featured_link_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_analysis_featured_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_more_read_stories_link_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_more_read_stories_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_more_read_most_read_link_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_more_read_most_read_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_sponsors_cards_link_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_sponsors_cards_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_sponsors_primary_cta_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_sponsors_primary_cta_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_sponsors_secondary_cta_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_sponsors_secondary_cta_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_wb_subscribe_plans_tag_tone";
  DROP TYPE "public"."enum_gsec_blocks_wb_subscribe_privacy_link_type";
  DROP TYPE "public"."enum_gsec_blocks_wb_subscribe_privacy_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_hero_compact_cards_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_hero_compact_cards_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_hero_today_links_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_hero_today_links_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_hero_featured_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_hero_featured_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_awards_items_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_awards_items_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_awards_cta_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_awards_cta_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_events_events_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_events_events_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_events_cta_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_events_cta_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_events_featured_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_events_featured_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_brands_items_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_brands_items_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_research_items_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_research_items_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_research_cta_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_research_cta_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_research_featured_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_research_featured_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_people_items_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_people_items_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_people_cta_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_people_cta_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_featured_items_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_featured_items_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_featured_cta_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_featured_cta_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_news_items_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_news_items_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_news_cta_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_news_cta_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_news_featured_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_news_featured_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_analysis_items_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_analysis_items_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_analysis_cta_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_analysis_cta_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_analysis_featured_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_analysis_featured_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_more_read_stories_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_more_read_stories_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_more_read_most_read_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_more_read_most_read_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_sponsors_cards_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_sponsors_cards_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_sponsors_primary_cta_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_sponsors_primary_cta_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_sponsors_secondary_cta_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_sponsors_secondary_cta_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_subscribe_plans_tag_tone";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_subscribe_privacy_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_wb_subscribe_privacy_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_hero_compact_cards_link_type";
  DROP TYPE "public"."enum_presets_blocks_wb_hero_compact_cards_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_hero_today_links_link_type";
  DROP TYPE "public"."enum_presets_blocks_wb_hero_today_links_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_hero_featured_link_type";
  DROP TYPE "public"."enum_presets_blocks_wb_hero_featured_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_awards_items_link_type";
  DROP TYPE "public"."enum_presets_blocks_wb_awards_items_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_awards_cta_type";
  DROP TYPE "public"."enum_presets_blocks_wb_awards_cta_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_events_events_link_type";
  DROP TYPE "public"."enum_presets_blocks_wb_events_events_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_events_cta_type";
  DROP TYPE "public"."enum_presets_blocks_wb_events_cta_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_events_featured_link_type";
  DROP TYPE "public"."enum_presets_blocks_wb_events_featured_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_brands_items_link_type";
  DROP TYPE "public"."enum_presets_blocks_wb_brands_items_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_research_items_link_type";
  DROP TYPE "public"."enum_presets_blocks_wb_research_items_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_research_cta_type";
  DROP TYPE "public"."enum_presets_blocks_wb_research_cta_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_research_featured_link_type";
  DROP TYPE "public"."enum_presets_blocks_wb_research_featured_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_people_items_link_type";
  DROP TYPE "public"."enum_presets_blocks_wb_people_items_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_people_cta_type";
  DROP TYPE "public"."enum_presets_blocks_wb_people_cta_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_featured_items_link_type";
  DROP TYPE "public"."enum_presets_blocks_wb_featured_items_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_featured_cta_type";
  DROP TYPE "public"."enum_presets_blocks_wb_featured_cta_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_news_items_link_type";
  DROP TYPE "public"."enum_presets_blocks_wb_news_items_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_news_cta_type";
  DROP TYPE "public"."enum_presets_blocks_wb_news_cta_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_news_featured_link_type";
  DROP TYPE "public"."enum_presets_blocks_wb_news_featured_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_analysis_items_link_type";
  DROP TYPE "public"."enum_presets_blocks_wb_analysis_items_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_analysis_cta_type";
  DROP TYPE "public"."enum_presets_blocks_wb_analysis_cta_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_analysis_featured_link_type";
  DROP TYPE "public"."enum_presets_blocks_wb_analysis_featured_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_more_read_stories_link_type";
  DROP TYPE "public"."enum_presets_blocks_wb_more_read_stories_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_more_read_most_read_link_type";
  DROP TYPE "public"."enum_presets_blocks_wb_more_read_most_read_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_sponsors_cards_link_type";
  DROP TYPE "public"."enum_presets_blocks_wb_sponsors_cards_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_sponsors_primary_cta_type";
  DROP TYPE "public"."enum_presets_blocks_wb_sponsors_primary_cta_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_sponsors_secondary_cta_type";
  DROP TYPE "public"."enum_presets_blocks_wb_sponsors_secondary_cta_custom_page";
  DROP TYPE "public"."enum_presets_blocks_wb_subscribe_plans_tag_tone";
  DROP TYPE "public"."enum_presets_blocks_wb_subscribe_privacy_link_type";
  DROP TYPE "public"."enum_presets_blocks_wb_subscribe_privacy_link_custom_page";`)
}
