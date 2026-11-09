import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload";

import { ALL_LOCALES } from "@/lib/config/i18n";
import { getLocaleFromRequest } from "@/lib/utils/getLocaleFromRequest";
import { revalidatePageCache } from "@/lib/utils/revalidatePageCache";
import type { Page } from "@/payload-types";

// `_status` is not localized: publishing, unpublishing or deleting changes the page in every locale.
export const revalidatePage: CollectionAfterChangeHook<Page> = async ({
  doc,
  previousDoc,
  req,
}) => {
  const { payload, context } = req;
  const locale = getLocaleFromRequest(req);

  if (!context.disableRevalidate) {
    const statusChanged = previousDoc?._status !== doc._status;

    if (doc._status === "published") {
      revalidatePageCache({ doc, locales: statusChanged ? ALL_LOCALES : [locale], payload });
    }

    if (previousDoc?._status === "published" && doc._status !== "published") {
      revalidatePageCache({ doc: previousDoc, locales: ALL_LOCALES, payload });
    }
  }

  return doc;
};

export const revalidateDelete: CollectionAfterDeleteHook<Page> = async ({ doc, req }) => {
  const { payload, context } = req;
  if (!context.disableRevalidate) {
    revalidatePageCache({ doc, locales: ALL_LOCALES, payload });
  }
  return doc;
};
