import type { CollectionBeforeChangeHook, GlobalBeforeChangeHook } from "payload";

import { META_KEY } from "../../shared/shared.js";
import { isPlainObject } from "../../shared/plainObject.js";
import { withoutMarker } from "../../shared/stegaText.js";

const stripStega = (value: unknown): void => {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (typeof item === "string") value[i] = withoutMarker(item);
      else stripStega(item);
    }
    return;
  }

  if (!isPlainObject(value)) return;

  for (const key in value) {
    if (key === META_KEY) continue;
    const current = value[key];
    if (typeof current === "string") value[key] = withoutMarker(current);
    else stripStega(current);
  }
};

export const createStripStegaHook = (): CollectionBeforeChangeHook & GlobalBeforeChangeHook => {
  return ({ data }: { data: unknown }) => {
    stripStega(data);
    return data;
  };
};
