import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload";

import { ALL_LOCALES } from "@/lib/config/i18n";
import { getLocaleFromRequest } from "@/lib/utils/getLocaleFromRequest";
import { getPathFromBreadcrumbs } from "@/lib/utils/path/getPathFromBreadcrumbs";
import { revalidateAllPagePaths, revalidatePageCache } from "@/lib/utils/revalidatePageCache";
import type { Page } from "@/payload-types";

import { publishedPathBeforeChange, readPublishedPath } from "./publishedPath";

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

      const previousPath = publishedPathBeforeChange(req, doc.id);
      const currentPath = getPathFromBreadcrumbs(doc.breadcrumbs) ?? "home";
      if (previousPath !== undefined && previousPath !== currentPath) {
        revalidateAllPagePaths(payload);
      }
    }

    if (previousDoc?._status === "published" && doc._status !== "published") {
      revalidatePageCache({ doc: previousDoc, locales: ALL_LOCALES, payload });

      if ((await readPublishedPath(req, doc.id)) === undefined) {
        revalidateAllPagePaths(payload);
      }
    }
  }

  return doc;
};

export const revalidateDelete: CollectionAfterDeleteHook<Page> = async ({ doc, req }) => {
  const { payload, context } = req;
  if (!context.disableRevalidate) {
    revalidatePageCache({ doc, locales: ALL_LOCALES, payload });

    if (doc._status === "published") {
      revalidateAllPagePaths(payload);
    }
  }
  return doc;
};
