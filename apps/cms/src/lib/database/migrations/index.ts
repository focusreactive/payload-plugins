import * as migration_20260525_110727_init from './20260525_110727_init';
import * as migration_20260604_101934_create_ab_experiments from './20260604_101934_create_ab_experiments';
import * as migration_20260611_185703_add_accent_ghost_link_appearances_to_link_field from './20260611_185703_add_accent_ghost_link_appearances_to_link_field';
import * as migration_20260611_193219_restructure_header_nav from './20260611_193219_restructure_header_nav';
import * as migration_20260611_211958_add_hero_variant_badge from './20260611_211958_add_hero_variant_badge';
import * as migration_20260611_225544_add_label_to_logos_field from './20260611_225544_add_label_to_logos_field';
import * as migration_20260611_234007_add_cards_grid_icon from './20260611_234007_add_cards_grid_icon';
import * as migration_20260612_000134_add_content_badge_actions from './20260612_000134_add_content_badge_actions';
import * as migration_20260612_001429_add_chart_block from './20260612_001429_add_chart_block';
import * as migration_20260612_002752_add_faq_badge_lead from './20260612_002752_add_faq_badge_lead';
import * as migration_20260612_003704_add_cta_band_block from './20260612_003704_add_cta_band_block';
import * as migration_20260612_004802_add_newsletter_block from './20260612_004802_add_newsletter_block';
import * as migration_20260612_010046_add_stats_block from './20260612_010046_add_stats_block';
import * as migration_20260612_011722_drop_old_footer_links_text from './20260612_011722_drop_old_footer_links_text';
import * as migration_20260612_084209_add_footer_link_groups_legal_links from './20260612_084209_add_footer_link_groups_legal_links';
import * as migration_20260612_183356_add_section_header_fields_to_blocks from './20260612_183356_add_section_header_fields_to_blocks';
import * as migration_20260612_195026_add_faq_cta_author_avatar_to_post_add_blog_badge_search_placeholder_to_global_settings from './20260612_195026_add_faq_cta_author_avatar_to_post_add_blog_badge_search_placeholder_to_global_settings';
import * as migration_20260614_113524_add_remaining_collections_to_mcp from './20260614_113524_add_remaining_collections_to_mcp';
import * as migration_20260616_160111_remove_hero_overlay from './20260616_160111_remove_hero_overlay';
import * as migration_20260616_164719_remove_media_background_hero_variant from './20260616_164719_remove_media_background_hero_variant';
import * as migration_20260616_175744_update_section_header_fields from './20260616_175744_update_section_header_fields';
import * as migration_20260616_181257_update_post_cta_headings from './20260616_181257_update_post_cta_headings';
import * as migration_20260616_182705_remove_links_and_text_blocks from './20260616_182705_remove_links_and_text_blocks';
import * as migration_20260617_104920_add_raw_html_block from './20260617_104920_add_raw_html_block';
import * as migration_20260618_200838_add_section_visibility_to_blocks from './20260618_200838_add_section_visibility_to_blocks';
import * as migration_20260619_011448_add_pgvector_embedding_column from './20260619_011448_add_pgvector_embedding_column';
import * as migration_20260622_105221_rename_copywrite from './20260622_105221_rename_copywrite';
import * as migration_20260628_193856_create_and_wire_global_section_collection from './20260628_193856_create_and_wire_global_section_collection';
import * as migration_20260630_154649_add_reading_time_to_posts from './20260630_154649_add_reading_time_to_posts';
import * as migration_20260706_095438_add_section_visibility_to_global_section_slot from './20260706_095438_add_section_visibility_to_global_section_slot';
import * as migration_20260708_183318_remove_aspect_ratio_from_unneccesary_blocks from './20260708_183318_remove_aspect_ratio_from_unneccesary_blocks';
import * as migration_20260713_155547_restructure_global_settings from './20260713_155547_restructure_global_settings';

