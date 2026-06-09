import type { Visualization } from "../../../types/visualization";
import { pluralize } from "../utils/pluralize";
import { readDrilldownItems } from "../utils/readDrilldownItems";
import { PRESENCE } from "./resolvePresence";

export const resolveDrilldown = (data: Record<string, unknown> | undefined, key: string, one: string, many: string): Visualization => {
  const items = readDrilldownItems(data, key);
  if (!items?.length) return PRESENCE;

  return {
    type: "count-drilldown",
    drilldown: {
      items,
      label: `Show ${pluralize(items.length, one, many)}`,
    },
  };
};
