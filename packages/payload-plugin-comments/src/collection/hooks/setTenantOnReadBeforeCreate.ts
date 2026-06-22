import type { CollectionBeforeChangeHook } from "payload";
import { DEFAULT_COLLECTION_SLUG } from "../../constants";
import type { Comment, CommentsPluginConfigStorage } from "../../types";

export const setTenantOnReadBeforeCreate: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
}) => {
  if (operation !== "create") return data;

  const pluginConfig = req.payload.config.admin?.custom?.commentsPlugin as
    | CommentsPluginConfigStorage
    | undefined;
  const tenantConfig = pluginConfig?.tenant;
  if (!tenantConfig?.enabled) return data;

  const commentId =
    typeof data.comment === "object" && data.comment !== null ? data.comment.id : data.comment;
  if (commentId == null) return data;

  try {
    const comment = await req.payload.findByID({
      collection: DEFAULT_COLLECTION_SLUG,
      id: commentId,
      depth: 0,
      req,
      overrideAccess: true,
    });

    data.tenant = (comment as Comment)?.tenant ?? null;
  } catch (err) {
    data.tenant = null;

    req.payload.logger?.error?.({
      err,
      msg: "setTenantOnReadBeforeCreate: failed to resolve tenant",
    });
  }

  return data;
};