export const migrations = [
  {
    up: migration_20260525_110727_init.up,
    down: migration_20260525_110727_init.down,
    name: '20260525_110727_init',
  },
  {
    up: migration_20260604_101934_create_ab_experiments.up,
    down: migration_20260604_101934_create_ab_experiments.down,
    name: '20260604_101934_create_ab_experiments',
  },
  {
    up: migration_20260611_185703_add_accent_ghost_link_appearances_to_link_field.up,
    down: migration_20260611_185703_add_accent_ghost_link_appearances_to_link_field.down,
    name: '20260611_185703_add_accent_ghost_link_appearances_to_link_field',
  },
  {
    up: migration_20260611_193219_restructure_header_nav.up,
    down: migration_20260611_193219_restructure_header_nav.down,
    name: '20260611_193219_restructure_header_nav',
  },
  {
    up: migration_20260611_211958_add_hero_variant_badge.up,
    down: migration_20260611_211958_add_hero_variant_badge.down,
    name: '20260611_211958_add_hero_variant_badge',
  },
  {
    up: migration_20260611_225544_add_label_to_logos_field.up,
    down: migration_20260611_225544_add_label_to_logos_field.down,
    name: '20260611_225544_add_label_to_logos_field',
  },
  {
    up: migration_20260611_234007_add_cards_grid_icon.up,
    down: migration_20260611_234007_add_cards_grid_icon.down,
    name: '20260611_234007_add_cards_grid_icon',
  },
  {
    up: migration_20260612_000134_add_content_badge_actions.up,
    down: migration_20260612_000134_add_content_badge_actions.down,
    name: '20260612_000134_add_content_badge_actions',
  },
  {
    up: migration_20260612_001429_add_chart_block.up,
    down: migration_20260612_001429_add_chart_block.down,
    name: '20260612_001429_add_chart_block',
  },
  {
    up: migration_20260612_002752_add_faq_badge_lead.up,
    down: migration_20260612_002752_add_faq_badge_lead.down,
    name: '20260612_002752_add_faq_badge_lead',
  },
  {
    up: migration_20260612_003704_add_cta_band_block.up,
    down: migration_20260612_003704_add_cta_band_block.down,
    name: '20260612_003704_add_cta_band_block',
  },
  {
    up: migration_20260612_004802_add_newsletter_block.up,
    down: migration_20260612_004802_add_newsletter_block.down,
    name: '20260612_004802_add_newsletter_block',
  },
  {
    up: migration_20260612_010046_add_stats_block.up,
    down: migration_20260612_010046_add_stats_block.down,
    name: '20260612_010046_add_stats_block',
  },
  {
    up: migration_20260612_011722_drop_old_footer_links_text.up,
    down: migration_20260612_011722_drop_old_footer_links_text.down,
    name: '20260612_011722_drop_old_footer_links_text',
  },
  {
    up: migration_20260612_084209_add_footer_link_groups_legal_links.up,
    down: migration_20260612_084209_add_footer_link_groups_legal_links.down,
    name: '20260612_084209_add_footer_link_groups_legal_links',
  },
  {
    up: migration_20260612_183356_add_section_header_fields_to_blocks.up,
    down: migration_20260612_183356_add_section_header_fields_to_blocks.down,
    name: '20260612_183356_add_section_header_fields_to_blocks',
  },
  {
    up: migration_20260612_195026_add_faq_cta_author_avatar_to_post_add_blog_badge_search_placeholder_to_global_settings.up,
    down: migration_20260612_195026_add_faq_cta_author_avatar_to_post_add_blog_badge_search_placeholder_to_global_settings.down,
    name: '20260612_195026_add_faq_cta_author_avatar_to_post_add_blog_badge_search_placeholder_to_global_settings',
  },
  {
    up: migration_20260614_113524_add_remaining_collections_to_mcp.up,
    down: migration_20260614_113524_add_remaining_collections_to_mcp.down,
    name: '20260614_113524_add_remaining_collections_to_mcp',
  },
  {
    up: migration_20260616_160111_remove_hero_overlay.up,
    down: migration_20260616_160111_remove_hero_overlay.down,
    name: '20260616_160111_remove_hero_overlay',
  },
  {
    up: migration_20260616_164719_remove_media_background_hero_variant.up,
    down: migration_20260616_164719_remove_media_background_hero_variant.down,
    name: '20260616_164719_remove_media_background_hero_variant',
  },
  {
    up: migration_20260616_175744_update_section_header_fields.up,
    down: migration_20260616_175744_update_section_header_fields.down,
    name: '20260616_175744_update_section_header_fields',
  },
  {
    up: migration_20260616_181257_update_post_cta_headings.up,
    down: migration_20260616_181257_update_post_cta_headings.down,
    name: '20260616_181257_update_post_cta_headings',
  },
  {
    up: migration_20260616_182705_remove_links_and_text_blocks.up,
    down: migration_20260616_182705_remove_links_and_text_blocks.down,
    name: '20260616_182705_remove_links_and_text_blocks',
  },
  {
    up: migration_20260617_104920_add_raw_html_block.up,
    down: migration_20260617_104920_add_raw_html_block.down,
    name: '20260617_104920_add_raw_html_block',
  },
  {
    up: migration_20260618_200838_add_section_visibility_to_blocks.up,
    down: migration_20260618_200838_add_section_visibility_to_blocks.down,
    name: '20260618_200838_add_section_visibility_to_blocks',
  },
  {
    up: migration_20260619_011448_add_pgvector_embedding_column.up,
    down: migration_20260619_011448_add_pgvector_embedding_column.down,
    name: '20260619_011448_add_pgvector_embedding_column',
  },
  {
    up: migration_20260622_105221_rename_copywrite.up,
    down: migration_20260622_105221_rename_copywrite.down,
    name: '20260622_105221_rename_copywrite',
  },
  {
    up: migration_20260628_193856_create_and_wire_global_section_collection.up,
    down: migration_20260628_193856_create_and_wire_global_section_collection.down,
    name: '20260628_193856_create_and_wire_global_section_collection',
  },
  {
    up: migration_20260630_154649_add_reading_time_to_posts.up,
    down: migration_20260630_154649_add_reading_time_to_posts.down,
    name: '20260630_154649_add_reading_time_to_posts',
  },
  {
    up: migration_20260706_095438_add_section_visibility_to_global_section_slot.up,
    down: migration_20260706_095438_add_section_visibility_to_global_section_slot.down,
    name: '20260706_095438_add_section_visibility_to_global_section_slot',
  },
  {
    up: migration_20260708_183318_remove_aspect_ratio_from_unneccesary_blocks.up,
    down: migration_20260708_183318_remove_aspect_ratio_from_unneccesary_blocks.down,
    name: '20260708_183318_remove_aspect_ratio_from_unneccesary_blocks',
  },
  {
    up: migration_20260713_155547_restructure_global_settings.up,
    down: migration_20260713_155547_restructure_global_settings.down,
    name: '20260713_155547_restructure_global_settings'
  },
];
