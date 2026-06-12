import * as migration_20260525_110727_init from "./20260525_110727_init";
import * as migration_20260604_101934_create_ab_experiments from "./20260604_101934_create_ab_experiments";
import * as migration_20260611_185703_add_accent_ghost_link_appearances_to_link_field from "./20260611_185703_add_accent_ghost_link_appearances_to_link_field";
import * as migration_20260611_193219_restructure_header_nav from "./20260611_193219_restructure_header_nav";
import * as migration_20260611_211958_add_hero_variant_badge from "./20260611_211958_add_hero_variant_badge";
import * as migration_20260611_225544_add_label_to_logos_field from "./20260611_225544_add_label_to_logos_field";
import * as migration_20260611_234007_add_cards_grid_icon from "./20260611_234007_add_cards_grid_icon";
import * as migration_20260612_000134_add_content_badge_actions from "./20260612_000134_add_content_badge_actions";
import * as migration_20260612_001429_add_chart_block from "./20260612_001429_add_chart_block";
import * as migration_20260612_002752_add_faq_badge_lead from "./20260612_002752_add_faq_badge_lead";
import * as migration_20260612_003704_add_cta_band_block from "./20260612_003704_add_cta_band_block";
import * as migration_20260612_004802_add_newsletter_block from "./20260612_004802_add_newsletter_block";
import * as migration_20260612_010046_add_stats_block from "./20260612_010046_add_stats_block";
import * as migration_20260612_011722_drop_old_footer_links_text from "./20260612_011722_drop_old_footer_links_text";
import * as migration_20260612_084209_add_footer_link_groups_legal_links from "./20260612_084209_add_footer_link_groups_legal_links";
import * as migration_20260612_183356_add_section_header_fields_to_blocks from "./20260612_183356_add_section_header_fields_to_blocks";

export const migrations = [
  {
    up: migration_20260525_110727_init.up,
    down: migration_20260525_110727_init.down,
    name: "20260525_110727_init",
  },
  {
    up: migration_20260604_101934_create_ab_experiments.up,
    down: migration_20260604_101934_create_ab_experiments.down,
    name: "20260604_101934_create_ab_experiments",
  },
  {
    up: migration_20260611_185703_add_accent_ghost_link_appearances_to_link_field.up,
    down: migration_20260611_185703_add_accent_ghost_link_appearances_to_link_field.down,
    name: "20260611_185703_add_accent_ghost_link_appearances_to_link_field",
  },
  {
    up: migration_20260611_193219_restructure_header_nav.up,
    down: migration_20260611_193219_restructure_header_nav.down,
    name: "20260611_193219_restructure_header_nav",
  },
  {
    up: migration_20260611_211958_add_hero_variant_badge.up,
    down: migration_20260611_211958_add_hero_variant_badge.down,
    name: "20260611_211958_add_hero_variant_badge",
  },
  {
    up: migration_20260611_225544_add_label_to_logos_field.up,
    down: migration_20260611_225544_add_label_to_logos_field.down,
    name: "20260611_225544_add_label_to_logos_field",
  },
  {
    up: migration_20260611_234007_add_cards_grid_icon.up,
    down: migration_20260611_234007_add_cards_grid_icon.down,
    name: "20260611_234007_add_cards_grid_icon",
  },
  {
    up: migration_20260612_000134_add_content_badge_actions.up,
    down: migration_20260612_000134_add_content_badge_actions.down,
    name: "20260612_000134_add_content_badge_actions",
  },
  {
    up: migration_20260612_001429_add_chart_block.up,
    down: migration_20260612_001429_add_chart_block.down,
    name: "20260612_001429_add_chart_block",
  },
  {
    up: migration_20260612_002752_add_faq_badge_lead.up,
    down: migration_20260612_002752_add_faq_badge_lead.down,
    name: "20260612_002752_add_faq_badge_lead",
  },
  {
    up: migration_20260612_003704_add_cta_band_block.up,
    down: migration_20260612_003704_add_cta_band_block.down,
    name: "20260612_003704_add_cta_band_block",
  },
  {
    up: migration_20260612_004802_add_newsletter_block.up,
    down: migration_20260612_004802_add_newsletter_block.down,
    name: "20260612_004802_add_newsletter_block",
  },
  {
    up: migration_20260612_010046_add_stats_block.up,
    down: migration_20260612_010046_add_stats_block.down,
    name: "20260612_010046_add_stats_block",
  },
  {
    up: migration_20260612_011722_drop_old_footer_links_text.up,
    down: migration_20260612_011722_drop_old_footer_links_text.down,
    name: "20260612_011722_drop_old_footer_links_text",
  },
  {
    up: migration_20260612_084209_add_footer_link_groups_legal_links.up,
    down: migration_20260612_084209_add_footer_link_groups_legal_links.down,
    name: "20260612_084209_add_footer_link_groups_legal_links",
  },
  {
    up: migration_20260612_183356_add_section_header_fields_to_blocks.up,
    down: migration_20260612_183356_add_section_header_fields_to_blocks.down,
    name: "20260612_183356_add_section_header_fields_to_blocks",
  },
];
