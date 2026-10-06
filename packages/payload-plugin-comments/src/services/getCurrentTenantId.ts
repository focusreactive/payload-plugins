import type { Payload } from "payload";
import { getTenantFromCookie } from "@payloadcms/plugin-multi-tenant/utilities";
import type { CommentsPluginConfigStorage } from "../types";

export function getCurrentTenantId(payload: Payload, headers: Headers) {
  const pluginConfig = payload.config.admin?.custom?.commentsPlugin as
    | CommentsPluginConfigStorage
    | undefined;

  const tenantConfig = pluginConfig?.tenant;

  if (!tenantConfig?.enabled) return null;

  return getTenantFromCookie(headers, payload.db.defaultIDType);
}
