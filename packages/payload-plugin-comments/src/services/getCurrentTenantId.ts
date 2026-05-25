"use server";

import { getTenantFromCookie } from "@payloadcms/plugin-multi-tenant/utilities";
import { headers as getHeaders } from "next/headers";
import type { Payload } from "payload";

import type { CommentsPluginConfigStorage } from "../types";

export async function getCurrentTenantId(payload: Payload) {
  const pluginConfig = payload.config.admin?.custom?.commentsPlugin as
    | CommentsPluginConfigStorage
    | undefined;

  const tenantConfig = pluginConfig?.tenant;

  if (!tenantConfig?.enabled) {return null;}

  return getTenantFromCookie(await getHeaders(), payload.db.defaultIDType);
}
