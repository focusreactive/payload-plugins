import type { DrilldownNoun, Visualization } from "../../../types/visualization";
import { readDrilldownItems } from "../utils/readDrilldownItems";
import { PRESENCE } from "./resolvePresence";

export const resolveDrilldown = (
  data: Record<string, unknown> | undefined,
  key: string,
  noun: DrilldownNoun
): Visualization => {
  const items = readDrilldownItems(data, key);
  if (!items?.length) return PRESENCE;

  return {
    type: "count-drilldown",
    drilldown: { items, noun },
  };
};
