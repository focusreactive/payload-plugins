import { useConfig } from "@payloadcms/ui";

import type { ApiBase } from "../../../api/createRequest.js";
import { useTranslateKitConfig } from "../../../config/index.js";

/**
 * Relative, never prefixed with `serverURL`: a `serverURL` on another origin than the one the admin
 * is opened on would send every request without the session cookie.
 */
export function useApiBase(): ApiBase {
  const { config } = useConfig();
  const { basePath } = useTranslateKitConfig();
  return `${config.routes.api}${basePath}`;
}
