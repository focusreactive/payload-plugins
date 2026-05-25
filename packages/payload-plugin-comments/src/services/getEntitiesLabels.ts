import type { EntityLabelsMap, EntityConfig } from "../types";

export function getEntitiesLabels(entities: EntityConfig[], enabledSlugs: string[]) {
  const slugSet = new Set(enabledSlugs);
  const result: EntityLabelsMap = {};

  for (const entity of entities) {
    if (!slugSet.has(entity.slug)) continue;

    const rawLabel = "labels" in entity ? entity.labels?.plural : entity.label;

    result[entity.slug] = typeof rawLabel === "function" || rawLabel === undefined ? entity.slug : rawLabel;
  }

  return result;
}
