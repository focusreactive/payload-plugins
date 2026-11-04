import type { CollectionBeforeValidateHook } from "payload";

import { getDefaultLocaleKey, requestLocaleKey } from "../../core/locales.js";
import { readRedirectsOptOut } from "../../core/redirectsOptOut.js";
import { slugify } from "../../core/slugify.js";
import { isEmptyText } from "../../core/structureGuard.js";
import type { ResolvedOptions } from "../../types.js";
import { isInternalWrite, slugNotSentContextKey } from "../context.js";

const asText = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * An empty slug is derived from the name (spec section 2.6), before Payload's required check on
 * the slug runs. A submitted slug is never cut or rewritten here: the format check refuses it.
 */
export const buildFolderBeforeValidate =
  (options: ResolvedOptions): CollectionBeforeValidateHook =>
  ({ data, operation, originalDoc, req }) => {
    if (!data || isInternalWrite(req) || (operation !== "create" && operation !== "update")) {
      return data;
    }

    // The admin's folder saves reach Payload's own route, which has no field for this, so the choice
    // of the confirmation dialog rides on the query. The folder's hooks and the subtree rewrite read
    // it from the request context, the same place a Local API caller sets it.
    if (operation === "update" && readRedirectsOptOut(req.query)) {
      req.context.foldersRedirects = false;
    }

    const writeKey = requestLocaleKey(req.payload, options, req.locale);

    if (writeKey === "all") {
      const names = (data.name ?? {}) as Record<string, string | null>;
      const slugs = { ...((data.slug ?? {}) as Record<string, string | null>) };
      for (const [localeKey, name] of Object.entries(names)) {
        if (
          isEmptyText(slugs[localeKey]) &&
          !isEmptyText(name) &&
          (operation === "create" || localeKey in slugs)
        ) {
          slugs[localeKey] = slugify(asText(name), localeKey);
        }
      }
      if (Object.keys(slugs).length > 0) {
        data.slug = slugs as never;
      }

      return data;
    }

    // On an update the slug is only derived when the caller sent it empty, never when it is absent.
    const slugIsEmpty = isEmptyText(data.slug);
    if (
      !slugIsEmpty ||
      (operation === "update" && !("slug" in data)) ||
      req.context?.[slugNotSentContextKey]
    ) {
      return data;
    }
    const isDefaultLocale = writeKey === getDefaultLocaleKey(req.payload, options);
    const name = isEmptyText(data.name)
      ? operation === "update" && isDefaultLocale
        ? originalDoc?.name
        : undefined
      : data.name;
    const derived = slugify(asText(name), req.locale ?? undefined);
    if (derived !== "") {
      data.slug = derived;
    }

    return data;
  };
