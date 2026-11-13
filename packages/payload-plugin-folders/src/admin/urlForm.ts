import { useConfig } from "@payloadcms/ui";
import { useCallback } from "react";

import { pluginSlug } from "../constants.js";
import { formatPath } from "../core/paths.js";

/**
 * Puts a canonical path in the form the site serves (`urls.trailingSlash`), for display and for the
 * clipboard. Everything the admin compares, composes or sends stays canonical.
 */
export const useFormatUrl = (): ((path: string) => string) => {
  const { config } = useConfig();
  const custom = config.admin?.custom as Record<string, { trailingSlash?: unknown }> | undefined;
  const trailingSlash = custom?.[pluginSlug]?.trailingSlash === true;

  return useCallback((path: string) => formatPath(path, trailingSlash), [trailingSlash]);
};
