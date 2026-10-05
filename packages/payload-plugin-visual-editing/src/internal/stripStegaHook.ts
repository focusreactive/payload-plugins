import type { CollectionBeforeChangeHook, GlobalBeforeChangeHook } from "payload";

import { vercelStegaSplit } from "@vercel/stega";

import { META_KEY, isPlainObject } from "./shared.js";

// Defense in depth: strip stega from every write so zero-width chars can never
// reach the database, even if the gate ever mis-classifies a read. Idempotent.
export const createStripStegaHook = (): CollectionBeforeChangeHook & GlobalBeforeChangeHook => {
  return ({ data }: { data: unknown }) => {
    stripStega(data);
    return data;
  };
};

const stripStega = (value: unknown): void => {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (typeof item === "string") value[i] = vercelStegaSplit(item).cleaned;
      else stripStega(item);
    }
    return;
  }

  if (!isPlainObject(value)) return;

  for (const key in value) {
    if (key === META_KEY) continue;
    const current = value[key];
    if (typeof current === "string") value[key] = vercelStegaSplit(current).cleaned;
    else stripStega(current);
  }
};
