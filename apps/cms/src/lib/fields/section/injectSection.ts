import type { Block } from "payload";

import { embedSectionTab } from "./embedSectionTab";
import { withSectionVisibility } from "./withSectionVisibility";

export function injectSection(block: Block): Block {
  return withSectionVisibility({
    ...block,
    fields: embedSectionTab(block.fields),
  });
}
