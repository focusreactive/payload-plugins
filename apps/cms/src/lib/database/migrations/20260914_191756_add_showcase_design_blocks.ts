import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_hero_spotlight_cta_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_hero_spotlight_cta_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_hero_spotlight_background_focal_point" AS ENUM('top', 'upper-middle', 'centre', 'lower-middle', 'bottom');
  CREATE TYPE "public"."enum_page_blocks_hero_spotlight_featured_card_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."hero_spotlight_card_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_hero_spotlight_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_hero_spotlight_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_hero_spotlight_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_hero_spotlight_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_course_rail_topics_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_course_rail_topics_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_course_rail_courses_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_course_rail_courses_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_course_rail_all_topics_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_course_rail_all_topics_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_course_rail_view_all_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_course_rail_view_all_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_course_rail_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_course_rail_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_course_rail_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_course_rail_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_membership_tiers_tiers_emphasis" AS ENUM('standard', 'featured');
  CREATE TYPE "public"."enum_page_blocks_membership_tiers_tiers_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_membership_tiers_tiers_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_membership_tiers_billing_default_period" AS ENUM('monthly', 'annual');
  CREATE TYPE "public"."enum_page_blocks_membership_tiers_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_membership_tiers_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_membership_tiers_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_membership_tiers_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_portrait_feature_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_page_blocks_portrait_feature_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_page_blocks_portrait_feature_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_portrait_feature_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_portrait_feature_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_portrait_feature_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_book_offer_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_page_blocks_book_offer_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_page_blocks_book_offer_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_page_blocks_book_offer_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_hero_spotlight_cta_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_hero_spotlight_cta_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_hero_spotlight_background_focal_point" AS ENUM('top', 'upper-middle', 'centre', 'lower-middle', 'bottom');
  CREATE TYPE "public"."enum__page_v_blocks_hero_spotlight_featured_card_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_hero_spotlight_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_hero_spotlight_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_hero_spotlight_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_hero_spotlight_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_course_rail_topics_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_course_rail_topics_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_course_rail_courses_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_course_rail_courses_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_course_rail_all_topics_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_course_rail_all_topics_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_course_rail_view_all_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_course_rail_view_all_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_course_rail_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_course_rail_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_course_rail_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_course_rail_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_membership_tiers_tiers_emphasis" AS ENUM('standard', 'featured');
  CREATE TYPE "public"."enum__page_v_blocks_membership_tiers_tiers_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_membership_tiers_tiers_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_membership_tiers_billing_default_period" AS ENUM('monthly', 'annual');
  CREATE TYPE "public"."enum__page_v_blocks_membership_tiers_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_membership_tiers_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_membership_tiers_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_membership_tiers_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_portrait_feature_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__page_v_blocks_portrait_feature_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__page_v_blocks_portrait_feature_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_portrait_feature_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_portrait_feature_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_portrait_feature_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_book_offer_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__page_v_blocks_book_offer_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__page_v_blocks_book_offer_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_book_offer_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_hero_spotlight_cta_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_hero_spotlight_cta_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_hero_spotlight_background_focal_point" AS ENUM('top', 'upper-middle', 'centre', 'lower-middle', 'bottom');
  CREATE TYPE "public"."enum_gsec_blocks_hero_spotlight_featured_card_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_hero_spotlight_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_hero_spotlight_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_hero_spotlight_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_hero_spotlight_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_course_rail_topics_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_course_rail_topics_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_course_rail_courses_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_course_rail_courses_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_course_rail_all_topics_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_course_rail_all_topics_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_course_rail_view_all_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_course_rail_view_all_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_course_rail_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_course_rail_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_course_rail_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_course_rail_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_membership_tiers_tiers_emphasis" AS ENUM('standard', 'featured');
  CREATE TYPE "public"."enum_gsec_blocks_membership_tiers_tiers_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_membership_tiers_tiers_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_membership_tiers_billing_default_period" AS ENUM('monthly', 'annual');
  CREATE TYPE "public"."enum_gsec_blocks_membership_tiers_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_membership_tiers_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_membership_tiers_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_membership_tiers_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_portrait_feature_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_gsec_blocks_portrait_feature_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_gsec_blocks_portrait_feature_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_portrait_feature_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_portrait_feature_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_portrait_feature_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_book_offer_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_gsec_blocks_book_offer_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_gsec_blocks_book_offer_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_gsec_blocks_book_offer_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_spotlight_cta_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_spotlight_cta_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_spotlight_background_focal_point" AS ENUM('top', 'upper-middle', 'centre', 'lower-middle', 'bottom');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_spotlight_featured_card_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_spotlight_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_spotlight_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_spotlight_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_hero_spotlight_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_course_rail_topics_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_course_rail_topics_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_course_rail_courses_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_course_rail_courses_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_course_rail_all_topics_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_course_rail_all_topics_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_course_rail_view_all_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_course_rail_view_all_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_course_rail_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_course_rail_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_course_rail_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_course_rail_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_membership_tiers_tiers_emphasis" AS ENUM('standard', 'featured');
  CREATE TYPE "public"."enum__gsec_v_blocks_membership_tiers_tiers_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_membership_tiers_tiers_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_membership_tiers_billing_default_period" AS ENUM('monthly', 'annual');
  CREATE TYPE "public"."enum__gsec_v_blocks_membership_tiers_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_membership_tiers_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_membership_tiers_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_membership_tiers_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_portrait_feature_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum__gsec_v_blocks_portrait_feature_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum__gsec_v_blocks_portrait_feature_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_portrait_feature_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_portrait_feature_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_portrait_feature_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_book_offer_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum__gsec_v_blocks_book_offer_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum__gsec_v_blocks_book_offer_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum__gsec_v_blocks_book_offer_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_hero_spotlight_cta_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_hero_spotlight_cta_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_hero_spotlight_background_focal_point" AS ENUM('top', 'upper-middle', 'centre', 'lower-middle', 'bottom');
  CREATE TYPE "public"."enum_presets_blocks_hero_spotlight_featured_card_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_hero_spotlight_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_hero_spotlight_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_hero_spotlight_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_hero_spotlight_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_course_rail_topics_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_course_rail_topics_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_course_rail_courses_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_course_rail_courses_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_course_rail_all_topics_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_course_rail_all_topics_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_course_rail_view_all_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_course_rail_view_all_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_course_rail_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_course_rail_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_course_rail_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_course_rail_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_membership_tiers_tiers_emphasis" AS ENUM('standard', 'featured');
  CREATE TYPE "public"."enum_presets_blocks_membership_tiers_tiers_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_membership_tiers_tiers_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_membership_tiers_billing_default_period" AS ENUM('monthly', 'annual');
  CREATE TYPE "public"."enum_presets_blocks_membership_tiers_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_membership_tiers_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_membership_tiers_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_membership_tiers_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_portrait_feature_link_type" AS ENUM('reference', 'custom', 'customPage');
  CREATE TYPE "public"."enum_presets_blocks_portrait_feature_link_custom_page" AS ENUM('blog', 'search');
  CREATE TYPE "public"."enum_presets_blocks_portrait_feature_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_portrait_feature_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_portrait_feature_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_portrait_feature_section_padding_x" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_book_offer_section_theme" AS ENUM('light', 'dark', 'light-gray', 'dark-gray');
  CREATE TYPE "public"."enum_presets_blocks_book_offer_section_max_width" AS ENUM('none', 'base');
  CREATE TYPE "public"."enum_presets_blocks_book_offer_section_padding_y" AS ENUM('none', 'base', 'large');
  CREATE TYPE "public"."enum_presets_blocks_book_offer_section_padding_x" AS ENUM('none', 'base');
  CREATE TABLE "page_blocks_hero_spotlight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro_text" varchar,
  	"cta_link_type" "enum_page_blocks_hero_spotlight_cta_link_type" DEFAULT 'reference',
  	"cta_link_new_tab" boolean,
  	"cta_link_url" varchar,
  	"cta_link_custom_page" "enum_page_blocks_hero_spotlight_cta_link_custom_page",
  	"cta_link_label" varchar,
  	"background_image_image_id" integer,
  	"background_focal_point" "enum_page_blocks_hero_spotlight_background_focal_point" DEFAULT 'upper-middle',
  	"photo_darkening" numeric DEFAULT 0,
  	"show_featured_card" boolean DEFAULT true,
  	"featured_card_label" varchar,
  	"featured_card_image_image_id" integer,
  	"featured_card_title" varchar,
  	"featured_card_rating" varchar DEFAULT '4.9',
  	"featured_card_date" timestamp(3) with time zone DEFAULT '2026-08-24T00:00:00.000Z',
  	"featured_card_price" varchar,
  	"featured_card_compare_at_price" varchar,
  	"featured_card_link_type" "enum_page_blocks_hero_spotlight_featured_card_link_type" DEFAULT 'reference',
  	"featured_card_link_new_tab" boolean,
  	"featured_card_link_url" varchar,
  	"featured_card_link_custom_page" "hero_spotlight_card_link_custom_page",
  	"section_theme" "enum_page_blocks_hero_spotlight_section_theme",
  	"section_max_width" "enum_page_blocks_hero_spotlight_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_hero_spotlight_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_hero_spotlight_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_course_rail_topics" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"link_type" "enum_page_blocks_course_rail_topics_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_page_blocks_course_rail_topics_link_custom_page",
  	"is_selected" boolean
  );
  
  CREATE TABLE "page_blocks_course_rail_courses" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_image_id" integer,
  	"title" varchar,
  	"description" varchar,
  	"rating" numeric,
  	"date_label" varchar,
  	"price" varchar,
  	"price_before" varchar,
  	"link_type" "enum_page_blocks_course_rail_courses_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_page_blocks_course_rail_courses_link_custom_page"
  );
  
  CREATE TABLE "page_blocks_course_rail" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"all_topics_label" varchar,
  	"all_topics_link_type" "enum_page_blocks_course_rail_all_topics_link_type" DEFAULT 'reference',
  	"all_topics_link_new_tab" boolean,
  	"all_topics_link_url" varchar,
  	"all_topics_link_custom_page" "enum_page_blocks_course_rail_all_topics_link_custom_page",
  	"view_all_label" varchar,
  	"view_all_link_type" "enum_page_blocks_course_rail_view_all_link_type" DEFAULT 'reference',
  	"view_all_link_new_tab" boolean,
  	"view_all_link_url" varchar,
  	"view_all_link_custom_page" "enum_page_blocks_course_rail_view_all_link_custom_page",
  	"section_theme" "enum_page_blocks_course_rail_section_theme",
  	"section_max_width" "enum_page_blocks_course_rail_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_course_rail_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_course_rail_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_membership_tiers_tiers_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "page_blocks_membership_tiers_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"emphasis" "enum_page_blocks_membership_tiers_tiers_emphasis" DEFAULT 'standard',
  	"tagline" varchar,
  	"badge" varchar,
  	"price_monthly" varchar,
  	"price_annual" varchar,
  	"link_type" "enum_page_blocks_membership_tiers_tiers_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_page_blocks_membership_tiers_tiers_link_custom_page",
  	"link_label" varchar,
  	"features_heading" varchar
  );
  
  CREATE TABLE "page_blocks_membership_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"background_image_image_id" integer,
  	"billing_show_billing_toggle" boolean DEFAULT true,
  	"billing_default_period" "enum_page_blocks_membership_tiers_billing_default_period" DEFAULT 'monthly',
  	"billing_monthly_label" varchar,
  	"billing_annual_label" varchar,
  	"billing_savings_badge" varchar,
  	"billing_monthly_period_suffix" varchar,
  	"billing_annual_period_suffix" varchar,
  	"section_theme" "enum_page_blocks_membership_tiers_section_theme",
  	"section_max_width" "enum_page_blocks_membership_tiers_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_membership_tiers_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_membership_tiers_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_portrait_feature" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"person_name" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"link_type" "enum_page_blocks_portrait_feature_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_page_blocks_portrait_feature_link_custom_page",
  	"link_label" varchar,
  	"portrait_image_id" integer,
  	"section_theme" "enum_page_blocks_portrait_feature_section_theme",
  	"section_max_width" "enum_page_blocks_portrait_feature_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_portrait_feature_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_portrait_feature_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_book_offer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"email_placeholder" varchar,
  	"submit_label" varchar,
  	"success_message" varchar,
  	"cover_image_id" integer,
  	"section_theme" "enum_page_blocks_book_offer_section_theme",
  	"section_max_width" "enum_page_blocks_book_offer_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_page_blocks_book_offer_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_page_blocks_book_offer_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_hero_spotlight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro_text" varchar,
  	"cta_link_type" "enum__page_v_blocks_hero_spotlight_cta_link_type" DEFAULT 'reference',
  	"cta_link_new_tab" boolean,
  	"cta_link_url" varchar,
  	"cta_link_custom_page" "enum__page_v_blocks_hero_spotlight_cta_link_custom_page",
  	"cta_link_label" varchar,
  	"background_image_image_id" integer,
  	"background_focal_point" "enum__page_v_blocks_hero_spotlight_background_focal_point" DEFAULT 'upper-middle',
  	"photo_darkening" numeric DEFAULT 0,
  	"show_featured_card" boolean DEFAULT true,
  	"featured_card_label" varchar,
  	"featured_card_image_image_id" integer,
  	"featured_card_title" varchar,
  	"featured_card_rating" varchar DEFAULT '4.9',
  	"featured_card_date" timestamp(3) with time zone DEFAULT '2026-08-24T00:00:00.000Z',
  	"featured_card_price" varchar,
  	"featured_card_compare_at_price" varchar,
  	"featured_card_link_type" "enum__page_v_blocks_hero_spotlight_featured_card_link_type" DEFAULT 'reference',
  	"featured_card_link_new_tab" boolean,
  	"featured_card_link_url" varchar,
  	"featured_card_link_custom_page" "hero_spotlight_card_link_custom_page",
  	"section_theme" "enum__page_v_blocks_hero_spotlight_section_theme",
  	"section_max_width" "enum__page_v_blocks_hero_spotlight_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_hero_spotlight_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_hero_spotlight_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_course_rail_topics" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"link_type" "enum__page_v_blocks_course_rail_topics_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__page_v_blocks_course_rail_topics_link_custom_page",
  	"is_selected" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_course_rail_courses" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_image_id" integer,
  	"title" varchar,
  	"description" varchar,
  	"rating" numeric,
  	"date_label" varchar,
  	"price" varchar,
  	"price_before" varchar,
  	"link_type" "enum__page_v_blocks_course_rail_courses_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__page_v_blocks_course_rail_courses_link_custom_page",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_course_rail" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"all_topics_label" varchar,
  	"all_topics_link_type" "enum__page_v_blocks_course_rail_all_topics_link_type" DEFAULT 'reference',
  	"all_topics_link_new_tab" boolean,
  	"all_topics_link_url" varchar,
  	"all_topics_link_custom_page" "enum__page_v_blocks_course_rail_all_topics_link_custom_page",
  	"view_all_label" varchar,
  	"view_all_link_type" "enum__page_v_blocks_course_rail_view_all_link_type" DEFAULT 'reference',
  	"view_all_link_new_tab" boolean,
  	"view_all_link_url" varchar,
  	"view_all_link_custom_page" "enum__page_v_blocks_course_rail_view_all_link_custom_page",
  	"section_theme" "enum__page_v_blocks_course_rail_section_theme",
  	"section_max_width" "enum__page_v_blocks_course_rail_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_course_rail_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_course_rail_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_membership_tiers_tiers_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_membership_tiers_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"emphasis" "enum__page_v_blocks_membership_tiers_tiers_emphasis" DEFAULT 'standard',
  	"tagline" varchar,
  	"badge" varchar,
  	"price_monthly" varchar,
  	"price_annual" varchar,
  	"link_type" "enum__page_v_blocks_membership_tiers_tiers_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__page_v_blocks_membership_tiers_tiers_link_custom_page",
  	"link_label" varchar,
  	"features_heading" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_membership_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"background_image_image_id" integer,
  	"billing_show_billing_toggle" boolean DEFAULT true,
  	"billing_default_period" "enum__page_v_blocks_membership_tiers_billing_default_period" DEFAULT 'monthly',
  	"billing_monthly_label" varchar,
  	"billing_annual_label" varchar,
  	"billing_savings_badge" varchar,
  	"billing_monthly_period_suffix" varchar,
  	"billing_annual_period_suffix" varchar,
  	"section_theme" "enum__page_v_blocks_membership_tiers_section_theme",
  	"section_max_width" "enum__page_v_blocks_membership_tiers_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_membership_tiers_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_membership_tiers_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_portrait_feature" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"person_name" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"link_type" "enum__page_v_blocks_portrait_feature_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__page_v_blocks_portrait_feature_link_custom_page",
  	"link_label" varchar,
  	"portrait_image_id" integer,
  	"section_theme" "enum__page_v_blocks_portrait_feature_section_theme",
  	"section_max_width" "enum__page_v_blocks_portrait_feature_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_portrait_feature_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_portrait_feature_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_book_offer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"email_placeholder" varchar,
  	"submit_label" varchar,
  	"success_message" varchar,
  	"cover_image_id" integer,
  	"section_theme" "enum__page_v_blocks_book_offer_section_theme",
  	"section_max_width" "enum__page_v_blocks_book_offer_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__page_v_blocks_book_offer_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__page_v_blocks_book_offer_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_hero_spotlight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro_text" varchar,
  	"cta_link_type" "enum_gsec_blocks_hero_spotlight_cta_link_type" DEFAULT 'reference',
  	"cta_link_new_tab" boolean,
  	"cta_link_url" varchar,
  	"cta_link_custom_page" "enum_gsec_blocks_hero_spotlight_cta_link_custom_page",
  	"cta_link_label" varchar,
  	"background_image_image_id" integer,
  	"background_focal_point" "enum_gsec_blocks_hero_spotlight_background_focal_point" DEFAULT 'upper-middle',
  	"photo_darkening" numeric DEFAULT 0,
  	"show_featured_card" boolean DEFAULT true,
  	"featured_card_label" varchar,
  	"featured_card_image_image_id" integer,
  	"featured_card_title" varchar,
  	"featured_card_rating" varchar DEFAULT '4.9',
  	"featured_card_date" timestamp(3) with time zone DEFAULT '2026-08-24T00:00:00.000Z',
  	"featured_card_price" varchar,
  	"featured_card_compare_at_price" varchar,
  	"featured_card_link_type" "enum_gsec_blocks_hero_spotlight_featured_card_link_type" DEFAULT 'reference',
  	"featured_card_link_new_tab" boolean,
  	"featured_card_link_url" varchar,
  	"featured_card_link_custom_page" "hero_spotlight_card_link_custom_page",
  	"section_theme" "enum_gsec_blocks_hero_spotlight_section_theme",
  	"section_max_width" "enum_gsec_blocks_hero_spotlight_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_hero_spotlight_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_hero_spotlight_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_course_rail_topics" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"link_type" "enum_gsec_blocks_course_rail_topics_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_gsec_blocks_course_rail_topics_link_custom_page",
  	"is_selected" boolean
  );
  
  CREATE TABLE "gsec_blocks_course_rail_courses" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_image_id" integer,
  	"title" varchar,
  	"description" varchar,
  	"rating" numeric,
  	"date_label" varchar,
  	"price" varchar,
  	"price_before" varchar,
  	"link_type" "enum_gsec_blocks_course_rail_courses_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_gsec_blocks_course_rail_courses_link_custom_page"
  );
  
  CREATE TABLE "gsec_blocks_course_rail" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"all_topics_label" varchar,
  	"all_topics_link_type" "enum_gsec_blocks_course_rail_all_topics_link_type" DEFAULT 'reference',
  	"all_topics_link_new_tab" boolean,
  	"all_topics_link_url" varchar,
  	"all_topics_link_custom_page" "enum_gsec_blocks_course_rail_all_topics_link_custom_page",
  	"view_all_label" varchar,
  	"view_all_link_type" "enum_gsec_blocks_course_rail_view_all_link_type" DEFAULT 'reference',
  	"view_all_link_new_tab" boolean,
  	"view_all_link_url" varchar,
  	"view_all_link_custom_page" "enum_gsec_blocks_course_rail_view_all_link_custom_page",
  	"section_theme" "enum_gsec_blocks_course_rail_section_theme",
  	"section_max_width" "enum_gsec_blocks_course_rail_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_course_rail_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_course_rail_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_membership_tiers_tiers_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar
  );
  
  CREATE TABLE "gsec_blocks_membership_tiers_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"emphasis" "enum_gsec_blocks_membership_tiers_tiers_emphasis" DEFAULT 'standard',
  	"tagline" varchar,
  	"badge" varchar,
  	"price_monthly" varchar,
  	"price_annual" varchar,
  	"link_type" "enum_gsec_blocks_membership_tiers_tiers_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_gsec_blocks_membership_tiers_tiers_link_custom_page",
  	"link_label" varchar,
  	"features_heading" varchar
  );
  
  CREATE TABLE "gsec_blocks_membership_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"background_image_image_id" integer,
  	"billing_show_billing_toggle" boolean DEFAULT true,
  	"billing_default_period" "enum_gsec_blocks_membership_tiers_billing_default_period" DEFAULT 'monthly',
  	"billing_monthly_label" varchar,
  	"billing_annual_label" varchar,
  	"billing_savings_badge" varchar,
  	"billing_monthly_period_suffix" varchar,
  	"billing_annual_period_suffix" varchar,
  	"section_theme" "enum_gsec_blocks_membership_tiers_section_theme",
  	"section_max_width" "enum_gsec_blocks_membership_tiers_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_membership_tiers_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_membership_tiers_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_portrait_feature" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"person_name" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"link_type" "enum_gsec_blocks_portrait_feature_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_gsec_blocks_portrait_feature_link_custom_page",
  	"link_label" varchar,
  	"portrait_image_id" integer,
  	"section_theme" "enum_gsec_blocks_portrait_feature_section_theme",
  	"section_max_width" "enum_gsec_blocks_portrait_feature_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_portrait_feature_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_portrait_feature_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "gsec_blocks_book_offer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"email_placeholder" varchar,
  	"submit_label" varchar,
  	"success_message" varchar,
  	"cover_image_id" integer,
  	"section_theme" "enum_gsec_blocks_book_offer_section_theme",
  	"section_max_width" "enum_gsec_blocks_book_offer_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_gsec_blocks_book_offer_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_gsec_blocks_book_offer_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_hero_spotlight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"intro_text" varchar,
  	"cta_link_type" "enum__gsec_v_blocks_hero_spotlight_cta_link_type" DEFAULT 'reference',
  	"cta_link_new_tab" boolean,
  	"cta_link_url" varchar,
  	"cta_link_custom_page" "enum__gsec_v_blocks_hero_spotlight_cta_link_custom_page",
  	"cta_link_label" varchar,
  	"background_image_image_id" integer,
  	"background_focal_point" "enum__gsec_v_blocks_hero_spotlight_background_focal_point" DEFAULT 'upper-middle',
  	"photo_darkening" numeric DEFAULT 0,
  	"show_featured_card" boolean DEFAULT true,
  	"featured_card_label" varchar,
  	"featured_card_image_image_id" integer,
  	"featured_card_title" varchar,
  	"featured_card_rating" varchar DEFAULT '4.9',
  	"featured_card_date" timestamp(3) with time zone DEFAULT '2026-08-24T00:00:00.000Z',
  	"featured_card_price" varchar,
  	"featured_card_compare_at_price" varchar,
  	"featured_card_link_type" "enum__gsec_v_blocks_hero_spotlight_featured_card_link_type" DEFAULT 'reference',
  	"featured_card_link_new_tab" boolean,
  	"featured_card_link_url" varchar,
  	"featured_card_link_custom_page" "hero_spotlight_card_link_custom_page",
  	"section_theme" "enum__gsec_v_blocks_hero_spotlight_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_hero_spotlight_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_hero_spotlight_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_hero_spotlight_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_course_rail_topics" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"link_type" "enum__gsec_v_blocks_course_rail_topics_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__gsec_v_blocks_course_rail_topics_link_custom_page",
  	"is_selected" boolean,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_course_rail_courses" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_image_id" integer,
  	"title" varchar,
  	"description" varchar,
  	"rating" numeric,
  	"date_label" varchar,
  	"price" varchar,
  	"price_before" varchar,
  	"link_type" "enum__gsec_v_blocks_course_rail_courses_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__gsec_v_blocks_course_rail_courses_link_custom_page",
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_course_rail" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"all_topics_label" varchar,
  	"all_topics_link_type" "enum__gsec_v_blocks_course_rail_all_topics_link_type" DEFAULT 'reference',
  	"all_topics_link_new_tab" boolean,
  	"all_topics_link_url" varchar,
  	"all_topics_link_custom_page" "enum__gsec_v_blocks_course_rail_all_topics_link_custom_page",
  	"view_all_label" varchar,
  	"view_all_link_type" "enum__gsec_v_blocks_course_rail_view_all_link_type" DEFAULT 'reference',
  	"view_all_link_new_tab" boolean,
  	"view_all_link_url" varchar,
  	"view_all_link_custom_page" "enum__gsec_v_blocks_course_rail_view_all_link_custom_page",
  	"section_theme" "enum__gsec_v_blocks_course_rail_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_course_rail_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_course_rail_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_course_rail_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_membership_tiers_tiers_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_membership_tiers_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"emphasis" "enum__gsec_v_blocks_membership_tiers_tiers_emphasis" DEFAULT 'standard',
  	"tagline" varchar,
  	"badge" varchar,
  	"price_monthly" varchar,
  	"price_annual" varchar,
  	"link_type" "enum__gsec_v_blocks_membership_tiers_tiers_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__gsec_v_blocks_membership_tiers_tiers_link_custom_page",
  	"link_label" varchar,
  	"features_heading" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_membership_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"background_image_image_id" integer,
  	"billing_show_billing_toggle" boolean DEFAULT true,
  	"billing_default_period" "enum__gsec_v_blocks_membership_tiers_billing_default_period" DEFAULT 'monthly',
  	"billing_monthly_label" varchar,
  	"billing_annual_label" varchar,
  	"billing_savings_badge" varchar,
  	"billing_monthly_period_suffix" varchar,
  	"billing_annual_period_suffix" varchar,
  	"section_theme" "enum__gsec_v_blocks_membership_tiers_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_membership_tiers_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_membership_tiers_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_membership_tiers_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_portrait_feature" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"person_name" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"link_type" "enum__gsec_v_blocks_portrait_feature_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum__gsec_v_blocks_portrait_feature_link_custom_page",
  	"link_label" varchar,
  	"portrait_image_id" integer,
  	"section_theme" "enum__gsec_v_blocks_portrait_feature_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_portrait_feature_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_portrait_feature_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_portrait_feature_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_gsec_v_blocks_book_offer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"email_placeholder" varchar,
  	"submit_label" varchar,
  	"success_message" varchar,
  	"cover_image_id" integer,
  	"section_theme" "enum__gsec_v_blocks_book_offer_section_theme",
  	"section_max_width" "enum__gsec_v_blocks_book_offer_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum__gsec_v_blocks_book_offer_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum__gsec_v_blocks_book_offer_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_hero_spotlight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"cta_link_type" "enum_presets_blocks_hero_spotlight_cta_link_type" DEFAULT 'reference',
  	"cta_link_new_tab" boolean,
  	"cta_link_url" varchar,
  	"cta_link_custom_page" "enum_presets_blocks_hero_spotlight_cta_link_custom_page",
  	"background_image_image_id" integer,
  	"background_focal_point" "enum_presets_blocks_hero_spotlight_background_focal_point" DEFAULT 'upper-middle',
  	"photo_darkening" numeric DEFAULT 0,
  	"show_featured_card" boolean DEFAULT true,
  	"featured_card_image_image_id" integer,
  	"featured_card_rating" varchar DEFAULT '4.9',
  	"featured_card_date" timestamp(3) with time zone DEFAULT '2026-08-24T00:00:00.000Z',
  	"featured_card_link_type" "enum_presets_blocks_hero_spotlight_featured_card_link_type" DEFAULT 'reference',
  	"featured_card_link_new_tab" boolean,
  	"featured_card_link_url" varchar,
  	"featured_card_link_custom_page" "hero_spotlight_card_link_custom_page",
  	"section_theme" "enum_presets_blocks_hero_spotlight_section_theme",
  	"section_max_width" "enum_presets_blocks_hero_spotlight_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_hero_spotlight_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_hero_spotlight_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_hero_spotlight_locales" (
  	"eyebrow" varchar,
  	"heading" varchar NOT NULL,
  	"intro_text" varchar,
  	"cta_link_label" varchar,
  	"featured_card_label" varchar,
  	"featured_card_title" varchar,
  	"featured_card_price" varchar,
  	"featured_card_compare_at_price" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_course_rail_topics" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"link_type" "enum_presets_blocks_course_rail_topics_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_presets_blocks_course_rail_topics_link_custom_page",
  	"is_selected" boolean
  );
  
  CREATE TABLE "presets_blocks_course_rail_courses" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_image_id" integer,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"rating" numeric,
  	"date_label" varchar,
  	"price" varchar,
  	"price_before" varchar,
  	"link_type" "enum_presets_blocks_course_rail_courses_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_presets_blocks_course_rail_courses_link_custom_page"
  );
  
  CREATE TABLE "presets_blocks_course_rail" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"all_topics_link_type" "enum_presets_blocks_course_rail_all_topics_link_type" DEFAULT 'reference',
  	"all_topics_link_new_tab" boolean,
  	"all_topics_link_url" varchar,
  	"all_topics_link_custom_page" "enum_presets_blocks_course_rail_all_topics_link_custom_page",
  	"view_all_link_type" "enum_presets_blocks_course_rail_view_all_link_type" DEFAULT 'reference',
  	"view_all_link_new_tab" boolean,
  	"view_all_link_url" varchar,
  	"view_all_link_custom_page" "enum_presets_blocks_course_rail_view_all_link_custom_page",
  	"section_theme" "enum_presets_blocks_course_rail_section_theme",
  	"section_max_width" "enum_presets_blocks_course_rail_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_course_rail_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_course_rail_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_course_rail_locales" (
  	"eyebrow" varchar,
  	"heading" varchar NOT NULL,
  	"all_topics_label" varchar,
  	"view_all_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_membership_tiers_tiers_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_membership_tiers_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"emphasis" "enum_presets_blocks_membership_tiers_tiers_emphasis" DEFAULT 'standard',
  	"tagline" varchar,
  	"badge" varchar,
  	"price_monthly" varchar NOT NULL,
  	"price_annual" varchar,
  	"link_type" "enum_presets_blocks_membership_tiers_tiers_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_presets_blocks_membership_tiers_tiers_link_custom_page",
  	"link_label" varchar,
  	"features_heading" varchar
  );
  
  CREATE TABLE "presets_blocks_membership_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"background_image_image_id" integer,
  	"billing_show_billing_toggle" boolean DEFAULT true,
  	"billing_default_period" "enum_presets_blocks_membership_tiers_billing_default_period" DEFAULT 'monthly',
  	"section_theme" "enum_presets_blocks_membership_tiers_section_theme",
  	"section_max_width" "enum_presets_blocks_membership_tiers_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_membership_tiers_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_membership_tiers_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_membership_tiers_locales" (
  	"eyebrow" varchar,
  	"heading" varchar NOT NULL,
  	"billing_monthly_label" varchar,
  	"billing_annual_label" varchar,
  	"billing_savings_badge" varchar,
  	"billing_monthly_period_suffix" varchar,
  	"billing_annual_period_suffix" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_portrait_feature" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_presets_blocks_portrait_feature_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_custom_page" "enum_presets_blocks_portrait_feature_link_custom_page",
  	"portrait_image_id" integer,
  	"section_theme" "enum_presets_blocks_portrait_feature_section_theme",
  	"section_max_width" "enum_presets_blocks_portrait_feature_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_portrait_feature_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_portrait_feature_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_portrait_feature_locales" (
  	"person_name" varchar NOT NULL,
  	"heading" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"link_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_book_offer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"cover_image_id" integer,
  	"section_theme" "enum_presets_blocks_book_offer_section_theme",
  	"section_max_width" "enum_presets_blocks_book_offer_section_max_width" DEFAULT 'base',
  	"section_padding_y" "enum_presets_blocks_book_offer_section_padding_y" DEFAULT 'base',
  	"section_padding_x" "enum_presets_blocks_book_offer_section_padding_x" DEFAULT 'base',
  	"section_background_media_id" integer,
  	"section_background_overlay" "sec_bg_ovrly",
  	"section_background_opacity" numeric DEFAULT 35,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_book_offer_locales" (
  	"eyebrow" varchar,
  	"heading" varchar NOT NULL,
  	"description" varchar,
  	"email_placeholder" varchar NOT NULL,
  	"submit_label" varchar NOT NULL,
  	"success_message" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  ALTER TABLE "page" ADD COLUMN "_abvariantpercentages" jsonb;
  ALTER TABLE "_page_v" ADD COLUMN "version__abvariantpercentages" jsonb;
  ALTER TABLE "page_blocks_hero_spotlight" ADD CONSTRAINT "page_blocks_hero_spotlight_background_image_image_id_media_id_fk" FOREIGN KEY ("background_image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_hero_spotlight" ADD CONSTRAINT "page_blocks_hero_spotlight_featured_card_image_image_id_media_id_fk" FOREIGN KEY ("featured_card_image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_hero_spotlight" ADD CONSTRAINT "page_blocks_hero_spotlight_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_hero_spotlight" ADD CONSTRAINT "page_blocks_hero_spotlight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_course_rail_topics" ADD CONSTRAINT "page_blocks_course_rail_topics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_course_rail"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_course_rail_courses" ADD CONSTRAINT "page_blocks_course_rail_courses_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_course_rail_courses" ADD CONSTRAINT "page_blocks_course_rail_courses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_course_rail"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_course_rail" ADD CONSTRAINT "page_blocks_course_rail_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_course_rail" ADD CONSTRAINT "page_blocks_course_rail_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_membership_tiers_tiers_features" ADD CONSTRAINT "page_blocks_membership_tiers_tiers_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_membership_tiers_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_membership_tiers_tiers" ADD CONSTRAINT "page_blocks_membership_tiers_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_membership_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_membership_tiers" ADD CONSTRAINT "page_blocks_membership_tiers_background_image_image_id_media_id_fk" FOREIGN KEY ("background_image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_membership_tiers" ADD CONSTRAINT "page_blocks_membership_tiers_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_membership_tiers" ADD CONSTRAINT "page_blocks_membership_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_portrait_feature" ADD CONSTRAINT "page_blocks_portrait_feature_portrait_image_id_media_id_fk" FOREIGN KEY ("portrait_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_portrait_feature" ADD CONSTRAINT "page_blocks_portrait_feature_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_portrait_feature" ADD CONSTRAINT "page_blocks_portrait_feature_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_book_offer" ADD CONSTRAINT "page_blocks_book_offer_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_book_offer" ADD CONSTRAINT "page_blocks_book_offer_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_book_offer" ADD CONSTRAINT "page_blocks_book_offer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_hero_spotlight" ADD CONSTRAINT "_page_v_blocks_hero_spotlight_background_image_image_id_media_id_fk" FOREIGN KEY ("background_image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_hero_spotlight" ADD CONSTRAINT "_page_v_blocks_hero_spotlight_featured_card_image_image_id_media_id_fk" FOREIGN KEY ("featured_card_image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_hero_spotlight" ADD CONSTRAINT "_page_v_blocks_hero_spotlight_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_hero_spotlight" ADD CONSTRAINT "_page_v_blocks_hero_spotlight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_course_rail_topics" ADD CONSTRAINT "_page_v_blocks_course_rail_topics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_course_rail"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_course_rail_courses" ADD CONSTRAINT "_page_v_blocks_course_rail_courses_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_course_rail_courses" ADD CONSTRAINT "_page_v_blocks_course_rail_courses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_course_rail"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_course_rail" ADD CONSTRAINT "_page_v_blocks_course_rail_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_course_rail" ADD CONSTRAINT "_page_v_blocks_course_rail_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_membership_tiers_tiers_features" ADD CONSTRAINT "_page_v_blocks_membership_tiers_tiers_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_membership_tiers_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_membership_tiers_tiers" ADD CONSTRAINT "_page_v_blocks_membership_tiers_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_membership_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_membership_tiers" ADD CONSTRAINT "_page_v_blocks_membership_tiers_background_image_image_id_media_id_fk" FOREIGN KEY ("background_image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_membership_tiers" ADD CONSTRAINT "_page_v_blocks_membership_tiers_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_membership_tiers" ADD CONSTRAINT "_page_v_blocks_membership_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_portrait_feature" ADD CONSTRAINT "_page_v_blocks_portrait_feature_portrait_image_id_media_id_fk" FOREIGN KEY ("portrait_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_portrait_feature" ADD CONSTRAINT "_page_v_blocks_portrait_feature_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_portrait_feature" ADD CONSTRAINT "_page_v_blocks_portrait_feature_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_book_offer" ADD CONSTRAINT "_page_v_blocks_book_offer_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_book_offer" ADD CONSTRAINT "_page_v_blocks_book_offer_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_book_offer" ADD CONSTRAINT "_page_v_blocks_book_offer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_hero_spotlight" ADD CONSTRAINT "gsec_blocks_hero_spotlight_background_image_image_id_media_id_fk" FOREIGN KEY ("background_image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_hero_spotlight" ADD CONSTRAINT "gsec_blocks_hero_spotlight_featured_card_image_image_id_media_id_fk" FOREIGN KEY ("featured_card_image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_hero_spotlight" ADD CONSTRAINT "gsec_blocks_hero_spotlight_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_hero_spotlight" ADD CONSTRAINT "gsec_blocks_hero_spotlight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_course_rail_topics" ADD CONSTRAINT "gsec_blocks_course_rail_topics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_course_rail"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_course_rail_courses" ADD CONSTRAINT "gsec_blocks_course_rail_courses_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_course_rail_courses" ADD CONSTRAINT "gsec_blocks_course_rail_courses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_course_rail"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_course_rail" ADD CONSTRAINT "gsec_blocks_course_rail_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_course_rail" ADD CONSTRAINT "gsec_blocks_course_rail_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_membership_tiers_tiers_features" ADD CONSTRAINT "gsec_blocks_membership_tiers_tiers_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_membership_tiers_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_membership_tiers_tiers" ADD CONSTRAINT "gsec_blocks_membership_tiers_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec_blocks_membership_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_membership_tiers" ADD CONSTRAINT "gsec_blocks_membership_tiers_background_image_image_id_media_id_fk" FOREIGN KEY ("background_image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_membership_tiers" ADD CONSTRAINT "gsec_blocks_membership_tiers_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_membership_tiers" ADD CONSTRAINT "gsec_blocks_membership_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_portrait_feature" ADD CONSTRAINT "gsec_blocks_portrait_feature_portrait_image_id_media_id_fk" FOREIGN KEY ("portrait_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_portrait_feature" ADD CONSTRAINT "gsec_blocks_portrait_feature_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_portrait_feature" ADD CONSTRAINT "gsec_blocks_portrait_feature_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "gsec_blocks_book_offer" ADD CONSTRAINT "gsec_blocks_book_offer_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_book_offer" ADD CONSTRAINT "gsec_blocks_book_offer_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "gsec_blocks_book_offer" ADD CONSTRAINT "gsec_blocks_book_offer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."gsec"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_hero_spotlight" ADD CONSTRAINT "_gsec_v_blocks_hero_spotlight_background_image_image_id_media_id_fk" FOREIGN KEY ("background_image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_hero_spotlight" ADD CONSTRAINT "_gsec_v_blocks_hero_spotlight_featured_card_image_image_id_media_id_fk" FOREIGN KEY ("featured_card_image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_hero_spotlight" ADD CONSTRAINT "_gsec_v_blocks_hero_spotlight_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_hero_spotlight" ADD CONSTRAINT "_gsec_v_blocks_hero_spotlight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_course_rail_topics" ADD CONSTRAINT "_gsec_v_blocks_course_rail_topics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_course_rail"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_course_rail_courses" ADD CONSTRAINT "_gsec_v_blocks_course_rail_courses_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_course_rail_courses" ADD CONSTRAINT "_gsec_v_blocks_course_rail_courses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_course_rail"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_course_rail" ADD CONSTRAINT "_gsec_v_blocks_course_rail_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_course_rail" ADD CONSTRAINT "_gsec_v_blocks_course_rail_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_membership_tiers_tiers_features" ADD CONSTRAINT "_gsec_v_blocks_membership_tiers_tiers_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_membership_tiers_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_membership_tiers_tiers" ADD CONSTRAINT "_gsec_v_blocks_membership_tiers_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v_blocks_membership_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_membership_tiers" ADD CONSTRAINT "_gsec_v_blocks_membership_tiers_background_image_image_id_media_id_fk" FOREIGN KEY ("background_image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_membership_tiers" ADD CONSTRAINT "_gsec_v_blocks_membership_tiers_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_membership_tiers" ADD CONSTRAINT "_gsec_v_blocks_membership_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_portrait_feature" ADD CONSTRAINT "_gsec_v_blocks_portrait_feature_portrait_image_id_media_id_fk" FOREIGN KEY ("portrait_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_portrait_feature" ADD CONSTRAINT "_gsec_v_blocks_portrait_feature_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_portrait_feature" ADD CONSTRAINT "_gsec_v_blocks_portrait_feature_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_book_offer" ADD CONSTRAINT "_gsec_v_blocks_book_offer_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_book_offer" ADD CONSTRAINT "_gsec_v_blocks_book_offer_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_gsec_v_blocks_book_offer" ADD CONSTRAINT "_gsec_v_blocks_book_offer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_gsec_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_hero_spotlight" ADD CONSTRAINT "presets_blocks_hero_spotlight_background_image_image_id_media_id_fk" FOREIGN KEY ("background_image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_hero_spotlight" ADD CONSTRAINT "presets_blocks_hero_spotlight_featured_card_image_image_id_media_id_fk" FOREIGN KEY ("featured_card_image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_hero_spotlight" ADD CONSTRAINT "presets_blocks_hero_spotlight_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_hero_spotlight" ADD CONSTRAINT "presets_blocks_hero_spotlight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_hero_spotlight_locales" ADD CONSTRAINT "presets_blocks_hero_spotlight_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_hero_spotlight"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_course_rail_topics" ADD CONSTRAINT "presets_blocks_course_rail_topics_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_course_rail"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_course_rail_courses" ADD CONSTRAINT "presets_blocks_course_rail_courses_image_image_id_media_id_fk" FOREIGN KEY ("image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_course_rail_courses" ADD CONSTRAINT "presets_blocks_course_rail_courses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_course_rail"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_course_rail" ADD CONSTRAINT "presets_blocks_course_rail_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_course_rail" ADD CONSTRAINT "presets_blocks_course_rail_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_course_rail_locales" ADD CONSTRAINT "presets_blocks_course_rail_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_course_rail"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_membership_tiers_tiers_features" ADD CONSTRAINT "presets_blocks_membership_tiers_tiers_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_membership_tiers_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_membership_tiers_tiers" ADD CONSTRAINT "presets_blocks_membership_tiers_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_membership_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_membership_tiers" ADD CONSTRAINT "presets_blocks_membership_tiers_background_image_image_id_media_id_fk" FOREIGN KEY ("background_image_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_membership_tiers" ADD CONSTRAINT "presets_blocks_membership_tiers_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_membership_tiers" ADD CONSTRAINT "presets_blocks_membership_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_membership_tiers_locales" ADD CONSTRAINT "presets_blocks_membership_tiers_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_membership_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_portrait_feature" ADD CONSTRAINT "presets_blocks_portrait_feature_portrait_image_id_media_id_fk" FOREIGN KEY ("portrait_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_portrait_feature" ADD CONSTRAINT "presets_blocks_portrait_feature_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_portrait_feature" ADD CONSTRAINT "presets_blocks_portrait_feature_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_portrait_feature_locales" ADD CONSTRAINT "presets_blocks_portrait_feature_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_portrait_feature"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_book_offer" ADD CONSTRAINT "presets_blocks_book_offer_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_book_offer" ADD CONSTRAINT "presets_blocks_book_offer_section_background_media_id_media_id_fk" FOREIGN KEY ("section_background_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_book_offer" ADD CONSTRAINT "presets_blocks_book_offer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_book_offer_locales" ADD CONSTRAINT "presets_blocks_book_offer_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_book_offer"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_hero_spotlight_order_idx" ON "page_blocks_hero_spotlight" USING btree ("_order");
  CREATE INDEX "page_blocks_hero_spotlight_parent_id_idx" ON "page_blocks_hero_spotlight" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_hero_spotlight_path_idx" ON "page_blocks_hero_spotlight" USING btree ("_path");
  CREATE INDEX "page_blocks_hero_spotlight_locale_idx" ON "page_blocks_hero_spotlight" USING btree ("_locale");
  CREATE INDEX "page_blocks_hero_spotlight_background_image_background_i_idx" ON "page_blocks_hero_spotlight" USING btree ("background_image_image_id");
  CREATE INDEX "page_blocks_hero_spotlight_featured_card_image_featured__idx" ON "page_blocks_hero_spotlight" USING btree ("featured_card_image_image_id");
  CREATE INDEX "page_blocks_hero_spotlight_section_background_section_ba_idx" ON "page_blocks_hero_spotlight" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_course_rail_topics_order_idx" ON "page_blocks_course_rail_topics" USING btree ("_order");
  CREATE INDEX "page_blocks_course_rail_topics_parent_id_idx" ON "page_blocks_course_rail_topics" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_course_rail_topics_locale_idx" ON "page_blocks_course_rail_topics" USING btree ("_locale");
  CREATE INDEX "page_blocks_course_rail_courses_order_idx" ON "page_blocks_course_rail_courses" USING btree ("_order");
  CREATE INDEX "page_blocks_course_rail_courses_parent_id_idx" ON "page_blocks_course_rail_courses" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_course_rail_courses_locale_idx" ON "page_blocks_course_rail_courses" USING btree ("_locale");
  CREATE INDEX "page_blocks_course_rail_courses_image_image_image_idx" ON "page_blocks_course_rail_courses" USING btree ("image_image_id");
  CREATE INDEX "page_blocks_course_rail_order_idx" ON "page_blocks_course_rail" USING btree ("_order");
  CREATE INDEX "page_blocks_course_rail_parent_id_idx" ON "page_blocks_course_rail" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_course_rail_path_idx" ON "page_blocks_course_rail" USING btree ("_path");
  CREATE INDEX "page_blocks_course_rail_locale_idx" ON "page_blocks_course_rail" USING btree ("_locale");
  CREATE INDEX "page_blocks_course_rail_section_background_section_backg_idx" ON "page_blocks_course_rail" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_membership_tiers_tiers_features_order_idx" ON "page_blocks_membership_tiers_tiers_features" USING btree ("_order");
  CREATE INDEX "page_blocks_membership_tiers_tiers_features_parent_id_idx" ON "page_blocks_membership_tiers_tiers_features" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_membership_tiers_tiers_features_locale_idx" ON "page_blocks_membership_tiers_tiers_features" USING btree ("_locale");
  CREATE INDEX "page_blocks_membership_tiers_tiers_order_idx" ON "page_blocks_membership_tiers_tiers" USING btree ("_order");
  CREATE INDEX "page_blocks_membership_tiers_tiers_parent_id_idx" ON "page_blocks_membership_tiers_tiers" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_membership_tiers_tiers_locale_idx" ON "page_blocks_membership_tiers_tiers" USING btree ("_locale");
  CREATE INDEX "page_blocks_membership_tiers_order_idx" ON "page_blocks_membership_tiers" USING btree ("_order");
  CREATE INDEX "page_blocks_membership_tiers_parent_id_idx" ON "page_blocks_membership_tiers" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_membership_tiers_path_idx" ON "page_blocks_membership_tiers" USING btree ("_path");
  CREATE INDEX "page_blocks_membership_tiers_locale_idx" ON "page_blocks_membership_tiers" USING btree ("_locale");
  CREATE INDEX "page_blocks_membership_tiers_background_image_background_idx" ON "page_blocks_membership_tiers" USING btree ("background_image_image_id");
  CREATE INDEX "page_blocks_membership_tiers_section_background_section__idx" ON "page_blocks_membership_tiers" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_portrait_feature_order_idx" ON "page_blocks_portrait_feature" USING btree ("_order");
  CREATE INDEX "page_blocks_portrait_feature_parent_id_idx" ON "page_blocks_portrait_feature" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_portrait_feature_path_idx" ON "page_blocks_portrait_feature" USING btree ("_path");
  CREATE INDEX "page_blocks_portrait_feature_locale_idx" ON "page_blocks_portrait_feature" USING btree ("_locale");
  CREATE INDEX "page_blocks_portrait_feature_portrait_portrait_image_idx" ON "page_blocks_portrait_feature" USING btree ("portrait_image_id");
  CREATE INDEX "page_blocks_portrait_feature_section_background_section__idx" ON "page_blocks_portrait_feature" USING btree ("section_background_media_id");
  CREATE INDEX "page_blocks_book_offer_order_idx" ON "page_blocks_book_offer" USING btree ("_order");
  CREATE INDEX "page_blocks_book_offer_parent_id_idx" ON "page_blocks_book_offer" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_book_offer_path_idx" ON "page_blocks_book_offer" USING btree ("_path");
  CREATE INDEX "page_blocks_book_offer_locale_idx" ON "page_blocks_book_offer" USING btree ("_locale");
  CREATE INDEX "page_blocks_book_offer_cover_cover_image_idx" ON "page_blocks_book_offer" USING btree ("cover_image_id");
  CREATE INDEX "page_blocks_book_offer_section_background_section_backgr_idx" ON "page_blocks_book_offer" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_hero_spotlight_order_idx" ON "_page_v_blocks_hero_spotlight" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_hero_spotlight_parent_id_idx" ON "_page_v_blocks_hero_spotlight" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_hero_spotlight_path_idx" ON "_page_v_blocks_hero_spotlight" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_hero_spotlight_locale_idx" ON "_page_v_blocks_hero_spotlight" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_hero_spotlight_background_image_backgroun_idx" ON "_page_v_blocks_hero_spotlight" USING btree ("background_image_image_id");
  CREATE INDEX "_page_v_blocks_hero_spotlight_featured_card_image_featur_idx" ON "_page_v_blocks_hero_spotlight" USING btree ("featured_card_image_image_id");
  CREATE INDEX "_page_v_blocks_hero_spotlight_section_background_section_idx" ON "_page_v_blocks_hero_spotlight" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_course_rail_topics_order_idx" ON "_page_v_blocks_course_rail_topics" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_course_rail_topics_parent_id_idx" ON "_page_v_blocks_course_rail_topics" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_course_rail_topics_locale_idx" ON "_page_v_blocks_course_rail_topics" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_course_rail_courses_order_idx" ON "_page_v_blocks_course_rail_courses" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_course_rail_courses_parent_id_idx" ON "_page_v_blocks_course_rail_courses" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_course_rail_courses_locale_idx" ON "_page_v_blocks_course_rail_courses" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_course_rail_courses_image_image_image_idx" ON "_page_v_blocks_course_rail_courses" USING btree ("image_image_id");
  CREATE INDEX "_page_v_blocks_course_rail_order_idx" ON "_page_v_blocks_course_rail" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_course_rail_parent_id_idx" ON "_page_v_blocks_course_rail" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_course_rail_path_idx" ON "_page_v_blocks_course_rail" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_course_rail_locale_idx" ON "_page_v_blocks_course_rail" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_course_rail_section_background_section_ba_idx" ON "_page_v_blocks_course_rail" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_membership_tiers_tiers_features_order_idx" ON "_page_v_blocks_membership_tiers_tiers_features" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_membership_tiers_tiers_features_parent_id_idx" ON "_page_v_blocks_membership_tiers_tiers_features" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_membership_tiers_tiers_features_locale_idx" ON "_page_v_blocks_membership_tiers_tiers_features" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_membership_tiers_tiers_order_idx" ON "_page_v_blocks_membership_tiers_tiers" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_membership_tiers_tiers_parent_id_idx" ON "_page_v_blocks_membership_tiers_tiers" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_membership_tiers_tiers_locale_idx" ON "_page_v_blocks_membership_tiers_tiers" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_membership_tiers_order_idx" ON "_page_v_blocks_membership_tiers" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_membership_tiers_parent_id_idx" ON "_page_v_blocks_membership_tiers" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_membership_tiers_path_idx" ON "_page_v_blocks_membership_tiers" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_membership_tiers_locale_idx" ON "_page_v_blocks_membership_tiers" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_membership_tiers_background_image_backgro_idx" ON "_page_v_blocks_membership_tiers" USING btree ("background_image_image_id");
  CREATE INDEX "_page_v_blocks_membership_tiers_section_background_secti_idx" ON "_page_v_blocks_membership_tiers" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_portrait_feature_order_idx" ON "_page_v_blocks_portrait_feature" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_portrait_feature_parent_id_idx" ON "_page_v_blocks_portrait_feature" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_portrait_feature_path_idx" ON "_page_v_blocks_portrait_feature" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_portrait_feature_locale_idx" ON "_page_v_blocks_portrait_feature" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_portrait_feature_portrait_portrait_image_idx" ON "_page_v_blocks_portrait_feature" USING btree ("portrait_image_id");
  CREATE INDEX "_page_v_blocks_portrait_feature_section_background_secti_idx" ON "_page_v_blocks_portrait_feature" USING btree ("section_background_media_id");
  CREATE INDEX "_page_v_blocks_book_offer_order_idx" ON "_page_v_blocks_book_offer" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_book_offer_parent_id_idx" ON "_page_v_blocks_book_offer" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_book_offer_path_idx" ON "_page_v_blocks_book_offer" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_book_offer_locale_idx" ON "_page_v_blocks_book_offer" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_book_offer_cover_cover_image_idx" ON "_page_v_blocks_book_offer" USING btree ("cover_image_id");
  CREATE INDEX "_page_v_blocks_book_offer_section_background_section_bac_idx" ON "_page_v_blocks_book_offer" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_hero_spotlight_order_idx" ON "gsec_blocks_hero_spotlight" USING btree ("_order");
  CREATE INDEX "gsec_blocks_hero_spotlight_parent_id_idx" ON "gsec_blocks_hero_spotlight" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_hero_spotlight_path_idx" ON "gsec_blocks_hero_spotlight" USING btree ("_path");
  CREATE INDEX "gsec_blocks_hero_spotlight_locale_idx" ON "gsec_blocks_hero_spotlight" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_hero_spotlight_background_image_background_i_idx" ON "gsec_blocks_hero_spotlight" USING btree ("background_image_image_id");
  CREATE INDEX "gsec_blocks_hero_spotlight_featured_card_image_featured__idx" ON "gsec_blocks_hero_spotlight" USING btree ("featured_card_image_image_id");
  CREATE INDEX "gsec_blocks_hero_spotlight_section_background_section_ba_idx" ON "gsec_blocks_hero_spotlight" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_course_rail_topics_order_idx" ON "gsec_blocks_course_rail_topics" USING btree ("_order");
  CREATE INDEX "gsec_blocks_course_rail_topics_parent_id_idx" ON "gsec_blocks_course_rail_topics" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_course_rail_topics_locale_idx" ON "gsec_blocks_course_rail_topics" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_course_rail_courses_order_idx" ON "gsec_blocks_course_rail_courses" USING btree ("_order");
  CREATE INDEX "gsec_blocks_course_rail_courses_parent_id_idx" ON "gsec_blocks_course_rail_courses" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_course_rail_courses_locale_idx" ON "gsec_blocks_course_rail_courses" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_course_rail_courses_image_image_image_idx" ON "gsec_blocks_course_rail_courses" USING btree ("image_image_id");
  CREATE INDEX "gsec_blocks_course_rail_order_idx" ON "gsec_blocks_course_rail" USING btree ("_order");
  CREATE INDEX "gsec_blocks_course_rail_parent_id_idx" ON "gsec_blocks_course_rail" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_course_rail_path_idx" ON "gsec_blocks_course_rail" USING btree ("_path");
  CREATE INDEX "gsec_blocks_course_rail_locale_idx" ON "gsec_blocks_course_rail" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_course_rail_section_background_section_backg_idx" ON "gsec_blocks_course_rail" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_membership_tiers_tiers_features_order_idx" ON "gsec_blocks_membership_tiers_tiers_features" USING btree ("_order");
  CREATE INDEX "gsec_blocks_membership_tiers_tiers_features_parent_id_idx" ON "gsec_blocks_membership_tiers_tiers_features" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_membership_tiers_tiers_features_locale_idx" ON "gsec_blocks_membership_tiers_tiers_features" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_membership_tiers_tiers_order_idx" ON "gsec_blocks_membership_tiers_tiers" USING btree ("_order");
  CREATE INDEX "gsec_blocks_membership_tiers_tiers_parent_id_idx" ON "gsec_blocks_membership_tiers_tiers" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_membership_tiers_tiers_locale_idx" ON "gsec_blocks_membership_tiers_tiers" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_membership_tiers_order_idx" ON "gsec_blocks_membership_tiers" USING btree ("_order");
  CREATE INDEX "gsec_blocks_membership_tiers_parent_id_idx" ON "gsec_blocks_membership_tiers" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_membership_tiers_path_idx" ON "gsec_blocks_membership_tiers" USING btree ("_path");
  CREATE INDEX "gsec_blocks_membership_tiers_locale_idx" ON "gsec_blocks_membership_tiers" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_membership_tiers_background_image_background_idx" ON "gsec_blocks_membership_tiers" USING btree ("background_image_image_id");
  CREATE INDEX "gsec_blocks_membership_tiers_section_background_section__idx" ON "gsec_blocks_membership_tiers" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_portrait_feature_order_idx" ON "gsec_blocks_portrait_feature" USING btree ("_order");
  CREATE INDEX "gsec_blocks_portrait_feature_parent_id_idx" ON "gsec_blocks_portrait_feature" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_portrait_feature_path_idx" ON "gsec_blocks_portrait_feature" USING btree ("_path");
  CREATE INDEX "gsec_blocks_portrait_feature_locale_idx" ON "gsec_blocks_portrait_feature" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_portrait_feature_portrait_portrait_image_idx" ON "gsec_blocks_portrait_feature" USING btree ("portrait_image_id");
  CREATE INDEX "gsec_blocks_portrait_feature_section_background_section__idx" ON "gsec_blocks_portrait_feature" USING btree ("section_background_media_id");
  CREATE INDEX "gsec_blocks_book_offer_order_idx" ON "gsec_blocks_book_offer" USING btree ("_order");
  CREATE INDEX "gsec_blocks_book_offer_parent_id_idx" ON "gsec_blocks_book_offer" USING btree ("_parent_id");
  CREATE INDEX "gsec_blocks_book_offer_path_idx" ON "gsec_blocks_book_offer" USING btree ("_path");
  CREATE INDEX "gsec_blocks_book_offer_locale_idx" ON "gsec_blocks_book_offer" USING btree ("_locale");
  CREATE INDEX "gsec_blocks_book_offer_cover_cover_image_idx" ON "gsec_blocks_book_offer" USING btree ("cover_image_id");
  CREATE INDEX "gsec_blocks_book_offer_section_background_section_backgr_idx" ON "gsec_blocks_book_offer" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_hero_spotlight_order_idx" ON "_gsec_v_blocks_hero_spotlight" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_hero_spotlight_parent_id_idx" ON "_gsec_v_blocks_hero_spotlight" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_hero_spotlight_path_idx" ON "_gsec_v_blocks_hero_spotlight" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_hero_spotlight_locale_idx" ON "_gsec_v_blocks_hero_spotlight" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_hero_spotlight_background_image_backgroun_idx" ON "_gsec_v_blocks_hero_spotlight" USING btree ("background_image_image_id");
  CREATE INDEX "_gsec_v_blocks_hero_spotlight_featured_card_image_featur_idx" ON "_gsec_v_blocks_hero_spotlight" USING btree ("featured_card_image_image_id");
  CREATE INDEX "_gsec_v_blocks_hero_spotlight_section_background_section_idx" ON "_gsec_v_blocks_hero_spotlight" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_course_rail_topics_order_idx" ON "_gsec_v_blocks_course_rail_topics" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_course_rail_topics_parent_id_idx" ON "_gsec_v_blocks_course_rail_topics" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_course_rail_topics_locale_idx" ON "_gsec_v_blocks_course_rail_topics" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_course_rail_courses_order_idx" ON "_gsec_v_blocks_course_rail_courses" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_course_rail_courses_parent_id_idx" ON "_gsec_v_blocks_course_rail_courses" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_course_rail_courses_locale_idx" ON "_gsec_v_blocks_course_rail_courses" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_course_rail_courses_image_image_image_idx" ON "_gsec_v_blocks_course_rail_courses" USING btree ("image_image_id");
  CREATE INDEX "_gsec_v_blocks_course_rail_order_idx" ON "_gsec_v_blocks_course_rail" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_course_rail_parent_id_idx" ON "_gsec_v_blocks_course_rail" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_course_rail_path_idx" ON "_gsec_v_blocks_course_rail" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_course_rail_locale_idx" ON "_gsec_v_blocks_course_rail" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_course_rail_section_background_section_ba_idx" ON "_gsec_v_blocks_course_rail" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_membership_tiers_tiers_features_order_idx" ON "_gsec_v_blocks_membership_tiers_tiers_features" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_membership_tiers_tiers_features_parent_id_idx" ON "_gsec_v_blocks_membership_tiers_tiers_features" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_membership_tiers_tiers_features_locale_idx" ON "_gsec_v_blocks_membership_tiers_tiers_features" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_membership_tiers_tiers_order_idx" ON "_gsec_v_blocks_membership_tiers_tiers" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_membership_tiers_tiers_parent_id_idx" ON "_gsec_v_blocks_membership_tiers_tiers" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_membership_tiers_tiers_locale_idx" ON "_gsec_v_blocks_membership_tiers_tiers" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_membership_tiers_order_idx" ON "_gsec_v_blocks_membership_tiers" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_membership_tiers_parent_id_idx" ON "_gsec_v_blocks_membership_tiers" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_membership_tiers_path_idx" ON "_gsec_v_blocks_membership_tiers" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_membership_tiers_locale_idx" ON "_gsec_v_blocks_membership_tiers" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_membership_tiers_background_image_backgro_idx" ON "_gsec_v_blocks_membership_tiers" USING btree ("background_image_image_id");
  CREATE INDEX "_gsec_v_blocks_membership_tiers_section_background_secti_idx" ON "_gsec_v_blocks_membership_tiers" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_portrait_feature_order_idx" ON "_gsec_v_blocks_portrait_feature" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_portrait_feature_parent_id_idx" ON "_gsec_v_blocks_portrait_feature" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_portrait_feature_path_idx" ON "_gsec_v_blocks_portrait_feature" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_portrait_feature_locale_idx" ON "_gsec_v_blocks_portrait_feature" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_portrait_feature_portrait_portrait_image_idx" ON "_gsec_v_blocks_portrait_feature" USING btree ("portrait_image_id");
  CREATE INDEX "_gsec_v_blocks_portrait_feature_section_background_secti_idx" ON "_gsec_v_blocks_portrait_feature" USING btree ("section_background_media_id");
  CREATE INDEX "_gsec_v_blocks_book_offer_order_idx" ON "_gsec_v_blocks_book_offer" USING btree ("_order");
  CREATE INDEX "_gsec_v_blocks_book_offer_parent_id_idx" ON "_gsec_v_blocks_book_offer" USING btree ("_parent_id");
  CREATE INDEX "_gsec_v_blocks_book_offer_path_idx" ON "_gsec_v_blocks_book_offer" USING btree ("_path");
  CREATE INDEX "_gsec_v_blocks_book_offer_locale_idx" ON "_gsec_v_blocks_book_offer" USING btree ("_locale");
  CREATE INDEX "_gsec_v_blocks_book_offer_cover_cover_image_idx" ON "_gsec_v_blocks_book_offer" USING btree ("cover_image_id");
  CREATE INDEX "_gsec_v_blocks_book_offer_section_background_section_bac_idx" ON "_gsec_v_blocks_book_offer" USING btree ("section_background_media_id");
  CREATE INDEX "presets_blocks_hero_spotlight_order_idx" ON "presets_blocks_hero_spotlight" USING btree ("_order");
  CREATE INDEX "presets_blocks_hero_spotlight_parent_id_idx" ON "presets_blocks_hero_spotlight" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_hero_spotlight_path_idx" ON "presets_blocks_hero_spotlight" USING btree ("_path");
  CREATE INDEX "presets_blocks_hero_spotlight_background_image_backgroun_idx" ON "presets_blocks_hero_spotlight" USING btree ("background_image_image_id");
  CREATE INDEX "presets_blocks_hero_spotlight_featured_card_image_featur_idx" ON "presets_blocks_hero_spotlight" USING btree ("featured_card_image_image_id");
  CREATE INDEX "presets_blocks_hero_spotlight_section_background_section_idx" ON "presets_blocks_hero_spotlight" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_hero_spotlight_locales_locale_parent_id_uniqu" ON "presets_blocks_hero_spotlight_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_course_rail_topics_order_idx" ON "presets_blocks_course_rail_topics" USING btree ("_order");
  CREATE INDEX "presets_blocks_course_rail_topics_parent_id_idx" ON "presets_blocks_course_rail_topics" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_course_rail_topics_locale_idx" ON "presets_blocks_course_rail_topics" USING btree ("_locale");
  CREATE INDEX "presets_blocks_course_rail_courses_order_idx" ON "presets_blocks_course_rail_courses" USING btree ("_order");
  CREATE INDEX "presets_blocks_course_rail_courses_parent_id_idx" ON "presets_blocks_course_rail_courses" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_course_rail_courses_locale_idx" ON "presets_blocks_course_rail_courses" USING btree ("_locale");
  CREATE INDEX "presets_blocks_course_rail_courses_image_image_image_idx" ON "presets_blocks_course_rail_courses" USING btree ("image_image_id");
  CREATE INDEX "presets_blocks_course_rail_order_idx" ON "presets_blocks_course_rail" USING btree ("_order");
  CREATE INDEX "presets_blocks_course_rail_parent_id_idx" ON "presets_blocks_course_rail" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_course_rail_path_idx" ON "presets_blocks_course_rail" USING btree ("_path");
  CREATE INDEX "presets_blocks_course_rail_section_background_section_ba_idx" ON "presets_blocks_course_rail" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_course_rail_locales_locale_parent_id_unique" ON "presets_blocks_course_rail_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_membership_tiers_tiers_features_order_idx" ON "presets_blocks_membership_tiers_tiers_features" USING btree ("_order");
  CREATE INDEX "presets_blocks_membership_tiers_tiers_features_parent_id_idx" ON "presets_blocks_membership_tiers_tiers_features" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_membership_tiers_tiers_features_locale_idx" ON "presets_blocks_membership_tiers_tiers_features" USING btree ("_locale");
  CREATE INDEX "presets_blocks_membership_tiers_tiers_order_idx" ON "presets_blocks_membership_tiers_tiers" USING btree ("_order");
  CREATE INDEX "presets_blocks_membership_tiers_tiers_parent_id_idx" ON "presets_blocks_membership_tiers_tiers" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_membership_tiers_tiers_locale_idx" ON "presets_blocks_membership_tiers_tiers" USING btree ("_locale");
  CREATE INDEX "presets_blocks_membership_tiers_order_idx" ON "presets_blocks_membership_tiers" USING btree ("_order");
  CREATE INDEX "presets_blocks_membership_tiers_parent_id_idx" ON "presets_blocks_membership_tiers" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_membership_tiers_path_idx" ON "presets_blocks_membership_tiers" USING btree ("_path");
  CREATE INDEX "presets_blocks_membership_tiers_background_image_backgro_idx" ON "presets_blocks_membership_tiers" USING btree ("background_image_image_id");
  CREATE INDEX "presets_blocks_membership_tiers_section_background_secti_idx" ON "presets_blocks_membership_tiers" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_membership_tiers_locales_locale_parent_id_uni" ON "presets_blocks_membership_tiers_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_portrait_feature_order_idx" ON "presets_blocks_portrait_feature" USING btree ("_order");
  CREATE INDEX "presets_blocks_portrait_feature_parent_id_idx" ON "presets_blocks_portrait_feature" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_portrait_feature_path_idx" ON "presets_blocks_portrait_feature" USING btree ("_path");
  CREATE INDEX "presets_blocks_portrait_feature_portrait_portrait_image_idx" ON "presets_blocks_portrait_feature" USING btree ("portrait_image_id");
  CREATE INDEX "presets_blocks_portrait_feature_section_background_secti_idx" ON "presets_blocks_portrait_feature" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_portrait_feature_locales_locale_parent_id_uni" ON "presets_blocks_portrait_feature_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "presets_blocks_book_offer_order_idx" ON "presets_blocks_book_offer" USING btree ("_order");
  CREATE INDEX "presets_blocks_book_offer_parent_id_idx" ON "presets_blocks_book_offer" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_book_offer_path_idx" ON "presets_blocks_book_offer" USING btree ("_path");
  CREATE INDEX "presets_blocks_book_offer_cover_cover_image_idx" ON "presets_blocks_book_offer" USING btree ("cover_image_id");
  CREATE INDEX "presets_blocks_book_offer_section_background_section_bac_idx" ON "presets_blocks_book_offer" USING btree ("section_background_media_id");
  CREATE UNIQUE INDEX "presets_blocks_book_offer_locales_locale_parent_id_unique" ON "presets_blocks_book_offer_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "page_blocks_hero_spotlight" CASCADE;
  DROP TABLE "page_blocks_course_rail_topics" CASCADE;
  DROP TABLE "page_blocks_course_rail_courses" CASCADE;
  DROP TABLE "page_blocks_course_rail" CASCADE;
  DROP TABLE "page_blocks_membership_tiers_tiers_features" CASCADE;
  DROP TABLE "page_blocks_membership_tiers_tiers" CASCADE;
  DROP TABLE "page_blocks_membership_tiers" CASCADE;
  DROP TABLE "page_blocks_portrait_feature" CASCADE;
  DROP TABLE "page_blocks_book_offer" CASCADE;
  DROP TABLE "_page_v_blocks_hero_spotlight" CASCADE;
  DROP TABLE "_page_v_blocks_course_rail_topics" CASCADE;
  DROP TABLE "_page_v_blocks_course_rail_courses" CASCADE;
  DROP TABLE "_page_v_blocks_course_rail" CASCADE;
  DROP TABLE "_page_v_blocks_membership_tiers_tiers_features" CASCADE;
  DROP TABLE "_page_v_blocks_membership_tiers_tiers" CASCADE;
  DROP TABLE "_page_v_blocks_membership_tiers" CASCADE;
  DROP TABLE "_page_v_blocks_portrait_feature" CASCADE;
  DROP TABLE "_page_v_blocks_book_offer" CASCADE;
  DROP TABLE "gsec_blocks_hero_spotlight" CASCADE;
  DROP TABLE "gsec_blocks_course_rail_topics" CASCADE;
  DROP TABLE "gsec_blocks_course_rail_courses" CASCADE;
  DROP TABLE "gsec_blocks_course_rail" CASCADE;
  DROP TABLE "gsec_blocks_membership_tiers_tiers_features" CASCADE;
  DROP TABLE "gsec_blocks_membership_tiers_tiers" CASCADE;
  DROP TABLE "gsec_blocks_membership_tiers" CASCADE;
  DROP TABLE "gsec_blocks_portrait_feature" CASCADE;
  DROP TABLE "gsec_blocks_book_offer" CASCADE;
  DROP TABLE "_gsec_v_blocks_hero_spotlight" CASCADE;
  DROP TABLE "_gsec_v_blocks_course_rail_topics" CASCADE;
  DROP TABLE "_gsec_v_blocks_course_rail_courses" CASCADE;
  DROP TABLE "_gsec_v_blocks_course_rail" CASCADE;
  DROP TABLE "_gsec_v_blocks_membership_tiers_tiers_features" CASCADE;
  DROP TABLE "_gsec_v_blocks_membership_tiers_tiers" CASCADE;
  DROP TABLE "_gsec_v_blocks_membership_tiers" CASCADE;
  DROP TABLE "_gsec_v_blocks_portrait_feature" CASCADE;
  DROP TABLE "_gsec_v_blocks_book_offer" CASCADE;
  DROP TABLE "presets_blocks_hero_spotlight" CASCADE;
  DROP TABLE "presets_blocks_hero_spotlight_locales" CASCADE;
  DROP TABLE "presets_blocks_course_rail_topics" CASCADE;
  DROP TABLE "presets_blocks_course_rail_courses" CASCADE;
  DROP TABLE "presets_blocks_course_rail" CASCADE;
  DROP TABLE "presets_blocks_course_rail_locales" CASCADE;
  DROP TABLE "presets_blocks_membership_tiers_tiers_features" CASCADE;
  DROP TABLE "presets_blocks_membership_tiers_tiers" CASCADE;
  DROP TABLE "presets_blocks_membership_tiers" CASCADE;
  DROP TABLE "presets_blocks_membership_tiers_locales" CASCADE;
  DROP TABLE "presets_blocks_portrait_feature" CASCADE;
  DROP TABLE "presets_blocks_portrait_feature_locales" CASCADE;
  DROP TABLE "presets_blocks_book_offer" CASCADE;
  DROP TABLE "presets_blocks_book_offer_locales" CASCADE;
  ALTER TABLE "page" DROP COLUMN "_abvariantpercentages";
  ALTER TABLE "_page_v" DROP COLUMN "version__abvariantpercentages";
  DROP TYPE "public"."enum_page_blocks_hero_spotlight_cta_link_type";
  DROP TYPE "public"."enum_page_blocks_hero_spotlight_cta_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_hero_spotlight_background_focal_point";
  DROP TYPE "public"."enum_page_blocks_hero_spotlight_featured_card_link_type";
  DROP TYPE "public"."hero_spotlight_card_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_hero_spotlight_section_theme";
  DROP TYPE "public"."enum_page_blocks_hero_spotlight_section_max_width";
  DROP TYPE "public"."enum_page_blocks_hero_spotlight_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_hero_spotlight_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_course_rail_topics_link_type";
  DROP TYPE "public"."enum_page_blocks_course_rail_topics_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_course_rail_courses_link_type";
  DROP TYPE "public"."enum_page_blocks_course_rail_courses_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_course_rail_all_topics_link_type";
  DROP TYPE "public"."enum_page_blocks_course_rail_all_topics_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_course_rail_view_all_link_type";
  DROP TYPE "public"."enum_page_blocks_course_rail_view_all_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_course_rail_section_theme";
  DROP TYPE "public"."enum_page_blocks_course_rail_section_max_width";
  DROP TYPE "public"."enum_page_blocks_course_rail_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_course_rail_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_membership_tiers_tiers_emphasis";
  DROP TYPE "public"."enum_page_blocks_membership_tiers_tiers_link_type";
  DROP TYPE "public"."enum_page_blocks_membership_tiers_tiers_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_membership_tiers_billing_default_period";
  DROP TYPE "public"."enum_page_blocks_membership_tiers_section_theme";
  DROP TYPE "public"."enum_page_blocks_membership_tiers_section_max_width";
  DROP TYPE "public"."enum_page_blocks_membership_tiers_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_membership_tiers_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_portrait_feature_link_type";
  DROP TYPE "public"."enum_page_blocks_portrait_feature_link_custom_page";
  DROP TYPE "public"."enum_page_blocks_portrait_feature_section_theme";
  DROP TYPE "public"."enum_page_blocks_portrait_feature_section_max_width";
  DROP TYPE "public"."enum_page_blocks_portrait_feature_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_portrait_feature_section_padding_x";
  DROP TYPE "public"."enum_page_blocks_book_offer_section_theme";
  DROP TYPE "public"."enum_page_blocks_book_offer_section_max_width";
  DROP TYPE "public"."enum_page_blocks_book_offer_section_padding_y";
  DROP TYPE "public"."enum_page_blocks_book_offer_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_hero_spotlight_cta_link_type";
  DROP TYPE "public"."enum__page_v_blocks_hero_spotlight_cta_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_hero_spotlight_background_focal_point";
  DROP TYPE "public"."enum__page_v_blocks_hero_spotlight_featured_card_link_type";
  DROP TYPE "public"."enum__page_v_blocks_hero_spotlight_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_hero_spotlight_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_hero_spotlight_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_hero_spotlight_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_course_rail_topics_link_type";
  DROP TYPE "public"."enum__page_v_blocks_course_rail_topics_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_course_rail_courses_link_type";
  DROP TYPE "public"."enum__page_v_blocks_course_rail_courses_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_course_rail_all_topics_link_type";
  DROP TYPE "public"."enum__page_v_blocks_course_rail_all_topics_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_course_rail_view_all_link_type";
  DROP TYPE "public"."enum__page_v_blocks_course_rail_view_all_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_course_rail_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_course_rail_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_course_rail_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_course_rail_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_membership_tiers_tiers_emphasis";
  DROP TYPE "public"."enum__page_v_blocks_membership_tiers_tiers_link_type";
  DROP TYPE "public"."enum__page_v_blocks_membership_tiers_tiers_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_membership_tiers_billing_default_period";
  DROP TYPE "public"."enum__page_v_blocks_membership_tiers_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_membership_tiers_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_membership_tiers_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_membership_tiers_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_portrait_feature_link_type";
  DROP TYPE "public"."enum__page_v_blocks_portrait_feature_link_custom_page";
  DROP TYPE "public"."enum__page_v_blocks_portrait_feature_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_portrait_feature_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_portrait_feature_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_portrait_feature_section_padding_x";
  DROP TYPE "public"."enum__page_v_blocks_book_offer_section_theme";
  DROP TYPE "public"."enum__page_v_blocks_book_offer_section_max_width";
  DROP TYPE "public"."enum__page_v_blocks_book_offer_section_padding_y";
  DROP TYPE "public"."enum__page_v_blocks_book_offer_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_hero_spotlight_cta_link_type";
  DROP TYPE "public"."enum_gsec_blocks_hero_spotlight_cta_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_hero_spotlight_background_focal_point";
  DROP TYPE "public"."enum_gsec_blocks_hero_spotlight_featured_card_link_type";
  DROP TYPE "public"."enum_gsec_blocks_hero_spotlight_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_hero_spotlight_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_hero_spotlight_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_hero_spotlight_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_course_rail_topics_link_type";
  DROP TYPE "public"."enum_gsec_blocks_course_rail_topics_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_course_rail_courses_link_type";
  DROP TYPE "public"."enum_gsec_blocks_course_rail_courses_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_course_rail_all_topics_link_type";
  DROP TYPE "public"."enum_gsec_blocks_course_rail_all_topics_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_course_rail_view_all_link_type";
  DROP TYPE "public"."enum_gsec_blocks_course_rail_view_all_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_course_rail_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_course_rail_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_course_rail_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_course_rail_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_membership_tiers_tiers_emphasis";
  DROP TYPE "public"."enum_gsec_blocks_membership_tiers_tiers_link_type";
  DROP TYPE "public"."enum_gsec_blocks_membership_tiers_tiers_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_membership_tiers_billing_default_period";
  DROP TYPE "public"."enum_gsec_blocks_membership_tiers_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_membership_tiers_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_membership_tiers_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_membership_tiers_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_portrait_feature_link_type";
  DROP TYPE "public"."enum_gsec_blocks_portrait_feature_link_custom_page";
  DROP TYPE "public"."enum_gsec_blocks_portrait_feature_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_portrait_feature_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_portrait_feature_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_portrait_feature_section_padding_x";
  DROP TYPE "public"."enum_gsec_blocks_book_offer_section_theme";
  DROP TYPE "public"."enum_gsec_blocks_book_offer_section_max_width";
  DROP TYPE "public"."enum_gsec_blocks_book_offer_section_padding_y";
  DROP TYPE "public"."enum_gsec_blocks_book_offer_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_spotlight_cta_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_spotlight_cta_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_spotlight_background_focal_point";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_spotlight_featured_card_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_spotlight_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_spotlight_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_spotlight_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_hero_spotlight_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_course_rail_topics_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_course_rail_topics_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_course_rail_courses_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_course_rail_courses_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_course_rail_all_topics_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_course_rail_all_topics_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_course_rail_view_all_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_course_rail_view_all_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_course_rail_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_course_rail_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_course_rail_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_course_rail_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_membership_tiers_tiers_emphasis";
  DROP TYPE "public"."enum__gsec_v_blocks_membership_tiers_tiers_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_membership_tiers_tiers_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_membership_tiers_billing_default_period";
  DROP TYPE "public"."enum__gsec_v_blocks_membership_tiers_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_membership_tiers_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_membership_tiers_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_membership_tiers_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_portrait_feature_link_type";
  DROP TYPE "public"."enum__gsec_v_blocks_portrait_feature_link_custom_page";
  DROP TYPE "public"."enum__gsec_v_blocks_portrait_feature_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_portrait_feature_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_portrait_feature_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_portrait_feature_section_padding_x";
  DROP TYPE "public"."enum__gsec_v_blocks_book_offer_section_theme";
  DROP TYPE "public"."enum__gsec_v_blocks_book_offer_section_max_width";
  DROP TYPE "public"."enum__gsec_v_blocks_book_offer_section_padding_y";
  DROP TYPE "public"."enum__gsec_v_blocks_book_offer_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_hero_spotlight_cta_link_type";
  DROP TYPE "public"."enum_presets_blocks_hero_spotlight_cta_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_hero_spotlight_background_focal_point";
  DROP TYPE "public"."enum_presets_blocks_hero_spotlight_featured_card_link_type";
  DROP TYPE "public"."enum_presets_blocks_hero_spotlight_section_theme";
  DROP TYPE "public"."enum_presets_blocks_hero_spotlight_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_hero_spotlight_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_hero_spotlight_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_course_rail_topics_link_type";
  DROP TYPE "public"."enum_presets_blocks_course_rail_topics_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_course_rail_courses_link_type";
  DROP TYPE "public"."enum_presets_blocks_course_rail_courses_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_course_rail_all_topics_link_type";
  DROP TYPE "public"."enum_presets_blocks_course_rail_all_topics_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_course_rail_view_all_link_type";
  DROP TYPE "public"."enum_presets_blocks_course_rail_view_all_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_course_rail_section_theme";
  DROP TYPE "public"."enum_presets_blocks_course_rail_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_course_rail_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_course_rail_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_membership_tiers_tiers_emphasis";
  DROP TYPE "public"."enum_presets_blocks_membership_tiers_tiers_link_type";
  DROP TYPE "public"."enum_presets_blocks_membership_tiers_tiers_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_membership_tiers_billing_default_period";
  DROP TYPE "public"."enum_presets_blocks_membership_tiers_section_theme";
  DROP TYPE "public"."enum_presets_blocks_membership_tiers_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_membership_tiers_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_membership_tiers_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_portrait_feature_link_type";
  DROP TYPE "public"."enum_presets_blocks_portrait_feature_link_custom_page";
  DROP TYPE "public"."enum_presets_blocks_portrait_feature_section_theme";
  DROP TYPE "public"."enum_presets_blocks_portrait_feature_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_portrait_feature_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_portrait_feature_section_padding_x";
  DROP TYPE "public"."enum_presets_blocks_book_offer_section_theme";
  DROP TYPE "public"."enum_presets_blocks_book_offer_section_max_width";
  DROP TYPE "public"."enum_presets_blocks_book_offer_section_padding_y";
  DROP TYPE "public"."enum_presets_blocks_book_offer_section_padding_x";`)
}
