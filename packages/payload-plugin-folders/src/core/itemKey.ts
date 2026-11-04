import type { ItemRef } from "../types.js";

/** Key of one item: pages and folders can share an id, so the collection is part of it. */
export const itemKey = (ref: ItemRef): string => `${ref.collection}:${ref.id}`;
