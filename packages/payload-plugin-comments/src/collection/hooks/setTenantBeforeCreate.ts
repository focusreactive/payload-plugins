import type { CollectionBeforeChangeHook, CollectionSlug } from "payload";
import type { CommentsPluginConfigStorage } from "../../types";

export const setTenantBeforeCreate: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  if (operation !== "create") return data;

  const pluginConfig = req.payload.config.admin?.custom?.commentsPlugin as CommentsPluginConfigStorage | undefined;

  const tenantConfig = pluginConfig?.tenant;
  if (!tenantConfig?.enabled) return data;

  const documentTenantField = tenantConfig.documentTenantField ?? "tenant";

  try {
    const doc = await req.payload.findByID({
      collection: data.collectionSlug as CollectionSlug,
      id: data.documentId as string | number,
      depth: 0,
      req,
    });
    data.tenant = (doc as unknown as Record<string, unknown>)?.[documentTenantField] ?? null;
  } catch (err) {
    req.payload.logger.error({ err, msg: "setTenantBeforeCreate: failed to resolve tenant" });
    data.tenant = null;
  }

  return data;
};
