import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload";

import { revalidatePathMap } from "@/lib/dal/pathMap";
import { getLocaleFromRequest } from "@/lib/utils/getLocaleFromRequest";
import { revalidatePageCache } from "@/lib/utils/revalidatePageCache";
import type { Page } from "@/payload-types";

export const revalidatePage: CollectionAfterChangeHook<Page> = async ({
  doc,
  previousDoc,
  req,
}) => {
  const { payload, context } = req;
  const locale = getLocaleFromRequest(req);

  if (!context.disableRevalidate) {
    // The path map is rebuilt from every published page in every locale, so
    // any change to this document - a slug, a parent, or a publish/unpublish
    // - can move its own path or a descendant's. Rebuild unconditionally
    // rather than trying to decide whether this particular change moved a
    // path: that decision is exactly what the old per-path tag got wrong.
    revalidatePathMap();

    if (doc._status === "published") {
      revalidatePageCache({ doc, locale, payload });
    }

    if (previousDoc?._status === "published" && doc._status !== "published") {
      revalidatePageCache({ doc: previousDoc, locale, payload });
    }
  }

  return doc;
};

export const revalidateDelete: CollectionAfterDeleteHook<Page> = async ({ doc, req }) => {
  const { payload, context } = req;
  if (!context.disableRevalidate) {
    revalidatePathMap();
    const locale = getLocaleFromRequest(req);
    revalidatePageCache({ doc, locale, payload });
  }
  return doc;
};
