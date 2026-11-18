import { BREADCRUMBS_CSS } from "./breadcrumbs.js";
import { CARD_CSS } from "./card.js";
import { DRAWER_CSS } from "./drawer.js";
import { FLASH_CSS } from "./flash.js";
import { PANEL_CSS } from "./panel.js";
import { ROW_HEADER_CSS } from "./rows.js";

export const STACKED_EDITING_CSS = [
  PANEL_CSS,
  BREADCRUMBS_CSS,
  ROW_HEADER_CSS,
  DRAWER_CSS,
  FLASH_CSS,
  CARD_CSS,
].join("\n");
