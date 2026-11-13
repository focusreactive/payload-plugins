import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_hero_video_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_page_blocks_hero_banner_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_page_blocks_logo_strip_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_page_blocks_icon_list_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_page_blocks_media_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_page_blocks_media_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum_page_blocks_media_text_size" AS ENUM('regular', 'full', 'small');
  CREATE TYPE "public"."enum_page_blocks_media_text_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_page_blocks_insurance_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_page_blocks_doc_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_page_blocks_doc_slider_bottom_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_page_blocks_rev_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_page_blocks_cond_grid_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_page_blocks_cond_grid_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_page_blocks_before_after_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_page_blocks_treat_cards_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_page_blocks_post_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_page_blocks_site_cta_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__page_v_blocks_hero_video_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__page_v_blocks_hero_banner_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__page_v_blocks_logo_strip_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__page_v_blocks_icon_list_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__page_v_blocks_media_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__page_v_blocks_media_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum__page_v_blocks_media_text_size" AS ENUM('regular', 'full', 'small');
  CREATE TYPE "public"."enum__page_v_blocks_media_text_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__page_v_blocks_insurance_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__page_v_blocks_doc_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__page_v_blocks_doc_slider_bottom_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__page_v_blocks_rev_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__page_v_blocks_cond_grid_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__page_v_blocks_cond_grid_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__page_v_blocks_before_after_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__page_v_blocks_treat_cards_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__page_v_blocks_post_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__page_v_blocks_site_cta_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_states_blocks_logo_strip_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_states_blocks_icon_list_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_states_blocks_media_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_states_blocks_media_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum_states_blocks_media_text_size" AS ENUM('regular', 'full', 'small');
  CREATE TYPE "public"."enum_states_blocks_media_text_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_states_blocks_insurance_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_states_blocks_doc_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_states_blocks_doc_slider_bottom_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_states_blocks_rev_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_states_blocks_cond_grid_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_states_blocks_cond_grid_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_states_blocks_before_after_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_states_blocks_treat_cards_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_states_blocks_post_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_states_blocks_site_cta_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_states_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_states_meta_robots" AS ENUM('index', 'noindex');
  CREATE TYPE "public"."enum__states_v_blocks_logo_strip_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__states_v_blocks_icon_list_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__states_v_blocks_media_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__states_v_blocks_media_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum__states_v_blocks_media_text_size" AS ENUM('regular', 'full', 'small');
  CREATE TYPE "public"."enum__states_v_blocks_media_text_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__states_v_blocks_insurance_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__states_v_blocks_doc_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__states_v_blocks_doc_slider_bottom_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__states_v_blocks_rev_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__states_v_blocks_cond_grid_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__states_v_blocks_cond_grid_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__states_v_blocks_before_after_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__states_v_blocks_treat_cards_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__states_v_blocks_post_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__states_v_blocks_site_cta_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__states_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__states_v_published_locale" AS ENUM('en', 'es');
  CREATE TYPE "public"."enum__states_v_version_meta_robots" AS ENUM('index', 'noindex');
  CREATE TYPE "public"."enum_clinics_blocks_logo_strip_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_clinics_blocks_icon_list_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_clinics_blocks_media_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_clinics_blocks_media_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum_clinics_blocks_media_text_size" AS ENUM('regular', 'full', 'small');
  CREATE TYPE "public"."enum_clinics_blocks_media_text_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_clinics_blocks_insurance_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_clinics_blocks_doc_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_clinics_blocks_doc_slider_bottom_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_clinics_blocks_rev_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_clinics_blocks_cond_grid_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_clinics_blocks_cond_grid_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_clinics_blocks_before_after_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_clinics_blocks_treat_cards_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_clinics_blocks_post_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_clinics_blocks_site_cta_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_clinics_hours_day" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
  CREATE TYPE "public"."enum_clinics_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_clinics_meta_robots" AS ENUM('index', 'noindex');
  CREATE TYPE "public"."enum__clinics_v_blocks_logo_strip_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__clinics_v_blocks_icon_list_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__clinics_v_blocks_media_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__clinics_v_blocks_media_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum__clinics_v_blocks_media_text_size" AS ENUM('regular', 'full', 'small');
  CREATE TYPE "public"."enum__clinics_v_blocks_media_text_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__clinics_v_blocks_insurance_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__clinics_v_blocks_doc_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__clinics_v_blocks_doc_slider_bottom_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__clinics_v_blocks_rev_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__clinics_v_blocks_cond_grid_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__clinics_v_blocks_cond_grid_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__clinics_v_blocks_before_after_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__clinics_v_blocks_treat_cards_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__clinics_v_blocks_post_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__clinics_v_blocks_site_cta_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__clinics_v_version_hours_day" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
  CREATE TYPE "public"."enum__clinics_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__clinics_v_published_locale" AS ENUM('en', 'es');
  CREATE TYPE "public"."enum__clinics_v_version_meta_robots" AS ENUM('index', 'noindex');
  CREATE TYPE "public"."enum_doctors_blocks_logo_strip_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_doctors_blocks_icon_list_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_doctors_blocks_media_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_doctors_blocks_media_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum_doctors_blocks_media_text_size" AS ENUM('regular', 'full', 'small');
  CREATE TYPE "public"."enum_doctors_blocks_media_text_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_doctors_blocks_insurance_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_doctors_blocks_doc_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_doctors_blocks_doc_slider_bottom_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_doctors_blocks_rev_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_doctors_blocks_cond_grid_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_doctors_blocks_cond_grid_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_doctors_blocks_before_after_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_doctors_blocks_treat_cards_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_doctors_blocks_post_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_doctors_blocks_site_cta_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_doctors_education_kind" AS ENUM('school', 'hospital');
  CREATE TYPE "public"."enum_doctors_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_doctors_meta_robots" AS ENUM('index', 'noindex');
  CREATE TYPE "public"."enum__doctors_v_blocks_logo_strip_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__doctors_v_blocks_icon_list_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__doctors_v_blocks_media_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__doctors_v_blocks_media_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum__doctors_v_blocks_media_text_size" AS ENUM('regular', 'full', 'small');
  CREATE TYPE "public"."enum__doctors_v_blocks_media_text_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__doctors_v_blocks_insurance_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__doctors_v_blocks_doc_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__doctors_v_blocks_doc_slider_bottom_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__doctors_v_blocks_rev_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__doctors_v_blocks_cond_grid_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__doctors_v_blocks_cond_grid_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__doctors_v_blocks_before_after_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__doctors_v_blocks_treat_cards_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__doctors_v_blocks_post_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__doctors_v_blocks_site_cta_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__doctors_v_version_education_kind" AS ENUM('school', 'hospital');
  CREATE TYPE "public"."enum__doctors_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__doctors_v_published_locale" AS ENUM('en', 'es');
  CREATE TYPE "public"."enum__doctors_v_version_meta_robots" AS ENUM('index', 'noindex');
  CREATE TYPE "public"."enum_treatments_blocks_logo_strip_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_treatments_blocks_icon_list_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_treatments_blocks_media_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_treatments_blocks_media_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum_treatments_blocks_media_text_size" AS ENUM('regular', 'full', 'small');
  CREATE TYPE "public"."enum_treatments_blocks_media_text_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_treatments_blocks_insurance_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_treatments_blocks_doc_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_treatments_blocks_doc_slider_bottom_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_treatments_blocks_rev_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_treatments_blocks_cond_grid_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_treatments_blocks_cond_grid_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_treatments_blocks_before_after_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_treatments_blocks_treat_cards_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_treatments_blocks_post_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_treatments_blocks_site_cta_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_treatments_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_treatments_meta_robots" AS ENUM('index', 'noindex');
  CREATE TYPE "public"."enum__treatments_v_blocks_logo_strip_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__treatments_v_blocks_icon_list_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__treatments_v_blocks_media_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__treatments_v_blocks_media_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum__treatments_v_blocks_media_text_size" AS ENUM('regular', 'full', 'small');
  CREATE TYPE "public"."enum__treatments_v_blocks_media_text_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__treatments_v_blocks_insurance_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__treatments_v_blocks_doc_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__treatments_v_blocks_doc_slider_bottom_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__treatments_v_blocks_rev_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__treatments_v_blocks_cond_grid_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__treatments_v_blocks_cond_grid_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__treatments_v_blocks_before_after_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__treatments_v_blocks_treat_cards_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__treatments_v_blocks_post_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__treatments_v_blocks_site_cta_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__treatments_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__treatments_v_published_locale" AS ENUM('en', 'es');
  CREATE TYPE "public"."enum__treatments_v_version_meta_robots" AS ENUM('index', 'noindex');
  CREATE TYPE "public"."enum_conditions_blocks_logo_strip_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_conditions_blocks_icon_list_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_conditions_blocks_media_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_conditions_blocks_media_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum_conditions_blocks_media_text_size" AS ENUM('regular', 'full', 'small');
  CREATE TYPE "public"."enum_conditions_blocks_media_text_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_conditions_blocks_insurance_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_conditions_blocks_doc_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_conditions_blocks_doc_slider_bottom_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_conditions_blocks_rev_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_conditions_blocks_cond_grid_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_conditions_blocks_cond_grid_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_conditions_blocks_before_after_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_conditions_blocks_treat_cards_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_conditions_blocks_post_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_conditions_blocks_site_cta_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_conditions_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_conditions_meta_robots" AS ENUM('index', 'noindex');
  CREATE TYPE "public"."enum__conditions_v_blocks_logo_strip_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__conditions_v_blocks_icon_list_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__conditions_v_blocks_media_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__conditions_v_blocks_media_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum__conditions_v_blocks_media_text_size" AS ENUM('regular', 'full', 'small');
  CREATE TYPE "public"."enum__conditions_v_blocks_media_text_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__conditions_v_blocks_insurance_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__conditions_v_blocks_doc_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__conditions_v_blocks_doc_slider_bottom_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__conditions_v_blocks_rev_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__conditions_v_blocks_cond_grid_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__conditions_v_blocks_cond_grid_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__conditions_v_blocks_before_after_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__conditions_v_blocks_treat_cards_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__conditions_v_blocks_post_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__conditions_v_blocks_site_cta_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__conditions_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__conditions_v_published_locale" AS ENUM('en', 'es');
  CREATE TYPE "public"."enum__conditions_v_version_meta_robots" AS ENUM('index', 'noindex');
  CREATE TYPE "public"."enum_header_more_links_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_header_announcement_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__header_v_version_more_links_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__header_v_version_announcement_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_footer_social_network" AS ENUM('facebook', 'youtube', 'instagram', 'tiktok', 'pinterest', 'twitter', 'linkedin');
  CREATE TYPE "public"."enum__footer_v_version_social_network" AS ENUM('facebook', 'youtube', 'instagram', 'tiktok', 'pinterest', 'twitter', 'linkedin');
  CREATE TYPE "public"."enum_presets_blocks_hero_video_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_presets_blocks_hero_banner_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_presets_blocks_logo_strip_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_presets_blocks_icon_list_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_presets_blocks_media_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_presets_blocks_media_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum_presets_blocks_media_text_size" AS ENUM('regular', 'full', 'small');
  CREATE TYPE "public"."enum_presets_blocks_media_text_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_presets_blocks_insurance_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_presets_blocks_doc_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_presets_blocks_doc_slider_bottom_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_presets_blocks_rev_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_presets_blocks_cond_grid_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_presets_blocks_cond_grid_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_presets_blocks_before_after_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_presets_blocks_treat_cards_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_presets_blocks_post_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_presets_blocks_site_cta_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TABLE "page_blocks_hero_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_page_blocks_hero_video_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"phone" varchar,
  	"phone_label" varchar,
  	"video_url" varchar,
  	"poster_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_hero_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"subheading" varchar,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_page_blocks_hero_banner_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_logo_strip_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "page_blocks_logo_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"background" "enum_page_blocks_logo_strip_background" DEFAULT 'none',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_icon_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "page_blocks_icon_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_page_blocks_icon_list_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_media_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_page_blocks_media_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"side" "enum_page_blocks_media_text_side" DEFAULT 'left',
  	"size" "enum_page_blocks_media_text_size" DEFAULT 'regular',
  	"background" "enum_page_blocks_media_text_background" DEFAULT 'none',
  	"image_id" integer,
  	"video_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_insurance_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "page_blocks_insurance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_page_blocks_insurance_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_doc_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_page_blocks_doc_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"bottom_button_text" varchar,
  	"bottom_button_link_kind" "enum_page_blocks_doc_slider_bottom_button_link_kind" DEFAULT 'internal',
  	"bottom_button_link_new_tab" boolean,
  	"bottom_button_link_path" varchar,
  	"bottom_button_link_url" varchar,
  	"image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_rev_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_page_blocks_rev_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_cond_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"list_heading" varchar,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_page_blocks_cond_grid_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"background" "enum_page_blocks_cond_grid_background" DEFAULT 'white',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_before_after_pairs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"before_id" integer,
  	"after_id" integer
  );
  
  CREATE TABLE "page_blocks_before_after" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_page_blocks_before_after_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_treat_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_page_blocks_treat_cards_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_post_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_page_blocks_post_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"limit" numeric DEFAULT 6,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_site_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_page_blocks_site_cta_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
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
  
  CREATE TABLE "_page_v_blocks_hero_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__page_v_blocks_hero_video_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"phone" varchar,
  	"phone_label" varchar,
  	"video_url" varchar,
  	"poster_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_hero_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"subheading" varchar,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__page_v_blocks_hero_banner_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_logo_strip_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_logo_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"background" "enum__page_v_blocks_logo_strip_background" DEFAULT 'none',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_icon_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_icon_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__page_v_blocks_icon_list_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_media_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__page_v_blocks_media_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"side" "enum__page_v_blocks_media_text_side" DEFAULT 'left',
  	"size" "enum__page_v_blocks_media_text_size" DEFAULT 'regular',
  	"background" "enum__page_v_blocks_media_text_background" DEFAULT 'none',
  	"image_id" integer,
  	"video_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_insurance_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_insurance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__page_v_blocks_insurance_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_doc_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__page_v_blocks_doc_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"bottom_button_text" varchar,
  	"bottom_button_link_kind" "enum__page_v_blocks_doc_slider_bottom_button_link_kind" DEFAULT 'internal',
  	"bottom_button_link_new_tab" boolean,
  	"bottom_button_link_path" varchar,
  	"bottom_button_link_url" varchar,
  	"image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_rev_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__page_v_blocks_rev_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_cond_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"list_heading" varchar,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__page_v_blocks_cond_grid_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"background" "enum__page_v_blocks_cond_grid_background" DEFAULT 'white',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_before_after_pairs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"before_id" integer,
  	"after_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_before_after" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__page_v_blocks_before_after_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_treat_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__page_v_blocks_treat_cards_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_post_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__page_v_blocks_post_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"limit" numeric DEFAULT 6,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_site_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__page_v_blocks_site_cta_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
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
  
  CREATE TABLE "states_blocks_logo_strip_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "states_blocks_logo_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"background" "enum_states_blocks_logo_strip_background" DEFAULT 'none',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "states_blocks_icon_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "states_blocks_icon_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_states_blocks_icon_list_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "states_blocks_media_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_states_blocks_media_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"side" "enum_states_blocks_media_text_side" DEFAULT 'left',
  	"size" "enum_states_blocks_media_text_size" DEFAULT 'regular',
  	"background" "enum_states_blocks_media_text_background" DEFAULT 'none',
  	"image_id" integer,
  	"video_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "states_blocks_insurance_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "states_blocks_insurance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_states_blocks_insurance_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "states_blocks_doc_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_states_blocks_doc_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"bottom_button_text" varchar,
  	"bottom_button_link_kind" "enum_states_blocks_doc_slider_bottom_button_link_kind" DEFAULT 'internal',
  	"bottom_button_link_new_tab" boolean,
  	"bottom_button_link_path" varchar,
  	"bottom_button_link_url" varchar,
  	"image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "states_blocks_rev_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_states_blocks_rev_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "states_blocks_cond_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"list_heading" varchar,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_states_blocks_cond_grid_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"background" "enum_states_blocks_cond_grid_background" DEFAULT 'white',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "states_blocks_before_after_pairs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"before_id" integer,
  	"after_id" integer
  );
  
  CREATE TABLE "states_blocks_before_after" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_states_blocks_before_after_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "states_blocks_treat_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_states_blocks_treat_cards_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "states_blocks_post_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_states_blocks_post_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"limit" numeric DEFAULT 6,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "states_blocks_site_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_states_blocks_site_cta_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "states" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"abbreviation" varchar,
  	"hero_image_id" integer,
  	"phone" varchar,
  	"rating_value" numeric,
  	"rating_count" numeric,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_states_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "states_locales" (
  	"hero_title" varchar,
  	"hero_intro" jsonb,
  	"meta_title" varchar,
  	"meta_image_id" integer,
  	"meta_description" varchar,
  	"meta_robots" "enum_states_meta_robots" DEFAULT 'index',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "states_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  CREATE TABLE "states_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locale" "_locales",
  	"page_id" integer,
  	"posts_id" integer,
  	"states_id" integer,
  	"clinics_id" integer,
  	"doctors_id" integer,
  	"treatments_id" integer,
  	"conditions_id" integer,
  	"testimonials_id" integer
  );
  
  CREATE TABLE "_states_v_blocks_logo_strip_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_states_v_blocks_logo_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"background" "enum__states_v_blocks_logo_strip_background" DEFAULT 'none',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_states_v_blocks_icon_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_states_v_blocks_icon_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__states_v_blocks_icon_list_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_states_v_blocks_media_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__states_v_blocks_media_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"side" "enum__states_v_blocks_media_text_side" DEFAULT 'left',
  	"size" "enum__states_v_blocks_media_text_size" DEFAULT 'regular',
  	"background" "enum__states_v_blocks_media_text_background" DEFAULT 'none',
  	"image_id" integer,
  	"video_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_states_v_blocks_insurance_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_states_v_blocks_insurance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__states_v_blocks_insurance_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_states_v_blocks_doc_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__states_v_blocks_doc_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"bottom_button_text" varchar,
  	"bottom_button_link_kind" "enum__states_v_blocks_doc_slider_bottom_button_link_kind" DEFAULT 'internal',
  	"bottom_button_link_new_tab" boolean,
  	"bottom_button_link_path" varchar,
  	"bottom_button_link_url" varchar,
  	"image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_states_v_blocks_rev_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__states_v_blocks_rev_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_states_v_blocks_cond_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"list_heading" varchar,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__states_v_blocks_cond_grid_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"background" "enum__states_v_blocks_cond_grid_background" DEFAULT 'white',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_states_v_blocks_before_after_pairs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"before_id" integer,
  	"after_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_states_v_blocks_before_after" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__states_v_blocks_before_after_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_states_v_blocks_treat_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__states_v_blocks_treat_cards_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_states_v_blocks_post_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__states_v_blocks_post_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"limit" numeric DEFAULT 6,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_states_v_blocks_site_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__states_v_blocks_site_cta_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_states_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_abbreviation" varchar,
  	"version_hero_image_id" integer,
  	"version_phone" varchar,
  	"version_rating_value" numeric,
  	"version_rating_count" numeric,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__states_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__states_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_states_v_locales" (
  	"version_hero_title" varchar,
  	"version_hero_intro" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_image_id" integer,
  	"version_meta_description" varchar,
  	"version_meta_robots" "enum__states_v_version_meta_robots" DEFAULT 'index',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_states_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  CREATE TABLE "_states_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locale" "_locales",
  	"page_id" integer,
  	"posts_id" integer,
  	"states_id" integer,
  	"clinics_id" integer,
  	"doctors_id" integer,
  	"treatments_id" integer,
  	"conditions_id" integer,
  	"testimonials_id" integer
  );
  
  CREATE TABLE "clinics_blocks_logo_strip_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "clinics_blocks_logo_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"background" "enum_clinics_blocks_logo_strip_background" DEFAULT 'none',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_blocks_icon_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "clinics_blocks_icon_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_clinics_blocks_icon_list_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_blocks_media_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_clinics_blocks_media_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"side" "enum_clinics_blocks_media_text_side" DEFAULT 'left',
  	"size" "enum_clinics_blocks_media_text_size" DEFAULT 'regular',
  	"background" "enum_clinics_blocks_media_text_background" DEFAULT 'none',
  	"image_id" integer,
  	"video_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_blocks_insurance_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "clinics_blocks_insurance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_clinics_blocks_insurance_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_blocks_doc_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_clinics_blocks_doc_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"bottom_button_text" varchar,
  	"bottom_button_link_kind" "enum_clinics_blocks_doc_slider_bottom_button_link_kind" DEFAULT 'internal',
  	"bottom_button_link_new_tab" boolean,
  	"bottom_button_link_path" varchar,
  	"bottom_button_link_url" varchar,
  	"image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_blocks_rev_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_clinics_blocks_rev_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_blocks_cond_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"list_heading" varchar,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_clinics_blocks_cond_grid_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"background" "enum_clinics_blocks_cond_grid_background" DEFAULT 'white',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_blocks_before_after_pairs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"before_id" integer,
  	"after_id" integer
  );
  
  CREATE TABLE "clinics_blocks_before_after" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_clinics_blocks_before_after_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_blocks_treat_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_clinics_blocks_treat_cards_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_blocks_post_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_clinics_blocks_post_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"limit" numeric DEFAULT 6,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_blocks_site_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_clinics_blocks_site_cta_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_hours" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"day" "enum_clinics_hours_day",
  	"opens" varchar,
  	"closes" varchar,
  	"closed" boolean DEFAULT false
  );
  
  CREATE TABLE "clinics" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"photo_id" integer,
  	"phone" varchar,
  	"address_street" varchar,
  	"address_city" varchar,
  	"address_region" varchar,
  	"address_postal_code" varchar,
  	"map_url" varchar,
  	"geo_latitude" numeric,
  	"geo_longitude" numeric,
  	"rating_value" numeric,
  	"rating_count" numeric,
  	"slug" varchar,
  	"state_id" integer,
  	"accredited" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_clinics_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "clinics_locales" (
  	"hero_title" varchar,
  	"hero_subtitle" varchar,
  	"description" varchar,
  	"meta_title" varchar,
  	"meta_image_id" integer,
  	"meta_description" varchar,
  	"meta_robots" "enum_clinics_meta_robots" DEFAULT 'index',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "clinics_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  CREATE TABLE "clinics_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locale" "_locales",
  	"page_id" integer,
  	"posts_id" integer,
  	"states_id" integer,
  	"clinics_id" integer,
  	"doctors_id" integer,
  	"treatments_id" integer,
  	"conditions_id" integer,
  	"testimonials_id" integer
  );
  
  CREATE TABLE "_clinics_v_blocks_logo_strip_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_logo_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"background" "enum__clinics_v_blocks_logo_strip_background" DEFAULT 'none',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_icon_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_icon_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__clinics_v_blocks_icon_list_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_media_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__clinics_v_blocks_media_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"side" "enum__clinics_v_blocks_media_text_side" DEFAULT 'left',
  	"size" "enum__clinics_v_blocks_media_text_size" DEFAULT 'regular',
  	"background" "enum__clinics_v_blocks_media_text_background" DEFAULT 'none',
  	"image_id" integer,
  	"video_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_insurance_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_insurance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__clinics_v_blocks_insurance_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_doc_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__clinics_v_blocks_doc_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"bottom_button_text" varchar,
  	"bottom_button_link_kind" "enum__clinics_v_blocks_doc_slider_bottom_button_link_kind" DEFAULT 'internal',
  	"bottom_button_link_new_tab" boolean,
  	"bottom_button_link_path" varchar,
  	"bottom_button_link_url" varchar,
  	"image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_rev_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__clinics_v_blocks_rev_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_cond_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"list_heading" varchar,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__clinics_v_blocks_cond_grid_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"background" "enum__clinics_v_blocks_cond_grid_background" DEFAULT 'white',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_before_after_pairs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"before_id" integer,
  	"after_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_before_after" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__clinics_v_blocks_before_after_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_treat_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__clinics_v_blocks_treat_cards_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_post_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__clinics_v_blocks_post_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"limit" numeric DEFAULT 6,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_site_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__clinics_v_blocks_site_cta_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_clinics_v_version_hours" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"day" "enum__clinics_v_version_hours_day",
  	"opens" varchar,
  	"closes" varchar,
  	"closed" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_clinics_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_photo_id" integer,
  	"version_phone" varchar,
  	"version_address_street" varchar,
  	"version_address_city" varchar,
  	"version_address_region" varchar,
  	"version_address_postal_code" varchar,
  	"version_map_url" varchar,
  	"version_geo_latitude" numeric,
  	"version_geo_longitude" numeric,
  	"version_rating_value" numeric,
  	"version_rating_count" numeric,
  	"version_slug" varchar,
  	"version_state_id" integer,
  	"version_accredited" boolean DEFAULT true,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__clinics_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__clinics_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_clinics_v_locales" (
  	"version_hero_title" varchar,
  	"version_hero_subtitle" varchar,
  	"version_description" varchar,
  	"version_meta_title" varchar,
  	"version_meta_image_id" integer,
  	"version_meta_description" varchar,
  	"version_meta_robots" "enum__clinics_v_version_meta_robots" DEFAULT 'index',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_clinics_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  CREATE TABLE "_clinics_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locale" "_locales",
  	"page_id" integer,
  	"posts_id" integer,
  	"states_id" integer,
  	"clinics_id" integer,
  	"doctors_id" integer,
  	"treatments_id" integer,
  	"conditions_id" integer,
  	"testimonials_id" integer
  );
  
  CREATE TABLE "doctors_blocks_logo_strip_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "doctors_blocks_logo_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"background" "enum_doctors_blocks_logo_strip_background" DEFAULT 'none',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_blocks_icon_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "doctors_blocks_icon_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_doctors_blocks_icon_list_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_blocks_media_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_doctors_blocks_media_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"side" "enum_doctors_blocks_media_text_side" DEFAULT 'left',
  	"size" "enum_doctors_blocks_media_text_size" DEFAULT 'regular',
  	"background" "enum_doctors_blocks_media_text_background" DEFAULT 'none',
  	"image_id" integer,
  	"video_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_blocks_insurance_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "doctors_blocks_insurance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_doctors_blocks_insurance_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_blocks_doc_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_doctors_blocks_doc_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"bottom_button_text" varchar,
  	"bottom_button_link_kind" "enum_doctors_blocks_doc_slider_bottom_button_link_kind" DEFAULT 'internal',
  	"bottom_button_link_new_tab" boolean,
  	"bottom_button_link_path" varchar,
  	"bottom_button_link_url" varchar,
  	"image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_blocks_rev_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_doctors_blocks_rev_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_blocks_cond_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"list_heading" varchar,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_doctors_blocks_cond_grid_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"background" "enum_doctors_blocks_cond_grid_background" DEFAULT 'white',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_blocks_before_after_pairs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"before_id" integer,
  	"after_id" integer
  );
  
  CREATE TABLE "doctors_blocks_before_after" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_doctors_blocks_before_after_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_blocks_treat_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_doctors_blocks_treat_cards_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_blocks_post_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_doctors_blocks_post_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"limit" numeric DEFAULT 6,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_blocks_site_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_doctors_blocks_site_cta_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_education" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"kind" "enum_doctors_education_kind" DEFAULT 'school'
  );
  
  CREATE TABLE "doctors" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"photo_id" integer,
  	"hero_image_id" integer,
  	"npi" varchar,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_doctors_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "doctors_locales" (
  	"job_title" varchar,
  	"featured_label" varchar,
  	"bio" jsonb,
  	"meta_title" varchar,
  	"meta_image_id" integer,
  	"meta_description" varchar,
  	"meta_robots" "enum_doctors_meta_robots" DEFAULT 'index',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "doctors_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  CREATE TABLE "doctors_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locale" "_locales",
  	"page_id" integer,
  	"posts_id" integer,
  	"states_id" integer,
  	"clinics_id" integer,
  	"doctors_id" integer,
  	"treatments_id" integer,
  	"conditions_id" integer,
  	"testimonials_id" integer
  );
  
  CREATE TABLE "_doctors_v_blocks_logo_strip_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_logo_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"background" "enum__doctors_v_blocks_logo_strip_background" DEFAULT 'none',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_icon_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_icon_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__doctors_v_blocks_icon_list_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_media_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__doctors_v_blocks_media_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"side" "enum__doctors_v_blocks_media_text_side" DEFAULT 'left',
  	"size" "enum__doctors_v_blocks_media_text_size" DEFAULT 'regular',
  	"background" "enum__doctors_v_blocks_media_text_background" DEFAULT 'none',
  	"image_id" integer,
  	"video_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_insurance_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_insurance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__doctors_v_blocks_insurance_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_doc_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__doctors_v_blocks_doc_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"bottom_button_text" varchar,
  	"bottom_button_link_kind" "enum__doctors_v_blocks_doc_slider_bottom_button_link_kind" DEFAULT 'internal',
  	"bottom_button_link_new_tab" boolean,
  	"bottom_button_link_path" varchar,
  	"bottom_button_link_url" varchar,
  	"image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_rev_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__doctors_v_blocks_rev_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_cond_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"list_heading" varchar,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__doctors_v_blocks_cond_grid_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"background" "enum__doctors_v_blocks_cond_grid_background" DEFAULT 'white',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_before_after_pairs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"before_id" integer,
  	"after_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_before_after" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__doctors_v_blocks_before_after_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_treat_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__doctors_v_blocks_treat_cards_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_post_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__doctors_v_blocks_post_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"limit" numeric DEFAULT 6,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_site_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__doctors_v_blocks_site_cta_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_doctors_v_version_education" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"kind" "enum__doctors_v_version_education_kind" DEFAULT 'school',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_doctors_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_photo_id" integer,
  	"version_hero_image_id" integer,
  	"version_npi" varchar,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__doctors_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__doctors_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_doctors_v_locales" (
  	"version_job_title" varchar,
  	"version_featured_label" varchar,
  	"version_bio" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_image_id" integer,
  	"version_meta_description" varchar,
  	"version_meta_robots" "enum__doctors_v_version_meta_robots" DEFAULT 'index',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_doctors_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  CREATE TABLE "_doctors_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locale" "_locales",
  	"page_id" integer,
  	"posts_id" integer,
  	"states_id" integer,
  	"clinics_id" integer,
  	"doctors_id" integer,
  	"treatments_id" integer,
  	"conditions_id" integer,
  	"testimonials_id" integer
  );
  
  CREATE TABLE "treatments_blocks_logo_strip_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "treatments_blocks_logo_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"background" "enum_treatments_blocks_logo_strip_background" DEFAULT 'none',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments_blocks_icon_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "treatments_blocks_icon_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_treatments_blocks_icon_list_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments_blocks_media_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_treatments_blocks_media_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"side" "enum_treatments_blocks_media_text_side" DEFAULT 'left',
  	"size" "enum_treatments_blocks_media_text_size" DEFAULT 'regular',
  	"background" "enum_treatments_blocks_media_text_background" DEFAULT 'none',
  	"image_id" integer,
  	"video_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments_blocks_insurance_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "treatments_blocks_insurance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_treatments_blocks_insurance_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments_blocks_doc_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_treatments_blocks_doc_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"bottom_button_text" varchar,
  	"bottom_button_link_kind" "enum_treatments_blocks_doc_slider_bottom_button_link_kind" DEFAULT 'internal',
  	"bottom_button_link_new_tab" boolean,
  	"bottom_button_link_path" varchar,
  	"bottom_button_link_url" varchar,
  	"image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments_blocks_rev_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_treatments_blocks_rev_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments_blocks_cond_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"list_heading" varchar,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_treatments_blocks_cond_grid_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"background" "enum_treatments_blocks_cond_grid_background" DEFAULT 'white',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments_blocks_before_after_pairs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"before_id" integer,
  	"after_id" integer
  );
  
  CREATE TABLE "treatments_blocks_before_after" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_treatments_blocks_before_after_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments_blocks_treat_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_treatments_blocks_treat_cards_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments_blocks_post_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_treatments_blocks_post_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"limit" numeric DEFAULT 6,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments_blocks_site_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_treatments_blocks_site_cta_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"card_image_id" integer,
  	"hero_image_id" integer,
  	"slug" varchar,
  	"list_order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_treatments_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "treatments_locales" (
  	"title" varchar,
  	"summary" varchar,
  	"hero_title" varchar,
  	"hero_intro" jsonb,
  	"meta_title" varchar,
  	"meta_image_id" integer,
  	"meta_description" varchar,
  	"meta_robots" "enum_treatments_meta_robots" DEFAULT 'index',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "treatments_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  CREATE TABLE "treatments_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locale" "_locales",
  	"page_id" integer,
  	"posts_id" integer,
  	"states_id" integer,
  	"clinics_id" integer,
  	"doctors_id" integer,
  	"treatments_id" integer,
  	"conditions_id" integer,
  	"testimonials_id" integer
  );
  
  CREATE TABLE "_treatments_v_blocks_logo_strip_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_logo_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"background" "enum__treatments_v_blocks_logo_strip_background" DEFAULT 'none',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_icon_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_icon_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__treatments_v_blocks_icon_list_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_media_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__treatments_v_blocks_media_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"side" "enum__treatments_v_blocks_media_text_side" DEFAULT 'left',
  	"size" "enum__treatments_v_blocks_media_text_size" DEFAULT 'regular',
  	"background" "enum__treatments_v_blocks_media_text_background" DEFAULT 'none',
  	"image_id" integer,
  	"video_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_insurance_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_insurance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__treatments_v_blocks_insurance_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_doc_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__treatments_v_blocks_doc_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"bottom_button_text" varchar,
  	"bottom_button_link_kind" "enum__treatments_v_blocks_doc_slider_bottom_button_link_kind" DEFAULT 'internal',
  	"bottom_button_link_new_tab" boolean,
  	"bottom_button_link_path" varchar,
  	"bottom_button_link_url" varchar,
  	"image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_rev_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__treatments_v_blocks_rev_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_cond_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"list_heading" varchar,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__treatments_v_blocks_cond_grid_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"background" "enum__treatments_v_blocks_cond_grid_background" DEFAULT 'white',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_before_after_pairs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"before_id" integer,
  	"after_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_before_after" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__treatments_v_blocks_before_after_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_treat_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__treatments_v_blocks_treat_cards_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_post_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__treatments_v_blocks_post_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"limit" numeric DEFAULT 6,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_site_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__treatments_v_blocks_site_cta_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_treatments_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_card_image_id" integer,
  	"version_hero_image_id" integer,
  	"version_slug" varchar,
  	"version_list_order" numeric DEFAULT 100,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__treatments_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__treatments_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_treatments_v_locales" (
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_hero_title" varchar,
  	"version_hero_intro" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_image_id" integer,
  	"version_meta_description" varchar,
  	"version_meta_robots" "enum__treatments_v_version_meta_robots" DEFAULT 'index',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_treatments_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  CREATE TABLE "_treatments_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locale" "_locales",
  	"page_id" integer,
  	"posts_id" integer,
  	"states_id" integer,
  	"clinics_id" integer,
  	"doctors_id" integer,
  	"treatments_id" integer,
  	"conditions_id" integer,
  	"testimonials_id" integer
  );
  
  CREATE TABLE "conditions_blocks_logo_strip_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "conditions_blocks_logo_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"background" "enum_conditions_blocks_logo_strip_background" DEFAULT 'none',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions_blocks_icon_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"title" varchar,
  	"text" varchar
  );
  
  CREATE TABLE "conditions_blocks_icon_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_conditions_blocks_icon_list_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions_blocks_media_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_conditions_blocks_media_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"side" "enum_conditions_blocks_media_text_side" DEFAULT 'left',
  	"size" "enum_conditions_blocks_media_text_size" DEFAULT 'regular',
  	"background" "enum_conditions_blocks_media_text_background" DEFAULT 'none',
  	"image_id" integer,
  	"video_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions_blocks_insurance_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "conditions_blocks_insurance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_conditions_blocks_insurance_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions_blocks_doc_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_conditions_blocks_doc_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"bottom_button_text" varchar,
  	"bottom_button_link_kind" "enum_conditions_blocks_doc_slider_bottom_button_link_kind" DEFAULT 'internal',
  	"bottom_button_link_new_tab" boolean,
  	"bottom_button_link_path" varchar,
  	"bottom_button_link_url" varchar,
  	"image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions_blocks_rev_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_conditions_blocks_rev_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions_blocks_cond_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"list_heading" varchar,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_conditions_blocks_cond_grid_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"background" "enum_conditions_blocks_cond_grid_background" DEFAULT 'white',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions_blocks_before_after_pairs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"before_id" integer,
  	"after_id" integer
  );
  
  CREATE TABLE "conditions_blocks_before_after" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_conditions_blocks_before_after_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions_blocks_treat_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_conditions_blocks_treat_cards_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions_blocks_post_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_conditions_blocks_post_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"limit" numeric DEFAULT 6,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions_blocks_site_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_conditions_blocks_site_cta_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"hero_image_id" integer,
  	"slug" varchar,
  	"list_order" numeric DEFAULT 100,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_conditions_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "conditions_locales" (
  	"title" varchar,
  	"hero_title" varchar,
  	"hero_intro" jsonb,
  	"meta_title" varchar,
  	"meta_image_id" integer,
  	"meta_description" varchar,
  	"meta_robots" "enum_conditions_meta_robots" DEFAULT 'index',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "conditions_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  CREATE TABLE "conditions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locale" "_locales",
  	"page_id" integer,
  	"posts_id" integer,
  	"states_id" integer,
  	"clinics_id" integer,
  	"doctors_id" integer,
  	"treatments_id" integer,
  	"conditions_id" integer,
  	"testimonials_id" integer
  );
  
  CREATE TABLE "_conditions_v_blocks_logo_strip_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_logo_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"background" "enum__conditions_v_blocks_logo_strip_background" DEFAULT 'none',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_icon_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"title" varchar,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_icon_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__conditions_v_blocks_icon_list_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_media_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__conditions_v_blocks_media_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"side" "enum__conditions_v_blocks_media_text_side" DEFAULT 'left',
  	"size" "enum__conditions_v_blocks_media_text_size" DEFAULT 'regular',
  	"background" "enum__conditions_v_blocks_media_text_background" DEFAULT 'none',
  	"image_id" integer,
  	"video_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_insurance_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_insurance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__conditions_v_blocks_insurance_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_doc_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__conditions_v_blocks_doc_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"bottom_button_text" varchar,
  	"bottom_button_link_kind" "enum__conditions_v_blocks_doc_slider_bottom_button_link_kind" DEFAULT 'internal',
  	"bottom_button_link_new_tab" boolean,
  	"bottom_button_link_path" varchar,
  	"bottom_button_link_url" varchar,
  	"image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_rev_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__conditions_v_blocks_rev_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_cond_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"list_heading" varchar,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__conditions_v_blocks_cond_grid_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"background" "enum__conditions_v_blocks_cond_grid_background" DEFAULT 'white',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_before_after_pairs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"before_id" integer,
  	"after_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_before_after" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__conditions_v_blocks_before_after_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_treat_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__conditions_v_blocks_treat_cards_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_post_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__conditions_v_blocks_post_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"limit" numeric DEFAULT 6,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_site_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__conditions_v_blocks_site_cta_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_conditions_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_icon_id" integer,
  	"version_hero_image_id" integer,
  	"version_slug" varchar,
  	"version_list_order" numeric DEFAULT 100,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__conditions_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__conditions_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_conditions_v_locales" (
  	"version_title" varchar,
  	"version_hero_title" varchar,
  	"version_hero_intro" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_image_id" integer,
  	"version_meta_description" varchar,
  	"version_meta_robots" "enum__conditions_v_version_meta_robots" DEFAULT 'index',
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_conditions_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  CREATE TABLE "_conditions_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"locale" "_locales",
  	"page_id" integer,
  	"posts_id" integer,
  	"states_id" integer,
  	"clinics_id" integer,
  	"doctors_id" integer,
  	"treatments_id" integer,
  	"conditions_id" integer,
  	"testimonials_id" integer
  );
  
  CREATE TABLE "header_more_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_kind" "enum_header_more_links_link_kind" DEFAULT 'internal',
  	"link_new_tab" boolean,
  	"link_path" varchar,
  	"link_url" varchar
  );
  
  CREATE TABLE "header_more_links_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "_header_v_version_more_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_kind" "enum__header_v_version_more_links_link_kind" DEFAULT 'internal',
  	"link_new_tab" boolean,
  	"link_path" varchar,
  	"link_url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_header_v_version_more_links_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "footer_social" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"network" "enum_footer_social_network",
  	"url" varchar
  );
  
  CREATE TABLE "_footer_v_version_social" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"network" "enum__footer_v_version_social_network",
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "presets_blocks_hero_video" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb NOT NULL,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_presets_blocks_hero_video_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"phone" varchar,
  	"phone_label" varchar,
  	"video_url" varchar,
  	"poster_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_hero_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb NOT NULL,
  	"subheading" varchar,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_presets_blocks_hero_banner_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_logo_strip_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "presets_blocks_logo_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"background" "enum_presets_blocks_logo_strip_background" DEFAULT 'none',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_icon_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"title" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "presets_blocks_icon_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_presets_blocks_icon_list_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_media_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_presets_blocks_media_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"side" "enum_presets_blocks_media_text_side" DEFAULT 'left',
  	"size" "enum_presets_blocks_media_text_size" DEFAULT 'regular',
  	"background" "enum_presets_blocks_media_text_background" DEFAULT 'none',
  	"image_id" integer,
  	"video_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_insurance_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "presets_blocks_insurance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_presets_blocks_insurance_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_doc_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_presets_blocks_doc_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"bottom_button_text" varchar,
  	"bottom_button_link_kind" "enum_presets_blocks_doc_slider_bottom_button_link_kind" DEFAULT 'internal',
  	"bottom_button_link_new_tab" boolean,
  	"bottom_button_link_path" varchar,
  	"bottom_button_link_url" varchar,
  	"image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_rev_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_presets_blocks_rev_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_cond_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"list_heading" varchar,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_presets_blocks_cond_grid_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"background" "enum_presets_blocks_cond_grid_background" DEFAULT 'white',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_before_after_pairs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"before_id" integer NOT NULL,
  	"after_id" integer NOT NULL
  );
  
  CREATE TABLE "presets_blocks_before_after" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_presets_blocks_before_after_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_treat_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_presets_blocks_treat_cards_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_post_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_presets_blocks_post_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"limit" numeric DEFAULT 6,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_site_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_presets_blocks_site_cta_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  ALTER TABLE "page_rels" ADD COLUMN "states_id" integer;
  ALTER TABLE "page_rels" ADD COLUMN "clinics_id" integer;
  ALTER TABLE "page_rels" ADD COLUMN "doctors_id" integer;
  ALTER TABLE "page_rels" ADD COLUMN "treatments_id" integer;
  ALTER TABLE "page_rels" ADD COLUMN "conditions_id" integer;
  ALTER TABLE "page_rels" ADD COLUMN "testimonials_id" integer;
  ALTER TABLE "_page_v_rels" ADD COLUMN "states_id" integer;
  ALTER TABLE "_page_v_rels" ADD COLUMN "clinics_id" integer;
  ALTER TABLE "_page_v_rels" ADD COLUMN "doctors_id" integer;
  ALTER TABLE "_page_v_rels" ADD COLUMN "treatments_id" integer;
  ALTER TABLE "_page_v_rels" ADD COLUMN "conditions_id" integer;
  ALTER TABLE "_page_v_rels" ADD COLUMN "testimonials_id" integer;
  ALTER TABLE "posts" ADD COLUMN "reviewed_by_id" integer;
  ALTER TABLE "_posts_v" ADD COLUMN "version_reviewed_by_id" integer;
  ALTER TABLE "testimonials" ADD COLUMN "place" varchar;
  ALTER TABLE "testimonials" ADD COLUMN "clinic_id" integer;
  ALTER TABLE "testimonials" ADD COLUMN "source_logo_id" integer;
  ALTER TABLE "header" ADD COLUMN "mobile_logo_id" integer;
  ALTER TABLE "header" ADD COLUMN "announcement_link_kind" "enum_header_announcement_link_kind" DEFAULT 'internal';
  ALTER TABLE "header" ADD COLUMN "announcement_link_new_tab" boolean;
  ALTER TABLE "header" ADD COLUMN "announcement_link_path" varchar;
  ALTER TABLE "header" ADD COLUMN "announcement_link_url" varchar;
  ALTER TABLE "header" ADD COLUMN "phone" varchar;
  ALTER TABLE "header_locales" ADD COLUMN "announcement_text" varchar;
  ALTER TABLE "header_locales" ADD COLUMN "phone_label" varchar;
  ALTER TABLE "header_locales" ADD COLUMN "locations_label" varchar;
  ALTER TABLE "header_rels" ADD COLUMN "states_id" integer;
  ALTER TABLE "header_rels" ADD COLUMN "clinics_id" integer;
  ALTER TABLE "header_rels" ADD COLUMN "doctors_id" integer;
  ALTER TABLE "header_rels" ADD COLUMN "treatments_id" integer;
  ALTER TABLE "header_rels" ADD COLUMN "conditions_id" integer;
  ALTER TABLE "_header_v" ADD COLUMN "version_mobile_logo_id" integer;
  ALTER TABLE "_header_v" ADD COLUMN "version_announcement_link_kind" "enum__header_v_version_announcement_link_kind" DEFAULT 'internal';
  ALTER TABLE "_header_v" ADD COLUMN "version_announcement_link_new_tab" boolean;
  ALTER TABLE "_header_v" ADD COLUMN "version_announcement_link_path" varchar;
  ALTER TABLE "_header_v" ADD COLUMN "version_announcement_link_url" varchar;
  ALTER TABLE "_header_v" ADD COLUMN "version_phone" varchar;
  ALTER TABLE "_header_v_locales" ADD COLUMN "version_announcement_text" varchar;
  ALTER TABLE "_header_v_locales" ADD COLUMN "version_phone_label" varchar;
  ALTER TABLE "_header_v_locales" ADD COLUMN "version_locations_label" varchar;
  ALTER TABLE "_header_v_rels" ADD COLUMN "states_id" integer;
  ALTER TABLE "_header_v_rels" ADD COLUMN "clinics_id" integer;
  ALTER TABLE "_header_v_rels" ADD COLUMN "doctors_id" integer;
  ALTER TABLE "_header_v_rels" ADD COLUMN "treatments_id" integer;
  ALTER TABLE "_header_v_rels" ADD COLUMN "conditions_id" integer;
  ALTER TABLE "footer" ADD COLUMN "phone" varchar;
  ALTER TABLE "footer" ADD COLUMN "newsletter_image_id" integer;
  ALTER TABLE "footer" ADD COLUMN "newsletter_mobile_image_id" integer;
  ALTER TABLE "footer_locales" ADD COLUMN "locations_heading" varchar;
  ALTER TABLE "footer_locales" ADD COLUMN "about_heading" varchar;
  ALTER TABLE "footer_locales" ADD COLUMN "about_text" jsonb;
  ALTER TABLE "footer_locales" ADD COLUMN "disclaimer_heading" varchar;
  ALTER TABLE "footer_locales" ADD COLUMN "disclaimer_text" varchar;
  ALTER TABLE "footer_locales" ADD COLUMN "newsletter_title" jsonb;
  ALTER TABLE "footer_locales" ADD COLUMN "newsletter_text" varchar;
  ALTER TABLE "footer_locales" ADD COLUMN "newsletter_button_text" varchar;
  ALTER TABLE "_footer_v" ADD COLUMN "version_phone" varchar;
  ALTER TABLE "_footer_v" ADD COLUMN "version_newsletter_image_id" integer;
  ALTER TABLE "_footer_v" ADD COLUMN "version_newsletter_mobile_image_id" integer;
  ALTER TABLE "_footer_v_locales" ADD COLUMN "version_locations_heading" varchar;
  ALTER TABLE "_footer_v_locales" ADD COLUMN "version_about_heading" varchar;
  ALTER TABLE "_footer_v_locales" ADD COLUMN "version_about_text" jsonb;
  ALTER TABLE "_footer_v_locales" ADD COLUMN "version_disclaimer_heading" varchar;
  ALTER TABLE "_footer_v_locales" ADD COLUMN "version_disclaimer_text" varchar;
  ALTER TABLE "_footer_v_locales" ADD COLUMN "version_newsletter_title" jsonb;
  ALTER TABLE "_footer_v_locales" ADD COLUMN "version_newsletter_text" varchar;
  ALTER TABLE "_footer_v_locales" ADD COLUMN "version_newsletter_button_text" varchar;
  ALTER TABLE "presets_rels" ADD COLUMN "states_id" integer;
  ALTER TABLE "presets_rels" ADD COLUMN "clinics_id" integer;
  ALTER TABLE "presets_rels" ADD COLUMN "doctors_id" integer;
  ALTER TABLE "presets_rels" ADD COLUMN "treatments_id" integer;
  ALTER TABLE "presets_rels" ADD COLUMN "conditions_id" integer;
  ALTER TABLE "presets_rels" ADD COLUMN "testimonials_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "states_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "clinics_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "doctors_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "treatments_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "conditions_id" integer;
  ALTER TABLE "page_blocks_hero_video" ADD CONSTRAINT "page_blocks_hero_video_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_hero_video" ADD CONSTRAINT "page_blocks_hero_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_hero_banner" ADD CONSTRAINT "page_blocks_hero_banner_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_hero_banner" ADD CONSTRAINT "page_blocks_hero_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_logo_strip_logos" ADD CONSTRAINT "page_blocks_logo_strip_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_logo_strip_logos" ADD CONSTRAINT "page_blocks_logo_strip_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_logo_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_logo_strip" ADD CONSTRAINT "page_blocks_logo_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_icon_list_items" ADD CONSTRAINT "page_blocks_icon_list_items_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_icon_list_items" ADD CONSTRAINT "page_blocks_icon_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_icon_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_icon_list" ADD CONSTRAINT "page_blocks_icon_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_media_text" ADD CONSTRAINT "page_blocks_media_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_media_text" ADD CONSTRAINT "page_blocks_media_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_insurance_logos" ADD CONSTRAINT "page_blocks_insurance_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_insurance_logos" ADD CONSTRAINT "page_blocks_insurance_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_insurance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_insurance" ADD CONSTRAINT "page_blocks_insurance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_doc_slider" ADD CONSTRAINT "page_blocks_doc_slider_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_doc_slider" ADD CONSTRAINT "page_blocks_doc_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_rev_slider" ADD CONSTRAINT "page_blocks_rev_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_cond_grid" ADD CONSTRAINT "page_blocks_cond_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_before_after_pairs" ADD CONSTRAINT "page_blocks_before_after_pairs_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_before_after_pairs" ADD CONSTRAINT "page_blocks_before_after_pairs_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_before_after_pairs" ADD CONSTRAINT "page_blocks_before_after_pairs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_before_after"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_before_after" ADD CONSTRAINT "page_blocks_before_after_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_treat_cards" ADD CONSTRAINT "page_blocks_treat_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_post_slider" ADD CONSTRAINT "page_blocks_post_slider_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_post_slider" ADD CONSTRAINT "page_blocks_post_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_site_cta" ADD CONSTRAINT "page_blocks_site_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_texts" ADD CONSTRAINT "page_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_hero_video" ADD CONSTRAINT "_page_v_blocks_hero_video_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_hero_video" ADD CONSTRAINT "_page_v_blocks_hero_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_hero_banner" ADD CONSTRAINT "_page_v_blocks_hero_banner_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_hero_banner" ADD CONSTRAINT "_page_v_blocks_hero_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_logo_strip_logos" ADD CONSTRAINT "_page_v_blocks_logo_strip_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_logo_strip_logos" ADD CONSTRAINT "_page_v_blocks_logo_strip_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_logo_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_logo_strip" ADD CONSTRAINT "_page_v_blocks_logo_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_icon_list_items" ADD CONSTRAINT "_page_v_blocks_icon_list_items_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_icon_list_items" ADD CONSTRAINT "_page_v_blocks_icon_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_icon_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_icon_list" ADD CONSTRAINT "_page_v_blocks_icon_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_media_text" ADD CONSTRAINT "_page_v_blocks_media_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_media_text" ADD CONSTRAINT "_page_v_blocks_media_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_insurance_logos" ADD CONSTRAINT "_page_v_blocks_insurance_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_insurance_logos" ADD CONSTRAINT "_page_v_blocks_insurance_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_insurance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_insurance" ADD CONSTRAINT "_page_v_blocks_insurance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_doc_slider" ADD CONSTRAINT "_page_v_blocks_doc_slider_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_doc_slider" ADD CONSTRAINT "_page_v_blocks_doc_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_rev_slider" ADD CONSTRAINT "_page_v_blocks_rev_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_cond_grid" ADD CONSTRAINT "_page_v_blocks_cond_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_before_after_pairs" ADD CONSTRAINT "_page_v_blocks_before_after_pairs_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_before_after_pairs" ADD CONSTRAINT "_page_v_blocks_before_after_pairs_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_before_after_pairs" ADD CONSTRAINT "_page_v_blocks_before_after_pairs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_before_after"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_before_after" ADD CONSTRAINT "_page_v_blocks_before_after_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_treat_cards" ADD CONSTRAINT "_page_v_blocks_treat_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_post_slider" ADD CONSTRAINT "_page_v_blocks_post_slider_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_post_slider" ADD CONSTRAINT "_page_v_blocks_post_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_site_cta" ADD CONSTRAINT "_page_v_blocks_site_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_texts" ADD CONSTRAINT "_page_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_logo_strip_logos" ADD CONSTRAINT "states_blocks_logo_strip_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_blocks_logo_strip_logos" ADD CONSTRAINT "states_blocks_logo_strip_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states_blocks_logo_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_logo_strip" ADD CONSTRAINT "states_blocks_logo_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_icon_list_items" ADD CONSTRAINT "states_blocks_icon_list_items_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_blocks_icon_list_items" ADD CONSTRAINT "states_blocks_icon_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states_blocks_icon_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_icon_list" ADD CONSTRAINT "states_blocks_icon_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_media_text" ADD CONSTRAINT "states_blocks_media_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_blocks_media_text" ADD CONSTRAINT "states_blocks_media_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_insurance_logos" ADD CONSTRAINT "states_blocks_insurance_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_blocks_insurance_logos" ADD CONSTRAINT "states_blocks_insurance_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states_blocks_insurance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_insurance" ADD CONSTRAINT "states_blocks_insurance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_doc_slider" ADD CONSTRAINT "states_blocks_doc_slider_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_blocks_doc_slider" ADD CONSTRAINT "states_blocks_doc_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_rev_slider" ADD CONSTRAINT "states_blocks_rev_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_cond_grid" ADD CONSTRAINT "states_blocks_cond_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_before_after_pairs" ADD CONSTRAINT "states_blocks_before_after_pairs_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_blocks_before_after_pairs" ADD CONSTRAINT "states_blocks_before_after_pairs_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_blocks_before_after_pairs" ADD CONSTRAINT "states_blocks_before_after_pairs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states_blocks_before_after"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_before_after" ADD CONSTRAINT "states_blocks_before_after_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_treat_cards" ADD CONSTRAINT "states_blocks_treat_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_post_slider" ADD CONSTRAINT "states_blocks_post_slider_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_blocks_post_slider" ADD CONSTRAINT "states_blocks_post_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_site_cta" ADD CONSTRAINT "states_blocks_site_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states" ADD CONSTRAINT "states_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_locales" ADD CONSTRAINT "states_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_locales" ADD CONSTRAINT "states_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_texts" ADD CONSTRAINT "states_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_rels" ADD CONSTRAINT "states_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_rels" ADD CONSTRAINT "states_rels_page_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_rels" ADD CONSTRAINT "states_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_rels" ADD CONSTRAINT "states_rels_states_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_rels" ADD CONSTRAINT "states_rels_clinics_fk" FOREIGN KEY ("clinics_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_rels" ADD CONSTRAINT "states_rels_doctors_fk" FOREIGN KEY ("doctors_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_rels" ADD CONSTRAINT "states_rels_treatments_fk" FOREIGN KEY ("treatments_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_rels" ADD CONSTRAINT "states_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_rels" ADD CONSTRAINT "states_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_logo_strip_logos" ADD CONSTRAINT "_states_v_blocks_logo_strip_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_logo_strip_logos" ADD CONSTRAINT "_states_v_blocks_logo_strip_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v_blocks_logo_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_logo_strip" ADD CONSTRAINT "_states_v_blocks_logo_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_icon_list_items" ADD CONSTRAINT "_states_v_blocks_icon_list_items_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_icon_list_items" ADD CONSTRAINT "_states_v_blocks_icon_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v_blocks_icon_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_icon_list" ADD CONSTRAINT "_states_v_blocks_icon_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_media_text" ADD CONSTRAINT "_states_v_blocks_media_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_media_text" ADD CONSTRAINT "_states_v_blocks_media_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_insurance_logos" ADD CONSTRAINT "_states_v_blocks_insurance_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_insurance_logos" ADD CONSTRAINT "_states_v_blocks_insurance_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v_blocks_insurance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_insurance" ADD CONSTRAINT "_states_v_blocks_insurance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_doc_slider" ADD CONSTRAINT "_states_v_blocks_doc_slider_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_doc_slider" ADD CONSTRAINT "_states_v_blocks_doc_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_rev_slider" ADD CONSTRAINT "_states_v_blocks_rev_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_cond_grid" ADD CONSTRAINT "_states_v_blocks_cond_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_before_after_pairs" ADD CONSTRAINT "_states_v_blocks_before_after_pairs_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_before_after_pairs" ADD CONSTRAINT "_states_v_blocks_before_after_pairs_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_before_after_pairs" ADD CONSTRAINT "_states_v_blocks_before_after_pairs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v_blocks_before_after"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_before_after" ADD CONSTRAINT "_states_v_blocks_before_after_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_treat_cards" ADD CONSTRAINT "_states_v_blocks_treat_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_post_slider" ADD CONSTRAINT "_states_v_blocks_post_slider_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_post_slider" ADD CONSTRAINT "_states_v_blocks_post_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_site_cta" ADD CONSTRAINT "_states_v_blocks_site_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v" ADD CONSTRAINT "_states_v_parent_id_states_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v" ADD CONSTRAINT "_states_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_locales" ADD CONSTRAINT "_states_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_locales" ADD CONSTRAINT "_states_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_texts" ADD CONSTRAINT "_states_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_rels" ADD CONSTRAINT "_states_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_rels" ADD CONSTRAINT "_states_v_rels_page_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_rels" ADD CONSTRAINT "_states_v_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_rels" ADD CONSTRAINT "_states_v_rels_states_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_rels" ADD CONSTRAINT "_states_v_rels_clinics_fk" FOREIGN KEY ("clinics_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_rels" ADD CONSTRAINT "_states_v_rels_doctors_fk" FOREIGN KEY ("doctors_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_rels" ADD CONSTRAINT "_states_v_rels_treatments_fk" FOREIGN KEY ("treatments_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_rels" ADD CONSTRAINT "_states_v_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_rels" ADD CONSTRAINT "_states_v_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_logo_strip_logos" ADD CONSTRAINT "clinics_blocks_logo_strip_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_blocks_logo_strip_logos" ADD CONSTRAINT "clinics_blocks_logo_strip_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics_blocks_logo_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_logo_strip" ADD CONSTRAINT "clinics_blocks_logo_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_icon_list_items" ADD CONSTRAINT "clinics_blocks_icon_list_items_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_blocks_icon_list_items" ADD CONSTRAINT "clinics_blocks_icon_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics_blocks_icon_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_icon_list" ADD CONSTRAINT "clinics_blocks_icon_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_media_text" ADD CONSTRAINT "clinics_blocks_media_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_blocks_media_text" ADD CONSTRAINT "clinics_blocks_media_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_insurance_logos" ADD CONSTRAINT "clinics_blocks_insurance_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_blocks_insurance_logos" ADD CONSTRAINT "clinics_blocks_insurance_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics_blocks_insurance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_insurance" ADD CONSTRAINT "clinics_blocks_insurance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_doc_slider" ADD CONSTRAINT "clinics_blocks_doc_slider_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_blocks_doc_slider" ADD CONSTRAINT "clinics_blocks_doc_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_rev_slider" ADD CONSTRAINT "clinics_blocks_rev_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_cond_grid" ADD CONSTRAINT "clinics_blocks_cond_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_before_after_pairs" ADD CONSTRAINT "clinics_blocks_before_after_pairs_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_blocks_before_after_pairs" ADD CONSTRAINT "clinics_blocks_before_after_pairs_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_blocks_before_after_pairs" ADD CONSTRAINT "clinics_blocks_before_after_pairs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics_blocks_before_after"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_before_after" ADD CONSTRAINT "clinics_blocks_before_after_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_treat_cards" ADD CONSTRAINT "clinics_blocks_treat_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_post_slider" ADD CONSTRAINT "clinics_blocks_post_slider_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_blocks_post_slider" ADD CONSTRAINT "clinics_blocks_post_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_site_cta" ADD CONSTRAINT "clinics_blocks_site_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_hours" ADD CONSTRAINT "clinics_hours_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics" ADD CONSTRAINT "clinics_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics" ADD CONSTRAINT "clinics_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_locales" ADD CONSTRAINT "clinics_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_locales" ADD CONSTRAINT "clinics_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_texts" ADD CONSTRAINT "clinics_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_rels" ADD CONSTRAINT "clinics_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_rels" ADD CONSTRAINT "clinics_rels_page_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_rels" ADD CONSTRAINT "clinics_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_rels" ADD CONSTRAINT "clinics_rels_states_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_rels" ADD CONSTRAINT "clinics_rels_clinics_fk" FOREIGN KEY ("clinics_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_rels" ADD CONSTRAINT "clinics_rels_doctors_fk" FOREIGN KEY ("doctors_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_rels" ADD CONSTRAINT "clinics_rels_treatments_fk" FOREIGN KEY ("treatments_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_rels" ADD CONSTRAINT "clinics_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_rels" ADD CONSTRAINT "clinics_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_logo_strip_logos" ADD CONSTRAINT "_clinics_v_blocks_logo_strip_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_logo_strip_logos" ADD CONSTRAINT "_clinics_v_blocks_logo_strip_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v_blocks_logo_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_logo_strip" ADD CONSTRAINT "_clinics_v_blocks_logo_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_icon_list_items" ADD CONSTRAINT "_clinics_v_blocks_icon_list_items_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_icon_list_items" ADD CONSTRAINT "_clinics_v_blocks_icon_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v_blocks_icon_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_icon_list" ADD CONSTRAINT "_clinics_v_blocks_icon_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_media_text" ADD CONSTRAINT "_clinics_v_blocks_media_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_media_text" ADD CONSTRAINT "_clinics_v_blocks_media_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_insurance_logos" ADD CONSTRAINT "_clinics_v_blocks_insurance_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_insurance_logos" ADD CONSTRAINT "_clinics_v_blocks_insurance_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v_blocks_insurance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_insurance" ADD CONSTRAINT "_clinics_v_blocks_insurance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_doc_slider" ADD CONSTRAINT "_clinics_v_blocks_doc_slider_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_doc_slider" ADD CONSTRAINT "_clinics_v_blocks_doc_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_rev_slider" ADD CONSTRAINT "_clinics_v_blocks_rev_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_cond_grid" ADD CONSTRAINT "_clinics_v_blocks_cond_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_before_after_pairs" ADD CONSTRAINT "_clinics_v_blocks_before_after_pairs_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_before_after_pairs" ADD CONSTRAINT "_clinics_v_blocks_before_after_pairs_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_before_after_pairs" ADD CONSTRAINT "_clinics_v_blocks_before_after_pairs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v_blocks_before_after"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_before_after" ADD CONSTRAINT "_clinics_v_blocks_before_after_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_treat_cards" ADD CONSTRAINT "_clinics_v_blocks_treat_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_post_slider" ADD CONSTRAINT "_clinics_v_blocks_post_slider_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_post_slider" ADD CONSTRAINT "_clinics_v_blocks_post_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_site_cta" ADD CONSTRAINT "_clinics_v_blocks_site_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_version_hours" ADD CONSTRAINT "_clinics_v_version_hours_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v" ADD CONSTRAINT "_clinics_v_parent_id_clinics_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v" ADD CONSTRAINT "_clinics_v_version_photo_id_media_id_fk" FOREIGN KEY ("version_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v" ADD CONSTRAINT "_clinics_v_version_state_id_states_id_fk" FOREIGN KEY ("version_state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_locales" ADD CONSTRAINT "_clinics_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_locales" ADD CONSTRAINT "_clinics_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_texts" ADD CONSTRAINT "_clinics_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_rels" ADD CONSTRAINT "_clinics_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_rels" ADD CONSTRAINT "_clinics_v_rels_page_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_rels" ADD CONSTRAINT "_clinics_v_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_rels" ADD CONSTRAINT "_clinics_v_rels_states_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_rels" ADD CONSTRAINT "_clinics_v_rels_clinics_fk" FOREIGN KEY ("clinics_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_rels" ADD CONSTRAINT "_clinics_v_rels_doctors_fk" FOREIGN KEY ("doctors_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_rels" ADD CONSTRAINT "_clinics_v_rels_treatments_fk" FOREIGN KEY ("treatments_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_rels" ADD CONSTRAINT "_clinics_v_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_rels" ADD CONSTRAINT "_clinics_v_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_logo_strip_logos" ADD CONSTRAINT "doctors_blocks_logo_strip_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_blocks_logo_strip_logos" ADD CONSTRAINT "doctors_blocks_logo_strip_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors_blocks_logo_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_logo_strip" ADD CONSTRAINT "doctors_blocks_logo_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_icon_list_items" ADD CONSTRAINT "doctors_blocks_icon_list_items_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_blocks_icon_list_items" ADD CONSTRAINT "doctors_blocks_icon_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors_blocks_icon_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_icon_list" ADD CONSTRAINT "doctors_blocks_icon_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_media_text" ADD CONSTRAINT "doctors_blocks_media_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_blocks_media_text" ADD CONSTRAINT "doctors_blocks_media_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_insurance_logos" ADD CONSTRAINT "doctors_blocks_insurance_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_blocks_insurance_logos" ADD CONSTRAINT "doctors_blocks_insurance_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors_blocks_insurance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_insurance" ADD CONSTRAINT "doctors_blocks_insurance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_doc_slider" ADD CONSTRAINT "doctors_blocks_doc_slider_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_blocks_doc_slider" ADD CONSTRAINT "doctors_blocks_doc_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_rev_slider" ADD CONSTRAINT "doctors_blocks_rev_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_cond_grid" ADD CONSTRAINT "doctors_blocks_cond_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_before_after_pairs" ADD CONSTRAINT "doctors_blocks_before_after_pairs_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_blocks_before_after_pairs" ADD CONSTRAINT "doctors_blocks_before_after_pairs_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_blocks_before_after_pairs" ADD CONSTRAINT "doctors_blocks_before_after_pairs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors_blocks_before_after"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_before_after" ADD CONSTRAINT "doctors_blocks_before_after_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_treat_cards" ADD CONSTRAINT "doctors_blocks_treat_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_post_slider" ADD CONSTRAINT "doctors_blocks_post_slider_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_blocks_post_slider" ADD CONSTRAINT "doctors_blocks_post_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_site_cta" ADD CONSTRAINT "doctors_blocks_site_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_education" ADD CONSTRAINT "doctors_education_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors" ADD CONSTRAINT "doctors_photo_id_media_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors" ADD CONSTRAINT "doctors_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_locales" ADD CONSTRAINT "doctors_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_locales" ADD CONSTRAINT "doctors_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_texts" ADD CONSTRAINT "doctors_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_rels" ADD CONSTRAINT "doctors_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_rels" ADD CONSTRAINT "doctors_rels_page_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_rels" ADD CONSTRAINT "doctors_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_rels" ADD CONSTRAINT "doctors_rels_states_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_rels" ADD CONSTRAINT "doctors_rels_clinics_fk" FOREIGN KEY ("clinics_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_rels" ADD CONSTRAINT "doctors_rels_doctors_fk" FOREIGN KEY ("doctors_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_rels" ADD CONSTRAINT "doctors_rels_treatments_fk" FOREIGN KEY ("treatments_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_rels" ADD CONSTRAINT "doctors_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_rels" ADD CONSTRAINT "doctors_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_logo_strip_logos" ADD CONSTRAINT "_doctors_v_blocks_logo_strip_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_logo_strip_logos" ADD CONSTRAINT "_doctors_v_blocks_logo_strip_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v_blocks_logo_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_logo_strip" ADD CONSTRAINT "_doctors_v_blocks_logo_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_icon_list_items" ADD CONSTRAINT "_doctors_v_blocks_icon_list_items_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_icon_list_items" ADD CONSTRAINT "_doctors_v_blocks_icon_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v_blocks_icon_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_icon_list" ADD CONSTRAINT "_doctors_v_blocks_icon_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_media_text" ADD CONSTRAINT "_doctors_v_blocks_media_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_media_text" ADD CONSTRAINT "_doctors_v_blocks_media_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_insurance_logos" ADD CONSTRAINT "_doctors_v_blocks_insurance_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_insurance_logos" ADD CONSTRAINT "_doctors_v_blocks_insurance_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v_blocks_insurance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_insurance" ADD CONSTRAINT "_doctors_v_blocks_insurance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_doc_slider" ADD CONSTRAINT "_doctors_v_blocks_doc_slider_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_doc_slider" ADD CONSTRAINT "_doctors_v_blocks_doc_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_rev_slider" ADD CONSTRAINT "_doctors_v_blocks_rev_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_cond_grid" ADD CONSTRAINT "_doctors_v_blocks_cond_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_before_after_pairs" ADD CONSTRAINT "_doctors_v_blocks_before_after_pairs_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_before_after_pairs" ADD CONSTRAINT "_doctors_v_blocks_before_after_pairs_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_before_after_pairs" ADD CONSTRAINT "_doctors_v_blocks_before_after_pairs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v_blocks_before_after"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_before_after" ADD CONSTRAINT "_doctors_v_blocks_before_after_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_treat_cards" ADD CONSTRAINT "_doctors_v_blocks_treat_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_post_slider" ADD CONSTRAINT "_doctors_v_blocks_post_slider_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_post_slider" ADD CONSTRAINT "_doctors_v_blocks_post_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_site_cta" ADD CONSTRAINT "_doctors_v_blocks_site_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_version_education" ADD CONSTRAINT "_doctors_v_version_education_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v" ADD CONSTRAINT "_doctors_v_parent_id_doctors_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v" ADD CONSTRAINT "_doctors_v_version_photo_id_media_id_fk" FOREIGN KEY ("version_photo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v" ADD CONSTRAINT "_doctors_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_locales" ADD CONSTRAINT "_doctors_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_locales" ADD CONSTRAINT "_doctors_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_texts" ADD CONSTRAINT "_doctors_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_rels" ADD CONSTRAINT "_doctors_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_rels" ADD CONSTRAINT "_doctors_v_rels_page_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_rels" ADD CONSTRAINT "_doctors_v_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_rels" ADD CONSTRAINT "_doctors_v_rels_states_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_rels" ADD CONSTRAINT "_doctors_v_rels_clinics_fk" FOREIGN KEY ("clinics_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_rels" ADD CONSTRAINT "_doctors_v_rels_doctors_fk" FOREIGN KEY ("doctors_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_rels" ADD CONSTRAINT "_doctors_v_rels_treatments_fk" FOREIGN KEY ("treatments_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_rels" ADD CONSTRAINT "_doctors_v_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_rels" ADD CONSTRAINT "_doctors_v_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_logo_strip_logos" ADD CONSTRAINT "treatments_blocks_logo_strip_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_blocks_logo_strip_logos" ADD CONSTRAINT "treatments_blocks_logo_strip_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments_blocks_logo_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_logo_strip" ADD CONSTRAINT "treatments_blocks_logo_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_icon_list_items" ADD CONSTRAINT "treatments_blocks_icon_list_items_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_blocks_icon_list_items" ADD CONSTRAINT "treatments_blocks_icon_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments_blocks_icon_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_icon_list" ADD CONSTRAINT "treatments_blocks_icon_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_media_text" ADD CONSTRAINT "treatments_blocks_media_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_blocks_media_text" ADD CONSTRAINT "treatments_blocks_media_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_insurance_logos" ADD CONSTRAINT "treatments_blocks_insurance_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_blocks_insurance_logos" ADD CONSTRAINT "treatments_blocks_insurance_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments_blocks_insurance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_insurance" ADD CONSTRAINT "treatments_blocks_insurance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_doc_slider" ADD CONSTRAINT "treatments_blocks_doc_slider_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_blocks_doc_slider" ADD CONSTRAINT "treatments_blocks_doc_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_rev_slider" ADD CONSTRAINT "treatments_blocks_rev_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_cond_grid" ADD CONSTRAINT "treatments_blocks_cond_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_before_after_pairs" ADD CONSTRAINT "treatments_blocks_before_after_pairs_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_blocks_before_after_pairs" ADD CONSTRAINT "treatments_blocks_before_after_pairs_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_blocks_before_after_pairs" ADD CONSTRAINT "treatments_blocks_before_after_pairs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments_blocks_before_after"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_before_after" ADD CONSTRAINT "treatments_blocks_before_after_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_treat_cards" ADD CONSTRAINT "treatments_blocks_treat_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_post_slider" ADD CONSTRAINT "treatments_blocks_post_slider_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_blocks_post_slider" ADD CONSTRAINT "treatments_blocks_post_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_site_cta" ADD CONSTRAINT "treatments_blocks_site_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments" ADD CONSTRAINT "treatments_card_image_id_media_id_fk" FOREIGN KEY ("card_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments" ADD CONSTRAINT "treatments_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_locales" ADD CONSTRAINT "treatments_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_locales" ADD CONSTRAINT "treatments_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_texts" ADD CONSTRAINT "treatments_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_rels" ADD CONSTRAINT "treatments_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_rels" ADD CONSTRAINT "treatments_rels_page_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_rels" ADD CONSTRAINT "treatments_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_rels" ADD CONSTRAINT "treatments_rels_states_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_rels" ADD CONSTRAINT "treatments_rels_clinics_fk" FOREIGN KEY ("clinics_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_rels" ADD CONSTRAINT "treatments_rels_doctors_fk" FOREIGN KEY ("doctors_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_rels" ADD CONSTRAINT "treatments_rels_treatments_fk" FOREIGN KEY ("treatments_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_rels" ADD CONSTRAINT "treatments_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_rels" ADD CONSTRAINT "treatments_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_logo_strip_logos" ADD CONSTRAINT "_treatments_v_blocks_logo_strip_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_logo_strip_logos" ADD CONSTRAINT "_treatments_v_blocks_logo_strip_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v_blocks_logo_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_logo_strip" ADD CONSTRAINT "_treatments_v_blocks_logo_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_icon_list_items" ADD CONSTRAINT "_treatments_v_blocks_icon_list_items_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_icon_list_items" ADD CONSTRAINT "_treatments_v_blocks_icon_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v_blocks_icon_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_icon_list" ADD CONSTRAINT "_treatments_v_blocks_icon_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_media_text" ADD CONSTRAINT "_treatments_v_blocks_media_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_media_text" ADD CONSTRAINT "_treatments_v_blocks_media_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_insurance_logos" ADD CONSTRAINT "_treatments_v_blocks_insurance_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_insurance_logos" ADD CONSTRAINT "_treatments_v_blocks_insurance_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v_blocks_insurance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_insurance" ADD CONSTRAINT "_treatments_v_blocks_insurance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_doc_slider" ADD CONSTRAINT "_treatments_v_blocks_doc_slider_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_doc_slider" ADD CONSTRAINT "_treatments_v_blocks_doc_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_rev_slider" ADD CONSTRAINT "_treatments_v_blocks_rev_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_cond_grid" ADD CONSTRAINT "_treatments_v_blocks_cond_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_before_after_pairs" ADD CONSTRAINT "_treatments_v_blocks_before_after_pairs_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_before_after_pairs" ADD CONSTRAINT "_treatments_v_blocks_before_after_pairs_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_before_after_pairs" ADD CONSTRAINT "_treatments_v_blocks_before_after_pairs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v_blocks_before_after"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_before_after" ADD CONSTRAINT "_treatments_v_blocks_before_after_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_treat_cards" ADD CONSTRAINT "_treatments_v_blocks_treat_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_post_slider" ADD CONSTRAINT "_treatments_v_blocks_post_slider_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_post_slider" ADD CONSTRAINT "_treatments_v_blocks_post_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_site_cta" ADD CONSTRAINT "_treatments_v_blocks_site_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v" ADD CONSTRAINT "_treatments_v_parent_id_treatments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."treatments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v" ADD CONSTRAINT "_treatments_v_version_card_image_id_media_id_fk" FOREIGN KEY ("version_card_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v" ADD CONSTRAINT "_treatments_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_locales" ADD CONSTRAINT "_treatments_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_locales" ADD CONSTRAINT "_treatments_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_texts" ADD CONSTRAINT "_treatments_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_rels" ADD CONSTRAINT "_treatments_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_rels" ADD CONSTRAINT "_treatments_v_rels_page_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_rels" ADD CONSTRAINT "_treatments_v_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_rels" ADD CONSTRAINT "_treatments_v_rels_states_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_rels" ADD CONSTRAINT "_treatments_v_rels_clinics_fk" FOREIGN KEY ("clinics_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_rels" ADD CONSTRAINT "_treatments_v_rels_doctors_fk" FOREIGN KEY ("doctors_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_rels" ADD CONSTRAINT "_treatments_v_rels_treatments_fk" FOREIGN KEY ("treatments_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_rels" ADD CONSTRAINT "_treatments_v_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_rels" ADD CONSTRAINT "_treatments_v_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_logo_strip_logos" ADD CONSTRAINT "conditions_blocks_logo_strip_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_blocks_logo_strip_logos" ADD CONSTRAINT "conditions_blocks_logo_strip_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions_blocks_logo_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_logo_strip" ADD CONSTRAINT "conditions_blocks_logo_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_icon_list_items" ADD CONSTRAINT "conditions_blocks_icon_list_items_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_blocks_icon_list_items" ADD CONSTRAINT "conditions_blocks_icon_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions_blocks_icon_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_icon_list" ADD CONSTRAINT "conditions_blocks_icon_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_media_text" ADD CONSTRAINT "conditions_blocks_media_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_blocks_media_text" ADD CONSTRAINT "conditions_blocks_media_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_insurance_logos" ADD CONSTRAINT "conditions_blocks_insurance_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_blocks_insurance_logos" ADD CONSTRAINT "conditions_blocks_insurance_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions_blocks_insurance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_insurance" ADD CONSTRAINT "conditions_blocks_insurance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_doc_slider" ADD CONSTRAINT "conditions_blocks_doc_slider_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_blocks_doc_slider" ADD CONSTRAINT "conditions_blocks_doc_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_rev_slider" ADD CONSTRAINT "conditions_blocks_rev_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_cond_grid" ADD CONSTRAINT "conditions_blocks_cond_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_before_after_pairs" ADD CONSTRAINT "conditions_blocks_before_after_pairs_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_blocks_before_after_pairs" ADD CONSTRAINT "conditions_blocks_before_after_pairs_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_blocks_before_after_pairs" ADD CONSTRAINT "conditions_blocks_before_after_pairs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions_blocks_before_after"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_before_after" ADD CONSTRAINT "conditions_blocks_before_after_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_treat_cards" ADD CONSTRAINT "conditions_blocks_treat_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_post_slider" ADD CONSTRAINT "conditions_blocks_post_slider_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_blocks_post_slider" ADD CONSTRAINT "conditions_blocks_post_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_site_cta" ADD CONSTRAINT "conditions_blocks_site_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions" ADD CONSTRAINT "conditions_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions" ADD CONSTRAINT "conditions_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_locales" ADD CONSTRAINT "conditions_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_locales" ADD CONSTRAINT "conditions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_texts" ADD CONSTRAINT "conditions_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_rels" ADD CONSTRAINT "conditions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_rels" ADD CONSTRAINT "conditions_rels_page_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_rels" ADD CONSTRAINT "conditions_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_rels" ADD CONSTRAINT "conditions_rels_states_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_rels" ADD CONSTRAINT "conditions_rels_clinics_fk" FOREIGN KEY ("clinics_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_rels" ADD CONSTRAINT "conditions_rels_doctors_fk" FOREIGN KEY ("doctors_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_rels" ADD CONSTRAINT "conditions_rels_treatments_fk" FOREIGN KEY ("treatments_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_rels" ADD CONSTRAINT "conditions_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_rels" ADD CONSTRAINT "conditions_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_logo_strip_logos" ADD CONSTRAINT "_conditions_v_blocks_logo_strip_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_logo_strip_logos" ADD CONSTRAINT "_conditions_v_blocks_logo_strip_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v_blocks_logo_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_logo_strip" ADD CONSTRAINT "_conditions_v_blocks_logo_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_icon_list_items" ADD CONSTRAINT "_conditions_v_blocks_icon_list_items_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_icon_list_items" ADD CONSTRAINT "_conditions_v_blocks_icon_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v_blocks_icon_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_icon_list" ADD CONSTRAINT "_conditions_v_blocks_icon_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_media_text" ADD CONSTRAINT "_conditions_v_blocks_media_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_media_text" ADD CONSTRAINT "_conditions_v_blocks_media_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_insurance_logos" ADD CONSTRAINT "_conditions_v_blocks_insurance_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_insurance_logos" ADD CONSTRAINT "_conditions_v_blocks_insurance_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v_blocks_insurance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_insurance" ADD CONSTRAINT "_conditions_v_blocks_insurance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_doc_slider" ADD CONSTRAINT "_conditions_v_blocks_doc_slider_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_doc_slider" ADD CONSTRAINT "_conditions_v_blocks_doc_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_rev_slider" ADD CONSTRAINT "_conditions_v_blocks_rev_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_cond_grid" ADD CONSTRAINT "_conditions_v_blocks_cond_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_before_after_pairs" ADD CONSTRAINT "_conditions_v_blocks_before_after_pairs_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_before_after_pairs" ADD CONSTRAINT "_conditions_v_blocks_before_after_pairs_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_before_after_pairs" ADD CONSTRAINT "_conditions_v_blocks_before_after_pairs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v_blocks_before_after"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_before_after" ADD CONSTRAINT "_conditions_v_blocks_before_after_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_treat_cards" ADD CONSTRAINT "_conditions_v_blocks_treat_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_post_slider" ADD CONSTRAINT "_conditions_v_blocks_post_slider_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_post_slider" ADD CONSTRAINT "_conditions_v_blocks_post_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_site_cta" ADD CONSTRAINT "_conditions_v_blocks_site_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v" ADD CONSTRAINT "_conditions_v_parent_id_conditions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."conditions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v" ADD CONSTRAINT "_conditions_v_version_icon_id_media_id_fk" FOREIGN KEY ("version_icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v" ADD CONSTRAINT "_conditions_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_locales" ADD CONSTRAINT "_conditions_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_locales" ADD CONSTRAINT "_conditions_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_texts" ADD CONSTRAINT "_conditions_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_rels" ADD CONSTRAINT "_conditions_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_rels" ADD CONSTRAINT "_conditions_v_rels_page_fk" FOREIGN KEY ("page_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_rels" ADD CONSTRAINT "_conditions_v_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_rels" ADD CONSTRAINT "_conditions_v_rels_states_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_rels" ADD CONSTRAINT "_conditions_v_rels_clinics_fk" FOREIGN KEY ("clinics_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_rels" ADD CONSTRAINT "_conditions_v_rels_doctors_fk" FOREIGN KEY ("doctors_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_rels" ADD CONSTRAINT "_conditions_v_rels_treatments_fk" FOREIGN KEY ("treatments_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_rels" ADD CONSTRAINT "_conditions_v_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_rels" ADD CONSTRAINT "_conditions_v_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_more_links" ADD CONSTRAINT "header_more_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_more_links_locales" ADD CONSTRAINT "header_more_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header_more_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_header_v_version_more_links" ADD CONSTRAINT "_header_v_version_more_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_header_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_header_v_version_more_links_locales" ADD CONSTRAINT "_header_v_version_more_links_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_header_v_version_more_links"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer_social" ADD CONSTRAINT "footer_social_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_footer_v_version_social" ADD CONSTRAINT "_footer_v_version_social_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_footer_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_hero_video" ADD CONSTRAINT "presets_blocks_hero_video_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_hero_video" ADD CONSTRAINT "presets_blocks_hero_video_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_hero_banner" ADD CONSTRAINT "presets_blocks_hero_banner_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_hero_banner" ADD CONSTRAINT "presets_blocks_hero_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_logo_strip_logos" ADD CONSTRAINT "presets_blocks_logo_strip_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_logo_strip_logos" ADD CONSTRAINT "presets_blocks_logo_strip_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_logo_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_logo_strip" ADD CONSTRAINT "presets_blocks_logo_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_icon_list_items" ADD CONSTRAINT "presets_blocks_icon_list_items_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_icon_list_items" ADD CONSTRAINT "presets_blocks_icon_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_icon_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_icon_list" ADD CONSTRAINT "presets_blocks_icon_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_media_text" ADD CONSTRAINT "presets_blocks_media_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_media_text" ADD CONSTRAINT "presets_blocks_media_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_insurance_logos" ADD CONSTRAINT "presets_blocks_insurance_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_insurance_logos" ADD CONSTRAINT "presets_blocks_insurance_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_insurance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_insurance" ADD CONSTRAINT "presets_blocks_insurance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_doc_slider" ADD CONSTRAINT "presets_blocks_doc_slider_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_doc_slider" ADD CONSTRAINT "presets_blocks_doc_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_rev_slider" ADD CONSTRAINT "presets_blocks_rev_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_cond_grid" ADD CONSTRAINT "presets_blocks_cond_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_before_after_pairs" ADD CONSTRAINT "presets_blocks_before_after_pairs_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_before_after_pairs" ADD CONSTRAINT "presets_blocks_before_after_pairs_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_before_after_pairs" ADD CONSTRAINT "presets_blocks_before_after_pairs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_before_after"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_before_after" ADD CONSTRAINT "presets_blocks_before_after_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_treat_cards" ADD CONSTRAINT "presets_blocks_treat_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_post_slider" ADD CONSTRAINT "presets_blocks_post_slider_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_post_slider" ADD CONSTRAINT "presets_blocks_post_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_site_cta" ADD CONSTRAINT "presets_blocks_site_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_texts" ADD CONSTRAINT "presets_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_hero_video_order_idx" ON "page_blocks_hero_video" USING btree ("_order");
  CREATE INDEX "page_blocks_hero_video_parent_id_idx" ON "page_blocks_hero_video" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_hero_video_path_idx" ON "page_blocks_hero_video" USING btree ("_path");
  CREATE INDEX "page_blocks_hero_video_locale_idx" ON "page_blocks_hero_video" USING btree ("_locale");
  CREATE INDEX "page_blocks_hero_video_poster_idx" ON "page_blocks_hero_video" USING btree ("poster_id");
  CREATE INDEX "page_blocks_hero_banner_order_idx" ON "page_blocks_hero_banner" USING btree ("_order");
  CREATE INDEX "page_blocks_hero_banner_parent_id_idx" ON "page_blocks_hero_banner" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_hero_banner_path_idx" ON "page_blocks_hero_banner" USING btree ("_path");
  CREATE INDEX "page_blocks_hero_banner_locale_idx" ON "page_blocks_hero_banner" USING btree ("_locale");
  CREATE INDEX "page_blocks_hero_banner_image_idx" ON "page_blocks_hero_banner" USING btree ("image_id");
  CREATE INDEX "page_blocks_logo_strip_logos_order_idx" ON "page_blocks_logo_strip_logos" USING btree ("_order");
  CREATE INDEX "page_blocks_logo_strip_logos_parent_id_idx" ON "page_blocks_logo_strip_logos" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_logo_strip_logos_locale_idx" ON "page_blocks_logo_strip_logos" USING btree ("_locale");
  CREATE INDEX "page_blocks_logo_strip_logos_image_idx" ON "page_blocks_logo_strip_logos" USING btree ("image_id");
  CREATE INDEX "page_blocks_logo_strip_order_idx" ON "page_blocks_logo_strip" USING btree ("_order");
  CREATE INDEX "page_blocks_logo_strip_parent_id_idx" ON "page_blocks_logo_strip" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_logo_strip_path_idx" ON "page_blocks_logo_strip" USING btree ("_path");
  CREATE INDEX "page_blocks_logo_strip_locale_idx" ON "page_blocks_logo_strip" USING btree ("_locale");
  CREATE INDEX "page_blocks_icon_list_items_order_idx" ON "page_blocks_icon_list_items" USING btree ("_order");
  CREATE INDEX "page_blocks_icon_list_items_parent_id_idx" ON "page_blocks_icon_list_items" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_icon_list_items_locale_idx" ON "page_blocks_icon_list_items" USING btree ("_locale");
  CREATE INDEX "page_blocks_icon_list_items_icon_idx" ON "page_blocks_icon_list_items" USING btree ("icon_id");
  CREATE INDEX "page_blocks_icon_list_order_idx" ON "page_blocks_icon_list" USING btree ("_order");
  CREATE INDEX "page_blocks_icon_list_parent_id_idx" ON "page_blocks_icon_list" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_icon_list_path_idx" ON "page_blocks_icon_list" USING btree ("_path");
  CREATE INDEX "page_blocks_icon_list_locale_idx" ON "page_blocks_icon_list" USING btree ("_locale");
  CREATE INDEX "page_blocks_media_text_order_idx" ON "page_blocks_media_text" USING btree ("_order");
  CREATE INDEX "page_blocks_media_text_parent_id_idx" ON "page_blocks_media_text" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_media_text_path_idx" ON "page_blocks_media_text" USING btree ("_path");
  CREATE INDEX "page_blocks_media_text_locale_idx" ON "page_blocks_media_text" USING btree ("_locale");
  CREATE INDEX "page_blocks_media_text_image_idx" ON "page_blocks_media_text" USING btree ("image_id");
  CREATE INDEX "page_blocks_insurance_logos_order_idx" ON "page_blocks_insurance_logos" USING btree ("_order");
  CREATE INDEX "page_blocks_insurance_logos_parent_id_idx" ON "page_blocks_insurance_logos" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_insurance_logos_locale_idx" ON "page_blocks_insurance_logos" USING btree ("_locale");
  CREATE INDEX "page_blocks_insurance_logos_image_idx" ON "page_blocks_insurance_logos" USING btree ("image_id");
  CREATE INDEX "page_blocks_insurance_order_idx" ON "page_blocks_insurance" USING btree ("_order");
  CREATE INDEX "page_blocks_insurance_parent_id_idx" ON "page_blocks_insurance" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_insurance_path_idx" ON "page_blocks_insurance" USING btree ("_path");
  CREATE INDEX "page_blocks_insurance_locale_idx" ON "page_blocks_insurance" USING btree ("_locale");
  CREATE INDEX "page_blocks_doc_slider_order_idx" ON "page_blocks_doc_slider" USING btree ("_order");
  CREATE INDEX "page_blocks_doc_slider_parent_id_idx" ON "page_blocks_doc_slider" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_doc_slider_path_idx" ON "page_blocks_doc_slider" USING btree ("_path");
  CREATE INDEX "page_blocks_doc_slider_locale_idx" ON "page_blocks_doc_slider" USING btree ("_locale");
  CREATE INDEX "page_blocks_doc_slider_image_idx" ON "page_blocks_doc_slider" USING btree ("image_id");
  CREATE INDEX "page_blocks_rev_slider_order_idx" ON "page_blocks_rev_slider" USING btree ("_order");
  CREATE INDEX "page_blocks_rev_slider_parent_id_idx" ON "page_blocks_rev_slider" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_rev_slider_path_idx" ON "page_blocks_rev_slider" USING btree ("_path");
  CREATE INDEX "page_blocks_rev_slider_locale_idx" ON "page_blocks_rev_slider" USING btree ("_locale");
  CREATE INDEX "page_blocks_cond_grid_order_idx" ON "page_blocks_cond_grid" USING btree ("_order");
  CREATE INDEX "page_blocks_cond_grid_parent_id_idx" ON "page_blocks_cond_grid" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_cond_grid_path_idx" ON "page_blocks_cond_grid" USING btree ("_path");
  CREATE INDEX "page_blocks_cond_grid_locale_idx" ON "page_blocks_cond_grid" USING btree ("_locale");
  CREATE INDEX "page_blocks_before_after_pairs_order_idx" ON "page_blocks_before_after_pairs" USING btree ("_order");
  CREATE INDEX "page_blocks_before_after_pairs_parent_id_idx" ON "page_blocks_before_after_pairs" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_before_after_pairs_locale_idx" ON "page_blocks_before_after_pairs" USING btree ("_locale");
  CREATE INDEX "page_blocks_before_after_pairs_before_idx" ON "page_blocks_before_after_pairs" USING btree ("before_id");
  CREATE INDEX "page_blocks_before_after_pairs_after_idx" ON "page_blocks_before_after_pairs" USING btree ("after_id");
  CREATE INDEX "page_blocks_before_after_order_idx" ON "page_blocks_before_after" USING btree ("_order");
  CREATE INDEX "page_blocks_before_after_parent_id_idx" ON "page_blocks_before_after" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_before_after_path_idx" ON "page_blocks_before_after" USING btree ("_path");
  CREATE INDEX "page_blocks_before_after_locale_idx" ON "page_blocks_before_after" USING btree ("_locale");
  CREATE INDEX "page_blocks_treat_cards_order_idx" ON "page_blocks_treat_cards" USING btree ("_order");
  CREATE INDEX "page_blocks_treat_cards_parent_id_idx" ON "page_blocks_treat_cards" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_treat_cards_path_idx" ON "page_blocks_treat_cards" USING btree ("_path");
  CREATE INDEX "page_blocks_treat_cards_locale_idx" ON "page_blocks_treat_cards" USING btree ("_locale");
  CREATE INDEX "page_blocks_post_slider_order_idx" ON "page_blocks_post_slider" USING btree ("_order");
  CREATE INDEX "page_blocks_post_slider_parent_id_idx" ON "page_blocks_post_slider" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_post_slider_path_idx" ON "page_blocks_post_slider" USING btree ("_path");
  CREATE INDEX "page_blocks_post_slider_locale_idx" ON "page_blocks_post_slider" USING btree ("_locale");
  CREATE INDEX "page_blocks_post_slider_logo_idx" ON "page_blocks_post_slider" USING btree ("logo_id");
  CREATE INDEX "page_blocks_site_cta_order_idx" ON "page_blocks_site_cta" USING btree ("_order");
  CREATE INDEX "page_blocks_site_cta_parent_id_idx" ON "page_blocks_site_cta" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_site_cta_path_idx" ON "page_blocks_site_cta" USING btree ("_path");
  CREATE INDEX "page_blocks_site_cta_locale_idx" ON "page_blocks_site_cta" USING btree ("_locale");
  CREATE INDEX "page_texts_order_parent" ON "page_texts" USING btree ("order","parent_id");
  CREATE INDEX "page_texts_locale_parent" ON "page_texts" USING btree ("locale","parent_id");
  CREATE INDEX "_page_v_blocks_hero_video_order_idx" ON "_page_v_blocks_hero_video" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_hero_video_parent_id_idx" ON "_page_v_blocks_hero_video" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_hero_video_path_idx" ON "_page_v_blocks_hero_video" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_hero_video_locale_idx" ON "_page_v_blocks_hero_video" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_hero_video_poster_idx" ON "_page_v_blocks_hero_video" USING btree ("poster_id");
  CREATE INDEX "_page_v_blocks_hero_banner_order_idx" ON "_page_v_blocks_hero_banner" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_hero_banner_parent_id_idx" ON "_page_v_blocks_hero_banner" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_hero_banner_path_idx" ON "_page_v_blocks_hero_banner" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_hero_banner_locale_idx" ON "_page_v_blocks_hero_banner" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_hero_banner_image_idx" ON "_page_v_blocks_hero_banner" USING btree ("image_id");
  CREATE INDEX "_page_v_blocks_logo_strip_logos_order_idx" ON "_page_v_blocks_logo_strip_logos" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_logo_strip_logos_parent_id_idx" ON "_page_v_blocks_logo_strip_logos" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_logo_strip_logos_locale_idx" ON "_page_v_blocks_logo_strip_logos" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_logo_strip_logos_image_idx" ON "_page_v_blocks_logo_strip_logos" USING btree ("image_id");
  CREATE INDEX "_page_v_blocks_logo_strip_order_idx" ON "_page_v_blocks_logo_strip" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_logo_strip_parent_id_idx" ON "_page_v_blocks_logo_strip" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_logo_strip_path_idx" ON "_page_v_blocks_logo_strip" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_logo_strip_locale_idx" ON "_page_v_blocks_logo_strip" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_icon_list_items_order_idx" ON "_page_v_blocks_icon_list_items" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_icon_list_items_parent_id_idx" ON "_page_v_blocks_icon_list_items" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_icon_list_items_locale_idx" ON "_page_v_blocks_icon_list_items" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_icon_list_items_icon_idx" ON "_page_v_blocks_icon_list_items" USING btree ("icon_id");
  CREATE INDEX "_page_v_blocks_icon_list_order_idx" ON "_page_v_blocks_icon_list" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_icon_list_parent_id_idx" ON "_page_v_blocks_icon_list" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_icon_list_path_idx" ON "_page_v_blocks_icon_list" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_icon_list_locale_idx" ON "_page_v_blocks_icon_list" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_media_text_order_idx" ON "_page_v_blocks_media_text" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_media_text_parent_id_idx" ON "_page_v_blocks_media_text" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_media_text_path_idx" ON "_page_v_blocks_media_text" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_media_text_locale_idx" ON "_page_v_blocks_media_text" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_media_text_image_idx" ON "_page_v_blocks_media_text" USING btree ("image_id");
  CREATE INDEX "_page_v_blocks_insurance_logos_order_idx" ON "_page_v_blocks_insurance_logos" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_insurance_logos_parent_id_idx" ON "_page_v_blocks_insurance_logos" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_insurance_logos_locale_idx" ON "_page_v_blocks_insurance_logos" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_insurance_logos_image_idx" ON "_page_v_blocks_insurance_logos" USING btree ("image_id");
  CREATE INDEX "_page_v_blocks_insurance_order_idx" ON "_page_v_blocks_insurance" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_insurance_parent_id_idx" ON "_page_v_blocks_insurance" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_insurance_path_idx" ON "_page_v_blocks_insurance" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_insurance_locale_idx" ON "_page_v_blocks_insurance" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_doc_slider_order_idx" ON "_page_v_blocks_doc_slider" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_doc_slider_parent_id_idx" ON "_page_v_blocks_doc_slider" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_doc_slider_path_idx" ON "_page_v_blocks_doc_slider" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_doc_slider_locale_idx" ON "_page_v_blocks_doc_slider" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_doc_slider_image_idx" ON "_page_v_blocks_doc_slider" USING btree ("image_id");
  CREATE INDEX "_page_v_blocks_rev_slider_order_idx" ON "_page_v_blocks_rev_slider" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_rev_slider_parent_id_idx" ON "_page_v_blocks_rev_slider" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_rev_slider_path_idx" ON "_page_v_blocks_rev_slider" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_rev_slider_locale_idx" ON "_page_v_blocks_rev_slider" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_cond_grid_order_idx" ON "_page_v_blocks_cond_grid" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_cond_grid_parent_id_idx" ON "_page_v_blocks_cond_grid" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_cond_grid_path_idx" ON "_page_v_blocks_cond_grid" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_cond_grid_locale_idx" ON "_page_v_blocks_cond_grid" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_before_after_pairs_order_idx" ON "_page_v_blocks_before_after_pairs" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_before_after_pairs_parent_id_idx" ON "_page_v_blocks_before_after_pairs" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_before_after_pairs_locale_idx" ON "_page_v_blocks_before_after_pairs" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_before_after_pairs_before_idx" ON "_page_v_blocks_before_after_pairs" USING btree ("before_id");
  CREATE INDEX "_page_v_blocks_before_after_pairs_after_idx" ON "_page_v_blocks_before_after_pairs" USING btree ("after_id");
  CREATE INDEX "_page_v_blocks_before_after_order_idx" ON "_page_v_blocks_before_after" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_before_after_parent_id_idx" ON "_page_v_blocks_before_after" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_before_after_path_idx" ON "_page_v_blocks_before_after" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_before_after_locale_idx" ON "_page_v_blocks_before_after" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_treat_cards_order_idx" ON "_page_v_blocks_treat_cards" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_treat_cards_parent_id_idx" ON "_page_v_blocks_treat_cards" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_treat_cards_path_idx" ON "_page_v_blocks_treat_cards" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_treat_cards_locale_idx" ON "_page_v_blocks_treat_cards" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_post_slider_order_idx" ON "_page_v_blocks_post_slider" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_post_slider_parent_id_idx" ON "_page_v_blocks_post_slider" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_post_slider_path_idx" ON "_page_v_blocks_post_slider" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_post_slider_locale_idx" ON "_page_v_blocks_post_slider" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_post_slider_logo_idx" ON "_page_v_blocks_post_slider" USING btree ("logo_id");
  CREATE INDEX "_page_v_blocks_site_cta_order_idx" ON "_page_v_blocks_site_cta" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_site_cta_parent_id_idx" ON "_page_v_blocks_site_cta" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_site_cta_path_idx" ON "_page_v_blocks_site_cta" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_site_cta_locale_idx" ON "_page_v_blocks_site_cta" USING btree ("_locale");
  CREATE INDEX "_page_v_texts_order_parent" ON "_page_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_page_v_texts_locale_parent" ON "_page_v_texts" USING btree ("locale","parent_id");
  CREATE INDEX "states_blocks_logo_strip_logos_order_idx" ON "states_blocks_logo_strip_logos" USING btree ("_order");
  CREATE INDEX "states_blocks_logo_strip_logos_parent_id_idx" ON "states_blocks_logo_strip_logos" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_logo_strip_logos_locale_idx" ON "states_blocks_logo_strip_logos" USING btree ("_locale");
  CREATE INDEX "states_blocks_logo_strip_logos_image_idx" ON "states_blocks_logo_strip_logos" USING btree ("image_id");
  CREATE INDEX "states_blocks_logo_strip_order_idx" ON "states_blocks_logo_strip" USING btree ("_order");
  CREATE INDEX "states_blocks_logo_strip_parent_id_idx" ON "states_blocks_logo_strip" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_logo_strip_path_idx" ON "states_blocks_logo_strip" USING btree ("_path");
  CREATE INDEX "states_blocks_logo_strip_locale_idx" ON "states_blocks_logo_strip" USING btree ("_locale");
  CREATE INDEX "states_blocks_icon_list_items_order_idx" ON "states_blocks_icon_list_items" USING btree ("_order");
  CREATE INDEX "states_blocks_icon_list_items_parent_id_idx" ON "states_blocks_icon_list_items" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_icon_list_items_locale_idx" ON "states_blocks_icon_list_items" USING btree ("_locale");
  CREATE INDEX "states_blocks_icon_list_items_icon_idx" ON "states_blocks_icon_list_items" USING btree ("icon_id");
  CREATE INDEX "states_blocks_icon_list_order_idx" ON "states_blocks_icon_list" USING btree ("_order");
  CREATE INDEX "states_blocks_icon_list_parent_id_idx" ON "states_blocks_icon_list" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_icon_list_path_idx" ON "states_blocks_icon_list" USING btree ("_path");
  CREATE INDEX "states_blocks_icon_list_locale_idx" ON "states_blocks_icon_list" USING btree ("_locale");
  CREATE INDEX "states_blocks_media_text_order_idx" ON "states_blocks_media_text" USING btree ("_order");
  CREATE INDEX "states_blocks_media_text_parent_id_idx" ON "states_blocks_media_text" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_media_text_path_idx" ON "states_blocks_media_text" USING btree ("_path");
  CREATE INDEX "states_blocks_media_text_locale_idx" ON "states_blocks_media_text" USING btree ("_locale");
  CREATE INDEX "states_blocks_media_text_image_idx" ON "states_blocks_media_text" USING btree ("image_id");
  CREATE INDEX "states_blocks_insurance_logos_order_idx" ON "states_blocks_insurance_logos" USING btree ("_order");
  CREATE INDEX "states_blocks_insurance_logos_parent_id_idx" ON "states_blocks_insurance_logos" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_insurance_logos_locale_idx" ON "states_blocks_insurance_logos" USING btree ("_locale");
  CREATE INDEX "states_blocks_insurance_logos_image_idx" ON "states_blocks_insurance_logos" USING btree ("image_id");
  CREATE INDEX "states_blocks_insurance_order_idx" ON "states_blocks_insurance" USING btree ("_order");
  CREATE INDEX "states_blocks_insurance_parent_id_idx" ON "states_blocks_insurance" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_insurance_path_idx" ON "states_blocks_insurance" USING btree ("_path");
  CREATE INDEX "states_blocks_insurance_locale_idx" ON "states_blocks_insurance" USING btree ("_locale");
  CREATE INDEX "states_blocks_doc_slider_order_idx" ON "states_blocks_doc_slider" USING btree ("_order");
  CREATE INDEX "states_blocks_doc_slider_parent_id_idx" ON "states_blocks_doc_slider" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_doc_slider_path_idx" ON "states_blocks_doc_slider" USING btree ("_path");
  CREATE INDEX "states_blocks_doc_slider_locale_idx" ON "states_blocks_doc_slider" USING btree ("_locale");
  CREATE INDEX "states_blocks_doc_slider_image_idx" ON "states_blocks_doc_slider" USING btree ("image_id");
  CREATE INDEX "states_blocks_rev_slider_order_idx" ON "states_blocks_rev_slider" USING btree ("_order");
  CREATE INDEX "states_blocks_rev_slider_parent_id_idx" ON "states_blocks_rev_slider" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_rev_slider_path_idx" ON "states_blocks_rev_slider" USING btree ("_path");
  CREATE INDEX "states_blocks_rev_slider_locale_idx" ON "states_blocks_rev_slider" USING btree ("_locale");
  CREATE INDEX "states_blocks_cond_grid_order_idx" ON "states_blocks_cond_grid" USING btree ("_order");
  CREATE INDEX "states_blocks_cond_grid_parent_id_idx" ON "states_blocks_cond_grid" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_cond_grid_path_idx" ON "states_blocks_cond_grid" USING btree ("_path");
  CREATE INDEX "states_blocks_cond_grid_locale_idx" ON "states_blocks_cond_grid" USING btree ("_locale");
  CREATE INDEX "states_blocks_before_after_pairs_order_idx" ON "states_blocks_before_after_pairs" USING btree ("_order");
  CREATE INDEX "states_blocks_before_after_pairs_parent_id_idx" ON "states_blocks_before_after_pairs" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_before_after_pairs_locale_idx" ON "states_blocks_before_after_pairs" USING btree ("_locale");
  CREATE INDEX "states_blocks_before_after_pairs_before_idx" ON "states_blocks_before_after_pairs" USING btree ("before_id");
  CREATE INDEX "states_blocks_before_after_pairs_after_idx" ON "states_blocks_before_after_pairs" USING btree ("after_id");
  CREATE INDEX "states_blocks_before_after_order_idx" ON "states_blocks_before_after" USING btree ("_order");
  CREATE INDEX "states_blocks_before_after_parent_id_idx" ON "states_blocks_before_after" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_before_after_path_idx" ON "states_blocks_before_after" USING btree ("_path");
  CREATE INDEX "states_blocks_before_after_locale_idx" ON "states_blocks_before_after" USING btree ("_locale");
  CREATE INDEX "states_blocks_treat_cards_order_idx" ON "states_blocks_treat_cards" USING btree ("_order");
  CREATE INDEX "states_blocks_treat_cards_parent_id_idx" ON "states_blocks_treat_cards" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_treat_cards_path_idx" ON "states_blocks_treat_cards" USING btree ("_path");
  CREATE INDEX "states_blocks_treat_cards_locale_idx" ON "states_blocks_treat_cards" USING btree ("_locale");
  CREATE INDEX "states_blocks_post_slider_order_idx" ON "states_blocks_post_slider" USING btree ("_order");
  CREATE INDEX "states_blocks_post_slider_parent_id_idx" ON "states_blocks_post_slider" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_post_slider_path_idx" ON "states_blocks_post_slider" USING btree ("_path");
  CREATE INDEX "states_blocks_post_slider_locale_idx" ON "states_blocks_post_slider" USING btree ("_locale");
  CREATE INDEX "states_blocks_post_slider_logo_idx" ON "states_blocks_post_slider" USING btree ("logo_id");
  CREATE INDEX "states_blocks_site_cta_order_idx" ON "states_blocks_site_cta" USING btree ("_order");
  CREATE INDEX "states_blocks_site_cta_parent_id_idx" ON "states_blocks_site_cta" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_site_cta_path_idx" ON "states_blocks_site_cta" USING btree ("_path");
  CREATE INDEX "states_blocks_site_cta_locale_idx" ON "states_blocks_site_cta" USING btree ("_locale");
  CREATE INDEX "states_hero_image_idx" ON "states" USING btree ("hero_image_id");
  CREATE UNIQUE INDEX "states_slug_idx" ON "states" USING btree ("slug");
  CREATE INDEX "states_updated_at_idx" ON "states" USING btree ("updated_at");
  CREATE INDEX "states_created_at_idx" ON "states" USING btree ("created_at");
  CREATE INDEX "states__status_idx" ON "states" USING btree ("_status");
  CREATE INDEX "states_meta_meta_image_idx" ON "states_locales" USING btree ("meta_image_id");
  CREATE UNIQUE INDEX "states_locales_locale_parent_id_unique" ON "states_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "states_texts_order_parent" ON "states_texts" USING btree ("order","parent_id");
  CREATE INDEX "states_texts_locale_parent" ON "states_texts" USING btree ("locale","parent_id");
  CREATE INDEX "states_rels_order_idx" ON "states_rels" USING btree ("order");
  CREATE INDEX "states_rels_parent_idx" ON "states_rels" USING btree ("parent_id");
  CREATE INDEX "states_rels_path_idx" ON "states_rels" USING btree ("path");
  CREATE INDEX "states_rels_locale_idx" ON "states_rels" USING btree ("locale");
  CREATE INDEX "states_rels_page_id_idx" ON "states_rels" USING btree ("page_id","locale");
  CREATE INDEX "states_rels_posts_id_idx" ON "states_rels" USING btree ("posts_id","locale");
  CREATE INDEX "states_rels_states_id_idx" ON "states_rels" USING btree ("states_id","locale");
  CREATE INDEX "states_rels_clinics_id_idx" ON "states_rels" USING btree ("clinics_id","locale");
  CREATE INDEX "states_rels_doctors_id_idx" ON "states_rels" USING btree ("doctors_id","locale");
  CREATE INDEX "states_rels_treatments_id_idx" ON "states_rels" USING btree ("treatments_id","locale");
  CREATE INDEX "states_rels_conditions_id_idx" ON "states_rels" USING btree ("conditions_id","locale");
  CREATE INDEX "states_rels_testimonials_id_idx" ON "states_rels" USING btree ("testimonials_id","locale");
  CREATE INDEX "_states_v_blocks_logo_strip_logos_order_idx" ON "_states_v_blocks_logo_strip_logos" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_logo_strip_logos_parent_id_idx" ON "_states_v_blocks_logo_strip_logos" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_logo_strip_logos_locale_idx" ON "_states_v_blocks_logo_strip_logos" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_logo_strip_logos_image_idx" ON "_states_v_blocks_logo_strip_logos" USING btree ("image_id");
  CREATE INDEX "_states_v_blocks_logo_strip_order_idx" ON "_states_v_blocks_logo_strip" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_logo_strip_parent_id_idx" ON "_states_v_blocks_logo_strip" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_logo_strip_path_idx" ON "_states_v_blocks_logo_strip" USING btree ("_path");
  CREATE INDEX "_states_v_blocks_logo_strip_locale_idx" ON "_states_v_blocks_logo_strip" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_icon_list_items_order_idx" ON "_states_v_blocks_icon_list_items" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_icon_list_items_parent_id_idx" ON "_states_v_blocks_icon_list_items" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_icon_list_items_locale_idx" ON "_states_v_blocks_icon_list_items" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_icon_list_items_icon_idx" ON "_states_v_blocks_icon_list_items" USING btree ("icon_id");
  CREATE INDEX "_states_v_blocks_icon_list_order_idx" ON "_states_v_blocks_icon_list" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_icon_list_parent_id_idx" ON "_states_v_blocks_icon_list" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_icon_list_path_idx" ON "_states_v_blocks_icon_list" USING btree ("_path");
  CREATE INDEX "_states_v_blocks_icon_list_locale_idx" ON "_states_v_blocks_icon_list" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_media_text_order_idx" ON "_states_v_blocks_media_text" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_media_text_parent_id_idx" ON "_states_v_blocks_media_text" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_media_text_path_idx" ON "_states_v_blocks_media_text" USING btree ("_path");
  CREATE INDEX "_states_v_blocks_media_text_locale_idx" ON "_states_v_blocks_media_text" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_media_text_image_idx" ON "_states_v_blocks_media_text" USING btree ("image_id");
  CREATE INDEX "_states_v_blocks_insurance_logos_order_idx" ON "_states_v_blocks_insurance_logos" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_insurance_logos_parent_id_idx" ON "_states_v_blocks_insurance_logos" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_insurance_logos_locale_idx" ON "_states_v_blocks_insurance_logos" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_insurance_logos_image_idx" ON "_states_v_blocks_insurance_logos" USING btree ("image_id");
  CREATE INDEX "_states_v_blocks_insurance_order_idx" ON "_states_v_blocks_insurance" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_insurance_parent_id_idx" ON "_states_v_blocks_insurance" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_insurance_path_idx" ON "_states_v_blocks_insurance" USING btree ("_path");
  CREATE INDEX "_states_v_blocks_insurance_locale_idx" ON "_states_v_blocks_insurance" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_doc_slider_order_idx" ON "_states_v_blocks_doc_slider" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_doc_slider_parent_id_idx" ON "_states_v_blocks_doc_slider" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_doc_slider_path_idx" ON "_states_v_blocks_doc_slider" USING btree ("_path");
  CREATE INDEX "_states_v_blocks_doc_slider_locale_idx" ON "_states_v_blocks_doc_slider" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_doc_slider_image_idx" ON "_states_v_blocks_doc_slider" USING btree ("image_id");
  CREATE INDEX "_states_v_blocks_rev_slider_order_idx" ON "_states_v_blocks_rev_slider" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_rev_slider_parent_id_idx" ON "_states_v_blocks_rev_slider" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_rev_slider_path_idx" ON "_states_v_blocks_rev_slider" USING btree ("_path");
  CREATE INDEX "_states_v_blocks_rev_slider_locale_idx" ON "_states_v_blocks_rev_slider" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_cond_grid_order_idx" ON "_states_v_blocks_cond_grid" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_cond_grid_parent_id_idx" ON "_states_v_blocks_cond_grid" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_cond_grid_path_idx" ON "_states_v_blocks_cond_grid" USING btree ("_path");
  CREATE INDEX "_states_v_blocks_cond_grid_locale_idx" ON "_states_v_blocks_cond_grid" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_before_after_pairs_order_idx" ON "_states_v_blocks_before_after_pairs" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_before_after_pairs_parent_id_idx" ON "_states_v_blocks_before_after_pairs" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_before_after_pairs_locale_idx" ON "_states_v_blocks_before_after_pairs" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_before_after_pairs_before_idx" ON "_states_v_blocks_before_after_pairs" USING btree ("before_id");
  CREATE INDEX "_states_v_blocks_before_after_pairs_after_idx" ON "_states_v_blocks_before_after_pairs" USING btree ("after_id");
  CREATE INDEX "_states_v_blocks_before_after_order_idx" ON "_states_v_blocks_before_after" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_before_after_parent_id_idx" ON "_states_v_blocks_before_after" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_before_after_path_idx" ON "_states_v_blocks_before_after" USING btree ("_path");
  CREATE INDEX "_states_v_blocks_before_after_locale_idx" ON "_states_v_blocks_before_after" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_treat_cards_order_idx" ON "_states_v_blocks_treat_cards" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_treat_cards_parent_id_idx" ON "_states_v_blocks_treat_cards" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_treat_cards_path_idx" ON "_states_v_blocks_treat_cards" USING btree ("_path");
  CREATE INDEX "_states_v_blocks_treat_cards_locale_idx" ON "_states_v_blocks_treat_cards" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_post_slider_order_idx" ON "_states_v_blocks_post_slider" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_post_slider_parent_id_idx" ON "_states_v_blocks_post_slider" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_post_slider_path_idx" ON "_states_v_blocks_post_slider" USING btree ("_path");
  CREATE INDEX "_states_v_blocks_post_slider_locale_idx" ON "_states_v_blocks_post_slider" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_post_slider_logo_idx" ON "_states_v_blocks_post_slider" USING btree ("logo_id");
  CREATE INDEX "_states_v_blocks_site_cta_order_idx" ON "_states_v_blocks_site_cta" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_site_cta_parent_id_idx" ON "_states_v_blocks_site_cta" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_site_cta_path_idx" ON "_states_v_blocks_site_cta" USING btree ("_path");
  CREATE INDEX "_states_v_blocks_site_cta_locale_idx" ON "_states_v_blocks_site_cta" USING btree ("_locale");
  CREATE INDEX "_states_v_parent_idx" ON "_states_v" USING btree ("parent_id");
  CREATE INDEX "_states_v_version_version_hero_image_idx" ON "_states_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_states_v_version_version_slug_idx" ON "_states_v" USING btree ("version_slug");
  CREATE INDEX "_states_v_version_version_updated_at_idx" ON "_states_v" USING btree ("version_updated_at");
  CREATE INDEX "_states_v_version_version_created_at_idx" ON "_states_v" USING btree ("version_created_at");
  CREATE INDEX "_states_v_version_version__status_idx" ON "_states_v" USING btree ("version__status");
  CREATE INDEX "_states_v_created_at_idx" ON "_states_v" USING btree ("created_at");
  CREATE INDEX "_states_v_updated_at_idx" ON "_states_v" USING btree ("updated_at");
  CREATE INDEX "_states_v_snapshot_idx" ON "_states_v" USING btree ("snapshot");
  CREATE INDEX "_states_v_published_locale_idx" ON "_states_v" USING btree ("published_locale");
  CREATE INDEX "_states_v_latest_idx" ON "_states_v" USING btree ("latest");
  CREATE INDEX "_states_v_autosave_idx" ON "_states_v" USING btree ("autosave");
  CREATE INDEX "_states_v_version_meta_version_meta_image_idx" ON "_states_v_locales" USING btree ("version_meta_image_id");
  CREATE UNIQUE INDEX "_states_v_locales_locale_parent_id_unique" ON "_states_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_states_v_texts_order_parent" ON "_states_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_states_v_texts_locale_parent" ON "_states_v_texts" USING btree ("locale","parent_id");
  CREATE INDEX "_states_v_rels_order_idx" ON "_states_v_rels" USING btree ("order");
  CREATE INDEX "_states_v_rels_parent_idx" ON "_states_v_rels" USING btree ("parent_id");
  CREATE INDEX "_states_v_rels_path_idx" ON "_states_v_rels" USING btree ("path");
  CREATE INDEX "_states_v_rels_locale_idx" ON "_states_v_rels" USING btree ("locale");
  CREATE INDEX "_states_v_rels_page_id_idx" ON "_states_v_rels" USING btree ("page_id","locale");
  CREATE INDEX "_states_v_rels_posts_id_idx" ON "_states_v_rels" USING btree ("posts_id","locale");
  CREATE INDEX "_states_v_rels_states_id_idx" ON "_states_v_rels" USING btree ("states_id","locale");
  CREATE INDEX "_states_v_rels_clinics_id_idx" ON "_states_v_rels" USING btree ("clinics_id","locale");
  CREATE INDEX "_states_v_rels_doctors_id_idx" ON "_states_v_rels" USING btree ("doctors_id","locale");
  CREATE INDEX "_states_v_rels_treatments_id_idx" ON "_states_v_rels" USING btree ("treatments_id","locale");
  CREATE INDEX "_states_v_rels_conditions_id_idx" ON "_states_v_rels" USING btree ("conditions_id","locale");
  CREATE INDEX "_states_v_rels_testimonials_id_idx" ON "_states_v_rels" USING btree ("testimonials_id","locale");
  CREATE INDEX "clinics_blocks_logo_strip_logos_order_idx" ON "clinics_blocks_logo_strip_logos" USING btree ("_order");
  CREATE INDEX "clinics_blocks_logo_strip_logos_parent_id_idx" ON "clinics_blocks_logo_strip_logos" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_logo_strip_logos_locale_idx" ON "clinics_blocks_logo_strip_logos" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_logo_strip_logos_image_idx" ON "clinics_blocks_logo_strip_logos" USING btree ("image_id");
  CREATE INDEX "clinics_blocks_logo_strip_order_idx" ON "clinics_blocks_logo_strip" USING btree ("_order");
  CREATE INDEX "clinics_blocks_logo_strip_parent_id_idx" ON "clinics_blocks_logo_strip" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_logo_strip_path_idx" ON "clinics_blocks_logo_strip" USING btree ("_path");
  CREATE INDEX "clinics_blocks_logo_strip_locale_idx" ON "clinics_blocks_logo_strip" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_icon_list_items_order_idx" ON "clinics_blocks_icon_list_items" USING btree ("_order");
  CREATE INDEX "clinics_blocks_icon_list_items_parent_id_idx" ON "clinics_blocks_icon_list_items" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_icon_list_items_locale_idx" ON "clinics_blocks_icon_list_items" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_icon_list_items_icon_idx" ON "clinics_blocks_icon_list_items" USING btree ("icon_id");
  CREATE INDEX "clinics_blocks_icon_list_order_idx" ON "clinics_blocks_icon_list" USING btree ("_order");
  CREATE INDEX "clinics_blocks_icon_list_parent_id_idx" ON "clinics_blocks_icon_list" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_icon_list_path_idx" ON "clinics_blocks_icon_list" USING btree ("_path");
  CREATE INDEX "clinics_blocks_icon_list_locale_idx" ON "clinics_blocks_icon_list" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_media_text_order_idx" ON "clinics_blocks_media_text" USING btree ("_order");
  CREATE INDEX "clinics_blocks_media_text_parent_id_idx" ON "clinics_blocks_media_text" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_media_text_path_idx" ON "clinics_blocks_media_text" USING btree ("_path");
  CREATE INDEX "clinics_blocks_media_text_locale_idx" ON "clinics_blocks_media_text" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_media_text_image_idx" ON "clinics_blocks_media_text" USING btree ("image_id");
  CREATE INDEX "clinics_blocks_insurance_logos_order_idx" ON "clinics_blocks_insurance_logos" USING btree ("_order");
  CREATE INDEX "clinics_blocks_insurance_logos_parent_id_idx" ON "clinics_blocks_insurance_logos" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_insurance_logos_locale_idx" ON "clinics_blocks_insurance_logos" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_insurance_logos_image_idx" ON "clinics_blocks_insurance_logos" USING btree ("image_id");
  CREATE INDEX "clinics_blocks_insurance_order_idx" ON "clinics_blocks_insurance" USING btree ("_order");
  CREATE INDEX "clinics_blocks_insurance_parent_id_idx" ON "clinics_blocks_insurance" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_insurance_path_idx" ON "clinics_blocks_insurance" USING btree ("_path");
  CREATE INDEX "clinics_blocks_insurance_locale_idx" ON "clinics_blocks_insurance" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_doc_slider_order_idx" ON "clinics_blocks_doc_slider" USING btree ("_order");
  CREATE INDEX "clinics_blocks_doc_slider_parent_id_idx" ON "clinics_blocks_doc_slider" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_doc_slider_path_idx" ON "clinics_blocks_doc_slider" USING btree ("_path");
  CREATE INDEX "clinics_blocks_doc_slider_locale_idx" ON "clinics_blocks_doc_slider" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_doc_slider_image_idx" ON "clinics_blocks_doc_slider" USING btree ("image_id");
  CREATE INDEX "clinics_blocks_rev_slider_order_idx" ON "clinics_blocks_rev_slider" USING btree ("_order");
  CREATE INDEX "clinics_blocks_rev_slider_parent_id_idx" ON "clinics_blocks_rev_slider" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_rev_slider_path_idx" ON "clinics_blocks_rev_slider" USING btree ("_path");
  CREATE INDEX "clinics_blocks_rev_slider_locale_idx" ON "clinics_blocks_rev_slider" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_cond_grid_order_idx" ON "clinics_blocks_cond_grid" USING btree ("_order");
  CREATE INDEX "clinics_blocks_cond_grid_parent_id_idx" ON "clinics_blocks_cond_grid" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_cond_grid_path_idx" ON "clinics_blocks_cond_grid" USING btree ("_path");
  CREATE INDEX "clinics_blocks_cond_grid_locale_idx" ON "clinics_blocks_cond_grid" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_before_after_pairs_order_idx" ON "clinics_blocks_before_after_pairs" USING btree ("_order");
  CREATE INDEX "clinics_blocks_before_after_pairs_parent_id_idx" ON "clinics_blocks_before_after_pairs" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_before_after_pairs_locale_idx" ON "clinics_blocks_before_after_pairs" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_before_after_pairs_before_idx" ON "clinics_blocks_before_after_pairs" USING btree ("before_id");
  CREATE INDEX "clinics_blocks_before_after_pairs_after_idx" ON "clinics_blocks_before_after_pairs" USING btree ("after_id");
  CREATE INDEX "clinics_blocks_before_after_order_idx" ON "clinics_blocks_before_after" USING btree ("_order");
  CREATE INDEX "clinics_blocks_before_after_parent_id_idx" ON "clinics_blocks_before_after" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_before_after_path_idx" ON "clinics_blocks_before_after" USING btree ("_path");
  CREATE INDEX "clinics_blocks_before_after_locale_idx" ON "clinics_blocks_before_after" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_treat_cards_order_idx" ON "clinics_blocks_treat_cards" USING btree ("_order");
  CREATE INDEX "clinics_blocks_treat_cards_parent_id_idx" ON "clinics_blocks_treat_cards" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_treat_cards_path_idx" ON "clinics_blocks_treat_cards" USING btree ("_path");
  CREATE INDEX "clinics_blocks_treat_cards_locale_idx" ON "clinics_blocks_treat_cards" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_post_slider_order_idx" ON "clinics_blocks_post_slider" USING btree ("_order");
  CREATE INDEX "clinics_blocks_post_slider_parent_id_idx" ON "clinics_blocks_post_slider" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_post_slider_path_idx" ON "clinics_blocks_post_slider" USING btree ("_path");
  CREATE INDEX "clinics_blocks_post_slider_locale_idx" ON "clinics_blocks_post_slider" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_post_slider_logo_idx" ON "clinics_blocks_post_slider" USING btree ("logo_id");
  CREATE INDEX "clinics_blocks_site_cta_order_idx" ON "clinics_blocks_site_cta" USING btree ("_order");
  CREATE INDEX "clinics_blocks_site_cta_parent_id_idx" ON "clinics_blocks_site_cta" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_site_cta_path_idx" ON "clinics_blocks_site_cta" USING btree ("_path");
  CREATE INDEX "clinics_blocks_site_cta_locale_idx" ON "clinics_blocks_site_cta" USING btree ("_locale");
  CREATE INDEX "clinics_hours_order_idx" ON "clinics_hours" USING btree ("_order");
  CREATE INDEX "clinics_hours_parent_id_idx" ON "clinics_hours" USING btree ("_parent_id");
  CREATE INDEX "clinics_photo_idx" ON "clinics" USING btree ("photo_id");
  CREATE UNIQUE INDEX "clinics_slug_idx" ON "clinics" USING btree ("slug");
  CREATE INDEX "clinics_state_idx" ON "clinics" USING btree ("state_id");
  CREATE INDEX "clinics_updated_at_idx" ON "clinics" USING btree ("updated_at");
  CREATE INDEX "clinics_created_at_idx" ON "clinics" USING btree ("created_at");
  CREATE INDEX "clinics__status_idx" ON "clinics" USING btree ("_status");
  CREATE INDEX "clinics_meta_meta_image_idx" ON "clinics_locales" USING btree ("meta_image_id");
  CREATE UNIQUE INDEX "clinics_locales_locale_parent_id_unique" ON "clinics_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "clinics_texts_order_parent" ON "clinics_texts" USING btree ("order","parent_id");
  CREATE INDEX "clinics_texts_locale_parent" ON "clinics_texts" USING btree ("locale","parent_id");
  CREATE INDEX "clinics_rels_order_idx" ON "clinics_rels" USING btree ("order");
  CREATE INDEX "clinics_rels_parent_idx" ON "clinics_rels" USING btree ("parent_id");
  CREATE INDEX "clinics_rels_path_idx" ON "clinics_rels" USING btree ("path");
  CREATE INDEX "clinics_rels_locale_idx" ON "clinics_rels" USING btree ("locale");
  CREATE INDEX "clinics_rels_page_id_idx" ON "clinics_rels" USING btree ("page_id","locale");
  CREATE INDEX "clinics_rels_posts_id_idx" ON "clinics_rels" USING btree ("posts_id","locale");
  CREATE INDEX "clinics_rels_states_id_idx" ON "clinics_rels" USING btree ("states_id","locale");
  CREATE INDEX "clinics_rels_clinics_id_idx" ON "clinics_rels" USING btree ("clinics_id","locale");
  CREATE INDEX "clinics_rels_doctors_id_idx" ON "clinics_rels" USING btree ("doctors_id","locale");
  CREATE INDEX "clinics_rels_treatments_id_idx" ON "clinics_rels" USING btree ("treatments_id","locale");
  CREATE INDEX "clinics_rels_conditions_id_idx" ON "clinics_rels" USING btree ("conditions_id","locale");
  CREATE INDEX "clinics_rels_testimonials_id_idx" ON "clinics_rels" USING btree ("testimonials_id","locale");
  CREATE INDEX "_clinics_v_blocks_logo_strip_logos_order_idx" ON "_clinics_v_blocks_logo_strip_logos" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_logo_strip_logos_parent_id_idx" ON "_clinics_v_blocks_logo_strip_logos" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_logo_strip_logos_locale_idx" ON "_clinics_v_blocks_logo_strip_logos" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_logo_strip_logos_image_idx" ON "_clinics_v_blocks_logo_strip_logos" USING btree ("image_id");
  CREATE INDEX "_clinics_v_blocks_logo_strip_order_idx" ON "_clinics_v_blocks_logo_strip" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_logo_strip_parent_id_idx" ON "_clinics_v_blocks_logo_strip" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_logo_strip_path_idx" ON "_clinics_v_blocks_logo_strip" USING btree ("_path");
  CREATE INDEX "_clinics_v_blocks_logo_strip_locale_idx" ON "_clinics_v_blocks_logo_strip" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_icon_list_items_order_idx" ON "_clinics_v_blocks_icon_list_items" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_icon_list_items_parent_id_idx" ON "_clinics_v_blocks_icon_list_items" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_icon_list_items_locale_idx" ON "_clinics_v_blocks_icon_list_items" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_icon_list_items_icon_idx" ON "_clinics_v_blocks_icon_list_items" USING btree ("icon_id");
  CREATE INDEX "_clinics_v_blocks_icon_list_order_idx" ON "_clinics_v_blocks_icon_list" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_icon_list_parent_id_idx" ON "_clinics_v_blocks_icon_list" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_icon_list_path_idx" ON "_clinics_v_blocks_icon_list" USING btree ("_path");
  CREATE INDEX "_clinics_v_blocks_icon_list_locale_idx" ON "_clinics_v_blocks_icon_list" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_media_text_order_idx" ON "_clinics_v_blocks_media_text" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_media_text_parent_id_idx" ON "_clinics_v_blocks_media_text" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_media_text_path_idx" ON "_clinics_v_blocks_media_text" USING btree ("_path");
  CREATE INDEX "_clinics_v_blocks_media_text_locale_idx" ON "_clinics_v_blocks_media_text" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_media_text_image_idx" ON "_clinics_v_blocks_media_text" USING btree ("image_id");
  CREATE INDEX "_clinics_v_blocks_insurance_logos_order_idx" ON "_clinics_v_blocks_insurance_logos" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_insurance_logos_parent_id_idx" ON "_clinics_v_blocks_insurance_logos" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_insurance_logos_locale_idx" ON "_clinics_v_blocks_insurance_logos" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_insurance_logos_image_idx" ON "_clinics_v_blocks_insurance_logos" USING btree ("image_id");
  CREATE INDEX "_clinics_v_blocks_insurance_order_idx" ON "_clinics_v_blocks_insurance" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_insurance_parent_id_idx" ON "_clinics_v_blocks_insurance" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_insurance_path_idx" ON "_clinics_v_blocks_insurance" USING btree ("_path");
  CREATE INDEX "_clinics_v_blocks_insurance_locale_idx" ON "_clinics_v_blocks_insurance" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_doc_slider_order_idx" ON "_clinics_v_blocks_doc_slider" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_doc_slider_parent_id_idx" ON "_clinics_v_blocks_doc_slider" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_doc_slider_path_idx" ON "_clinics_v_blocks_doc_slider" USING btree ("_path");
  CREATE INDEX "_clinics_v_blocks_doc_slider_locale_idx" ON "_clinics_v_blocks_doc_slider" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_doc_slider_image_idx" ON "_clinics_v_blocks_doc_slider" USING btree ("image_id");
  CREATE INDEX "_clinics_v_blocks_rev_slider_order_idx" ON "_clinics_v_blocks_rev_slider" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_rev_slider_parent_id_idx" ON "_clinics_v_blocks_rev_slider" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_rev_slider_path_idx" ON "_clinics_v_blocks_rev_slider" USING btree ("_path");
  CREATE INDEX "_clinics_v_blocks_rev_slider_locale_idx" ON "_clinics_v_blocks_rev_slider" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_cond_grid_order_idx" ON "_clinics_v_blocks_cond_grid" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_cond_grid_parent_id_idx" ON "_clinics_v_blocks_cond_grid" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_cond_grid_path_idx" ON "_clinics_v_blocks_cond_grid" USING btree ("_path");
  CREATE INDEX "_clinics_v_blocks_cond_grid_locale_idx" ON "_clinics_v_blocks_cond_grid" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_before_after_pairs_order_idx" ON "_clinics_v_blocks_before_after_pairs" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_before_after_pairs_parent_id_idx" ON "_clinics_v_blocks_before_after_pairs" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_before_after_pairs_locale_idx" ON "_clinics_v_blocks_before_after_pairs" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_before_after_pairs_before_idx" ON "_clinics_v_blocks_before_after_pairs" USING btree ("before_id");
  CREATE INDEX "_clinics_v_blocks_before_after_pairs_after_idx" ON "_clinics_v_blocks_before_after_pairs" USING btree ("after_id");
  CREATE INDEX "_clinics_v_blocks_before_after_order_idx" ON "_clinics_v_blocks_before_after" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_before_after_parent_id_idx" ON "_clinics_v_blocks_before_after" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_before_after_path_idx" ON "_clinics_v_blocks_before_after" USING btree ("_path");
  CREATE INDEX "_clinics_v_blocks_before_after_locale_idx" ON "_clinics_v_blocks_before_after" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_treat_cards_order_idx" ON "_clinics_v_blocks_treat_cards" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_treat_cards_parent_id_idx" ON "_clinics_v_blocks_treat_cards" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_treat_cards_path_idx" ON "_clinics_v_blocks_treat_cards" USING btree ("_path");
  CREATE INDEX "_clinics_v_blocks_treat_cards_locale_idx" ON "_clinics_v_blocks_treat_cards" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_post_slider_order_idx" ON "_clinics_v_blocks_post_slider" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_post_slider_parent_id_idx" ON "_clinics_v_blocks_post_slider" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_post_slider_path_idx" ON "_clinics_v_blocks_post_slider" USING btree ("_path");
  CREATE INDEX "_clinics_v_blocks_post_slider_locale_idx" ON "_clinics_v_blocks_post_slider" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_post_slider_logo_idx" ON "_clinics_v_blocks_post_slider" USING btree ("logo_id");
  CREATE INDEX "_clinics_v_blocks_site_cta_order_idx" ON "_clinics_v_blocks_site_cta" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_site_cta_parent_id_idx" ON "_clinics_v_blocks_site_cta" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_site_cta_path_idx" ON "_clinics_v_blocks_site_cta" USING btree ("_path");
  CREATE INDEX "_clinics_v_blocks_site_cta_locale_idx" ON "_clinics_v_blocks_site_cta" USING btree ("_locale");
  CREATE INDEX "_clinics_v_version_hours_order_idx" ON "_clinics_v_version_hours" USING btree ("_order");
  CREATE INDEX "_clinics_v_version_hours_parent_id_idx" ON "_clinics_v_version_hours" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_parent_idx" ON "_clinics_v" USING btree ("parent_id");
  CREATE INDEX "_clinics_v_version_version_photo_idx" ON "_clinics_v" USING btree ("version_photo_id");
  CREATE INDEX "_clinics_v_version_version_slug_idx" ON "_clinics_v" USING btree ("version_slug");
  CREATE INDEX "_clinics_v_version_version_state_idx" ON "_clinics_v" USING btree ("version_state_id");
  CREATE INDEX "_clinics_v_version_version_updated_at_idx" ON "_clinics_v" USING btree ("version_updated_at");
  CREATE INDEX "_clinics_v_version_version_created_at_idx" ON "_clinics_v" USING btree ("version_created_at");
  CREATE INDEX "_clinics_v_version_version__status_idx" ON "_clinics_v" USING btree ("version__status");
  CREATE INDEX "_clinics_v_created_at_idx" ON "_clinics_v" USING btree ("created_at");
  CREATE INDEX "_clinics_v_updated_at_idx" ON "_clinics_v" USING btree ("updated_at");
  CREATE INDEX "_clinics_v_snapshot_idx" ON "_clinics_v" USING btree ("snapshot");
  CREATE INDEX "_clinics_v_published_locale_idx" ON "_clinics_v" USING btree ("published_locale");
  CREATE INDEX "_clinics_v_latest_idx" ON "_clinics_v" USING btree ("latest");
  CREATE INDEX "_clinics_v_autosave_idx" ON "_clinics_v" USING btree ("autosave");
  CREATE INDEX "_clinics_v_version_meta_version_meta_image_idx" ON "_clinics_v_locales" USING btree ("version_meta_image_id");
  CREATE UNIQUE INDEX "_clinics_v_locales_locale_parent_id_unique" ON "_clinics_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_clinics_v_texts_order_parent" ON "_clinics_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_clinics_v_texts_locale_parent" ON "_clinics_v_texts" USING btree ("locale","parent_id");
  CREATE INDEX "_clinics_v_rels_order_idx" ON "_clinics_v_rels" USING btree ("order");
  CREATE INDEX "_clinics_v_rels_parent_idx" ON "_clinics_v_rels" USING btree ("parent_id");
  CREATE INDEX "_clinics_v_rels_path_idx" ON "_clinics_v_rels" USING btree ("path");
  CREATE INDEX "_clinics_v_rels_locale_idx" ON "_clinics_v_rels" USING btree ("locale");
  CREATE INDEX "_clinics_v_rels_page_id_idx" ON "_clinics_v_rels" USING btree ("page_id","locale");
  CREATE INDEX "_clinics_v_rels_posts_id_idx" ON "_clinics_v_rels" USING btree ("posts_id","locale");
  CREATE INDEX "_clinics_v_rels_states_id_idx" ON "_clinics_v_rels" USING btree ("states_id","locale");
  CREATE INDEX "_clinics_v_rels_clinics_id_idx" ON "_clinics_v_rels" USING btree ("clinics_id","locale");
  CREATE INDEX "_clinics_v_rels_doctors_id_idx" ON "_clinics_v_rels" USING btree ("doctors_id","locale");
  CREATE INDEX "_clinics_v_rels_treatments_id_idx" ON "_clinics_v_rels" USING btree ("treatments_id","locale");
  CREATE INDEX "_clinics_v_rels_conditions_id_idx" ON "_clinics_v_rels" USING btree ("conditions_id","locale");
  CREATE INDEX "_clinics_v_rels_testimonials_id_idx" ON "_clinics_v_rels" USING btree ("testimonials_id","locale");
  CREATE INDEX "doctors_blocks_logo_strip_logos_order_idx" ON "doctors_blocks_logo_strip_logos" USING btree ("_order");
  CREATE INDEX "doctors_blocks_logo_strip_logos_parent_id_idx" ON "doctors_blocks_logo_strip_logos" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_logo_strip_logos_locale_idx" ON "doctors_blocks_logo_strip_logos" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_logo_strip_logos_image_idx" ON "doctors_blocks_logo_strip_logos" USING btree ("image_id");
  CREATE INDEX "doctors_blocks_logo_strip_order_idx" ON "doctors_blocks_logo_strip" USING btree ("_order");
  CREATE INDEX "doctors_blocks_logo_strip_parent_id_idx" ON "doctors_blocks_logo_strip" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_logo_strip_path_idx" ON "doctors_blocks_logo_strip" USING btree ("_path");
  CREATE INDEX "doctors_blocks_logo_strip_locale_idx" ON "doctors_blocks_logo_strip" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_icon_list_items_order_idx" ON "doctors_blocks_icon_list_items" USING btree ("_order");
  CREATE INDEX "doctors_blocks_icon_list_items_parent_id_idx" ON "doctors_blocks_icon_list_items" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_icon_list_items_locale_idx" ON "doctors_blocks_icon_list_items" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_icon_list_items_icon_idx" ON "doctors_blocks_icon_list_items" USING btree ("icon_id");
  CREATE INDEX "doctors_blocks_icon_list_order_idx" ON "doctors_blocks_icon_list" USING btree ("_order");
  CREATE INDEX "doctors_blocks_icon_list_parent_id_idx" ON "doctors_blocks_icon_list" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_icon_list_path_idx" ON "doctors_blocks_icon_list" USING btree ("_path");
  CREATE INDEX "doctors_blocks_icon_list_locale_idx" ON "doctors_blocks_icon_list" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_media_text_order_idx" ON "doctors_blocks_media_text" USING btree ("_order");
  CREATE INDEX "doctors_blocks_media_text_parent_id_idx" ON "doctors_blocks_media_text" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_media_text_path_idx" ON "doctors_blocks_media_text" USING btree ("_path");
  CREATE INDEX "doctors_blocks_media_text_locale_idx" ON "doctors_blocks_media_text" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_media_text_image_idx" ON "doctors_blocks_media_text" USING btree ("image_id");
  CREATE INDEX "doctors_blocks_insurance_logos_order_idx" ON "doctors_blocks_insurance_logos" USING btree ("_order");
  CREATE INDEX "doctors_blocks_insurance_logos_parent_id_idx" ON "doctors_blocks_insurance_logos" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_insurance_logos_locale_idx" ON "doctors_blocks_insurance_logos" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_insurance_logos_image_idx" ON "doctors_blocks_insurance_logos" USING btree ("image_id");
  CREATE INDEX "doctors_blocks_insurance_order_idx" ON "doctors_blocks_insurance" USING btree ("_order");
  CREATE INDEX "doctors_blocks_insurance_parent_id_idx" ON "doctors_blocks_insurance" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_insurance_path_idx" ON "doctors_blocks_insurance" USING btree ("_path");
  CREATE INDEX "doctors_blocks_insurance_locale_idx" ON "doctors_blocks_insurance" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_doc_slider_order_idx" ON "doctors_blocks_doc_slider" USING btree ("_order");
  CREATE INDEX "doctors_blocks_doc_slider_parent_id_idx" ON "doctors_blocks_doc_slider" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_doc_slider_path_idx" ON "doctors_blocks_doc_slider" USING btree ("_path");
  CREATE INDEX "doctors_blocks_doc_slider_locale_idx" ON "doctors_blocks_doc_slider" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_doc_slider_image_idx" ON "doctors_blocks_doc_slider" USING btree ("image_id");
  CREATE INDEX "doctors_blocks_rev_slider_order_idx" ON "doctors_blocks_rev_slider" USING btree ("_order");
  CREATE INDEX "doctors_blocks_rev_slider_parent_id_idx" ON "doctors_blocks_rev_slider" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_rev_slider_path_idx" ON "doctors_blocks_rev_slider" USING btree ("_path");
  CREATE INDEX "doctors_blocks_rev_slider_locale_idx" ON "doctors_blocks_rev_slider" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_cond_grid_order_idx" ON "doctors_blocks_cond_grid" USING btree ("_order");
  CREATE INDEX "doctors_blocks_cond_grid_parent_id_idx" ON "doctors_blocks_cond_grid" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_cond_grid_path_idx" ON "doctors_blocks_cond_grid" USING btree ("_path");
  CREATE INDEX "doctors_blocks_cond_grid_locale_idx" ON "doctors_blocks_cond_grid" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_before_after_pairs_order_idx" ON "doctors_blocks_before_after_pairs" USING btree ("_order");
  CREATE INDEX "doctors_blocks_before_after_pairs_parent_id_idx" ON "doctors_blocks_before_after_pairs" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_before_after_pairs_locale_idx" ON "doctors_blocks_before_after_pairs" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_before_after_pairs_before_idx" ON "doctors_blocks_before_after_pairs" USING btree ("before_id");
  CREATE INDEX "doctors_blocks_before_after_pairs_after_idx" ON "doctors_blocks_before_after_pairs" USING btree ("after_id");
  CREATE INDEX "doctors_blocks_before_after_order_idx" ON "doctors_blocks_before_after" USING btree ("_order");
  CREATE INDEX "doctors_blocks_before_after_parent_id_idx" ON "doctors_blocks_before_after" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_before_after_path_idx" ON "doctors_blocks_before_after" USING btree ("_path");
  CREATE INDEX "doctors_blocks_before_after_locale_idx" ON "doctors_blocks_before_after" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_treat_cards_order_idx" ON "doctors_blocks_treat_cards" USING btree ("_order");
  CREATE INDEX "doctors_blocks_treat_cards_parent_id_idx" ON "doctors_blocks_treat_cards" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_treat_cards_path_idx" ON "doctors_blocks_treat_cards" USING btree ("_path");
  CREATE INDEX "doctors_blocks_treat_cards_locale_idx" ON "doctors_blocks_treat_cards" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_post_slider_order_idx" ON "doctors_blocks_post_slider" USING btree ("_order");
  CREATE INDEX "doctors_blocks_post_slider_parent_id_idx" ON "doctors_blocks_post_slider" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_post_slider_path_idx" ON "doctors_blocks_post_slider" USING btree ("_path");
  CREATE INDEX "doctors_blocks_post_slider_locale_idx" ON "doctors_blocks_post_slider" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_post_slider_logo_idx" ON "doctors_blocks_post_slider" USING btree ("logo_id");
  CREATE INDEX "doctors_blocks_site_cta_order_idx" ON "doctors_blocks_site_cta" USING btree ("_order");
  CREATE INDEX "doctors_blocks_site_cta_parent_id_idx" ON "doctors_blocks_site_cta" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_site_cta_path_idx" ON "doctors_blocks_site_cta" USING btree ("_path");
  CREATE INDEX "doctors_blocks_site_cta_locale_idx" ON "doctors_blocks_site_cta" USING btree ("_locale");
  CREATE INDEX "doctors_education_order_idx" ON "doctors_education" USING btree ("_order");
  CREATE INDEX "doctors_education_parent_id_idx" ON "doctors_education" USING btree ("_parent_id");
  CREATE INDEX "doctors_photo_idx" ON "doctors" USING btree ("photo_id");
  CREATE INDEX "doctors_hero_image_idx" ON "doctors" USING btree ("hero_image_id");
  CREATE UNIQUE INDEX "doctors_slug_idx" ON "doctors" USING btree ("slug");
  CREATE INDEX "doctors_updated_at_idx" ON "doctors" USING btree ("updated_at");
  CREATE INDEX "doctors_created_at_idx" ON "doctors" USING btree ("created_at");
  CREATE INDEX "doctors__status_idx" ON "doctors" USING btree ("_status");
  CREATE INDEX "doctors_meta_meta_image_idx" ON "doctors_locales" USING btree ("meta_image_id");
  CREATE UNIQUE INDEX "doctors_locales_locale_parent_id_unique" ON "doctors_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "doctors_texts_order_parent" ON "doctors_texts" USING btree ("order","parent_id");
  CREATE INDEX "doctors_texts_locale_parent" ON "doctors_texts" USING btree ("locale","parent_id");
  CREATE INDEX "doctors_rels_order_idx" ON "doctors_rels" USING btree ("order");
  CREATE INDEX "doctors_rels_parent_idx" ON "doctors_rels" USING btree ("parent_id");
  CREATE INDEX "doctors_rels_path_idx" ON "doctors_rels" USING btree ("path");
  CREATE INDEX "doctors_rels_locale_idx" ON "doctors_rels" USING btree ("locale");
  CREATE INDEX "doctors_rels_page_id_idx" ON "doctors_rels" USING btree ("page_id","locale");
  CREATE INDEX "doctors_rels_posts_id_idx" ON "doctors_rels" USING btree ("posts_id","locale");
  CREATE INDEX "doctors_rels_states_id_idx" ON "doctors_rels" USING btree ("states_id","locale");
  CREATE INDEX "doctors_rels_clinics_id_idx" ON "doctors_rels" USING btree ("clinics_id","locale");
  CREATE INDEX "doctors_rels_doctors_id_idx" ON "doctors_rels" USING btree ("doctors_id","locale");
  CREATE INDEX "doctors_rels_treatments_id_idx" ON "doctors_rels" USING btree ("treatments_id","locale");
  CREATE INDEX "doctors_rels_conditions_id_idx" ON "doctors_rels" USING btree ("conditions_id","locale");
  CREATE INDEX "doctors_rels_testimonials_id_idx" ON "doctors_rels" USING btree ("testimonials_id","locale");
  CREATE INDEX "_doctors_v_blocks_logo_strip_logos_order_idx" ON "_doctors_v_blocks_logo_strip_logos" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_logo_strip_logos_parent_id_idx" ON "_doctors_v_blocks_logo_strip_logos" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_logo_strip_logos_locale_idx" ON "_doctors_v_blocks_logo_strip_logos" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_logo_strip_logos_image_idx" ON "_doctors_v_blocks_logo_strip_logos" USING btree ("image_id");
  CREATE INDEX "_doctors_v_blocks_logo_strip_order_idx" ON "_doctors_v_blocks_logo_strip" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_logo_strip_parent_id_idx" ON "_doctors_v_blocks_logo_strip" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_logo_strip_path_idx" ON "_doctors_v_blocks_logo_strip" USING btree ("_path");
  CREATE INDEX "_doctors_v_blocks_logo_strip_locale_idx" ON "_doctors_v_blocks_logo_strip" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_icon_list_items_order_idx" ON "_doctors_v_blocks_icon_list_items" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_icon_list_items_parent_id_idx" ON "_doctors_v_blocks_icon_list_items" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_icon_list_items_locale_idx" ON "_doctors_v_blocks_icon_list_items" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_icon_list_items_icon_idx" ON "_doctors_v_blocks_icon_list_items" USING btree ("icon_id");
  CREATE INDEX "_doctors_v_blocks_icon_list_order_idx" ON "_doctors_v_blocks_icon_list" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_icon_list_parent_id_idx" ON "_doctors_v_blocks_icon_list" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_icon_list_path_idx" ON "_doctors_v_blocks_icon_list" USING btree ("_path");
  CREATE INDEX "_doctors_v_blocks_icon_list_locale_idx" ON "_doctors_v_blocks_icon_list" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_media_text_order_idx" ON "_doctors_v_blocks_media_text" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_media_text_parent_id_idx" ON "_doctors_v_blocks_media_text" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_media_text_path_idx" ON "_doctors_v_blocks_media_text" USING btree ("_path");
  CREATE INDEX "_doctors_v_blocks_media_text_locale_idx" ON "_doctors_v_blocks_media_text" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_media_text_image_idx" ON "_doctors_v_blocks_media_text" USING btree ("image_id");
  CREATE INDEX "_doctors_v_blocks_insurance_logos_order_idx" ON "_doctors_v_blocks_insurance_logos" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_insurance_logos_parent_id_idx" ON "_doctors_v_blocks_insurance_logos" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_insurance_logos_locale_idx" ON "_doctors_v_blocks_insurance_logos" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_insurance_logos_image_idx" ON "_doctors_v_blocks_insurance_logos" USING btree ("image_id");
  CREATE INDEX "_doctors_v_blocks_insurance_order_idx" ON "_doctors_v_blocks_insurance" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_insurance_parent_id_idx" ON "_doctors_v_blocks_insurance" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_insurance_path_idx" ON "_doctors_v_blocks_insurance" USING btree ("_path");
  CREATE INDEX "_doctors_v_blocks_insurance_locale_idx" ON "_doctors_v_blocks_insurance" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_doc_slider_order_idx" ON "_doctors_v_blocks_doc_slider" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_doc_slider_parent_id_idx" ON "_doctors_v_blocks_doc_slider" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_doc_slider_path_idx" ON "_doctors_v_blocks_doc_slider" USING btree ("_path");
  CREATE INDEX "_doctors_v_blocks_doc_slider_locale_idx" ON "_doctors_v_blocks_doc_slider" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_doc_slider_image_idx" ON "_doctors_v_blocks_doc_slider" USING btree ("image_id");
  CREATE INDEX "_doctors_v_blocks_rev_slider_order_idx" ON "_doctors_v_blocks_rev_slider" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_rev_slider_parent_id_idx" ON "_doctors_v_blocks_rev_slider" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_rev_slider_path_idx" ON "_doctors_v_blocks_rev_slider" USING btree ("_path");
  CREATE INDEX "_doctors_v_blocks_rev_slider_locale_idx" ON "_doctors_v_blocks_rev_slider" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_cond_grid_order_idx" ON "_doctors_v_blocks_cond_grid" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_cond_grid_parent_id_idx" ON "_doctors_v_blocks_cond_grid" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_cond_grid_path_idx" ON "_doctors_v_blocks_cond_grid" USING btree ("_path");
  CREATE INDEX "_doctors_v_blocks_cond_grid_locale_idx" ON "_doctors_v_blocks_cond_grid" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_before_after_pairs_order_idx" ON "_doctors_v_blocks_before_after_pairs" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_before_after_pairs_parent_id_idx" ON "_doctors_v_blocks_before_after_pairs" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_before_after_pairs_locale_idx" ON "_doctors_v_blocks_before_after_pairs" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_before_after_pairs_before_idx" ON "_doctors_v_blocks_before_after_pairs" USING btree ("before_id");
  CREATE INDEX "_doctors_v_blocks_before_after_pairs_after_idx" ON "_doctors_v_blocks_before_after_pairs" USING btree ("after_id");
  CREATE INDEX "_doctors_v_blocks_before_after_order_idx" ON "_doctors_v_blocks_before_after" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_before_after_parent_id_idx" ON "_doctors_v_blocks_before_after" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_before_after_path_idx" ON "_doctors_v_blocks_before_after" USING btree ("_path");
  CREATE INDEX "_doctors_v_blocks_before_after_locale_idx" ON "_doctors_v_blocks_before_after" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_treat_cards_order_idx" ON "_doctors_v_blocks_treat_cards" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_treat_cards_parent_id_idx" ON "_doctors_v_blocks_treat_cards" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_treat_cards_path_idx" ON "_doctors_v_blocks_treat_cards" USING btree ("_path");
  CREATE INDEX "_doctors_v_blocks_treat_cards_locale_idx" ON "_doctors_v_blocks_treat_cards" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_post_slider_order_idx" ON "_doctors_v_blocks_post_slider" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_post_slider_parent_id_idx" ON "_doctors_v_blocks_post_slider" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_post_slider_path_idx" ON "_doctors_v_blocks_post_slider" USING btree ("_path");
  CREATE INDEX "_doctors_v_blocks_post_slider_locale_idx" ON "_doctors_v_blocks_post_slider" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_post_slider_logo_idx" ON "_doctors_v_blocks_post_slider" USING btree ("logo_id");
  CREATE INDEX "_doctors_v_blocks_site_cta_order_idx" ON "_doctors_v_blocks_site_cta" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_site_cta_parent_id_idx" ON "_doctors_v_blocks_site_cta" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_site_cta_path_idx" ON "_doctors_v_blocks_site_cta" USING btree ("_path");
  CREATE INDEX "_doctors_v_blocks_site_cta_locale_idx" ON "_doctors_v_blocks_site_cta" USING btree ("_locale");
  CREATE INDEX "_doctors_v_version_education_order_idx" ON "_doctors_v_version_education" USING btree ("_order");
  CREATE INDEX "_doctors_v_version_education_parent_id_idx" ON "_doctors_v_version_education" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_parent_idx" ON "_doctors_v" USING btree ("parent_id");
  CREATE INDEX "_doctors_v_version_version_photo_idx" ON "_doctors_v" USING btree ("version_photo_id");
  CREATE INDEX "_doctors_v_version_version_hero_image_idx" ON "_doctors_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_doctors_v_version_version_slug_idx" ON "_doctors_v" USING btree ("version_slug");
  CREATE INDEX "_doctors_v_version_version_updated_at_idx" ON "_doctors_v" USING btree ("version_updated_at");
  CREATE INDEX "_doctors_v_version_version_created_at_idx" ON "_doctors_v" USING btree ("version_created_at");
  CREATE INDEX "_doctors_v_version_version__status_idx" ON "_doctors_v" USING btree ("version__status");
  CREATE INDEX "_doctors_v_created_at_idx" ON "_doctors_v" USING btree ("created_at");
  CREATE INDEX "_doctors_v_updated_at_idx" ON "_doctors_v" USING btree ("updated_at");
  CREATE INDEX "_doctors_v_snapshot_idx" ON "_doctors_v" USING btree ("snapshot");
  CREATE INDEX "_doctors_v_published_locale_idx" ON "_doctors_v" USING btree ("published_locale");
  CREATE INDEX "_doctors_v_latest_idx" ON "_doctors_v" USING btree ("latest");
  CREATE INDEX "_doctors_v_autosave_idx" ON "_doctors_v" USING btree ("autosave");
  CREATE INDEX "_doctors_v_version_meta_version_meta_image_idx" ON "_doctors_v_locales" USING btree ("version_meta_image_id");
  CREATE UNIQUE INDEX "_doctors_v_locales_locale_parent_id_unique" ON "_doctors_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_doctors_v_texts_order_parent" ON "_doctors_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_doctors_v_texts_locale_parent" ON "_doctors_v_texts" USING btree ("locale","parent_id");
  CREATE INDEX "_doctors_v_rels_order_idx" ON "_doctors_v_rels" USING btree ("order");
  CREATE INDEX "_doctors_v_rels_parent_idx" ON "_doctors_v_rels" USING btree ("parent_id");
  CREATE INDEX "_doctors_v_rels_path_idx" ON "_doctors_v_rels" USING btree ("path");
  CREATE INDEX "_doctors_v_rels_locale_idx" ON "_doctors_v_rels" USING btree ("locale");
  CREATE INDEX "_doctors_v_rels_page_id_idx" ON "_doctors_v_rels" USING btree ("page_id","locale");
  CREATE INDEX "_doctors_v_rels_posts_id_idx" ON "_doctors_v_rels" USING btree ("posts_id","locale");
  CREATE INDEX "_doctors_v_rels_states_id_idx" ON "_doctors_v_rels" USING btree ("states_id","locale");
  CREATE INDEX "_doctors_v_rels_clinics_id_idx" ON "_doctors_v_rels" USING btree ("clinics_id","locale");
  CREATE INDEX "_doctors_v_rels_doctors_id_idx" ON "_doctors_v_rels" USING btree ("doctors_id","locale");
  CREATE INDEX "_doctors_v_rels_treatments_id_idx" ON "_doctors_v_rels" USING btree ("treatments_id","locale");
  CREATE INDEX "_doctors_v_rels_conditions_id_idx" ON "_doctors_v_rels" USING btree ("conditions_id","locale");
  CREATE INDEX "_doctors_v_rels_testimonials_id_idx" ON "_doctors_v_rels" USING btree ("testimonials_id","locale");
  CREATE INDEX "treatments_blocks_logo_strip_logos_order_idx" ON "treatments_blocks_logo_strip_logos" USING btree ("_order");
  CREATE INDEX "treatments_blocks_logo_strip_logos_parent_id_idx" ON "treatments_blocks_logo_strip_logos" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_logo_strip_logos_locale_idx" ON "treatments_blocks_logo_strip_logos" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_logo_strip_logos_image_idx" ON "treatments_blocks_logo_strip_logos" USING btree ("image_id");
  CREATE INDEX "treatments_blocks_logo_strip_order_idx" ON "treatments_blocks_logo_strip" USING btree ("_order");
  CREATE INDEX "treatments_blocks_logo_strip_parent_id_idx" ON "treatments_blocks_logo_strip" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_logo_strip_path_idx" ON "treatments_blocks_logo_strip" USING btree ("_path");
  CREATE INDEX "treatments_blocks_logo_strip_locale_idx" ON "treatments_blocks_logo_strip" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_icon_list_items_order_idx" ON "treatments_blocks_icon_list_items" USING btree ("_order");
  CREATE INDEX "treatments_blocks_icon_list_items_parent_id_idx" ON "treatments_blocks_icon_list_items" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_icon_list_items_locale_idx" ON "treatments_blocks_icon_list_items" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_icon_list_items_icon_idx" ON "treatments_blocks_icon_list_items" USING btree ("icon_id");
  CREATE INDEX "treatments_blocks_icon_list_order_idx" ON "treatments_blocks_icon_list" USING btree ("_order");
  CREATE INDEX "treatments_blocks_icon_list_parent_id_idx" ON "treatments_blocks_icon_list" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_icon_list_path_idx" ON "treatments_blocks_icon_list" USING btree ("_path");
  CREATE INDEX "treatments_blocks_icon_list_locale_idx" ON "treatments_blocks_icon_list" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_media_text_order_idx" ON "treatments_blocks_media_text" USING btree ("_order");
  CREATE INDEX "treatments_blocks_media_text_parent_id_idx" ON "treatments_blocks_media_text" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_media_text_path_idx" ON "treatments_blocks_media_text" USING btree ("_path");
  CREATE INDEX "treatments_blocks_media_text_locale_idx" ON "treatments_blocks_media_text" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_media_text_image_idx" ON "treatments_blocks_media_text" USING btree ("image_id");
  CREATE INDEX "treatments_blocks_insurance_logos_order_idx" ON "treatments_blocks_insurance_logos" USING btree ("_order");
  CREATE INDEX "treatments_blocks_insurance_logos_parent_id_idx" ON "treatments_blocks_insurance_logos" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_insurance_logos_locale_idx" ON "treatments_blocks_insurance_logos" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_insurance_logos_image_idx" ON "treatments_blocks_insurance_logos" USING btree ("image_id");
  CREATE INDEX "treatments_blocks_insurance_order_idx" ON "treatments_blocks_insurance" USING btree ("_order");
  CREATE INDEX "treatments_blocks_insurance_parent_id_idx" ON "treatments_blocks_insurance" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_insurance_path_idx" ON "treatments_blocks_insurance" USING btree ("_path");
  CREATE INDEX "treatments_blocks_insurance_locale_idx" ON "treatments_blocks_insurance" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_doc_slider_order_idx" ON "treatments_blocks_doc_slider" USING btree ("_order");
  CREATE INDEX "treatments_blocks_doc_slider_parent_id_idx" ON "treatments_blocks_doc_slider" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_doc_slider_path_idx" ON "treatments_blocks_doc_slider" USING btree ("_path");
  CREATE INDEX "treatments_blocks_doc_slider_locale_idx" ON "treatments_blocks_doc_slider" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_doc_slider_image_idx" ON "treatments_blocks_doc_slider" USING btree ("image_id");
  CREATE INDEX "treatments_blocks_rev_slider_order_idx" ON "treatments_blocks_rev_slider" USING btree ("_order");
  CREATE INDEX "treatments_blocks_rev_slider_parent_id_idx" ON "treatments_blocks_rev_slider" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_rev_slider_path_idx" ON "treatments_blocks_rev_slider" USING btree ("_path");
  CREATE INDEX "treatments_blocks_rev_slider_locale_idx" ON "treatments_blocks_rev_slider" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_cond_grid_order_idx" ON "treatments_blocks_cond_grid" USING btree ("_order");
  CREATE INDEX "treatments_blocks_cond_grid_parent_id_idx" ON "treatments_blocks_cond_grid" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_cond_grid_path_idx" ON "treatments_blocks_cond_grid" USING btree ("_path");
  CREATE INDEX "treatments_blocks_cond_grid_locale_idx" ON "treatments_blocks_cond_grid" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_before_after_pairs_order_idx" ON "treatments_blocks_before_after_pairs" USING btree ("_order");
  CREATE INDEX "treatments_blocks_before_after_pairs_parent_id_idx" ON "treatments_blocks_before_after_pairs" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_before_after_pairs_locale_idx" ON "treatments_blocks_before_after_pairs" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_before_after_pairs_before_idx" ON "treatments_blocks_before_after_pairs" USING btree ("before_id");
  CREATE INDEX "treatments_blocks_before_after_pairs_after_idx" ON "treatments_blocks_before_after_pairs" USING btree ("after_id");
  CREATE INDEX "treatments_blocks_before_after_order_idx" ON "treatments_blocks_before_after" USING btree ("_order");
  CREATE INDEX "treatments_blocks_before_after_parent_id_idx" ON "treatments_blocks_before_after" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_before_after_path_idx" ON "treatments_blocks_before_after" USING btree ("_path");
  CREATE INDEX "treatments_blocks_before_after_locale_idx" ON "treatments_blocks_before_after" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_treat_cards_order_idx" ON "treatments_blocks_treat_cards" USING btree ("_order");
  CREATE INDEX "treatments_blocks_treat_cards_parent_id_idx" ON "treatments_blocks_treat_cards" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_treat_cards_path_idx" ON "treatments_blocks_treat_cards" USING btree ("_path");
  CREATE INDEX "treatments_blocks_treat_cards_locale_idx" ON "treatments_blocks_treat_cards" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_post_slider_order_idx" ON "treatments_blocks_post_slider" USING btree ("_order");
  CREATE INDEX "treatments_blocks_post_slider_parent_id_idx" ON "treatments_blocks_post_slider" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_post_slider_path_idx" ON "treatments_blocks_post_slider" USING btree ("_path");
  CREATE INDEX "treatments_blocks_post_slider_locale_idx" ON "treatments_blocks_post_slider" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_post_slider_logo_idx" ON "treatments_blocks_post_slider" USING btree ("logo_id");
  CREATE INDEX "treatments_blocks_site_cta_order_idx" ON "treatments_blocks_site_cta" USING btree ("_order");
  CREATE INDEX "treatments_blocks_site_cta_parent_id_idx" ON "treatments_blocks_site_cta" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_site_cta_path_idx" ON "treatments_blocks_site_cta" USING btree ("_path");
  CREATE INDEX "treatments_blocks_site_cta_locale_idx" ON "treatments_blocks_site_cta" USING btree ("_locale");
  CREATE INDEX "treatments_card_image_idx" ON "treatments" USING btree ("card_image_id");
  CREATE INDEX "treatments_hero_image_idx" ON "treatments" USING btree ("hero_image_id");
  CREATE UNIQUE INDEX "treatments_slug_idx" ON "treatments" USING btree ("slug");
  CREATE INDEX "treatments_updated_at_idx" ON "treatments" USING btree ("updated_at");
  CREATE INDEX "treatments_created_at_idx" ON "treatments" USING btree ("created_at");
  CREATE INDEX "treatments__status_idx" ON "treatments" USING btree ("_status");
  CREATE INDEX "treatments_meta_meta_image_idx" ON "treatments_locales" USING btree ("meta_image_id");
  CREATE UNIQUE INDEX "treatments_locales_locale_parent_id_unique" ON "treatments_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "treatments_texts_order_parent" ON "treatments_texts" USING btree ("order","parent_id");
  CREATE INDEX "treatments_texts_locale_parent" ON "treatments_texts" USING btree ("locale","parent_id");
  CREATE INDEX "treatments_rels_order_idx" ON "treatments_rels" USING btree ("order");
  CREATE INDEX "treatments_rels_parent_idx" ON "treatments_rels" USING btree ("parent_id");
  CREATE INDEX "treatments_rels_path_idx" ON "treatments_rels" USING btree ("path");
  CREATE INDEX "treatments_rels_locale_idx" ON "treatments_rels" USING btree ("locale");
  CREATE INDEX "treatments_rels_page_id_idx" ON "treatments_rels" USING btree ("page_id","locale");
  CREATE INDEX "treatments_rels_posts_id_idx" ON "treatments_rels" USING btree ("posts_id","locale");
  CREATE INDEX "treatments_rels_states_id_idx" ON "treatments_rels" USING btree ("states_id","locale");
  CREATE INDEX "treatments_rels_clinics_id_idx" ON "treatments_rels" USING btree ("clinics_id","locale");
  CREATE INDEX "treatments_rels_doctors_id_idx" ON "treatments_rels" USING btree ("doctors_id","locale");
  CREATE INDEX "treatments_rels_treatments_id_idx" ON "treatments_rels" USING btree ("treatments_id","locale");
  CREATE INDEX "treatments_rels_conditions_id_idx" ON "treatments_rels" USING btree ("conditions_id","locale");
  CREATE INDEX "treatments_rels_testimonials_id_idx" ON "treatments_rels" USING btree ("testimonials_id","locale");
  CREATE INDEX "_treatments_v_blocks_logo_strip_logos_order_idx" ON "_treatments_v_blocks_logo_strip_logos" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_logo_strip_logos_parent_id_idx" ON "_treatments_v_blocks_logo_strip_logos" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_logo_strip_logos_locale_idx" ON "_treatments_v_blocks_logo_strip_logos" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_logo_strip_logos_image_idx" ON "_treatments_v_blocks_logo_strip_logos" USING btree ("image_id");
  CREATE INDEX "_treatments_v_blocks_logo_strip_order_idx" ON "_treatments_v_blocks_logo_strip" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_logo_strip_parent_id_idx" ON "_treatments_v_blocks_logo_strip" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_logo_strip_path_idx" ON "_treatments_v_blocks_logo_strip" USING btree ("_path");
  CREATE INDEX "_treatments_v_blocks_logo_strip_locale_idx" ON "_treatments_v_blocks_logo_strip" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_icon_list_items_order_idx" ON "_treatments_v_blocks_icon_list_items" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_icon_list_items_parent_id_idx" ON "_treatments_v_blocks_icon_list_items" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_icon_list_items_locale_idx" ON "_treatments_v_blocks_icon_list_items" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_icon_list_items_icon_idx" ON "_treatments_v_blocks_icon_list_items" USING btree ("icon_id");
  CREATE INDEX "_treatments_v_blocks_icon_list_order_idx" ON "_treatments_v_blocks_icon_list" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_icon_list_parent_id_idx" ON "_treatments_v_blocks_icon_list" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_icon_list_path_idx" ON "_treatments_v_blocks_icon_list" USING btree ("_path");
  CREATE INDEX "_treatments_v_blocks_icon_list_locale_idx" ON "_treatments_v_blocks_icon_list" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_media_text_order_idx" ON "_treatments_v_blocks_media_text" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_media_text_parent_id_idx" ON "_treatments_v_blocks_media_text" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_media_text_path_idx" ON "_treatments_v_blocks_media_text" USING btree ("_path");
  CREATE INDEX "_treatments_v_blocks_media_text_locale_idx" ON "_treatments_v_blocks_media_text" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_media_text_image_idx" ON "_treatments_v_blocks_media_text" USING btree ("image_id");
  CREATE INDEX "_treatments_v_blocks_insurance_logos_order_idx" ON "_treatments_v_blocks_insurance_logos" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_insurance_logos_parent_id_idx" ON "_treatments_v_blocks_insurance_logos" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_insurance_logos_locale_idx" ON "_treatments_v_blocks_insurance_logos" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_insurance_logos_image_idx" ON "_treatments_v_blocks_insurance_logos" USING btree ("image_id");
  CREATE INDEX "_treatments_v_blocks_insurance_order_idx" ON "_treatments_v_blocks_insurance" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_insurance_parent_id_idx" ON "_treatments_v_blocks_insurance" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_insurance_path_idx" ON "_treatments_v_blocks_insurance" USING btree ("_path");
  CREATE INDEX "_treatments_v_blocks_insurance_locale_idx" ON "_treatments_v_blocks_insurance" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_doc_slider_order_idx" ON "_treatments_v_blocks_doc_slider" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_doc_slider_parent_id_idx" ON "_treatments_v_blocks_doc_slider" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_doc_slider_path_idx" ON "_treatments_v_blocks_doc_slider" USING btree ("_path");
  CREATE INDEX "_treatments_v_blocks_doc_slider_locale_idx" ON "_treatments_v_blocks_doc_slider" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_doc_slider_image_idx" ON "_treatments_v_blocks_doc_slider" USING btree ("image_id");
  CREATE INDEX "_treatments_v_blocks_rev_slider_order_idx" ON "_treatments_v_blocks_rev_slider" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_rev_slider_parent_id_idx" ON "_treatments_v_blocks_rev_slider" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_rev_slider_path_idx" ON "_treatments_v_blocks_rev_slider" USING btree ("_path");
  CREATE INDEX "_treatments_v_blocks_rev_slider_locale_idx" ON "_treatments_v_blocks_rev_slider" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_cond_grid_order_idx" ON "_treatments_v_blocks_cond_grid" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_cond_grid_parent_id_idx" ON "_treatments_v_blocks_cond_grid" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_cond_grid_path_idx" ON "_treatments_v_blocks_cond_grid" USING btree ("_path");
  CREATE INDEX "_treatments_v_blocks_cond_grid_locale_idx" ON "_treatments_v_blocks_cond_grid" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_before_after_pairs_order_idx" ON "_treatments_v_blocks_before_after_pairs" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_before_after_pairs_parent_id_idx" ON "_treatments_v_blocks_before_after_pairs" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_before_after_pairs_locale_idx" ON "_treatments_v_blocks_before_after_pairs" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_before_after_pairs_before_idx" ON "_treatments_v_blocks_before_after_pairs" USING btree ("before_id");
  CREATE INDEX "_treatments_v_blocks_before_after_pairs_after_idx" ON "_treatments_v_blocks_before_after_pairs" USING btree ("after_id");
  CREATE INDEX "_treatments_v_blocks_before_after_order_idx" ON "_treatments_v_blocks_before_after" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_before_after_parent_id_idx" ON "_treatments_v_blocks_before_after" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_before_after_path_idx" ON "_treatments_v_blocks_before_after" USING btree ("_path");
  CREATE INDEX "_treatments_v_blocks_before_after_locale_idx" ON "_treatments_v_blocks_before_after" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_treat_cards_order_idx" ON "_treatments_v_blocks_treat_cards" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_treat_cards_parent_id_idx" ON "_treatments_v_blocks_treat_cards" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_treat_cards_path_idx" ON "_treatments_v_blocks_treat_cards" USING btree ("_path");
  CREATE INDEX "_treatments_v_blocks_treat_cards_locale_idx" ON "_treatments_v_blocks_treat_cards" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_post_slider_order_idx" ON "_treatments_v_blocks_post_slider" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_post_slider_parent_id_idx" ON "_treatments_v_blocks_post_slider" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_post_slider_path_idx" ON "_treatments_v_blocks_post_slider" USING btree ("_path");
  CREATE INDEX "_treatments_v_blocks_post_slider_locale_idx" ON "_treatments_v_blocks_post_slider" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_post_slider_logo_idx" ON "_treatments_v_blocks_post_slider" USING btree ("logo_id");
  CREATE INDEX "_treatments_v_blocks_site_cta_order_idx" ON "_treatments_v_blocks_site_cta" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_site_cta_parent_id_idx" ON "_treatments_v_blocks_site_cta" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_site_cta_path_idx" ON "_treatments_v_blocks_site_cta" USING btree ("_path");
  CREATE INDEX "_treatments_v_blocks_site_cta_locale_idx" ON "_treatments_v_blocks_site_cta" USING btree ("_locale");
  CREATE INDEX "_treatments_v_parent_idx" ON "_treatments_v" USING btree ("parent_id");
  CREATE INDEX "_treatments_v_version_version_card_image_idx" ON "_treatments_v" USING btree ("version_card_image_id");
  CREATE INDEX "_treatments_v_version_version_hero_image_idx" ON "_treatments_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_treatments_v_version_version_slug_idx" ON "_treatments_v" USING btree ("version_slug");
  CREATE INDEX "_treatments_v_version_version_updated_at_idx" ON "_treatments_v" USING btree ("version_updated_at");
  CREATE INDEX "_treatments_v_version_version_created_at_idx" ON "_treatments_v" USING btree ("version_created_at");
  CREATE INDEX "_treatments_v_version_version__status_idx" ON "_treatments_v" USING btree ("version__status");
  CREATE INDEX "_treatments_v_created_at_idx" ON "_treatments_v" USING btree ("created_at");
  CREATE INDEX "_treatments_v_updated_at_idx" ON "_treatments_v" USING btree ("updated_at");
  CREATE INDEX "_treatments_v_snapshot_idx" ON "_treatments_v" USING btree ("snapshot");
  CREATE INDEX "_treatments_v_published_locale_idx" ON "_treatments_v" USING btree ("published_locale");
  CREATE INDEX "_treatments_v_latest_idx" ON "_treatments_v" USING btree ("latest");
  CREATE INDEX "_treatments_v_autosave_idx" ON "_treatments_v" USING btree ("autosave");
  CREATE INDEX "_treatments_v_version_meta_version_meta_image_idx" ON "_treatments_v_locales" USING btree ("version_meta_image_id");
  CREATE UNIQUE INDEX "_treatments_v_locales_locale_parent_id_unique" ON "_treatments_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_treatments_v_texts_order_parent" ON "_treatments_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_treatments_v_texts_locale_parent" ON "_treatments_v_texts" USING btree ("locale","parent_id");
  CREATE INDEX "_treatments_v_rels_order_idx" ON "_treatments_v_rels" USING btree ("order");
  CREATE INDEX "_treatments_v_rels_parent_idx" ON "_treatments_v_rels" USING btree ("parent_id");
  CREATE INDEX "_treatments_v_rels_path_idx" ON "_treatments_v_rels" USING btree ("path");
  CREATE INDEX "_treatments_v_rels_locale_idx" ON "_treatments_v_rels" USING btree ("locale");
  CREATE INDEX "_treatments_v_rels_page_id_idx" ON "_treatments_v_rels" USING btree ("page_id","locale");
  CREATE INDEX "_treatments_v_rels_posts_id_idx" ON "_treatments_v_rels" USING btree ("posts_id","locale");
  CREATE INDEX "_treatments_v_rels_states_id_idx" ON "_treatments_v_rels" USING btree ("states_id","locale");
  CREATE INDEX "_treatments_v_rels_clinics_id_idx" ON "_treatments_v_rels" USING btree ("clinics_id","locale");
  CREATE INDEX "_treatments_v_rels_doctors_id_idx" ON "_treatments_v_rels" USING btree ("doctors_id","locale");
  CREATE INDEX "_treatments_v_rels_treatments_id_idx" ON "_treatments_v_rels" USING btree ("treatments_id","locale");
  CREATE INDEX "_treatments_v_rels_conditions_id_idx" ON "_treatments_v_rels" USING btree ("conditions_id","locale");
  CREATE INDEX "_treatments_v_rels_testimonials_id_idx" ON "_treatments_v_rels" USING btree ("testimonials_id","locale");
  CREATE INDEX "conditions_blocks_logo_strip_logos_order_idx" ON "conditions_blocks_logo_strip_logos" USING btree ("_order");
  CREATE INDEX "conditions_blocks_logo_strip_logos_parent_id_idx" ON "conditions_blocks_logo_strip_logos" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_logo_strip_logos_locale_idx" ON "conditions_blocks_logo_strip_logos" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_logo_strip_logos_image_idx" ON "conditions_blocks_logo_strip_logos" USING btree ("image_id");
  CREATE INDEX "conditions_blocks_logo_strip_order_idx" ON "conditions_blocks_logo_strip" USING btree ("_order");
  CREATE INDEX "conditions_blocks_logo_strip_parent_id_idx" ON "conditions_blocks_logo_strip" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_logo_strip_path_idx" ON "conditions_blocks_logo_strip" USING btree ("_path");
  CREATE INDEX "conditions_blocks_logo_strip_locale_idx" ON "conditions_blocks_logo_strip" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_icon_list_items_order_idx" ON "conditions_blocks_icon_list_items" USING btree ("_order");
  CREATE INDEX "conditions_blocks_icon_list_items_parent_id_idx" ON "conditions_blocks_icon_list_items" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_icon_list_items_locale_idx" ON "conditions_blocks_icon_list_items" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_icon_list_items_icon_idx" ON "conditions_blocks_icon_list_items" USING btree ("icon_id");
  CREATE INDEX "conditions_blocks_icon_list_order_idx" ON "conditions_blocks_icon_list" USING btree ("_order");
  CREATE INDEX "conditions_blocks_icon_list_parent_id_idx" ON "conditions_blocks_icon_list" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_icon_list_path_idx" ON "conditions_blocks_icon_list" USING btree ("_path");
  CREATE INDEX "conditions_blocks_icon_list_locale_idx" ON "conditions_blocks_icon_list" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_media_text_order_idx" ON "conditions_blocks_media_text" USING btree ("_order");
  CREATE INDEX "conditions_blocks_media_text_parent_id_idx" ON "conditions_blocks_media_text" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_media_text_path_idx" ON "conditions_blocks_media_text" USING btree ("_path");
  CREATE INDEX "conditions_blocks_media_text_locale_idx" ON "conditions_blocks_media_text" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_media_text_image_idx" ON "conditions_blocks_media_text" USING btree ("image_id");
  CREATE INDEX "conditions_blocks_insurance_logos_order_idx" ON "conditions_blocks_insurance_logos" USING btree ("_order");
  CREATE INDEX "conditions_blocks_insurance_logos_parent_id_idx" ON "conditions_blocks_insurance_logos" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_insurance_logos_locale_idx" ON "conditions_blocks_insurance_logos" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_insurance_logos_image_idx" ON "conditions_blocks_insurance_logos" USING btree ("image_id");
  CREATE INDEX "conditions_blocks_insurance_order_idx" ON "conditions_blocks_insurance" USING btree ("_order");
  CREATE INDEX "conditions_blocks_insurance_parent_id_idx" ON "conditions_blocks_insurance" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_insurance_path_idx" ON "conditions_blocks_insurance" USING btree ("_path");
  CREATE INDEX "conditions_blocks_insurance_locale_idx" ON "conditions_blocks_insurance" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_doc_slider_order_idx" ON "conditions_blocks_doc_slider" USING btree ("_order");
  CREATE INDEX "conditions_blocks_doc_slider_parent_id_idx" ON "conditions_blocks_doc_slider" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_doc_slider_path_idx" ON "conditions_blocks_doc_slider" USING btree ("_path");
  CREATE INDEX "conditions_blocks_doc_slider_locale_idx" ON "conditions_blocks_doc_slider" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_doc_slider_image_idx" ON "conditions_blocks_doc_slider" USING btree ("image_id");
  CREATE INDEX "conditions_blocks_rev_slider_order_idx" ON "conditions_blocks_rev_slider" USING btree ("_order");
  CREATE INDEX "conditions_blocks_rev_slider_parent_id_idx" ON "conditions_blocks_rev_slider" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_rev_slider_path_idx" ON "conditions_blocks_rev_slider" USING btree ("_path");
  CREATE INDEX "conditions_blocks_rev_slider_locale_idx" ON "conditions_blocks_rev_slider" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_cond_grid_order_idx" ON "conditions_blocks_cond_grid" USING btree ("_order");
  CREATE INDEX "conditions_blocks_cond_grid_parent_id_idx" ON "conditions_blocks_cond_grid" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_cond_grid_path_idx" ON "conditions_blocks_cond_grid" USING btree ("_path");
  CREATE INDEX "conditions_blocks_cond_grid_locale_idx" ON "conditions_blocks_cond_grid" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_before_after_pairs_order_idx" ON "conditions_blocks_before_after_pairs" USING btree ("_order");
  CREATE INDEX "conditions_blocks_before_after_pairs_parent_id_idx" ON "conditions_blocks_before_after_pairs" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_before_after_pairs_locale_idx" ON "conditions_blocks_before_after_pairs" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_before_after_pairs_before_idx" ON "conditions_blocks_before_after_pairs" USING btree ("before_id");
  CREATE INDEX "conditions_blocks_before_after_pairs_after_idx" ON "conditions_blocks_before_after_pairs" USING btree ("after_id");
  CREATE INDEX "conditions_blocks_before_after_order_idx" ON "conditions_blocks_before_after" USING btree ("_order");
  CREATE INDEX "conditions_blocks_before_after_parent_id_idx" ON "conditions_blocks_before_after" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_before_after_path_idx" ON "conditions_blocks_before_after" USING btree ("_path");
  CREATE INDEX "conditions_blocks_before_after_locale_idx" ON "conditions_blocks_before_after" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_treat_cards_order_idx" ON "conditions_blocks_treat_cards" USING btree ("_order");
  CREATE INDEX "conditions_blocks_treat_cards_parent_id_idx" ON "conditions_blocks_treat_cards" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_treat_cards_path_idx" ON "conditions_blocks_treat_cards" USING btree ("_path");
  CREATE INDEX "conditions_blocks_treat_cards_locale_idx" ON "conditions_blocks_treat_cards" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_post_slider_order_idx" ON "conditions_blocks_post_slider" USING btree ("_order");
  CREATE INDEX "conditions_blocks_post_slider_parent_id_idx" ON "conditions_blocks_post_slider" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_post_slider_path_idx" ON "conditions_blocks_post_slider" USING btree ("_path");
  CREATE INDEX "conditions_blocks_post_slider_locale_idx" ON "conditions_blocks_post_slider" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_post_slider_logo_idx" ON "conditions_blocks_post_slider" USING btree ("logo_id");
  CREATE INDEX "conditions_blocks_site_cta_order_idx" ON "conditions_blocks_site_cta" USING btree ("_order");
  CREATE INDEX "conditions_blocks_site_cta_parent_id_idx" ON "conditions_blocks_site_cta" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_site_cta_path_idx" ON "conditions_blocks_site_cta" USING btree ("_path");
  CREATE INDEX "conditions_blocks_site_cta_locale_idx" ON "conditions_blocks_site_cta" USING btree ("_locale");
  CREATE INDEX "conditions_icon_idx" ON "conditions" USING btree ("icon_id");
  CREATE INDEX "conditions_hero_image_idx" ON "conditions" USING btree ("hero_image_id");
  CREATE UNIQUE INDEX "conditions_slug_idx" ON "conditions" USING btree ("slug");
  CREATE INDEX "conditions_updated_at_idx" ON "conditions" USING btree ("updated_at");
  CREATE INDEX "conditions_created_at_idx" ON "conditions" USING btree ("created_at");
  CREATE INDEX "conditions__status_idx" ON "conditions" USING btree ("_status");
  CREATE INDEX "conditions_meta_meta_image_idx" ON "conditions_locales" USING btree ("meta_image_id");
  CREATE UNIQUE INDEX "conditions_locales_locale_parent_id_unique" ON "conditions_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "conditions_texts_order_parent" ON "conditions_texts" USING btree ("order","parent_id");
  CREATE INDEX "conditions_texts_locale_parent" ON "conditions_texts" USING btree ("locale","parent_id");
  CREATE INDEX "conditions_rels_order_idx" ON "conditions_rels" USING btree ("order");
  CREATE INDEX "conditions_rels_parent_idx" ON "conditions_rels" USING btree ("parent_id");
  CREATE INDEX "conditions_rels_path_idx" ON "conditions_rels" USING btree ("path");
  CREATE INDEX "conditions_rels_locale_idx" ON "conditions_rels" USING btree ("locale");
  CREATE INDEX "conditions_rels_page_id_idx" ON "conditions_rels" USING btree ("page_id","locale");
  CREATE INDEX "conditions_rels_posts_id_idx" ON "conditions_rels" USING btree ("posts_id","locale");
  CREATE INDEX "conditions_rels_states_id_idx" ON "conditions_rels" USING btree ("states_id","locale");
  CREATE INDEX "conditions_rels_clinics_id_idx" ON "conditions_rels" USING btree ("clinics_id","locale");
  CREATE INDEX "conditions_rels_doctors_id_idx" ON "conditions_rels" USING btree ("doctors_id","locale");
  CREATE INDEX "conditions_rels_treatments_id_idx" ON "conditions_rels" USING btree ("treatments_id","locale");
  CREATE INDEX "conditions_rels_conditions_id_idx" ON "conditions_rels" USING btree ("conditions_id","locale");
  CREATE INDEX "conditions_rels_testimonials_id_idx" ON "conditions_rels" USING btree ("testimonials_id","locale");
  CREATE INDEX "_conditions_v_blocks_logo_strip_logos_order_idx" ON "_conditions_v_blocks_logo_strip_logos" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_logo_strip_logos_parent_id_idx" ON "_conditions_v_blocks_logo_strip_logos" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_logo_strip_logos_locale_idx" ON "_conditions_v_blocks_logo_strip_logos" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_logo_strip_logos_image_idx" ON "_conditions_v_blocks_logo_strip_logos" USING btree ("image_id");
  CREATE INDEX "_conditions_v_blocks_logo_strip_order_idx" ON "_conditions_v_blocks_logo_strip" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_logo_strip_parent_id_idx" ON "_conditions_v_blocks_logo_strip" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_logo_strip_path_idx" ON "_conditions_v_blocks_logo_strip" USING btree ("_path");
  CREATE INDEX "_conditions_v_blocks_logo_strip_locale_idx" ON "_conditions_v_blocks_logo_strip" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_icon_list_items_order_idx" ON "_conditions_v_blocks_icon_list_items" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_icon_list_items_parent_id_idx" ON "_conditions_v_blocks_icon_list_items" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_icon_list_items_locale_idx" ON "_conditions_v_blocks_icon_list_items" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_icon_list_items_icon_idx" ON "_conditions_v_blocks_icon_list_items" USING btree ("icon_id");
  CREATE INDEX "_conditions_v_blocks_icon_list_order_idx" ON "_conditions_v_blocks_icon_list" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_icon_list_parent_id_idx" ON "_conditions_v_blocks_icon_list" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_icon_list_path_idx" ON "_conditions_v_blocks_icon_list" USING btree ("_path");
  CREATE INDEX "_conditions_v_blocks_icon_list_locale_idx" ON "_conditions_v_blocks_icon_list" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_media_text_order_idx" ON "_conditions_v_blocks_media_text" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_media_text_parent_id_idx" ON "_conditions_v_blocks_media_text" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_media_text_path_idx" ON "_conditions_v_blocks_media_text" USING btree ("_path");
  CREATE INDEX "_conditions_v_blocks_media_text_locale_idx" ON "_conditions_v_blocks_media_text" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_media_text_image_idx" ON "_conditions_v_blocks_media_text" USING btree ("image_id");
  CREATE INDEX "_conditions_v_blocks_insurance_logos_order_idx" ON "_conditions_v_blocks_insurance_logos" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_insurance_logos_parent_id_idx" ON "_conditions_v_blocks_insurance_logos" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_insurance_logos_locale_idx" ON "_conditions_v_blocks_insurance_logos" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_insurance_logos_image_idx" ON "_conditions_v_blocks_insurance_logos" USING btree ("image_id");
  CREATE INDEX "_conditions_v_blocks_insurance_order_idx" ON "_conditions_v_blocks_insurance" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_insurance_parent_id_idx" ON "_conditions_v_blocks_insurance" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_insurance_path_idx" ON "_conditions_v_blocks_insurance" USING btree ("_path");
  CREATE INDEX "_conditions_v_blocks_insurance_locale_idx" ON "_conditions_v_blocks_insurance" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_doc_slider_order_idx" ON "_conditions_v_blocks_doc_slider" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_doc_slider_parent_id_idx" ON "_conditions_v_blocks_doc_slider" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_doc_slider_path_idx" ON "_conditions_v_blocks_doc_slider" USING btree ("_path");
  CREATE INDEX "_conditions_v_blocks_doc_slider_locale_idx" ON "_conditions_v_blocks_doc_slider" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_doc_slider_image_idx" ON "_conditions_v_blocks_doc_slider" USING btree ("image_id");
  CREATE INDEX "_conditions_v_blocks_rev_slider_order_idx" ON "_conditions_v_blocks_rev_slider" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_rev_slider_parent_id_idx" ON "_conditions_v_blocks_rev_slider" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_rev_slider_path_idx" ON "_conditions_v_blocks_rev_slider" USING btree ("_path");
  CREATE INDEX "_conditions_v_blocks_rev_slider_locale_idx" ON "_conditions_v_blocks_rev_slider" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_cond_grid_order_idx" ON "_conditions_v_blocks_cond_grid" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_cond_grid_parent_id_idx" ON "_conditions_v_blocks_cond_grid" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_cond_grid_path_idx" ON "_conditions_v_blocks_cond_grid" USING btree ("_path");
  CREATE INDEX "_conditions_v_blocks_cond_grid_locale_idx" ON "_conditions_v_blocks_cond_grid" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_before_after_pairs_order_idx" ON "_conditions_v_blocks_before_after_pairs" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_before_after_pairs_parent_id_idx" ON "_conditions_v_blocks_before_after_pairs" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_before_after_pairs_locale_idx" ON "_conditions_v_blocks_before_after_pairs" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_before_after_pairs_before_idx" ON "_conditions_v_blocks_before_after_pairs" USING btree ("before_id");
  CREATE INDEX "_conditions_v_blocks_before_after_pairs_after_idx" ON "_conditions_v_blocks_before_after_pairs" USING btree ("after_id");
  CREATE INDEX "_conditions_v_blocks_before_after_order_idx" ON "_conditions_v_blocks_before_after" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_before_after_parent_id_idx" ON "_conditions_v_blocks_before_after" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_before_after_path_idx" ON "_conditions_v_blocks_before_after" USING btree ("_path");
  CREATE INDEX "_conditions_v_blocks_before_after_locale_idx" ON "_conditions_v_blocks_before_after" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_treat_cards_order_idx" ON "_conditions_v_blocks_treat_cards" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_treat_cards_parent_id_idx" ON "_conditions_v_blocks_treat_cards" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_treat_cards_path_idx" ON "_conditions_v_blocks_treat_cards" USING btree ("_path");
  CREATE INDEX "_conditions_v_blocks_treat_cards_locale_idx" ON "_conditions_v_blocks_treat_cards" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_post_slider_order_idx" ON "_conditions_v_blocks_post_slider" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_post_slider_parent_id_idx" ON "_conditions_v_blocks_post_slider" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_post_slider_path_idx" ON "_conditions_v_blocks_post_slider" USING btree ("_path");
  CREATE INDEX "_conditions_v_blocks_post_slider_locale_idx" ON "_conditions_v_blocks_post_slider" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_post_slider_logo_idx" ON "_conditions_v_blocks_post_slider" USING btree ("logo_id");
  CREATE INDEX "_conditions_v_blocks_site_cta_order_idx" ON "_conditions_v_blocks_site_cta" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_site_cta_parent_id_idx" ON "_conditions_v_blocks_site_cta" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_site_cta_path_idx" ON "_conditions_v_blocks_site_cta" USING btree ("_path");
  CREATE INDEX "_conditions_v_blocks_site_cta_locale_idx" ON "_conditions_v_blocks_site_cta" USING btree ("_locale");
  CREATE INDEX "_conditions_v_parent_idx" ON "_conditions_v" USING btree ("parent_id");
  CREATE INDEX "_conditions_v_version_version_icon_idx" ON "_conditions_v" USING btree ("version_icon_id");
  CREATE INDEX "_conditions_v_version_version_hero_image_idx" ON "_conditions_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_conditions_v_version_version_slug_idx" ON "_conditions_v" USING btree ("version_slug");
  CREATE INDEX "_conditions_v_version_version_updated_at_idx" ON "_conditions_v" USING btree ("version_updated_at");
  CREATE INDEX "_conditions_v_version_version_created_at_idx" ON "_conditions_v" USING btree ("version_created_at");
  CREATE INDEX "_conditions_v_version_version__status_idx" ON "_conditions_v" USING btree ("version__status");
  CREATE INDEX "_conditions_v_created_at_idx" ON "_conditions_v" USING btree ("created_at");
  CREATE INDEX "_conditions_v_updated_at_idx" ON "_conditions_v" USING btree ("updated_at");
  CREATE INDEX "_conditions_v_snapshot_idx" ON "_conditions_v" USING btree ("snapshot");
  CREATE INDEX "_conditions_v_published_locale_idx" ON "_conditions_v" USING btree ("published_locale");
  CREATE INDEX "_conditions_v_latest_idx" ON "_conditions_v" USING btree ("latest");
  CREATE INDEX "_conditions_v_autosave_idx" ON "_conditions_v" USING btree ("autosave");
  CREATE INDEX "_conditions_v_version_meta_version_meta_image_idx" ON "_conditions_v_locales" USING btree ("version_meta_image_id");
  CREATE UNIQUE INDEX "_conditions_v_locales_locale_parent_id_unique" ON "_conditions_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_conditions_v_texts_order_parent" ON "_conditions_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_conditions_v_texts_locale_parent" ON "_conditions_v_texts" USING btree ("locale","parent_id");
  CREATE INDEX "_conditions_v_rels_order_idx" ON "_conditions_v_rels" USING btree ("order");
  CREATE INDEX "_conditions_v_rels_parent_idx" ON "_conditions_v_rels" USING btree ("parent_id");
  CREATE INDEX "_conditions_v_rels_path_idx" ON "_conditions_v_rels" USING btree ("path");
  CREATE INDEX "_conditions_v_rels_locale_idx" ON "_conditions_v_rels" USING btree ("locale");
  CREATE INDEX "_conditions_v_rels_page_id_idx" ON "_conditions_v_rels" USING btree ("page_id","locale");
  CREATE INDEX "_conditions_v_rels_posts_id_idx" ON "_conditions_v_rels" USING btree ("posts_id","locale");
  CREATE INDEX "_conditions_v_rels_states_id_idx" ON "_conditions_v_rels" USING btree ("states_id","locale");
  CREATE INDEX "_conditions_v_rels_clinics_id_idx" ON "_conditions_v_rels" USING btree ("clinics_id","locale");
  CREATE INDEX "_conditions_v_rels_doctors_id_idx" ON "_conditions_v_rels" USING btree ("doctors_id","locale");
  CREATE INDEX "_conditions_v_rels_treatments_id_idx" ON "_conditions_v_rels" USING btree ("treatments_id","locale");
  CREATE INDEX "_conditions_v_rels_conditions_id_idx" ON "_conditions_v_rels" USING btree ("conditions_id","locale");
  CREATE INDEX "_conditions_v_rels_testimonials_id_idx" ON "_conditions_v_rels" USING btree ("testimonials_id","locale");
  CREATE INDEX "header_more_links_order_idx" ON "header_more_links" USING btree ("_order");
  CREATE INDEX "header_more_links_parent_id_idx" ON "header_more_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "header_more_links_locales_locale_parent_id_unique" ON "header_more_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_header_v_version_more_links_order_idx" ON "_header_v_version_more_links" USING btree ("_order");
  CREATE INDEX "_header_v_version_more_links_parent_id_idx" ON "_header_v_version_more_links" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_header_v_version_more_links_locales_locale_parent_id_unique" ON "_header_v_version_more_links_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "footer_social_order_idx" ON "footer_social" USING btree ("_order");
  CREATE INDEX "footer_social_parent_id_idx" ON "footer_social" USING btree ("_parent_id");
  CREATE INDEX "_footer_v_version_social_order_idx" ON "_footer_v_version_social" USING btree ("_order");
  CREATE INDEX "_footer_v_version_social_parent_id_idx" ON "_footer_v_version_social" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_hero_video_order_idx" ON "presets_blocks_hero_video" USING btree ("_order");
  CREATE INDEX "presets_blocks_hero_video_parent_id_idx" ON "presets_blocks_hero_video" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_hero_video_path_idx" ON "presets_blocks_hero_video" USING btree ("_path");
  CREATE INDEX "presets_blocks_hero_video_poster_idx" ON "presets_blocks_hero_video" USING btree ("poster_id");
  CREATE INDEX "presets_blocks_hero_banner_order_idx" ON "presets_blocks_hero_banner" USING btree ("_order");
  CREATE INDEX "presets_blocks_hero_banner_parent_id_idx" ON "presets_blocks_hero_banner" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_hero_banner_path_idx" ON "presets_blocks_hero_banner" USING btree ("_path");
  CREATE INDEX "presets_blocks_hero_banner_image_idx" ON "presets_blocks_hero_banner" USING btree ("image_id");
  CREATE INDEX "presets_blocks_logo_strip_logos_order_idx" ON "presets_blocks_logo_strip_logos" USING btree ("_order");
  CREATE INDEX "presets_blocks_logo_strip_logos_parent_id_idx" ON "presets_blocks_logo_strip_logos" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_logo_strip_logos_image_idx" ON "presets_blocks_logo_strip_logos" USING btree ("image_id");
  CREATE INDEX "presets_blocks_logo_strip_order_idx" ON "presets_blocks_logo_strip" USING btree ("_order");
  CREATE INDEX "presets_blocks_logo_strip_parent_id_idx" ON "presets_blocks_logo_strip" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_logo_strip_path_idx" ON "presets_blocks_logo_strip" USING btree ("_path");
  CREATE INDEX "presets_blocks_icon_list_items_order_idx" ON "presets_blocks_icon_list_items" USING btree ("_order");
  CREATE INDEX "presets_blocks_icon_list_items_parent_id_idx" ON "presets_blocks_icon_list_items" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_icon_list_items_icon_idx" ON "presets_blocks_icon_list_items" USING btree ("icon_id");
  CREATE INDEX "presets_blocks_icon_list_order_idx" ON "presets_blocks_icon_list" USING btree ("_order");
  CREATE INDEX "presets_blocks_icon_list_parent_id_idx" ON "presets_blocks_icon_list" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_icon_list_path_idx" ON "presets_blocks_icon_list" USING btree ("_path");
  CREATE INDEX "presets_blocks_media_text_order_idx" ON "presets_blocks_media_text" USING btree ("_order");
  CREATE INDEX "presets_blocks_media_text_parent_id_idx" ON "presets_blocks_media_text" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_media_text_path_idx" ON "presets_blocks_media_text" USING btree ("_path");
  CREATE INDEX "presets_blocks_media_text_image_idx" ON "presets_blocks_media_text" USING btree ("image_id");
  CREATE INDEX "presets_blocks_insurance_logos_order_idx" ON "presets_blocks_insurance_logos" USING btree ("_order");
  CREATE INDEX "presets_blocks_insurance_logos_parent_id_idx" ON "presets_blocks_insurance_logos" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_insurance_logos_image_idx" ON "presets_blocks_insurance_logos" USING btree ("image_id");
  CREATE INDEX "presets_blocks_insurance_order_idx" ON "presets_blocks_insurance" USING btree ("_order");
  CREATE INDEX "presets_blocks_insurance_parent_id_idx" ON "presets_blocks_insurance" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_insurance_path_idx" ON "presets_blocks_insurance" USING btree ("_path");
  CREATE INDEX "presets_blocks_doc_slider_order_idx" ON "presets_blocks_doc_slider" USING btree ("_order");
  CREATE INDEX "presets_blocks_doc_slider_parent_id_idx" ON "presets_blocks_doc_slider" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_doc_slider_path_idx" ON "presets_blocks_doc_slider" USING btree ("_path");
  CREATE INDEX "presets_blocks_doc_slider_image_idx" ON "presets_blocks_doc_slider" USING btree ("image_id");
  CREATE INDEX "presets_blocks_rev_slider_order_idx" ON "presets_blocks_rev_slider" USING btree ("_order");
  CREATE INDEX "presets_blocks_rev_slider_parent_id_idx" ON "presets_blocks_rev_slider" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_rev_slider_path_idx" ON "presets_blocks_rev_slider" USING btree ("_path");
  CREATE INDEX "presets_blocks_cond_grid_order_idx" ON "presets_blocks_cond_grid" USING btree ("_order");
  CREATE INDEX "presets_blocks_cond_grid_parent_id_idx" ON "presets_blocks_cond_grid" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_cond_grid_path_idx" ON "presets_blocks_cond_grid" USING btree ("_path");
  CREATE INDEX "presets_blocks_before_after_pairs_order_idx" ON "presets_blocks_before_after_pairs" USING btree ("_order");
  CREATE INDEX "presets_blocks_before_after_pairs_parent_id_idx" ON "presets_blocks_before_after_pairs" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_before_after_pairs_before_idx" ON "presets_blocks_before_after_pairs" USING btree ("before_id");
  CREATE INDEX "presets_blocks_before_after_pairs_after_idx" ON "presets_blocks_before_after_pairs" USING btree ("after_id");
  CREATE INDEX "presets_blocks_before_after_order_idx" ON "presets_blocks_before_after" USING btree ("_order");
  CREATE INDEX "presets_blocks_before_after_parent_id_idx" ON "presets_blocks_before_after" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_before_after_path_idx" ON "presets_blocks_before_after" USING btree ("_path");
  CREATE INDEX "presets_blocks_treat_cards_order_idx" ON "presets_blocks_treat_cards" USING btree ("_order");
  CREATE INDEX "presets_blocks_treat_cards_parent_id_idx" ON "presets_blocks_treat_cards" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_treat_cards_path_idx" ON "presets_blocks_treat_cards" USING btree ("_path");
  CREATE INDEX "presets_blocks_post_slider_order_idx" ON "presets_blocks_post_slider" USING btree ("_order");
  CREATE INDEX "presets_blocks_post_slider_parent_id_idx" ON "presets_blocks_post_slider" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_post_slider_path_idx" ON "presets_blocks_post_slider" USING btree ("_path");
  CREATE INDEX "presets_blocks_post_slider_logo_idx" ON "presets_blocks_post_slider" USING btree ("logo_id");
  CREATE INDEX "presets_blocks_site_cta_order_idx" ON "presets_blocks_site_cta" USING btree ("_order");
  CREATE INDEX "presets_blocks_site_cta_parent_id_idx" ON "presets_blocks_site_cta" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_site_cta_path_idx" ON "presets_blocks_site_cta" USING btree ("_path");
  CREATE INDEX "presets_texts_order_parent" ON "presets_texts" USING btree ("order","parent_id");
  ALTER TABLE "page_rels" ADD CONSTRAINT "page_rels_states_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_rels" ADD CONSTRAINT "page_rels_clinics_fk" FOREIGN KEY ("clinics_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_rels" ADD CONSTRAINT "page_rels_doctors_fk" FOREIGN KEY ("doctors_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_rels" ADD CONSTRAINT "page_rels_treatments_fk" FOREIGN KEY ("treatments_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_rels" ADD CONSTRAINT "page_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_rels" ADD CONSTRAINT "page_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_rels" ADD CONSTRAINT "_page_v_rels_states_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_rels" ADD CONSTRAINT "_page_v_rels_clinics_fk" FOREIGN KEY ("clinics_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_rels" ADD CONSTRAINT "_page_v_rels_doctors_fk" FOREIGN KEY ("doctors_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_rels" ADD CONSTRAINT "_page_v_rels_treatments_fk" FOREIGN KEY ("treatments_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_rels" ADD CONSTRAINT "_page_v_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_rels" ADD CONSTRAINT "_page_v_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts" ADD CONSTRAINT "posts_reviewed_by_id_doctors_id_fk" FOREIGN KEY ("reviewed_by_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_reviewed_by_id_doctors_id_fk" FOREIGN KEY ("version_reviewed_by_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_source_logo_id_media_id_fk" FOREIGN KEY ("source_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "header" ADD CONSTRAINT "header_mobile_logo_id_media_id_fk" FOREIGN KEY ("mobile_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "header_rels" ADD CONSTRAINT "header_rels_states_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_rels" ADD CONSTRAINT "header_rels_clinics_fk" FOREIGN KEY ("clinics_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_rels" ADD CONSTRAINT "header_rels_doctors_fk" FOREIGN KEY ("doctors_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_rels" ADD CONSTRAINT "header_rels_treatments_fk" FOREIGN KEY ("treatments_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_rels" ADD CONSTRAINT "header_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_header_v" ADD CONSTRAINT "_header_v_version_mobile_logo_id_media_id_fk" FOREIGN KEY ("version_mobile_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_header_v_rels" ADD CONSTRAINT "_header_v_rels_states_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_header_v_rels" ADD CONSTRAINT "_header_v_rels_clinics_fk" FOREIGN KEY ("clinics_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_header_v_rels" ADD CONSTRAINT "_header_v_rels_doctors_fk" FOREIGN KEY ("doctors_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_header_v_rels" ADD CONSTRAINT "_header_v_rels_treatments_fk" FOREIGN KEY ("treatments_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_header_v_rels" ADD CONSTRAINT "_header_v_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "footer" ADD CONSTRAINT "footer_newsletter_image_id_media_id_fk" FOREIGN KEY ("newsletter_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "footer" ADD CONSTRAINT "footer_newsletter_mobile_image_id_media_id_fk" FOREIGN KEY ("newsletter_mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_footer_v" ADD CONSTRAINT "_footer_v_version_newsletter_image_id_media_id_fk" FOREIGN KEY ("version_newsletter_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_footer_v" ADD CONSTRAINT "_footer_v_version_newsletter_mobile_image_id_media_id_fk" FOREIGN KEY ("version_newsletter_mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_rels" ADD CONSTRAINT "presets_rels_states_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_rels" ADD CONSTRAINT "presets_rels_clinics_fk" FOREIGN KEY ("clinics_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_rels" ADD CONSTRAINT "presets_rels_doctors_fk" FOREIGN KEY ("doctors_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_rels" ADD CONSTRAINT "presets_rels_treatments_fk" FOREIGN KEY ("treatments_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_rels" ADD CONSTRAINT "presets_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_rels" ADD CONSTRAINT "presets_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_states_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_clinics_fk" FOREIGN KEY ("clinics_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_doctors_fk" FOREIGN KEY ("doctors_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_treatments_fk" FOREIGN KEY ("treatments_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_rels_states_id_idx" ON "page_rels" USING btree ("states_id","locale");
  CREATE INDEX "page_rels_clinics_id_idx" ON "page_rels" USING btree ("clinics_id","locale");
  CREATE INDEX "page_rels_doctors_id_idx" ON "page_rels" USING btree ("doctors_id","locale");
  CREATE INDEX "page_rels_treatments_id_idx" ON "page_rels" USING btree ("treatments_id","locale");
  CREATE INDEX "page_rels_conditions_id_idx" ON "page_rels" USING btree ("conditions_id","locale");
  CREATE INDEX "page_rels_testimonials_id_idx" ON "page_rels" USING btree ("testimonials_id","locale");
  CREATE INDEX "_page_v_rels_states_id_idx" ON "_page_v_rels" USING btree ("states_id","locale");
  CREATE INDEX "_page_v_rels_clinics_id_idx" ON "_page_v_rels" USING btree ("clinics_id","locale");
  CREATE INDEX "_page_v_rels_doctors_id_idx" ON "_page_v_rels" USING btree ("doctors_id","locale");
  CREATE INDEX "_page_v_rels_treatments_id_idx" ON "_page_v_rels" USING btree ("treatments_id","locale");
  CREATE INDEX "_page_v_rels_conditions_id_idx" ON "_page_v_rels" USING btree ("conditions_id","locale");
  CREATE INDEX "_page_v_rels_testimonials_id_idx" ON "_page_v_rels" USING btree ("testimonials_id","locale");
  CREATE INDEX "posts_reviewed_by_idx" ON "posts" USING btree ("reviewed_by_id");
  CREATE INDEX "_posts_v_version_version_reviewed_by_idx" ON "_posts_v" USING btree ("version_reviewed_by_id");
  CREATE INDEX "testimonials_clinic_idx" ON "testimonials" USING btree ("clinic_id");
  CREATE INDEX "testimonials_source_logo_idx" ON "testimonials" USING btree ("source_logo_id");
  CREATE INDEX "header_mobile_logo_idx" ON "header" USING btree ("mobile_logo_id");
  CREATE INDEX "header_rels_states_id_idx" ON "header_rels" USING btree ("states_id","locale");
  CREATE INDEX "header_rels_clinics_id_idx" ON "header_rels" USING btree ("clinics_id","locale");
  CREATE INDEX "header_rels_doctors_id_idx" ON "header_rels" USING btree ("doctors_id","locale");
  CREATE INDEX "header_rels_treatments_id_idx" ON "header_rels" USING btree ("treatments_id","locale");
  CREATE INDEX "header_rels_conditions_id_idx" ON "header_rels" USING btree ("conditions_id","locale");
  CREATE INDEX "_header_v_version_version_mobile_logo_idx" ON "_header_v" USING btree ("version_mobile_logo_id");
  CREATE INDEX "_header_v_rels_states_id_idx" ON "_header_v_rels" USING btree ("states_id","locale");
  CREATE INDEX "_header_v_rels_clinics_id_idx" ON "_header_v_rels" USING btree ("clinics_id","locale");
  CREATE INDEX "_header_v_rels_doctors_id_idx" ON "_header_v_rels" USING btree ("doctors_id","locale");
  CREATE INDEX "_header_v_rels_treatments_id_idx" ON "_header_v_rels" USING btree ("treatments_id","locale");
  CREATE INDEX "_header_v_rels_conditions_id_idx" ON "_header_v_rels" USING btree ("conditions_id","locale");
  CREATE INDEX "footer_newsletter_newsletter_image_idx" ON "footer" USING btree ("newsletter_image_id");
  CREATE INDEX "footer_newsletter_newsletter_mobile_image_idx" ON "footer" USING btree ("newsletter_mobile_image_id");
  CREATE INDEX "_footer_v_version_newsletter_version_newsletter_image_idx" ON "_footer_v" USING btree ("version_newsletter_image_id");
  CREATE INDEX "_footer_v_version_newsletter_version_newsletter_mobile_i_idx" ON "_footer_v" USING btree ("version_newsletter_mobile_image_id");
  CREATE INDEX "presets_rels_states_id_idx" ON "presets_rels" USING btree ("states_id","locale");
  CREATE INDEX "presets_rels_clinics_id_idx" ON "presets_rels" USING btree ("clinics_id","locale");
  CREATE INDEX "presets_rels_doctors_id_idx" ON "presets_rels" USING btree ("doctors_id","locale");
  CREATE INDEX "presets_rels_treatments_id_idx" ON "presets_rels" USING btree ("treatments_id","locale");
  CREATE INDEX "presets_rels_conditions_id_idx" ON "presets_rels" USING btree ("conditions_id","locale");
  CREATE INDEX "presets_rels_testimonials_id_idx" ON "presets_rels" USING btree ("testimonials_id","locale");
  CREATE INDEX "payload_locked_documents_rels_states_id_idx" ON "payload_locked_documents_rels" USING btree ("states_id");
  CREATE INDEX "payload_locked_documents_rels_clinics_id_idx" ON "payload_locked_documents_rels" USING btree ("clinics_id");
  CREATE INDEX "payload_locked_documents_rels_doctors_id_idx" ON "payload_locked_documents_rels" USING btree ("doctors_id");
  CREATE INDEX "payload_locked_documents_rels_treatments_id_idx" ON "payload_locked_documents_rels" USING btree ("treatments_id");
  CREATE INDEX "payload_locked_documents_rels_conditions_id_idx" ON "payload_locked_documents_rels" USING btree ("conditions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_hero_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_hero_banner" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_logo_strip_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_logo_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_icon_list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_icon_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_media_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_insurance_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_insurance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_doc_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_rev_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_cond_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_before_after_pairs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_before_after" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_treat_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_post_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_site_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_hero_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_hero_banner" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_logo_strip_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_logo_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_icon_list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_icon_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_media_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_insurance_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_insurance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_doc_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_rev_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_cond_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_before_after_pairs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_before_after" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_treat_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_post_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_site_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_logo_strip_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_logo_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_icon_list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_icon_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_media_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_insurance_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_insurance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_doc_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_rev_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_cond_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_before_after_pairs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_before_after" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_treat_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_post_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_site_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_logo_strip_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_logo_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_icon_list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_icon_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_media_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_insurance_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_insurance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_doc_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_rev_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_cond_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_before_after_pairs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_before_after" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_treat_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_post_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_site_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_logo_strip_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_logo_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_icon_list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_icon_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_media_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_insurance_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_insurance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_doc_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_rev_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_cond_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_before_after_pairs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_before_after" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_treat_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_post_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_site_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_hours" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_logo_strip_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_logo_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_icon_list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_icon_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_media_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_insurance_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_insurance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_doc_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_rev_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_cond_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_before_after_pairs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_before_after" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_treat_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_post_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_site_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_version_hours" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_logo_strip_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_logo_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_icon_list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_icon_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_media_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_insurance_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_insurance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_doc_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_rev_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_cond_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_before_after_pairs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_before_after" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_treat_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_post_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_site_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_education" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_logo_strip_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_logo_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_icon_list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_icon_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_media_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_insurance_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_insurance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_doc_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_rev_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_cond_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_before_after_pairs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_before_after" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_treat_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_post_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_site_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_version_education" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_logo_strip_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_logo_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_icon_list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_icon_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_media_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_insurance_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_insurance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_doc_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_rev_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_cond_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_before_after_pairs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_before_after" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_treat_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_post_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_site_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_logo_strip_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_logo_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_icon_list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_icon_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_media_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_insurance_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_insurance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_doc_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_rev_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_cond_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_before_after_pairs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_before_after" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_treat_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_post_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_site_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_logo_strip_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_logo_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_icon_list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_icon_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_media_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_insurance_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_insurance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_doc_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_rev_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_cond_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_before_after_pairs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_before_after" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_treat_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_post_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_site_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_logo_strip_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_logo_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_icon_list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_icon_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_media_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_insurance_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_insurance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_doc_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_rev_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_cond_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_before_after_pairs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_before_after" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_treat_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_post_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_site_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "header_more_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "header_more_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_header_v_version_more_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_header_v_version_more_links_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "footer_social" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_footer_v_version_social" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_hero_video" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_hero_banner" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_logo_strip_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_logo_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_icon_list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_icon_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_media_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_insurance_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_insurance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_doc_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_rev_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_cond_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_before_after_pairs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_before_after" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_treat_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_post_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_site_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_texts" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "page_blocks_hero_video" CASCADE;
  DROP TABLE "page_blocks_hero_banner" CASCADE;
  DROP TABLE "page_blocks_logo_strip_logos" CASCADE;
  DROP TABLE "page_blocks_logo_strip" CASCADE;
  DROP TABLE "page_blocks_icon_list_items" CASCADE;
  DROP TABLE "page_blocks_icon_list" CASCADE;
  DROP TABLE "page_blocks_media_text" CASCADE;
  DROP TABLE "page_blocks_insurance_logos" CASCADE;
  DROP TABLE "page_blocks_insurance" CASCADE;
  DROP TABLE "page_blocks_doc_slider" CASCADE;
  DROP TABLE "page_blocks_rev_slider" CASCADE;
  DROP TABLE "page_blocks_cond_grid" CASCADE;
  DROP TABLE "page_blocks_before_after_pairs" CASCADE;
  DROP TABLE "page_blocks_before_after" CASCADE;
  DROP TABLE "page_blocks_treat_cards" CASCADE;
  DROP TABLE "page_blocks_post_slider" CASCADE;
  DROP TABLE "page_blocks_site_cta" CASCADE;
  DROP TABLE "page_texts" CASCADE;
  DROP TABLE "_page_v_blocks_hero_video" CASCADE;
  DROP TABLE "_page_v_blocks_hero_banner" CASCADE;
  DROP TABLE "_page_v_blocks_logo_strip_logos" CASCADE;
  DROP TABLE "_page_v_blocks_logo_strip" CASCADE;
  DROP TABLE "_page_v_blocks_icon_list_items" CASCADE;
  DROP TABLE "_page_v_blocks_icon_list" CASCADE;
  DROP TABLE "_page_v_blocks_media_text" CASCADE;
  DROP TABLE "_page_v_blocks_insurance_logos" CASCADE;
  DROP TABLE "_page_v_blocks_insurance" CASCADE;
  DROP TABLE "_page_v_blocks_doc_slider" CASCADE;
  DROP TABLE "_page_v_blocks_rev_slider" CASCADE;
  DROP TABLE "_page_v_blocks_cond_grid" CASCADE;
  DROP TABLE "_page_v_blocks_before_after_pairs" CASCADE;
  DROP TABLE "_page_v_blocks_before_after" CASCADE;
  DROP TABLE "_page_v_blocks_treat_cards" CASCADE;
  DROP TABLE "_page_v_blocks_post_slider" CASCADE;
  DROP TABLE "_page_v_blocks_site_cta" CASCADE;
  DROP TABLE "_page_v_texts" CASCADE;
  DROP TABLE "states_blocks_logo_strip_logos" CASCADE;
  DROP TABLE "states_blocks_logo_strip" CASCADE;
  DROP TABLE "states_blocks_icon_list_items" CASCADE;
  DROP TABLE "states_blocks_icon_list" CASCADE;
  DROP TABLE "states_blocks_media_text" CASCADE;
  DROP TABLE "states_blocks_insurance_logos" CASCADE;
  DROP TABLE "states_blocks_insurance" CASCADE;
  DROP TABLE "states_blocks_doc_slider" CASCADE;
  DROP TABLE "states_blocks_rev_slider" CASCADE;
  DROP TABLE "states_blocks_cond_grid" CASCADE;
  DROP TABLE "states_blocks_before_after_pairs" CASCADE;
  DROP TABLE "states_blocks_before_after" CASCADE;
  DROP TABLE "states_blocks_treat_cards" CASCADE;
  DROP TABLE "states_blocks_post_slider" CASCADE;
  DROP TABLE "states_blocks_site_cta" CASCADE;
  DROP TABLE "states" CASCADE;
  DROP TABLE "states_locales" CASCADE;
  DROP TABLE "states_texts" CASCADE;
  DROP TABLE "states_rels" CASCADE;
  DROP TABLE "_states_v_blocks_logo_strip_logos" CASCADE;
  DROP TABLE "_states_v_blocks_logo_strip" CASCADE;
  DROP TABLE "_states_v_blocks_icon_list_items" CASCADE;
  DROP TABLE "_states_v_blocks_icon_list" CASCADE;
  DROP TABLE "_states_v_blocks_media_text" CASCADE;
  DROP TABLE "_states_v_blocks_insurance_logos" CASCADE;
  DROP TABLE "_states_v_blocks_insurance" CASCADE;
  DROP TABLE "_states_v_blocks_doc_slider" CASCADE;
  DROP TABLE "_states_v_blocks_rev_slider" CASCADE;
  DROP TABLE "_states_v_blocks_cond_grid" CASCADE;
  DROP TABLE "_states_v_blocks_before_after_pairs" CASCADE;
  DROP TABLE "_states_v_blocks_before_after" CASCADE;
  DROP TABLE "_states_v_blocks_treat_cards" CASCADE;
  DROP TABLE "_states_v_blocks_post_slider" CASCADE;
  DROP TABLE "_states_v_blocks_site_cta" CASCADE;
  DROP TABLE "_states_v" CASCADE;
  DROP TABLE "_states_v_locales" CASCADE;
  DROP TABLE "_states_v_texts" CASCADE;
  DROP TABLE "_states_v_rels" CASCADE;
  DROP TABLE "clinics_blocks_logo_strip_logos" CASCADE;
  DROP TABLE "clinics_blocks_logo_strip" CASCADE;
  DROP TABLE "clinics_blocks_icon_list_items" CASCADE;
  DROP TABLE "clinics_blocks_icon_list" CASCADE;
  DROP TABLE "clinics_blocks_media_text" CASCADE;
  DROP TABLE "clinics_blocks_insurance_logos" CASCADE;
  DROP TABLE "clinics_blocks_insurance" CASCADE;
  DROP TABLE "clinics_blocks_doc_slider" CASCADE;
  DROP TABLE "clinics_blocks_rev_slider" CASCADE;
  DROP TABLE "clinics_blocks_cond_grid" CASCADE;
  DROP TABLE "clinics_blocks_before_after_pairs" CASCADE;
  DROP TABLE "clinics_blocks_before_after" CASCADE;
  DROP TABLE "clinics_blocks_treat_cards" CASCADE;
  DROP TABLE "clinics_blocks_post_slider" CASCADE;
  DROP TABLE "clinics_blocks_site_cta" CASCADE;
  DROP TABLE "clinics_hours" CASCADE;
  DROP TABLE "clinics" CASCADE;
  DROP TABLE "clinics_locales" CASCADE;
  DROP TABLE "clinics_texts" CASCADE;
  DROP TABLE "clinics_rels" CASCADE;
  DROP TABLE "_clinics_v_blocks_logo_strip_logos" CASCADE;
  DROP TABLE "_clinics_v_blocks_logo_strip" CASCADE;
  DROP TABLE "_clinics_v_blocks_icon_list_items" CASCADE;
  DROP TABLE "_clinics_v_blocks_icon_list" CASCADE;
  DROP TABLE "_clinics_v_blocks_media_text" CASCADE;
  DROP TABLE "_clinics_v_blocks_insurance_logos" CASCADE;
  DROP TABLE "_clinics_v_blocks_insurance" CASCADE;
  DROP TABLE "_clinics_v_blocks_doc_slider" CASCADE;
  DROP TABLE "_clinics_v_blocks_rev_slider" CASCADE;
  DROP TABLE "_clinics_v_blocks_cond_grid" CASCADE;
  DROP TABLE "_clinics_v_blocks_before_after_pairs" CASCADE;
  DROP TABLE "_clinics_v_blocks_before_after" CASCADE;
  DROP TABLE "_clinics_v_blocks_treat_cards" CASCADE;
  DROP TABLE "_clinics_v_blocks_post_slider" CASCADE;
  DROP TABLE "_clinics_v_blocks_site_cta" CASCADE;
  DROP TABLE "_clinics_v_version_hours" CASCADE;
  DROP TABLE "_clinics_v" CASCADE;
  DROP TABLE "_clinics_v_locales" CASCADE;
  DROP TABLE "_clinics_v_texts" CASCADE;
  DROP TABLE "_clinics_v_rels" CASCADE;
  DROP TABLE "doctors_blocks_logo_strip_logos" CASCADE;
  DROP TABLE "doctors_blocks_logo_strip" CASCADE;
  DROP TABLE "doctors_blocks_icon_list_items" CASCADE;
  DROP TABLE "doctors_blocks_icon_list" CASCADE;
  DROP TABLE "doctors_blocks_media_text" CASCADE;
  DROP TABLE "doctors_blocks_insurance_logos" CASCADE;
  DROP TABLE "doctors_blocks_insurance" CASCADE;
  DROP TABLE "doctors_blocks_doc_slider" CASCADE;
  DROP TABLE "doctors_blocks_rev_slider" CASCADE;
  DROP TABLE "doctors_blocks_cond_grid" CASCADE;
  DROP TABLE "doctors_blocks_before_after_pairs" CASCADE;
  DROP TABLE "doctors_blocks_before_after" CASCADE;
  DROP TABLE "doctors_blocks_treat_cards" CASCADE;
  DROP TABLE "doctors_blocks_post_slider" CASCADE;
  DROP TABLE "doctors_blocks_site_cta" CASCADE;
  DROP TABLE "doctors_education" CASCADE;
  DROP TABLE "doctors" CASCADE;
  DROP TABLE "doctors_locales" CASCADE;
  DROP TABLE "doctors_texts" CASCADE;
  DROP TABLE "doctors_rels" CASCADE;
  DROP TABLE "_doctors_v_blocks_logo_strip_logos" CASCADE;
  DROP TABLE "_doctors_v_blocks_logo_strip" CASCADE;
  DROP TABLE "_doctors_v_blocks_icon_list_items" CASCADE;
  DROP TABLE "_doctors_v_blocks_icon_list" CASCADE;
  DROP TABLE "_doctors_v_blocks_media_text" CASCADE;
  DROP TABLE "_doctors_v_blocks_insurance_logos" CASCADE;
  DROP TABLE "_doctors_v_blocks_insurance" CASCADE;
  DROP TABLE "_doctors_v_blocks_doc_slider" CASCADE;
  DROP TABLE "_doctors_v_blocks_rev_slider" CASCADE;
  DROP TABLE "_doctors_v_blocks_cond_grid" CASCADE;
  DROP TABLE "_doctors_v_blocks_before_after_pairs" CASCADE;
  DROP TABLE "_doctors_v_blocks_before_after" CASCADE;
  DROP TABLE "_doctors_v_blocks_treat_cards" CASCADE;
  DROP TABLE "_doctors_v_blocks_post_slider" CASCADE;
  DROP TABLE "_doctors_v_blocks_site_cta" CASCADE;
  DROP TABLE "_doctors_v_version_education" CASCADE;
  DROP TABLE "_doctors_v" CASCADE;
  DROP TABLE "_doctors_v_locales" CASCADE;
  DROP TABLE "_doctors_v_texts" CASCADE;
  DROP TABLE "_doctors_v_rels" CASCADE;
  DROP TABLE "treatments_blocks_logo_strip_logos" CASCADE;
  DROP TABLE "treatments_blocks_logo_strip" CASCADE;
  DROP TABLE "treatments_blocks_icon_list_items" CASCADE;
  DROP TABLE "treatments_blocks_icon_list" CASCADE;
  DROP TABLE "treatments_blocks_media_text" CASCADE;
  DROP TABLE "treatments_blocks_insurance_logos" CASCADE;
  DROP TABLE "treatments_blocks_insurance" CASCADE;
  DROP TABLE "treatments_blocks_doc_slider" CASCADE;
  DROP TABLE "treatments_blocks_rev_slider" CASCADE;
  DROP TABLE "treatments_blocks_cond_grid" CASCADE;
  DROP TABLE "treatments_blocks_before_after_pairs" CASCADE;
  DROP TABLE "treatments_blocks_before_after" CASCADE;
  DROP TABLE "treatments_blocks_treat_cards" CASCADE;
  DROP TABLE "treatments_blocks_post_slider" CASCADE;
  DROP TABLE "treatments_blocks_site_cta" CASCADE;
  DROP TABLE "treatments" CASCADE;
  DROP TABLE "treatments_locales" CASCADE;
  DROP TABLE "treatments_texts" CASCADE;
  DROP TABLE "treatments_rels" CASCADE;
  DROP TABLE "_treatments_v_blocks_logo_strip_logos" CASCADE;
  DROP TABLE "_treatments_v_blocks_logo_strip" CASCADE;
  DROP TABLE "_treatments_v_blocks_icon_list_items" CASCADE;
  DROP TABLE "_treatments_v_blocks_icon_list" CASCADE;
  DROP TABLE "_treatments_v_blocks_media_text" CASCADE;
  DROP TABLE "_treatments_v_blocks_insurance_logos" CASCADE;
  DROP TABLE "_treatments_v_blocks_insurance" CASCADE;
  DROP TABLE "_treatments_v_blocks_doc_slider" CASCADE;
  DROP TABLE "_treatments_v_blocks_rev_slider" CASCADE;
  DROP TABLE "_treatments_v_blocks_cond_grid" CASCADE;
  DROP TABLE "_treatments_v_blocks_before_after_pairs" CASCADE;
  DROP TABLE "_treatments_v_blocks_before_after" CASCADE;
  DROP TABLE "_treatments_v_blocks_treat_cards" CASCADE;
  DROP TABLE "_treatments_v_blocks_post_slider" CASCADE;
  DROP TABLE "_treatments_v_blocks_site_cta" CASCADE;
  DROP TABLE "_treatments_v" CASCADE;
  DROP TABLE "_treatments_v_locales" CASCADE;
  DROP TABLE "_treatments_v_texts" CASCADE;
  DROP TABLE "_treatments_v_rels" CASCADE;
  DROP TABLE "conditions_blocks_logo_strip_logos" CASCADE;
  DROP TABLE "conditions_blocks_logo_strip" CASCADE;
  DROP TABLE "conditions_blocks_icon_list_items" CASCADE;
  DROP TABLE "conditions_blocks_icon_list" CASCADE;
  DROP TABLE "conditions_blocks_media_text" CASCADE;
  DROP TABLE "conditions_blocks_insurance_logos" CASCADE;
  DROP TABLE "conditions_blocks_insurance" CASCADE;
  DROP TABLE "conditions_blocks_doc_slider" CASCADE;
  DROP TABLE "conditions_blocks_rev_slider" CASCADE;
  DROP TABLE "conditions_blocks_cond_grid" CASCADE;
  DROP TABLE "conditions_blocks_before_after_pairs" CASCADE;
  DROP TABLE "conditions_blocks_before_after" CASCADE;
  DROP TABLE "conditions_blocks_treat_cards" CASCADE;
  DROP TABLE "conditions_blocks_post_slider" CASCADE;
  DROP TABLE "conditions_blocks_site_cta" CASCADE;
  DROP TABLE "conditions" CASCADE;
  DROP TABLE "conditions_locales" CASCADE;
  DROP TABLE "conditions_texts" CASCADE;
  DROP TABLE "conditions_rels" CASCADE;
  DROP TABLE "_conditions_v_blocks_logo_strip_logos" CASCADE;
  DROP TABLE "_conditions_v_blocks_logo_strip" CASCADE;
  DROP TABLE "_conditions_v_blocks_icon_list_items" CASCADE;
  DROP TABLE "_conditions_v_blocks_icon_list" CASCADE;
  DROP TABLE "_conditions_v_blocks_media_text" CASCADE;
  DROP TABLE "_conditions_v_blocks_insurance_logos" CASCADE;
  DROP TABLE "_conditions_v_blocks_insurance" CASCADE;
  DROP TABLE "_conditions_v_blocks_doc_slider" CASCADE;
  DROP TABLE "_conditions_v_blocks_rev_slider" CASCADE;
  DROP TABLE "_conditions_v_blocks_cond_grid" CASCADE;
  DROP TABLE "_conditions_v_blocks_before_after_pairs" CASCADE;
  DROP TABLE "_conditions_v_blocks_before_after" CASCADE;
  DROP TABLE "_conditions_v_blocks_treat_cards" CASCADE;
  DROP TABLE "_conditions_v_blocks_post_slider" CASCADE;
  DROP TABLE "_conditions_v_blocks_site_cta" CASCADE;
  DROP TABLE "_conditions_v" CASCADE;
  DROP TABLE "_conditions_v_locales" CASCADE;
  DROP TABLE "_conditions_v_texts" CASCADE;
  DROP TABLE "_conditions_v_rels" CASCADE;
  DROP TABLE "header_more_links" CASCADE;
  DROP TABLE "header_more_links_locales" CASCADE;
  DROP TABLE "_header_v_version_more_links" CASCADE;
  DROP TABLE "_header_v_version_more_links_locales" CASCADE;
  DROP TABLE "footer_social" CASCADE;
  DROP TABLE "_footer_v_version_social" CASCADE;
  DROP TABLE "presets_blocks_hero_video" CASCADE;
  DROP TABLE "presets_blocks_hero_banner" CASCADE;
  DROP TABLE "presets_blocks_logo_strip_logos" CASCADE;
  DROP TABLE "presets_blocks_logo_strip" CASCADE;
  DROP TABLE "presets_blocks_icon_list_items" CASCADE;
  DROP TABLE "presets_blocks_icon_list" CASCADE;
  DROP TABLE "presets_blocks_media_text" CASCADE;
  DROP TABLE "presets_blocks_insurance_logos" CASCADE;
  DROP TABLE "presets_blocks_insurance" CASCADE;
  DROP TABLE "presets_blocks_doc_slider" CASCADE;
  DROP TABLE "presets_blocks_rev_slider" CASCADE;
  DROP TABLE "presets_blocks_cond_grid" CASCADE;
  DROP TABLE "presets_blocks_before_after_pairs" CASCADE;
  DROP TABLE "presets_blocks_before_after" CASCADE;
  DROP TABLE "presets_blocks_treat_cards" CASCADE;
  DROP TABLE "presets_blocks_post_slider" CASCADE;
  DROP TABLE "presets_blocks_site_cta" CASCADE;
  DROP TABLE "presets_texts" CASCADE;
  ALTER TABLE "page_rels" DROP CONSTRAINT "page_rels_states_fk";
  
  ALTER TABLE "page_rels" DROP CONSTRAINT "page_rels_clinics_fk";
  
  ALTER TABLE "page_rels" DROP CONSTRAINT "page_rels_doctors_fk";
  
  ALTER TABLE "page_rels" DROP CONSTRAINT "page_rels_treatments_fk";
  
  ALTER TABLE "page_rels" DROP CONSTRAINT "page_rels_conditions_fk";
  
  ALTER TABLE "page_rels" DROP CONSTRAINT "page_rels_testimonials_fk";
  
  ALTER TABLE "_page_v_rels" DROP CONSTRAINT "_page_v_rels_states_fk";
  
  ALTER TABLE "_page_v_rels" DROP CONSTRAINT "_page_v_rels_clinics_fk";
  
  ALTER TABLE "_page_v_rels" DROP CONSTRAINT "_page_v_rels_doctors_fk";
  
  ALTER TABLE "_page_v_rels" DROP CONSTRAINT "_page_v_rels_treatments_fk";
  
  ALTER TABLE "_page_v_rels" DROP CONSTRAINT "_page_v_rels_conditions_fk";
  
  ALTER TABLE "_page_v_rels" DROP CONSTRAINT "_page_v_rels_testimonials_fk";
  
  ALTER TABLE "posts" DROP CONSTRAINT "posts_reviewed_by_id_doctors_id_fk";
  
  ALTER TABLE "_posts_v" DROP CONSTRAINT "_posts_v_version_reviewed_by_id_doctors_id_fk";
  
  ALTER TABLE "testimonials" DROP CONSTRAINT "testimonials_clinic_id_clinics_id_fk";
  
  ALTER TABLE "testimonials" DROP CONSTRAINT "testimonials_source_logo_id_media_id_fk";
  
  ALTER TABLE "header" DROP CONSTRAINT "header_mobile_logo_id_media_id_fk";
  
  ALTER TABLE "header_rels" DROP CONSTRAINT "header_rels_states_fk";
  
  ALTER TABLE "header_rels" DROP CONSTRAINT "header_rels_clinics_fk";
  
  ALTER TABLE "header_rels" DROP CONSTRAINT "header_rels_doctors_fk";
  
  ALTER TABLE "header_rels" DROP CONSTRAINT "header_rels_treatments_fk";
  
  ALTER TABLE "header_rels" DROP CONSTRAINT "header_rels_conditions_fk";
  
  ALTER TABLE "_header_v" DROP CONSTRAINT "_header_v_version_mobile_logo_id_media_id_fk";
  
  ALTER TABLE "_header_v_rels" DROP CONSTRAINT "_header_v_rels_states_fk";
  
  ALTER TABLE "_header_v_rels" DROP CONSTRAINT "_header_v_rels_clinics_fk";
  
  ALTER TABLE "_header_v_rels" DROP CONSTRAINT "_header_v_rels_doctors_fk";
  
  ALTER TABLE "_header_v_rels" DROP CONSTRAINT "_header_v_rels_treatments_fk";
  
  ALTER TABLE "_header_v_rels" DROP CONSTRAINT "_header_v_rels_conditions_fk";
  
  ALTER TABLE "footer" DROP CONSTRAINT "footer_newsletter_image_id_media_id_fk";
  
  ALTER TABLE "footer" DROP CONSTRAINT "footer_newsletter_mobile_image_id_media_id_fk";
  
  ALTER TABLE "_footer_v" DROP CONSTRAINT "_footer_v_version_newsletter_image_id_media_id_fk";
  
  ALTER TABLE "_footer_v" DROP CONSTRAINT "_footer_v_version_newsletter_mobile_image_id_media_id_fk";
  
  ALTER TABLE "presets_rels" DROP CONSTRAINT "presets_rels_states_fk";
  
  ALTER TABLE "presets_rels" DROP CONSTRAINT "presets_rels_clinics_fk";
  
  ALTER TABLE "presets_rels" DROP CONSTRAINT "presets_rels_doctors_fk";
  
  ALTER TABLE "presets_rels" DROP CONSTRAINT "presets_rels_treatments_fk";
  
  ALTER TABLE "presets_rels" DROP CONSTRAINT "presets_rels_conditions_fk";
  
  ALTER TABLE "presets_rels" DROP CONSTRAINT "presets_rels_testimonials_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_states_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_clinics_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_doctors_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_treatments_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_conditions_fk";
  
  DROP INDEX "page_rels_states_id_idx";
  DROP INDEX "page_rels_clinics_id_idx";
  DROP INDEX "page_rels_doctors_id_idx";
  DROP INDEX "page_rels_treatments_id_idx";
  DROP INDEX "page_rels_conditions_id_idx";
  DROP INDEX "page_rels_testimonials_id_idx";
  DROP INDEX "_page_v_rels_states_id_idx";
  DROP INDEX "_page_v_rels_clinics_id_idx";
  DROP INDEX "_page_v_rels_doctors_id_idx";
  DROP INDEX "_page_v_rels_treatments_id_idx";
  DROP INDEX "_page_v_rels_conditions_id_idx";
  DROP INDEX "_page_v_rels_testimonials_id_idx";
  DROP INDEX "posts_reviewed_by_idx";
  DROP INDEX "_posts_v_version_version_reviewed_by_idx";
  DROP INDEX "testimonials_clinic_idx";
  DROP INDEX "testimonials_source_logo_idx";
  DROP INDEX "header_mobile_logo_idx";
  DROP INDEX "header_rels_states_id_idx";
  DROP INDEX "header_rels_clinics_id_idx";
  DROP INDEX "header_rels_doctors_id_idx";
  DROP INDEX "header_rels_treatments_id_idx";
  DROP INDEX "header_rels_conditions_id_idx";
  DROP INDEX "_header_v_version_version_mobile_logo_idx";
  DROP INDEX "_header_v_rels_states_id_idx";
  DROP INDEX "_header_v_rels_clinics_id_idx";
  DROP INDEX "_header_v_rels_doctors_id_idx";
  DROP INDEX "_header_v_rels_treatments_id_idx";
  DROP INDEX "_header_v_rels_conditions_id_idx";
  DROP INDEX "footer_newsletter_newsletter_image_idx";
  DROP INDEX "footer_newsletter_newsletter_mobile_image_idx";
  DROP INDEX "_footer_v_version_newsletter_version_newsletter_image_idx";
  DROP INDEX "_footer_v_version_newsletter_version_newsletter_mobile_i_idx";
  DROP INDEX "presets_rels_states_id_idx";
  DROP INDEX "presets_rels_clinics_id_idx";
  DROP INDEX "presets_rels_doctors_id_idx";
  DROP INDEX "presets_rels_treatments_id_idx";
  DROP INDEX "presets_rels_conditions_id_idx";
  DROP INDEX "presets_rels_testimonials_id_idx";
  DROP INDEX "payload_locked_documents_rels_states_id_idx";
  DROP INDEX "payload_locked_documents_rels_clinics_id_idx";
  DROP INDEX "payload_locked_documents_rels_doctors_id_idx";
  DROP INDEX "payload_locked_documents_rels_treatments_id_idx";
  DROP INDEX "payload_locked_documents_rels_conditions_id_idx";
  ALTER TABLE "page_rels" DROP COLUMN "states_id";
  ALTER TABLE "page_rels" DROP COLUMN "clinics_id";
  ALTER TABLE "page_rels" DROP COLUMN "doctors_id";
  ALTER TABLE "page_rels" DROP COLUMN "treatments_id";
  ALTER TABLE "page_rels" DROP COLUMN "conditions_id";
  ALTER TABLE "page_rels" DROP COLUMN "testimonials_id";
  ALTER TABLE "_page_v_rels" DROP COLUMN "states_id";
  ALTER TABLE "_page_v_rels" DROP COLUMN "clinics_id";
  ALTER TABLE "_page_v_rels" DROP COLUMN "doctors_id";
  ALTER TABLE "_page_v_rels" DROP COLUMN "treatments_id";
  ALTER TABLE "_page_v_rels" DROP COLUMN "conditions_id";
  ALTER TABLE "_page_v_rels" DROP COLUMN "testimonials_id";
  ALTER TABLE "posts" DROP COLUMN "reviewed_by_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_reviewed_by_id";
  ALTER TABLE "testimonials" DROP COLUMN "place";
  ALTER TABLE "testimonials" DROP COLUMN "clinic_id";
  ALTER TABLE "testimonials" DROP COLUMN "source_logo_id";
  ALTER TABLE "header" DROP COLUMN "mobile_logo_id";
  ALTER TABLE "header" DROP COLUMN "announcement_link_kind";
  ALTER TABLE "header" DROP COLUMN "announcement_link_new_tab";
  ALTER TABLE "header" DROP COLUMN "announcement_link_path";
  ALTER TABLE "header" DROP COLUMN "announcement_link_url";
  ALTER TABLE "header" DROP COLUMN "phone";
  ALTER TABLE "header_locales" DROP COLUMN "announcement_text";
  ALTER TABLE "header_locales" DROP COLUMN "phone_label";
  ALTER TABLE "header_locales" DROP COLUMN "locations_label";
  ALTER TABLE "header_rels" DROP COLUMN "states_id";
  ALTER TABLE "header_rels" DROP COLUMN "clinics_id";
  ALTER TABLE "header_rels" DROP COLUMN "doctors_id";
  ALTER TABLE "header_rels" DROP COLUMN "treatments_id";
  ALTER TABLE "header_rels" DROP COLUMN "conditions_id";
  ALTER TABLE "_header_v" DROP COLUMN "version_mobile_logo_id";
  ALTER TABLE "_header_v" DROP COLUMN "version_announcement_link_kind";
  ALTER TABLE "_header_v" DROP COLUMN "version_announcement_link_new_tab";
  ALTER TABLE "_header_v" DROP COLUMN "version_announcement_link_path";
  ALTER TABLE "_header_v" DROP COLUMN "version_announcement_link_url";
  ALTER TABLE "_header_v" DROP COLUMN "version_phone";
  ALTER TABLE "_header_v_locales" DROP COLUMN "version_announcement_text";
  ALTER TABLE "_header_v_locales" DROP COLUMN "version_phone_label";
  ALTER TABLE "_header_v_locales" DROP COLUMN "version_locations_label";
  ALTER TABLE "_header_v_rels" DROP COLUMN "states_id";
  ALTER TABLE "_header_v_rels" DROP COLUMN "clinics_id";
  ALTER TABLE "_header_v_rels" DROP COLUMN "doctors_id";
  ALTER TABLE "_header_v_rels" DROP COLUMN "treatments_id";
  ALTER TABLE "_header_v_rels" DROP COLUMN "conditions_id";
  ALTER TABLE "footer" DROP COLUMN "phone";
  ALTER TABLE "footer" DROP COLUMN "newsletter_image_id";
  ALTER TABLE "footer" DROP COLUMN "newsletter_mobile_image_id";
  ALTER TABLE "footer_locales" DROP COLUMN "locations_heading";
  ALTER TABLE "footer_locales" DROP COLUMN "about_heading";
  ALTER TABLE "footer_locales" DROP COLUMN "about_text";
  ALTER TABLE "footer_locales" DROP COLUMN "disclaimer_heading";
  ALTER TABLE "footer_locales" DROP COLUMN "disclaimer_text";
  ALTER TABLE "footer_locales" DROP COLUMN "newsletter_title";
  ALTER TABLE "footer_locales" DROP COLUMN "newsletter_text";
  ALTER TABLE "footer_locales" DROP COLUMN "newsletter_button_text";
  ALTER TABLE "_footer_v" DROP COLUMN "version_phone";
  ALTER TABLE "_footer_v" DROP COLUMN "version_newsletter_image_id";
  ALTER TABLE "_footer_v" DROP COLUMN "version_newsletter_mobile_image_id";
  ALTER TABLE "_footer_v_locales" DROP COLUMN "version_locations_heading";
  ALTER TABLE "_footer_v_locales" DROP COLUMN "version_about_heading";
  ALTER TABLE "_footer_v_locales" DROP COLUMN "version_about_text";
  ALTER TABLE "_footer_v_locales" DROP COLUMN "version_disclaimer_heading";
  ALTER TABLE "_footer_v_locales" DROP COLUMN "version_disclaimer_text";
  ALTER TABLE "_footer_v_locales" DROP COLUMN "version_newsletter_title";
  ALTER TABLE "_footer_v_locales" DROP COLUMN "version_newsletter_text";
  ALTER TABLE "_footer_v_locales" DROP COLUMN "version_newsletter_button_text";
  ALTER TABLE "presets_rels" DROP COLUMN "states_id";
  ALTER TABLE "presets_rels" DROP COLUMN "clinics_id";
  ALTER TABLE "presets_rels" DROP COLUMN "doctors_id";
  ALTER TABLE "presets_rels" DROP COLUMN "treatments_id";
  ALTER TABLE "presets_rels" DROP COLUMN "conditions_id";
  ALTER TABLE "presets_rels" DROP COLUMN "testimonials_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "states_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "clinics_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "doctors_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "treatments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "conditions_id";
  DROP TYPE "public"."enum_page_blocks_hero_video_button_link_kind";
  DROP TYPE "public"."enum_page_blocks_hero_banner_button_link_kind";
  DROP TYPE "public"."enum_page_blocks_logo_strip_background";
  DROP TYPE "public"."enum_page_blocks_icon_list_button_link_kind";
  DROP TYPE "public"."enum_page_blocks_media_text_button_link_kind";
  DROP TYPE "public"."enum_page_blocks_media_text_side";
  DROP TYPE "public"."enum_page_blocks_media_text_size";
  DROP TYPE "public"."enum_page_blocks_media_text_background";
  DROP TYPE "public"."enum_page_blocks_insurance_button_link_kind";
  DROP TYPE "public"."enum_page_blocks_doc_slider_button_link_kind";
  DROP TYPE "public"."enum_page_blocks_doc_slider_bottom_button_link_kind";
  DROP TYPE "public"."enum_page_blocks_rev_slider_button_link_kind";
  DROP TYPE "public"."enum_page_blocks_cond_grid_button_link_kind";
  DROP TYPE "public"."enum_page_blocks_cond_grid_background";
  DROP TYPE "public"."enum_page_blocks_before_after_button_link_kind";
  DROP TYPE "public"."enum_page_blocks_treat_cards_button_link_kind";
  DROP TYPE "public"."enum_page_blocks_post_slider_button_link_kind";
  DROP TYPE "public"."enum_page_blocks_site_cta_button_link_kind";
  DROP TYPE "public"."enum__page_v_blocks_hero_video_button_link_kind";
  DROP TYPE "public"."enum__page_v_blocks_hero_banner_button_link_kind";
  DROP TYPE "public"."enum__page_v_blocks_logo_strip_background";
  DROP TYPE "public"."enum__page_v_blocks_icon_list_button_link_kind";
  DROP TYPE "public"."enum__page_v_blocks_media_text_button_link_kind";
  DROP TYPE "public"."enum__page_v_blocks_media_text_side";
  DROP TYPE "public"."enum__page_v_blocks_media_text_size";
  DROP TYPE "public"."enum__page_v_blocks_media_text_background";
  DROP TYPE "public"."enum__page_v_blocks_insurance_button_link_kind";
  DROP TYPE "public"."enum__page_v_blocks_doc_slider_button_link_kind";
  DROP TYPE "public"."enum__page_v_blocks_doc_slider_bottom_button_link_kind";
  DROP TYPE "public"."enum__page_v_blocks_rev_slider_button_link_kind";
  DROP TYPE "public"."enum__page_v_blocks_cond_grid_button_link_kind";
  DROP TYPE "public"."enum__page_v_blocks_cond_grid_background";
  DROP TYPE "public"."enum__page_v_blocks_before_after_button_link_kind";
  DROP TYPE "public"."enum__page_v_blocks_treat_cards_button_link_kind";
  DROP TYPE "public"."enum__page_v_blocks_post_slider_button_link_kind";
  DROP TYPE "public"."enum__page_v_blocks_site_cta_button_link_kind";
  DROP TYPE "public"."enum_states_blocks_logo_strip_background";
  DROP TYPE "public"."enum_states_blocks_icon_list_button_link_kind";
  DROP TYPE "public"."enum_states_blocks_media_text_button_link_kind";
  DROP TYPE "public"."enum_states_blocks_media_text_side";
  DROP TYPE "public"."enum_states_blocks_media_text_size";
  DROP TYPE "public"."enum_states_blocks_media_text_background";
  DROP TYPE "public"."enum_states_blocks_insurance_button_link_kind";
  DROP TYPE "public"."enum_states_blocks_doc_slider_button_link_kind";
  DROP TYPE "public"."enum_states_blocks_doc_slider_bottom_button_link_kind";
  DROP TYPE "public"."enum_states_blocks_rev_slider_button_link_kind";
  DROP TYPE "public"."enum_states_blocks_cond_grid_button_link_kind";
  DROP TYPE "public"."enum_states_blocks_cond_grid_background";
  DROP TYPE "public"."enum_states_blocks_before_after_button_link_kind";
  DROP TYPE "public"."enum_states_blocks_treat_cards_button_link_kind";
  DROP TYPE "public"."enum_states_blocks_post_slider_button_link_kind";
  DROP TYPE "public"."enum_states_blocks_site_cta_button_link_kind";
  DROP TYPE "public"."enum_states_status";
  DROP TYPE "public"."enum_states_meta_robots";
  DROP TYPE "public"."enum__states_v_blocks_logo_strip_background";
  DROP TYPE "public"."enum__states_v_blocks_icon_list_button_link_kind";
  DROP TYPE "public"."enum__states_v_blocks_media_text_button_link_kind";
  DROP TYPE "public"."enum__states_v_blocks_media_text_side";
  DROP TYPE "public"."enum__states_v_blocks_media_text_size";
  DROP TYPE "public"."enum__states_v_blocks_media_text_background";
  DROP TYPE "public"."enum__states_v_blocks_insurance_button_link_kind";
  DROP TYPE "public"."enum__states_v_blocks_doc_slider_button_link_kind";
  DROP TYPE "public"."enum__states_v_blocks_doc_slider_bottom_button_link_kind";
  DROP TYPE "public"."enum__states_v_blocks_rev_slider_button_link_kind";
  DROP TYPE "public"."enum__states_v_blocks_cond_grid_button_link_kind";
  DROP TYPE "public"."enum__states_v_blocks_cond_grid_background";
  DROP TYPE "public"."enum__states_v_blocks_before_after_button_link_kind";
  DROP TYPE "public"."enum__states_v_blocks_treat_cards_button_link_kind";
  DROP TYPE "public"."enum__states_v_blocks_post_slider_button_link_kind";
  DROP TYPE "public"."enum__states_v_blocks_site_cta_button_link_kind";
  DROP TYPE "public"."enum__states_v_version_status";
  DROP TYPE "public"."enum__states_v_published_locale";
  DROP TYPE "public"."enum__states_v_version_meta_robots";
  DROP TYPE "public"."enum_clinics_blocks_logo_strip_background";
  DROP TYPE "public"."enum_clinics_blocks_icon_list_button_link_kind";
  DROP TYPE "public"."enum_clinics_blocks_media_text_button_link_kind";
  DROP TYPE "public"."enum_clinics_blocks_media_text_side";
  DROP TYPE "public"."enum_clinics_blocks_media_text_size";
  DROP TYPE "public"."enum_clinics_blocks_media_text_background";
  DROP TYPE "public"."enum_clinics_blocks_insurance_button_link_kind";
  DROP TYPE "public"."enum_clinics_blocks_doc_slider_button_link_kind";
  DROP TYPE "public"."enum_clinics_blocks_doc_slider_bottom_button_link_kind";
  DROP TYPE "public"."enum_clinics_blocks_rev_slider_button_link_kind";
  DROP TYPE "public"."enum_clinics_blocks_cond_grid_button_link_kind";
  DROP TYPE "public"."enum_clinics_blocks_cond_grid_background";
  DROP TYPE "public"."enum_clinics_blocks_before_after_button_link_kind";
  DROP TYPE "public"."enum_clinics_blocks_treat_cards_button_link_kind";
  DROP TYPE "public"."enum_clinics_blocks_post_slider_button_link_kind";
  DROP TYPE "public"."enum_clinics_blocks_site_cta_button_link_kind";
  DROP TYPE "public"."enum_clinics_hours_day";
  DROP TYPE "public"."enum_clinics_status";
  DROP TYPE "public"."enum_clinics_meta_robots";
  DROP TYPE "public"."enum__clinics_v_blocks_logo_strip_background";
  DROP TYPE "public"."enum__clinics_v_blocks_icon_list_button_link_kind";
  DROP TYPE "public"."enum__clinics_v_blocks_media_text_button_link_kind";
  DROP TYPE "public"."enum__clinics_v_blocks_media_text_side";
  DROP TYPE "public"."enum__clinics_v_blocks_media_text_size";
  DROP TYPE "public"."enum__clinics_v_blocks_media_text_background";
  DROP TYPE "public"."enum__clinics_v_blocks_insurance_button_link_kind";
  DROP TYPE "public"."enum__clinics_v_blocks_doc_slider_button_link_kind";
  DROP TYPE "public"."enum__clinics_v_blocks_doc_slider_bottom_button_link_kind";
  DROP TYPE "public"."enum__clinics_v_blocks_rev_slider_button_link_kind";
  DROP TYPE "public"."enum__clinics_v_blocks_cond_grid_button_link_kind";
  DROP TYPE "public"."enum__clinics_v_blocks_cond_grid_background";
  DROP TYPE "public"."enum__clinics_v_blocks_before_after_button_link_kind";
  DROP TYPE "public"."enum__clinics_v_blocks_treat_cards_button_link_kind";
  DROP TYPE "public"."enum__clinics_v_blocks_post_slider_button_link_kind";
  DROP TYPE "public"."enum__clinics_v_blocks_site_cta_button_link_kind";
  DROP TYPE "public"."enum__clinics_v_version_hours_day";
  DROP TYPE "public"."enum__clinics_v_version_status";
  DROP TYPE "public"."enum__clinics_v_published_locale";
  DROP TYPE "public"."enum__clinics_v_version_meta_robots";
  DROP TYPE "public"."enum_doctors_blocks_logo_strip_background";
  DROP TYPE "public"."enum_doctors_blocks_icon_list_button_link_kind";
  DROP TYPE "public"."enum_doctors_blocks_media_text_button_link_kind";
  DROP TYPE "public"."enum_doctors_blocks_media_text_side";
  DROP TYPE "public"."enum_doctors_blocks_media_text_size";
  DROP TYPE "public"."enum_doctors_blocks_media_text_background";
  DROP TYPE "public"."enum_doctors_blocks_insurance_button_link_kind";
  DROP TYPE "public"."enum_doctors_blocks_doc_slider_button_link_kind";
  DROP TYPE "public"."enum_doctors_blocks_doc_slider_bottom_button_link_kind";
  DROP TYPE "public"."enum_doctors_blocks_rev_slider_button_link_kind";
  DROP TYPE "public"."enum_doctors_blocks_cond_grid_button_link_kind";
  DROP TYPE "public"."enum_doctors_blocks_cond_grid_background";
  DROP TYPE "public"."enum_doctors_blocks_before_after_button_link_kind";
  DROP TYPE "public"."enum_doctors_blocks_treat_cards_button_link_kind";
  DROP TYPE "public"."enum_doctors_blocks_post_slider_button_link_kind";
  DROP TYPE "public"."enum_doctors_blocks_site_cta_button_link_kind";
  DROP TYPE "public"."enum_doctors_education_kind";
  DROP TYPE "public"."enum_doctors_status";
  DROP TYPE "public"."enum_doctors_meta_robots";
  DROP TYPE "public"."enum__doctors_v_blocks_logo_strip_background";
  DROP TYPE "public"."enum__doctors_v_blocks_icon_list_button_link_kind";
  DROP TYPE "public"."enum__doctors_v_blocks_media_text_button_link_kind";
  DROP TYPE "public"."enum__doctors_v_blocks_media_text_side";
  DROP TYPE "public"."enum__doctors_v_blocks_media_text_size";
  DROP TYPE "public"."enum__doctors_v_blocks_media_text_background";
  DROP TYPE "public"."enum__doctors_v_blocks_insurance_button_link_kind";
  DROP TYPE "public"."enum__doctors_v_blocks_doc_slider_button_link_kind";
  DROP TYPE "public"."enum__doctors_v_blocks_doc_slider_bottom_button_link_kind";
  DROP TYPE "public"."enum__doctors_v_blocks_rev_slider_button_link_kind";
  DROP TYPE "public"."enum__doctors_v_blocks_cond_grid_button_link_kind";
  DROP TYPE "public"."enum__doctors_v_blocks_cond_grid_background";
  DROP TYPE "public"."enum__doctors_v_blocks_before_after_button_link_kind";
  DROP TYPE "public"."enum__doctors_v_blocks_treat_cards_button_link_kind";
  DROP TYPE "public"."enum__doctors_v_blocks_post_slider_button_link_kind";
  DROP TYPE "public"."enum__doctors_v_blocks_site_cta_button_link_kind";
  DROP TYPE "public"."enum__doctors_v_version_education_kind";
  DROP TYPE "public"."enum__doctors_v_version_status";
  DROP TYPE "public"."enum__doctors_v_published_locale";
  DROP TYPE "public"."enum__doctors_v_version_meta_robots";
  DROP TYPE "public"."enum_treatments_blocks_logo_strip_background";
  DROP TYPE "public"."enum_treatments_blocks_icon_list_button_link_kind";
  DROP TYPE "public"."enum_treatments_blocks_media_text_button_link_kind";
  DROP TYPE "public"."enum_treatments_blocks_media_text_side";
  DROP TYPE "public"."enum_treatments_blocks_media_text_size";
  DROP TYPE "public"."enum_treatments_blocks_media_text_background";
  DROP TYPE "public"."enum_treatments_blocks_insurance_button_link_kind";
  DROP TYPE "public"."enum_treatments_blocks_doc_slider_button_link_kind";
  DROP TYPE "public"."enum_treatments_blocks_doc_slider_bottom_button_link_kind";
  DROP TYPE "public"."enum_treatments_blocks_rev_slider_button_link_kind";
  DROP TYPE "public"."enum_treatments_blocks_cond_grid_button_link_kind";
  DROP TYPE "public"."enum_treatments_blocks_cond_grid_background";
  DROP TYPE "public"."enum_treatments_blocks_before_after_button_link_kind";
  DROP TYPE "public"."enum_treatments_blocks_treat_cards_button_link_kind";
  DROP TYPE "public"."enum_treatments_blocks_post_slider_button_link_kind";
  DROP TYPE "public"."enum_treatments_blocks_site_cta_button_link_kind";
  DROP TYPE "public"."enum_treatments_status";
  DROP TYPE "public"."enum_treatments_meta_robots";
  DROP TYPE "public"."enum__treatments_v_blocks_logo_strip_background";
  DROP TYPE "public"."enum__treatments_v_blocks_icon_list_button_link_kind";
  DROP TYPE "public"."enum__treatments_v_blocks_media_text_button_link_kind";
  DROP TYPE "public"."enum__treatments_v_blocks_media_text_side";
  DROP TYPE "public"."enum__treatments_v_blocks_media_text_size";
  DROP TYPE "public"."enum__treatments_v_blocks_media_text_background";
  DROP TYPE "public"."enum__treatments_v_blocks_insurance_button_link_kind";
  DROP TYPE "public"."enum__treatments_v_blocks_doc_slider_button_link_kind";
  DROP TYPE "public"."enum__treatments_v_blocks_doc_slider_bottom_button_link_kind";
  DROP TYPE "public"."enum__treatments_v_blocks_rev_slider_button_link_kind";
  DROP TYPE "public"."enum__treatments_v_blocks_cond_grid_button_link_kind";
  DROP TYPE "public"."enum__treatments_v_blocks_cond_grid_background";
  DROP TYPE "public"."enum__treatments_v_blocks_before_after_button_link_kind";
  DROP TYPE "public"."enum__treatments_v_blocks_treat_cards_button_link_kind";
  DROP TYPE "public"."enum__treatments_v_blocks_post_slider_button_link_kind";
  DROP TYPE "public"."enum__treatments_v_blocks_site_cta_button_link_kind";
  DROP TYPE "public"."enum__treatments_v_version_status";
  DROP TYPE "public"."enum__treatments_v_published_locale";
  DROP TYPE "public"."enum__treatments_v_version_meta_robots";
  DROP TYPE "public"."enum_conditions_blocks_logo_strip_background";
  DROP TYPE "public"."enum_conditions_blocks_icon_list_button_link_kind";
  DROP TYPE "public"."enum_conditions_blocks_media_text_button_link_kind";
  DROP TYPE "public"."enum_conditions_blocks_media_text_side";
  DROP TYPE "public"."enum_conditions_blocks_media_text_size";
  DROP TYPE "public"."enum_conditions_blocks_media_text_background";
  DROP TYPE "public"."enum_conditions_blocks_insurance_button_link_kind";
  DROP TYPE "public"."enum_conditions_blocks_doc_slider_button_link_kind";
  DROP TYPE "public"."enum_conditions_blocks_doc_slider_bottom_button_link_kind";
  DROP TYPE "public"."enum_conditions_blocks_rev_slider_button_link_kind";
  DROP TYPE "public"."enum_conditions_blocks_cond_grid_button_link_kind";
  DROP TYPE "public"."enum_conditions_blocks_cond_grid_background";
  DROP TYPE "public"."enum_conditions_blocks_before_after_button_link_kind";
  DROP TYPE "public"."enum_conditions_blocks_treat_cards_button_link_kind";
  DROP TYPE "public"."enum_conditions_blocks_post_slider_button_link_kind";
  DROP TYPE "public"."enum_conditions_blocks_site_cta_button_link_kind";
  DROP TYPE "public"."enum_conditions_status";
  DROP TYPE "public"."enum_conditions_meta_robots";
  DROP TYPE "public"."enum__conditions_v_blocks_logo_strip_background";
  DROP TYPE "public"."enum__conditions_v_blocks_icon_list_button_link_kind";
  DROP TYPE "public"."enum__conditions_v_blocks_media_text_button_link_kind";
  DROP TYPE "public"."enum__conditions_v_blocks_media_text_side";
  DROP TYPE "public"."enum__conditions_v_blocks_media_text_size";
  DROP TYPE "public"."enum__conditions_v_blocks_media_text_background";
  DROP TYPE "public"."enum__conditions_v_blocks_insurance_button_link_kind";
  DROP TYPE "public"."enum__conditions_v_blocks_doc_slider_button_link_kind";
  DROP TYPE "public"."enum__conditions_v_blocks_doc_slider_bottom_button_link_kind";
  DROP TYPE "public"."enum__conditions_v_blocks_rev_slider_button_link_kind";
  DROP TYPE "public"."enum__conditions_v_blocks_cond_grid_button_link_kind";
  DROP TYPE "public"."enum__conditions_v_blocks_cond_grid_background";
  DROP TYPE "public"."enum__conditions_v_blocks_before_after_button_link_kind";
  DROP TYPE "public"."enum__conditions_v_blocks_treat_cards_button_link_kind";
  DROP TYPE "public"."enum__conditions_v_blocks_post_slider_button_link_kind";
  DROP TYPE "public"."enum__conditions_v_blocks_site_cta_button_link_kind";
  DROP TYPE "public"."enum__conditions_v_version_status";
  DROP TYPE "public"."enum__conditions_v_published_locale";
  DROP TYPE "public"."enum__conditions_v_version_meta_robots";
  DROP TYPE "public"."enum_header_more_links_link_kind";
  DROP TYPE "public"."enum_header_announcement_link_kind";
  DROP TYPE "public"."enum__header_v_version_more_links_link_kind";
  DROP TYPE "public"."enum__header_v_version_announcement_link_kind";
  DROP TYPE "public"."enum_footer_social_network";
  DROP TYPE "public"."enum__footer_v_version_social_network";
  DROP TYPE "public"."enum_presets_blocks_hero_video_button_link_kind";
  DROP TYPE "public"."enum_presets_blocks_hero_banner_button_link_kind";
  DROP TYPE "public"."enum_presets_blocks_logo_strip_background";
  DROP TYPE "public"."enum_presets_blocks_icon_list_button_link_kind";
  DROP TYPE "public"."enum_presets_blocks_media_text_button_link_kind";
  DROP TYPE "public"."enum_presets_blocks_media_text_side";
  DROP TYPE "public"."enum_presets_blocks_media_text_size";
  DROP TYPE "public"."enum_presets_blocks_media_text_background";
  DROP TYPE "public"."enum_presets_blocks_insurance_button_link_kind";
  DROP TYPE "public"."enum_presets_blocks_doc_slider_button_link_kind";
  DROP TYPE "public"."enum_presets_blocks_doc_slider_bottom_button_link_kind";
  DROP TYPE "public"."enum_presets_blocks_rev_slider_button_link_kind";
  DROP TYPE "public"."enum_presets_blocks_cond_grid_button_link_kind";
  DROP TYPE "public"."enum_presets_blocks_cond_grid_background";
  DROP TYPE "public"."enum_presets_blocks_before_after_button_link_kind";
  DROP TYPE "public"."enum_presets_blocks_treat_cards_button_link_kind";
  DROP TYPE "public"."enum_presets_blocks_post_slider_button_link_kind";
  DROP TYPE "public"."enum_presets_blocks_site_cta_button_link_kind";`)
}
