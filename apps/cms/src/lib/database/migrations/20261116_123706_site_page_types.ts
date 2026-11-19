import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_page_blocks_image_hero_crumbs_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_page_blocks_image_hero_size" AS ENUM('regular', 'large');
  CREATE TYPE "public"."enum_page_blocks_image_hero_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_page_blocks_logo_strip_arrangement" AS ENUM('rotate', 'wrap', 'wrapTablet');
  CREATE TYPE "public"."enum_page_blocks_icon_list_layout" AS ENUM('list', 'image');
  CREATE TYPE "public"."enum_page_blocks_media_text_image_style" AS ENUM('framed', 'plain');
  CREATE TYPE "public"."enum_page_blocks_rev_slider_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_page_blocks_cond_grid_list_heading_level" AS ENUM('h3', 'h2');
  CREATE TYPE "public"."enum_page_blocks_cond_grid_title_level" AS ENUM('h5', 'h3');
  CREATE TYPE "public"."enum_page_blocks_cond_grid_video_position" AS ENUM('afterText', 'afterList');
  CREATE TYPE "public"."enum_page_blocks_treat_cards_heading_align" AS ENUM('left', 'center');
  CREATE TYPE "public"."enum_page_blocks_center_text_background" AS ENUM('bg', 'white', 'light-blue', 'yellow');
  CREATE TYPE "public"."enum_page_blocks_center_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_page_blocks_center_text_kind" AS ENUM('text', 'faq', 'quote', 'doctors');
  CREATE TYPE "public"."enum_page_blocks_center_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_page_blocks_center_text_button_style" AS ENUM('filled', 'outline');
  CREATE TYPE "public"."enum_stky_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_stky_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TYPE "public"."enum_page_blocks_results_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_page_blocks_results_align" AS ENUM('start', 'center');
  CREATE TYPE "public"."enum_page_blocks_state_docs_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_page_blocks_quiz_demo_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_page_template" AS ENUM('blog', 'default', 'doctor', 'home', 'location', 'locations', 'post', 'region', 'symptom', 'treatment');
  CREATE TYPE "public"."enum__page_v_blocks_image_hero_crumbs_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__page_v_blocks_image_hero_size" AS ENUM('regular', 'large');
  CREATE TYPE "public"."enum__page_v_blocks_image_hero_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__page_v_blocks_logo_strip_arrangement" AS ENUM('rotate', 'wrap', 'wrapTablet');
  CREATE TYPE "public"."enum__page_v_blocks_icon_list_layout" AS ENUM('list', 'image');
  CREATE TYPE "public"."enum__page_v_blocks_media_text_image_style" AS ENUM('framed', 'plain');
  CREATE TYPE "public"."enum__page_v_blocks_rev_slider_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__page_v_blocks_cond_grid_list_heading_level" AS ENUM('h3', 'h2');
  CREATE TYPE "public"."enum__page_v_blocks_cond_grid_title_level" AS ENUM('h5', 'h3');
  CREATE TYPE "public"."enum__page_v_blocks_cond_grid_video_position" AS ENUM('afterText', 'afterList');
  CREATE TYPE "public"."enum__page_v_blocks_treat_cards_heading_align" AS ENUM('left', 'center');
  CREATE TYPE "public"."enum__page_v_blocks_center_text_background" AS ENUM('bg', 'white', 'light-blue', 'yellow');
  CREATE TYPE "public"."enum__page_v_blocks_center_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__page_v_blocks_center_text_kind" AS ENUM('text', 'faq', 'quote', 'doctors');
  CREATE TYPE "public"."enum__page_v_blocks_center_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__page_v_blocks_center_text_button_style" AS ENUM('filled', 'outline');
  CREATE TYPE "public"."enum__stky_v_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__stky_v_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TYPE "public"."enum__page_v_blocks_results_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__page_v_blocks_results_align" AS ENUM('start', 'center');
  CREATE TYPE "public"."enum__page_v_blocks_state_docs_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__page_v_blocks_quiz_demo_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__page_v_version_template" AS ENUM('blog', 'default', 'doctor', 'home', 'location', 'locations', 'post', 'region', 'symptom', 'treatment');
  CREATE TYPE "public"."enum_states_blocks_logo_strip_arrangement" AS ENUM('rotate', 'wrap', 'wrapTablet');
  CREATE TYPE "public"."enum_states_blocks_icon_list_layout" AS ENUM('list', 'image');
  CREATE TYPE "public"."enum_states_blocks_media_text_image_style" AS ENUM('framed', 'plain');
  CREATE TYPE "public"."enum_states_blocks_rev_slider_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_states_blocks_cond_grid_list_heading_level" AS ENUM('h3', 'h2');
  CREATE TYPE "public"."enum_states_blocks_cond_grid_title_level" AS ENUM('h5', 'h3');
  CREATE TYPE "public"."enum_states_blocks_cond_grid_video_position" AS ENUM('afterText', 'afterList');
  CREATE TYPE "public"."enum_states_blocks_treat_cards_heading_align" AS ENUM('left', 'center');
  CREATE TYPE "public"."enum_states_blocks_center_text_background" AS ENUM('bg', 'white', 'light-blue', 'yellow');
  CREATE TYPE "public"."enum_states_blocks_center_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_states_blocks_center_text_kind" AS ENUM('text', 'faq', 'quote', 'doctors');
  CREATE TYPE "public"."enum_states_blocks_center_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_states_blocks_center_text_button_style" AS ENUM('filled', 'outline');
  CREATE TYPE "public"."enum_states_blocks_results_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_states_blocks_results_align" AS ENUM('start', 'center');
  CREATE TYPE "public"."enum_states_blocks_state_docs_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_states_blocks_quiz_demo_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_states_hero_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__states_v_blocks_logo_strip_arrangement" AS ENUM('rotate', 'wrap', 'wrapTablet');
  CREATE TYPE "public"."enum__states_v_blocks_icon_list_layout" AS ENUM('list', 'image');
  CREATE TYPE "public"."enum__states_v_blocks_media_text_image_style" AS ENUM('framed', 'plain');
  CREATE TYPE "public"."enum__states_v_blocks_rev_slider_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__states_v_blocks_cond_grid_list_heading_level" AS ENUM('h3', 'h2');
  CREATE TYPE "public"."enum__states_v_blocks_cond_grid_title_level" AS ENUM('h5', 'h3');
  CREATE TYPE "public"."enum__states_v_blocks_cond_grid_video_position" AS ENUM('afterText', 'afterList');
  CREATE TYPE "public"."enum__states_v_blocks_treat_cards_heading_align" AS ENUM('left', 'center');
  CREATE TYPE "public"."enum__states_v_blocks_center_text_background" AS ENUM('bg', 'white', 'light-blue', 'yellow');
  CREATE TYPE "public"."enum__states_v_blocks_center_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__states_v_blocks_center_text_kind" AS ENUM('text', 'faq', 'quote', 'doctors');
  CREATE TYPE "public"."enum__states_v_blocks_center_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__states_v_blocks_center_text_button_style" AS ENUM('filled', 'outline');
  CREATE TYPE "public"."enum__states_v_blocks_results_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__states_v_blocks_results_align" AS ENUM('start', 'center');
  CREATE TYPE "public"."enum__states_v_blocks_state_docs_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__states_v_blocks_quiz_demo_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__states_v_version_hero_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_clinics_blocks_logo_strip_arrangement" AS ENUM('rotate', 'wrap', 'wrapTablet');
  CREATE TYPE "public"."enum_clinics_blocks_icon_list_layout" AS ENUM('list', 'image');
  CREATE TYPE "public"."enum_clinics_blocks_media_text_image_style" AS ENUM('framed', 'plain');
  CREATE TYPE "public"."enum_clinics_blocks_rev_slider_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_clinics_blocks_cond_grid_list_heading_level" AS ENUM('h3', 'h2');
  CREATE TYPE "public"."enum_clinics_blocks_cond_grid_title_level" AS ENUM('h5', 'h3');
  CREATE TYPE "public"."enum_clinics_blocks_cond_grid_video_position" AS ENUM('afterText', 'afterList');
  CREATE TYPE "public"."enum_clinics_blocks_treat_cards_heading_align" AS ENUM('left', 'center');
  CREATE TYPE "public"."enum_clinics_blocks_center_text_background" AS ENUM('bg', 'white', 'light-blue', 'yellow');
  CREATE TYPE "public"."enum_clinics_blocks_center_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_clinics_blocks_center_text_kind" AS ENUM('text', 'faq', 'quote', 'doctors');
  CREATE TYPE "public"."enum_clinics_blocks_center_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_clinics_blocks_center_text_button_style" AS ENUM('filled', 'outline');
  CREATE TYPE "public"."enum_clinics_blocks_results_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_clinics_blocks_results_align" AS ENUM('start', 'center');
  CREATE TYPE "public"."enum_clinics_blocks_state_docs_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_clinics_blocks_quiz_demo_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_clinics_hero_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__clinics_v_blocks_logo_strip_arrangement" AS ENUM('rotate', 'wrap', 'wrapTablet');
  CREATE TYPE "public"."enum__clinics_v_blocks_icon_list_layout" AS ENUM('list', 'image');
  CREATE TYPE "public"."enum__clinics_v_blocks_media_text_image_style" AS ENUM('framed', 'plain');
  CREATE TYPE "public"."enum__clinics_v_blocks_rev_slider_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__clinics_v_blocks_cond_grid_list_heading_level" AS ENUM('h3', 'h2');
  CREATE TYPE "public"."enum__clinics_v_blocks_cond_grid_title_level" AS ENUM('h5', 'h3');
  CREATE TYPE "public"."enum__clinics_v_blocks_cond_grid_video_position" AS ENUM('afterText', 'afterList');
  CREATE TYPE "public"."enum__clinics_v_blocks_treat_cards_heading_align" AS ENUM('left', 'center');
  CREATE TYPE "public"."enum__clinics_v_blocks_center_text_background" AS ENUM('bg', 'white', 'light-blue', 'yellow');
  CREATE TYPE "public"."enum__clinics_v_blocks_center_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__clinics_v_blocks_center_text_kind" AS ENUM('text', 'faq', 'quote', 'doctors');
  CREATE TYPE "public"."enum__clinics_v_blocks_center_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__clinics_v_blocks_center_text_button_style" AS ENUM('filled', 'outline');
  CREATE TYPE "public"."enum__clinics_v_blocks_results_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__clinics_v_blocks_results_align" AS ENUM('start', 'center');
  CREATE TYPE "public"."enum__clinics_v_blocks_state_docs_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__clinics_v_blocks_quiz_demo_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__clinics_v_version_hero_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_doctors_blocks_logo_strip_arrangement" AS ENUM('rotate', 'wrap', 'wrapTablet');
  CREATE TYPE "public"."enum_doctors_blocks_icon_list_layout" AS ENUM('list', 'image');
  CREATE TYPE "public"."enum_doctors_blocks_media_text_image_style" AS ENUM('framed', 'plain');
  CREATE TYPE "public"."enum_doctors_blocks_rev_slider_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_doctors_blocks_cond_grid_list_heading_level" AS ENUM('h3', 'h2');
  CREATE TYPE "public"."enum_doctors_blocks_cond_grid_title_level" AS ENUM('h5', 'h3');
  CREATE TYPE "public"."enum_doctors_blocks_cond_grid_video_position" AS ENUM('afterText', 'afterList');
  CREATE TYPE "public"."enum_doctors_blocks_treat_cards_heading_align" AS ENUM('left', 'center');
  CREATE TYPE "public"."enum_doctors_blocks_center_text_background" AS ENUM('bg', 'white', 'light-blue', 'yellow');
  CREATE TYPE "public"."enum_doctors_blocks_center_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_doctors_blocks_center_text_kind" AS ENUM('text', 'faq', 'quote', 'doctors');
  CREATE TYPE "public"."enum_doctors_blocks_center_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_doctors_blocks_center_text_button_style" AS ENUM('filled', 'outline');
  CREATE TYPE "public"."enum_doctors_blocks_results_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_doctors_blocks_results_align" AS ENUM('start', 'center');
  CREATE TYPE "public"."enum_doctors_blocks_state_docs_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_doctors_blocks_quiz_demo_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__doctors_v_blocks_logo_strip_arrangement" AS ENUM('rotate', 'wrap', 'wrapTablet');
  CREATE TYPE "public"."enum__doctors_v_blocks_icon_list_layout" AS ENUM('list', 'image');
  CREATE TYPE "public"."enum__doctors_v_blocks_media_text_image_style" AS ENUM('framed', 'plain');
  CREATE TYPE "public"."enum__doctors_v_blocks_rev_slider_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__doctors_v_blocks_cond_grid_list_heading_level" AS ENUM('h3', 'h2');
  CREATE TYPE "public"."enum__doctors_v_blocks_cond_grid_title_level" AS ENUM('h5', 'h3');
  CREATE TYPE "public"."enum__doctors_v_blocks_cond_grid_video_position" AS ENUM('afterText', 'afterList');
  CREATE TYPE "public"."enum__doctors_v_blocks_treat_cards_heading_align" AS ENUM('left', 'center');
  CREATE TYPE "public"."enum__doctors_v_blocks_center_text_background" AS ENUM('bg', 'white', 'light-blue', 'yellow');
  CREATE TYPE "public"."enum__doctors_v_blocks_center_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__doctors_v_blocks_center_text_kind" AS ENUM('text', 'faq', 'quote', 'doctors');
  CREATE TYPE "public"."enum__doctors_v_blocks_center_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__doctors_v_blocks_center_text_button_style" AS ENUM('filled', 'outline');
  CREATE TYPE "public"."enum__doctors_v_blocks_results_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__doctors_v_blocks_results_align" AS ENUM('start', 'center');
  CREATE TYPE "public"."enum__doctors_v_blocks_state_docs_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__doctors_v_blocks_quiz_demo_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_treatments_blocks_logo_strip_arrangement" AS ENUM('rotate', 'wrap', 'wrapTablet');
  CREATE TYPE "public"."enum_treatments_blocks_icon_list_layout" AS ENUM('list', 'image');
  CREATE TYPE "public"."enum_treatments_blocks_media_text_image_style" AS ENUM('framed', 'plain');
  CREATE TYPE "public"."enum_treatments_blocks_rev_slider_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_treatments_blocks_cond_grid_list_heading_level" AS ENUM('h3', 'h2');
  CREATE TYPE "public"."enum_treatments_blocks_cond_grid_title_level" AS ENUM('h5', 'h3');
  CREATE TYPE "public"."enum_treatments_blocks_cond_grid_video_position" AS ENUM('afterText', 'afterList');
  CREATE TYPE "public"."enum_treatments_blocks_treat_cards_heading_align" AS ENUM('left', 'center');
  CREATE TYPE "public"."enum_treatments_blocks_center_text_background" AS ENUM('bg', 'white', 'light-blue', 'yellow');
  CREATE TYPE "public"."enum_treatments_blocks_center_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_treatments_blocks_center_text_kind" AS ENUM('text', 'faq', 'quote', 'doctors');
  CREATE TYPE "public"."enum_treatments_blocks_center_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_treatments_blocks_center_text_button_style" AS ENUM('filled', 'outline');
  CREATE TYPE "public"."enum_treatments_blocks_results_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_treatments_blocks_results_align" AS ENUM('start', 'center');
  CREATE TYPE "public"."enum_treatments_blocks_state_docs_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_treatments_blocks_quiz_demo_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__treatments_v_blocks_logo_strip_arrangement" AS ENUM('rotate', 'wrap', 'wrapTablet');
  CREATE TYPE "public"."enum__treatments_v_blocks_icon_list_layout" AS ENUM('list', 'image');
  CREATE TYPE "public"."enum__treatments_v_blocks_media_text_image_style" AS ENUM('framed', 'plain');
  CREATE TYPE "public"."enum__treatments_v_blocks_rev_slider_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__treatments_v_blocks_cond_grid_list_heading_level" AS ENUM('h3', 'h2');
  CREATE TYPE "public"."enum__treatments_v_blocks_cond_grid_title_level" AS ENUM('h5', 'h3');
  CREATE TYPE "public"."enum__treatments_v_blocks_cond_grid_video_position" AS ENUM('afterText', 'afterList');
  CREATE TYPE "public"."enum__treatments_v_blocks_treat_cards_heading_align" AS ENUM('left', 'center');
  CREATE TYPE "public"."enum__treatments_v_blocks_center_text_background" AS ENUM('bg', 'white', 'light-blue', 'yellow');
  CREATE TYPE "public"."enum__treatments_v_blocks_center_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__treatments_v_blocks_center_text_kind" AS ENUM('text', 'faq', 'quote', 'doctors');
  CREATE TYPE "public"."enum__treatments_v_blocks_center_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__treatments_v_blocks_center_text_button_style" AS ENUM('filled', 'outline');
  CREATE TYPE "public"."enum__treatments_v_blocks_results_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__treatments_v_blocks_results_align" AS ENUM('start', 'center');
  CREATE TYPE "public"."enum__treatments_v_blocks_state_docs_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__treatments_v_blocks_quiz_demo_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_conditions_blocks_logo_strip_arrangement" AS ENUM('rotate', 'wrap', 'wrapTablet');
  CREATE TYPE "public"."enum_conditions_blocks_icon_list_layout" AS ENUM('list', 'image');
  CREATE TYPE "public"."enum_conditions_blocks_media_text_image_style" AS ENUM('framed', 'plain');
  CREATE TYPE "public"."enum_conditions_blocks_rev_slider_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_conditions_blocks_cond_grid_list_heading_level" AS ENUM('h3', 'h2');
  CREATE TYPE "public"."enum_conditions_blocks_cond_grid_title_level" AS ENUM('h5', 'h3');
  CREATE TYPE "public"."enum_conditions_blocks_cond_grid_video_position" AS ENUM('afterText', 'afterList');
  CREATE TYPE "public"."enum_conditions_blocks_treat_cards_heading_align" AS ENUM('left', 'center');
  CREATE TYPE "public"."enum_conditions_blocks_center_text_background" AS ENUM('bg', 'white', 'light-blue', 'yellow');
  CREATE TYPE "public"."enum_conditions_blocks_center_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_conditions_blocks_center_text_kind" AS ENUM('text', 'faq', 'quote', 'doctors');
  CREATE TYPE "public"."enum_conditions_blocks_center_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_conditions_blocks_center_text_button_style" AS ENUM('filled', 'outline');
  CREATE TYPE "public"."enum_conditions_blocks_results_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_conditions_blocks_results_align" AS ENUM('start', 'center');
  CREATE TYPE "public"."enum_conditions_blocks_state_docs_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_conditions_blocks_quiz_demo_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__conditions_v_blocks_logo_strip_arrangement" AS ENUM('rotate', 'wrap', 'wrapTablet');
  CREATE TYPE "public"."enum__conditions_v_blocks_icon_list_layout" AS ENUM('list', 'image');
  CREATE TYPE "public"."enum__conditions_v_blocks_media_text_image_style" AS ENUM('framed', 'plain');
  CREATE TYPE "public"."enum__conditions_v_blocks_rev_slider_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__conditions_v_blocks_cond_grid_list_heading_level" AS ENUM('h3', 'h2');
  CREATE TYPE "public"."enum__conditions_v_blocks_cond_grid_title_level" AS ENUM('h5', 'h3');
  CREATE TYPE "public"."enum__conditions_v_blocks_cond_grid_video_position" AS ENUM('afterText', 'afterList');
  CREATE TYPE "public"."enum__conditions_v_blocks_treat_cards_heading_align" AS ENUM('left', 'center');
  CREATE TYPE "public"."enum__conditions_v_blocks_center_text_background" AS ENUM('bg', 'white', 'light-blue', 'yellow');
  CREATE TYPE "public"."enum__conditions_v_blocks_center_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__conditions_v_blocks_center_text_kind" AS ENUM('text', 'faq', 'quote', 'doctors');
  CREATE TYPE "public"."enum__conditions_v_blocks_center_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__conditions_v_blocks_center_text_button_style" AS ENUM('filled', 'outline');
  CREATE TYPE "public"."enum__conditions_v_blocks_results_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__conditions_v_blocks_results_align" AS ENUM('start', 'center');
  CREATE TYPE "public"."enum__conditions_v_blocks_state_docs_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__conditions_v_blocks_quiz_demo_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_posts_blocks_logo_strip_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_posts_blocks_logo_strip_arrangement" AS ENUM('rotate', 'wrap', 'wrapTablet');
  CREATE TYPE "public"."enum_posts_blocks_icon_list_layout" AS ENUM('list', 'image');
  CREATE TYPE "public"."enum_posts_blocks_icon_list_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_posts_blocks_media_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_posts_blocks_media_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum_posts_blocks_media_text_size" AS ENUM('regular', 'full', 'small');
  CREATE TYPE "public"."enum_posts_blocks_media_text_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_posts_blocks_media_text_image_style" AS ENUM('framed', 'plain');
  CREATE TYPE "public"."enum_posts_blocks_insurance_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_posts_blocks_doc_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_posts_blocks_doc_slider_bottom_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_posts_blocks_rev_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_posts_blocks_rev_slider_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_posts_blocks_cond_grid_list_heading_level" AS ENUM('h3', 'h2');
  CREATE TYPE "public"."enum_posts_blocks_cond_grid_title_level" AS ENUM('h5', 'h3');
  CREATE TYPE "public"."enum_posts_blocks_cond_grid_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_posts_blocks_cond_grid_video_position" AS ENUM('afterText', 'afterList');
  CREATE TYPE "public"."enum_posts_blocks_cond_grid_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum_posts_blocks_before_after_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_posts_blocks_treat_cards_heading_align" AS ENUM('left', 'center');
  CREATE TYPE "public"."enum_posts_blocks_treat_cards_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_posts_blocks_post_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_posts_blocks_site_cta_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_posts_blocks_center_text_background" AS ENUM('bg', 'white', 'light-blue', 'yellow');
  CREATE TYPE "public"."enum_posts_blocks_center_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_posts_blocks_center_text_kind" AS ENUM('text', 'faq', 'quote', 'doctors');
  CREATE TYPE "public"."enum_posts_blocks_center_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_posts_blocks_center_text_button_style" AS ENUM('filled', 'outline');
  CREATE TYPE "public"."enum_posts_blocks_results_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_posts_blocks_results_align" AS ENUM('start', 'center');
  CREATE TYPE "public"."enum_posts_blocks_state_docs_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_posts_blocks_quiz_demo_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__posts_v_blocks_logo_strip_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__posts_v_blocks_logo_strip_arrangement" AS ENUM('rotate', 'wrap', 'wrapTablet');
  CREATE TYPE "public"."enum__posts_v_blocks_icon_list_layout" AS ENUM('list', 'image');
  CREATE TYPE "public"."enum__posts_v_blocks_icon_list_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__posts_v_blocks_media_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__posts_v_blocks_media_text_side" AS ENUM('left', 'right');
  CREATE TYPE "public"."enum__posts_v_blocks_media_text_size" AS ENUM('regular', 'full', 'small');
  CREATE TYPE "public"."enum__posts_v_blocks_media_text_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__posts_v_blocks_media_text_image_style" AS ENUM('framed', 'plain');
  CREATE TYPE "public"."enum__posts_v_blocks_insurance_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__posts_v_blocks_doc_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__posts_v_blocks_doc_slider_bottom_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__posts_v_blocks_rev_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__posts_v_blocks_rev_slider_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__posts_v_blocks_cond_grid_list_heading_level" AS ENUM('h3', 'h2');
  CREATE TYPE "public"."enum__posts_v_blocks_cond_grid_title_level" AS ENUM('h5', 'h3');
  CREATE TYPE "public"."enum__posts_v_blocks_cond_grid_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__posts_v_blocks_cond_grid_video_position" AS ENUM('afterText', 'afterList');
  CREATE TYPE "public"."enum__posts_v_blocks_cond_grid_background" AS ENUM('none', 'white', 'bg', 'light-blue', 'lightest-blue', 'tertiary-blue', 'yellow');
  CREATE TYPE "public"."enum__posts_v_blocks_before_after_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__posts_v_blocks_treat_cards_heading_align" AS ENUM('left', 'center');
  CREATE TYPE "public"."enum__posts_v_blocks_treat_cards_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__posts_v_blocks_post_slider_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__posts_v_blocks_site_cta_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__posts_v_blocks_center_text_background" AS ENUM('bg', 'white', 'light-blue', 'yellow');
  CREATE TYPE "public"."enum__posts_v_blocks_center_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum__posts_v_blocks_center_text_kind" AS ENUM('text', 'faq', 'quote', 'doctors');
  CREATE TYPE "public"."enum__posts_v_blocks_center_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__posts_v_blocks_center_text_button_style" AS ENUM('filled', 'outline');
  CREATE TYPE "public"."enum__posts_v_blocks_results_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__posts_v_blocks_results_align" AS ENUM('start', 'center');
  CREATE TYPE "public"."enum__posts_v_blocks_state_docs_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum__posts_v_blocks_quiz_demo_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_presets_blocks_image_hero_crumbs_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_presets_blocks_image_hero_size" AS ENUM('regular', 'large');
  CREATE TYPE "public"."enum_presets_blocks_image_hero_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_presets_blocks_logo_strip_arrangement" AS ENUM('rotate', 'wrap', 'wrapTablet');
  CREATE TYPE "public"."enum_presets_blocks_icon_list_layout" AS ENUM('list', 'image');
  CREATE TYPE "public"."enum_presets_blocks_media_text_image_style" AS ENUM('framed', 'plain');
  CREATE TYPE "public"."enum_presets_blocks_rev_slider_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_presets_blocks_cond_grid_list_heading_level" AS ENUM('h3', 'h2');
  CREATE TYPE "public"."enum_presets_blocks_cond_grid_title_level" AS ENUM('h5', 'h3');
  CREATE TYPE "public"."enum_presets_blocks_cond_grid_video_position" AS ENUM('afterText', 'afterList');
  CREATE TYPE "public"."enum_presets_blocks_treat_cards_heading_align" AS ENUM('left', 'center');
  CREATE TYPE "public"."enum_presets_blocks_center_text_background" AS ENUM('bg', 'white', 'light-blue', 'yellow');
  CREATE TYPE "public"."enum_presets_blocks_center_text_heading_level" AS ENUM('h2', 'h3');
  CREATE TYPE "public"."enum_presets_blocks_center_text_kind" AS ENUM('text', 'faq', 'quote', 'doctors');
  CREATE TYPE "public"."enum_presets_blocks_center_text_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_presets_blocks_center_text_button_style" AS ENUM('filled', 'outline');
  CREATE TYPE "public"."enum_presets_blocks_sticky_media_chapters_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_presets_blocks_sticky_media_chapters_note_size" AS ENUM('regular', 'small');
  CREATE TYPE "public"."enum_presets_blocks_results_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_presets_blocks_results_align" AS ENUM('start', 'center');
  CREATE TYPE "public"."enum_presets_blocks_state_docs_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TYPE "public"."enum_presets_blocks_quiz_demo_button_link_kind" AS ENUM('internal', 'relative', 'external');
  CREATE TABLE "page_blocks_image_hero_crumbs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"link_kind" "enum_page_blocks_image_hero_crumbs_link_kind" DEFAULT 'internal',
  	"link_new_tab" boolean,
  	"link_path" varchar,
  	"link_url" varchar
  );
  
  CREATE TABLE "page_blocks_image_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"size" "enum_page_blocks_image_hero_size" DEFAULT 'regular',
  	"heading" jsonb,
  	"subheading" varchar,
  	"reviewer" jsonb,
  	"text" jsonb,
  	"address" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_page_blocks_image_hero_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"phone_label" varchar,
  	"phone" varchar,
  	"image_id" integer,
  	"mobile_image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_simple_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_blog_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"heading" varchar,
  	"text" varchar,
  	"post_id" integer,
  	"badge" varchar,
  	"button_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_center_text_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "page_blocks_center_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"background" "enum_page_blocks_center_text_background" DEFAULT 'bg',
  	"anchor" varchar,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"heading_level" "enum_page_blocks_center_text_heading_level" DEFAULT 'h2',
  	"text" jsonb,
  	"kind" "enum_page_blocks_center_text_kind" DEFAULT 'text',
  	"first_open" boolean DEFAULT false,
  	"faq_schema" boolean DEFAULT true,
  	"quote" varchar,
  	"quote_by_id" integer,
  	"closing_text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_page_blocks_center_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"button_style" "enum_page_blocks_center_text_button_style" DEFAULT 'filled',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "stky_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_stky_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum_stky_chapters_note_size" DEFAULT 'regular'
  );
  
  CREATE TABLE "stky" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_results_items_symptoms" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"name" varchar
  );
  
  CREATE TABLE "page_blocks_results_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"place" varchar,
  	"rating" numeric DEFAULT 5,
  	"source_logo_id" integer,
  	"before_id" integer,
  	"after_id" integer
  );
  
  CREATE TABLE "page_blocks_results" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"note" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_page_blocks_results_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"align" "enum_page_blocks_results_align" DEFAULT 'start',
  	"symptoms_label" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_state_sites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_state_docs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"state_id" integer,
  	"card_button_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_page_blocks_state_docs_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_loc_accord_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"name" varchar
  );
  
  CREATE TABLE "page_blocks_loc_accord" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"all_link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_clinic_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"clinic_id" integer,
  	"accredit_heading" jsonb,
  	"accredit_text" jsonb,
  	"accredit_image_id" integer,
  	"doctor_button" varchar,
  	"text" jsonb,
  	"hours_heading" varchar,
  	"directions_heading" varchar,
  	"directions" jsonb,
  	"near_heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_quiz_demo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_page_blocks_quiz_demo_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_trending" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "page_blocks_blog_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tags_title" varchar,
  	"all_text" varchar,
  	"heading" varchar,
  	"more_text" varchar,
  	"page_size" numeric DEFAULT 8,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_image_hero_crumbs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"link_kind" "enum__page_v_blocks_image_hero_crumbs_link_kind" DEFAULT 'internal',
  	"link_new_tab" boolean,
  	"link_path" varchar,
  	"link_url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_image_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"size" "enum__page_v_blocks_image_hero_size" DEFAULT 'regular',
  	"heading" jsonb,
  	"subheading" varchar,
  	"reviewer" jsonb,
  	"text" jsonb,
  	"address" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__page_v_blocks_image_hero_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"phone_label" varchar,
  	"phone" varchar,
  	"image_id" integer,
  	"mobile_image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_simple_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_blog_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"heading" varchar,
  	"text" varchar,
  	"post_id" integer,
  	"badge" varchar,
  	"button_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_center_text_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_center_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"background" "enum__page_v_blocks_center_text_background" DEFAULT 'bg',
  	"anchor" varchar,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"heading_level" "enum__page_v_blocks_center_text_heading_level" DEFAULT 'h2',
  	"text" jsonb,
  	"kind" "enum__page_v_blocks_center_text_kind" DEFAULT 'text',
  	"first_open" boolean DEFAULT false,
  	"faq_schema" boolean DEFAULT true,
  	"quote" varchar,
  	"quote_by_id" integer,
  	"closing_text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__page_v_blocks_center_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"button_style" "enum__page_v_blocks_center_text_button_style" DEFAULT 'filled',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_stky_v_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__stky_v_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum__stky_v_chapters_note_size" DEFAULT 'regular',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_stky_v" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_results_items_symptoms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_results_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"place" varchar,
  	"rating" numeric DEFAULT 5,
  	"source_logo_id" integer,
  	"before_id" integer,
  	"after_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_results" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"note" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__page_v_blocks_results_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"align" "enum__page_v_blocks_results_align" DEFAULT 'start',
  	"symptoms_label" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_state_sites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_state_docs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"state_id" integer,
  	"card_button_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__page_v_blocks_state_docs_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_loc_accord_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_page_v_blocks_loc_accord" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"all_link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_clinic_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"clinic_id" integer,
  	"accredit_heading" jsonb,
  	"accredit_text" jsonb,
  	"accredit_image_id" integer,
  	"doctor_button" varchar,
  	"text" jsonb,
  	"hours_heading" varchar,
  	"directions_heading" varchar,
  	"directions" jsonb,
  	"near_heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_quiz_demo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__page_v_blocks_quiz_demo_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_trending" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_page_v_blocks_blog_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tags_title" varchar,
  	"all_text" varchar,
  	"heading" varchar,
  	"more_text" varchar,
  	"page_size" numeric DEFAULT 8,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "states_blocks_center_text_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "states_blocks_center_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"background" "enum_states_blocks_center_text_background" DEFAULT 'bg',
  	"anchor" varchar,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"heading_level" "enum_states_blocks_center_text_heading_level" DEFAULT 'h2',
  	"text" jsonb,
  	"kind" "enum_states_blocks_center_text_kind" DEFAULT 'text',
  	"first_open" boolean DEFAULT false,
  	"faq_schema" boolean DEFAULT true,
  	"quote" varchar,
  	"quote_by_id" integer,
  	"closing_text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_states_blocks_center_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"button_style" "enum_states_blocks_center_text_button_style" DEFAULT 'filled',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "states_blocks_results_items_symptoms" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"name" varchar
  );
  
  CREATE TABLE "states_blocks_results_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"place" varchar,
  	"rating" numeric DEFAULT 5,
  	"source_logo_id" integer,
  	"before_id" integer,
  	"after_id" integer
  );
  
  CREATE TABLE "states_blocks_results" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"note" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_states_blocks_results_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"align" "enum_states_blocks_results_align" DEFAULT 'start',
  	"symptoms_label" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "states_blocks_state_sites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "states_blocks_state_docs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"state_id" integer,
  	"card_button_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_states_blocks_state_docs_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "states_blocks_loc_accord_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"name" varchar
  );
  
  CREATE TABLE "states_blocks_loc_accord" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"all_link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "states_blocks_clinic_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"clinic_id" integer,
  	"accredit_heading" jsonb,
  	"accredit_text" jsonb,
  	"accredit_image_id" integer,
  	"doctor_button" varchar,
  	"text" jsonb,
  	"hours_heading" varchar,
  	"directions_heading" varchar,
  	"directions" jsonb,
  	"near_heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "states_blocks_quiz_demo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_states_blocks_quiz_demo_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "states_blocks_trending" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "states_blocks_blog_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tags_title" varchar,
  	"all_text" varchar,
  	"heading" varchar,
  	"more_text" varchar,
  	"page_size" numeric DEFAULT 8,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_states_v_blocks_center_text_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_states_v_blocks_center_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"background" "enum__states_v_blocks_center_text_background" DEFAULT 'bg',
  	"anchor" varchar,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"heading_level" "enum__states_v_blocks_center_text_heading_level" DEFAULT 'h2',
  	"text" jsonb,
  	"kind" "enum__states_v_blocks_center_text_kind" DEFAULT 'text',
  	"first_open" boolean DEFAULT false,
  	"faq_schema" boolean DEFAULT true,
  	"quote" varchar,
  	"quote_by_id" integer,
  	"closing_text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__states_v_blocks_center_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"button_style" "enum__states_v_blocks_center_text_button_style" DEFAULT 'filled',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_states_v_blocks_results_items_symptoms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_states_v_blocks_results_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"place" varchar,
  	"rating" numeric DEFAULT 5,
  	"source_logo_id" integer,
  	"before_id" integer,
  	"after_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_states_v_blocks_results" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"note" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__states_v_blocks_results_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"align" "enum__states_v_blocks_results_align" DEFAULT 'start',
  	"symptoms_label" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_states_v_blocks_state_sites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_states_v_blocks_state_docs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"state_id" integer,
  	"card_button_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__states_v_blocks_state_docs_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_states_v_blocks_loc_accord_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_states_v_blocks_loc_accord" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"all_link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_states_v_blocks_clinic_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"clinic_id" integer,
  	"accredit_heading" jsonb,
  	"accredit_text" jsonb,
  	"accredit_image_id" integer,
  	"doctor_button" varchar,
  	"text" jsonb,
  	"hours_heading" varchar,
  	"directions_heading" varchar,
  	"directions" jsonb,
  	"near_heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_states_v_blocks_quiz_demo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__states_v_blocks_quiz_demo_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_states_v_blocks_trending" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_states_v_blocks_blog_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tags_title" varchar,
  	"all_text" varchar,
  	"heading" varchar,
  	"more_text" varchar,
  	"page_size" numeric DEFAULT 8,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_blocks_center_text_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "clinics_blocks_center_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"background" "enum_clinics_blocks_center_text_background" DEFAULT 'bg',
  	"anchor" varchar,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"heading_level" "enum_clinics_blocks_center_text_heading_level" DEFAULT 'h2',
  	"text" jsonb,
  	"kind" "enum_clinics_blocks_center_text_kind" DEFAULT 'text',
  	"first_open" boolean DEFAULT false,
  	"faq_schema" boolean DEFAULT true,
  	"quote" varchar,
  	"quote_by_id" integer,
  	"closing_text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_clinics_blocks_center_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"button_style" "enum_clinics_blocks_center_text_button_style" DEFAULT 'filled',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_blocks_results_items_symptoms" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"name" varchar
  );
  
  CREATE TABLE "clinics_blocks_results_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"place" varchar,
  	"rating" numeric DEFAULT 5,
  	"source_logo_id" integer,
  	"before_id" integer,
  	"after_id" integer
  );
  
  CREATE TABLE "clinics_blocks_results" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"note" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_clinics_blocks_results_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"align" "enum_clinics_blocks_results_align" DEFAULT 'start',
  	"symptoms_label" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_blocks_state_sites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_blocks_state_docs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"state_id" integer,
  	"card_button_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_clinics_blocks_state_docs_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_blocks_loc_accord_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"name" varchar
  );
  
  CREATE TABLE "clinics_blocks_loc_accord" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"all_link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_blocks_clinic_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"clinic_id" integer,
  	"accredit_heading" jsonb,
  	"accredit_text" jsonb,
  	"accredit_image_id" integer,
  	"doctor_button" varchar,
  	"text" jsonb,
  	"hours_heading" varchar,
  	"directions_heading" varchar,
  	"directions" jsonb,
  	"near_heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_blocks_quiz_demo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_clinics_blocks_quiz_demo_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_blocks_trending" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "clinics_blocks_blog_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tags_title" varchar,
  	"all_text" varchar,
  	"heading" varchar,
  	"more_text" varchar,
  	"page_size" numeric DEFAULT 8,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_center_text_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_center_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"background" "enum__clinics_v_blocks_center_text_background" DEFAULT 'bg',
  	"anchor" varchar,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"heading_level" "enum__clinics_v_blocks_center_text_heading_level" DEFAULT 'h2',
  	"text" jsonb,
  	"kind" "enum__clinics_v_blocks_center_text_kind" DEFAULT 'text',
  	"first_open" boolean DEFAULT false,
  	"faq_schema" boolean DEFAULT true,
  	"quote" varchar,
  	"quote_by_id" integer,
  	"closing_text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__clinics_v_blocks_center_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"button_style" "enum__clinics_v_blocks_center_text_button_style" DEFAULT 'filled',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_results_items_symptoms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_results_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"place" varchar,
  	"rating" numeric DEFAULT 5,
  	"source_logo_id" integer,
  	"before_id" integer,
  	"after_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_results" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"note" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__clinics_v_blocks_results_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"align" "enum__clinics_v_blocks_results_align" DEFAULT 'start',
  	"symptoms_label" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_state_sites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_state_docs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"state_id" integer,
  	"card_button_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__clinics_v_blocks_state_docs_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_loc_accord_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_loc_accord" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"all_link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_clinic_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"clinic_id" integer,
  	"accredit_heading" jsonb,
  	"accredit_text" jsonb,
  	"accredit_image_id" integer,
  	"doctor_button" varchar,
  	"text" jsonb,
  	"hours_heading" varchar,
  	"directions_heading" varchar,
  	"directions" jsonb,
  	"near_heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_quiz_demo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__clinics_v_blocks_quiz_demo_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_trending" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_clinics_v_blocks_blog_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tags_title" varchar,
  	"all_text" varchar,
  	"heading" varchar,
  	"more_text" varchar,
  	"page_size" numeric DEFAULT 8,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_blocks_center_text_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "doctors_blocks_center_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"background" "enum_doctors_blocks_center_text_background" DEFAULT 'bg',
  	"anchor" varchar,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"heading_level" "enum_doctors_blocks_center_text_heading_level" DEFAULT 'h2',
  	"text" jsonb,
  	"kind" "enum_doctors_blocks_center_text_kind" DEFAULT 'text',
  	"first_open" boolean DEFAULT false,
  	"faq_schema" boolean DEFAULT true,
  	"quote" varchar,
  	"quote_by_id" integer,
  	"closing_text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_doctors_blocks_center_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"button_style" "enum_doctors_blocks_center_text_button_style" DEFAULT 'filled',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_blocks_results_items_symptoms" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"name" varchar
  );
  
  CREATE TABLE "doctors_blocks_results_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"place" varchar,
  	"rating" numeric DEFAULT 5,
  	"source_logo_id" integer,
  	"before_id" integer,
  	"after_id" integer
  );
  
  CREATE TABLE "doctors_blocks_results" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"note" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_doctors_blocks_results_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"align" "enum_doctors_blocks_results_align" DEFAULT 'start',
  	"symptoms_label" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_blocks_state_sites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_blocks_state_docs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"state_id" integer,
  	"card_button_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_doctors_blocks_state_docs_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_blocks_loc_accord_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"name" varchar
  );
  
  CREATE TABLE "doctors_blocks_loc_accord" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"all_link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_blocks_clinic_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"clinic_id" integer,
  	"accredit_heading" jsonb,
  	"accredit_text" jsonb,
  	"accredit_image_id" integer,
  	"doctor_button" varchar,
  	"text" jsonb,
  	"hours_heading" varchar,
  	"directions_heading" varchar,
  	"directions" jsonb,
  	"near_heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_blocks_quiz_demo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_doctors_blocks_quiz_demo_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_blocks_trending" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "doctors_blocks_blog_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tags_title" varchar,
  	"all_text" varchar,
  	"heading" varchar,
  	"more_text" varchar,
  	"page_size" numeric DEFAULT 8,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_center_text_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_center_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"background" "enum__doctors_v_blocks_center_text_background" DEFAULT 'bg',
  	"anchor" varchar,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"heading_level" "enum__doctors_v_blocks_center_text_heading_level" DEFAULT 'h2',
  	"text" jsonb,
  	"kind" "enum__doctors_v_blocks_center_text_kind" DEFAULT 'text',
  	"first_open" boolean DEFAULT false,
  	"faq_schema" boolean DEFAULT true,
  	"quote" varchar,
  	"quote_by_id" integer,
  	"closing_text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__doctors_v_blocks_center_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"button_style" "enum__doctors_v_blocks_center_text_button_style" DEFAULT 'filled',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_results_items_symptoms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_results_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"place" varchar,
  	"rating" numeric DEFAULT 5,
  	"source_logo_id" integer,
  	"before_id" integer,
  	"after_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_results" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"note" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__doctors_v_blocks_results_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"align" "enum__doctors_v_blocks_results_align" DEFAULT 'start',
  	"symptoms_label" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_state_sites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_state_docs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"state_id" integer,
  	"card_button_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__doctors_v_blocks_state_docs_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_loc_accord_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_loc_accord" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"all_link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_clinic_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"clinic_id" integer,
  	"accredit_heading" jsonb,
  	"accredit_text" jsonb,
  	"accredit_image_id" integer,
  	"doctor_button" varchar,
  	"text" jsonb,
  	"hours_heading" varchar,
  	"directions_heading" varchar,
  	"directions" jsonb,
  	"near_heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_quiz_demo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__doctors_v_blocks_quiz_demo_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_trending" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_doctors_v_blocks_blog_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tags_title" varchar,
  	"all_text" varchar,
  	"heading" varchar,
  	"more_text" varchar,
  	"page_size" numeric DEFAULT 8,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments_blocks_center_text_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "treatments_blocks_center_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"background" "enum_treatments_blocks_center_text_background" DEFAULT 'bg',
  	"anchor" varchar,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"heading_level" "enum_treatments_blocks_center_text_heading_level" DEFAULT 'h2',
  	"text" jsonb,
  	"kind" "enum_treatments_blocks_center_text_kind" DEFAULT 'text',
  	"first_open" boolean DEFAULT false,
  	"faq_schema" boolean DEFAULT true,
  	"quote" varchar,
  	"quote_by_id" integer,
  	"closing_text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_treatments_blocks_center_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"button_style" "enum_treatments_blocks_center_text_button_style" DEFAULT 'filled',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments_blocks_results_items_symptoms" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"name" varchar
  );
  
  CREATE TABLE "treatments_blocks_results_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"place" varchar,
  	"rating" numeric DEFAULT 5,
  	"source_logo_id" integer,
  	"before_id" integer,
  	"after_id" integer
  );
  
  CREATE TABLE "treatments_blocks_results" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"note" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_treatments_blocks_results_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"align" "enum_treatments_blocks_results_align" DEFAULT 'start',
  	"symptoms_label" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments_blocks_state_sites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments_blocks_state_docs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"state_id" integer,
  	"card_button_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_treatments_blocks_state_docs_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments_blocks_loc_accord_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"name" varchar
  );
  
  CREATE TABLE "treatments_blocks_loc_accord" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"all_link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments_blocks_clinic_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"clinic_id" integer,
  	"accredit_heading" jsonb,
  	"accredit_text" jsonb,
  	"accredit_image_id" integer,
  	"doctor_button" varchar,
  	"text" jsonb,
  	"hours_heading" varchar,
  	"directions_heading" varchar,
  	"directions" jsonb,
  	"near_heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments_blocks_quiz_demo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_treatments_blocks_quiz_demo_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments_blocks_trending" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "treatments_blocks_blog_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tags_title" varchar,
  	"all_text" varchar,
  	"heading" varchar,
  	"more_text" varchar,
  	"page_size" numeric DEFAULT 8,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_center_text_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_center_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"background" "enum__treatments_v_blocks_center_text_background" DEFAULT 'bg',
  	"anchor" varchar,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"heading_level" "enum__treatments_v_blocks_center_text_heading_level" DEFAULT 'h2',
  	"text" jsonb,
  	"kind" "enum__treatments_v_blocks_center_text_kind" DEFAULT 'text',
  	"first_open" boolean DEFAULT false,
  	"faq_schema" boolean DEFAULT true,
  	"quote" varchar,
  	"quote_by_id" integer,
  	"closing_text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__treatments_v_blocks_center_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"button_style" "enum__treatments_v_blocks_center_text_button_style" DEFAULT 'filled',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_results_items_symptoms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_results_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"place" varchar,
  	"rating" numeric DEFAULT 5,
  	"source_logo_id" integer,
  	"before_id" integer,
  	"after_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_results" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"note" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__treatments_v_blocks_results_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"align" "enum__treatments_v_blocks_results_align" DEFAULT 'start',
  	"symptoms_label" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_state_sites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_state_docs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"state_id" integer,
  	"card_button_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__treatments_v_blocks_state_docs_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_loc_accord_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_loc_accord" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"all_link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_clinic_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"clinic_id" integer,
  	"accredit_heading" jsonb,
  	"accredit_text" jsonb,
  	"accredit_image_id" integer,
  	"doctor_button" varchar,
  	"text" jsonb,
  	"hours_heading" varchar,
  	"directions_heading" varchar,
  	"directions" jsonb,
  	"near_heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_quiz_demo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__treatments_v_blocks_quiz_demo_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_trending" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_treatments_v_blocks_blog_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tags_title" varchar,
  	"all_text" varchar,
  	"heading" varchar,
  	"more_text" varchar,
  	"page_size" numeric DEFAULT 8,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions_blocks_center_text_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "conditions_blocks_center_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"background" "enum_conditions_blocks_center_text_background" DEFAULT 'bg',
  	"anchor" varchar,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"heading_level" "enum_conditions_blocks_center_text_heading_level" DEFAULT 'h2',
  	"text" jsonb,
  	"kind" "enum_conditions_blocks_center_text_kind" DEFAULT 'text',
  	"first_open" boolean DEFAULT false,
  	"faq_schema" boolean DEFAULT true,
  	"quote" varchar,
  	"quote_by_id" integer,
  	"closing_text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_conditions_blocks_center_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"button_style" "enum_conditions_blocks_center_text_button_style" DEFAULT 'filled',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions_blocks_results_items_symptoms" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"name" varchar
  );
  
  CREATE TABLE "conditions_blocks_results_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"place" varchar,
  	"rating" numeric DEFAULT 5,
  	"source_logo_id" integer,
  	"before_id" integer,
  	"after_id" integer
  );
  
  CREATE TABLE "conditions_blocks_results" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"note" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_conditions_blocks_results_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"align" "enum_conditions_blocks_results_align" DEFAULT 'start',
  	"symptoms_label" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions_blocks_state_sites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions_blocks_state_docs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"state_id" integer,
  	"card_button_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_conditions_blocks_state_docs_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions_blocks_loc_accord_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"name" varchar
  );
  
  CREATE TABLE "conditions_blocks_loc_accord" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"all_link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions_blocks_clinic_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"clinic_id" integer,
  	"accredit_heading" jsonb,
  	"accredit_text" jsonb,
  	"accredit_image_id" integer,
  	"doctor_button" varchar,
  	"text" jsonb,
  	"hours_heading" varchar,
  	"directions_heading" varchar,
  	"directions" jsonb,
  	"near_heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions_blocks_quiz_demo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_conditions_blocks_quiz_demo_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions_blocks_trending" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "conditions_blocks_blog_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tags_title" varchar,
  	"all_text" varchar,
  	"heading" varchar,
  	"more_text" varchar,
  	"page_size" numeric DEFAULT 8,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_center_text_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_center_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"background" "enum__conditions_v_blocks_center_text_background" DEFAULT 'bg',
  	"anchor" varchar,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"heading_level" "enum__conditions_v_blocks_center_text_heading_level" DEFAULT 'h2',
  	"text" jsonb,
  	"kind" "enum__conditions_v_blocks_center_text_kind" DEFAULT 'text',
  	"first_open" boolean DEFAULT false,
  	"faq_schema" boolean DEFAULT true,
  	"quote" varchar,
  	"quote_by_id" integer,
  	"closing_text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__conditions_v_blocks_center_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"button_style" "enum__conditions_v_blocks_center_text_button_style" DEFAULT 'filled',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_results_items_symptoms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_results_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"place" varchar,
  	"rating" numeric DEFAULT 5,
  	"source_logo_id" integer,
  	"before_id" integer,
  	"after_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_results" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"note" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__conditions_v_blocks_results_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"align" "enum__conditions_v_blocks_results_align" DEFAULT 'start',
  	"symptoms_label" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_state_sites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_state_docs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"state_id" integer,
  	"card_button_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__conditions_v_blocks_state_docs_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_loc_accord_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_loc_accord" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"all_link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_clinic_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"clinic_id" integer,
  	"accredit_heading" jsonb,
  	"accredit_text" jsonb,
  	"accredit_image_id" integer,
  	"doctor_button" varchar,
  	"text" jsonb,
  	"hours_heading" varchar,
  	"directions_heading" varchar,
  	"directions" jsonb,
  	"near_heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_quiz_demo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__conditions_v_blocks_quiz_demo_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_trending" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_conditions_v_blocks_blog_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tags_title" varchar,
  	"all_text" varchar,
  	"heading" varchar,
  	"more_text" varchar,
  	"page_size" numeric DEFAULT 8,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "authors_locales" (
  	"byline_name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "posts_blocks_logo_strip_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "posts_blocks_logo_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"background" "enum_posts_blocks_logo_strip_background" DEFAULT 'none',
  	"arrangement" "enum_posts_blocks_logo_strip_arrangement" DEFAULT 'rotate',
  	"anchor" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_icon_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"title" varchar,
  	"accent_title" jsonb,
  	"text" varchar
  );
  
  CREATE TABLE "posts_blocks_icon_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"layout" "enum_posts_blocks_icon_list_layout" DEFAULT 'list',
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"intro" jsonb,
  	"image_id" integer,
  	"button_text" varchar,
  	"button_link_kind" "enum_posts_blocks_icon_list_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_media_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_posts_blocks_media_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"side" "enum_posts_blocks_media_text_side" DEFAULT 'left',
  	"size" "enum_posts_blocks_media_text_size" DEFAULT 'regular',
  	"background" "enum_posts_blocks_media_text_background" DEFAULT 'none',
  	"image_id" integer,
  	"image_style" "enum_posts_blocks_media_text_image_style" DEFAULT 'framed',
  	"video_url" varchar,
  	"anchor" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_insurance_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "posts_blocks_insurance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_posts_blocks_insurance_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_doc_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_posts_blocks_doc_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"bottom_button_text" varchar,
  	"bottom_button_link_kind" "enum_posts_blocks_doc_slider_bottom_button_link_kind" DEFAULT 'internal',
  	"bottom_button_link_new_tab" boolean,
  	"bottom_button_link_path" varchar,
  	"bottom_button_link_url" varchar,
  	"image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_rev_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_posts_blocks_rev_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"note" varchar,
  	"limit" numeric,
  	"heading_level" "enum_posts_blocks_rev_slider_heading_level" DEFAULT 'h3',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_cond_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"list_heading" varchar,
  	"list_heading_level" "enum_posts_blocks_cond_grid_list_heading_level" DEFAULT 'h3',
  	"link_text" varchar,
  	"title_level" "enum_posts_blocks_cond_grid_title_level" DEFAULT 'h5',
  	"show_more_text" varchar,
  	"show_less_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_posts_blocks_cond_grid_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"video_url" varchar,
  	"video_position" "enum_posts_blocks_cond_grid_video_position" DEFAULT 'afterText',
  	"video_heading" varchar,
  	"video_cover_id" integer,
  	"background" "enum_posts_blocks_cond_grid_background" DEFAULT 'white',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_before_after_pairs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"before_id" integer,
  	"after_id" integer
  );
  
  CREATE TABLE "posts_blocks_before_after" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_posts_blocks_before_after_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_treat_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"heading_align" "enum_posts_blocks_treat_cards_heading_align" DEFAULT 'left',
  	"text" jsonb,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_posts_blocks_treat_cards_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_post_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_posts_blocks_post_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"limit" numeric DEFAULT 6,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_site_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_posts_blocks_site_cta_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_center_text_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "posts_blocks_center_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"background" "enum_posts_blocks_center_text_background" DEFAULT 'bg',
  	"anchor" varchar,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"heading_level" "enum_posts_blocks_center_text_heading_level" DEFAULT 'h2',
  	"text" jsonb,
  	"kind" "enum_posts_blocks_center_text_kind" DEFAULT 'text',
  	"first_open" boolean DEFAULT false,
  	"faq_schema" boolean DEFAULT true,
  	"quote" varchar,
  	"quote_by_id" integer,
  	"closing_text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_posts_blocks_center_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"button_style" "enum_posts_blocks_center_text_button_style" DEFAULT 'filled',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_results_items_symptoms" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"name" varchar
  );
  
  CREATE TABLE "posts_blocks_results_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"place" varchar,
  	"rating" numeric DEFAULT 5,
  	"source_logo_id" integer,
  	"before_id" integer,
  	"after_id" integer
  );
  
  CREATE TABLE "posts_blocks_results" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"note" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_posts_blocks_results_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"align" "enum_posts_blocks_results_align" DEFAULT 'start',
  	"symptoms_label" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_state_sites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_state_docs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"state_id" integer,
  	"card_button_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_posts_blocks_state_docs_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_loc_accord_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"name" varchar
  );
  
  CREATE TABLE "posts_blocks_loc_accord" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"all_link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_clinic_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"clinic_id" integer,
  	"accredit_heading" jsonb,
  	"accredit_text" jsonb,
  	"accredit_image_id" integer,
  	"doctor_button" varchar,
  	"text" jsonb,
  	"hours_heading" varchar,
  	"directions_heading" varchar,
  	"directions" jsonb,
  	"near_heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_quiz_demo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_posts_blocks_quiz_demo_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_trending" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_blocks_blog_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tags_title" varchar,
  	"all_text" varchar,
  	"heading" varchar,
  	"more_text" varchar,
  	"page_size" numeric DEFAULT 8,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "posts_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  CREATE TABLE "_posts_v_blocks_logo_strip_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_logo_strip" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"background" "enum__posts_v_blocks_logo_strip_background" DEFAULT 'none',
  	"arrangement" "enum__posts_v_blocks_logo_strip_arrangement" DEFAULT 'rotate',
  	"anchor" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_icon_list_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"title" varchar,
  	"accent_title" jsonb,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_icon_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"layout" "enum__posts_v_blocks_icon_list_layout" DEFAULT 'list',
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"intro" jsonb,
  	"image_id" integer,
  	"button_text" varchar,
  	"button_link_kind" "enum__posts_v_blocks_icon_list_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_media_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__posts_v_blocks_media_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"side" "enum__posts_v_blocks_media_text_side" DEFAULT 'left',
  	"size" "enum__posts_v_blocks_media_text_size" DEFAULT 'regular',
  	"background" "enum__posts_v_blocks_media_text_background" DEFAULT 'none',
  	"image_id" integer,
  	"image_style" "enum__posts_v_blocks_media_text_image_style" DEFAULT 'framed',
  	"video_url" varchar,
  	"anchor" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_insurance_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_insurance" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__posts_v_blocks_insurance_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_doc_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__posts_v_blocks_doc_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"bottom_button_text" varchar,
  	"bottom_button_link_kind" "enum__posts_v_blocks_doc_slider_bottom_button_link_kind" DEFAULT 'internal',
  	"bottom_button_link_new_tab" boolean,
  	"bottom_button_link_path" varchar,
  	"bottom_button_link_url" varchar,
  	"image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_rev_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__posts_v_blocks_rev_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"see_all_text" varchar,
  	"note" varchar,
  	"limit" numeric,
  	"heading_level" "enum__posts_v_blocks_rev_slider_heading_level" DEFAULT 'h3',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_cond_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"list_heading" varchar,
  	"list_heading_level" "enum__posts_v_blocks_cond_grid_list_heading_level" DEFAULT 'h3',
  	"link_text" varchar,
  	"title_level" "enum__posts_v_blocks_cond_grid_title_level" DEFAULT 'h5',
  	"show_more_text" varchar,
  	"show_less_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__posts_v_blocks_cond_grid_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"video_url" varchar,
  	"video_position" "enum__posts_v_blocks_cond_grid_video_position" DEFAULT 'afterText',
  	"video_heading" varchar,
  	"video_cover_id" integer,
  	"background" "enum__posts_v_blocks_cond_grid_background" DEFAULT 'white',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_before_after_pairs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"before_id" integer,
  	"after_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_before_after" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__posts_v_blocks_before_after_button_link_kind" DEFAULT 'internal',
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
  
  CREATE TABLE "_posts_v_blocks_treat_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"heading_align" "enum__posts_v_blocks_treat_cards_heading_align" DEFAULT 'left',
  	"text" jsonb,
  	"link_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__posts_v_blocks_treat_cards_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_post_slider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"heading" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__posts_v_blocks_post_slider_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"limit" numeric DEFAULT 6,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_site_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__posts_v_blocks_site_cta_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_center_text_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_center_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"background" "enum__posts_v_blocks_center_text_background" DEFAULT 'bg',
  	"anchor" varchar,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"heading_level" "enum__posts_v_blocks_center_text_heading_level" DEFAULT 'h2',
  	"text" jsonb,
  	"kind" "enum__posts_v_blocks_center_text_kind" DEFAULT 'text',
  	"first_open" boolean DEFAULT false,
  	"faq_schema" boolean DEFAULT true,
  	"quote" varchar,
  	"quote_by_id" integer,
  	"closing_text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum__posts_v_blocks_center_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"button_style" "enum__posts_v_blocks_center_text_button_style" DEFAULT 'filled',
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_results_items_symptoms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_results_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"quote" varchar,
  	"author" varchar,
  	"place" varchar,
  	"rating" numeric DEFAULT 5,
  	"source_logo_id" integer,
  	"before_id" integer,
  	"after_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_results" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"note" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__posts_v_blocks_results_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"align" "enum__posts_v_blocks_results_align" DEFAULT 'start',
  	"symptoms_label" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_state_sites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_state_docs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"state_id" integer,
  	"card_button_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__posts_v_blocks_state_docs_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_loc_accord_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_loc_accord" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"all_link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_clinic_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"clinic_id" integer,
  	"accredit_heading" jsonb,
  	"accredit_text" jsonb,
  	"accredit_image_id" integer,
  	"doctor_button" varchar,
  	"text" jsonb,
  	"hours_heading" varchar,
  	"directions_heading" varchar,
  	"directions" jsonb,
  	"near_heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_quiz_demo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum__posts_v_blocks_quiz_demo_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_trending" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_blocks_blog_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"tags_title" varchar,
  	"all_text" varchar,
  	"heading" varchar,
  	"more_text" varchar,
  	"page_size" numeric DEFAULT 8,
  	"_hidden" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_posts_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar,
  	"locale" "_locales"
  );
  
  CREATE TABLE "presets_blocks_image_hero_crumbs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"link_kind" "enum_presets_blocks_image_hero_crumbs_link_kind" DEFAULT 'internal',
  	"link_new_tab" boolean,
  	"link_path" varchar,
  	"link_url" varchar
  );
  
  CREATE TABLE "presets_blocks_image_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"size" "enum_presets_blocks_image_hero_size" DEFAULT 'regular',
  	"heading" jsonb NOT NULL,
  	"subheading" varchar,
  	"reviewer" jsonb,
  	"text" jsonb,
  	"address" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_presets_blocks_image_hero_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"phone_label" varchar,
  	"phone" varchar,
  	"image_id" integer,
  	"mobile_image_id" integer,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_simple_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb NOT NULL,
  	"text" jsonb,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_blog_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"logo_id" integer,
  	"heading" varchar NOT NULL,
  	"text" varchar,
  	"post_id" integer,
  	"badge" varchar,
  	"button_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_center_text_faqs" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar,
  	"answer" jsonb
  );
  
  CREATE TABLE "presets_blocks_center_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"background" "enum_presets_blocks_center_text_background" DEFAULT 'bg',
  	"anchor" varchar,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"heading_level" "enum_presets_blocks_center_text_heading_level" DEFAULT 'h2',
  	"text" jsonb,
  	"kind" "enum_presets_blocks_center_text_kind" DEFAULT 'text',
  	"first_open" boolean DEFAULT false,
  	"faq_schema" boolean DEFAULT true,
  	"quote" varchar,
  	"quote_by_id" integer,
  	"closing_text" jsonb,
  	"button_text" varchar,
  	"button_link_kind" "enum_presets_blocks_center_text_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"button_style" "enum_presets_blocks_center_text_button_style" DEFAULT 'filled',
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_sticky_media_chapters" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"hide_on_mobile" boolean DEFAULT false,
  	"text" jsonb NOT NULL,
  	"button_text" varchar,
  	"button_link_kind" "enum_presets_blocks_sticky_media_chapters_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"note" jsonb,
  	"note_size" "enum_presets_blocks_sticky_media_chapters_note_size" DEFAULT 'regular'
  );
  
  CREATE TABLE "presets_blocks_sticky_media" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_results_items_symptoms" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon_id" integer,
  	"name" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_results_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar NOT NULL,
  	"author" varchar NOT NULL,
  	"place" varchar,
  	"rating" numeric DEFAULT 5,
  	"source_logo_id" integer,
  	"before_id" integer NOT NULL,
  	"after_id" integer NOT NULL
  );
  
  CREATE TABLE "presets_blocks_results" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"note" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_presets_blocks_results_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"align" "enum_presets_blocks_results_align" DEFAULT 'start',
  	"symptoms_label" varchar,
  	"before_label" varchar,
  	"after_label" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_state_sites" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"state_id" integer,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_state_docs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" jsonb,
  	"text" jsonb,
  	"state_id" integer,
  	"card_button_text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_presets_blocks_state_docs_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_loc_accord_areas" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"state_id" integer NOT NULL,
  	"name" varchar NOT NULL
  );
  
  CREATE TABLE "presets_blocks_loc_accord" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"reviews_label" varchar,
  	"link_text" varchar,
  	"all_link_text" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_clinic_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"clinic_id" integer,
  	"accredit_heading" jsonb,
  	"accredit_text" jsonb,
  	"accredit_image_id" integer,
  	"doctor_button" varchar,
  	"text" jsonb,
  	"hours_heading" varchar,
  	"directions_heading" varchar,
  	"directions" jsonb,
  	"near_heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_quiz_demo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" jsonb,
  	"text" varchar,
  	"button_text" varchar,
  	"button_link_kind" "enum_presets_blocks_quiz_demo_button_link_kind" DEFAULT 'internal',
  	"button_link_new_tab" boolean,
  	"button_link_path" varchar,
  	"button_link_url" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_trending" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "presets_blocks_blog_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tags_title" varchar,
  	"all_text" varchar,
  	"heading" varchar,
  	"more_text" varchar,
  	"page_size" numeric DEFAULT 8,
  	"_hidden" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  ALTER TABLE "page_blocks_logo_strip" ADD COLUMN "arrangement" "enum_page_blocks_logo_strip_arrangement" DEFAULT 'rotate';
  ALTER TABLE "page_blocks_logo_strip" ADD COLUMN "anchor" varchar;
  ALTER TABLE "page_blocks_icon_list_items" ADD COLUMN "accent_title" jsonb;
  ALTER TABLE "page_blocks_icon_list" ADD COLUMN "layout" "enum_page_blocks_icon_list_layout" DEFAULT 'list';
  ALTER TABLE "page_blocks_icon_list" ADD COLUMN "intro" jsonb;
  ALTER TABLE "page_blocks_icon_list" ADD COLUMN "image_id" integer;
  ALTER TABLE "page_blocks_media_text" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "page_blocks_media_text" ADD COLUMN "image_style" "enum_page_blocks_media_text_image_style" DEFAULT 'framed';
  ALTER TABLE "page_blocks_media_text" ADD COLUMN "anchor" varchar;
  ALTER TABLE "page_blocks_rev_slider" ADD COLUMN "note" varchar;
  ALTER TABLE "page_blocks_rev_slider" ADD COLUMN "limit" numeric;
  ALTER TABLE "page_blocks_rev_slider" ADD COLUMN "heading_level" "enum_page_blocks_rev_slider_heading_level" DEFAULT 'h3';
  ALTER TABLE "page_blocks_cond_grid" ADD COLUMN "list_heading_level" "enum_page_blocks_cond_grid_list_heading_level" DEFAULT 'h3';
  ALTER TABLE "page_blocks_cond_grid" ADD COLUMN "title_level" "enum_page_blocks_cond_grid_title_level" DEFAULT 'h5';
  ALTER TABLE "page_blocks_cond_grid" ADD COLUMN "show_more_text" varchar;
  ALTER TABLE "page_blocks_cond_grid" ADD COLUMN "show_less_text" varchar;
  ALTER TABLE "page_blocks_cond_grid" ADD COLUMN "video_url" varchar;
  ALTER TABLE "page_blocks_cond_grid" ADD COLUMN "video_position" "enum_page_blocks_cond_grid_video_position" DEFAULT 'afterText';
  ALTER TABLE "page_blocks_cond_grid" ADD COLUMN "video_heading" varchar;
  ALTER TABLE "page_blocks_cond_grid" ADD COLUMN "video_cover_id" integer;
  ALTER TABLE "page_blocks_treat_cards" ADD COLUMN "heading_align" "enum_page_blocks_treat_cards_heading_align" DEFAULT 'left';
  ALTER TABLE "page_blocks_treat_cards" ADD COLUMN "text" jsonb;
  ALTER TABLE "page" ADD COLUMN "template" "enum_page_template" DEFAULT 'default';
  ALTER TABLE "page_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "_page_v_blocks_logo_strip" ADD COLUMN "arrangement" "enum__page_v_blocks_logo_strip_arrangement" DEFAULT 'rotate';
  ALTER TABLE "_page_v_blocks_logo_strip" ADD COLUMN "anchor" varchar;
  ALTER TABLE "_page_v_blocks_icon_list_items" ADD COLUMN "accent_title" jsonb;
  ALTER TABLE "_page_v_blocks_icon_list" ADD COLUMN "layout" "enum__page_v_blocks_icon_list_layout" DEFAULT 'list';
  ALTER TABLE "_page_v_blocks_icon_list" ADD COLUMN "intro" jsonb;
  ALTER TABLE "_page_v_blocks_icon_list" ADD COLUMN "image_id" integer;
  ALTER TABLE "_page_v_blocks_media_text" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_page_v_blocks_media_text" ADD COLUMN "image_style" "enum__page_v_blocks_media_text_image_style" DEFAULT 'framed';
  ALTER TABLE "_page_v_blocks_media_text" ADD COLUMN "anchor" varchar;
  ALTER TABLE "_page_v_blocks_rev_slider" ADD COLUMN "note" varchar;
  ALTER TABLE "_page_v_blocks_rev_slider" ADD COLUMN "limit" numeric;
  ALTER TABLE "_page_v_blocks_rev_slider" ADD COLUMN "heading_level" "enum__page_v_blocks_rev_slider_heading_level" DEFAULT 'h3';
  ALTER TABLE "_page_v_blocks_cond_grid" ADD COLUMN "list_heading_level" "enum__page_v_blocks_cond_grid_list_heading_level" DEFAULT 'h3';
  ALTER TABLE "_page_v_blocks_cond_grid" ADD COLUMN "title_level" "enum__page_v_blocks_cond_grid_title_level" DEFAULT 'h5';
  ALTER TABLE "_page_v_blocks_cond_grid" ADD COLUMN "show_more_text" varchar;
  ALTER TABLE "_page_v_blocks_cond_grid" ADD COLUMN "show_less_text" varchar;
  ALTER TABLE "_page_v_blocks_cond_grid" ADD COLUMN "video_url" varchar;
  ALTER TABLE "_page_v_blocks_cond_grid" ADD COLUMN "video_position" "enum__page_v_blocks_cond_grid_video_position" DEFAULT 'afterText';
  ALTER TABLE "_page_v_blocks_cond_grid" ADD COLUMN "video_heading" varchar;
  ALTER TABLE "_page_v_blocks_cond_grid" ADD COLUMN "video_cover_id" integer;
  ALTER TABLE "_page_v_blocks_treat_cards" ADD COLUMN "heading_align" "enum__page_v_blocks_treat_cards_heading_align" DEFAULT 'left';
  ALTER TABLE "_page_v_blocks_treat_cards" ADD COLUMN "text" jsonb;
  ALTER TABLE "_page_v" ADD COLUMN "version_template" "enum__page_v_version_template" DEFAULT 'default';
  ALTER TABLE "_page_v_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "states_blocks_logo_strip" ADD COLUMN "arrangement" "enum_states_blocks_logo_strip_arrangement" DEFAULT 'rotate';
  ALTER TABLE "states_blocks_logo_strip" ADD COLUMN "anchor" varchar;
  ALTER TABLE "states_blocks_icon_list_items" ADD COLUMN "accent_title" jsonb;
  ALTER TABLE "states_blocks_icon_list" ADD COLUMN "layout" "enum_states_blocks_icon_list_layout" DEFAULT 'list';
  ALTER TABLE "states_blocks_icon_list" ADD COLUMN "intro" jsonb;
  ALTER TABLE "states_blocks_icon_list" ADD COLUMN "image_id" integer;
  ALTER TABLE "states_blocks_media_text" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "states_blocks_media_text" ADD COLUMN "image_style" "enum_states_blocks_media_text_image_style" DEFAULT 'framed';
  ALTER TABLE "states_blocks_media_text" ADD COLUMN "anchor" varchar;
  ALTER TABLE "states_blocks_rev_slider" ADD COLUMN "note" varchar;
  ALTER TABLE "states_blocks_rev_slider" ADD COLUMN "limit" numeric;
  ALTER TABLE "states_blocks_rev_slider" ADD COLUMN "heading_level" "enum_states_blocks_rev_slider_heading_level" DEFAULT 'h3';
  ALTER TABLE "states_blocks_cond_grid" ADD COLUMN "list_heading_level" "enum_states_blocks_cond_grid_list_heading_level" DEFAULT 'h3';
  ALTER TABLE "states_blocks_cond_grid" ADD COLUMN "title_level" "enum_states_blocks_cond_grid_title_level" DEFAULT 'h5';
  ALTER TABLE "states_blocks_cond_grid" ADD COLUMN "show_more_text" varchar;
  ALTER TABLE "states_blocks_cond_grid" ADD COLUMN "show_less_text" varchar;
  ALTER TABLE "states_blocks_cond_grid" ADD COLUMN "video_url" varchar;
  ALTER TABLE "states_blocks_cond_grid" ADD COLUMN "video_position" "enum_states_blocks_cond_grid_video_position" DEFAULT 'afterText';
  ALTER TABLE "states_blocks_cond_grid" ADD COLUMN "video_heading" varchar;
  ALTER TABLE "states_blocks_cond_grid" ADD COLUMN "video_cover_id" integer;
  ALTER TABLE "states_blocks_treat_cards" ADD COLUMN "heading_align" "enum_states_blocks_treat_cards_heading_align" DEFAULT 'left';
  ALTER TABLE "states_blocks_treat_cards" ADD COLUMN "text" jsonb;
  ALTER TABLE "states" ADD COLUMN "hero_button_text" varchar;
  ALTER TABLE "states" ADD COLUMN "hero_button_link_kind" "enum_states_hero_button_link_kind" DEFAULT 'internal';
  ALTER TABLE "states" ADD COLUMN "hero_button_link_new_tab" boolean;
  ALTER TABLE "states" ADD COLUMN "hero_button_link_path" varchar;
  ALTER TABLE "states" ADD COLUMN "hero_button_link_url" varchar;
  ALTER TABLE "states" ADD COLUMN "hero_mobile_image_id" integer;
  ALTER TABLE "states_locales" ADD COLUMN "name" varchar;
  ALTER TABLE "states_locales" ADD COLUMN "hero_tagline" jsonb;
  ALTER TABLE "states_locales" ADD COLUMN "hero_badge_id" integer;
  ALTER TABLE "states_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "_states_v_blocks_logo_strip" ADD COLUMN "arrangement" "enum__states_v_blocks_logo_strip_arrangement" DEFAULT 'rotate';
  ALTER TABLE "_states_v_blocks_logo_strip" ADD COLUMN "anchor" varchar;
  ALTER TABLE "_states_v_blocks_icon_list_items" ADD COLUMN "accent_title" jsonb;
  ALTER TABLE "_states_v_blocks_icon_list" ADD COLUMN "layout" "enum__states_v_blocks_icon_list_layout" DEFAULT 'list';
  ALTER TABLE "_states_v_blocks_icon_list" ADD COLUMN "intro" jsonb;
  ALTER TABLE "_states_v_blocks_icon_list" ADD COLUMN "image_id" integer;
  ALTER TABLE "_states_v_blocks_media_text" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_states_v_blocks_media_text" ADD COLUMN "image_style" "enum__states_v_blocks_media_text_image_style" DEFAULT 'framed';
  ALTER TABLE "_states_v_blocks_media_text" ADD COLUMN "anchor" varchar;
  ALTER TABLE "_states_v_blocks_rev_slider" ADD COLUMN "note" varchar;
  ALTER TABLE "_states_v_blocks_rev_slider" ADD COLUMN "limit" numeric;
  ALTER TABLE "_states_v_blocks_rev_slider" ADD COLUMN "heading_level" "enum__states_v_blocks_rev_slider_heading_level" DEFAULT 'h3';
  ALTER TABLE "_states_v_blocks_cond_grid" ADD COLUMN "list_heading_level" "enum__states_v_blocks_cond_grid_list_heading_level" DEFAULT 'h3';
  ALTER TABLE "_states_v_blocks_cond_grid" ADD COLUMN "title_level" "enum__states_v_blocks_cond_grid_title_level" DEFAULT 'h5';
  ALTER TABLE "_states_v_blocks_cond_grid" ADD COLUMN "show_more_text" varchar;
  ALTER TABLE "_states_v_blocks_cond_grid" ADD COLUMN "show_less_text" varchar;
  ALTER TABLE "_states_v_blocks_cond_grid" ADD COLUMN "video_url" varchar;
  ALTER TABLE "_states_v_blocks_cond_grid" ADD COLUMN "video_position" "enum__states_v_blocks_cond_grid_video_position" DEFAULT 'afterText';
  ALTER TABLE "_states_v_blocks_cond_grid" ADD COLUMN "video_heading" varchar;
  ALTER TABLE "_states_v_blocks_cond_grid" ADD COLUMN "video_cover_id" integer;
  ALTER TABLE "_states_v_blocks_treat_cards" ADD COLUMN "heading_align" "enum__states_v_blocks_treat_cards_heading_align" DEFAULT 'left';
  ALTER TABLE "_states_v_blocks_treat_cards" ADD COLUMN "text" jsonb;
  ALTER TABLE "_states_v" ADD COLUMN "version_hero_button_text" varchar;
  ALTER TABLE "_states_v" ADD COLUMN "version_hero_button_link_kind" "enum__states_v_version_hero_button_link_kind" DEFAULT 'internal';
  ALTER TABLE "_states_v" ADD COLUMN "version_hero_button_link_new_tab" boolean;
  ALTER TABLE "_states_v" ADD COLUMN "version_hero_button_link_path" varchar;
  ALTER TABLE "_states_v" ADD COLUMN "version_hero_button_link_url" varchar;
  ALTER TABLE "_states_v" ADD COLUMN "version_hero_mobile_image_id" integer;
  ALTER TABLE "_states_v_locales" ADD COLUMN "version_name" varchar;
  ALTER TABLE "_states_v_locales" ADD COLUMN "version_hero_tagline" jsonb;
  ALTER TABLE "_states_v_locales" ADD COLUMN "version_hero_badge_id" integer;
  ALTER TABLE "_states_v_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "clinics_blocks_logo_strip" ADD COLUMN "arrangement" "enum_clinics_blocks_logo_strip_arrangement" DEFAULT 'rotate';
  ALTER TABLE "clinics_blocks_logo_strip" ADD COLUMN "anchor" varchar;
  ALTER TABLE "clinics_blocks_icon_list_items" ADD COLUMN "accent_title" jsonb;
  ALTER TABLE "clinics_blocks_icon_list" ADD COLUMN "layout" "enum_clinics_blocks_icon_list_layout" DEFAULT 'list';
  ALTER TABLE "clinics_blocks_icon_list" ADD COLUMN "intro" jsonb;
  ALTER TABLE "clinics_blocks_icon_list" ADD COLUMN "image_id" integer;
  ALTER TABLE "clinics_blocks_media_text" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "clinics_blocks_media_text" ADD COLUMN "image_style" "enum_clinics_blocks_media_text_image_style" DEFAULT 'framed';
  ALTER TABLE "clinics_blocks_media_text" ADD COLUMN "anchor" varchar;
  ALTER TABLE "clinics_blocks_rev_slider" ADD COLUMN "note" varchar;
  ALTER TABLE "clinics_blocks_rev_slider" ADD COLUMN "limit" numeric;
  ALTER TABLE "clinics_blocks_rev_slider" ADD COLUMN "heading_level" "enum_clinics_blocks_rev_slider_heading_level" DEFAULT 'h3';
  ALTER TABLE "clinics_blocks_cond_grid" ADD COLUMN "list_heading_level" "enum_clinics_blocks_cond_grid_list_heading_level" DEFAULT 'h3';
  ALTER TABLE "clinics_blocks_cond_grid" ADD COLUMN "title_level" "enum_clinics_blocks_cond_grid_title_level" DEFAULT 'h5';
  ALTER TABLE "clinics_blocks_cond_grid" ADD COLUMN "show_more_text" varchar;
  ALTER TABLE "clinics_blocks_cond_grid" ADD COLUMN "show_less_text" varchar;
  ALTER TABLE "clinics_blocks_cond_grid" ADD COLUMN "video_url" varchar;
  ALTER TABLE "clinics_blocks_cond_grid" ADD COLUMN "video_position" "enum_clinics_blocks_cond_grid_video_position" DEFAULT 'afterText';
  ALTER TABLE "clinics_blocks_cond_grid" ADD COLUMN "video_heading" varchar;
  ALTER TABLE "clinics_blocks_cond_grid" ADD COLUMN "video_cover_id" integer;
  ALTER TABLE "clinics_blocks_treat_cards" ADD COLUMN "heading_align" "enum_clinics_blocks_treat_cards_heading_align" DEFAULT 'left';
  ALTER TABLE "clinics_blocks_treat_cards" ADD COLUMN "text" jsonb;
  ALTER TABLE "clinics_locales" ADD COLUMN "hero_crumb" varchar;
  ALTER TABLE "clinics_locales" ADD COLUMN "hero_button_text" varchar;
  ALTER TABLE "clinics_locales" ADD COLUMN "hero_button_link_kind" "enum_clinics_hero_button_link_kind" DEFAULT 'internal';
  ALTER TABLE "clinics_locales" ADD COLUMN "hero_button_link_new_tab" boolean;
  ALTER TABLE "clinics_locales" ADD COLUMN "hero_button_link_path" varchar;
  ALTER TABLE "clinics_locales" ADD COLUMN "hero_button_link_url" varchar;
  ALTER TABLE "clinics_locales" ADD COLUMN "hero_phone_label" varchar;
  ALTER TABLE "clinics_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "_clinics_v_blocks_logo_strip" ADD COLUMN "arrangement" "enum__clinics_v_blocks_logo_strip_arrangement" DEFAULT 'rotate';
  ALTER TABLE "_clinics_v_blocks_logo_strip" ADD COLUMN "anchor" varchar;
  ALTER TABLE "_clinics_v_blocks_icon_list_items" ADD COLUMN "accent_title" jsonb;
  ALTER TABLE "_clinics_v_blocks_icon_list" ADD COLUMN "layout" "enum__clinics_v_blocks_icon_list_layout" DEFAULT 'list';
  ALTER TABLE "_clinics_v_blocks_icon_list" ADD COLUMN "intro" jsonb;
  ALTER TABLE "_clinics_v_blocks_icon_list" ADD COLUMN "image_id" integer;
  ALTER TABLE "_clinics_v_blocks_media_text" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_clinics_v_blocks_media_text" ADD COLUMN "image_style" "enum__clinics_v_blocks_media_text_image_style" DEFAULT 'framed';
  ALTER TABLE "_clinics_v_blocks_media_text" ADD COLUMN "anchor" varchar;
  ALTER TABLE "_clinics_v_blocks_rev_slider" ADD COLUMN "note" varchar;
  ALTER TABLE "_clinics_v_blocks_rev_slider" ADD COLUMN "limit" numeric;
  ALTER TABLE "_clinics_v_blocks_rev_slider" ADD COLUMN "heading_level" "enum__clinics_v_blocks_rev_slider_heading_level" DEFAULT 'h3';
  ALTER TABLE "_clinics_v_blocks_cond_grid" ADD COLUMN "list_heading_level" "enum__clinics_v_blocks_cond_grid_list_heading_level" DEFAULT 'h3';
  ALTER TABLE "_clinics_v_blocks_cond_grid" ADD COLUMN "title_level" "enum__clinics_v_blocks_cond_grid_title_level" DEFAULT 'h5';
  ALTER TABLE "_clinics_v_blocks_cond_grid" ADD COLUMN "show_more_text" varchar;
  ALTER TABLE "_clinics_v_blocks_cond_grid" ADD COLUMN "show_less_text" varchar;
  ALTER TABLE "_clinics_v_blocks_cond_grid" ADD COLUMN "video_url" varchar;
  ALTER TABLE "_clinics_v_blocks_cond_grid" ADD COLUMN "video_position" "enum__clinics_v_blocks_cond_grid_video_position" DEFAULT 'afterText';
  ALTER TABLE "_clinics_v_blocks_cond_grid" ADD COLUMN "video_heading" varchar;
  ALTER TABLE "_clinics_v_blocks_cond_grid" ADD COLUMN "video_cover_id" integer;
  ALTER TABLE "_clinics_v_blocks_treat_cards" ADD COLUMN "heading_align" "enum__clinics_v_blocks_treat_cards_heading_align" DEFAULT 'left';
  ALTER TABLE "_clinics_v_blocks_treat_cards" ADD COLUMN "text" jsonb;
  ALTER TABLE "_clinics_v_locales" ADD COLUMN "version_hero_crumb" varchar;
  ALTER TABLE "_clinics_v_locales" ADD COLUMN "version_hero_button_text" varchar;
  ALTER TABLE "_clinics_v_locales" ADD COLUMN "version_hero_button_link_kind" "enum__clinics_v_version_hero_button_link_kind" DEFAULT 'internal';
  ALTER TABLE "_clinics_v_locales" ADD COLUMN "version_hero_button_link_new_tab" boolean;
  ALTER TABLE "_clinics_v_locales" ADD COLUMN "version_hero_button_link_path" varchar;
  ALTER TABLE "_clinics_v_locales" ADD COLUMN "version_hero_button_link_url" varchar;
  ALTER TABLE "_clinics_v_locales" ADD COLUMN "version_hero_phone_label" varchar;
  ALTER TABLE "_clinics_v_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "doctors_blocks_logo_strip" ADD COLUMN "arrangement" "enum_doctors_blocks_logo_strip_arrangement" DEFAULT 'rotate';
  ALTER TABLE "doctors_blocks_logo_strip" ADD COLUMN "anchor" varchar;
  ALTER TABLE "doctors_blocks_icon_list_items" ADD COLUMN "accent_title" jsonb;
  ALTER TABLE "doctors_blocks_icon_list" ADD COLUMN "layout" "enum_doctors_blocks_icon_list_layout" DEFAULT 'list';
  ALTER TABLE "doctors_blocks_icon_list" ADD COLUMN "intro" jsonb;
  ALTER TABLE "doctors_blocks_icon_list" ADD COLUMN "image_id" integer;
  ALTER TABLE "doctors_blocks_media_text" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "doctors_blocks_media_text" ADD COLUMN "image_style" "enum_doctors_blocks_media_text_image_style" DEFAULT 'framed';
  ALTER TABLE "doctors_blocks_media_text" ADD COLUMN "anchor" varchar;
  ALTER TABLE "doctors_blocks_rev_slider" ADD COLUMN "note" varchar;
  ALTER TABLE "doctors_blocks_rev_slider" ADD COLUMN "limit" numeric;
  ALTER TABLE "doctors_blocks_rev_slider" ADD COLUMN "heading_level" "enum_doctors_blocks_rev_slider_heading_level" DEFAULT 'h3';
  ALTER TABLE "doctors_blocks_cond_grid" ADD COLUMN "list_heading_level" "enum_doctors_blocks_cond_grid_list_heading_level" DEFAULT 'h3';
  ALTER TABLE "doctors_blocks_cond_grid" ADD COLUMN "title_level" "enum_doctors_blocks_cond_grid_title_level" DEFAULT 'h5';
  ALTER TABLE "doctors_blocks_cond_grid" ADD COLUMN "show_more_text" varchar;
  ALTER TABLE "doctors_blocks_cond_grid" ADD COLUMN "show_less_text" varchar;
  ALTER TABLE "doctors_blocks_cond_grid" ADD COLUMN "video_url" varchar;
  ALTER TABLE "doctors_blocks_cond_grid" ADD COLUMN "video_position" "enum_doctors_blocks_cond_grid_video_position" DEFAULT 'afterText';
  ALTER TABLE "doctors_blocks_cond_grid" ADD COLUMN "video_heading" varchar;
  ALTER TABLE "doctors_blocks_cond_grid" ADD COLUMN "video_cover_id" integer;
  ALTER TABLE "doctors_blocks_treat_cards" ADD COLUMN "heading_align" "enum_doctors_blocks_treat_cards_heading_align" DEFAULT 'left';
  ALTER TABLE "doctors_blocks_treat_cards" ADD COLUMN "text" jsonb;
  ALTER TABLE "doctors_locales" ADD COLUMN "name" varchar;
  ALTER TABLE "doctors_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "_doctors_v_blocks_logo_strip" ADD COLUMN "arrangement" "enum__doctors_v_blocks_logo_strip_arrangement" DEFAULT 'rotate';
  ALTER TABLE "_doctors_v_blocks_logo_strip" ADD COLUMN "anchor" varchar;
  ALTER TABLE "_doctors_v_blocks_icon_list_items" ADD COLUMN "accent_title" jsonb;
  ALTER TABLE "_doctors_v_blocks_icon_list" ADD COLUMN "layout" "enum__doctors_v_blocks_icon_list_layout" DEFAULT 'list';
  ALTER TABLE "_doctors_v_blocks_icon_list" ADD COLUMN "intro" jsonb;
  ALTER TABLE "_doctors_v_blocks_icon_list" ADD COLUMN "image_id" integer;
  ALTER TABLE "_doctors_v_blocks_media_text" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_doctors_v_blocks_media_text" ADD COLUMN "image_style" "enum__doctors_v_blocks_media_text_image_style" DEFAULT 'framed';
  ALTER TABLE "_doctors_v_blocks_media_text" ADD COLUMN "anchor" varchar;
  ALTER TABLE "_doctors_v_blocks_rev_slider" ADD COLUMN "note" varchar;
  ALTER TABLE "_doctors_v_blocks_rev_slider" ADD COLUMN "limit" numeric;
  ALTER TABLE "_doctors_v_blocks_rev_slider" ADD COLUMN "heading_level" "enum__doctors_v_blocks_rev_slider_heading_level" DEFAULT 'h3';
  ALTER TABLE "_doctors_v_blocks_cond_grid" ADD COLUMN "list_heading_level" "enum__doctors_v_blocks_cond_grid_list_heading_level" DEFAULT 'h3';
  ALTER TABLE "_doctors_v_blocks_cond_grid" ADD COLUMN "title_level" "enum__doctors_v_blocks_cond_grid_title_level" DEFAULT 'h5';
  ALTER TABLE "_doctors_v_blocks_cond_grid" ADD COLUMN "show_more_text" varchar;
  ALTER TABLE "_doctors_v_blocks_cond_grid" ADD COLUMN "show_less_text" varchar;
  ALTER TABLE "_doctors_v_blocks_cond_grid" ADD COLUMN "video_url" varchar;
  ALTER TABLE "_doctors_v_blocks_cond_grid" ADD COLUMN "video_position" "enum__doctors_v_blocks_cond_grid_video_position" DEFAULT 'afterText';
  ALTER TABLE "_doctors_v_blocks_cond_grid" ADD COLUMN "video_heading" varchar;
  ALTER TABLE "_doctors_v_blocks_cond_grid" ADD COLUMN "video_cover_id" integer;
  ALTER TABLE "_doctors_v_blocks_treat_cards" ADD COLUMN "heading_align" "enum__doctors_v_blocks_treat_cards_heading_align" DEFAULT 'left';
  ALTER TABLE "_doctors_v_blocks_treat_cards" ADD COLUMN "text" jsonb;
  ALTER TABLE "_doctors_v_locales" ADD COLUMN "version_name" varchar;
  ALTER TABLE "_doctors_v_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "treatments_blocks_logo_strip" ADD COLUMN "arrangement" "enum_treatments_blocks_logo_strip_arrangement" DEFAULT 'rotate';
  ALTER TABLE "treatments_blocks_logo_strip" ADD COLUMN "anchor" varchar;
  ALTER TABLE "treatments_blocks_icon_list_items" ADD COLUMN "accent_title" jsonb;
  ALTER TABLE "treatments_blocks_icon_list" ADD COLUMN "layout" "enum_treatments_blocks_icon_list_layout" DEFAULT 'list';
  ALTER TABLE "treatments_blocks_icon_list" ADD COLUMN "intro" jsonb;
  ALTER TABLE "treatments_blocks_icon_list" ADD COLUMN "image_id" integer;
  ALTER TABLE "treatments_blocks_media_text" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "treatments_blocks_media_text" ADD COLUMN "image_style" "enum_treatments_blocks_media_text_image_style" DEFAULT 'framed';
  ALTER TABLE "treatments_blocks_media_text" ADD COLUMN "anchor" varchar;
  ALTER TABLE "treatments_blocks_rev_slider" ADD COLUMN "note" varchar;
  ALTER TABLE "treatments_blocks_rev_slider" ADD COLUMN "limit" numeric;
  ALTER TABLE "treatments_blocks_rev_slider" ADD COLUMN "heading_level" "enum_treatments_blocks_rev_slider_heading_level" DEFAULT 'h3';
  ALTER TABLE "treatments_blocks_cond_grid" ADD COLUMN "list_heading_level" "enum_treatments_blocks_cond_grid_list_heading_level" DEFAULT 'h3';
  ALTER TABLE "treatments_blocks_cond_grid" ADD COLUMN "title_level" "enum_treatments_blocks_cond_grid_title_level" DEFAULT 'h5';
  ALTER TABLE "treatments_blocks_cond_grid" ADD COLUMN "show_more_text" varchar;
  ALTER TABLE "treatments_blocks_cond_grid" ADD COLUMN "show_less_text" varchar;
  ALTER TABLE "treatments_blocks_cond_grid" ADD COLUMN "video_url" varchar;
  ALTER TABLE "treatments_blocks_cond_grid" ADD COLUMN "video_position" "enum_treatments_blocks_cond_grid_video_position" DEFAULT 'afterText';
  ALTER TABLE "treatments_blocks_cond_grid" ADD COLUMN "video_heading" varchar;
  ALTER TABLE "treatments_blocks_cond_grid" ADD COLUMN "video_cover_id" integer;
  ALTER TABLE "treatments_blocks_treat_cards" ADD COLUMN "heading_align" "enum_treatments_blocks_treat_cards_heading_align" DEFAULT 'left';
  ALTER TABLE "treatments_blocks_treat_cards" ADD COLUMN "text" jsonb;
  ALTER TABLE "treatments_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "_treatments_v_blocks_logo_strip" ADD COLUMN "arrangement" "enum__treatments_v_blocks_logo_strip_arrangement" DEFAULT 'rotate';
  ALTER TABLE "_treatments_v_blocks_logo_strip" ADD COLUMN "anchor" varchar;
  ALTER TABLE "_treatments_v_blocks_icon_list_items" ADD COLUMN "accent_title" jsonb;
  ALTER TABLE "_treatments_v_blocks_icon_list" ADD COLUMN "layout" "enum__treatments_v_blocks_icon_list_layout" DEFAULT 'list';
  ALTER TABLE "_treatments_v_blocks_icon_list" ADD COLUMN "intro" jsonb;
  ALTER TABLE "_treatments_v_blocks_icon_list" ADD COLUMN "image_id" integer;
  ALTER TABLE "_treatments_v_blocks_media_text" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_treatments_v_blocks_media_text" ADD COLUMN "image_style" "enum__treatments_v_blocks_media_text_image_style" DEFAULT 'framed';
  ALTER TABLE "_treatments_v_blocks_media_text" ADD COLUMN "anchor" varchar;
  ALTER TABLE "_treatments_v_blocks_rev_slider" ADD COLUMN "note" varchar;
  ALTER TABLE "_treatments_v_blocks_rev_slider" ADD COLUMN "limit" numeric;
  ALTER TABLE "_treatments_v_blocks_rev_slider" ADD COLUMN "heading_level" "enum__treatments_v_blocks_rev_slider_heading_level" DEFAULT 'h3';
  ALTER TABLE "_treatments_v_blocks_cond_grid" ADD COLUMN "list_heading_level" "enum__treatments_v_blocks_cond_grid_list_heading_level" DEFAULT 'h3';
  ALTER TABLE "_treatments_v_blocks_cond_grid" ADD COLUMN "title_level" "enum__treatments_v_blocks_cond_grid_title_level" DEFAULT 'h5';
  ALTER TABLE "_treatments_v_blocks_cond_grid" ADD COLUMN "show_more_text" varchar;
  ALTER TABLE "_treatments_v_blocks_cond_grid" ADD COLUMN "show_less_text" varchar;
  ALTER TABLE "_treatments_v_blocks_cond_grid" ADD COLUMN "video_url" varchar;
  ALTER TABLE "_treatments_v_blocks_cond_grid" ADD COLUMN "video_position" "enum__treatments_v_blocks_cond_grid_video_position" DEFAULT 'afterText';
  ALTER TABLE "_treatments_v_blocks_cond_grid" ADD COLUMN "video_heading" varchar;
  ALTER TABLE "_treatments_v_blocks_cond_grid" ADD COLUMN "video_cover_id" integer;
  ALTER TABLE "_treatments_v_blocks_treat_cards" ADD COLUMN "heading_align" "enum__treatments_v_blocks_treat_cards_heading_align" DEFAULT 'left';
  ALTER TABLE "_treatments_v_blocks_treat_cards" ADD COLUMN "text" jsonb;
  ALTER TABLE "_treatments_v_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "conditions_blocks_logo_strip" ADD COLUMN "arrangement" "enum_conditions_blocks_logo_strip_arrangement" DEFAULT 'rotate';
  ALTER TABLE "conditions_blocks_logo_strip" ADD COLUMN "anchor" varchar;
  ALTER TABLE "conditions_blocks_icon_list_items" ADD COLUMN "accent_title" jsonb;
  ALTER TABLE "conditions_blocks_icon_list" ADD COLUMN "layout" "enum_conditions_blocks_icon_list_layout" DEFAULT 'list';
  ALTER TABLE "conditions_blocks_icon_list" ADD COLUMN "intro" jsonb;
  ALTER TABLE "conditions_blocks_icon_list" ADD COLUMN "image_id" integer;
  ALTER TABLE "conditions_blocks_media_text" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "conditions_blocks_media_text" ADD COLUMN "image_style" "enum_conditions_blocks_media_text_image_style" DEFAULT 'framed';
  ALTER TABLE "conditions_blocks_media_text" ADD COLUMN "anchor" varchar;
  ALTER TABLE "conditions_blocks_rev_slider" ADD COLUMN "note" varchar;
  ALTER TABLE "conditions_blocks_rev_slider" ADD COLUMN "limit" numeric;
  ALTER TABLE "conditions_blocks_rev_slider" ADD COLUMN "heading_level" "enum_conditions_blocks_rev_slider_heading_level" DEFAULT 'h3';
  ALTER TABLE "conditions_blocks_cond_grid" ADD COLUMN "list_heading_level" "enum_conditions_blocks_cond_grid_list_heading_level" DEFAULT 'h3';
  ALTER TABLE "conditions_blocks_cond_grid" ADD COLUMN "title_level" "enum_conditions_blocks_cond_grid_title_level" DEFAULT 'h5';
  ALTER TABLE "conditions_blocks_cond_grid" ADD COLUMN "show_more_text" varchar;
  ALTER TABLE "conditions_blocks_cond_grid" ADD COLUMN "show_less_text" varchar;
  ALTER TABLE "conditions_blocks_cond_grid" ADD COLUMN "video_url" varchar;
  ALTER TABLE "conditions_blocks_cond_grid" ADD COLUMN "video_position" "enum_conditions_blocks_cond_grid_video_position" DEFAULT 'afterText';
  ALTER TABLE "conditions_blocks_cond_grid" ADD COLUMN "video_heading" varchar;
  ALTER TABLE "conditions_blocks_cond_grid" ADD COLUMN "video_cover_id" integer;
  ALTER TABLE "conditions_blocks_treat_cards" ADD COLUMN "heading_align" "enum_conditions_blocks_treat_cards_heading_align" DEFAULT 'left';
  ALTER TABLE "conditions_blocks_treat_cards" ADD COLUMN "text" jsonb;
  ALTER TABLE "conditions" ADD COLUMN "hero_mobile_image_id" integer;
  ALTER TABLE "conditions_locales" ADD COLUMN "nav_heading" varchar;
  ALTER TABLE "conditions_locales" ADD COLUMN "nav_heading_end" varchar;
  ALTER TABLE "conditions_locales" ADD COLUMN "menu_heading" varchar;
  ALTER TABLE "conditions_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "_conditions_v_blocks_logo_strip" ADD COLUMN "arrangement" "enum__conditions_v_blocks_logo_strip_arrangement" DEFAULT 'rotate';
  ALTER TABLE "_conditions_v_blocks_logo_strip" ADD COLUMN "anchor" varchar;
  ALTER TABLE "_conditions_v_blocks_icon_list_items" ADD COLUMN "accent_title" jsonb;
  ALTER TABLE "_conditions_v_blocks_icon_list" ADD COLUMN "layout" "enum__conditions_v_blocks_icon_list_layout" DEFAULT 'list';
  ALTER TABLE "_conditions_v_blocks_icon_list" ADD COLUMN "intro" jsonb;
  ALTER TABLE "_conditions_v_blocks_icon_list" ADD COLUMN "image_id" integer;
  ALTER TABLE "_conditions_v_blocks_media_text" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "_conditions_v_blocks_media_text" ADD COLUMN "image_style" "enum__conditions_v_blocks_media_text_image_style" DEFAULT 'framed';
  ALTER TABLE "_conditions_v_blocks_media_text" ADD COLUMN "anchor" varchar;
  ALTER TABLE "_conditions_v_blocks_rev_slider" ADD COLUMN "note" varchar;
  ALTER TABLE "_conditions_v_blocks_rev_slider" ADD COLUMN "limit" numeric;
  ALTER TABLE "_conditions_v_blocks_rev_slider" ADD COLUMN "heading_level" "enum__conditions_v_blocks_rev_slider_heading_level" DEFAULT 'h3';
  ALTER TABLE "_conditions_v_blocks_cond_grid" ADD COLUMN "list_heading_level" "enum__conditions_v_blocks_cond_grid_list_heading_level" DEFAULT 'h3';
  ALTER TABLE "_conditions_v_blocks_cond_grid" ADD COLUMN "title_level" "enum__conditions_v_blocks_cond_grid_title_level" DEFAULT 'h5';
  ALTER TABLE "_conditions_v_blocks_cond_grid" ADD COLUMN "show_more_text" varchar;
  ALTER TABLE "_conditions_v_blocks_cond_grid" ADD COLUMN "show_less_text" varchar;
  ALTER TABLE "_conditions_v_blocks_cond_grid" ADD COLUMN "video_url" varchar;
  ALTER TABLE "_conditions_v_blocks_cond_grid" ADD COLUMN "video_position" "enum__conditions_v_blocks_cond_grid_video_position" DEFAULT 'afterText';
  ALTER TABLE "_conditions_v_blocks_cond_grid" ADD COLUMN "video_heading" varchar;
  ALTER TABLE "_conditions_v_blocks_cond_grid" ADD COLUMN "video_cover_id" integer;
  ALTER TABLE "_conditions_v_blocks_treat_cards" ADD COLUMN "heading_align" "enum__conditions_v_blocks_treat_cards_heading_align" DEFAULT 'left';
  ALTER TABLE "_conditions_v_blocks_treat_cards" ADD COLUMN "text" jsonb;
  ALTER TABLE "_conditions_v" ADD COLUMN "version_hero_mobile_image_id" integer;
  ALTER TABLE "_conditions_v_locales" ADD COLUMN "version_nav_heading" varchar;
  ALTER TABLE "_conditions_v_locales" ADD COLUMN "version_nav_heading_end" varchar;
  ALTER TABLE "_conditions_v_locales" ADD COLUMN "version_menu_heading" varchar;
  ALTER TABLE "_conditions_v_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "posts" ADD COLUMN "updated_date" timestamp(3) with time zone;
  ALTER TABLE "posts_locales" ADD COLUMN "reading_time_override" numeric;
  ALTER TABLE "posts_rels" ADD COLUMN "states_id" integer;
  ALTER TABLE "posts_rels" ADD COLUMN "clinics_id" integer;
  ALTER TABLE "posts_rels" ADD COLUMN "doctors_id" integer;
  ALTER TABLE "posts_rels" ADD COLUMN "treatments_id" integer;
  ALTER TABLE "posts_rels" ADD COLUMN "conditions_id" integer;
  ALTER TABLE "posts_rels" ADD COLUMN "testimonials_id" integer;
  ALTER TABLE "_posts_v" ADD COLUMN "version_updated_date" timestamp(3) with time zone;
  ALTER TABLE "_posts_v_locales" ADD COLUMN "version_reading_time_override" numeric;
  ALTER TABLE "_posts_v_rels" ADD COLUMN "states_id" integer;
  ALTER TABLE "_posts_v_rels" ADD COLUMN "clinics_id" integer;
  ALTER TABLE "_posts_v_rels" ADD COLUMN "doctors_id" integer;
  ALTER TABLE "_posts_v_rels" ADD COLUMN "treatments_id" integer;
  ALTER TABLE "_posts_v_rels" ADD COLUMN "conditions_id" integer;
  ALTER TABLE "_posts_v_rels" ADD COLUMN "testimonials_id" integer;
  ALTER TABLE "testimonials" ADD COLUMN "doctor_id" integer;
  ALTER TABLE "presets_blocks_logo_strip" ADD COLUMN "arrangement" "enum_presets_blocks_logo_strip_arrangement" DEFAULT 'rotate';
  ALTER TABLE "presets_blocks_logo_strip" ADD COLUMN "anchor" varchar;
  ALTER TABLE "presets_blocks_icon_list_items" ADD COLUMN "accent_title" jsonb;
  ALTER TABLE "presets_blocks_icon_list" ADD COLUMN "layout" "enum_presets_blocks_icon_list_layout" DEFAULT 'list';
  ALTER TABLE "presets_blocks_icon_list" ADD COLUMN "intro" jsonb;
  ALTER TABLE "presets_blocks_icon_list" ADD COLUMN "image_id" integer;
  ALTER TABLE "presets_blocks_media_text" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "presets_blocks_media_text" ADD COLUMN "image_style" "enum_presets_blocks_media_text_image_style" DEFAULT 'framed';
  ALTER TABLE "presets_blocks_media_text" ADD COLUMN "anchor" varchar;
  ALTER TABLE "presets_blocks_rev_slider" ADD COLUMN "note" varchar;
  ALTER TABLE "presets_blocks_rev_slider" ADD COLUMN "limit" numeric;
  ALTER TABLE "presets_blocks_rev_slider" ADD COLUMN "heading_level" "enum_presets_blocks_rev_slider_heading_level" DEFAULT 'h3';
  ALTER TABLE "presets_blocks_cond_grid" ADD COLUMN "list_heading_level" "enum_presets_blocks_cond_grid_list_heading_level" DEFAULT 'h3';
  ALTER TABLE "presets_blocks_cond_grid" ADD COLUMN "title_level" "enum_presets_blocks_cond_grid_title_level" DEFAULT 'h5';
  ALTER TABLE "presets_blocks_cond_grid" ADD COLUMN "show_more_text" varchar;
  ALTER TABLE "presets_blocks_cond_grid" ADD COLUMN "show_less_text" varchar;
  ALTER TABLE "presets_blocks_cond_grid" ADD COLUMN "video_url" varchar;
  ALTER TABLE "presets_blocks_cond_grid" ADD COLUMN "video_position" "enum_presets_blocks_cond_grid_video_position" DEFAULT 'afterText';
  ALTER TABLE "presets_blocks_cond_grid" ADD COLUMN "video_heading" varchar;
  ALTER TABLE "presets_blocks_cond_grid" ADD COLUMN "video_cover_id" integer;
  ALTER TABLE "presets_blocks_treat_cards" ADD COLUMN "heading_align" "enum_presets_blocks_treat_cards_heading_align" DEFAULT 'left';
  ALTER TABLE "presets_blocks_treat_cards" ADD COLUMN "text" jsonb;
  ALTER TABLE "presets_rels" ADD COLUMN "categories_id" integer;
  ALTER TABLE "page_blocks_image_hero_crumbs" ADD CONSTRAINT "page_blocks_image_hero_crumbs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_image_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_image_hero" ADD CONSTRAINT "page_blocks_image_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_image_hero" ADD CONSTRAINT "page_blocks_image_hero_mobile_image_id_media_id_fk" FOREIGN KEY ("mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_image_hero" ADD CONSTRAINT "page_blocks_image_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_simple_hero" ADD CONSTRAINT "page_blocks_simple_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_blog_hero" ADD CONSTRAINT "page_blocks_blog_hero_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_blog_hero" ADD CONSTRAINT "page_blocks_blog_hero_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_blog_hero" ADD CONSTRAINT "page_blocks_blog_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_center_text_faqs" ADD CONSTRAINT "page_blocks_center_text_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_center_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_center_text" ADD CONSTRAINT "page_blocks_center_text_quote_by_id_doctors_id_fk" FOREIGN KEY ("quote_by_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_center_text" ADD CONSTRAINT "page_blocks_center_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stky_chapters" ADD CONSTRAINT "stky_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "stky_chapters" ADD CONSTRAINT "stky_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stky"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stky" ADD CONSTRAINT "stky_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_results_items_symptoms" ADD CONSTRAINT "page_blocks_results_items_symptoms_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_results_items_symptoms" ADD CONSTRAINT "page_blocks_results_items_symptoms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_results_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_results_items" ADD CONSTRAINT "page_blocks_results_items_source_logo_id_media_id_fk" FOREIGN KEY ("source_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_results_items" ADD CONSTRAINT "page_blocks_results_items_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_results_items" ADD CONSTRAINT "page_blocks_results_items_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_results_items" ADD CONSTRAINT "page_blocks_results_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_results" ADD CONSTRAINT "page_blocks_results_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_state_sites" ADD CONSTRAINT "page_blocks_state_sites_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_state_sites" ADD CONSTRAINT "page_blocks_state_sites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_state_docs" ADD CONSTRAINT "page_blocks_state_docs_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_state_docs" ADD CONSTRAINT "page_blocks_state_docs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_loc_accord_areas" ADD CONSTRAINT "page_blocks_loc_accord_areas_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_loc_accord_areas" ADD CONSTRAINT "page_blocks_loc_accord_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page_blocks_loc_accord"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_loc_accord" ADD CONSTRAINT "page_blocks_loc_accord_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_clinic_info" ADD CONSTRAINT "page_blocks_clinic_info_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_clinic_info" ADD CONSTRAINT "page_blocks_clinic_info_accredit_image_id_media_id_fk" FOREIGN KEY ("accredit_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_clinic_info" ADD CONSTRAINT "page_blocks_clinic_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_quiz_demo" ADD CONSTRAINT "page_blocks_quiz_demo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_trending" ADD CONSTRAINT "page_blocks_trending_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "page_blocks_blog_list" ADD CONSTRAINT "page_blocks_blog_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_image_hero_crumbs" ADD CONSTRAINT "_page_v_blocks_image_hero_crumbs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_image_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_image_hero" ADD CONSTRAINT "_page_v_blocks_image_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_image_hero" ADD CONSTRAINT "_page_v_blocks_image_hero_mobile_image_id_media_id_fk" FOREIGN KEY ("mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_image_hero" ADD CONSTRAINT "_page_v_blocks_image_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_simple_hero" ADD CONSTRAINT "_page_v_blocks_simple_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_blog_hero" ADD CONSTRAINT "_page_v_blocks_blog_hero_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_blog_hero" ADD CONSTRAINT "_page_v_blocks_blog_hero_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_blog_hero" ADD CONSTRAINT "_page_v_blocks_blog_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_center_text_faqs" ADD CONSTRAINT "_page_v_blocks_center_text_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_center_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_center_text" ADD CONSTRAINT "_page_v_blocks_center_text_quote_by_id_doctors_id_fk" FOREIGN KEY ("quote_by_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_center_text" ADD CONSTRAINT "_page_v_blocks_center_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stky_v_chapters" ADD CONSTRAINT "_stky_v_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_stky_v_chapters" ADD CONSTRAINT "_stky_v_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_stky_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stky_v" ADD CONSTRAINT "_stky_v_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_results_items_symptoms" ADD CONSTRAINT "_page_v_blocks_results_items_symptoms_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_results_items_symptoms" ADD CONSTRAINT "_page_v_blocks_results_items_symptoms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_results_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_results_items" ADD CONSTRAINT "_page_v_blocks_results_items_source_logo_id_media_id_fk" FOREIGN KEY ("source_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_results_items" ADD CONSTRAINT "_page_v_blocks_results_items_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_results_items" ADD CONSTRAINT "_page_v_blocks_results_items_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_results_items" ADD CONSTRAINT "_page_v_blocks_results_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_results" ADD CONSTRAINT "_page_v_blocks_results_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_state_sites" ADD CONSTRAINT "_page_v_blocks_state_sites_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_state_sites" ADD CONSTRAINT "_page_v_blocks_state_sites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_state_docs" ADD CONSTRAINT "_page_v_blocks_state_docs_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_state_docs" ADD CONSTRAINT "_page_v_blocks_state_docs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_loc_accord_areas" ADD CONSTRAINT "_page_v_blocks_loc_accord_areas_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_loc_accord_areas" ADD CONSTRAINT "_page_v_blocks_loc_accord_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v_blocks_loc_accord"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_loc_accord" ADD CONSTRAINT "_page_v_blocks_loc_accord_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_clinic_info" ADD CONSTRAINT "_page_v_blocks_clinic_info_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_clinic_info" ADD CONSTRAINT "_page_v_blocks_clinic_info_accredit_image_id_media_id_fk" FOREIGN KEY ("accredit_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_clinic_info" ADD CONSTRAINT "_page_v_blocks_clinic_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_quiz_demo" ADD CONSTRAINT "_page_v_blocks_quiz_demo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_trending" ADD CONSTRAINT "_page_v_blocks_trending_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_blog_list" ADD CONSTRAINT "_page_v_blocks_blog_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_page_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_center_text_faqs" ADD CONSTRAINT "states_blocks_center_text_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states_blocks_center_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_center_text" ADD CONSTRAINT "states_blocks_center_text_quote_by_id_doctors_id_fk" FOREIGN KEY ("quote_by_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_blocks_center_text" ADD CONSTRAINT "states_blocks_center_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_results_items_symptoms" ADD CONSTRAINT "states_blocks_results_items_symptoms_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_blocks_results_items_symptoms" ADD CONSTRAINT "states_blocks_results_items_symptoms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states_blocks_results_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_results_items" ADD CONSTRAINT "states_blocks_results_items_source_logo_id_media_id_fk" FOREIGN KEY ("source_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_blocks_results_items" ADD CONSTRAINT "states_blocks_results_items_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_blocks_results_items" ADD CONSTRAINT "states_blocks_results_items_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_blocks_results_items" ADD CONSTRAINT "states_blocks_results_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states_blocks_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_results" ADD CONSTRAINT "states_blocks_results_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_state_sites" ADD CONSTRAINT "states_blocks_state_sites_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_blocks_state_sites" ADD CONSTRAINT "states_blocks_state_sites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_state_docs" ADD CONSTRAINT "states_blocks_state_docs_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_blocks_state_docs" ADD CONSTRAINT "states_blocks_state_docs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_loc_accord_areas" ADD CONSTRAINT "states_blocks_loc_accord_areas_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_blocks_loc_accord_areas" ADD CONSTRAINT "states_blocks_loc_accord_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states_blocks_loc_accord"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_loc_accord" ADD CONSTRAINT "states_blocks_loc_accord_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_clinic_info" ADD CONSTRAINT "states_blocks_clinic_info_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_blocks_clinic_info" ADD CONSTRAINT "states_blocks_clinic_info_accredit_image_id_media_id_fk" FOREIGN KEY ("accredit_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_blocks_clinic_info" ADD CONSTRAINT "states_blocks_clinic_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_quiz_demo" ADD CONSTRAINT "states_blocks_quiz_demo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_trending" ADD CONSTRAINT "states_blocks_trending_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_blog_list" ADD CONSTRAINT "states_blocks_blog_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_center_text_faqs" ADD CONSTRAINT "_states_v_blocks_center_text_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v_blocks_center_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_center_text" ADD CONSTRAINT "_states_v_blocks_center_text_quote_by_id_doctors_id_fk" FOREIGN KEY ("quote_by_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_center_text" ADD CONSTRAINT "_states_v_blocks_center_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_results_items_symptoms" ADD CONSTRAINT "_states_v_blocks_results_items_symptoms_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_results_items_symptoms" ADD CONSTRAINT "_states_v_blocks_results_items_symptoms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v_blocks_results_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_results_items" ADD CONSTRAINT "_states_v_blocks_results_items_source_logo_id_media_id_fk" FOREIGN KEY ("source_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_results_items" ADD CONSTRAINT "_states_v_blocks_results_items_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_results_items" ADD CONSTRAINT "_states_v_blocks_results_items_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_results_items" ADD CONSTRAINT "_states_v_blocks_results_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v_blocks_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_results" ADD CONSTRAINT "_states_v_blocks_results_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_state_sites" ADD CONSTRAINT "_states_v_blocks_state_sites_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_state_sites" ADD CONSTRAINT "_states_v_blocks_state_sites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_state_docs" ADD CONSTRAINT "_states_v_blocks_state_docs_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_state_docs" ADD CONSTRAINT "_states_v_blocks_state_docs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_loc_accord_areas" ADD CONSTRAINT "_states_v_blocks_loc_accord_areas_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_loc_accord_areas" ADD CONSTRAINT "_states_v_blocks_loc_accord_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v_blocks_loc_accord"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_loc_accord" ADD CONSTRAINT "_states_v_blocks_loc_accord_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_clinic_info" ADD CONSTRAINT "_states_v_blocks_clinic_info_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_clinic_info" ADD CONSTRAINT "_states_v_blocks_clinic_info_accredit_image_id_media_id_fk" FOREIGN KEY ("accredit_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_clinic_info" ADD CONSTRAINT "_states_v_blocks_clinic_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_quiz_demo" ADD CONSTRAINT "_states_v_blocks_quiz_demo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_trending" ADD CONSTRAINT "_states_v_blocks_trending_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_blog_list" ADD CONSTRAINT "_states_v_blocks_blog_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_states_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_center_text_faqs" ADD CONSTRAINT "clinics_blocks_center_text_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics_blocks_center_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_center_text" ADD CONSTRAINT "clinics_blocks_center_text_quote_by_id_doctors_id_fk" FOREIGN KEY ("quote_by_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_blocks_center_text" ADD CONSTRAINT "clinics_blocks_center_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_results_items_symptoms" ADD CONSTRAINT "clinics_blocks_results_items_symptoms_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_blocks_results_items_symptoms" ADD CONSTRAINT "clinics_blocks_results_items_symptoms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics_blocks_results_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_results_items" ADD CONSTRAINT "clinics_blocks_results_items_source_logo_id_media_id_fk" FOREIGN KEY ("source_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_blocks_results_items" ADD CONSTRAINT "clinics_blocks_results_items_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_blocks_results_items" ADD CONSTRAINT "clinics_blocks_results_items_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_blocks_results_items" ADD CONSTRAINT "clinics_blocks_results_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics_blocks_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_results" ADD CONSTRAINT "clinics_blocks_results_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_state_sites" ADD CONSTRAINT "clinics_blocks_state_sites_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_blocks_state_sites" ADD CONSTRAINT "clinics_blocks_state_sites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_state_docs" ADD CONSTRAINT "clinics_blocks_state_docs_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_blocks_state_docs" ADD CONSTRAINT "clinics_blocks_state_docs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_loc_accord_areas" ADD CONSTRAINT "clinics_blocks_loc_accord_areas_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_blocks_loc_accord_areas" ADD CONSTRAINT "clinics_blocks_loc_accord_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics_blocks_loc_accord"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_loc_accord" ADD CONSTRAINT "clinics_blocks_loc_accord_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_clinic_info" ADD CONSTRAINT "clinics_blocks_clinic_info_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_blocks_clinic_info" ADD CONSTRAINT "clinics_blocks_clinic_info_accredit_image_id_media_id_fk" FOREIGN KEY ("accredit_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_blocks_clinic_info" ADD CONSTRAINT "clinics_blocks_clinic_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_quiz_demo" ADD CONSTRAINT "clinics_blocks_quiz_demo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_trending" ADD CONSTRAINT "clinics_blocks_trending_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_blog_list" ADD CONSTRAINT "clinics_blocks_blog_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_center_text_faqs" ADD CONSTRAINT "_clinics_v_blocks_center_text_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v_blocks_center_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_center_text" ADD CONSTRAINT "_clinics_v_blocks_center_text_quote_by_id_doctors_id_fk" FOREIGN KEY ("quote_by_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_center_text" ADD CONSTRAINT "_clinics_v_blocks_center_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_results_items_symptoms" ADD CONSTRAINT "_clinics_v_blocks_results_items_symptoms_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_results_items_symptoms" ADD CONSTRAINT "_clinics_v_blocks_results_items_symptoms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v_blocks_results_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_results_items" ADD CONSTRAINT "_clinics_v_blocks_results_items_source_logo_id_media_id_fk" FOREIGN KEY ("source_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_results_items" ADD CONSTRAINT "_clinics_v_blocks_results_items_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_results_items" ADD CONSTRAINT "_clinics_v_blocks_results_items_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_results_items" ADD CONSTRAINT "_clinics_v_blocks_results_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v_blocks_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_results" ADD CONSTRAINT "_clinics_v_blocks_results_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_state_sites" ADD CONSTRAINT "_clinics_v_blocks_state_sites_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_state_sites" ADD CONSTRAINT "_clinics_v_blocks_state_sites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_state_docs" ADD CONSTRAINT "_clinics_v_blocks_state_docs_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_state_docs" ADD CONSTRAINT "_clinics_v_blocks_state_docs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_loc_accord_areas" ADD CONSTRAINT "_clinics_v_blocks_loc_accord_areas_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_loc_accord_areas" ADD CONSTRAINT "_clinics_v_blocks_loc_accord_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v_blocks_loc_accord"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_loc_accord" ADD CONSTRAINT "_clinics_v_blocks_loc_accord_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_clinic_info" ADD CONSTRAINT "_clinics_v_blocks_clinic_info_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_clinic_info" ADD CONSTRAINT "_clinics_v_blocks_clinic_info_accredit_image_id_media_id_fk" FOREIGN KEY ("accredit_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_clinic_info" ADD CONSTRAINT "_clinics_v_blocks_clinic_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_quiz_demo" ADD CONSTRAINT "_clinics_v_blocks_quiz_demo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_trending" ADD CONSTRAINT "_clinics_v_blocks_trending_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_blog_list" ADD CONSTRAINT "_clinics_v_blocks_blog_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_clinics_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_center_text_faqs" ADD CONSTRAINT "doctors_blocks_center_text_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors_blocks_center_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_center_text" ADD CONSTRAINT "doctors_blocks_center_text_quote_by_id_doctors_id_fk" FOREIGN KEY ("quote_by_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_blocks_center_text" ADD CONSTRAINT "doctors_blocks_center_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_results_items_symptoms" ADD CONSTRAINT "doctors_blocks_results_items_symptoms_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_blocks_results_items_symptoms" ADD CONSTRAINT "doctors_blocks_results_items_symptoms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors_blocks_results_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_results_items" ADD CONSTRAINT "doctors_blocks_results_items_source_logo_id_media_id_fk" FOREIGN KEY ("source_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_blocks_results_items" ADD CONSTRAINT "doctors_blocks_results_items_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_blocks_results_items" ADD CONSTRAINT "doctors_blocks_results_items_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_blocks_results_items" ADD CONSTRAINT "doctors_blocks_results_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors_blocks_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_results" ADD CONSTRAINT "doctors_blocks_results_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_state_sites" ADD CONSTRAINT "doctors_blocks_state_sites_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_blocks_state_sites" ADD CONSTRAINT "doctors_blocks_state_sites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_state_docs" ADD CONSTRAINT "doctors_blocks_state_docs_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_blocks_state_docs" ADD CONSTRAINT "doctors_blocks_state_docs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_loc_accord_areas" ADD CONSTRAINT "doctors_blocks_loc_accord_areas_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_blocks_loc_accord_areas" ADD CONSTRAINT "doctors_blocks_loc_accord_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors_blocks_loc_accord"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_loc_accord" ADD CONSTRAINT "doctors_blocks_loc_accord_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_clinic_info" ADD CONSTRAINT "doctors_blocks_clinic_info_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_blocks_clinic_info" ADD CONSTRAINT "doctors_blocks_clinic_info_accredit_image_id_media_id_fk" FOREIGN KEY ("accredit_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_blocks_clinic_info" ADD CONSTRAINT "doctors_blocks_clinic_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_quiz_demo" ADD CONSTRAINT "doctors_blocks_quiz_demo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_trending" ADD CONSTRAINT "doctors_blocks_trending_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_blog_list" ADD CONSTRAINT "doctors_blocks_blog_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_center_text_faqs" ADD CONSTRAINT "_doctors_v_blocks_center_text_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v_blocks_center_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_center_text" ADD CONSTRAINT "_doctors_v_blocks_center_text_quote_by_id_doctors_id_fk" FOREIGN KEY ("quote_by_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_center_text" ADD CONSTRAINT "_doctors_v_blocks_center_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_results_items_symptoms" ADD CONSTRAINT "_doctors_v_blocks_results_items_symptoms_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_results_items_symptoms" ADD CONSTRAINT "_doctors_v_blocks_results_items_symptoms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v_blocks_results_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_results_items" ADD CONSTRAINT "_doctors_v_blocks_results_items_source_logo_id_media_id_fk" FOREIGN KEY ("source_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_results_items" ADD CONSTRAINT "_doctors_v_blocks_results_items_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_results_items" ADD CONSTRAINT "_doctors_v_blocks_results_items_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_results_items" ADD CONSTRAINT "_doctors_v_blocks_results_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v_blocks_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_results" ADD CONSTRAINT "_doctors_v_blocks_results_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_state_sites" ADD CONSTRAINT "_doctors_v_blocks_state_sites_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_state_sites" ADD CONSTRAINT "_doctors_v_blocks_state_sites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_state_docs" ADD CONSTRAINT "_doctors_v_blocks_state_docs_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_state_docs" ADD CONSTRAINT "_doctors_v_blocks_state_docs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_loc_accord_areas" ADD CONSTRAINT "_doctors_v_blocks_loc_accord_areas_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_loc_accord_areas" ADD CONSTRAINT "_doctors_v_blocks_loc_accord_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v_blocks_loc_accord"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_loc_accord" ADD CONSTRAINT "_doctors_v_blocks_loc_accord_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_clinic_info" ADD CONSTRAINT "_doctors_v_blocks_clinic_info_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_clinic_info" ADD CONSTRAINT "_doctors_v_blocks_clinic_info_accredit_image_id_media_id_fk" FOREIGN KEY ("accredit_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_clinic_info" ADD CONSTRAINT "_doctors_v_blocks_clinic_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_quiz_demo" ADD CONSTRAINT "_doctors_v_blocks_quiz_demo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_trending" ADD CONSTRAINT "_doctors_v_blocks_trending_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_blog_list" ADD CONSTRAINT "_doctors_v_blocks_blog_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_doctors_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_center_text_faqs" ADD CONSTRAINT "treatments_blocks_center_text_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments_blocks_center_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_center_text" ADD CONSTRAINT "treatments_blocks_center_text_quote_by_id_doctors_id_fk" FOREIGN KEY ("quote_by_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_blocks_center_text" ADD CONSTRAINT "treatments_blocks_center_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_results_items_symptoms" ADD CONSTRAINT "treatments_blocks_results_items_symptoms_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_blocks_results_items_symptoms" ADD CONSTRAINT "treatments_blocks_results_items_symptoms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments_blocks_results_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_results_items" ADD CONSTRAINT "treatments_blocks_results_items_source_logo_id_media_id_fk" FOREIGN KEY ("source_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_blocks_results_items" ADD CONSTRAINT "treatments_blocks_results_items_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_blocks_results_items" ADD CONSTRAINT "treatments_blocks_results_items_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_blocks_results_items" ADD CONSTRAINT "treatments_blocks_results_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments_blocks_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_results" ADD CONSTRAINT "treatments_blocks_results_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_state_sites" ADD CONSTRAINT "treatments_blocks_state_sites_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_blocks_state_sites" ADD CONSTRAINT "treatments_blocks_state_sites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_state_docs" ADD CONSTRAINT "treatments_blocks_state_docs_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_blocks_state_docs" ADD CONSTRAINT "treatments_blocks_state_docs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_loc_accord_areas" ADD CONSTRAINT "treatments_blocks_loc_accord_areas_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_blocks_loc_accord_areas" ADD CONSTRAINT "treatments_blocks_loc_accord_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments_blocks_loc_accord"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_loc_accord" ADD CONSTRAINT "treatments_blocks_loc_accord_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_clinic_info" ADD CONSTRAINT "treatments_blocks_clinic_info_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_blocks_clinic_info" ADD CONSTRAINT "treatments_blocks_clinic_info_accredit_image_id_media_id_fk" FOREIGN KEY ("accredit_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_blocks_clinic_info" ADD CONSTRAINT "treatments_blocks_clinic_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_quiz_demo" ADD CONSTRAINT "treatments_blocks_quiz_demo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_trending" ADD CONSTRAINT "treatments_blocks_trending_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_blog_list" ADD CONSTRAINT "treatments_blocks_blog_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_center_text_faqs" ADD CONSTRAINT "_treatments_v_blocks_center_text_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v_blocks_center_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_center_text" ADD CONSTRAINT "_treatments_v_blocks_center_text_quote_by_id_doctors_id_fk" FOREIGN KEY ("quote_by_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_center_text" ADD CONSTRAINT "_treatments_v_blocks_center_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_results_items_symptoms" ADD CONSTRAINT "_treatments_v_blocks_results_items_symptoms_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_results_items_symptoms" ADD CONSTRAINT "_treatments_v_blocks_results_items_symptoms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v_blocks_results_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_results_items" ADD CONSTRAINT "_treatments_v_blocks_results_items_source_logo_id_media_id_fk" FOREIGN KEY ("source_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_results_items" ADD CONSTRAINT "_treatments_v_blocks_results_items_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_results_items" ADD CONSTRAINT "_treatments_v_blocks_results_items_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_results_items" ADD CONSTRAINT "_treatments_v_blocks_results_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v_blocks_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_results" ADD CONSTRAINT "_treatments_v_blocks_results_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_state_sites" ADD CONSTRAINT "_treatments_v_blocks_state_sites_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_state_sites" ADD CONSTRAINT "_treatments_v_blocks_state_sites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_state_docs" ADD CONSTRAINT "_treatments_v_blocks_state_docs_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_state_docs" ADD CONSTRAINT "_treatments_v_blocks_state_docs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_loc_accord_areas" ADD CONSTRAINT "_treatments_v_blocks_loc_accord_areas_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_loc_accord_areas" ADD CONSTRAINT "_treatments_v_blocks_loc_accord_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v_blocks_loc_accord"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_loc_accord" ADD CONSTRAINT "_treatments_v_blocks_loc_accord_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_clinic_info" ADD CONSTRAINT "_treatments_v_blocks_clinic_info_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_clinic_info" ADD CONSTRAINT "_treatments_v_blocks_clinic_info_accredit_image_id_media_id_fk" FOREIGN KEY ("accredit_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_clinic_info" ADD CONSTRAINT "_treatments_v_blocks_clinic_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_quiz_demo" ADD CONSTRAINT "_treatments_v_blocks_quiz_demo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_trending" ADD CONSTRAINT "_treatments_v_blocks_trending_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_blog_list" ADD CONSTRAINT "_treatments_v_blocks_blog_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_treatments_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_center_text_faqs" ADD CONSTRAINT "conditions_blocks_center_text_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions_blocks_center_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_center_text" ADD CONSTRAINT "conditions_blocks_center_text_quote_by_id_doctors_id_fk" FOREIGN KEY ("quote_by_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_blocks_center_text" ADD CONSTRAINT "conditions_blocks_center_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_results_items_symptoms" ADD CONSTRAINT "conditions_blocks_results_items_symptoms_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_blocks_results_items_symptoms" ADD CONSTRAINT "conditions_blocks_results_items_symptoms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions_blocks_results_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_results_items" ADD CONSTRAINT "conditions_blocks_results_items_source_logo_id_media_id_fk" FOREIGN KEY ("source_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_blocks_results_items" ADD CONSTRAINT "conditions_blocks_results_items_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_blocks_results_items" ADD CONSTRAINT "conditions_blocks_results_items_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_blocks_results_items" ADD CONSTRAINT "conditions_blocks_results_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions_blocks_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_results" ADD CONSTRAINT "conditions_blocks_results_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_state_sites" ADD CONSTRAINT "conditions_blocks_state_sites_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_blocks_state_sites" ADD CONSTRAINT "conditions_blocks_state_sites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_state_docs" ADD CONSTRAINT "conditions_blocks_state_docs_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_blocks_state_docs" ADD CONSTRAINT "conditions_blocks_state_docs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_loc_accord_areas" ADD CONSTRAINT "conditions_blocks_loc_accord_areas_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_blocks_loc_accord_areas" ADD CONSTRAINT "conditions_blocks_loc_accord_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions_blocks_loc_accord"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_loc_accord" ADD CONSTRAINT "conditions_blocks_loc_accord_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_clinic_info" ADD CONSTRAINT "conditions_blocks_clinic_info_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_blocks_clinic_info" ADD CONSTRAINT "conditions_blocks_clinic_info_accredit_image_id_media_id_fk" FOREIGN KEY ("accredit_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_blocks_clinic_info" ADD CONSTRAINT "conditions_blocks_clinic_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_quiz_demo" ADD CONSTRAINT "conditions_blocks_quiz_demo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_trending" ADD CONSTRAINT "conditions_blocks_trending_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_blog_list" ADD CONSTRAINT "conditions_blocks_blog_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_center_text_faqs" ADD CONSTRAINT "_conditions_v_blocks_center_text_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v_blocks_center_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_center_text" ADD CONSTRAINT "_conditions_v_blocks_center_text_quote_by_id_doctors_id_fk" FOREIGN KEY ("quote_by_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_center_text" ADD CONSTRAINT "_conditions_v_blocks_center_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_results_items_symptoms" ADD CONSTRAINT "_conditions_v_blocks_results_items_symptoms_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_results_items_symptoms" ADD CONSTRAINT "_conditions_v_blocks_results_items_symptoms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v_blocks_results_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_results_items" ADD CONSTRAINT "_conditions_v_blocks_results_items_source_logo_id_media_id_fk" FOREIGN KEY ("source_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_results_items" ADD CONSTRAINT "_conditions_v_blocks_results_items_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_results_items" ADD CONSTRAINT "_conditions_v_blocks_results_items_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_results_items" ADD CONSTRAINT "_conditions_v_blocks_results_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v_blocks_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_results" ADD CONSTRAINT "_conditions_v_blocks_results_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_state_sites" ADD CONSTRAINT "_conditions_v_blocks_state_sites_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_state_sites" ADD CONSTRAINT "_conditions_v_blocks_state_sites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_state_docs" ADD CONSTRAINT "_conditions_v_blocks_state_docs_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_state_docs" ADD CONSTRAINT "_conditions_v_blocks_state_docs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_loc_accord_areas" ADD CONSTRAINT "_conditions_v_blocks_loc_accord_areas_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_loc_accord_areas" ADD CONSTRAINT "_conditions_v_blocks_loc_accord_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v_blocks_loc_accord"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_loc_accord" ADD CONSTRAINT "_conditions_v_blocks_loc_accord_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_clinic_info" ADD CONSTRAINT "_conditions_v_blocks_clinic_info_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_clinic_info" ADD CONSTRAINT "_conditions_v_blocks_clinic_info_accredit_image_id_media_id_fk" FOREIGN KEY ("accredit_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_clinic_info" ADD CONSTRAINT "_conditions_v_blocks_clinic_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_quiz_demo" ADD CONSTRAINT "_conditions_v_blocks_quiz_demo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_trending" ADD CONSTRAINT "_conditions_v_blocks_trending_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_blog_list" ADD CONSTRAINT "_conditions_v_blocks_blog_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_conditions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "authors_locales" ADD CONSTRAINT "authors_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."authors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_logo_strip_logos" ADD CONSTRAINT "posts_blocks_logo_strip_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_logo_strip_logos" ADD CONSTRAINT "posts_blocks_logo_strip_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_logo_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_logo_strip" ADD CONSTRAINT "posts_blocks_logo_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_icon_list_items" ADD CONSTRAINT "posts_blocks_icon_list_items_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_icon_list_items" ADD CONSTRAINT "posts_blocks_icon_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_icon_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_icon_list" ADD CONSTRAINT "posts_blocks_icon_list_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_icon_list" ADD CONSTRAINT "posts_blocks_icon_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_media_text" ADD CONSTRAINT "posts_blocks_media_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_media_text" ADD CONSTRAINT "posts_blocks_media_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_insurance_logos" ADD CONSTRAINT "posts_blocks_insurance_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_insurance_logos" ADD CONSTRAINT "posts_blocks_insurance_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_insurance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_insurance" ADD CONSTRAINT "posts_blocks_insurance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_doc_slider" ADD CONSTRAINT "posts_blocks_doc_slider_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_doc_slider" ADD CONSTRAINT "posts_blocks_doc_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_rev_slider" ADD CONSTRAINT "posts_blocks_rev_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_cond_grid" ADD CONSTRAINT "posts_blocks_cond_grid_video_cover_id_media_id_fk" FOREIGN KEY ("video_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_cond_grid" ADD CONSTRAINT "posts_blocks_cond_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_before_after_pairs" ADD CONSTRAINT "posts_blocks_before_after_pairs_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_before_after_pairs" ADD CONSTRAINT "posts_blocks_before_after_pairs_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_before_after_pairs" ADD CONSTRAINT "posts_blocks_before_after_pairs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_before_after"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_before_after" ADD CONSTRAINT "posts_blocks_before_after_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_treat_cards" ADD CONSTRAINT "posts_blocks_treat_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_post_slider" ADD CONSTRAINT "posts_blocks_post_slider_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_post_slider" ADD CONSTRAINT "posts_blocks_post_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_site_cta" ADD CONSTRAINT "posts_blocks_site_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_center_text_faqs" ADD CONSTRAINT "posts_blocks_center_text_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_center_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_center_text" ADD CONSTRAINT "posts_blocks_center_text_quote_by_id_doctors_id_fk" FOREIGN KEY ("quote_by_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_center_text" ADD CONSTRAINT "posts_blocks_center_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_results_items_symptoms" ADD CONSTRAINT "posts_blocks_results_items_symptoms_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_results_items_symptoms" ADD CONSTRAINT "posts_blocks_results_items_symptoms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_results_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_results_items" ADD CONSTRAINT "posts_blocks_results_items_source_logo_id_media_id_fk" FOREIGN KEY ("source_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_results_items" ADD CONSTRAINT "posts_blocks_results_items_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_results_items" ADD CONSTRAINT "posts_blocks_results_items_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_results_items" ADD CONSTRAINT "posts_blocks_results_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_results" ADD CONSTRAINT "posts_blocks_results_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_state_sites" ADD CONSTRAINT "posts_blocks_state_sites_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_state_sites" ADD CONSTRAINT "posts_blocks_state_sites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_state_docs" ADD CONSTRAINT "posts_blocks_state_docs_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_state_docs" ADD CONSTRAINT "posts_blocks_state_docs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_loc_accord_areas" ADD CONSTRAINT "posts_blocks_loc_accord_areas_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_loc_accord_areas" ADD CONSTRAINT "posts_blocks_loc_accord_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts_blocks_loc_accord"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_loc_accord" ADD CONSTRAINT "posts_blocks_loc_accord_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_clinic_info" ADD CONSTRAINT "posts_blocks_clinic_info_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_clinic_info" ADD CONSTRAINT "posts_blocks_clinic_info_accredit_image_id_media_id_fk" FOREIGN KEY ("accredit_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "posts_blocks_clinic_info" ADD CONSTRAINT "posts_blocks_clinic_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_quiz_demo" ADD CONSTRAINT "posts_blocks_quiz_demo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_trending" ADD CONSTRAINT "posts_blocks_trending_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_blocks_blog_list" ADD CONSTRAINT "posts_blocks_blog_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_texts" ADD CONSTRAINT "posts_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_logo_strip_logos" ADD CONSTRAINT "_posts_v_blocks_logo_strip_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_logo_strip_logos" ADD CONSTRAINT "_posts_v_blocks_logo_strip_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_logo_strip"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_logo_strip" ADD CONSTRAINT "_posts_v_blocks_logo_strip_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_icon_list_items" ADD CONSTRAINT "_posts_v_blocks_icon_list_items_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_icon_list_items" ADD CONSTRAINT "_posts_v_blocks_icon_list_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_icon_list"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_icon_list" ADD CONSTRAINT "_posts_v_blocks_icon_list_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_icon_list" ADD CONSTRAINT "_posts_v_blocks_icon_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_media_text" ADD CONSTRAINT "_posts_v_blocks_media_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_media_text" ADD CONSTRAINT "_posts_v_blocks_media_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_insurance_logos" ADD CONSTRAINT "_posts_v_blocks_insurance_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_insurance_logos" ADD CONSTRAINT "_posts_v_blocks_insurance_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_insurance"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_insurance" ADD CONSTRAINT "_posts_v_blocks_insurance_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_doc_slider" ADD CONSTRAINT "_posts_v_blocks_doc_slider_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_doc_slider" ADD CONSTRAINT "_posts_v_blocks_doc_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_rev_slider" ADD CONSTRAINT "_posts_v_blocks_rev_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_cond_grid" ADD CONSTRAINT "_posts_v_blocks_cond_grid_video_cover_id_media_id_fk" FOREIGN KEY ("video_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_cond_grid" ADD CONSTRAINT "_posts_v_blocks_cond_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_before_after_pairs" ADD CONSTRAINT "_posts_v_blocks_before_after_pairs_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_before_after_pairs" ADD CONSTRAINT "_posts_v_blocks_before_after_pairs_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_before_after_pairs" ADD CONSTRAINT "_posts_v_blocks_before_after_pairs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_before_after"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_before_after" ADD CONSTRAINT "_posts_v_blocks_before_after_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_treat_cards" ADD CONSTRAINT "_posts_v_blocks_treat_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_post_slider" ADD CONSTRAINT "_posts_v_blocks_post_slider_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_post_slider" ADD CONSTRAINT "_posts_v_blocks_post_slider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_site_cta" ADD CONSTRAINT "_posts_v_blocks_site_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_center_text_faqs" ADD CONSTRAINT "_posts_v_blocks_center_text_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_center_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_center_text" ADD CONSTRAINT "_posts_v_blocks_center_text_quote_by_id_doctors_id_fk" FOREIGN KEY ("quote_by_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_center_text" ADD CONSTRAINT "_posts_v_blocks_center_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_results_items_symptoms" ADD CONSTRAINT "_posts_v_blocks_results_items_symptoms_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_results_items_symptoms" ADD CONSTRAINT "_posts_v_blocks_results_items_symptoms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_results_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_results_items" ADD CONSTRAINT "_posts_v_blocks_results_items_source_logo_id_media_id_fk" FOREIGN KEY ("source_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_results_items" ADD CONSTRAINT "_posts_v_blocks_results_items_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_results_items" ADD CONSTRAINT "_posts_v_blocks_results_items_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_results_items" ADD CONSTRAINT "_posts_v_blocks_results_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_results" ADD CONSTRAINT "_posts_v_blocks_results_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_state_sites" ADD CONSTRAINT "_posts_v_blocks_state_sites_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_state_sites" ADD CONSTRAINT "_posts_v_blocks_state_sites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_state_docs" ADD CONSTRAINT "_posts_v_blocks_state_docs_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_state_docs" ADD CONSTRAINT "_posts_v_blocks_state_docs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_loc_accord_areas" ADD CONSTRAINT "_posts_v_blocks_loc_accord_areas_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_loc_accord_areas" ADD CONSTRAINT "_posts_v_blocks_loc_accord_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v_blocks_loc_accord"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_loc_accord" ADD CONSTRAINT "_posts_v_blocks_loc_accord_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_clinic_info" ADD CONSTRAINT "_posts_v_blocks_clinic_info_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_clinic_info" ADD CONSTRAINT "_posts_v_blocks_clinic_info_accredit_image_id_media_id_fk" FOREIGN KEY ("accredit_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_clinic_info" ADD CONSTRAINT "_posts_v_blocks_clinic_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_quiz_demo" ADD CONSTRAINT "_posts_v_blocks_quiz_demo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_trending" ADD CONSTRAINT "_posts_v_blocks_trending_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_blocks_blog_list" ADD CONSTRAINT "_posts_v_blocks_blog_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_texts" ADD CONSTRAINT "_posts_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_posts_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_image_hero_crumbs" ADD CONSTRAINT "presets_blocks_image_hero_crumbs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_image_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_image_hero" ADD CONSTRAINT "presets_blocks_image_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_image_hero" ADD CONSTRAINT "presets_blocks_image_hero_mobile_image_id_media_id_fk" FOREIGN KEY ("mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_image_hero" ADD CONSTRAINT "presets_blocks_image_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_simple_hero" ADD CONSTRAINT "presets_blocks_simple_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_blog_hero" ADD CONSTRAINT "presets_blocks_blog_hero_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_blog_hero" ADD CONSTRAINT "presets_blocks_blog_hero_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_blog_hero" ADD CONSTRAINT "presets_blocks_blog_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_center_text_faqs" ADD CONSTRAINT "presets_blocks_center_text_faqs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_center_text"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_center_text" ADD CONSTRAINT "presets_blocks_center_text_quote_by_id_doctors_id_fk" FOREIGN KEY ("quote_by_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_center_text" ADD CONSTRAINT "presets_blocks_center_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_sticky_media_chapters" ADD CONSTRAINT "presets_blocks_sticky_media_chapters_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_sticky_media_chapters" ADD CONSTRAINT "presets_blocks_sticky_media_chapters_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_sticky_media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_sticky_media" ADD CONSTRAINT "presets_blocks_sticky_media_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_results_items_symptoms" ADD CONSTRAINT "presets_blocks_results_items_symptoms_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_results_items_symptoms" ADD CONSTRAINT "presets_blocks_results_items_symptoms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_results_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_results_items" ADD CONSTRAINT "presets_blocks_results_items_source_logo_id_media_id_fk" FOREIGN KEY ("source_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_results_items" ADD CONSTRAINT "presets_blocks_results_items_before_id_media_id_fk" FOREIGN KEY ("before_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_results_items" ADD CONSTRAINT "presets_blocks_results_items_after_id_media_id_fk" FOREIGN KEY ("after_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_results_items" ADD CONSTRAINT "presets_blocks_results_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_results"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_results" ADD CONSTRAINT "presets_blocks_results_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_state_sites" ADD CONSTRAINT "presets_blocks_state_sites_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_state_sites" ADD CONSTRAINT "presets_blocks_state_sites_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_state_docs" ADD CONSTRAINT "presets_blocks_state_docs_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_state_docs" ADD CONSTRAINT "presets_blocks_state_docs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_loc_accord_areas" ADD CONSTRAINT "presets_blocks_loc_accord_areas_state_id_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."states"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_loc_accord_areas" ADD CONSTRAINT "presets_blocks_loc_accord_areas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets_blocks_loc_accord"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_loc_accord" ADD CONSTRAINT "presets_blocks_loc_accord_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_clinic_info" ADD CONSTRAINT "presets_blocks_clinic_info_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_clinic_info" ADD CONSTRAINT "presets_blocks_clinic_info_accredit_image_id_media_id_fk" FOREIGN KEY ("accredit_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_clinic_info" ADD CONSTRAINT "presets_blocks_clinic_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_quiz_demo" ADD CONSTRAINT "presets_blocks_quiz_demo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_trending" ADD CONSTRAINT "presets_blocks_trending_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "presets_blocks_blog_list" ADD CONSTRAINT "presets_blocks_blog_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."presets"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_image_hero_crumbs_order_idx" ON "page_blocks_image_hero_crumbs" USING btree ("_order");
  CREATE INDEX "page_blocks_image_hero_crumbs_parent_id_idx" ON "page_blocks_image_hero_crumbs" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_image_hero_crumbs_locale_idx" ON "page_blocks_image_hero_crumbs" USING btree ("_locale");
  CREATE INDEX "page_blocks_image_hero_order_idx" ON "page_blocks_image_hero" USING btree ("_order");
  CREATE INDEX "page_blocks_image_hero_parent_id_idx" ON "page_blocks_image_hero" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_image_hero_path_idx" ON "page_blocks_image_hero" USING btree ("_path");
  CREATE INDEX "page_blocks_image_hero_locale_idx" ON "page_blocks_image_hero" USING btree ("_locale");
  CREATE INDEX "page_blocks_image_hero_image_idx" ON "page_blocks_image_hero" USING btree ("image_id");
  CREATE INDEX "page_blocks_image_hero_mobile_image_idx" ON "page_blocks_image_hero" USING btree ("mobile_image_id");
  CREATE INDEX "page_blocks_simple_hero_order_idx" ON "page_blocks_simple_hero" USING btree ("_order");
  CREATE INDEX "page_blocks_simple_hero_parent_id_idx" ON "page_blocks_simple_hero" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_simple_hero_path_idx" ON "page_blocks_simple_hero" USING btree ("_path");
  CREATE INDEX "page_blocks_simple_hero_locale_idx" ON "page_blocks_simple_hero" USING btree ("_locale");
  CREATE INDEX "page_blocks_blog_hero_order_idx" ON "page_blocks_blog_hero" USING btree ("_order");
  CREATE INDEX "page_blocks_blog_hero_parent_id_idx" ON "page_blocks_blog_hero" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_blog_hero_path_idx" ON "page_blocks_blog_hero" USING btree ("_path");
  CREATE INDEX "page_blocks_blog_hero_locale_idx" ON "page_blocks_blog_hero" USING btree ("_locale");
  CREATE INDEX "page_blocks_blog_hero_logo_idx" ON "page_blocks_blog_hero" USING btree ("logo_id");
  CREATE INDEX "page_blocks_blog_hero_post_idx" ON "page_blocks_blog_hero" USING btree ("post_id");
  CREATE INDEX "page_blocks_center_text_faqs_order_idx" ON "page_blocks_center_text_faqs" USING btree ("_order");
  CREATE INDEX "page_blocks_center_text_faqs_parent_id_idx" ON "page_blocks_center_text_faqs" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_center_text_faqs_locale_idx" ON "page_blocks_center_text_faqs" USING btree ("_locale");
  CREATE INDEX "page_blocks_center_text_order_idx" ON "page_blocks_center_text" USING btree ("_order");
  CREATE INDEX "page_blocks_center_text_parent_id_idx" ON "page_blocks_center_text" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_center_text_path_idx" ON "page_blocks_center_text" USING btree ("_path");
  CREATE INDEX "page_blocks_center_text_locale_idx" ON "page_blocks_center_text" USING btree ("_locale");
  CREATE INDEX "page_blocks_center_text_quote_by_idx" ON "page_blocks_center_text" USING btree ("quote_by_id");
  CREATE INDEX "stky_chapters_order_idx" ON "stky_chapters" USING btree ("_order");
  CREATE INDEX "stky_chapters_parent_id_idx" ON "stky_chapters" USING btree ("_parent_id");
  CREATE INDEX "stky_chapters_locale_idx" ON "stky_chapters" USING btree ("_locale");
  CREATE INDEX "stky_chapters_image_idx" ON "stky_chapters" USING btree ("image_id");
  CREATE INDEX "stky_order_idx" ON "stky" USING btree ("_order");
  CREATE INDEX "stky_parent_id_idx" ON "stky" USING btree ("_parent_id");
  CREATE INDEX "stky_path_idx" ON "stky" USING btree ("_path");
  CREATE INDEX "stky_locale_idx" ON "stky" USING btree ("_locale");
  CREATE INDEX "page_blocks_results_items_symptoms_order_idx" ON "page_blocks_results_items_symptoms" USING btree ("_order");
  CREATE INDEX "page_blocks_results_items_symptoms_parent_id_idx" ON "page_blocks_results_items_symptoms" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_results_items_symptoms_locale_idx" ON "page_blocks_results_items_symptoms" USING btree ("_locale");
  CREATE INDEX "page_blocks_results_items_symptoms_icon_idx" ON "page_blocks_results_items_symptoms" USING btree ("icon_id");
  CREATE INDEX "page_blocks_results_items_order_idx" ON "page_blocks_results_items" USING btree ("_order");
  CREATE INDEX "page_blocks_results_items_parent_id_idx" ON "page_blocks_results_items" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_results_items_locale_idx" ON "page_blocks_results_items" USING btree ("_locale");
  CREATE INDEX "page_blocks_results_items_source_logo_idx" ON "page_blocks_results_items" USING btree ("source_logo_id");
  CREATE INDEX "page_blocks_results_items_before_idx" ON "page_blocks_results_items" USING btree ("before_id");
  CREATE INDEX "page_blocks_results_items_after_idx" ON "page_blocks_results_items" USING btree ("after_id");
  CREATE INDEX "page_blocks_results_order_idx" ON "page_blocks_results" USING btree ("_order");
  CREATE INDEX "page_blocks_results_parent_id_idx" ON "page_blocks_results" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_results_path_idx" ON "page_blocks_results" USING btree ("_path");
  CREATE INDEX "page_blocks_results_locale_idx" ON "page_blocks_results" USING btree ("_locale");
  CREATE INDEX "page_blocks_state_sites_order_idx" ON "page_blocks_state_sites" USING btree ("_order");
  CREATE INDEX "page_blocks_state_sites_parent_id_idx" ON "page_blocks_state_sites" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_state_sites_path_idx" ON "page_blocks_state_sites" USING btree ("_path");
  CREATE INDEX "page_blocks_state_sites_locale_idx" ON "page_blocks_state_sites" USING btree ("_locale");
  CREATE INDEX "page_blocks_state_sites_state_idx" ON "page_blocks_state_sites" USING btree ("state_id");
  CREATE INDEX "page_blocks_state_docs_order_idx" ON "page_blocks_state_docs" USING btree ("_order");
  CREATE INDEX "page_blocks_state_docs_parent_id_idx" ON "page_blocks_state_docs" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_state_docs_path_idx" ON "page_blocks_state_docs" USING btree ("_path");
  CREATE INDEX "page_blocks_state_docs_locale_idx" ON "page_blocks_state_docs" USING btree ("_locale");
  CREATE INDEX "page_blocks_state_docs_state_idx" ON "page_blocks_state_docs" USING btree ("state_id");
  CREATE INDEX "page_blocks_loc_accord_areas_order_idx" ON "page_blocks_loc_accord_areas" USING btree ("_order");
  CREATE INDEX "page_blocks_loc_accord_areas_parent_id_idx" ON "page_blocks_loc_accord_areas" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_loc_accord_areas_locale_idx" ON "page_blocks_loc_accord_areas" USING btree ("_locale");
  CREATE INDEX "page_blocks_loc_accord_areas_state_idx" ON "page_blocks_loc_accord_areas" USING btree ("state_id");
  CREATE INDEX "page_blocks_loc_accord_order_idx" ON "page_blocks_loc_accord" USING btree ("_order");
  CREATE INDEX "page_blocks_loc_accord_parent_id_idx" ON "page_blocks_loc_accord" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_loc_accord_path_idx" ON "page_blocks_loc_accord" USING btree ("_path");
  CREATE INDEX "page_blocks_loc_accord_locale_idx" ON "page_blocks_loc_accord" USING btree ("_locale");
  CREATE INDEX "page_blocks_clinic_info_order_idx" ON "page_blocks_clinic_info" USING btree ("_order");
  CREATE INDEX "page_blocks_clinic_info_parent_id_idx" ON "page_blocks_clinic_info" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_clinic_info_path_idx" ON "page_blocks_clinic_info" USING btree ("_path");
  CREATE INDEX "page_blocks_clinic_info_locale_idx" ON "page_blocks_clinic_info" USING btree ("_locale");
  CREATE INDEX "page_blocks_clinic_info_clinic_idx" ON "page_blocks_clinic_info" USING btree ("clinic_id");
  CREATE INDEX "page_blocks_clinic_info_accredit_accredit_image_idx" ON "page_blocks_clinic_info" USING btree ("accredit_image_id");
  CREATE INDEX "page_blocks_quiz_demo_order_idx" ON "page_blocks_quiz_demo" USING btree ("_order");
  CREATE INDEX "page_blocks_quiz_demo_parent_id_idx" ON "page_blocks_quiz_demo" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_quiz_demo_path_idx" ON "page_blocks_quiz_demo" USING btree ("_path");
  CREATE INDEX "page_blocks_quiz_demo_locale_idx" ON "page_blocks_quiz_demo" USING btree ("_locale");
  CREATE INDEX "page_blocks_trending_order_idx" ON "page_blocks_trending" USING btree ("_order");
  CREATE INDEX "page_blocks_trending_parent_id_idx" ON "page_blocks_trending" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_trending_path_idx" ON "page_blocks_trending" USING btree ("_path");
  CREATE INDEX "page_blocks_trending_locale_idx" ON "page_blocks_trending" USING btree ("_locale");
  CREATE INDEX "page_blocks_blog_list_order_idx" ON "page_blocks_blog_list" USING btree ("_order");
  CREATE INDEX "page_blocks_blog_list_parent_id_idx" ON "page_blocks_blog_list" USING btree ("_parent_id");
  CREATE INDEX "page_blocks_blog_list_path_idx" ON "page_blocks_blog_list" USING btree ("_path");
  CREATE INDEX "page_blocks_blog_list_locale_idx" ON "page_blocks_blog_list" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_image_hero_crumbs_order_idx" ON "_page_v_blocks_image_hero_crumbs" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_image_hero_crumbs_parent_id_idx" ON "_page_v_blocks_image_hero_crumbs" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_image_hero_crumbs_locale_idx" ON "_page_v_blocks_image_hero_crumbs" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_image_hero_order_idx" ON "_page_v_blocks_image_hero" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_image_hero_parent_id_idx" ON "_page_v_blocks_image_hero" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_image_hero_path_idx" ON "_page_v_blocks_image_hero" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_image_hero_locale_idx" ON "_page_v_blocks_image_hero" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_image_hero_image_idx" ON "_page_v_blocks_image_hero" USING btree ("image_id");
  CREATE INDEX "_page_v_blocks_image_hero_mobile_image_idx" ON "_page_v_blocks_image_hero" USING btree ("mobile_image_id");
  CREATE INDEX "_page_v_blocks_simple_hero_order_idx" ON "_page_v_blocks_simple_hero" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_simple_hero_parent_id_idx" ON "_page_v_blocks_simple_hero" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_simple_hero_path_idx" ON "_page_v_blocks_simple_hero" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_simple_hero_locale_idx" ON "_page_v_blocks_simple_hero" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_blog_hero_order_idx" ON "_page_v_blocks_blog_hero" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_blog_hero_parent_id_idx" ON "_page_v_blocks_blog_hero" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_blog_hero_path_idx" ON "_page_v_blocks_blog_hero" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_blog_hero_locale_idx" ON "_page_v_blocks_blog_hero" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_blog_hero_logo_idx" ON "_page_v_blocks_blog_hero" USING btree ("logo_id");
  CREATE INDEX "_page_v_blocks_blog_hero_post_idx" ON "_page_v_blocks_blog_hero" USING btree ("post_id");
  CREATE INDEX "_page_v_blocks_center_text_faqs_order_idx" ON "_page_v_blocks_center_text_faqs" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_center_text_faqs_parent_id_idx" ON "_page_v_blocks_center_text_faqs" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_center_text_faqs_locale_idx" ON "_page_v_blocks_center_text_faqs" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_center_text_order_idx" ON "_page_v_blocks_center_text" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_center_text_parent_id_idx" ON "_page_v_blocks_center_text" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_center_text_path_idx" ON "_page_v_blocks_center_text" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_center_text_locale_idx" ON "_page_v_blocks_center_text" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_center_text_quote_by_idx" ON "_page_v_blocks_center_text" USING btree ("quote_by_id");
  CREATE INDEX "_stky_v_chapters_order_idx" ON "_stky_v_chapters" USING btree ("_order");
  CREATE INDEX "_stky_v_chapters_parent_id_idx" ON "_stky_v_chapters" USING btree ("_parent_id");
  CREATE INDEX "_stky_v_chapters_locale_idx" ON "_stky_v_chapters" USING btree ("_locale");
  CREATE INDEX "_stky_v_chapters_image_idx" ON "_stky_v_chapters" USING btree ("image_id");
  CREATE INDEX "_stky_v_order_idx" ON "_stky_v" USING btree ("_order");
  CREATE INDEX "_stky_v_parent_id_idx" ON "_stky_v" USING btree ("_parent_id");
  CREATE INDEX "_stky_v_path_idx" ON "_stky_v" USING btree ("_path");
  CREATE INDEX "_stky_v_locale_idx" ON "_stky_v" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_results_items_symptoms_order_idx" ON "_page_v_blocks_results_items_symptoms" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_results_items_symptoms_parent_id_idx" ON "_page_v_blocks_results_items_symptoms" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_results_items_symptoms_locale_idx" ON "_page_v_blocks_results_items_symptoms" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_results_items_symptoms_icon_idx" ON "_page_v_blocks_results_items_symptoms" USING btree ("icon_id");
  CREATE INDEX "_page_v_blocks_results_items_order_idx" ON "_page_v_blocks_results_items" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_results_items_parent_id_idx" ON "_page_v_blocks_results_items" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_results_items_locale_idx" ON "_page_v_blocks_results_items" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_results_items_source_logo_idx" ON "_page_v_blocks_results_items" USING btree ("source_logo_id");
  CREATE INDEX "_page_v_blocks_results_items_before_idx" ON "_page_v_blocks_results_items" USING btree ("before_id");
  CREATE INDEX "_page_v_blocks_results_items_after_idx" ON "_page_v_blocks_results_items" USING btree ("after_id");
  CREATE INDEX "_page_v_blocks_results_order_idx" ON "_page_v_blocks_results" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_results_parent_id_idx" ON "_page_v_blocks_results" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_results_path_idx" ON "_page_v_blocks_results" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_results_locale_idx" ON "_page_v_blocks_results" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_state_sites_order_idx" ON "_page_v_blocks_state_sites" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_state_sites_parent_id_idx" ON "_page_v_blocks_state_sites" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_state_sites_path_idx" ON "_page_v_blocks_state_sites" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_state_sites_locale_idx" ON "_page_v_blocks_state_sites" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_state_sites_state_idx" ON "_page_v_blocks_state_sites" USING btree ("state_id");
  CREATE INDEX "_page_v_blocks_state_docs_order_idx" ON "_page_v_blocks_state_docs" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_state_docs_parent_id_idx" ON "_page_v_blocks_state_docs" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_state_docs_path_idx" ON "_page_v_blocks_state_docs" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_state_docs_locale_idx" ON "_page_v_blocks_state_docs" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_state_docs_state_idx" ON "_page_v_blocks_state_docs" USING btree ("state_id");
  CREATE INDEX "_page_v_blocks_loc_accord_areas_order_idx" ON "_page_v_blocks_loc_accord_areas" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_loc_accord_areas_parent_id_idx" ON "_page_v_blocks_loc_accord_areas" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_loc_accord_areas_locale_idx" ON "_page_v_blocks_loc_accord_areas" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_loc_accord_areas_state_idx" ON "_page_v_blocks_loc_accord_areas" USING btree ("state_id");
  CREATE INDEX "_page_v_blocks_loc_accord_order_idx" ON "_page_v_blocks_loc_accord" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_loc_accord_parent_id_idx" ON "_page_v_blocks_loc_accord" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_loc_accord_path_idx" ON "_page_v_blocks_loc_accord" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_loc_accord_locale_idx" ON "_page_v_blocks_loc_accord" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_clinic_info_order_idx" ON "_page_v_blocks_clinic_info" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_clinic_info_parent_id_idx" ON "_page_v_blocks_clinic_info" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_clinic_info_path_idx" ON "_page_v_blocks_clinic_info" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_clinic_info_locale_idx" ON "_page_v_blocks_clinic_info" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_clinic_info_clinic_idx" ON "_page_v_blocks_clinic_info" USING btree ("clinic_id");
  CREATE INDEX "_page_v_blocks_clinic_info_accredit_accredit_image_idx" ON "_page_v_blocks_clinic_info" USING btree ("accredit_image_id");
  CREATE INDEX "_page_v_blocks_quiz_demo_order_idx" ON "_page_v_blocks_quiz_demo" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_quiz_demo_parent_id_idx" ON "_page_v_blocks_quiz_demo" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_quiz_demo_path_idx" ON "_page_v_blocks_quiz_demo" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_quiz_demo_locale_idx" ON "_page_v_blocks_quiz_demo" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_trending_order_idx" ON "_page_v_blocks_trending" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_trending_parent_id_idx" ON "_page_v_blocks_trending" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_trending_path_idx" ON "_page_v_blocks_trending" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_trending_locale_idx" ON "_page_v_blocks_trending" USING btree ("_locale");
  CREATE INDEX "_page_v_blocks_blog_list_order_idx" ON "_page_v_blocks_blog_list" USING btree ("_order");
  CREATE INDEX "_page_v_blocks_blog_list_parent_id_idx" ON "_page_v_blocks_blog_list" USING btree ("_parent_id");
  CREATE INDEX "_page_v_blocks_blog_list_path_idx" ON "_page_v_blocks_blog_list" USING btree ("_path");
  CREATE INDEX "_page_v_blocks_blog_list_locale_idx" ON "_page_v_blocks_blog_list" USING btree ("_locale");
  CREATE INDEX "states_blocks_center_text_faqs_order_idx" ON "states_blocks_center_text_faqs" USING btree ("_order");
  CREATE INDEX "states_blocks_center_text_faqs_parent_id_idx" ON "states_blocks_center_text_faqs" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_center_text_faqs_locale_idx" ON "states_blocks_center_text_faqs" USING btree ("_locale");
  CREATE INDEX "states_blocks_center_text_order_idx" ON "states_blocks_center_text" USING btree ("_order");
  CREATE INDEX "states_blocks_center_text_parent_id_idx" ON "states_blocks_center_text" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_center_text_path_idx" ON "states_blocks_center_text" USING btree ("_path");
  CREATE INDEX "states_blocks_center_text_locale_idx" ON "states_blocks_center_text" USING btree ("_locale");
  CREATE INDEX "states_blocks_center_text_quote_by_idx" ON "states_blocks_center_text" USING btree ("quote_by_id");
  CREATE INDEX "states_blocks_results_items_symptoms_order_idx" ON "states_blocks_results_items_symptoms" USING btree ("_order");
  CREATE INDEX "states_blocks_results_items_symptoms_parent_id_idx" ON "states_blocks_results_items_symptoms" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_results_items_symptoms_locale_idx" ON "states_blocks_results_items_symptoms" USING btree ("_locale");
  CREATE INDEX "states_blocks_results_items_symptoms_icon_idx" ON "states_blocks_results_items_symptoms" USING btree ("icon_id");
  CREATE INDEX "states_blocks_results_items_order_idx" ON "states_blocks_results_items" USING btree ("_order");
  CREATE INDEX "states_blocks_results_items_parent_id_idx" ON "states_blocks_results_items" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_results_items_locale_idx" ON "states_blocks_results_items" USING btree ("_locale");
  CREATE INDEX "states_blocks_results_items_source_logo_idx" ON "states_blocks_results_items" USING btree ("source_logo_id");
  CREATE INDEX "states_blocks_results_items_before_idx" ON "states_blocks_results_items" USING btree ("before_id");
  CREATE INDEX "states_blocks_results_items_after_idx" ON "states_blocks_results_items" USING btree ("after_id");
  CREATE INDEX "states_blocks_results_order_idx" ON "states_blocks_results" USING btree ("_order");
  CREATE INDEX "states_blocks_results_parent_id_idx" ON "states_blocks_results" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_results_path_idx" ON "states_blocks_results" USING btree ("_path");
  CREATE INDEX "states_blocks_results_locale_idx" ON "states_blocks_results" USING btree ("_locale");
  CREATE INDEX "states_blocks_state_sites_order_idx" ON "states_blocks_state_sites" USING btree ("_order");
  CREATE INDEX "states_blocks_state_sites_parent_id_idx" ON "states_blocks_state_sites" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_state_sites_path_idx" ON "states_blocks_state_sites" USING btree ("_path");
  CREATE INDEX "states_blocks_state_sites_locale_idx" ON "states_blocks_state_sites" USING btree ("_locale");
  CREATE INDEX "states_blocks_state_sites_state_idx" ON "states_blocks_state_sites" USING btree ("state_id");
  CREATE INDEX "states_blocks_state_docs_order_idx" ON "states_blocks_state_docs" USING btree ("_order");
  CREATE INDEX "states_blocks_state_docs_parent_id_idx" ON "states_blocks_state_docs" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_state_docs_path_idx" ON "states_blocks_state_docs" USING btree ("_path");
  CREATE INDEX "states_blocks_state_docs_locale_idx" ON "states_blocks_state_docs" USING btree ("_locale");
  CREATE INDEX "states_blocks_state_docs_state_idx" ON "states_blocks_state_docs" USING btree ("state_id");
  CREATE INDEX "states_blocks_loc_accord_areas_order_idx" ON "states_blocks_loc_accord_areas" USING btree ("_order");
  CREATE INDEX "states_blocks_loc_accord_areas_parent_id_idx" ON "states_blocks_loc_accord_areas" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_loc_accord_areas_locale_idx" ON "states_blocks_loc_accord_areas" USING btree ("_locale");
  CREATE INDEX "states_blocks_loc_accord_areas_state_idx" ON "states_blocks_loc_accord_areas" USING btree ("state_id");
  CREATE INDEX "states_blocks_loc_accord_order_idx" ON "states_blocks_loc_accord" USING btree ("_order");
  CREATE INDEX "states_blocks_loc_accord_parent_id_idx" ON "states_blocks_loc_accord" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_loc_accord_path_idx" ON "states_blocks_loc_accord" USING btree ("_path");
  CREATE INDEX "states_blocks_loc_accord_locale_idx" ON "states_blocks_loc_accord" USING btree ("_locale");
  CREATE INDEX "states_blocks_clinic_info_order_idx" ON "states_blocks_clinic_info" USING btree ("_order");
  CREATE INDEX "states_blocks_clinic_info_parent_id_idx" ON "states_blocks_clinic_info" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_clinic_info_path_idx" ON "states_blocks_clinic_info" USING btree ("_path");
  CREATE INDEX "states_blocks_clinic_info_locale_idx" ON "states_blocks_clinic_info" USING btree ("_locale");
  CREATE INDEX "states_blocks_clinic_info_clinic_idx" ON "states_blocks_clinic_info" USING btree ("clinic_id");
  CREATE INDEX "states_blocks_clinic_info_accredit_accredit_image_idx" ON "states_blocks_clinic_info" USING btree ("accredit_image_id");
  CREATE INDEX "states_blocks_quiz_demo_order_idx" ON "states_blocks_quiz_demo" USING btree ("_order");
  CREATE INDEX "states_blocks_quiz_demo_parent_id_idx" ON "states_blocks_quiz_demo" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_quiz_demo_path_idx" ON "states_blocks_quiz_demo" USING btree ("_path");
  CREATE INDEX "states_blocks_quiz_demo_locale_idx" ON "states_blocks_quiz_demo" USING btree ("_locale");
  CREATE INDEX "states_blocks_trending_order_idx" ON "states_blocks_trending" USING btree ("_order");
  CREATE INDEX "states_blocks_trending_parent_id_idx" ON "states_blocks_trending" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_trending_path_idx" ON "states_blocks_trending" USING btree ("_path");
  CREATE INDEX "states_blocks_trending_locale_idx" ON "states_blocks_trending" USING btree ("_locale");
  CREATE INDEX "states_blocks_blog_list_order_idx" ON "states_blocks_blog_list" USING btree ("_order");
  CREATE INDEX "states_blocks_blog_list_parent_id_idx" ON "states_blocks_blog_list" USING btree ("_parent_id");
  CREATE INDEX "states_blocks_blog_list_path_idx" ON "states_blocks_blog_list" USING btree ("_path");
  CREATE INDEX "states_blocks_blog_list_locale_idx" ON "states_blocks_blog_list" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_center_text_faqs_order_idx" ON "_states_v_blocks_center_text_faqs" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_center_text_faqs_parent_id_idx" ON "_states_v_blocks_center_text_faqs" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_center_text_faqs_locale_idx" ON "_states_v_blocks_center_text_faqs" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_center_text_order_idx" ON "_states_v_blocks_center_text" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_center_text_parent_id_idx" ON "_states_v_blocks_center_text" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_center_text_path_idx" ON "_states_v_blocks_center_text" USING btree ("_path");
  CREATE INDEX "_states_v_blocks_center_text_locale_idx" ON "_states_v_blocks_center_text" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_center_text_quote_by_idx" ON "_states_v_blocks_center_text" USING btree ("quote_by_id");
  CREATE INDEX "_states_v_blocks_results_items_symptoms_order_idx" ON "_states_v_blocks_results_items_symptoms" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_results_items_symptoms_parent_id_idx" ON "_states_v_blocks_results_items_symptoms" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_results_items_symptoms_locale_idx" ON "_states_v_blocks_results_items_symptoms" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_results_items_symptoms_icon_idx" ON "_states_v_blocks_results_items_symptoms" USING btree ("icon_id");
  CREATE INDEX "_states_v_blocks_results_items_order_idx" ON "_states_v_blocks_results_items" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_results_items_parent_id_idx" ON "_states_v_blocks_results_items" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_results_items_locale_idx" ON "_states_v_blocks_results_items" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_results_items_source_logo_idx" ON "_states_v_blocks_results_items" USING btree ("source_logo_id");
  CREATE INDEX "_states_v_blocks_results_items_before_idx" ON "_states_v_blocks_results_items" USING btree ("before_id");
  CREATE INDEX "_states_v_blocks_results_items_after_idx" ON "_states_v_blocks_results_items" USING btree ("after_id");
  CREATE INDEX "_states_v_blocks_results_order_idx" ON "_states_v_blocks_results" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_results_parent_id_idx" ON "_states_v_blocks_results" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_results_path_idx" ON "_states_v_blocks_results" USING btree ("_path");
  CREATE INDEX "_states_v_blocks_results_locale_idx" ON "_states_v_blocks_results" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_state_sites_order_idx" ON "_states_v_blocks_state_sites" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_state_sites_parent_id_idx" ON "_states_v_blocks_state_sites" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_state_sites_path_idx" ON "_states_v_blocks_state_sites" USING btree ("_path");
  CREATE INDEX "_states_v_blocks_state_sites_locale_idx" ON "_states_v_blocks_state_sites" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_state_sites_state_idx" ON "_states_v_blocks_state_sites" USING btree ("state_id");
  CREATE INDEX "_states_v_blocks_state_docs_order_idx" ON "_states_v_blocks_state_docs" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_state_docs_parent_id_idx" ON "_states_v_blocks_state_docs" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_state_docs_path_idx" ON "_states_v_blocks_state_docs" USING btree ("_path");
  CREATE INDEX "_states_v_blocks_state_docs_locale_idx" ON "_states_v_blocks_state_docs" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_state_docs_state_idx" ON "_states_v_blocks_state_docs" USING btree ("state_id");
  CREATE INDEX "_states_v_blocks_loc_accord_areas_order_idx" ON "_states_v_blocks_loc_accord_areas" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_loc_accord_areas_parent_id_idx" ON "_states_v_blocks_loc_accord_areas" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_loc_accord_areas_locale_idx" ON "_states_v_blocks_loc_accord_areas" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_loc_accord_areas_state_idx" ON "_states_v_blocks_loc_accord_areas" USING btree ("state_id");
  CREATE INDEX "_states_v_blocks_loc_accord_order_idx" ON "_states_v_blocks_loc_accord" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_loc_accord_parent_id_idx" ON "_states_v_blocks_loc_accord" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_loc_accord_path_idx" ON "_states_v_blocks_loc_accord" USING btree ("_path");
  CREATE INDEX "_states_v_blocks_loc_accord_locale_idx" ON "_states_v_blocks_loc_accord" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_clinic_info_order_idx" ON "_states_v_blocks_clinic_info" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_clinic_info_parent_id_idx" ON "_states_v_blocks_clinic_info" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_clinic_info_path_idx" ON "_states_v_blocks_clinic_info" USING btree ("_path");
  CREATE INDEX "_states_v_blocks_clinic_info_locale_idx" ON "_states_v_blocks_clinic_info" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_clinic_info_clinic_idx" ON "_states_v_blocks_clinic_info" USING btree ("clinic_id");
  CREATE INDEX "_states_v_blocks_clinic_info_accredit_accredit_image_idx" ON "_states_v_blocks_clinic_info" USING btree ("accredit_image_id");
  CREATE INDEX "_states_v_blocks_quiz_demo_order_idx" ON "_states_v_blocks_quiz_demo" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_quiz_demo_parent_id_idx" ON "_states_v_blocks_quiz_demo" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_quiz_demo_path_idx" ON "_states_v_blocks_quiz_demo" USING btree ("_path");
  CREATE INDEX "_states_v_blocks_quiz_demo_locale_idx" ON "_states_v_blocks_quiz_demo" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_trending_order_idx" ON "_states_v_blocks_trending" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_trending_parent_id_idx" ON "_states_v_blocks_trending" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_trending_path_idx" ON "_states_v_blocks_trending" USING btree ("_path");
  CREATE INDEX "_states_v_blocks_trending_locale_idx" ON "_states_v_blocks_trending" USING btree ("_locale");
  CREATE INDEX "_states_v_blocks_blog_list_order_idx" ON "_states_v_blocks_blog_list" USING btree ("_order");
  CREATE INDEX "_states_v_blocks_blog_list_parent_id_idx" ON "_states_v_blocks_blog_list" USING btree ("_parent_id");
  CREATE INDEX "_states_v_blocks_blog_list_path_idx" ON "_states_v_blocks_blog_list" USING btree ("_path");
  CREATE INDEX "_states_v_blocks_blog_list_locale_idx" ON "_states_v_blocks_blog_list" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_center_text_faqs_order_idx" ON "clinics_blocks_center_text_faqs" USING btree ("_order");
  CREATE INDEX "clinics_blocks_center_text_faqs_parent_id_idx" ON "clinics_blocks_center_text_faqs" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_center_text_faqs_locale_idx" ON "clinics_blocks_center_text_faqs" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_center_text_order_idx" ON "clinics_blocks_center_text" USING btree ("_order");
  CREATE INDEX "clinics_blocks_center_text_parent_id_idx" ON "clinics_blocks_center_text" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_center_text_path_idx" ON "clinics_blocks_center_text" USING btree ("_path");
  CREATE INDEX "clinics_blocks_center_text_locale_idx" ON "clinics_blocks_center_text" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_center_text_quote_by_idx" ON "clinics_blocks_center_text" USING btree ("quote_by_id");
  CREATE INDEX "clinics_blocks_results_items_symptoms_order_idx" ON "clinics_blocks_results_items_symptoms" USING btree ("_order");
  CREATE INDEX "clinics_blocks_results_items_symptoms_parent_id_idx" ON "clinics_blocks_results_items_symptoms" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_results_items_symptoms_locale_idx" ON "clinics_blocks_results_items_symptoms" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_results_items_symptoms_icon_idx" ON "clinics_blocks_results_items_symptoms" USING btree ("icon_id");
  CREATE INDEX "clinics_blocks_results_items_order_idx" ON "clinics_blocks_results_items" USING btree ("_order");
  CREATE INDEX "clinics_blocks_results_items_parent_id_idx" ON "clinics_blocks_results_items" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_results_items_locale_idx" ON "clinics_blocks_results_items" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_results_items_source_logo_idx" ON "clinics_blocks_results_items" USING btree ("source_logo_id");
  CREATE INDEX "clinics_blocks_results_items_before_idx" ON "clinics_blocks_results_items" USING btree ("before_id");
  CREATE INDEX "clinics_blocks_results_items_after_idx" ON "clinics_blocks_results_items" USING btree ("after_id");
  CREATE INDEX "clinics_blocks_results_order_idx" ON "clinics_blocks_results" USING btree ("_order");
  CREATE INDEX "clinics_blocks_results_parent_id_idx" ON "clinics_blocks_results" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_results_path_idx" ON "clinics_blocks_results" USING btree ("_path");
  CREATE INDEX "clinics_blocks_results_locale_idx" ON "clinics_blocks_results" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_state_sites_order_idx" ON "clinics_blocks_state_sites" USING btree ("_order");
  CREATE INDEX "clinics_blocks_state_sites_parent_id_idx" ON "clinics_blocks_state_sites" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_state_sites_path_idx" ON "clinics_blocks_state_sites" USING btree ("_path");
  CREATE INDEX "clinics_blocks_state_sites_locale_idx" ON "clinics_blocks_state_sites" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_state_sites_state_idx" ON "clinics_blocks_state_sites" USING btree ("state_id");
  CREATE INDEX "clinics_blocks_state_docs_order_idx" ON "clinics_blocks_state_docs" USING btree ("_order");
  CREATE INDEX "clinics_blocks_state_docs_parent_id_idx" ON "clinics_blocks_state_docs" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_state_docs_path_idx" ON "clinics_blocks_state_docs" USING btree ("_path");
  CREATE INDEX "clinics_blocks_state_docs_locale_idx" ON "clinics_blocks_state_docs" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_state_docs_state_idx" ON "clinics_blocks_state_docs" USING btree ("state_id");
  CREATE INDEX "clinics_blocks_loc_accord_areas_order_idx" ON "clinics_blocks_loc_accord_areas" USING btree ("_order");
  CREATE INDEX "clinics_blocks_loc_accord_areas_parent_id_idx" ON "clinics_blocks_loc_accord_areas" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_loc_accord_areas_locale_idx" ON "clinics_blocks_loc_accord_areas" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_loc_accord_areas_state_idx" ON "clinics_blocks_loc_accord_areas" USING btree ("state_id");
  CREATE INDEX "clinics_blocks_loc_accord_order_idx" ON "clinics_blocks_loc_accord" USING btree ("_order");
  CREATE INDEX "clinics_blocks_loc_accord_parent_id_idx" ON "clinics_blocks_loc_accord" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_loc_accord_path_idx" ON "clinics_blocks_loc_accord" USING btree ("_path");
  CREATE INDEX "clinics_blocks_loc_accord_locale_idx" ON "clinics_blocks_loc_accord" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_clinic_info_order_idx" ON "clinics_blocks_clinic_info" USING btree ("_order");
  CREATE INDEX "clinics_blocks_clinic_info_parent_id_idx" ON "clinics_blocks_clinic_info" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_clinic_info_path_idx" ON "clinics_blocks_clinic_info" USING btree ("_path");
  CREATE INDEX "clinics_blocks_clinic_info_locale_idx" ON "clinics_blocks_clinic_info" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_clinic_info_clinic_idx" ON "clinics_blocks_clinic_info" USING btree ("clinic_id");
  CREATE INDEX "clinics_blocks_clinic_info_accredit_accredit_image_idx" ON "clinics_blocks_clinic_info" USING btree ("accredit_image_id");
  CREATE INDEX "clinics_blocks_quiz_demo_order_idx" ON "clinics_blocks_quiz_demo" USING btree ("_order");
  CREATE INDEX "clinics_blocks_quiz_demo_parent_id_idx" ON "clinics_blocks_quiz_demo" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_quiz_demo_path_idx" ON "clinics_blocks_quiz_demo" USING btree ("_path");
  CREATE INDEX "clinics_blocks_quiz_demo_locale_idx" ON "clinics_blocks_quiz_demo" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_trending_order_idx" ON "clinics_blocks_trending" USING btree ("_order");
  CREATE INDEX "clinics_blocks_trending_parent_id_idx" ON "clinics_blocks_trending" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_trending_path_idx" ON "clinics_blocks_trending" USING btree ("_path");
  CREATE INDEX "clinics_blocks_trending_locale_idx" ON "clinics_blocks_trending" USING btree ("_locale");
  CREATE INDEX "clinics_blocks_blog_list_order_idx" ON "clinics_blocks_blog_list" USING btree ("_order");
  CREATE INDEX "clinics_blocks_blog_list_parent_id_idx" ON "clinics_blocks_blog_list" USING btree ("_parent_id");
  CREATE INDEX "clinics_blocks_blog_list_path_idx" ON "clinics_blocks_blog_list" USING btree ("_path");
  CREATE INDEX "clinics_blocks_blog_list_locale_idx" ON "clinics_blocks_blog_list" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_center_text_faqs_order_idx" ON "_clinics_v_blocks_center_text_faqs" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_center_text_faqs_parent_id_idx" ON "_clinics_v_blocks_center_text_faqs" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_center_text_faqs_locale_idx" ON "_clinics_v_blocks_center_text_faqs" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_center_text_order_idx" ON "_clinics_v_blocks_center_text" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_center_text_parent_id_idx" ON "_clinics_v_blocks_center_text" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_center_text_path_idx" ON "_clinics_v_blocks_center_text" USING btree ("_path");
  CREATE INDEX "_clinics_v_blocks_center_text_locale_idx" ON "_clinics_v_blocks_center_text" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_center_text_quote_by_idx" ON "_clinics_v_blocks_center_text" USING btree ("quote_by_id");
  CREATE INDEX "_clinics_v_blocks_results_items_symptoms_order_idx" ON "_clinics_v_blocks_results_items_symptoms" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_results_items_symptoms_parent_id_idx" ON "_clinics_v_blocks_results_items_symptoms" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_results_items_symptoms_locale_idx" ON "_clinics_v_blocks_results_items_symptoms" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_results_items_symptoms_icon_idx" ON "_clinics_v_blocks_results_items_symptoms" USING btree ("icon_id");
  CREATE INDEX "_clinics_v_blocks_results_items_order_idx" ON "_clinics_v_blocks_results_items" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_results_items_parent_id_idx" ON "_clinics_v_blocks_results_items" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_results_items_locale_idx" ON "_clinics_v_blocks_results_items" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_results_items_source_logo_idx" ON "_clinics_v_blocks_results_items" USING btree ("source_logo_id");
  CREATE INDEX "_clinics_v_blocks_results_items_before_idx" ON "_clinics_v_blocks_results_items" USING btree ("before_id");
  CREATE INDEX "_clinics_v_blocks_results_items_after_idx" ON "_clinics_v_blocks_results_items" USING btree ("after_id");
  CREATE INDEX "_clinics_v_blocks_results_order_idx" ON "_clinics_v_blocks_results" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_results_parent_id_idx" ON "_clinics_v_blocks_results" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_results_path_idx" ON "_clinics_v_blocks_results" USING btree ("_path");
  CREATE INDEX "_clinics_v_blocks_results_locale_idx" ON "_clinics_v_blocks_results" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_state_sites_order_idx" ON "_clinics_v_blocks_state_sites" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_state_sites_parent_id_idx" ON "_clinics_v_blocks_state_sites" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_state_sites_path_idx" ON "_clinics_v_blocks_state_sites" USING btree ("_path");
  CREATE INDEX "_clinics_v_blocks_state_sites_locale_idx" ON "_clinics_v_blocks_state_sites" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_state_sites_state_idx" ON "_clinics_v_blocks_state_sites" USING btree ("state_id");
  CREATE INDEX "_clinics_v_blocks_state_docs_order_idx" ON "_clinics_v_blocks_state_docs" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_state_docs_parent_id_idx" ON "_clinics_v_blocks_state_docs" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_state_docs_path_idx" ON "_clinics_v_blocks_state_docs" USING btree ("_path");
  CREATE INDEX "_clinics_v_blocks_state_docs_locale_idx" ON "_clinics_v_blocks_state_docs" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_state_docs_state_idx" ON "_clinics_v_blocks_state_docs" USING btree ("state_id");
  CREATE INDEX "_clinics_v_blocks_loc_accord_areas_order_idx" ON "_clinics_v_blocks_loc_accord_areas" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_loc_accord_areas_parent_id_idx" ON "_clinics_v_blocks_loc_accord_areas" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_loc_accord_areas_locale_idx" ON "_clinics_v_blocks_loc_accord_areas" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_loc_accord_areas_state_idx" ON "_clinics_v_blocks_loc_accord_areas" USING btree ("state_id");
  CREATE INDEX "_clinics_v_blocks_loc_accord_order_idx" ON "_clinics_v_blocks_loc_accord" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_loc_accord_parent_id_idx" ON "_clinics_v_blocks_loc_accord" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_loc_accord_path_idx" ON "_clinics_v_blocks_loc_accord" USING btree ("_path");
  CREATE INDEX "_clinics_v_blocks_loc_accord_locale_idx" ON "_clinics_v_blocks_loc_accord" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_clinic_info_order_idx" ON "_clinics_v_blocks_clinic_info" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_clinic_info_parent_id_idx" ON "_clinics_v_blocks_clinic_info" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_clinic_info_path_idx" ON "_clinics_v_blocks_clinic_info" USING btree ("_path");
  CREATE INDEX "_clinics_v_blocks_clinic_info_locale_idx" ON "_clinics_v_blocks_clinic_info" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_clinic_info_clinic_idx" ON "_clinics_v_blocks_clinic_info" USING btree ("clinic_id");
  CREATE INDEX "_clinics_v_blocks_clinic_info_accredit_accredit_image_idx" ON "_clinics_v_blocks_clinic_info" USING btree ("accredit_image_id");
  CREATE INDEX "_clinics_v_blocks_quiz_demo_order_idx" ON "_clinics_v_blocks_quiz_demo" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_quiz_demo_parent_id_idx" ON "_clinics_v_blocks_quiz_demo" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_quiz_demo_path_idx" ON "_clinics_v_blocks_quiz_demo" USING btree ("_path");
  CREATE INDEX "_clinics_v_blocks_quiz_demo_locale_idx" ON "_clinics_v_blocks_quiz_demo" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_trending_order_idx" ON "_clinics_v_blocks_trending" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_trending_parent_id_idx" ON "_clinics_v_blocks_trending" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_trending_path_idx" ON "_clinics_v_blocks_trending" USING btree ("_path");
  CREATE INDEX "_clinics_v_blocks_trending_locale_idx" ON "_clinics_v_blocks_trending" USING btree ("_locale");
  CREATE INDEX "_clinics_v_blocks_blog_list_order_idx" ON "_clinics_v_blocks_blog_list" USING btree ("_order");
  CREATE INDEX "_clinics_v_blocks_blog_list_parent_id_idx" ON "_clinics_v_blocks_blog_list" USING btree ("_parent_id");
  CREATE INDEX "_clinics_v_blocks_blog_list_path_idx" ON "_clinics_v_blocks_blog_list" USING btree ("_path");
  CREATE INDEX "_clinics_v_blocks_blog_list_locale_idx" ON "_clinics_v_blocks_blog_list" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_center_text_faqs_order_idx" ON "doctors_blocks_center_text_faqs" USING btree ("_order");
  CREATE INDEX "doctors_blocks_center_text_faqs_parent_id_idx" ON "doctors_blocks_center_text_faqs" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_center_text_faqs_locale_idx" ON "doctors_blocks_center_text_faqs" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_center_text_order_idx" ON "doctors_blocks_center_text" USING btree ("_order");
  CREATE INDEX "doctors_blocks_center_text_parent_id_idx" ON "doctors_blocks_center_text" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_center_text_path_idx" ON "doctors_blocks_center_text" USING btree ("_path");
  CREATE INDEX "doctors_blocks_center_text_locale_idx" ON "doctors_blocks_center_text" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_center_text_quote_by_idx" ON "doctors_blocks_center_text" USING btree ("quote_by_id");
  CREATE INDEX "doctors_blocks_results_items_symptoms_order_idx" ON "doctors_blocks_results_items_symptoms" USING btree ("_order");
  CREATE INDEX "doctors_blocks_results_items_symptoms_parent_id_idx" ON "doctors_blocks_results_items_symptoms" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_results_items_symptoms_locale_idx" ON "doctors_blocks_results_items_symptoms" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_results_items_symptoms_icon_idx" ON "doctors_blocks_results_items_symptoms" USING btree ("icon_id");
  CREATE INDEX "doctors_blocks_results_items_order_idx" ON "doctors_blocks_results_items" USING btree ("_order");
  CREATE INDEX "doctors_blocks_results_items_parent_id_idx" ON "doctors_blocks_results_items" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_results_items_locale_idx" ON "doctors_blocks_results_items" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_results_items_source_logo_idx" ON "doctors_blocks_results_items" USING btree ("source_logo_id");
  CREATE INDEX "doctors_blocks_results_items_before_idx" ON "doctors_blocks_results_items" USING btree ("before_id");
  CREATE INDEX "doctors_blocks_results_items_after_idx" ON "doctors_blocks_results_items" USING btree ("after_id");
  CREATE INDEX "doctors_blocks_results_order_idx" ON "doctors_blocks_results" USING btree ("_order");
  CREATE INDEX "doctors_blocks_results_parent_id_idx" ON "doctors_blocks_results" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_results_path_idx" ON "doctors_blocks_results" USING btree ("_path");
  CREATE INDEX "doctors_blocks_results_locale_idx" ON "doctors_blocks_results" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_state_sites_order_idx" ON "doctors_blocks_state_sites" USING btree ("_order");
  CREATE INDEX "doctors_blocks_state_sites_parent_id_idx" ON "doctors_blocks_state_sites" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_state_sites_path_idx" ON "doctors_blocks_state_sites" USING btree ("_path");
  CREATE INDEX "doctors_blocks_state_sites_locale_idx" ON "doctors_blocks_state_sites" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_state_sites_state_idx" ON "doctors_blocks_state_sites" USING btree ("state_id");
  CREATE INDEX "doctors_blocks_state_docs_order_idx" ON "doctors_blocks_state_docs" USING btree ("_order");
  CREATE INDEX "doctors_blocks_state_docs_parent_id_idx" ON "doctors_blocks_state_docs" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_state_docs_path_idx" ON "doctors_blocks_state_docs" USING btree ("_path");
  CREATE INDEX "doctors_blocks_state_docs_locale_idx" ON "doctors_blocks_state_docs" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_state_docs_state_idx" ON "doctors_blocks_state_docs" USING btree ("state_id");
  CREATE INDEX "doctors_blocks_loc_accord_areas_order_idx" ON "doctors_blocks_loc_accord_areas" USING btree ("_order");
  CREATE INDEX "doctors_blocks_loc_accord_areas_parent_id_idx" ON "doctors_blocks_loc_accord_areas" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_loc_accord_areas_locale_idx" ON "doctors_blocks_loc_accord_areas" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_loc_accord_areas_state_idx" ON "doctors_blocks_loc_accord_areas" USING btree ("state_id");
  CREATE INDEX "doctors_blocks_loc_accord_order_idx" ON "doctors_blocks_loc_accord" USING btree ("_order");
  CREATE INDEX "doctors_blocks_loc_accord_parent_id_idx" ON "doctors_blocks_loc_accord" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_loc_accord_path_idx" ON "doctors_blocks_loc_accord" USING btree ("_path");
  CREATE INDEX "doctors_blocks_loc_accord_locale_idx" ON "doctors_blocks_loc_accord" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_clinic_info_order_idx" ON "doctors_blocks_clinic_info" USING btree ("_order");
  CREATE INDEX "doctors_blocks_clinic_info_parent_id_idx" ON "doctors_blocks_clinic_info" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_clinic_info_path_idx" ON "doctors_blocks_clinic_info" USING btree ("_path");
  CREATE INDEX "doctors_blocks_clinic_info_locale_idx" ON "doctors_blocks_clinic_info" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_clinic_info_clinic_idx" ON "doctors_blocks_clinic_info" USING btree ("clinic_id");
  CREATE INDEX "doctors_blocks_clinic_info_accredit_accredit_image_idx" ON "doctors_blocks_clinic_info" USING btree ("accredit_image_id");
  CREATE INDEX "doctors_blocks_quiz_demo_order_idx" ON "doctors_blocks_quiz_demo" USING btree ("_order");
  CREATE INDEX "doctors_blocks_quiz_demo_parent_id_idx" ON "doctors_blocks_quiz_demo" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_quiz_demo_path_idx" ON "doctors_blocks_quiz_demo" USING btree ("_path");
  CREATE INDEX "doctors_blocks_quiz_demo_locale_idx" ON "doctors_blocks_quiz_demo" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_trending_order_idx" ON "doctors_blocks_trending" USING btree ("_order");
  CREATE INDEX "doctors_blocks_trending_parent_id_idx" ON "doctors_blocks_trending" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_trending_path_idx" ON "doctors_blocks_trending" USING btree ("_path");
  CREATE INDEX "doctors_blocks_trending_locale_idx" ON "doctors_blocks_trending" USING btree ("_locale");
  CREATE INDEX "doctors_blocks_blog_list_order_idx" ON "doctors_blocks_blog_list" USING btree ("_order");
  CREATE INDEX "doctors_blocks_blog_list_parent_id_idx" ON "doctors_blocks_blog_list" USING btree ("_parent_id");
  CREATE INDEX "doctors_blocks_blog_list_path_idx" ON "doctors_blocks_blog_list" USING btree ("_path");
  CREATE INDEX "doctors_blocks_blog_list_locale_idx" ON "doctors_blocks_blog_list" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_center_text_faqs_order_idx" ON "_doctors_v_blocks_center_text_faqs" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_center_text_faqs_parent_id_idx" ON "_doctors_v_blocks_center_text_faqs" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_center_text_faqs_locale_idx" ON "_doctors_v_blocks_center_text_faqs" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_center_text_order_idx" ON "_doctors_v_blocks_center_text" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_center_text_parent_id_idx" ON "_doctors_v_blocks_center_text" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_center_text_path_idx" ON "_doctors_v_blocks_center_text" USING btree ("_path");
  CREATE INDEX "_doctors_v_blocks_center_text_locale_idx" ON "_doctors_v_blocks_center_text" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_center_text_quote_by_idx" ON "_doctors_v_blocks_center_text" USING btree ("quote_by_id");
  CREATE INDEX "_doctors_v_blocks_results_items_symptoms_order_idx" ON "_doctors_v_blocks_results_items_symptoms" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_results_items_symptoms_parent_id_idx" ON "_doctors_v_blocks_results_items_symptoms" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_results_items_symptoms_locale_idx" ON "_doctors_v_blocks_results_items_symptoms" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_results_items_symptoms_icon_idx" ON "_doctors_v_blocks_results_items_symptoms" USING btree ("icon_id");
  CREATE INDEX "_doctors_v_blocks_results_items_order_idx" ON "_doctors_v_blocks_results_items" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_results_items_parent_id_idx" ON "_doctors_v_blocks_results_items" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_results_items_locale_idx" ON "_doctors_v_blocks_results_items" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_results_items_source_logo_idx" ON "_doctors_v_blocks_results_items" USING btree ("source_logo_id");
  CREATE INDEX "_doctors_v_blocks_results_items_before_idx" ON "_doctors_v_blocks_results_items" USING btree ("before_id");
  CREATE INDEX "_doctors_v_blocks_results_items_after_idx" ON "_doctors_v_blocks_results_items" USING btree ("after_id");
  CREATE INDEX "_doctors_v_blocks_results_order_idx" ON "_doctors_v_blocks_results" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_results_parent_id_idx" ON "_doctors_v_blocks_results" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_results_path_idx" ON "_doctors_v_blocks_results" USING btree ("_path");
  CREATE INDEX "_doctors_v_blocks_results_locale_idx" ON "_doctors_v_blocks_results" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_state_sites_order_idx" ON "_doctors_v_blocks_state_sites" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_state_sites_parent_id_idx" ON "_doctors_v_blocks_state_sites" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_state_sites_path_idx" ON "_doctors_v_blocks_state_sites" USING btree ("_path");
  CREATE INDEX "_doctors_v_blocks_state_sites_locale_idx" ON "_doctors_v_blocks_state_sites" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_state_sites_state_idx" ON "_doctors_v_blocks_state_sites" USING btree ("state_id");
  CREATE INDEX "_doctors_v_blocks_state_docs_order_idx" ON "_doctors_v_blocks_state_docs" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_state_docs_parent_id_idx" ON "_doctors_v_blocks_state_docs" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_state_docs_path_idx" ON "_doctors_v_blocks_state_docs" USING btree ("_path");
  CREATE INDEX "_doctors_v_blocks_state_docs_locale_idx" ON "_doctors_v_blocks_state_docs" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_state_docs_state_idx" ON "_doctors_v_blocks_state_docs" USING btree ("state_id");
  CREATE INDEX "_doctors_v_blocks_loc_accord_areas_order_idx" ON "_doctors_v_blocks_loc_accord_areas" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_loc_accord_areas_parent_id_idx" ON "_doctors_v_blocks_loc_accord_areas" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_loc_accord_areas_locale_idx" ON "_doctors_v_blocks_loc_accord_areas" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_loc_accord_areas_state_idx" ON "_doctors_v_blocks_loc_accord_areas" USING btree ("state_id");
  CREATE INDEX "_doctors_v_blocks_loc_accord_order_idx" ON "_doctors_v_blocks_loc_accord" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_loc_accord_parent_id_idx" ON "_doctors_v_blocks_loc_accord" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_loc_accord_path_idx" ON "_doctors_v_blocks_loc_accord" USING btree ("_path");
  CREATE INDEX "_doctors_v_blocks_loc_accord_locale_idx" ON "_doctors_v_blocks_loc_accord" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_clinic_info_order_idx" ON "_doctors_v_blocks_clinic_info" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_clinic_info_parent_id_idx" ON "_doctors_v_blocks_clinic_info" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_clinic_info_path_idx" ON "_doctors_v_blocks_clinic_info" USING btree ("_path");
  CREATE INDEX "_doctors_v_blocks_clinic_info_locale_idx" ON "_doctors_v_blocks_clinic_info" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_clinic_info_clinic_idx" ON "_doctors_v_blocks_clinic_info" USING btree ("clinic_id");
  CREATE INDEX "_doctors_v_blocks_clinic_info_accredit_accredit_image_idx" ON "_doctors_v_blocks_clinic_info" USING btree ("accredit_image_id");
  CREATE INDEX "_doctors_v_blocks_quiz_demo_order_idx" ON "_doctors_v_blocks_quiz_demo" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_quiz_demo_parent_id_idx" ON "_doctors_v_blocks_quiz_demo" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_quiz_demo_path_idx" ON "_doctors_v_blocks_quiz_demo" USING btree ("_path");
  CREATE INDEX "_doctors_v_blocks_quiz_demo_locale_idx" ON "_doctors_v_blocks_quiz_demo" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_trending_order_idx" ON "_doctors_v_blocks_trending" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_trending_parent_id_idx" ON "_doctors_v_blocks_trending" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_trending_path_idx" ON "_doctors_v_blocks_trending" USING btree ("_path");
  CREATE INDEX "_doctors_v_blocks_trending_locale_idx" ON "_doctors_v_blocks_trending" USING btree ("_locale");
  CREATE INDEX "_doctors_v_blocks_blog_list_order_idx" ON "_doctors_v_blocks_blog_list" USING btree ("_order");
  CREATE INDEX "_doctors_v_blocks_blog_list_parent_id_idx" ON "_doctors_v_blocks_blog_list" USING btree ("_parent_id");
  CREATE INDEX "_doctors_v_blocks_blog_list_path_idx" ON "_doctors_v_blocks_blog_list" USING btree ("_path");
  CREATE INDEX "_doctors_v_blocks_blog_list_locale_idx" ON "_doctors_v_blocks_blog_list" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_center_text_faqs_order_idx" ON "treatments_blocks_center_text_faqs" USING btree ("_order");
  CREATE INDEX "treatments_blocks_center_text_faqs_parent_id_idx" ON "treatments_blocks_center_text_faqs" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_center_text_faqs_locale_idx" ON "treatments_blocks_center_text_faqs" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_center_text_order_idx" ON "treatments_blocks_center_text" USING btree ("_order");
  CREATE INDEX "treatments_blocks_center_text_parent_id_idx" ON "treatments_blocks_center_text" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_center_text_path_idx" ON "treatments_blocks_center_text" USING btree ("_path");
  CREATE INDEX "treatments_blocks_center_text_locale_idx" ON "treatments_blocks_center_text" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_center_text_quote_by_idx" ON "treatments_blocks_center_text" USING btree ("quote_by_id");
  CREATE INDEX "treatments_blocks_results_items_symptoms_order_idx" ON "treatments_blocks_results_items_symptoms" USING btree ("_order");
  CREATE INDEX "treatments_blocks_results_items_symptoms_parent_id_idx" ON "treatments_blocks_results_items_symptoms" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_results_items_symptoms_locale_idx" ON "treatments_blocks_results_items_symptoms" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_results_items_symptoms_icon_idx" ON "treatments_blocks_results_items_symptoms" USING btree ("icon_id");
  CREATE INDEX "treatments_blocks_results_items_order_idx" ON "treatments_blocks_results_items" USING btree ("_order");
  CREATE INDEX "treatments_blocks_results_items_parent_id_idx" ON "treatments_blocks_results_items" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_results_items_locale_idx" ON "treatments_blocks_results_items" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_results_items_source_logo_idx" ON "treatments_blocks_results_items" USING btree ("source_logo_id");
  CREATE INDEX "treatments_blocks_results_items_before_idx" ON "treatments_blocks_results_items" USING btree ("before_id");
  CREATE INDEX "treatments_blocks_results_items_after_idx" ON "treatments_blocks_results_items" USING btree ("after_id");
  CREATE INDEX "treatments_blocks_results_order_idx" ON "treatments_blocks_results" USING btree ("_order");
  CREATE INDEX "treatments_blocks_results_parent_id_idx" ON "treatments_blocks_results" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_results_path_idx" ON "treatments_blocks_results" USING btree ("_path");
  CREATE INDEX "treatments_blocks_results_locale_idx" ON "treatments_blocks_results" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_state_sites_order_idx" ON "treatments_blocks_state_sites" USING btree ("_order");
  CREATE INDEX "treatments_blocks_state_sites_parent_id_idx" ON "treatments_blocks_state_sites" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_state_sites_path_idx" ON "treatments_blocks_state_sites" USING btree ("_path");
  CREATE INDEX "treatments_blocks_state_sites_locale_idx" ON "treatments_blocks_state_sites" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_state_sites_state_idx" ON "treatments_blocks_state_sites" USING btree ("state_id");
  CREATE INDEX "treatments_blocks_state_docs_order_idx" ON "treatments_blocks_state_docs" USING btree ("_order");
  CREATE INDEX "treatments_blocks_state_docs_parent_id_idx" ON "treatments_blocks_state_docs" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_state_docs_path_idx" ON "treatments_blocks_state_docs" USING btree ("_path");
  CREATE INDEX "treatments_blocks_state_docs_locale_idx" ON "treatments_blocks_state_docs" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_state_docs_state_idx" ON "treatments_blocks_state_docs" USING btree ("state_id");
  CREATE INDEX "treatments_blocks_loc_accord_areas_order_idx" ON "treatments_blocks_loc_accord_areas" USING btree ("_order");
  CREATE INDEX "treatments_blocks_loc_accord_areas_parent_id_idx" ON "treatments_blocks_loc_accord_areas" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_loc_accord_areas_locale_idx" ON "treatments_blocks_loc_accord_areas" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_loc_accord_areas_state_idx" ON "treatments_blocks_loc_accord_areas" USING btree ("state_id");
  CREATE INDEX "treatments_blocks_loc_accord_order_idx" ON "treatments_blocks_loc_accord" USING btree ("_order");
  CREATE INDEX "treatments_blocks_loc_accord_parent_id_idx" ON "treatments_blocks_loc_accord" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_loc_accord_path_idx" ON "treatments_blocks_loc_accord" USING btree ("_path");
  CREATE INDEX "treatments_blocks_loc_accord_locale_idx" ON "treatments_blocks_loc_accord" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_clinic_info_order_idx" ON "treatments_blocks_clinic_info" USING btree ("_order");
  CREATE INDEX "treatments_blocks_clinic_info_parent_id_idx" ON "treatments_blocks_clinic_info" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_clinic_info_path_idx" ON "treatments_blocks_clinic_info" USING btree ("_path");
  CREATE INDEX "treatments_blocks_clinic_info_locale_idx" ON "treatments_blocks_clinic_info" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_clinic_info_clinic_idx" ON "treatments_blocks_clinic_info" USING btree ("clinic_id");
  CREATE INDEX "treatments_blocks_clinic_info_accredit_accredit_image_idx" ON "treatments_blocks_clinic_info" USING btree ("accredit_image_id");
  CREATE INDEX "treatments_blocks_quiz_demo_order_idx" ON "treatments_blocks_quiz_demo" USING btree ("_order");
  CREATE INDEX "treatments_blocks_quiz_demo_parent_id_idx" ON "treatments_blocks_quiz_demo" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_quiz_demo_path_idx" ON "treatments_blocks_quiz_demo" USING btree ("_path");
  CREATE INDEX "treatments_blocks_quiz_demo_locale_idx" ON "treatments_blocks_quiz_demo" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_trending_order_idx" ON "treatments_blocks_trending" USING btree ("_order");
  CREATE INDEX "treatments_blocks_trending_parent_id_idx" ON "treatments_blocks_trending" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_trending_path_idx" ON "treatments_blocks_trending" USING btree ("_path");
  CREATE INDEX "treatments_blocks_trending_locale_idx" ON "treatments_blocks_trending" USING btree ("_locale");
  CREATE INDEX "treatments_blocks_blog_list_order_idx" ON "treatments_blocks_blog_list" USING btree ("_order");
  CREATE INDEX "treatments_blocks_blog_list_parent_id_idx" ON "treatments_blocks_blog_list" USING btree ("_parent_id");
  CREATE INDEX "treatments_blocks_blog_list_path_idx" ON "treatments_blocks_blog_list" USING btree ("_path");
  CREATE INDEX "treatments_blocks_blog_list_locale_idx" ON "treatments_blocks_blog_list" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_center_text_faqs_order_idx" ON "_treatments_v_blocks_center_text_faqs" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_center_text_faqs_parent_id_idx" ON "_treatments_v_blocks_center_text_faqs" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_center_text_faqs_locale_idx" ON "_treatments_v_blocks_center_text_faqs" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_center_text_order_idx" ON "_treatments_v_blocks_center_text" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_center_text_parent_id_idx" ON "_treatments_v_blocks_center_text" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_center_text_path_idx" ON "_treatments_v_blocks_center_text" USING btree ("_path");
  CREATE INDEX "_treatments_v_blocks_center_text_locale_idx" ON "_treatments_v_blocks_center_text" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_center_text_quote_by_idx" ON "_treatments_v_blocks_center_text" USING btree ("quote_by_id");
  CREATE INDEX "_treatments_v_blocks_results_items_symptoms_order_idx" ON "_treatments_v_blocks_results_items_symptoms" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_results_items_symptoms_parent_id_idx" ON "_treatments_v_blocks_results_items_symptoms" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_results_items_symptoms_locale_idx" ON "_treatments_v_blocks_results_items_symptoms" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_results_items_symptoms_icon_idx" ON "_treatments_v_blocks_results_items_symptoms" USING btree ("icon_id");
  CREATE INDEX "_treatments_v_blocks_results_items_order_idx" ON "_treatments_v_blocks_results_items" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_results_items_parent_id_idx" ON "_treatments_v_blocks_results_items" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_results_items_locale_idx" ON "_treatments_v_blocks_results_items" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_results_items_source_logo_idx" ON "_treatments_v_blocks_results_items" USING btree ("source_logo_id");
  CREATE INDEX "_treatments_v_blocks_results_items_before_idx" ON "_treatments_v_blocks_results_items" USING btree ("before_id");
  CREATE INDEX "_treatments_v_blocks_results_items_after_idx" ON "_treatments_v_blocks_results_items" USING btree ("after_id");
  CREATE INDEX "_treatments_v_blocks_results_order_idx" ON "_treatments_v_blocks_results" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_results_parent_id_idx" ON "_treatments_v_blocks_results" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_results_path_idx" ON "_treatments_v_blocks_results" USING btree ("_path");
  CREATE INDEX "_treatments_v_blocks_results_locale_idx" ON "_treatments_v_blocks_results" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_state_sites_order_idx" ON "_treatments_v_blocks_state_sites" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_state_sites_parent_id_idx" ON "_treatments_v_blocks_state_sites" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_state_sites_path_idx" ON "_treatments_v_blocks_state_sites" USING btree ("_path");
  CREATE INDEX "_treatments_v_blocks_state_sites_locale_idx" ON "_treatments_v_blocks_state_sites" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_state_sites_state_idx" ON "_treatments_v_blocks_state_sites" USING btree ("state_id");
  CREATE INDEX "_treatments_v_blocks_state_docs_order_idx" ON "_treatments_v_blocks_state_docs" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_state_docs_parent_id_idx" ON "_treatments_v_blocks_state_docs" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_state_docs_path_idx" ON "_treatments_v_blocks_state_docs" USING btree ("_path");
  CREATE INDEX "_treatments_v_blocks_state_docs_locale_idx" ON "_treatments_v_blocks_state_docs" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_state_docs_state_idx" ON "_treatments_v_blocks_state_docs" USING btree ("state_id");
  CREATE INDEX "_treatments_v_blocks_loc_accord_areas_order_idx" ON "_treatments_v_blocks_loc_accord_areas" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_loc_accord_areas_parent_id_idx" ON "_treatments_v_blocks_loc_accord_areas" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_loc_accord_areas_locale_idx" ON "_treatments_v_blocks_loc_accord_areas" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_loc_accord_areas_state_idx" ON "_treatments_v_blocks_loc_accord_areas" USING btree ("state_id");
  CREATE INDEX "_treatments_v_blocks_loc_accord_order_idx" ON "_treatments_v_blocks_loc_accord" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_loc_accord_parent_id_idx" ON "_treatments_v_blocks_loc_accord" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_loc_accord_path_idx" ON "_treatments_v_blocks_loc_accord" USING btree ("_path");
  CREATE INDEX "_treatments_v_blocks_loc_accord_locale_idx" ON "_treatments_v_blocks_loc_accord" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_clinic_info_order_idx" ON "_treatments_v_blocks_clinic_info" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_clinic_info_parent_id_idx" ON "_treatments_v_blocks_clinic_info" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_clinic_info_path_idx" ON "_treatments_v_blocks_clinic_info" USING btree ("_path");
  CREATE INDEX "_treatments_v_blocks_clinic_info_locale_idx" ON "_treatments_v_blocks_clinic_info" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_clinic_info_clinic_idx" ON "_treatments_v_blocks_clinic_info" USING btree ("clinic_id");
  CREATE INDEX "_treatments_v_blocks_clinic_info_accredit_accredit_image_idx" ON "_treatments_v_blocks_clinic_info" USING btree ("accredit_image_id");
  CREATE INDEX "_treatments_v_blocks_quiz_demo_order_idx" ON "_treatments_v_blocks_quiz_demo" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_quiz_demo_parent_id_idx" ON "_treatments_v_blocks_quiz_demo" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_quiz_demo_path_idx" ON "_treatments_v_blocks_quiz_demo" USING btree ("_path");
  CREATE INDEX "_treatments_v_blocks_quiz_demo_locale_idx" ON "_treatments_v_blocks_quiz_demo" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_trending_order_idx" ON "_treatments_v_blocks_trending" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_trending_parent_id_idx" ON "_treatments_v_blocks_trending" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_trending_path_idx" ON "_treatments_v_blocks_trending" USING btree ("_path");
  CREATE INDEX "_treatments_v_blocks_trending_locale_idx" ON "_treatments_v_blocks_trending" USING btree ("_locale");
  CREATE INDEX "_treatments_v_blocks_blog_list_order_idx" ON "_treatments_v_blocks_blog_list" USING btree ("_order");
  CREATE INDEX "_treatments_v_blocks_blog_list_parent_id_idx" ON "_treatments_v_blocks_blog_list" USING btree ("_parent_id");
  CREATE INDEX "_treatments_v_blocks_blog_list_path_idx" ON "_treatments_v_blocks_blog_list" USING btree ("_path");
  CREATE INDEX "_treatments_v_blocks_blog_list_locale_idx" ON "_treatments_v_blocks_blog_list" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_center_text_faqs_order_idx" ON "conditions_blocks_center_text_faqs" USING btree ("_order");
  CREATE INDEX "conditions_blocks_center_text_faqs_parent_id_idx" ON "conditions_blocks_center_text_faqs" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_center_text_faqs_locale_idx" ON "conditions_blocks_center_text_faqs" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_center_text_order_idx" ON "conditions_blocks_center_text" USING btree ("_order");
  CREATE INDEX "conditions_blocks_center_text_parent_id_idx" ON "conditions_blocks_center_text" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_center_text_path_idx" ON "conditions_blocks_center_text" USING btree ("_path");
  CREATE INDEX "conditions_blocks_center_text_locale_idx" ON "conditions_blocks_center_text" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_center_text_quote_by_idx" ON "conditions_blocks_center_text" USING btree ("quote_by_id");
  CREATE INDEX "conditions_blocks_results_items_symptoms_order_idx" ON "conditions_blocks_results_items_symptoms" USING btree ("_order");
  CREATE INDEX "conditions_blocks_results_items_symptoms_parent_id_idx" ON "conditions_blocks_results_items_symptoms" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_results_items_symptoms_locale_idx" ON "conditions_blocks_results_items_symptoms" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_results_items_symptoms_icon_idx" ON "conditions_blocks_results_items_symptoms" USING btree ("icon_id");
  CREATE INDEX "conditions_blocks_results_items_order_idx" ON "conditions_blocks_results_items" USING btree ("_order");
  CREATE INDEX "conditions_blocks_results_items_parent_id_idx" ON "conditions_blocks_results_items" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_results_items_locale_idx" ON "conditions_blocks_results_items" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_results_items_source_logo_idx" ON "conditions_blocks_results_items" USING btree ("source_logo_id");
  CREATE INDEX "conditions_blocks_results_items_before_idx" ON "conditions_blocks_results_items" USING btree ("before_id");
  CREATE INDEX "conditions_blocks_results_items_after_idx" ON "conditions_blocks_results_items" USING btree ("after_id");
  CREATE INDEX "conditions_blocks_results_order_idx" ON "conditions_blocks_results" USING btree ("_order");
  CREATE INDEX "conditions_blocks_results_parent_id_idx" ON "conditions_blocks_results" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_results_path_idx" ON "conditions_blocks_results" USING btree ("_path");
  CREATE INDEX "conditions_blocks_results_locale_idx" ON "conditions_blocks_results" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_state_sites_order_idx" ON "conditions_blocks_state_sites" USING btree ("_order");
  CREATE INDEX "conditions_blocks_state_sites_parent_id_idx" ON "conditions_blocks_state_sites" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_state_sites_path_idx" ON "conditions_blocks_state_sites" USING btree ("_path");
  CREATE INDEX "conditions_blocks_state_sites_locale_idx" ON "conditions_blocks_state_sites" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_state_sites_state_idx" ON "conditions_blocks_state_sites" USING btree ("state_id");
  CREATE INDEX "conditions_blocks_state_docs_order_idx" ON "conditions_blocks_state_docs" USING btree ("_order");
  CREATE INDEX "conditions_blocks_state_docs_parent_id_idx" ON "conditions_blocks_state_docs" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_state_docs_path_idx" ON "conditions_blocks_state_docs" USING btree ("_path");
  CREATE INDEX "conditions_blocks_state_docs_locale_idx" ON "conditions_blocks_state_docs" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_state_docs_state_idx" ON "conditions_blocks_state_docs" USING btree ("state_id");
  CREATE INDEX "conditions_blocks_loc_accord_areas_order_idx" ON "conditions_blocks_loc_accord_areas" USING btree ("_order");
  CREATE INDEX "conditions_blocks_loc_accord_areas_parent_id_idx" ON "conditions_blocks_loc_accord_areas" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_loc_accord_areas_locale_idx" ON "conditions_blocks_loc_accord_areas" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_loc_accord_areas_state_idx" ON "conditions_blocks_loc_accord_areas" USING btree ("state_id");
  CREATE INDEX "conditions_blocks_loc_accord_order_idx" ON "conditions_blocks_loc_accord" USING btree ("_order");
  CREATE INDEX "conditions_blocks_loc_accord_parent_id_idx" ON "conditions_blocks_loc_accord" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_loc_accord_path_idx" ON "conditions_blocks_loc_accord" USING btree ("_path");
  CREATE INDEX "conditions_blocks_loc_accord_locale_idx" ON "conditions_blocks_loc_accord" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_clinic_info_order_idx" ON "conditions_blocks_clinic_info" USING btree ("_order");
  CREATE INDEX "conditions_blocks_clinic_info_parent_id_idx" ON "conditions_blocks_clinic_info" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_clinic_info_path_idx" ON "conditions_blocks_clinic_info" USING btree ("_path");
  CREATE INDEX "conditions_blocks_clinic_info_locale_idx" ON "conditions_blocks_clinic_info" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_clinic_info_clinic_idx" ON "conditions_blocks_clinic_info" USING btree ("clinic_id");
  CREATE INDEX "conditions_blocks_clinic_info_accredit_accredit_image_idx" ON "conditions_blocks_clinic_info" USING btree ("accredit_image_id");
  CREATE INDEX "conditions_blocks_quiz_demo_order_idx" ON "conditions_blocks_quiz_demo" USING btree ("_order");
  CREATE INDEX "conditions_blocks_quiz_demo_parent_id_idx" ON "conditions_blocks_quiz_demo" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_quiz_demo_path_idx" ON "conditions_blocks_quiz_demo" USING btree ("_path");
  CREATE INDEX "conditions_blocks_quiz_demo_locale_idx" ON "conditions_blocks_quiz_demo" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_trending_order_idx" ON "conditions_blocks_trending" USING btree ("_order");
  CREATE INDEX "conditions_blocks_trending_parent_id_idx" ON "conditions_blocks_trending" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_trending_path_idx" ON "conditions_blocks_trending" USING btree ("_path");
  CREATE INDEX "conditions_blocks_trending_locale_idx" ON "conditions_blocks_trending" USING btree ("_locale");
  CREATE INDEX "conditions_blocks_blog_list_order_idx" ON "conditions_blocks_blog_list" USING btree ("_order");
  CREATE INDEX "conditions_blocks_blog_list_parent_id_idx" ON "conditions_blocks_blog_list" USING btree ("_parent_id");
  CREATE INDEX "conditions_blocks_blog_list_path_idx" ON "conditions_blocks_blog_list" USING btree ("_path");
  CREATE INDEX "conditions_blocks_blog_list_locale_idx" ON "conditions_blocks_blog_list" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_center_text_faqs_order_idx" ON "_conditions_v_blocks_center_text_faqs" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_center_text_faqs_parent_id_idx" ON "_conditions_v_blocks_center_text_faqs" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_center_text_faqs_locale_idx" ON "_conditions_v_blocks_center_text_faqs" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_center_text_order_idx" ON "_conditions_v_blocks_center_text" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_center_text_parent_id_idx" ON "_conditions_v_blocks_center_text" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_center_text_path_idx" ON "_conditions_v_blocks_center_text" USING btree ("_path");
  CREATE INDEX "_conditions_v_blocks_center_text_locale_idx" ON "_conditions_v_blocks_center_text" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_center_text_quote_by_idx" ON "_conditions_v_blocks_center_text" USING btree ("quote_by_id");
  CREATE INDEX "_conditions_v_blocks_results_items_symptoms_order_idx" ON "_conditions_v_blocks_results_items_symptoms" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_results_items_symptoms_parent_id_idx" ON "_conditions_v_blocks_results_items_symptoms" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_results_items_symptoms_locale_idx" ON "_conditions_v_blocks_results_items_symptoms" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_results_items_symptoms_icon_idx" ON "_conditions_v_blocks_results_items_symptoms" USING btree ("icon_id");
  CREATE INDEX "_conditions_v_blocks_results_items_order_idx" ON "_conditions_v_blocks_results_items" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_results_items_parent_id_idx" ON "_conditions_v_blocks_results_items" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_results_items_locale_idx" ON "_conditions_v_blocks_results_items" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_results_items_source_logo_idx" ON "_conditions_v_blocks_results_items" USING btree ("source_logo_id");
  CREATE INDEX "_conditions_v_blocks_results_items_before_idx" ON "_conditions_v_blocks_results_items" USING btree ("before_id");
  CREATE INDEX "_conditions_v_blocks_results_items_after_idx" ON "_conditions_v_blocks_results_items" USING btree ("after_id");
  CREATE INDEX "_conditions_v_blocks_results_order_idx" ON "_conditions_v_blocks_results" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_results_parent_id_idx" ON "_conditions_v_blocks_results" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_results_path_idx" ON "_conditions_v_blocks_results" USING btree ("_path");
  CREATE INDEX "_conditions_v_blocks_results_locale_idx" ON "_conditions_v_blocks_results" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_state_sites_order_idx" ON "_conditions_v_blocks_state_sites" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_state_sites_parent_id_idx" ON "_conditions_v_blocks_state_sites" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_state_sites_path_idx" ON "_conditions_v_blocks_state_sites" USING btree ("_path");
  CREATE INDEX "_conditions_v_blocks_state_sites_locale_idx" ON "_conditions_v_blocks_state_sites" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_state_sites_state_idx" ON "_conditions_v_blocks_state_sites" USING btree ("state_id");
  CREATE INDEX "_conditions_v_blocks_state_docs_order_idx" ON "_conditions_v_blocks_state_docs" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_state_docs_parent_id_idx" ON "_conditions_v_blocks_state_docs" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_state_docs_path_idx" ON "_conditions_v_blocks_state_docs" USING btree ("_path");
  CREATE INDEX "_conditions_v_blocks_state_docs_locale_idx" ON "_conditions_v_blocks_state_docs" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_state_docs_state_idx" ON "_conditions_v_blocks_state_docs" USING btree ("state_id");
  CREATE INDEX "_conditions_v_blocks_loc_accord_areas_order_idx" ON "_conditions_v_blocks_loc_accord_areas" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_loc_accord_areas_parent_id_idx" ON "_conditions_v_blocks_loc_accord_areas" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_loc_accord_areas_locale_idx" ON "_conditions_v_blocks_loc_accord_areas" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_loc_accord_areas_state_idx" ON "_conditions_v_blocks_loc_accord_areas" USING btree ("state_id");
  CREATE INDEX "_conditions_v_blocks_loc_accord_order_idx" ON "_conditions_v_blocks_loc_accord" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_loc_accord_parent_id_idx" ON "_conditions_v_blocks_loc_accord" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_loc_accord_path_idx" ON "_conditions_v_blocks_loc_accord" USING btree ("_path");
  CREATE INDEX "_conditions_v_blocks_loc_accord_locale_idx" ON "_conditions_v_blocks_loc_accord" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_clinic_info_order_idx" ON "_conditions_v_blocks_clinic_info" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_clinic_info_parent_id_idx" ON "_conditions_v_blocks_clinic_info" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_clinic_info_path_idx" ON "_conditions_v_blocks_clinic_info" USING btree ("_path");
  CREATE INDEX "_conditions_v_blocks_clinic_info_locale_idx" ON "_conditions_v_blocks_clinic_info" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_clinic_info_clinic_idx" ON "_conditions_v_blocks_clinic_info" USING btree ("clinic_id");
  CREATE INDEX "_conditions_v_blocks_clinic_info_accredit_accredit_image_idx" ON "_conditions_v_blocks_clinic_info" USING btree ("accredit_image_id");
  CREATE INDEX "_conditions_v_blocks_quiz_demo_order_idx" ON "_conditions_v_blocks_quiz_demo" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_quiz_demo_parent_id_idx" ON "_conditions_v_blocks_quiz_demo" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_quiz_demo_path_idx" ON "_conditions_v_blocks_quiz_demo" USING btree ("_path");
  CREATE INDEX "_conditions_v_blocks_quiz_demo_locale_idx" ON "_conditions_v_blocks_quiz_demo" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_trending_order_idx" ON "_conditions_v_blocks_trending" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_trending_parent_id_idx" ON "_conditions_v_blocks_trending" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_trending_path_idx" ON "_conditions_v_blocks_trending" USING btree ("_path");
  CREATE INDEX "_conditions_v_blocks_trending_locale_idx" ON "_conditions_v_blocks_trending" USING btree ("_locale");
  CREATE INDEX "_conditions_v_blocks_blog_list_order_idx" ON "_conditions_v_blocks_blog_list" USING btree ("_order");
  CREATE INDEX "_conditions_v_blocks_blog_list_parent_id_idx" ON "_conditions_v_blocks_blog_list" USING btree ("_parent_id");
  CREATE INDEX "_conditions_v_blocks_blog_list_path_idx" ON "_conditions_v_blocks_blog_list" USING btree ("_path");
  CREATE INDEX "_conditions_v_blocks_blog_list_locale_idx" ON "_conditions_v_blocks_blog_list" USING btree ("_locale");
  CREATE UNIQUE INDEX "authors_locales_locale_parent_id_unique" ON "authors_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "posts_blocks_logo_strip_logos_order_idx" ON "posts_blocks_logo_strip_logos" USING btree ("_order");
  CREATE INDEX "posts_blocks_logo_strip_logos_parent_id_idx" ON "posts_blocks_logo_strip_logos" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_logo_strip_logos_locale_idx" ON "posts_blocks_logo_strip_logos" USING btree ("_locale");
  CREATE INDEX "posts_blocks_logo_strip_logos_image_idx" ON "posts_blocks_logo_strip_logos" USING btree ("image_id");
  CREATE INDEX "posts_blocks_logo_strip_order_idx" ON "posts_blocks_logo_strip" USING btree ("_order");
  CREATE INDEX "posts_blocks_logo_strip_parent_id_idx" ON "posts_blocks_logo_strip" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_logo_strip_path_idx" ON "posts_blocks_logo_strip" USING btree ("_path");
  CREATE INDEX "posts_blocks_logo_strip_locale_idx" ON "posts_blocks_logo_strip" USING btree ("_locale");
  CREATE INDEX "posts_blocks_icon_list_items_order_idx" ON "posts_blocks_icon_list_items" USING btree ("_order");
  CREATE INDEX "posts_blocks_icon_list_items_parent_id_idx" ON "posts_blocks_icon_list_items" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_icon_list_items_locale_idx" ON "posts_blocks_icon_list_items" USING btree ("_locale");
  CREATE INDEX "posts_blocks_icon_list_items_icon_idx" ON "posts_blocks_icon_list_items" USING btree ("icon_id");
  CREATE INDEX "posts_blocks_icon_list_order_idx" ON "posts_blocks_icon_list" USING btree ("_order");
  CREATE INDEX "posts_blocks_icon_list_parent_id_idx" ON "posts_blocks_icon_list" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_icon_list_path_idx" ON "posts_blocks_icon_list" USING btree ("_path");
  CREATE INDEX "posts_blocks_icon_list_locale_idx" ON "posts_blocks_icon_list" USING btree ("_locale");
  CREATE INDEX "posts_blocks_icon_list_image_idx" ON "posts_blocks_icon_list" USING btree ("image_id");
  CREATE INDEX "posts_blocks_media_text_order_idx" ON "posts_blocks_media_text" USING btree ("_order");
  CREATE INDEX "posts_blocks_media_text_parent_id_idx" ON "posts_blocks_media_text" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_media_text_path_idx" ON "posts_blocks_media_text" USING btree ("_path");
  CREATE INDEX "posts_blocks_media_text_locale_idx" ON "posts_blocks_media_text" USING btree ("_locale");
  CREATE INDEX "posts_blocks_media_text_image_idx" ON "posts_blocks_media_text" USING btree ("image_id");
  CREATE INDEX "posts_blocks_insurance_logos_order_idx" ON "posts_blocks_insurance_logos" USING btree ("_order");
  CREATE INDEX "posts_blocks_insurance_logos_parent_id_idx" ON "posts_blocks_insurance_logos" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_insurance_logos_locale_idx" ON "posts_blocks_insurance_logos" USING btree ("_locale");
  CREATE INDEX "posts_blocks_insurance_logos_image_idx" ON "posts_blocks_insurance_logos" USING btree ("image_id");
  CREATE INDEX "posts_blocks_insurance_order_idx" ON "posts_blocks_insurance" USING btree ("_order");
  CREATE INDEX "posts_blocks_insurance_parent_id_idx" ON "posts_blocks_insurance" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_insurance_path_idx" ON "posts_blocks_insurance" USING btree ("_path");
  CREATE INDEX "posts_blocks_insurance_locale_idx" ON "posts_blocks_insurance" USING btree ("_locale");
  CREATE INDEX "posts_blocks_doc_slider_order_idx" ON "posts_blocks_doc_slider" USING btree ("_order");
  CREATE INDEX "posts_blocks_doc_slider_parent_id_idx" ON "posts_blocks_doc_slider" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_doc_slider_path_idx" ON "posts_blocks_doc_slider" USING btree ("_path");
  CREATE INDEX "posts_blocks_doc_slider_locale_idx" ON "posts_blocks_doc_slider" USING btree ("_locale");
  CREATE INDEX "posts_blocks_doc_slider_image_idx" ON "posts_blocks_doc_slider" USING btree ("image_id");
  CREATE INDEX "posts_blocks_rev_slider_order_idx" ON "posts_blocks_rev_slider" USING btree ("_order");
  CREATE INDEX "posts_blocks_rev_slider_parent_id_idx" ON "posts_blocks_rev_slider" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_rev_slider_path_idx" ON "posts_blocks_rev_slider" USING btree ("_path");
  CREATE INDEX "posts_blocks_rev_slider_locale_idx" ON "posts_blocks_rev_slider" USING btree ("_locale");
  CREATE INDEX "posts_blocks_cond_grid_order_idx" ON "posts_blocks_cond_grid" USING btree ("_order");
  CREATE INDEX "posts_blocks_cond_grid_parent_id_idx" ON "posts_blocks_cond_grid" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_cond_grid_path_idx" ON "posts_blocks_cond_grid" USING btree ("_path");
  CREATE INDEX "posts_blocks_cond_grid_locale_idx" ON "posts_blocks_cond_grid" USING btree ("_locale");
  CREATE INDEX "posts_blocks_cond_grid_video_cover_idx" ON "posts_blocks_cond_grid" USING btree ("video_cover_id");
  CREATE INDEX "posts_blocks_before_after_pairs_order_idx" ON "posts_blocks_before_after_pairs" USING btree ("_order");
  CREATE INDEX "posts_blocks_before_after_pairs_parent_id_idx" ON "posts_blocks_before_after_pairs" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_before_after_pairs_locale_idx" ON "posts_blocks_before_after_pairs" USING btree ("_locale");
  CREATE INDEX "posts_blocks_before_after_pairs_before_idx" ON "posts_blocks_before_after_pairs" USING btree ("before_id");
  CREATE INDEX "posts_blocks_before_after_pairs_after_idx" ON "posts_blocks_before_after_pairs" USING btree ("after_id");
  CREATE INDEX "posts_blocks_before_after_order_idx" ON "posts_blocks_before_after" USING btree ("_order");
  CREATE INDEX "posts_blocks_before_after_parent_id_idx" ON "posts_blocks_before_after" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_before_after_path_idx" ON "posts_blocks_before_after" USING btree ("_path");
  CREATE INDEX "posts_blocks_before_after_locale_idx" ON "posts_blocks_before_after" USING btree ("_locale");
  CREATE INDEX "posts_blocks_treat_cards_order_idx" ON "posts_blocks_treat_cards" USING btree ("_order");
  CREATE INDEX "posts_blocks_treat_cards_parent_id_idx" ON "posts_blocks_treat_cards" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_treat_cards_path_idx" ON "posts_blocks_treat_cards" USING btree ("_path");
  CREATE INDEX "posts_blocks_treat_cards_locale_idx" ON "posts_blocks_treat_cards" USING btree ("_locale");
  CREATE INDEX "posts_blocks_post_slider_order_idx" ON "posts_blocks_post_slider" USING btree ("_order");
  CREATE INDEX "posts_blocks_post_slider_parent_id_idx" ON "posts_blocks_post_slider" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_post_slider_path_idx" ON "posts_blocks_post_slider" USING btree ("_path");
  CREATE INDEX "posts_blocks_post_slider_locale_idx" ON "posts_blocks_post_slider" USING btree ("_locale");
  CREATE INDEX "posts_blocks_post_slider_logo_idx" ON "posts_blocks_post_slider" USING btree ("logo_id");
  CREATE INDEX "posts_blocks_site_cta_order_idx" ON "posts_blocks_site_cta" USING btree ("_order");
  CREATE INDEX "posts_blocks_site_cta_parent_id_idx" ON "posts_blocks_site_cta" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_site_cta_path_idx" ON "posts_blocks_site_cta" USING btree ("_path");
  CREATE INDEX "posts_blocks_site_cta_locale_idx" ON "posts_blocks_site_cta" USING btree ("_locale");
  CREATE INDEX "posts_blocks_center_text_faqs_order_idx" ON "posts_blocks_center_text_faqs" USING btree ("_order");
  CREATE INDEX "posts_blocks_center_text_faqs_parent_id_idx" ON "posts_blocks_center_text_faqs" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_center_text_faqs_locale_idx" ON "posts_blocks_center_text_faqs" USING btree ("_locale");
  CREATE INDEX "posts_blocks_center_text_order_idx" ON "posts_blocks_center_text" USING btree ("_order");
  CREATE INDEX "posts_blocks_center_text_parent_id_idx" ON "posts_blocks_center_text" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_center_text_path_idx" ON "posts_blocks_center_text" USING btree ("_path");
  CREATE INDEX "posts_blocks_center_text_locale_idx" ON "posts_blocks_center_text" USING btree ("_locale");
  CREATE INDEX "posts_blocks_center_text_quote_by_idx" ON "posts_blocks_center_text" USING btree ("quote_by_id");
  CREATE INDEX "posts_blocks_results_items_symptoms_order_idx" ON "posts_blocks_results_items_symptoms" USING btree ("_order");
  CREATE INDEX "posts_blocks_results_items_symptoms_parent_id_idx" ON "posts_blocks_results_items_symptoms" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_results_items_symptoms_locale_idx" ON "posts_blocks_results_items_symptoms" USING btree ("_locale");
  CREATE INDEX "posts_blocks_results_items_symptoms_icon_idx" ON "posts_blocks_results_items_symptoms" USING btree ("icon_id");
  CREATE INDEX "posts_blocks_results_items_order_idx" ON "posts_blocks_results_items" USING btree ("_order");
  CREATE INDEX "posts_blocks_results_items_parent_id_idx" ON "posts_blocks_results_items" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_results_items_locale_idx" ON "posts_blocks_results_items" USING btree ("_locale");
  CREATE INDEX "posts_blocks_results_items_source_logo_idx" ON "posts_blocks_results_items" USING btree ("source_logo_id");
  CREATE INDEX "posts_blocks_results_items_before_idx" ON "posts_blocks_results_items" USING btree ("before_id");
  CREATE INDEX "posts_blocks_results_items_after_idx" ON "posts_blocks_results_items" USING btree ("after_id");
  CREATE INDEX "posts_blocks_results_order_idx" ON "posts_blocks_results" USING btree ("_order");
  CREATE INDEX "posts_blocks_results_parent_id_idx" ON "posts_blocks_results" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_results_path_idx" ON "posts_blocks_results" USING btree ("_path");
  CREATE INDEX "posts_blocks_results_locale_idx" ON "posts_blocks_results" USING btree ("_locale");
  CREATE INDEX "posts_blocks_state_sites_order_idx" ON "posts_blocks_state_sites" USING btree ("_order");
  CREATE INDEX "posts_blocks_state_sites_parent_id_idx" ON "posts_blocks_state_sites" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_state_sites_path_idx" ON "posts_blocks_state_sites" USING btree ("_path");
  CREATE INDEX "posts_blocks_state_sites_locale_idx" ON "posts_blocks_state_sites" USING btree ("_locale");
  CREATE INDEX "posts_blocks_state_sites_state_idx" ON "posts_blocks_state_sites" USING btree ("state_id");
  CREATE INDEX "posts_blocks_state_docs_order_idx" ON "posts_blocks_state_docs" USING btree ("_order");
  CREATE INDEX "posts_blocks_state_docs_parent_id_idx" ON "posts_blocks_state_docs" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_state_docs_path_idx" ON "posts_blocks_state_docs" USING btree ("_path");
  CREATE INDEX "posts_blocks_state_docs_locale_idx" ON "posts_blocks_state_docs" USING btree ("_locale");
  CREATE INDEX "posts_blocks_state_docs_state_idx" ON "posts_blocks_state_docs" USING btree ("state_id");
  CREATE INDEX "posts_blocks_loc_accord_areas_order_idx" ON "posts_blocks_loc_accord_areas" USING btree ("_order");
  CREATE INDEX "posts_blocks_loc_accord_areas_parent_id_idx" ON "posts_blocks_loc_accord_areas" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_loc_accord_areas_locale_idx" ON "posts_blocks_loc_accord_areas" USING btree ("_locale");
  CREATE INDEX "posts_blocks_loc_accord_areas_state_idx" ON "posts_blocks_loc_accord_areas" USING btree ("state_id");
  CREATE INDEX "posts_blocks_loc_accord_order_idx" ON "posts_blocks_loc_accord" USING btree ("_order");
  CREATE INDEX "posts_blocks_loc_accord_parent_id_idx" ON "posts_blocks_loc_accord" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_loc_accord_path_idx" ON "posts_blocks_loc_accord" USING btree ("_path");
  CREATE INDEX "posts_blocks_loc_accord_locale_idx" ON "posts_blocks_loc_accord" USING btree ("_locale");
  CREATE INDEX "posts_blocks_clinic_info_order_idx" ON "posts_blocks_clinic_info" USING btree ("_order");
  CREATE INDEX "posts_blocks_clinic_info_parent_id_idx" ON "posts_blocks_clinic_info" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_clinic_info_path_idx" ON "posts_blocks_clinic_info" USING btree ("_path");
  CREATE INDEX "posts_blocks_clinic_info_locale_idx" ON "posts_blocks_clinic_info" USING btree ("_locale");
  CREATE INDEX "posts_blocks_clinic_info_clinic_idx" ON "posts_blocks_clinic_info" USING btree ("clinic_id");
  CREATE INDEX "posts_blocks_clinic_info_accredit_accredit_image_idx" ON "posts_blocks_clinic_info" USING btree ("accredit_image_id");
  CREATE INDEX "posts_blocks_quiz_demo_order_idx" ON "posts_blocks_quiz_demo" USING btree ("_order");
  CREATE INDEX "posts_blocks_quiz_demo_parent_id_idx" ON "posts_blocks_quiz_demo" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_quiz_demo_path_idx" ON "posts_blocks_quiz_demo" USING btree ("_path");
  CREATE INDEX "posts_blocks_quiz_demo_locale_idx" ON "posts_blocks_quiz_demo" USING btree ("_locale");
  CREATE INDEX "posts_blocks_trending_order_idx" ON "posts_blocks_trending" USING btree ("_order");
  CREATE INDEX "posts_blocks_trending_parent_id_idx" ON "posts_blocks_trending" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_trending_path_idx" ON "posts_blocks_trending" USING btree ("_path");
  CREATE INDEX "posts_blocks_trending_locale_idx" ON "posts_blocks_trending" USING btree ("_locale");
  CREATE INDEX "posts_blocks_blog_list_order_idx" ON "posts_blocks_blog_list" USING btree ("_order");
  CREATE INDEX "posts_blocks_blog_list_parent_id_idx" ON "posts_blocks_blog_list" USING btree ("_parent_id");
  CREATE INDEX "posts_blocks_blog_list_path_idx" ON "posts_blocks_blog_list" USING btree ("_path");
  CREATE INDEX "posts_blocks_blog_list_locale_idx" ON "posts_blocks_blog_list" USING btree ("_locale");
  CREATE INDEX "posts_texts_order_parent" ON "posts_texts" USING btree ("order","parent_id");
  CREATE INDEX "posts_texts_locale_parent" ON "posts_texts" USING btree ("locale","parent_id");
  CREATE INDEX "_posts_v_blocks_logo_strip_logos_order_idx" ON "_posts_v_blocks_logo_strip_logos" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_logo_strip_logos_parent_id_idx" ON "_posts_v_blocks_logo_strip_logos" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_logo_strip_logos_locale_idx" ON "_posts_v_blocks_logo_strip_logos" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_logo_strip_logos_image_idx" ON "_posts_v_blocks_logo_strip_logos" USING btree ("image_id");
  CREATE INDEX "_posts_v_blocks_logo_strip_order_idx" ON "_posts_v_blocks_logo_strip" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_logo_strip_parent_id_idx" ON "_posts_v_blocks_logo_strip" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_logo_strip_path_idx" ON "_posts_v_blocks_logo_strip" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_logo_strip_locale_idx" ON "_posts_v_blocks_logo_strip" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_icon_list_items_order_idx" ON "_posts_v_blocks_icon_list_items" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_icon_list_items_parent_id_idx" ON "_posts_v_blocks_icon_list_items" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_icon_list_items_locale_idx" ON "_posts_v_blocks_icon_list_items" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_icon_list_items_icon_idx" ON "_posts_v_blocks_icon_list_items" USING btree ("icon_id");
  CREATE INDEX "_posts_v_blocks_icon_list_order_idx" ON "_posts_v_blocks_icon_list" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_icon_list_parent_id_idx" ON "_posts_v_blocks_icon_list" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_icon_list_path_idx" ON "_posts_v_blocks_icon_list" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_icon_list_locale_idx" ON "_posts_v_blocks_icon_list" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_icon_list_image_idx" ON "_posts_v_blocks_icon_list" USING btree ("image_id");
  CREATE INDEX "_posts_v_blocks_media_text_order_idx" ON "_posts_v_blocks_media_text" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_media_text_parent_id_idx" ON "_posts_v_blocks_media_text" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_media_text_path_idx" ON "_posts_v_blocks_media_text" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_media_text_locale_idx" ON "_posts_v_blocks_media_text" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_media_text_image_idx" ON "_posts_v_blocks_media_text" USING btree ("image_id");
  CREATE INDEX "_posts_v_blocks_insurance_logos_order_idx" ON "_posts_v_blocks_insurance_logos" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_insurance_logos_parent_id_idx" ON "_posts_v_blocks_insurance_logos" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_insurance_logos_locale_idx" ON "_posts_v_blocks_insurance_logos" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_insurance_logos_image_idx" ON "_posts_v_blocks_insurance_logos" USING btree ("image_id");
  CREATE INDEX "_posts_v_blocks_insurance_order_idx" ON "_posts_v_blocks_insurance" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_insurance_parent_id_idx" ON "_posts_v_blocks_insurance" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_insurance_path_idx" ON "_posts_v_blocks_insurance" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_insurance_locale_idx" ON "_posts_v_blocks_insurance" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_doc_slider_order_idx" ON "_posts_v_blocks_doc_slider" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_doc_slider_parent_id_idx" ON "_posts_v_blocks_doc_slider" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_doc_slider_path_idx" ON "_posts_v_blocks_doc_slider" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_doc_slider_locale_idx" ON "_posts_v_blocks_doc_slider" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_doc_slider_image_idx" ON "_posts_v_blocks_doc_slider" USING btree ("image_id");
  CREATE INDEX "_posts_v_blocks_rev_slider_order_idx" ON "_posts_v_blocks_rev_slider" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_rev_slider_parent_id_idx" ON "_posts_v_blocks_rev_slider" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_rev_slider_path_idx" ON "_posts_v_blocks_rev_slider" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_rev_slider_locale_idx" ON "_posts_v_blocks_rev_slider" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_cond_grid_order_idx" ON "_posts_v_blocks_cond_grid" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_cond_grid_parent_id_idx" ON "_posts_v_blocks_cond_grid" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_cond_grid_path_idx" ON "_posts_v_blocks_cond_grid" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_cond_grid_locale_idx" ON "_posts_v_blocks_cond_grid" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_cond_grid_video_cover_idx" ON "_posts_v_blocks_cond_grid" USING btree ("video_cover_id");
  CREATE INDEX "_posts_v_blocks_before_after_pairs_order_idx" ON "_posts_v_blocks_before_after_pairs" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_before_after_pairs_parent_id_idx" ON "_posts_v_blocks_before_after_pairs" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_before_after_pairs_locale_idx" ON "_posts_v_blocks_before_after_pairs" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_before_after_pairs_before_idx" ON "_posts_v_blocks_before_after_pairs" USING btree ("before_id");
  CREATE INDEX "_posts_v_blocks_before_after_pairs_after_idx" ON "_posts_v_blocks_before_after_pairs" USING btree ("after_id");
  CREATE INDEX "_posts_v_blocks_before_after_order_idx" ON "_posts_v_blocks_before_after" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_before_after_parent_id_idx" ON "_posts_v_blocks_before_after" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_before_after_path_idx" ON "_posts_v_blocks_before_after" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_before_after_locale_idx" ON "_posts_v_blocks_before_after" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_treat_cards_order_idx" ON "_posts_v_blocks_treat_cards" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_treat_cards_parent_id_idx" ON "_posts_v_blocks_treat_cards" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_treat_cards_path_idx" ON "_posts_v_blocks_treat_cards" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_treat_cards_locale_idx" ON "_posts_v_blocks_treat_cards" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_post_slider_order_idx" ON "_posts_v_blocks_post_slider" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_post_slider_parent_id_idx" ON "_posts_v_blocks_post_slider" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_post_slider_path_idx" ON "_posts_v_blocks_post_slider" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_post_slider_locale_idx" ON "_posts_v_blocks_post_slider" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_post_slider_logo_idx" ON "_posts_v_blocks_post_slider" USING btree ("logo_id");
  CREATE INDEX "_posts_v_blocks_site_cta_order_idx" ON "_posts_v_blocks_site_cta" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_site_cta_parent_id_idx" ON "_posts_v_blocks_site_cta" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_site_cta_path_idx" ON "_posts_v_blocks_site_cta" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_site_cta_locale_idx" ON "_posts_v_blocks_site_cta" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_center_text_faqs_order_idx" ON "_posts_v_blocks_center_text_faqs" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_center_text_faqs_parent_id_idx" ON "_posts_v_blocks_center_text_faqs" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_center_text_faqs_locale_idx" ON "_posts_v_blocks_center_text_faqs" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_center_text_order_idx" ON "_posts_v_blocks_center_text" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_center_text_parent_id_idx" ON "_posts_v_blocks_center_text" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_center_text_path_idx" ON "_posts_v_blocks_center_text" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_center_text_locale_idx" ON "_posts_v_blocks_center_text" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_center_text_quote_by_idx" ON "_posts_v_blocks_center_text" USING btree ("quote_by_id");
  CREATE INDEX "_posts_v_blocks_results_items_symptoms_order_idx" ON "_posts_v_blocks_results_items_symptoms" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_results_items_symptoms_parent_id_idx" ON "_posts_v_blocks_results_items_symptoms" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_results_items_symptoms_locale_idx" ON "_posts_v_blocks_results_items_symptoms" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_results_items_symptoms_icon_idx" ON "_posts_v_blocks_results_items_symptoms" USING btree ("icon_id");
  CREATE INDEX "_posts_v_blocks_results_items_order_idx" ON "_posts_v_blocks_results_items" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_results_items_parent_id_idx" ON "_posts_v_blocks_results_items" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_results_items_locale_idx" ON "_posts_v_blocks_results_items" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_results_items_source_logo_idx" ON "_posts_v_blocks_results_items" USING btree ("source_logo_id");
  CREATE INDEX "_posts_v_blocks_results_items_before_idx" ON "_posts_v_blocks_results_items" USING btree ("before_id");
  CREATE INDEX "_posts_v_blocks_results_items_after_idx" ON "_posts_v_blocks_results_items" USING btree ("after_id");
  CREATE INDEX "_posts_v_blocks_results_order_idx" ON "_posts_v_blocks_results" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_results_parent_id_idx" ON "_posts_v_blocks_results" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_results_path_idx" ON "_posts_v_blocks_results" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_results_locale_idx" ON "_posts_v_blocks_results" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_state_sites_order_idx" ON "_posts_v_blocks_state_sites" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_state_sites_parent_id_idx" ON "_posts_v_blocks_state_sites" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_state_sites_path_idx" ON "_posts_v_blocks_state_sites" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_state_sites_locale_idx" ON "_posts_v_blocks_state_sites" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_state_sites_state_idx" ON "_posts_v_blocks_state_sites" USING btree ("state_id");
  CREATE INDEX "_posts_v_blocks_state_docs_order_idx" ON "_posts_v_blocks_state_docs" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_state_docs_parent_id_idx" ON "_posts_v_blocks_state_docs" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_state_docs_path_idx" ON "_posts_v_blocks_state_docs" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_state_docs_locale_idx" ON "_posts_v_blocks_state_docs" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_state_docs_state_idx" ON "_posts_v_blocks_state_docs" USING btree ("state_id");
  CREATE INDEX "_posts_v_blocks_loc_accord_areas_order_idx" ON "_posts_v_blocks_loc_accord_areas" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_loc_accord_areas_parent_id_idx" ON "_posts_v_blocks_loc_accord_areas" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_loc_accord_areas_locale_idx" ON "_posts_v_blocks_loc_accord_areas" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_loc_accord_areas_state_idx" ON "_posts_v_blocks_loc_accord_areas" USING btree ("state_id");
  CREATE INDEX "_posts_v_blocks_loc_accord_order_idx" ON "_posts_v_blocks_loc_accord" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_loc_accord_parent_id_idx" ON "_posts_v_blocks_loc_accord" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_loc_accord_path_idx" ON "_posts_v_blocks_loc_accord" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_loc_accord_locale_idx" ON "_posts_v_blocks_loc_accord" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_clinic_info_order_idx" ON "_posts_v_blocks_clinic_info" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_clinic_info_parent_id_idx" ON "_posts_v_blocks_clinic_info" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_clinic_info_path_idx" ON "_posts_v_blocks_clinic_info" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_clinic_info_locale_idx" ON "_posts_v_blocks_clinic_info" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_clinic_info_clinic_idx" ON "_posts_v_blocks_clinic_info" USING btree ("clinic_id");
  CREATE INDEX "_posts_v_blocks_clinic_info_accredit_accredit_image_idx" ON "_posts_v_blocks_clinic_info" USING btree ("accredit_image_id");
  CREATE INDEX "_posts_v_blocks_quiz_demo_order_idx" ON "_posts_v_blocks_quiz_demo" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_quiz_demo_parent_id_idx" ON "_posts_v_blocks_quiz_demo" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_quiz_demo_path_idx" ON "_posts_v_blocks_quiz_demo" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_quiz_demo_locale_idx" ON "_posts_v_blocks_quiz_demo" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_trending_order_idx" ON "_posts_v_blocks_trending" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_trending_parent_id_idx" ON "_posts_v_blocks_trending" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_trending_path_idx" ON "_posts_v_blocks_trending" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_trending_locale_idx" ON "_posts_v_blocks_trending" USING btree ("_locale");
  CREATE INDEX "_posts_v_blocks_blog_list_order_idx" ON "_posts_v_blocks_blog_list" USING btree ("_order");
  CREATE INDEX "_posts_v_blocks_blog_list_parent_id_idx" ON "_posts_v_blocks_blog_list" USING btree ("_parent_id");
  CREATE INDEX "_posts_v_blocks_blog_list_path_idx" ON "_posts_v_blocks_blog_list" USING btree ("_path");
  CREATE INDEX "_posts_v_blocks_blog_list_locale_idx" ON "_posts_v_blocks_blog_list" USING btree ("_locale");
  CREATE INDEX "_posts_v_texts_order_parent" ON "_posts_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_posts_v_texts_locale_parent" ON "_posts_v_texts" USING btree ("locale","parent_id");
  CREATE INDEX "presets_blocks_image_hero_crumbs_order_idx" ON "presets_blocks_image_hero_crumbs" USING btree ("_order");
  CREATE INDEX "presets_blocks_image_hero_crumbs_parent_id_idx" ON "presets_blocks_image_hero_crumbs" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_image_hero_order_idx" ON "presets_blocks_image_hero" USING btree ("_order");
  CREATE INDEX "presets_blocks_image_hero_parent_id_idx" ON "presets_blocks_image_hero" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_image_hero_path_idx" ON "presets_blocks_image_hero" USING btree ("_path");
  CREATE INDEX "presets_blocks_image_hero_image_idx" ON "presets_blocks_image_hero" USING btree ("image_id");
  CREATE INDEX "presets_blocks_image_hero_mobile_image_idx" ON "presets_blocks_image_hero" USING btree ("mobile_image_id");
  CREATE INDEX "presets_blocks_simple_hero_order_idx" ON "presets_blocks_simple_hero" USING btree ("_order");
  CREATE INDEX "presets_blocks_simple_hero_parent_id_idx" ON "presets_blocks_simple_hero" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_simple_hero_path_idx" ON "presets_blocks_simple_hero" USING btree ("_path");
  CREATE INDEX "presets_blocks_blog_hero_order_idx" ON "presets_blocks_blog_hero" USING btree ("_order");
  CREATE INDEX "presets_blocks_blog_hero_parent_id_idx" ON "presets_blocks_blog_hero" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_blog_hero_path_idx" ON "presets_blocks_blog_hero" USING btree ("_path");
  CREATE INDEX "presets_blocks_blog_hero_logo_idx" ON "presets_blocks_blog_hero" USING btree ("logo_id");
  CREATE INDEX "presets_blocks_blog_hero_post_idx" ON "presets_blocks_blog_hero" USING btree ("post_id");
  CREATE INDEX "presets_blocks_center_text_faqs_order_idx" ON "presets_blocks_center_text_faqs" USING btree ("_order");
  CREATE INDEX "presets_blocks_center_text_faqs_parent_id_idx" ON "presets_blocks_center_text_faqs" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_center_text_order_idx" ON "presets_blocks_center_text" USING btree ("_order");
  CREATE INDEX "presets_blocks_center_text_parent_id_idx" ON "presets_blocks_center_text" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_center_text_path_idx" ON "presets_blocks_center_text" USING btree ("_path");
  CREATE INDEX "presets_blocks_center_text_quote_by_idx" ON "presets_blocks_center_text" USING btree ("quote_by_id");
  CREATE INDEX "presets_blocks_sticky_media_chapters_order_idx" ON "presets_blocks_sticky_media_chapters" USING btree ("_order");
  CREATE INDEX "presets_blocks_sticky_media_chapters_parent_id_idx" ON "presets_blocks_sticky_media_chapters" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_sticky_media_chapters_image_idx" ON "presets_blocks_sticky_media_chapters" USING btree ("image_id");
  CREATE INDEX "presets_blocks_sticky_media_order_idx" ON "presets_blocks_sticky_media" USING btree ("_order");
  CREATE INDEX "presets_blocks_sticky_media_parent_id_idx" ON "presets_blocks_sticky_media" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_sticky_media_path_idx" ON "presets_blocks_sticky_media" USING btree ("_path");
  CREATE INDEX "presets_blocks_results_items_symptoms_order_idx" ON "presets_blocks_results_items_symptoms" USING btree ("_order");
  CREATE INDEX "presets_blocks_results_items_symptoms_parent_id_idx" ON "presets_blocks_results_items_symptoms" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_results_items_symptoms_icon_idx" ON "presets_blocks_results_items_symptoms" USING btree ("icon_id");
  CREATE INDEX "presets_blocks_results_items_order_idx" ON "presets_blocks_results_items" USING btree ("_order");
  CREATE INDEX "presets_blocks_results_items_parent_id_idx" ON "presets_blocks_results_items" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_results_items_source_logo_idx" ON "presets_blocks_results_items" USING btree ("source_logo_id");
  CREATE INDEX "presets_blocks_results_items_before_idx" ON "presets_blocks_results_items" USING btree ("before_id");
  CREATE INDEX "presets_blocks_results_items_after_idx" ON "presets_blocks_results_items" USING btree ("after_id");
  CREATE INDEX "presets_blocks_results_order_idx" ON "presets_blocks_results" USING btree ("_order");
  CREATE INDEX "presets_blocks_results_parent_id_idx" ON "presets_blocks_results" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_results_path_idx" ON "presets_blocks_results" USING btree ("_path");
  CREATE INDEX "presets_blocks_state_sites_order_idx" ON "presets_blocks_state_sites" USING btree ("_order");
  CREATE INDEX "presets_blocks_state_sites_parent_id_idx" ON "presets_blocks_state_sites" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_state_sites_path_idx" ON "presets_blocks_state_sites" USING btree ("_path");
  CREATE INDEX "presets_blocks_state_sites_state_idx" ON "presets_blocks_state_sites" USING btree ("state_id");
  CREATE INDEX "presets_blocks_state_docs_order_idx" ON "presets_blocks_state_docs" USING btree ("_order");
  CREATE INDEX "presets_blocks_state_docs_parent_id_idx" ON "presets_blocks_state_docs" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_state_docs_path_idx" ON "presets_blocks_state_docs" USING btree ("_path");
  CREATE INDEX "presets_blocks_state_docs_state_idx" ON "presets_blocks_state_docs" USING btree ("state_id");
  CREATE INDEX "presets_blocks_loc_accord_areas_order_idx" ON "presets_blocks_loc_accord_areas" USING btree ("_order");
  CREATE INDEX "presets_blocks_loc_accord_areas_parent_id_idx" ON "presets_blocks_loc_accord_areas" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_loc_accord_areas_state_idx" ON "presets_blocks_loc_accord_areas" USING btree ("state_id");
  CREATE INDEX "presets_blocks_loc_accord_order_idx" ON "presets_blocks_loc_accord" USING btree ("_order");
  CREATE INDEX "presets_blocks_loc_accord_parent_id_idx" ON "presets_blocks_loc_accord" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_loc_accord_path_idx" ON "presets_blocks_loc_accord" USING btree ("_path");
  CREATE INDEX "presets_blocks_clinic_info_order_idx" ON "presets_blocks_clinic_info" USING btree ("_order");
  CREATE INDEX "presets_blocks_clinic_info_parent_id_idx" ON "presets_blocks_clinic_info" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_clinic_info_path_idx" ON "presets_blocks_clinic_info" USING btree ("_path");
  CREATE INDEX "presets_blocks_clinic_info_clinic_idx" ON "presets_blocks_clinic_info" USING btree ("clinic_id");
  CREATE INDEX "presets_blocks_clinic_info_accredit_accredit_image_idx" ON "presets_blocks_clinic_info" USING btree ("accredit_image_id");
  CREATE INDEX "presets_blocks_quiz_demo_order_idx" ON "presets_blocks_quiz_demo" USING btree ("_order");
  CREATE INDEX "presets_blocks_quiz_demo_parent_id_idx" ON "presets_blocks_quiz_demo" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_quiz_demo_path_idx" ON "presets_blocks_quiz_demo" USING btree ("_path");
  CREATE INDEX "presets_blocks_trending_order_idx" ON "presets_blocks_trending" USING btree ("_order");
  CREATE INDEX "presets_blocks_trending_parent_id_idx" ON "presets_blocks_trending" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_trending_path_idx" ON "presets_blocks_trending" USING btree ("_path");
  CREATE INDEX "presets_blocks_blog_list_order_idx" ON "presets_blocks_blog_list" USING btree ("_order");
  CREATE INDEX "presets_blocks_blog_list_parent_id_idx" ON "presets_blocks_blog_list" USING btree ("_parent_id");
  CREATE INDEX "presets_blocks_blog_list_path_idx" ON "presets_blocks_blog_list" USING btree ("_path");
  ALTER TABLE "page_blocks_icon_list" ADD CONSTRAINT "page_blocks_icon_list_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_blocks_cond_grid" ADD CONSTRAINT "page_blocks_cond_grid_video_cover_id_media_id_fk" FOREIGN KEY ("video_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "page_rels" ADD CONSTRAINT "page_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_icon_list" ADD CONSTRAINT "_page_v_blocks_icon_list_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_blocks_cond_grid" ADD CONSTRAINT "_page_v_blocks_cond_grid_video_cover_id_media_id_fk" FOREIGN KEY ("video_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_page_v_rels" ADD CONSTRAINT "_page_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "states_blocks_icon_list" ADD CONSTRAINT "states_blocks_icon_list_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_blocks_cond_grid" ADD CONSTRAINT "states_blocks_cond_grid_video_cover_id_media_id_fk" FOREIGN KEY ("video_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states" ADD CONSTRAINT "states_hero_mobile_image_id_media_id_fk" FOREIGN KEY ("hero_mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_locales" ADD CONSTRAINT "states_locales_hero_badge_id_media_id_fk" FOREIGN KEY ("hero_badge_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "states_rels" ADD CONSTRAINT "states_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_icon_list" ADD CONSTRAINT "_states_v_blocks_icon_list_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_blocks_cond_grid" ADD CONSTRAINT "_states_v_blocks_cond_grid_video_cover_id_media_id_fk" FOREIGN KEY ("video_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v" ADD CONSTRAINT "_states_v_version_hero_mobile_image_id_media_id_fk" FOREIGN KEY ("version_hero_mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_locales" ADD CONSTRAINT "_states_v_locales_version_hero_badge_id_media_id_fk" FOREIGN KEY ("version_hero_badge_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_states_v_rels" ADD CONSTRAINT "_states_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "clinics_blocks_icon_list" ADD CONSTRAINT "clinics_blocks_icon_list_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_blocks_cond_grid" ADD CONSTRAINT "clinics_blocks_cond_grid_video_cover_id_media_id_fk" FOREIGN KEY ("video_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "clinics_rels" ADD CONSTRAINT "clinics_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_icon_list" ADD CONSTRAINT "_clinics_v_blocks_icon_list_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_blocks_cond_grid" ADD CONSTRAINT "_clinics_v_blocks_cond_grid_video_cover_id_media_id_fk" FOREIGN KEY ("video_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_clinics_v_rels" ADD CONSTRAINT "_clinics_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "doctors_blocks_icon_list" ADD CONSTRAINT "doctors_blocks_icon_list_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_blocks_cond_grid" ADD CONSTRAINT "doctors_blocks_cond_grid_video_cover_id_media_id_fk" FOREIGN KEY ("video_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "doctors_rels" ADD CONSTRAINT "doctors_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_icon_list" ADD CONSTRAINT "_doctors_v_blocks_icon_list_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_blocks_cond_grid" ADD CONSTRAINT "_doctors_v_blocks_cond_grid_video_cover_id_media_id_fk" FOREIGN KEY ("video_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_doctors_v_rels" ADD CONSTRAINT "_doctors_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "treatments_blocks_icon_list" ADD CONSTRAINT "treatments_blocks_icon_list_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_blocks_cond_grid" ADD CONSTRAINT "treatments_blocks_cond_grid_video_cover_id_media_id_fk" FOREIGN KEY ("video_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "treatments_rels" ADD CONSTRAINT "treatments_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_icon_list" ADD CONSTRAINT "_treatments_v_blocks_icon_list_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_blocks_cond_grid" ADD CONSTRAINT "_treatments_v_blocks_cond_grid_video_cover_id_media_id_fk" FOREIGN KEY ("video_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_treatments_v_rels" ADD CONSTRAINT "_treatments_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "conditions_blocks_icon_list" ADD CONSTRAINT "conditions_blocks_icon_list_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_blocks_cond_grid" ADD CONSTRAINT "conditions_blocks_cond_grid_video_cover_id_media_id_fk" FOREIGN KEY ("video_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions" ADD CONSTRAINT "conditions_hero_mobile_image_id_media_id_fk" FOREIGN KEY ("hero_mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conditions_rels" ADD CONSTRAINT "conditions_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_icon_list" ADD CONSTRAINT "_conditions_v_blocks_icon_list_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_blocks_cond_grid" ADD CONSTRAINT "_conditions_v_blocks_cond_grid_video_cover_id_media_id_fk" FOREIGN KEY ("video_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v" ADD CONSTRAINT "_conditions_v_version_hero_mobile_image_id_media_id_fk" FOREIGN KEY ("version_hero_mobile_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_conditions_v_rels" ADD CONSTRAINT "_conditions_v_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_states_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_clinics_fk" FOREIGN KEY ("clinics_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_doctors_fk" FOREIGN KEY ("doctors_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_treatments_fk" FOREIGN KEY ("treatments_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "posts_rels" ADD CONSTRAINT "posts_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_states_fk" FOREIGN KEY ("states_id") REFERENCES "public"."states"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_clinics_fk" FOREIGN KEY ("clinics_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_doctors_fk" FOREIGN KEY ("doctors_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_treatments_fk" FOREIGN KEY ("treatments_id") REFERENCES "public"."treatments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_conditions_fk" FOREIGN KEY ("conditions_id") REFERENCES "public"."conditions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_posts_v_rels" ADD CONSTRAINT "_posts_v_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_icon_list" ADD CONSTRAINT "presets_blocks_icon_list_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_blocks_cond_grid" ADD CONSTRAINT "presets_blocks_cond_grid_video_cover_id_media_id_fk" FOREIGN KEY ("video_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "presets_rels" ADD CONSTRAINT "presets_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "page_blocks_icon_list_image_idx" ON "page_blocks_icon_list" USING btree ("image_id");
  CREATE INDEX "page_blocks_cond_grid_video_cover_idx" ON "page_blocks_cond_grid" USING btree ("video_cover_id");
  CREATE INDEX "page_rels_categories_id_idx" ON "page_rels" USING btree ("categories_id","locale");
  CREATE INDEX "_page_v_blocks_icon_list_image_idx" ON "_page_v_blocks_icon_list" USING btree ("image_id");
  CREATE INDEX "_page_v_blocks_cond_grid_video_cover_idx" ON "_page_v_blocks_cond_grid" USING btree ("video_cover_id");
  CREATE INDEX "_page_v_rels_categories_id_idx" ON "_page_v_rels" USING btree ("categories_id","locale");
  CREATE INDEX "states_blocks_icon_list_image_idx" ON "states_blocks_icon_list" USING btree ("image_id");
  CREATE INDEX "states_blocks_cond_grid_video_cover_idx" ON "states_blocks_cond_grid" USING btree ("video_cover_id");
  CREATE INDEX "states_hero_mobile_image_idx" ON "states" USING btree ("hero_mobile_image_id");
  CREATE INDEX "states_hero_badge_idx" ON "states_locales" USING btree ("hero_badge_id","_locale");
  CREATE INDEX "states_rels_categories_id_idx" ON "states_rels" USING btree ("categories_id","locale");
  CREATE INDEX "_states_v_blocks_icon_list_image_idx" ON "_states_v_blocks_icon_list" USING btree ("image_id");
  CREATE INDEX "_states_v_blocks_cond_grid_video_cover_idx" ON "_states_v_blocks_cond_grid" USING btree ("video_cover_id");
  CREATE INDEX "_states_v_version_version_hero_mobile_image_idx" ON "_states_v" USING btree ("version_hero_mobile_image_id");
  CREATE INDEX "_states_v_version_version_hero_badge_idx" ON "_states_v_locales" USING btree ("version_hero_badge_id","_locale");
  CREATE INDEX "_states_v_rels_categories_id_idx" ON "_states_v_rels" USING btree ("categories_id","locale");
  CREATE INDEX "clinics_blocks_icon_list_image_idx" ON "clinics_blocks_icon_list" USING btree ("image_id");
  CREATE INDEX "clinics_blocks_cond_grid_video_cover_idx" ON "clinics_blocks_cond_grid" USING btree ("video_cover_id");
  CREATE INDEX "clinics_rels_categories_id_idx" ON "clinics_rels" USING btree ("categories_id","locale");
  CREATE INDEX "_clinics_v_blocks_icon_list_image_idx" ON "_clinics_v_blocks_icon_list" USING btree ("image_id");
  CREATE INDEX "_clinics_v_blocks_cond_grid_video_cover_idx" ON "_clinics_v_blocks_cond_grid" USING btree ("video_cover_id");
  CREATE INDEX "_clinics_v_rels_categories_id_idx" ON "_clinics_v_rels" USING btree ("categories_id","locale");
  CREATE INDEX "doctors_blocks_icon_list_image_idx" ON "doctors_blocks_icon_list" USING btree ("image_id");
  CREATE INDEX "doctors_blocks_cond_grid_video_cover_idx" ON "doctors_blocks_cond_grid" USING btree ("video_cover_id");
  CREATE INDEX "doctors_rels_categories_id_idx" ON "doctors_rels" USING btree ("categories_id","locale");
  CREATE INDEX "_doctors_v_blocks_icon_list_image_idx" ON "_doctors_v_blocks_icon_list" USING btree ("image_id");
  CREATE INDEX "_doctors_v_blocks_cond_grid_video_cover_idx" ON "_doctors_v_blocks_cond_grid" USING btree ("video_cover_id");
  CREATE INDEX "_doctors_v_rels_categories_id_idx" ON "_doctors_v_rels" USING btree ("categories_id","locale");
  CREATE INDEX "treatments_blocks_icon_list_image_idx" ON "treatments_blocks_icon_list" USING btree ("image_id");
  CREATE INDEX "treatments_blocks_cond_grid_video_cover_idx" ON "treatments_blocks_cond_grid" USING btree ("video_cover_id");
  CREATE INDEX "treatments_rels_categories_id_idx" ON "treatments_rels" USING btree ("categories_id","locale");
  CREATE INDEX "_treatments_v_blocks_icon_list_image_idx" ON "_treatments_v_blocks_icon_list" USING btree ("image_id");
  CREATE INDEX "_treatments_v_blocks_cond_grid_video_cover_idx" ON "_treatments_v_blocks_cond_grid" USING btree ("video_cover_id");
  CREATE INDEX "_treatments_v_rels_categories_id_idx" ON "_treatments_v_rels" USING btree ("categories_id","locale");
  CREATE INDEX "conditions_blocks_icon_list_image_idx" ON "conditions_blocks_icon_list" USING btree ("image_id");
  CREATE INDEX "conditions_blocks_cond_grid_video_cover_idx" ON "conditions_blocks_cond_grid" USING btree ("video_cover_id");
  CREATE INDEX "conditions_hero_mobile_image_idx" ON "conditions" USING btree ("hero_mobile_image_id");
  CREATE INDEX "conditions_rels_categories_id_idx" ON "conditions_rels" USING btree ("categories_id","locale");
  CREATE INDEX "_conditions_v_blocks_icon_list_image_idx" ON "_conditions_v_blocks_icon_list" USING btree ("image_id");
  CREATE INDEX "_conditions_v_blocks_cond_grid_video_cover_idx" ON "_conditions_v_blocks_cond_grid" USING btree ("video_cover_id");
  CREATE INDEX "_conditions_v_version_version_hero_mobile_image_idx" ON "_conditions_v" USING btree ("version_hero_mobile_image_id");
  CREATE INDEX "_conditions_v_rels_categories_id_idx" ON "_conditions_v_rels" USING btree ("categories_id","locale");
  CREATE INDEX "posts_rels_states_id_idx" ON "posts_rels" USING btree ("states_id","locale");
  CREATE INDEX "posts_rels_clinics_id_idx" ON "posts_rels" USING btree ("clinics_id","locale");
  CREATE INDEX "posts_rels_doctors_id_idx" ON "posts_rels" USING btree ("doctors_id","locale");
  CREATE INDEX "posts_rels_treatments_id_idx" ON "posts_rels" USING btree ("treatments_id","locale");
  CREATE INDEX "posts_rels_conditions_id_idx" ON "posts_rels" USING btree ("conditions_id","locale");
  CREATE INDEX "posts_rels_testimonials_id_idx" ON "posts_rels" USING btree ("testimonials_id","locale");
  CREATE INDEX "_posts_v_rels_states_id_idx" ON "_posts_v_rels" USING btree ("states_id","locale");
  CREATE INDEX "_posts_v_rels_clinics_id_idx" ON "_posts_v_rels" USING btree ("clinics_id","locale");
  CREATE INDEX "_posts_v_rels_doctors_id_idx" ON "_posts_v_rels" USING btree ("doctors_id","locale");
  CREATE INDEX "_posts_v_rels_treatments_id_idx" ON "_posts_v_rels" USING btree ("treatments_id","locale");
  CREATE INDEX "_posts_v_rels_conditions_id_idx" ON "_posts_v_rels" USING btree ("conditions_id","locale");
  CREATE INDEX "_posts_v_rels_testimonials_id_idx" ON "_posts_v_rels" USING btree ("testimonials_id","locale");
  CREATE INDEX "testimonials_doctor_idx" ON "testimonials" USING btree ("doctor_id");
  CREATE INDEX "presets_blocks_icon_list_image_idx" ON "presets_blocks_icon_list" USING btree ("image_id");
  CREATE INDEX "presets_blocks_cond_grid_video_cover_idx" ON "presets_blocks_cond_grid" USING btree ("video_cover_id");
  CREATE INDEX "presets_rels_categories_id_idx" ON "presets_rels" USING btree ("categories_id","locale");
  INSERT INTO "states_locales" ("name", "_locale", "_parent_id") SELECT "name", 'en', "id" FROM "states" ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET "name" = EXCLUDED."name";
  INSERT INTO "doctors_locales" ("name", "_locale", "_parent_id") SELECT "name", 'en', "id" FROM "doctors" ON CONFLICT ("_locale", "_parent_id") DO UPDATE SET "name" = EXCLUDED."name";
  ALTER TABLE "states" DROP COLUMN "name";
  ALTER TABLE "_states_v" DROP COLUMN "version_name";
  ALTER TABLE "doctors" DROP COLUMN "name";
  ALTER TABLE "doctors_locales" DROP COLUMN "bio";
  ALTER TABLE "_doctors_v" DROP COLUMN "version_name";
  ALTER TABLE "_doctors_v_locales" DROP COLUMN "version_bio";
  ALTER TABLE "conditions_locales" DROP COLUMN "hero_title";
  ALTER TABLE "conditions_locales" DROP COLUMN "hero_intro";
  ALTER TABLE "_conditions_v_locales" DROP COLUMN "version_hero_title";
  ALTER TABLE "_conditions_v_locales" DROP COLUMN "version_hero_intro";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "page_blocks_image_hero_crumbs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_image_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_simple_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_blog_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_center_text_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_center_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "stky_chapters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "stky" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_results_items_symptoms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_results_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_results" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_state_sites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_state_docs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_loc_accord_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_loc_accord" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_clinic_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_quiz_demo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_trending" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "page_blocks_blog_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_image_hero_crumbs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_image_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_simple_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_blog_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_center_text_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_center_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_stky_v_chapters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_stky_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_results_items_symptoms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_results_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_results" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_state_sites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_state_docs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_loc_accord_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_loc_accord" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_clinic_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_quiz_demo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_trending" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_page_v_blocks_blog_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_center_text_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_center_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_results_items_symptoms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_results_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_results" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_state_sites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_state_docs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_loc_accord_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_loc_accord" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_clinic_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_quiz_demo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_trending" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "states_blocks_blog_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_center_text_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_center_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_results_items_symptoms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_results_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_results" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_state_sites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_state_docs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_loc_accord_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_loc_accord" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_clinic_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_quiz_demo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_trending" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_states_v_blocks_blog_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_center_text_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_center_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_results_items_symptoms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_results_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_results" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_state_sites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_state_docs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_loc_accord_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_loc_accord" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_clinic_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_quiz_demo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_trending" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "clinics_blocks_blog_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_center_text_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_center_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_results_items_symptoms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_results_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_results" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_state_sites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_state_docs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_loc_accord_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_loc_accord" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_clinic_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_quiz_demo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_trending" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_clinics_v_blocks_blog_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_center_text_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_center_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_results_items_symptoms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_results_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_results" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_state_sites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_state_docs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_loc_accord_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_loc_accord" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_clinic_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_quiz_demo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_trending" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "doctors_blocks_blog_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_center_text_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_center_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_results_items_symptoms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_results_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_results" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_state_sites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_state_docs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_loc_accord_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_loc_accord" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_clinic_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_quiz_demo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_trending" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_doctors_v_blocks_blog_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_center_text_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_center_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_results_items_symptoms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_results_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_results" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_state_sites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_state_docs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_loc_accord_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_loc_accord" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_clinic_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_quiz_demo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_trending" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "treatments_blocks_blog_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_center_text_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_center_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_results_items_symptoms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_results_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_results" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_state_sites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_state_docs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_loc_accord_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_loc_accord" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_clinic_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_quiz_demo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_trending" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_treatments_v_blocks_blog_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_center_text_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_center_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_results_items_symptoms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_results_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_results" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_state_sites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_state_docs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_loc_accord_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_loc_accord" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_clinic_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_quiz_demo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_trending" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "conditions_blocks_blog_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_center_text_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_center_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_results_items_symptoms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_results_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_results" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_state_sites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_state_docs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_loc_accord_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_loc_accord" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_clinic_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_quiz_demo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_trending" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_conditions_v_blocks_blog_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "authors_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_logo_strip_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_logo_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_icon_list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_icon_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_media_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_insurance_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_insurance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_doc_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_rev_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_cond_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_before_after_pairs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_before_after" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_treat_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_post_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_site_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_center_text_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_center_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_results_items_symptoms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_results_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_results" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_state_sites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_state_docs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_loc_accord_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_loc_accord" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_clinic_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_quiz_demo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_trending" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_blocks_blog_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "posts_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_logo_strip_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_logo_strip" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_icon_list_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_icon_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_media_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_insurance_logos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_insurance" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_doc_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_rev_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_cond_grid" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_before_after_pairs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_before_after" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_treat_cards" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_post_slider" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_site_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_center_text_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_center_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_results_items_symptoms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_results_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_results" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_state_sites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_state_docs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_loc_accord_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_loc_accord" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_clinic_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_quiz_demo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_trending" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_blocks_blog_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_posts_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_image_hero_crumbs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_image_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_simple_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_blog_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_center_text_faqs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_center_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_sticky_media_chapters" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_sticky_media" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_results_items_symptoms" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_results_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_results" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_state_sites" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_state_docs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_loc_accord_areas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_loc_accord" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_clinic_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_quiz_demo" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_trending" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "presets_blocks_blog_list" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "page_blocks_image_hero_crumbs" CASCADE;
  DROP TABLE "page_blocks_image_hero" CASCADE;
  DROP TABLE "page_blocks_simple_hero" CASCADE;
  DROP TABLE "page_blocks_blog_hero" CASCADE;
  DROP TABLE "page_blocks_center_text_faqs" CASCADE;
  DROP TABLE "page_blocks_center_text" CASCADE;
  DROP TABLE "stky_chapters" CASCADE;
  DROP TABLE "stky" CASCADE;
  DROP TABLE "page_blocks_results_items_symptoms" CASCADE;
  DROP TABLE "page_blocks_results_items" CASCADE;
  DROP TABLE "page_blocks_results" CASCADE;
  DROP TABLE "page_blocks_state_sites" CASCADE;
  DROP TABLE "page_blocks_state_docs" CASCADE;
  DROP TABLE "page_blocks_loc_accord_areas" CASCADE;
  DROP TABLE "page_blocks_loc_accord" CASCADE;
  DROP TABLE "page_blocks_clinic_info" CASCADE;
  DROP TABLE "page_blocks_quiz_demo" CASCADE;
  DROP TABLE "page_blocks_trending" CASCADE;
  DROP TABLE "page_blocks_blog_list" CASCADE;
  DROP TABLE "_page_v_blocks_image_hero_crumbs" CASCADE;
  DROP TABLE "_page_v_blocks_image_hero" CASCADE;
  DROP TABLE "_page_v_blocks_simple_hero" CASCADE;
  DROP TABLE "_page_v_blocks_blog_hero" CASCADE;
  DROP TABLE "_page_v_blocks_center_text_faqs" CASCADE;
  DROP TABLE "_page_v_blocks_center_text" CASCADE;
  DROP TABLE "_stky_v_chapters" CASCADE;
  DROP TABLE "_stky_v" CASCADE;
  DROP TABLE "_page_v_blocks_results_items_symptoms" CASCADE;
  DROP TABLE "_page_v_blocks_results_items" CASCADE;
  DROP TABLE "_page_v_blocks_results" CASCADE;
  DROP TABLE "_page_v_blocks_state_sites" CASCADE;
  DROP TABLE "_page_v_blocks_state_docs" CASCADE;
  DROP TABLE "_page_v_blocks_loc_accord_areas" CASCADE;
  DROP TABLE "_page_v_blocks_loc_accord" CASCADE;
  DROP TABLE "_page_v_blocks_clinic_info" CASCADE;
  DROP TABLE "_page_v_blocks_quiz_demo" CASCADE;
  DROP TABLE "_page_v_blocks_trending" CASCADE;
  DROP TABLE "_page_v_blocks_blog_list" CASCADE;
  DROP TABLE "states_blocks_center_text_faqs" CASCADE;
  DROP TABLE "states_blocks_center_text" CASCADE;
  DROP TABLE "states_blocks_results_items_symptoms" CASCADE;
  DROP TABLE "states_blocks_results_items" CASCADE;
  DROP TABLE "states_blocks_results" CASCADE;
  DROP TABLE "states_blocks_state_sites" CASCADE;
  DROP TABLE "states_blocks_state_docs" CASCADE;
  DROP TABLE "states_blocks_loc_accord_areas" CASCADE;
  DROP TABLE "states_blocks_loc_accord" CASCADE;
  DROP TABLE "states_blocks_clinic_info" CASCADE;
  DROP TABLE "states_blocks_quiz_demo" CASCADE;
  DROP TABLE "states_blocks_trending" CASCADE;
  DROP TABLE "states_blocks_blog_list" CASCADE;
  DROP TABLE "_states_v_blocks_center_text_faqs" CASCADE;
  DROP TABLE "_states_v_blocks_center_text" CASCADE;
  DROP TABLE "_states_v_blocks_results_items_symptoms" CASCADE;
  DROP TABLE "_states_v_blocks_results_items" CASCADE;
  DROP TABLE "_states_v_blocks_results" CASCADE;
  DROP TABLE "_states_v_blocks_state_sites" CASCADE;
  DROP TABLE "_states_v_blocks_state_docs" CASCADE;
  DROP TABLE "_states_v_blocks_loc_accord_areas" CASCADE;
  DROP TABLE "_states_v_blocks_loc_accord" CASCADE;
  DROP TABLE "_states_v_blocks_clinic_info" CASCADE;
  DROP TABLE "_states_v_blocks_quiz_demo" CASCADE;
  DROP TABLE "_states_v_blocks_trending" CASCADE;
  DROP TABLE "_states_v_blocks_blog_list" CASCADE;
  DROP TABLE "clinics_blocks_center_text_faqs" CASCADE;
  DROP TABLE "clinics_blocks_center_text" CASCADE;
  DROP TABLE "clinics_blocks_results_items_symptoms" CASCADE;
  DROP TABLE "clinics_blocks_results_items" CASCADE;
  DROP TABLE "clinics_blocks_results" CASCADE;
  DROP TABLE "clinics_blocks_state_sites" CASCADE;
  DROP TABLE "clinics_blocks_state_docs" CASCADE;
  DROP TABLE "clinics_blocks_loc_accord_areas" CASCADE;
  DROP TABLE "clinics_blocks_loc_accord" CASCADE;
  DROP TABLE "clinics_blocks_clinic_info" CASCADE;
  DROP TABLE "clinics_blocks_quiz_demo" CASCADE;
  DROP TABLE "clinics_blocks_trending" CASCADE;
  DROP TABLE "clinics_blocks_blog_list" CASCADE;
  DROP TABLE "_clinics_v_blocks_center_text_faqs" CASCADE;
  DROP TABLE "_clinics_v_blocks_center_text" CASCADE;
  DROP TABLE "_clinics_v_blocks_results_items_symptoms" CASCADE;
  DROP TABLE "_clinics_v_blocks_results_items" CASCADE;
  DROP TABLE "_clinics_v_blocks_results" CASCADE;
  DROP TABLE "_clinics_v_blocks_state_sites" CASCADE;
  DROP TABLE "_clinics_v_blocks_state_docs" CASCADE;
  DROP TABLE "_clinics_v_blocks_loc_accord_areas" CASCADE;
  DROP TABLE "_clinics_v_blocks_loc_accord" CASCADE;
  DROP TABLE "_clinics_v_blocks_clinic_info" CASCADE;
  DROP TABLE "_clinics_v_blocks_quiz_demo" CASCADE;
  DROP TABLE "_clinics_v_blocks_trending" CASCADE;
  DROP TABLE "_clinics_v_blocks_blog_list" CASCADE;
  DROP TABLE "doctors_blocks_center_text_faqs" CASCADE;
  DROP TABLE "doctors_blocks_center_text" CASCADE;
  DROP TABLE "doctors_blocks_results_items_symptoms" CASCADE;
  DROP TABLE "doctors_blocks_results_items" CASCADE;
  DROP TABLE "doctors_blocks_results" CASCADE;
  DROP TABLE "doctors_blocks_state_sites" CASCADE;
  DROP TABLE "doctors_blocks_state_docs" CASCADE;
  DROP TABLE "doctors_blocks_loc_accord_areas" CASCADE;
  DROP TABLE "doctors_blocks_loc_accord" CASCADE;
  DROP TABLE "doctors_blocks_clinic_info" CASCADE;
  DROP TABLE "doctors_blocks_quiz_demo" CASCADE;
  DROP TABLE "doctors_blocks_trending" CASCADE;
  DROP TABLE "doctors_blocks_blog_list" CASCADE;
  DROP TABLE "_doctors_v_blocks_center_text_faqs" CASCADE;
  DROP TABLE "_doctors_v_blocks_center_text" CASCADE;
  DROP TABLE "_doctors_v_blocks_results_items_symptoms" CASCADE;
  DROP TABLE "_doctors_v_blocks_results_items" CASCADE;
  DROP TABLE "_doctors_v_blocks_results" CASCADE;
  DROP TABLE "_doctors_v_blocks_state_sites" CASCADE;
  DROP TABLE "_doctors_v_blocks_state_docs" CASCADE;
  DROP TABLE "_doctors_v_blocks_loc_accord_areas" CASCADE;
  DROP TABLE "_doctors_v_blocks_loc_accord" CASCADE;
  DROP TABLE "_doctors_v_blocks_clinic_info" CASCADE;
  DROP TABLE "_doctors_v_blocks_quiz_demo" CASCADE;
  DROP TABLE "_doctors_v_blocks_trending" CASCADE;
  DROP TABLE "_doctors_v_blocks_blog_list" CASCADE;
  DROP TABLE "treatments_blocks_center_text_faqs" CASCADE;
  DROP TABLE "treatments_blocks_center_text" CASCADE;
  DROP TABLE "treatments_blocks_results_items_symptoms" CASCADE;
  DROP TABLE "treatments_blocks_results_items" CASCADE;
  DROP TABLE "treatments_blocks_results" CASCADE;
  DROP TABLE "treatments_blocks_state_sites" CASCADE;
  DROP TABLE "treatments_blocks_state_docs" CASCADE;
  DROP TABLE "treatments_blocks_loc_accord_areas" CASCADE;
  DROP TABLE "treatments_blocks_loc_accord" CASCADE;
  DROP TABLE "treatments_blocks_clinic_info" CASCADE;
  DROP TABLE "treatments_blocks_quiz_demo" CASCADE;
  DROP TABLE "treatments_blocks_trending" CASCADE;
  DROP TABLE "treatments_blocks_blog_list" CASCADE;
  DROP TABLE "_treatments_v_blocks_center_text_faqs" CASCADE;
  DROP TABLE "_treatments_v_blocks_center_text" CASCADE;
  DROP TABLE "_treatments_v_blocks_results_items_symptoms" CASCADE;
  DROP TABLE "_treatments_v_blocks_results_items" CASCADE;
  DROP TABLE "_treatments_v_blocks_results" CASCADE;
  DROP TABLE "_treatments_v_blocks_state_sites" CASCADE;
  DROP TABLE "_treatments_v_blocks_state_docs" CASCADE;
  DROP TABLE "_treatments_v_blocks_loc_accord_areas" CASCADE;
  DROP TABLE "_treatments_v_blocks_loc_accord" CASCADE;
  DROP TABLE "_treatments_v_blocks_clinic_info" CASCADE;
  DROP TABLE "_treatments_v_blocks_quiz_demo" CASCADE;
  DROP TABLE "_treatments_v_blocks_trending" CASCADE;
  DROP TABLE "_treatments_v_blocks_blog_list" CASCADE;
  DROP TABLE "conditions_blocks_center_text_faqs" CASCADE;
  DROP TABLE "conditions_blocks_center_text" CASCADE;
  DROP TABLE "conditions_blocks_results_items_symptoms" CASCADE;
  DROP TABLE "conditions_blocks_results_items" CASCADE;
  DROP TABLE "conditions_blocks_results" CASCADE;
  DROP TABLE "conditions_blocks_state_sites" CASCADE;
  DROP TABLE "conditions_blocks_state_docs" CASCADE;
  DROP TABLE "conditions_blocks_loc_accord_areas" CASCADE;
  DROP TABLE "conditions_blocks_loc_accord" CASCADE;
  DROP TABLE "conditions_blocks_clinic_info" CASCADE;
  DROP TABLE "conditions_blocks_quiz_demo" CASCADE;
  DROP TABLE "conditions_blocks_trending" CASCADE;
  DROP TABLE "conditions_blocks_blog_list" CASCADE;
  DROP TABLE "_conditions_v_blocks_center_text_faqs" CASCADE;
  DROP TABLE "_conditions_v_blocks_center_text" CASCADE;
  DROP TABLE "_conditions_v_blocks_results_items_symptoms" CASCADE;
  DROP TABLE "_conditions_v_blocks_results_items" CASCADE;
  DROP TABLE "_conditions_v_blocks_results" CASCADE;
  DROP TABLE "_conditions_v_blocks_state_sites" CASCADE;
  DROP TABLE "_conditions_v_blocks_state_docs" CASCADE;
  DROP TABLE "_conditions_v_blocks_loc_accord_areas" CASCADE;
  DROP TABLE "_conditions_v_blocks_loc_accord" CASCADE;
  DROP TABLE "_conditions_v_blocks_clinic_info" CASCADE;
  DROP TABLE "_conditions_v_blocks_quiz_demo" CASCADE;
  DROP TABLE "_conditions_v_blocks_trending" CASCADE;
  DROP TABLE "_conditions_v_blocks_blog_list" CASCADE;
  DROP TABLE "authors_locales" CASCADE;
  DROP TABLE "posts_blocks_logo_strip_logos" CASCADE;
  DROP TABLE "posts_blocks_logo_strip" CASCADE;
  DROP TABLE "posts_blocks_icon_list_items" CASCADE;
  DROP TABLE "posts_blocks_icon_list" CASCADE;
  DROP TABLE "posts_blocks_media_text" CASCADE;
  DROP TABLE "posts_blocks_insurance_logos" CASCADE;
  DROP TABLE "posts_blocks_insurance" CASCADE;
  DROP TABLE "posts_blocks_doc_slider" CASCADE;
  DROP TABLE "posts_blocks_rev_slider" CASCADE;
  DROP TABLE "posts_blocks_cond_grid" CASCADE;
  DROP TABLE "posts_blocks_before_after_pairs" CASCADE;
  DROP TABLE "posts_blocks_before_after" CASCADE;
  DROP TABLE "posts_blocks_treat_cards" CASCADE;
  DROP TABLE "posts_blocks_post_slider" CASCADE;
  DROP TABLE "posts_blocks_site_cta" CASCADE;
  DROP TABLE "posts_blocks_center_text_faqs" CASCADE;
  DROP TABLE "posts_blocks_center_text" CASCADE;
  DROP TABLE "posts_blocks_results_items_symptoms" CASCADE;
  DROP TABLE "posts_blocks_results_items" CASCADE;
  DROP TABLE "posts_blocks_results" CASCADE;
  DROP TABLE "posts_blocks_state_sites" CASCADE;
  DROP TABLE "posts_blocks_state_docs" CASCADE;
  DROP TABLE "posts_blocks_loc_accord_areas" CASCADE;
  DROP TABLE "posts_blocks_loc_accord" CASCADE;
  DROP TABLE "posts_blocks_clinic_info" CASCADE;
  DROP TABLE "posts_blocks_quiz_demo" CASCADE;
  DROP TABLE "posts_blocks_trending" CASCADE;
  DROP TABLE "posts_blocks_blog_list" CASCADE;
  DROP TABLE "posts_texts" CASCADE;
  DROP TABLE "_posts_v_blocks_logo_strip_logos" CASCADE;
  DROP TABLE "_posts_v_blocks_logo_strip" CASCADE;
  DROP TABLE "_posts_v_blocks_icon_list_items" CASCADE;
  DROP TABLE "_posts_v_blocks_icon_list" CASCADE;
  DROP TABLE "_posts_v_blocks_media_text" CASCADE;
  DROP TABLE "_posts_v_blocks_insurance_logos" CASCADE;
  DROP TABLE "_posts_v_blocks_insurance" CASCADE;
  DROP TABLE "_posts_v_blocks_doc_slider" CASCADE;
  DROP TABLE "_posts_v_blocks_rev_slider" CASCADE;
  DROP TABLE "_posts_v_blocks_cond_grid" CASCADE;
  DROP TABLE "_posts_v_blocks_before_after_pairs" CASCADE;
  DROP TABLE "_posts_v_blocks_before_after" CASCADE;
  DROP TABLE "_posts_v_blocks_treat_cards" CASCADE;
  DROP TABLE "_posts_v_blocks_post_slider" CASCADE;
  DROP TABLE "_posts_v_blocks_site_cta" CASCADE;
  DROP TABLE "_posts_v_blocks_center_text_faqs" CASCADE;
  DROP TABLE "_posts_v_blocks_center_text" CASCADE;
  DROP TABLE "_posts_v_blocks_results_items_symptoms" CASCADE;
  DROP TABLE "_posts_v_blocks_results_items" CASCADE;
  DROP TABLE "_posts_v_blocks_results" CASCADE;
  DROP TABLE "_posts_v_blocks_state_sites" CASCADE;
  DROP TABLE "_posts_v_blocks_state_docs" CASCADE;
  DROP TABLE "_posts_v_blocks_loc_accord_areas" CASCADE;
  DROP TABLE "_posts_v_blocks_loc_accord" CASCADE;
  DROP TABLE "_posts_v_blocks_clinic_info" CASCADE;
  DROP TABLE "_posts_v_blocks_quiz_demo" CASCADE;
  DROP TABLE "_posts_v_blocks_trending" CASCADE;
  DROP TABLE "_posts_v_blocks_blog_list" CASCADE;
  DROP TABLE "_posts_v_texts" CASCADE;
  DROP TABLE "presets_blocks_image_hero_crumbs" CASCADE;
  DROP TABLE "presets_blocks_image_hero" CASCADE;
  DROP TABLE "presets_blocks_simple_hero" CASCADE;
  DROP TABLE "presets_blocks_blog_hero" CASCADE;
  DROP TABLE "presets_blocks_center_text_faqs" CASCADE;
  DROP TABLE "presets_blocks_center_text" CASCADE;
  DROP TABLE "presets_blocks_sticky_media_chapters" CASCADE;
  DROP TABLE "presets_blocks_sticky_media" CASCADE;
  DROP TABLE "presets_blocks_results_items_symptoms" CASCADE;
  DROP TABLE "presets_blocks_results_items" CASCADE;
  DROP TABLE "presets_blocks_results" CASCADE;
  DROP TABLE "presets_blocks_state_sites" CASCADE;
  DROP TABLE "presets_blocks_state_docs" CASCADE;
  DROP TABLE "presets_blocks_loc_accord_areas" CASCADE;
  DROP TABLE "presets_blocks_loc_accord" CASCADE;
  DROP TABLE "presets_blocks_clinic_info" CASCADE;
  DROP TABLE "presets_blocks_quiz_demo" CASCADE;
  DROP TABLE "presets_blocks_trending" CASCADE;
  DROP TABLE "presets_blocks_blog_list" CASCADE;
  ALTER TABLE "page_blocks_icon_list" DROP CONSTRAINT "page_blocks_icon_list_image_id_media_id_fk";
  
  ALTER TABLE "page_blocks_cond_grid" DROP CONSTRAINT "page_blocks_cond_grid_video_cover_id_media_id_fk";
  
  ALTER TABLE "page_rels" DROP CONSTRAINT "page_rels_categories_fk";
  
  ALTER TABLE "_page_v_blocks_icon_list" DROP CONSTRAINT "_page_v_blocks_icon_list_image_id_media_id_fk";
  
  ALTER TABLE "_page_v_blocks_cond_grid" DROP CONSTRAINT "_page_v_blocks_cond_grid_video_cover_id_media_id_fk";
  
  ALTER TABLE "_page_v_rels" DROP CONSTRAINT "_page_v_rels_categories_fk";
  
  ALTER TABLE "states_blocks_icon_list" DROP CONSTRAINT "states_blocks_icon_list_image_id_media_id_fk";
  
  ALTER TABLE "states_blocks_cond_grid" DROP CONSTRAINT "states_blocks_cond_grid_video_cover_id_media_id_fk";
  
  ALTER TABLE "states" DROP CONSTRAINT "states_hero_mobile_image_id_media_id_fk";
  
  ALTER TABLE "states_locales" DROP CONSTRAINT "states_locales_hero_badge_id_media_id_fk";
  
  ALTER TABLE "states_rels" DROP CONSTRAINT "states_rels_categories_fk";
  
  ALTER TABLE "_states_v_blocks_icon_list" DROP CONSTRAINT "_states_v_blocks_icon_list_image_id_media_id_fk";
  
  ALTER TABLE "_states_v_blocks_cond_grid" DROP CONSTRAINT "_states_v_blocks_cond_grid_video_cover_id_media_id_fk";
  
  ALTER TABLE "_states_v" DROP CONSTRAINT "_states_v_version_hero_mobile_image_id_media_id_fk";
  
  ALTER TABLE "_states_v_locales" DROP CONSTRAINT "_states_v_locales_version_hero_badge_id_media_id_fk";
  
  ALTER TABLE "_states_v_rels" DROP CONSTRAINT "_states_v_rels_categories_fk";
  
  ALTER TABLE "clinics_blocks_icon_list" DROP CONSTRAINT "clinics_blocks_icon_list_image_id_media_id_fk";
  
  ALTER TABLE "clinics_blocks_cond_grid" DROP CONSTRAINT "clinics_blocks_cond_grid_video_cover_id_media_id_fk";
  
  ALTER TABLE "clinics_rels" DROP CONSTRAINT "clinics_rels_categories_fk";
  
  ALTER TABLE "_clinics_v_blocks_icon_list" DROP CONSTRAINT "_clinics_v_blocks_icon_list_image_id_media_id_fk";
  
  ALTER TABLE "_clinics_v_blocks_cond_grid" DROP CONSTRAINT "_clinics_v_blocks_cond_grid_video_cover_id_media_id_fk";
  
  ALTER TABLE "_clinics_v_rels" DROP CONSTRAINT "_clinics_v_rels_categories_fk";
  
  ALTER TABLE "doctors_blocks_icon_list" DROP CONSTRAINT "doctors_blocks_icon_list_image_id_media_id_fk";
  
  ALTER TABLE "doctors_blocks_cond_grid" DROP CONSTRAINT "doctors_blocks_cond_grid_video_cover_id_media_id_fk";
  
  ALTER TABLE "doctors_rels" DROP CONSTRAINT "doctors_rels_categories_fk";
  
  ALTER TABLE "_doctors_v_blocks_icon_list" DROP CONSTRAINT "_doctors_v_blocks_icon_list_image_id_media_id_fk";
  
  ALTER TABLE "_doctors_v_blocks_cond_grid" DROP CONSTRAINT "_doctors_v_blocks_cond_grid_video_cover_id_media_id_fk";
  
  ALTER TABLE "_doctors_v_rels" DROP CONSTRAINT "_doctors_v_rels_categories_fk";
  
  ALTER TABLE "treatments_blocks_icon_list" DROP CONSTRAINT "treatments_blocks_icon_list_image_id_media_id_fk";
  
  ALTER TABLE "treatments_blocks_cond_grid" DROP CONSTRAINT "treatments_blocks_cond_grid_video_cover_id_media_id_fk";
  
  ALTER TABLE "treatments_rels" DROP CONSTRAINT "treatments_rels_categories_fk";
  
  ALTER TABLE "_treatments_v_blocks_icon_list" DROP CONSTRAINT "_treatments_v_blocks_icon_list_image_id_media_id_fk";
  
  ALTER TABLE "_treatments_v_blocks_cond_grid" DROP CONSTRAINT "_treatments_v_blocks_cond_grid_video_cover_id_media_id_fk";
  
  ALTER TABLE "_treatments_v_rels" DROP CONSTRAINT "_treatments_v_rels_categories_fk";
  
  ALTER TABLE "conditions_blocks_icon_list" DROP CONSTRAINT "conditions_blocks_icon_list_image_id_media_id_fk";
  
  ALTER TABLE "conditions_blocks_cond_grid" DROP CONSTRAINT "conditions_blocks_cond_grid_video_cover_id_media_id_fk";
  
  ALTER TABLE "conditions" DROP CONSTRAINT "conditions_hero_mobile_image_id_media_id_fk";
  
  ALTER TABLE "conditions_rels" DROP CONSTRAINT "conditions_rels_categories_fk";
  
  ALTER TABLE "_conditions_v_blocks_icon_list" DROP CONSTRAINT "_conditions_v_blocks_icon_list_image_id_media_id_fk";
  
  ALTER TABLE "_conditions_v_blocks_cond_grid" DROP CONSTRAINT "_conditions_v_blocks_cond_grid_video_cover_id_media_id_fk";
  
  ALTER TABLE "_conditions_v" DROP CONSTRAINT "_conditions_v_version_hero_mobile_image_id_media_id_fk";
  
  ALTER TABLE "_conditions_v_rels" DROP CONSTRAINT "_conditions_v_rels_categories_fk";
  
  ALTER TABLE "posts_rels" DROP CONSTRAINT "posts_rels_states_fk";
  
  ALTER TABLE "posts_rels" DROP CONSTRAINT "posts_rels_clinics_fk";
  
  ALTER TABLE "posts_rels" DROP CONSTRAINT "posts_rels_doctors_fk";
  
  ALTER TABLE "posts_rels" DROP CONSTRAINT "posts_rels_treatments_fk";
  
  ALTER TABLE "posts_rels" DROP CONSTRAINT "posts_rels_conditions_fk";
  
  ALTER TABLE "posts_rels" DROP CONSTRAINT "posts_rels_testimonials_fk";
  
  ALTER TABLE "_posts_v_rels" DROP CONSTRAINT "_posts_v_rels_states_fk";
  
  ALTER TABLE "_posts_v_rels" DROP CONSTRAINT "_posts_v_rels_clinics_fk";
  
  ALTER TABLE "_posts_v_rels" DROP CONSTRAINT "_posts_v_rels_doctors_fk";
  
  ALTER TABLE "_posts_v_rels" DROP CONSTRAINT "_posts_v_rels_treatments_fk";
  
  ALTER TABLE "_posts_v_rels" DROP CONSTRAINT "_posts_v_rels_conditions_fk";
  
  ALTER TABLE "_posts_v_rels" DROP CONSTRAINT "_posts_v_rels_testimonials_fk";
  
  ALTER TABLE "testimonials" DROP CONSTRAINT "testimonials_doctor_id_doctors_id_fk";
  
  ALTER TABLE "presets_blocks_icon_list" DROP CONSTRAINT "presets_blocks_icon_list_image_id_media_id_fk";
  
  ALTER TABLE "presets_blocks_cond_grid" DROP CONSTRAINT "presets_blocks_cond_grid_video_cover_id_media_id_fk";
  
  ALTER TABLE "presets_rels" DROP CONSTRAINT "presets_rels_categories_fk";
  
  DROP INDEX "page_blocks_icon_list_image_idx";
  DROP INDEX "page_blocks_cond_grid_video_cover_idx";
  DROP INDEX "page_rels_categories_id_idx";
  DROP INDEX "_page_v_blocks_icon_list_image_idx";
  DROP INDEX "_page_v_blocks_cond_grid_video_cover_idx";
  DROP INDEX "_page_v_rels_categories_id_idx";
  DROP INDEX "states_blocks_icon_list_image_idx";
  DROP INDEX "states_blocks_cond_grid_video_cover_idx";
  DROP INDEX "states_hero_mobile_image_idx";
  DROP INDEX "states_hero_badge_idx";
  DROP INDEX "states_rels_categories_id_idx";
  DROP INDEX "_states_v_blocks_icon_list_image_idx";
  DROP INDEX "_states_v_blocks_cond_grid_video_cover_idx";
  DROP INDEX "_states_v_version_version_hero_mobile_image_idx";
  DROP INDEX "_states_v_version_version_hero_badge_idx";
  DROP INDEX "_states_v_rels_categories_id_idx";
  DROP INDEX "clinics_blocks_icon_list_image_idx";
  DROP INDEX "clinics_blocks_cond_grid_video_cover_idx";
  DROP INDEX "clinics_rels_categories_id_idx";
  DROP INDEX "_clinics_v_blocks_icon_list_image_idx";
  DROP INDEX "_clinics_v_blocks_cond_grid_video_cover_idx";
  DROP INDEX "_clinics_v_rels_categories_id_idx";
  DROP INDEX "doctors_blocks_icon_list_image_idx";
  DROP INDEX "doctors_blocks_cond_grid_video_cover_idx";
  DROP INDEX "doctors_rels_categories_id_idx";
  DROP INDEX "_doctors_v_blocks_icon_list_image_idx";
  DROP INDEX "_doctors_v_blocks_cond_grid_video_cover_idx";
  DROP INDEX "_doctors_v_rels_categories_id_idx";
  DROP INDEX "treatments_blocks_icon_list_image_idx";
  DROP INDEX "treatments_blocks_cond_grid_video_cover_idx";
  DROP INDEX "treatments_rels_categories_id_idx";
  DROP INDEX "_treatments_v_blocks_icon_list_image_idx";
  DROP INDEX "_treatments_v_blocks_cond_grid_video_cover_idx";
  DROP INDEX "_treatments_v_rels_categories_id_idx";
  DROP INDEX "conditions_blocks_icon_list_image_idx";
  DROP INDEX "conditions_blocks_cond_grid_video_cover_idx";
  DROP INDEX "conditions_hero_mobile_image_idx";
  DROP INDEX "conditions_rels_categories_id_idx";
  DROP INDEX "_conditions_v_blocks_icon_list_image_idx";
  DROP INDEX "_conditions_v_blocks_cond_grid_video_cover_idx";
  DROP INDEX "_conditions_v_version_version_hero_mobile_image_idx";
  DROP INDEX "_conditions_v_rels_categories_id_idx";
  DROP INDEX "posts_rels_states_id_idx";
  DROP INDEX "posts_rels_clinics_id_idx";
  DROP INDEX "posts_rels_doctors_id_idx";
  DROP INDEX "posts_rels_treatments_id_idx";
  DROP INDEX "posts_rels_conditions_id_idx";
  DROP INDEX "posts_rels_testimonials_id_idx";
  DROP INDEX "_posts_v_rels_states_id_idx";
  DROP INDEX "_posts_v_rels_clinics_id_idx";
  DROP INDEX "_posts_v_rels_doctors_id_idx";
  DROP INDEX "_posts_v_rels_treatments_id_idx";
  DROP INDEX "_posts_v_rels_conditions_id_idx";
  DROP INDEX "_posts_v_rels_testimonials_id_idx";
  DROP INDEX "testimonials_doctor_idx";
  DROP INDEX "presets_blocks_icon_list_image_idx";
  DROP INDEX "presets_blocks_cond_grid_video_cover_idx";
  DROP INDEX "presets_rels_categories_id_idx";
  ALTER TABLE "states" ADD COLUMN "name" varchar;
  ALTER TABLE "_states_v" ADD COLUMN "version_name" varchar;
  ALTER TABLE "doctors" ADD COLUMN "name" varchar;
  ALTER TABLE "doctors_locales" ADD COLUMN "bio" jsonb;
  ALTER TABLE "_doctors_v" ADD COLUMN "version_name" varchar;
  ALTER TABLE "_doctors_v_locales" ADD COLUMN "version_bio" jsonb;
  ALTER TABLE "conditions_locales" ADD COLUMN "hero_title" varchar;
  ALTER TABLE "conditions_locales" ADD COLUMN "hero_intro" jsonb;
  ALTER TABLE "_conditions_v_locales" ADD COLUMN "version_hero_title" varchar;
  ALTER TABLE "_conditions_v_locales" ADD COLUMN "version_hero_intro" jsonb;
  ALTER TABLE "page_blocks_logo_strip" DROP COLUMN "arrangement";
  ALTER TABLE "page_blocks_logo_strip" DROP COLUMN "anchor";
  ALTER TABLE "page_blocks_icon_list_items" DROP COLUMN "accent_title";
  ALTER TABLE "page_blocks_icon_list" DROP COLUMN "layout";
  ALTER TABLE "page_blocks_icon_list" DROP COLUMN "intro";
  ALTER TABLE "page_blocks_icon_list" DROP COLUMN "image_id";
  ALTER TABLE "page_blocks_media_text" DROP COLUMN "eyebrow";
  ALTER TABLE "page_blocks_media_text" DROP COLUMN "image_style";
  ALTER TABLE "page_blocks_media_text" DROP COLUMN "anchor";
  ALTER TABLE "page_blocks_rev_slider" DROP COLUMN "note";
  ALTER TABLE "page_blocks_rev_slider" DROP COLUMN "limit";
  ALTER TABLE "page_blocks_rev_slider" DROP COLUMN "heading_level";
  ALTER TABLE "page_blocks_cond_grid" DROP COLUMN "list_heading_level";
  ALTER TABLE "page_blocks_cond_grid" DROP COLUMN "title_level";
  ALTER TABLE "page_blocks_cond_grid" DROP COLUMN "show_more_text";
  ALTER TABLE "page_blocks_cond_grid" DROP COLUMN "show_less_text";
  ALTER TABLE "page_blocks_cond_grid" DROP COLUMN "video_url";
  ALTER TABLE "page_blocks_cond_grid" DROP COLUMN "video_position";
  ALTER TABLE "page_blocks_cond_grid" DROP COLUMN "video_heading";
  ALTER TABLE "page_blocks_cond_grid" DROP COLUMN "video_cover_id";
  ALTER TABLE "page_blocks_treat_cards" DROP COLUMN "heading_align";
  ALTER TABLE "page_blocks_treat_cards" DROP COLUMN "text";
  ALTER TABLE "page" DROP COLUMN "template";
  ALTER TABLE "page_rels" DROP COLUMN "categories_id";
  ALTER TABLE "_page_v_blocks_logo_strip" DROP COLUMN "arrangement";
  ALTER TABLE "_page_v_blocks_logo_strip" DROP COLUMN "anchor";
  ALTER TABLE "_page_v_blocks_icon_list_items" DROP COLUMN "accent_title";
  ALTER TABLE "_page_v_blocks_icon_list" DROP COLUMN "layout";
  ALTER TABLE "_page_v_blocks_icon_list" DROP COLUMN "intro";
  ALTER TABLE "_page_v_blocks_icon_list" DROP COLUMN "image_id";
  ALTER TABLE "_page_v_blocks_media_text" DROP COLUMN "eyebrow";
  ALTER TABLE "_page_v_blocks_media_text" DROP COLUMN "image_style";
  ALTER TABLE "_page_v_blocks_media_text" DROP COLUMN "anchor";
  ALTER TABLE "_page_v_blocks_rev_slider" DROP COLUMN "note";
  ALTER TABLE "_page_v_blocks_rev_slider" DROP COLUMN "limit";
  ALTER TABLE "_page_v_blocks_rev_slider" DROP COLUMN "heading_level";
  ALTER TABLE "_page_v_blocks_cond_grid" DROP COLUMN "list_heading_level";
  ALTER TABLE "_page_v_blocks_cond_grid" DROP COLUMN "title_level";
  ALTER TABLE "_page_v_blocks_cond_grid" DROP COLUMN "show_more_text";
  ALTER TABLE "_page_v_blocks_cond_grid" DROP COLUMN "show_less_text";
  ALTER TABLE "_page_v_blocks_cond_grid" DROP COLUMN "video_url";
  ALTER TABLE "_page_v_blocks_cond_grid" DROP COLUMN "video_position";
  ALTER TABLE "_page_v_blocks_cond_grid" DROP COLUMN "video_heading";
  ALTER TABLE "_page_v_blocks_cond_grid" DROP COLUMN "video_cover_id";
  ALTER TABLE "_page_v_blocks_treat_cards" DROP COLUMN "heading_align";
  ALTER TABLE "_page_v_blocks_treat_cards" DROP COLUMN "text";
  ALTER TABLE "_page_v" DROP COLUMN "version_template";
  ALTER TABLE "_page_v_rels" DROP COLUMN "categories_id";
  ALTER TABLE "states_blocks_logo_strip" DROP COLUMN "arrangement";
  ALTER TABLE "states_blocks_logo_strip" DROP COLUMN "anchor";
  ALTER TABLE "states_blocks_icon_list_items" DROP COLUMN "accent_title";
  ALTER TABLE "states_blocks_icon_list" DROP COLUMN "layout";
  ALTER TABLE "states_blocks_icon_list" DROP COLUMN "intro";
  ALTER TABLE "states_blocks_icon_list" DROP COLUMN "image_id";
  ALTER TABLE "states_blocks_media_text" DROP COLUMN "eyebrow";
  ALTER TABLE "states_blocks_media_text" DROP COLUMN "image_style";
  ALTER TABLE "states_blocks_media_text" DROP COLUMN "anchor";
  ALTER TABLE "states_blocks_rev_slider" DROP COLUMN "note";
  ALTER TABLE "states_blocks_rev_slider" DROP COLUMN "limit";
  ALTER TABLE "states_blocks_rev_slider" DROP COLUMN "heading_level";
  ALTER TABLE "states_blocks_cond_grid" DROP COLUMN "list_heading_level";
  ALTER TABLE "states_blocks_cond_grid" DROP COLUMN "title_level";
  ALTER TABLE "states_blocks_cond_grid" DROP COLUMN "show_more_text";
  ALTER TABLE "states_blocks_cond_grid" DROP COLUMN "show_less_text";
  ALTER TABLE "states_blocks_cond_grid" DROP COLUMN "video_url";
  ALTER TABLE "states_blocks_cond_grid" DROP COLUMN "video_position";
  ALTER TABLE "states_blocks_cond_grid" DROP COLUMN "video_heading";
  ALTER TABLE "states_blocks_cond_grid" DROP COLUMN "video_cover_id";
  ALTER TABLE "states_blocks_treat_cards" DROP COLUMN "heading_align";
  ALTER TABLE "states_blocks_treat_cards" DROP COLUMN "text";
  ALTER TABLE "states" DROP COLUMN "hero_button_text";
  ALTER TABLE "states" DROP COLUMN "hero_button_link_kind";
  ALTER TABLE "states" DROP COLUMN "hero_button_link_new_tab";
  ALTER TABLE "states" DROP COLUMN "hero_button_link_path";
  ALTER TABLE "states" DROP COLUMN "hero_button_link_url";
  ALTER TABLE "states" DROP COLUMN "hero_mobile_image_id";
  ALTER TABLE "states_locales" DROP COLUMN "name";
  ALTER TABLE "states_locales" DROP COLUMN "hero_tagline";
  ALTER TABLE "states_locales" DROP COLUMN "hero_badge_id";
  ALTER TABLE "states_rels" DROP COLUMN "categories_id";
  ALTER TABLE "_states_v_blocks_logo_strip" DROP COLUMN "arrangement";
  ALTER TABLE "_states_v_blocks_logo_strip" DROP COLUMN "anchor";
  ALTER TABLE "_states_v_blocks_icon_list_items" DROP COLUMN "accent_title";
  ALTER TABLE "_states_v_blocks_icon_list" DROP COLUMN "layout";
  ALTER TABLE "_states_v_blocks_icon_list" DROP COLUMN "intro";
  ALTER TABLE "_states_v_blocks_icon_list" DROP COLUMN "image_id";
  ALTER TABLE "_states_v_blocks_media_text" DROP COLUMN "eyebrow";
  ALTER TABLE "_states_v_blocks_media_text" DROP COLUMN "image_style";
  ALTER TABLE "_states_v_blocks_media_text" DROP COLUMN "anchor";
  ALTER TABLE "_states_v_blocks_rev_slider" DROP COLUMN "note";
  ALTER TABLE "_states_v_blocks_rev_slider" DROP COLUMN "limit";
  ALTER TABLE "_states_v_blocks_rev_slider" DROP COLUMN "heading_level";
  ALTER TABLE "_states_v_blocks_cond_grid" DROP COLUMN "list_heading_level";
  ALTER TABLE "_states_v_blocks_cond_grid" DROP COLUMN "title_level";
  ALTER TABLE "_states_v_blocks_cond_grid" DROP COLUMN "show_more_text";
  ALTER TABLE "_states_v_blocks_cond_grid" DROP COLUMN "show_less_text";
  ALTER TABLE "_states_v_blocks_cond_grid" DROP COLUMN "video_url";
  ALTER TABLE "_states_v_blocks_cond_grid" DROP COLUMN "video_position";
  ALTER TABLE "_states_v_blocks_cond_grid" DROP COLUMN "video_heading";
  ALTER TABLE "_states_v_blocks_cond_grid" DROP COLUMN "video_cover_id";
  ALTER TABLE "_states_v_blocks_treat_cards" DROP COLUMN "heading_align";
  ALTER TABLE "_states_v_blocks_treat_cards" DROP COLUMN "text";
  ALTER TABLE "_states_v" DROP COLUMN "version_hero_button_text";
  ALTER TABLE "_states_v" DROP COLUMN "version_hero_button_link_kind";
  ALTER TABLE "_states_v" DROP COLUMN "version_hero_button_link_new_tab";
  ALTER TABLE "_states_v" DROP COLUMN "version_hero_button_link_path";
  ALTER TABLE "_states_v" DROP COLUMN "version_hero_button_link_url";
  ALTER TABLE "_states_v" DROP COLUMN "version_hero_mobile_image_id";
  ALTER TABLE "_states_v_locales" DROP COLUMN "version_name";
  ALTER TABLE "_states_v_locales" DROP COLUMN "version_hero_tagline";
  ALTER TABLE "_states_v_locales" DROP COLUMN "version_hero_badge_id";
  ALTER TABLE "_states_v_rels" DROP COLUMN "categories_id";
  ALTER TABLE "clinics_blocks_logo_strip" DROP COLUMN "arrangement";
  ALTER TABLE "clinics_blocks_logo_strip" DROP COLUMN "anchor";
  ALTER TABLE "clinics_blocks_icon_list_items" DROP COLUMN "accent_title";
  ALTER TABLE "clinics_blocks_icon_list" DROP COLUMN "layout";
  ALTER TABLE "clinics_blocks_icon_list" DROP COLUMN "intro";
  ALTER TABLE "clinics_blocks_icon_list" DROP COLUMN "image_id";
  ALTER TABLE "clinics_blocks_media_text" DROP COLUMN "eyebrow";
  ALTER TABLE "clinics_blocks_media_text" DROP COLUMN "image_style";
  ALTER TABLE "clinics_blocks_media_text" DROP COLUMN "anchor";
  ALTER TABLE "clinics_blocks_rev_slider" DROP COLUMN "note";
  ALTER TABLE "clinics_blocks_rev_slider" DROP COLUMN "limit";
  ALTER TABLE "clinics_blocks_rev_slider" DROP COLUMN "heading_level";
  ALTER TABLE "clinics_blocks_cond_grid" DROP COLUMN "list_heading_level";
  ALTER TABLE "clinics_blocks_cond_grid" DROP COLUMN "title_level";
  ALTER TABLE "clinics_blocks_cond_grid" DROP COLUMN "show_more_text";
  ALTER TABLE "clinics_blocks_cond_grid" DROP COLUMN "show_less_text";
  ALTER TABLE "clinics_blocks_cond_grid" DROP COLUMN "video_url";
  ALTER TABLE "clinics_blocks_cond_grid" DROP COLUMN "video_position";
  ALTER TABLE "clinics_blocks_cond_grid" DROP COLUMN "video_heading";
  ALTER TABLE "clinics_blocks_cond_grid" DROP COLUMN "video_cover_id";
  ALTER TABLE "clinics_blocks_treat_cards" DROP COLUMN "heading_align";
  ALTER TABLE "clinics_blocks_treat_cards" DROP COLUMN "text";
  ALTER TABLE "clinics_locales" DROP COLUMN "hero_crumb";
  ALTER TABLE "clinics_locales" DROP COLUMN "hero_button_text";
  ALTER TABLE "clinics_locales" DROP COLUMN "hero_button_link_kind";
  ALTER TABLE "clinics_locales" DROP COLUMN "hero_button_link_new_tab";
  ALTER TABLE "clinics_locales" DROP COLUMN "hero_button_link_path";
  ALTER TABLE "clinics_locales" DROP COLUMN "hero_button_link_url";
  ALTER TABLE "clinics_locales" DROP COLUMN "hero_phone_label";
  ALTER TABLE "clinics_rels" DROP COLUMN "categories_id";
  ALTER TABLE "_clinics_v_blocks_logo_strip" DROP COLUMN "arrangement";
  ALTER TABLE "_clinics_v_blocks_logo_strip" DROP COLUMN "anchor";
  ALTER TABLE "_clinics_v_blocks_icon_list_items" DROP COLUMN "accent_title";
  ALTER TABLE "_clinics_v_blocks_icon_list" DROP COLUMN "layout";
  ALTER TABLE "_clinics_v_blocks_icon_list" DROP COLUMN "intro";
  ALTER TABLE "_clinics_v_blocks_icon_list" DROP COLUMN "image_id";
  ALTER TABLE "_clinics_v_blocks_media_text" DROP COLUMN "eyebrow";
  ALTER TABLE "_clinics_v_blocks_media_text" DROP COLUMN "image_style";
  ALTER TABLE "_clinics_v_blocks_media_text" DROP COLUMN "anchor";
  ALTER TABLE "_clinics_v_blocks_rev_slider" DROP COLUMN "note";
  ALTER TABLE "_clinics_v_blocks_rev_slider" DROP COLUMN "limit";
  ALTER TABLE "_clinics_v_blocks_rev_slider" DROP COLUMN "heading_level";
  ALTER TABLE "_clinics_v_blocks_cond_grid" DROP COLUMN "list_heading_level";
  ALTER TABLE "_clinics_v_blocks_cond_grid" DROP COLUMN "title_level";
  ALTER TABLE "_clinics_v_blocks_cond_grid" DROP COLUMN "show_more_text";
  ALTER TABLE "_clinics_v_blocks_cond_grid" DROP COLUMN "show_less_text";
  ALTER TABLE "_clinics_v_blocks_cond_grid" DROP COLUMN "video_url";
  ALTER TABLE "_clinics_v_blocks_cond_grid" DROP COLUMN "video_position";
  ALTER TABLE "_clinics_v_blocks_cond_grid" DROP COLUMN "video_heading";
  ALTER TABLE "_clinics_v_blocks_cond_grid" DROP COLUMN "video_cover_id";
  ALTER TABLE "_clinics_v_blocks_treat_cards" DROP COLUMN "heading_align";
  ALTER TABLE "_clinics_v_blocks_treat_cards" DROP COLUMN "text";
  ALTER TABLE "_clinics_v_locales" DROP COLUMN "version_hero_crumb";
  ALTER TABLE "_clinics_v_locales" DROP COLUMN "version_hero_button_text";
  ALTER TABLE "_clinics_v_locales" DROP COLUMN "version_hero_button_link_kind";
  ALTER TABLE "_clinics_v_locales" DROP COLUMN "version_hero_button_link_new_tab";
  ALTER TABLE "_clinics_v_locales" DROP COLUMN "version_hero_button_link_path";
  ALTER TABLE "_clinics_v_locales" DROP COLUMN "version_hero_button_link_url";
  ALTER TABLE "_clinics_v_locales" DROP COLUMN "version_hero_phone_label";
  ALTER TABLE "_clinics_v_rels" DROP COLUMN "categories_id";
  ALTER TABLE "doctors_blocks_logo_strip" DROP COLUMN "arrangement";
  ALTER TABLE "doctors_blocks_logo_strip" DROP COLUMN "anchor";
  ALTER TABLE "doctors_blocks_icon_list_items" DROP COLUMN "accent_title";
  ALTER TABLE "doctors_blocks_icon_list" DROP COLUMN "layout";
  ALTER TABLE "doctors_blocks_icon_list" DROP COLUMN "intro";
  ALTER TABLE "doctors_blocks_icon_list" DROP COLUMN "image_id";
  ALTER TABLE "doctors_blocks_media_text" DROP COLUMN "eyebrow";
  ALTER TABLE "doctors_blocks_media_text" DROP COLUMN "image_style";
  ALTER TABLE "doctors_blocks_media_text" DROP COLUMN "anchor";
  ALTER TABLE "doctors_blocks_rev_slider" DROP COLUMN "note";
  ALTER TABLE "doctors_blocks_rev_slider" DROP COLUMN "limit";
  ALTER TABLE "doctors_blocks_rev_slider" DROP COLUMN "heading_level";
  ALTER TABLE "doctors_blocks_cond_grid" DROP COLUMN "list_heading_level";
  ALTER TABLE "doctors_blocks_cond_grid" DROP COLUMN "title_level";
  ALTER TABLE "doctors_blocks_cond_grid" DROP COLUMN "show_more_text";
  ALTER TABLE "doctors_blocks_cond_grid" DROP COLUMN "show_less_text";
  ALTER TABLE "doctors_blocks_cond_grid" DROP COLUMN "video_url";
  ALTER TABLE "doctors_blocks_cond_grid" DROP COLUMN "video_position";
  ALTER TABLE "doctors_blocks_cond_grid" DROP COLUMN "video_heading";
  ALTER TABLE "doctors_blocks_cond_grid" DROP COLUMN "video_cover_id";
  ALTER TABLE "doctors_blocks_treat_cards" DROP COLUMN "heading_align";
  ALTER TABLE "doctors_blocks_treat_cards" DROP COLUMN "text";
  ALTER TABLE "doctors_locales" DROP COLUMN "name";
  ALTER TABLE "doctors_rels" DROP COLUMN "categories_id";
  ALTER TABLE "_doctors_v_blocks_logo_strip" DROP COLUMN "arrangement";
  ALTER TABLE "_doctors_v_blocks_logo_strip" DROP COLUMN "anchor";
  ALTER TABLE "_doctors_v_blocks_icon_list_items" DROP COLUMN "accent_title";
  ALTER TABLE "_doctors_v_blocks_icon_list" DROP COLUMN "layout";
  ALTER TABLE "_doctors_v_blocks_icon_list" DROP COLUMN "intro";
  ALTER TABLE "_doctors_v_blocks_icon_list" DROP COLUMN "image_id";
  ALTER TABLE "_doctors_v_blocks_media_text" DROP COLUMN "eyebrow";
  ALTER TABLE "_doctors_v_blocks_media_text" DROP COLUMN "image_style";
  ALTER TABLE "_doctors_v_blocks_media_text" DROP COLUMN "anchor";
  ALTER TABLE "_doctors_v_blocks_rev_slider" DROP COLUMN "note";
  ALTER TABLE "_doctors_v_blocks_rev_slider" DROP COLUMN "limit";
  ALTER TABLE "_doctors_v_blocks_rev_slider" DROP COLUMN "heading_level";
  ALTER TABLE "_doctors_v_blocks_cond_grid" DROP COLUMN "list_heading_level";
  ALTER TABLE "_doctors_v_blocks_cond_grid" DROP COLUMN "title_level";
  ALTER TABLE "_doctors_v_blocks_cond_grid" DROP COLUMN "show_more_text";
  ALTER TABLE "_doctors_v_blocks_cond_grid" DROP COLUMN "show_less_text";
  ALTER TABLE "_doctors_v_blocks_cond_grid" DROP COLUMN "video_url";
  ALTER TABLE "_doctors_v_blocks_cond_grid" DROP COLUMN "video_position";
  ALTER TABLE "_doctors_v_blocks_cond_grid" DROP COLUMN "video_heading";
  ALTER TABLE "_doctors_v_blocks_cond_grid" DROP COLUMN "video_cover_id";
  ALTER TABLE "_doctors_v_blocks_treat_cards" DROP COLUMN "heading_align";
  ALTER TABLE "_doctors_v_blocks_treat_cards" DROP COLUMN "text";
  ALTER TABLE "_doctors_v_locales" DROP COLUMN "version_name";
  ALTER TABLE "_doctors_v_rels" DROP COLUMN "categories_id";
  ALTER TABLE "treatments_blocks_logo_strip" DROP COLUMN "arrangement";
  ALTER TABLE "treatments_blocks_logo_strip" DROP COLUMN "anchor";
  ALTER TABLE "treatments_blocks_icon_list_items" DROP COLUMN "accent_title";
  ALTER TABLE "treatments_blocks_icon_list" DROP COLUMN "layout";
  ALTER TABLE "treatments_blocks_icon_list" DROP COLUMN "intro";
  ALTER TABLE "treatments_blocks_icon_list" DROP COLUMN "image_id";
  ALTER TABLE "treatments_blocks_media_text" DROP COLUMN "eyebrow";
  ALTER TABLE "treatments_blocks_media_text" DROP COLUMN "image_style";
  ALTER TABLE "treatments_blocks_media_text" DROP COLUMN "anchor";
  ALTER TABLE "treatments_blocks_rev_slider" DROP COLUMN "note";
  ALTER TABLE "treatments_blocks_rev_slider" DROP COLUMN "limit";
  ALTER TABLE "treatments_blocks_rev_slider" DROP COLUMN "heading_level";
  ALTER TABLE "treatments_blocks_cond_grid" DROP COLUMN "list_heading_level";
  ALTER TABLE "treatments_blocks_cond_grid" DROP COLUMN "title_level";
  ALTER TABLE "treatments_blocks_cond_grid" DROP COLUMN "show_more_text";
  ALTER TABLE "treatments_blocks_cond_grid" DROP COLUMN "show_less_text";
  ALTER TABLE "treatments_blocks_cond_grid" DROP COLUMN "video_url";
  ALTER TABLE "treatments_blocks_cond_grid" DROP COLUMN "video_position";
  ALTER TABLE "treatments_blocks_cond_grid" DROP COLUMN "video_heading";
  ALTER TABLE "treatments_blocks_cond_grid" DROP COLUMN "video_cover_id";
  ALTER TABLE "treatments_blocks_treat_cards" DROP COLUMN "heading_align";
  ALTER TABLE "treatments_blocks_treat_cards" DROP COLUMN "text";
  ALTER TABLE "treatments_rels" DROP COLUMN "categories_id";
  ALTER TABLE "_treatments_v_blocks_logo_strip" DROP COLUMN "arrangement";
  ALTER TABLE "_treatments_v_blocks_logo_strip" DROP COLUMN "anchor";
  ALTER TABLE "_treatments_v_blocks_icon_list_items" DROP COLUMN "accent_title";
  ALTER TABLE "_treatments_v_blocks_icon_list" DROP COLUMN "layout";
  ALTER TABLE "_treatments_v_blocks_icon_list" DROP COLUMN "intro";
  ALTER TABLE "_treatments_v_blocks_icon_list" DROP COLUMN "image_id";
  ALTER TABLE "_treatments_v_blocks_media_text" DROP COLUMN "eyebrow";
  ALTER TABLE "_treatments_v_blocks_media_text" DROP COLUMN "image_style";
  ALTER TABLE "_treatments_v_blocks_media_text" DROP COLUMN "anchor";
  ALTER TABLE "_treatments_v_blocks_rev_slider" DROP COLUMN "note";
  ALTER TABLE "_treatments_v_blocks_rev_slider" DROP COLUMN "limit";
  ALTER TABLE "_treatments_v_blocks_rev_slider" DROP COLUMN "heading_level";
  ALTER TABLE "_treatments_v_blocks_cond_grid" DROP COLUMN "list_heading_level";
  ALTER TABLE "_treatments_v_blocks_cond_grid" DROP COLUMN "title_level";
  ALTER TABLE "_treatments_v_blocks_cond_grid" DROP COLUMN "show_more_text";
  ALTER TABLE "_treatments_v_blocks_cond_grid" DROP COLUMN "show_less_text";
  ALTER TABLE "_treatments_v_blocks_cond_grid" DROP COLUMN "video_url";
  ALTER TABLE "_treatments_v_blocks_cond_grid" DROP COLUMN "video_position";
  ALTER TABLE "_treatments_v_blocks_cond_grid" DROP COLUMN "video_heading";
  ALTER TABLE "_treatments_v_blocks_cond_grid" DROP COLUMN "video_cover_id";
  ALTER TABLE "_treatments_v_blocks_treat_cards" DROP COLUMN "heading_align";
  ALTER TABLE "_treatments_v_blocks_treat_cards" DROP COLUMN "text";
  ALTER TABLE "_treatments_v_rels" DROP COLUMN "categories_id";
  ALTER TABLE "conditions_blocks_logo_strip" DROP COLUMN "arrangement";
  ALTER TABLE "conditions_blocks_logo_strip" DROP COLUMN "anchor";
  ALTER TABLE "conditions_blocks_icon_list_items" DROP COLUMN "accent_title";
  ALTER TABLE "conditions_blocks_icon_list" DROP COLUMN "layout";
  ALTER TABLE "conditions_blocks_icon_list" DROP COLUMN "intro";
  ALTER TABLE "conditions_blocks_icon_list" DROP COLUMN "image_id";
  ALTER TABLE "conditions_blocks_media_text" DROP COLUMN "eyebrow";
  ALTER TABLE "conditions_blocks_media_text" DROP COLUMN "image_style";
  ALTER TABLE "conditions_blocks_media_text" DROP COLUMN "anchor";
  ALTER TABLE "conditions_blocks_rev_slider" DROP COLUMN "note";
  ALTER TABLE "conditions_blocks_rev_slider" DROP COLUMN "limit";
  ALTER TABLE "conditions_blocks_rev_slider" DROP COLUMN "heading_level";
  ALTER TABLE "conditions_blocks_cond_grid" DROP COLUMN "list_heading_level";
  ALTER TABLE "conditions_blocks_cond_grid" DROP COLUMN "title_level";
  ALTER TABLE "conditions_blocks_cond_grid" DROP COLUMN "show_more_text";
  ALTER TABLE "conditions_blocks_cond_grid" DROP COLUMN "show_less_text";
  ALTER TABLE "conditions_blocks_cond_grid" DROP COLUMN "video_url";
  ALTER TABLE "conditions_blocks_cond_grid" DROP COLUMN "video_position";
  ALTER TABLE "conditions_blocks_cond_grid" DROP COLUMN "video_heading";
  ALTER TABLE "conditions_blocks_cond_grid" DROP COLUMN "video_cover_id";
  ALTER TABLE "conditions_blocks_treat_cards" DROP COLUMN "heading_align";
  ALTER TABLE "conditions_blocks_treat_cards" DROP COLUMN "text";
  ALTER TABLE "conditions" DROP COLUMN "hero_mobile_image_id";
  ALTER TABLE "conditions_locales" DROP COLUMN "nav_heading";
  ALTER TABLE "conditions_locales" DROP COLUMN "nav_heading_end";
  ALTER TABLE "conditions_locales" DROP COLUMN "menu_heading";
  ALTER TABLE "conditions_rels" DROP COLUMN "categories_id";
  ALTER TABLE "_conditions_v_blocks_logo_strip" DROP COLUMN "arrangement";
  ALTER TABLE "_conditions_v_blocks_logo_strip" DROP COLUMN "anchor";
  ALTER TABLE "_conditions_v_blocks_icon_list_items" DROP COLUMN "accent_title";
  ALTER TABLE "_conditions_v_blocks_icon_list" DROP COLUMN "layout";
  ALTER TABLE "_conditions_v_blocks_icon_list" DROP COLUMN "intro";
  ALTER TABLE "_conditions_v_blocks_icon_list" DROP COLUMN "image_id";
  ALTER TABLE "_conditions_v_blocks_media_text" DROP COLUMN "eyebrow";
  ALTER TABLE "_conditions_v_blocks_media_text" DROP COLUMN "image_style";
  ALTER TABLE "_conditions_v_blocks_media_text" DROP COLUMN "anchor";
  ALTER TABLE "_conditions_v_blocks_rev_slider" DROP COLUMN "note";
  ALTER TABLE "_conditions_v_blocks_rev_slider" DROP COLUMN "limit";
  ALTER TABLE "_conditions_v_blocks_rev_slider" DROP COLUMN "heading_level";
  ALTER TABLE "_conditions_v_blocks_cond_grid" DROP COLUMN "list_heading_level";
  ALTER TABLE "_conditions_v_blocks_cond_grid" DROP COLUMN "title_level";
  ALTER TABLE "_conditions_v_blocks_cond_grid" DROP COLUMN "show_more_text";
  ALTER TABLE "_conditions_v_blocks_cond_grid" DROP COLUMN "show_less_text";
  ALTER TABLE "_conditions_v_blocks_cond_grid" DROP COLUMN "video_url";
  ALTER TABLE "_conditions_v_blocks_cond_grid" DROP COLUMN "video_position";
  ALTER TABLE "_conditions_v_blocks_cond_grid" DROP COLUMN "video_heading";
  ALTER TABLE "_conditions_v_blocks_cond_grid" DROP COLUMN "video_cover_id";
  ALTER TABLE "_conditions_v_blocks_treat_cards" DROP COLUMN "heading_align";
  ALTER TABLE "_conditions_v_blocks_treat_cards" DROP COLUMN "text";
  ALTER TABLE "_conditions_v" DROP COLUMN "version_hero_mobile_image_id";
  ALTER TABLE "_conditions_v_locales" DROP COLUMN "version_nav_heading";
  ALTER TABLE "_conditions_v_locales" DROP COLUMN "version_nav_heading_end";
  ALTER TABLE "_conditions_v_locales" DROP COLUMN "version_menu_heading";
  ALTER TABLE "_conditions_v_rels" DROP COLUMN "categories_id";
  ALTER TABLE "posts" DROP COLUMN "updated_date";
  ALTER TABLE "posts_locales" DROP COLUMN "reading_time_override";
  ALTER TABLE "posts_rels" DROP COLUMN "states_id";
  ALTER TABLE "posts_rels" DROP COLUMN "clinics_id";
  ALTER TABLE "posts_rels" DROP COLUMN "doctors_id";
  ALTER TABLE "posts_rels" DROP COLUMN "treatments_id";
  ALTER TABLE "posts_rels" DROP COLUMN "conditions_id";
  ALTER TABLE "posts_rels" DROP COLUMN "testimonials_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_updated_date";
  ALTER TABLE "_posts_v_locales" DROP COLUMN "version_reading_time_override";
  ALTER TABLE "_posts_v_rels" DROP COLUMN "states_id";
  ALTER TABLE "_posts_v_rels" DROP COLUMN "clinics_id";
  ALTER TABLE "_posts_v_rels" DROP COLUMN "doctors_id";
  ALTER TABLE "_posts_v_rels" DROP COLUMN "treatments_id";
  ALTER TABLE "_posts_v_rels" DROP COLUMN "conditions_id";
  ALTER TABLE "_posts_v_rels" DROP COLUMN "testimonials_id";
  ALTER TABLE "testimonials" DROP COLUMN "doctor_id";
  ALTER TABLE "presets_blocks_logo_strip" DROP COLUMN "arrangement";
  ALTER TABLE "presets_blocks_logo_strip" DROP COLUMN "anchor";
  ALTER TABLE "presets_blocks_icon_list_items" DROP COLUMN "accent_title";
  ALTER TABLE "presets_blocks_icon_list" DROP COLUMN "layout";
  ALTER TABLE "presets_blocks_icon_list" DROP COLUMN "intro";
  ALTER TABLE "presets_blocks_icon_list" DROP COLUMN "image_id";
  ALTER TABLE "presets_blocks_media_text" DROP COLUMN "eyebrow";
  ALTER TABLE "presets_blocks_media_text" DROP COLUMN "image_style";
  ALTER TABLE "presets_blocks_media_text" DROP COLUMN "anchor";
  ALTER TABLE "presets_blocks_rev_slider" DROP COLUMN "note";
  ALTER TABLE "presets_blocks_rev_slider" DROP COLUMN "limit";
  ALTER TABLE "presets_blocks_rev_slider" DROP COLUMN "heading_level";
  ALTER TABLE "presets_blocks_cond_grid" DROP COLUMN "list_heading_level";
  ALTER TABLE "presets_blocks_cond_grid" DROP COLUMN "title_level";
  ALTER TABLE "presets_blocks_cond_grid" DROP COLUMN "show_more_text";
  ALTER TABLE "presets_blocks_cond_grid" DROP COLUMN "show_less_text";
  ALTER TABLE "presets_blocks_cond_grid" DROP COLUMN "video_url";
  ALTER TABLE "presets_blocks_cond_grid" DROP COLUMN "video_position";
  ALTER TABLE "presets_blocks_cond_grid" DROP COLUMN "video_heading";
  ALTER TABLE "presets_blocks_cond_grid" DROP COLUMN "video_cover_id";
  ALTER TABLE "presets_blocks_treat_cards" DROP COLUMN "heading_align";
  ALTER TABLE "presets_blocks_treat_cards" DROP COLUMN "text";
  ALTER TABLE "presets_rels" DROP COLUMN "categories_id";
  DROP TYPE "public"."enum_page_blocks_image_hero_crumbs_link_kind";
  DROP TYPE "public"."enum_page_blocks_image_hero_size";
  DROP TYPE "public"."enum_page_blocks_image_hero_button_link_kind";
  DROP TYPE "public"."enum_page_blocks_logo_strip_arrangement";
  DROP TYPE "public"."enum_page_blocks_icon_list_layout";
  DROP TYPE "public"."enum_page_blocks_media_text_image_style";
  DROP TYPE "public"."enum_page_blocks_rev_slider_heading_level";
  DROP TYPE "public"."enum_page_blocks_cond_grid_list_heading_level";
  DROP TYPE "public"."enum_page_blocks_cond_grid_title_level";
  DROP TYPE "public"."enum_page_blocks_cond_grid_video_position";
  DROP TYPE "public"."enum_page_blocks_treat_cards_heading_align";
  DROP TYPE "public"."enum_page_blocks_center_text_background";
  DROP TYPE "public"."enum_page_blocks_center_text_heading_level";
  DROP TYPE "public"."enum_page_blocks_center_text_kind";
  DROP TYPE "public"."enum_page_blocks_center_text_button_link_kind";
  DROP TYPE "public"."enum_page_blocks_center_text_button_style";
  DROP TYPE "public"."enum_stky_chapters_button_link_kind";
  DROP TYPE "public"."enum_stky_chapters_note_size";
  DROP TYPE "public"."enum_page_blocks_results_button_link_kind";
  DROP TYPE "public"."enum_page_blocks_results_align";
  DROP TYPE "public"."enum_page_blocks_state_docs_button_link_kind";
  DROP TYPE "public"."enum_page_blocks_quiz_demo_button_link_kind";
  DROP TYPE "public"."enum_page_template";
  DROP TYPE "public"."enum__page_v_blocks_image_hero_crumbs_link_kind";
  DROP TYPE "public"."enum__page_v_blocks_image_hero_size";
  DROP TYPE "public"."enum__page_v_blocks_image_hero_button_link_kind";
  DROP TYPE "public"."enum__page_v_blocks_logo_strip_arrangement";
  DROP TYPE "public"."enum__page_v_blocks_icon_list_layout";
  DROP TYPE "public"."enum__page_v_blocks_media_text_image_style";
  DROP TYPE "public"."enum__page_v_blocks_rev_slider_heading_level";
  DROP TYPE "public"."enum__page_v_blocks_cond_grid_list_heading_level";
  DROP TYPE "public"."enum__page_v_blocks_cond_grid_title_level";
  DROP TYPE "public"."enum__page_v_blocks_cond_grid_video_position";
  DROP TYPE "public"."enum__page_v_blocks_treat_cards_heading_align";
  DROP TYPE "public"."enum__page_v_blocks_center_text_background";
  DROP TYPE "public"."enum__page_v_blocks_center_text_heading_level";
  DROP TYPE "public"."enum__page_v_blocks_center_text_kind";
  DROP TYPE "public"."enum__page_v_blocks_center_text_button_link_kind";
  DROP TYPE "public"."enum__page_v_blocks_center_text_button_style";
  DROP TYPE "public"."enum__stky_v_chapters_button_link_kind";
  DROP TYPE "public"."enum__stky_v_chapters_note_size";
  DROP TYPE "public"."enum__page_v_blocks_results_button_link_kind";
  DROP TYPE "public"."enum__page_v_blocks_results_align";
  DROP TYPE "public"."enum__page_v_blocks_state_docs_button_link_kind";
  DROP TYPE "public"."enum__page_v_blocks_quiz_demo_button_link_kind";
  DROP TYPE "public"."enum__page_v_version_template";
  DROP TYPE "public"."enum_states_blocks_logo_strip_arrangement";
  DROP TYPE "public"."enum_states_blocks_icon_list_layout";
  DROP TYPE "public"."enum_states_blocks_media_text_image_style";
  DROP TYPE "public"."enum_states_blocks_rev_slider_heading_level";
  DROP TYPE "public"."enum_states_blocks_cond_grid_list_heading_level";
  DROP TYPE "public"."enum_states_blocks_cond_grid_title_level";
  DROP TYPE "public"."enum_states_blocks_cond_grid_video_position";
  DROP TYPE "public"."enum_states_blocks_treat_cards_heading_align";
  DROP TYPE "public"."enum_states_blocks_center_text_background";
  DROP TYPE "public"."enum_states_blocks_center_text_heading_level";
  DROP TYPE "public"."enum_states_blocks_center_text_kind";
  DROP TYPE "public"."enum_states_blocks_center_text_button_link_kind";
  DROP TYPE "public"."enum_states_blocks_center_text_button_style";
  DROP TYPE "public"."enum_states_blocks_results_button_link_kind";
  DROP TYPE "public"."enum_states_blocks_results_align";
  DROP TYPE "public"."enum_states_blocks_state_docs_button_link_kind";
  DROP TYPE "public"."enum_states_blocks_quiz_demo_button_link_kind";
  DROP TYPE "public"."enum_states_hero_button_link_kind";
  DROP TYPE "public"."enum__states_v_blocks_logo_strip_arrangement";
  DROP TYPE "public"."enum__states_v_blocks_icon_list_layout";
  DROP TYPE "public"."enum__states_v_blocks_media_text_image_style";
  DROP TYPE "public"."enum__states_v_blocks_rev_slider_heading_level";
  DROP TYPE "public"."enum__states_v_blocks_cond_grid_list_heading_level";
  DROP TYPE "public"."enum__states_v_blocks_cond_grid_title_level";
  DROP TYPE "public"."enum__states_v_blocks_cond_grid_video_position";
  DROP TYPE "public"."enum__states_v_blocks_treat_cards_heading_align";
  DROP TYPE "public"."enum__states_v_blocks_center_text_background";
  DROP TYPE "public"."enum__states_v_blocks_center_text_heading_level";
  DROP TYPE "public"."enum__states_v_blocks_center_text_kind";
  DROP TYPE "public"."enum__states_v_blocks_center_text_button_link_kind";
  DROP TYPE "public"."enum__states_v_blocks_center_text_button_style";
  DROP TYPE "public"."enum__states_v_blocks_results_button_link_kind";
  DROP TYPE "public"."enum__states_v_blocks_results_align";
  DROP TYPE "public"."enum__states_v_blocks_state_docs_button_link_kind";
  DROP TYPE "public"."enum__states_v_blocks_quiz_demo_button_link_kind";
  DROP TYPE "public"."enum__states_v_version_hero_button_link_kind";
  DROP TYPE "public"."enum_clinics_blocks_logo_strip_arrangement";
  DROP TYPE "public"."enum_clinics_blocks_icon_list_layout";
  DROP TYPE "public"."enum_clinics_blocks_media_text_image_style";
  DROP TYPE "public"."enum_clinics_blocks_rev_slider_heading_level";
  DROP TYPE "public"."enum_clinics_blocks_cond_grid_list_heading_level";
  DROP TYPE "public"."enum_clinics_blocks_cond_grid_title_level";
  DROP TYPE "public"."enum_clinics_blocks_cond_grid_video_position";
  DROP TYPE "public"."enum_clinics_blocks_treat_cards_heading_align";
  DROP TYPE "public"."enum_clinics_blocks_center_text_background";
  DROP TYPE "public"."enum_clinics_blocks_center_text_heading_level";
  DROP TYPE "public"."enum_clinics_blocks_center_text_kind";
  DROP TYPE "public"."enum_clinics_blocks_center_text_button_link_kind";
  DROP TYPE "public"."enum_clinics_blocks_center_text_button_style";
  DROP TYPE "public"."enum_clinics_blocks_results_button_link_kind";
  DROP TYPE "public"."enum_clinics_blocks_results_align";
  DROP TYPE "public"."enum_clinics_blocks_state_docs_button_link_kind";
  DROP TYPE "public"."enum_clinics_blocks_quiz_demo_button_link_kind";
  DROP TYPE "public"."enum_clinics_hero_button_link_kind";
  DROP TYPE "public"."enum__clinics_v_blocks_logo_strip_arrangement";
  DROP TYPE "public"."enum__clinics_v_blocks_icon_list_layout";
  DROP TYPE "public"."enum__clinics_v_blocks_media_text_image_style";
  DROP TYPE "public"."enum__clinics_v_blocks_rev_slider_heading_level";
  DROP TYPE "public"."enum__clinics_v_blocks_cond_grid_list_heading_level";
  DROP TYPE "public"."enum__clinics_v_blocks_cond_grid_title_level";
  DROP TYPE "public"."enum__clinics_v_blocks_cond_grid_video_position";
  DROP TYPE "public"."enum__clinics_v_blocks_treat_cards_heading_align";
  DROP TYPE "public"."enum__clinics_v_blocks_center_text_background";
  DROP TYPE "public"."enum__clinics_v_blocks_center_text_heading_level";
  DROP TYPE "public"."enum__clinics_v_blocks_center_text_kind";
  DROP TYPE "public"."enum__clinics_v_blocks_center_text_button_link_kind";
  DROP TYPE "public"."enum__clinics_v_blocks_center_text_button_style";
  DROP TYPE "public"."enum__clinics_v_blocks_results_button_link_kind";
  DROP TYPE "public"."enum__clinics_v_blocks_results_align";
  DROP TYPE "public"."enum__clinics_v_blocks_state_docs_button_link_kind";
  DROP TYPE "public"."enum__clinics_v_blocks_quiz_demo_button_link_kind";
  DROP TYPE "public"."enum__clinics_v_version_hero_button_link_kind";
  DROP TYPE "public"."enum_doctors_blocks_logo_strip_arrangement";
  DROP TYPE "public"."enum_doctors_blocks_icon_list_layout";
  DROP TYPE "public"."enum_doctors_blocks_media_text_image_style";
  DROP TYPE "public"."enum_doctors_blocks_rev_slider_heading_level";
  DROP TYPE "public"."enum_doctors_blocks_cond_grid_list_heading_level";
  DROP TYPE "public"."enum_doctors_blocks_cond_grid_title_level";
  DROP TYPE "public"."enum_doctors_blocks_cond_grid_video_position";
  DROP TYPE "public"."enum_doctors_blocks_treat_cards_heading_align";
  DROP TYPE "public"."enum_doctors_blocks_center_text_background";
  DROP TYPE "public"."enum_doctors_blocks_center_text_heading_level";
  DROP TYPE "public"."enum_doctors_blocks_center_text_kind";
  DROP TYPE "public"."enum_doctors_blocks_center_text_button_link_kind";
  DROP TYPE "public"."enum_doctors_blocks_center_text_button_style";
  DROP TYPE "public"."enum_doctors_blocks_results_button_link_kind";
  DROP TYPE "public"."enum_doctors_blocks_results_align";
  DROP TYPE "public"."enum_doctors_blocks_state_docs_button_link_kind";
  DROP TYPE "public"."enum_doctors_blocks_quiz_demo_button_link_kind";
  DROP TYPE "public"."enum__doctors_v_blocks_logo_strip_arrangement";
  DROP TYPE "public"."enum__doctors_v_blocks_icon_list_layout";
  DROP TYPE "public"."enum__doctors_v_blocks_media_text_image_style";
  DROP TYPE "public"."enum__doctors_v_blocks_rev_slider_heading_level";
  DROP TYPE "public"."enum__doctors_v_blocks_cond_grid_list_heading_level";
  DROP TYPE "public"."enum__doctors_v_blocks_cond_grid_title_level";
  DROP TYPE "public"."enum__doctors_v_blocks_cond_grid_video_position";
  DROP TYPE "public"."enum__doctors_v_blocks_treat_cards_heading_align";
  DROP TYPE "public"."enum__doctors_v_blocks_center_text_background";
  DROP TYPE "public"."enum__doctors_v_blocks_center_text_heading_level";
  DROP TYPE "public"."enum__doctors_v_blocks_center_text_kind";
  DROP TYPE "public"."enum__doctors_v_blocks_center_text_button_link_kind";
  DROP TYPE "public"."enum__doctors_v_blocks_center_text_button_style";
  DROP TYPE "public"."enum__doctors_v_blocks_results_button_link_kind";
  DROP TYPE "public"."enum__doctors_v_blocks_results_align";
  DROP TYPE "public"."enum__doctors_v_blocks_state_docs_button_link_kind";
  DROP TYPE "public"."enum__doctors_v_blocks_quiz_demo_button_link_kind";
  DROP TYPE "public"."enum_treatments_blocks_logo_strip_arrangement";
  DROP TYPE "public"."enum_treatments_blocks_icon_list_layout";
  DROP TYPE "public"."enum_treatments_blocks_media_text_image_style";
  DROP TYPE "public"."enum_treatments_blocks_rev_slider_heading_level";
  DROP TYPE "public"."enum_treatments_blocks_cond_grid_list_heading_level";
  DROP TYPE "public"."enum_treatments_blocks_cond_grid_title_level";
  DROP TYPE "public"."enum_treatments_blocks_cond_grid_video_position";
  DROP TYPE "public"."enum_treatments_blocks_treat_cards_heading_align";
  DROP TYPE "public"."enum_treatments_blocks_center_text_background";
  DROP TYPE "public"."enum_treatments_blocks_center_text_heading_level";
  DROP TYPE "public"."enum_treatments_blocks_center_text_kind";
  DROP TYPE "public"."enum_treatments_blocks_center_text_button_link_kind";
  DROP TYPE "public"."enum_treatments_blocks_center_text_button_style";
  DROP TYPE "public"."enum_treatments_blocks_results_button_link_kind";
  DROP TYPE "public"."enum_treatments_blocks_results_align";
  DROP TYPE "public"."enum_treatments_blocks_state_docs_button_link_kind";
  DROP TYPE "public"."enum_treatments_blocks_quiz_demo_button_link_kind";
  DROP TYPE "public"."enum__treatments_v_blocks_logo_strip_arrangement";
  DROP TYPE "public"."enum__treatments_v_blocks_icon_list_layout";
  DROP TYPE "public"."enum__treatments_v_blocks_media_text_image_style";
  DROP TYPE "public"."enum__treatments_v_blocks_rev_slider_heading_level";
  DROP TYPE "public"."enum__treatments_v_blocks_cond_grid_list_heading_level";
  DROP TYPE "public"."enum__treatments_v_blocks_cond_grid_title_level";
  DROP TYPE "public"."enum__treatments_v_blocks_cond_grid_video_position";
  DROP TYPE "public"."enum__treatments_v_blocks_treat_cards_heading_align";
  DROP TYPE "public"."enum__treatments_v_blocks_center_text_background";
  DROP TYPE "public"."enum__treatments_v_blocks_center_text_heading_level";
  DROP TYPE "public"."enum__treatments_v_blocks_center_text_kind";
  DROP TYPE "public"."enum__treatments_v_blocks_center_text_button_link_kind";
  DROP TYPE "public"."enum__treatments_v_blocks_center_text_button_style";
  DROP TYPE "public"."enum__treatments_v_blocks_results_button_link_kind";
  DROP TYPE "public"."enum__treatments_v_blocks_results_align";
  DROP TYPE "public"."enum__treatments_v_blocks_state_docs_button_link_kind";
  DROP TYPE "public"."enum__treatments_v_blocks_quiz_demo_button_link_kind";
  DROP TYPE "public"."enum_conditions_blocks_logo_strip_arrangement";
  DROP TYPE "public"."enum_conditions_blocks_icon_list_layout";
  DROP TYPE "public"."enum_conditions_blocks_media_text_image_style";
  DROP TYPE "public"."enum_conditions_blocks_rev_slider_heading_level";
  DROP TYPE "public"."enum_conditions_blocks_cond_grid_list_heading_level";
  DROP TYPE "public"."enum_conditions_blocks_cond_grid_title_level";
  DROP TYPE "public"."enum_conditions_blocks_cond_grid_video_position";
  DROP TYPE "public"."enum_conditions_blocks_treat_cards_heading_align";
  DROP TYPE "public"."enum_conditions_blocks_center_text_background";
  DROP TYPE "public"."enum_conditions_blocks_center_text_heading_level";
  DROP TYPE "public"."enum_conditions_blocks_center_text_kind";
  DROP TYPE "public"."enum_conditions_blocks_center_text_button_link_kind";
  DROP TYPE "public"."enum_conditions_blocks_center_text_button_style";
  DROP TYPE "public"."enum_conditions_blocks_results_button_link_kind";
  DROP TYPE "public"."enum_conditions_blocks_results_align";
  DROP TYPE "public"."enum_conditions_blocks_state_docs_button_link_kind";
  DROP TYPE "public"."enum_conditions_blocks_quiz_demo_button_link_kind";
  DROP TYPE "public"."enum__conditions_v_blocks_logo_strip_arrangement";
  DROP TYPE "public"."enum__conditions_v_blocks_icon_list_layout";
  DROP TYPE "public"."enum__conditions_v_blocks_media_text_image_style";
  DROP TYPE "public"."enum__conditions_v_blocks_rev_slider_heading_level";
  DROP TYPE "public"."enum__conditions_v_blocks_cond_grid_list_heading_level";
  DROP TYPE "public"."enum__conditions_v_blocks_cond_grid_title_level";
  DROP TYPE "public"."enum__conditions_v_blocks_cond_grid_video_position";
  DROP TYPE "public"."enum__conditions_v_blocks_treat_cards_heading_align";
  DROP TYPE "public"."enum__conditions_v_blocks_center_text_background";
  DROP TYPE "public"."enum__conditions_v_blocks_center_text_heading_level";
  DROP TYPE "public"."enum__conditions_v_blocks_center_text_kind";
  DROP TYPE "public"."enum__conditions_v_blocks_center_text_button_link_kind";
  DROP TYPE "public"."enum__conditions_v_blocks_center_text_button_style";
  DROP TYPE "public"."enum__conditions_v_blocks_results_button_link_kind";
  DROP TYPE "public"."enum__conditions_v_blocks_results_align";
  DROP TYPE "public"."enum__conditions_v_blocks_state_docs_button_link_kind";
  DROP TYPE "public"."enum__conditions_v_blocks_quiz_demo_button_link_kind";
  DROP TYPE "public"."enum_posts_blocks_logo_strip_background";
  DROP TYPE "public"."enum_posts_blocks_logo_strip_arrangement";
  DROP TYPE "public"."enum_posts_blocks_icon_list_layout";
  DROP TYPE "public"."enum_posts_blocks_icon_list_button_link_kind";
  DROP TYPE "public"."enum_posts_blocks_media_text_button_link_kind";
  DROP TYPE "public"."enum_posts_blocks_media_text_side";
  DROP TYPE "public"."enum_posts_blocks_media_text_size";
  DROP TYPE "public"."enum_posts_blocks_media_text_background";
  DROP TYPE "public"."enum_posts_blocks_media_text_image_style";
  DROP TYPE "public"."enum_posts_blocks_insurance_button_link_kind";
  DROP TYPE "public"."enum_posts_blocks_doc_slider_button_link_kind";
  DROP TYPE "public"."enum_posts_blocks_doc_slider_bottom_button_link_kind";
  DROP TYPE "public"."enum_posts_blocks_rev_slider_button_link_kind";
  DROP TYPE "public"."enum_posts_blocks_rev_slider_heading_level";
  DROP TYPE "public"."enum_posts_blocks_cond_grid_list_heading_level";
  DROP TYPE "public"."enum_posts_blocks_cond_grid_title_level";
  DROP TYPE "public"."enum_posts_blocks_cond_grid_button_link_kind";
  DROP TYPE "public"."enum_posts_blocks_cond_grid_video_position";
  DROP TYPE "public"."enum_posts_blocks_cond_grid_background";
  DROP TYPE "public"."enum_posts_blocks_before_after_button_link_kind";
  DROP TYPE "public"."enum_posts_blocks_treat_cards_heading_align";
  DROP TYPE "public"."enum_posts_blocks_treat_cards_button_link_kind";
  DROP TYPE "public"."enum_posts_blocks_post_slider_button_link_kind";
  DROP TYPE "public"."enum_posts_blocks_site_cta_button_link_kind";
  DROP TYPE "public"."enum_posts_blocks_center_text_background";
  DROP TYPE "public"."enum_posts_blocks_center_text_heading_level";
  DROP TYPE "public"."enum_posts_blocks_center_text_kind";
  DROP TYPE "public"."enum_posts_blocks_center_text_button_link_kind";
  DROP TYPE "public"."enum_posts_blocks_center_text_button_style";
  DROP TYPE "public"."enum_posts_blocks_results_button_link_kind";
  DROP TYPE "public"."enum_posts_blocks_results_align";
  DROP TYPE "public"."enum_posts_blocks_state_docs_button_link_kind";
  DROP TYPE "public"."enum_posts_blocks_quiz_demo_button_link_kind";
  DROP TYPE "public"."enum__posts_v_blocks_logo_strip_background";
  DROP TYPE "public"."enum__posts_v_blocks_logo_strip_arrangement";
  DROP TYPE "public"."enum__posts_v_blocks_icon_list_layout";
  DROP TYPE "public"."enum__posts_v_blocks_icon_list_button_link_kind";
  DROP TYPE "public"."enum__posts_v_blocks_media_text_button_link_kind";
  DROP TYPE "public"."enum__posts_v_blocks_media_text_side";
  DROP TYPE "public"."enum__posts_v_blocks_media_text_size";
  DROP TYPE "public"."enum__posts_v_blocks_media_text_background";
  DROP TYPE "public"."enum__posts_v_blocks_media_text_image_style";
  DROP TYPE "public"."enum__posts_v_blocks_insurance_button_link_kind";
  DROP TYPE "public"."enum__posts_v_blocks_doc_slider_button_link_kind";
  DROP TYPE "public"."enum__posts_v_blocks_doc_slider_bottom_button_link_kind";
  DROP TYPE "public"."enum__posts_v_blocks_rev_slider_button_link_kind";
  DROP TYPE "public"."enum__posts_v_blocks_rev_slider_heading_level";
  DROP TYPE "public"."enum__posts_v_blocks_cond_grid_list_heading_level";
  DROP TYPE "public"."enum__posts_v_blocks_cond_grid_title_level";
  DROP TYPE "public"."enum__posts_v_blocks_cond_grid_button_link_kind";
  DROP TYPE "public"."enum__posts_v_blocks_cond_grid_video_position";
  DROP TYPE "public"."enum__posts_v_blocks_cond_grid_background";
  DROP TYPE "public"."enum__posts_v_blocks_before_after_button_link_kind";
  DROP TYPE "public"."enum__posts_v_blocks_treat_cards_heading_align";
  DROP TYPE "public"."enum__posts_v_blocks_treat_cards_button_link_kind";
  DROP TYPE "public"."enum__posts_v_blocks_post_slider_button_link_kind";
  DROP TYPE "public"."enum__posts_v_blocks_site_cta_button_link_kind";
  DROP TYPE "public"."enum__posts_v_blocks_center_text_background";
  DROP TYPE "public"."enum__posts_v_blocks_center_text_heading_level";
  DROP TYPE "public"."enum__posts_v_blocks_center_text_kind";
  DROP TYPE "public"."enum__posts_v_blocks_center_text_button_link_kind";
  DROP TYPE "public"."enum__posts_v_blocks_center_text_button_style";
  DROP TYPE "public"."enum__posts_v_blocks_results_button_link_kind";
  DROP TYPE "public"."enum__posts_v_blocks_results_align";
  DROP TYPE "public"."enum__posts_v_blocks_state_docs_button_link_kind";
  DROP TYPE "public"."enum__posts_v_blocks_quiz_demo_button_link_kind";
  DROP TYPE "public"."enum_presets_blocks_image_hero_crumbs_link_kind";
  DROP TYPE "public"."enum_presets_blocks_image_hero_size";
  DROP TYPE "public"."enum_presets_blocks_image_hero_button_link_kind";
  DROP TYPE "public"."enum_presets_blocks_logo_strip_arrangement";
  DROP TYPE "public"."enum_presets_blocks_icon_list_layout";
  DROP TYPE "public"."enum_presets_blocks_media_text_image_style";
  DROP TYPE "public"."enum_presets_blocks_rev_slider_heading_level";
  DROP TYPE "public"."enum_presets_blocks_cond_grid_list_heading_level";
  DROP TYPE "public"."enum_presets_blocks_cond_grid_title_level";
  DROP TYPE "public"."enum_presets_blocks_cond_grid_video_position";
  DROP TYPE "public"."enum_presets_blocks_treat_cards_heading_align";
  DROP TYPE "public"."enum_presets_blocks_center_text_background";
  DROP TYPE "public"."enum_presets_blocks_center_text_heading_level";
  DROP TYPE "public"."enum_presets_blocks_center_text_kind";
  DROP TYPE "public"."enum_presets_blocks_center_text_button_link_kind";
  DROP TYPE "public"."enum_presets_blocks_center_text_button_style";
  DROP TYPE "public"."enum_presets_blocks_sticky_media_chapters_button_link_kind";
  DROP TYPE "public"."enum_presets_blocks_sticky_media_chapters_note_size";
  DROP TYPE "public"."enum_presets_blocks_results_button_link_kind";
  DROP TYPE "public"."enum_presets_blocks_results_align";
  DROP TYPE "public"."enum_presets_blocks_state_docs_button_link_kind";
  DROP TYPE "public"."enum_presets_blocks_quiz_demo_button_link_kind";`)
}
