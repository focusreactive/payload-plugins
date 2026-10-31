import { APIError } from "payload";
import type { CollectionBeforeDeleteHook } from "payload";

import { findPagesUsingGlobalBlock } from "../findPagesUsingGlobalBlock";

export const preventDeleteIfReferenced: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const pages = await findPagesUsingGlobalBlock({ id, includeDrafts: true, req });

  if (pages.length > 0) {
    const titles = pages.map((p) => p.title || `#${p.id}`).join(", ");

    throw new APIError(
      `Cannot delete this global block: it is still used by ${pages.length} page(s): ${titles}. Remove those references first.`,
      400,
      undefined,
      true
    );
  }
};
