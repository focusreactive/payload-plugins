import type { CollectionConfig } from "payload";
import type { CommentsPluginConfigOverrides } from "../../types";

export function overrideCommentsCollection(
  config: CollectionConfig,
  overrides: CommentsPluginConfigOverrides,
): CollectionConfig {
  const { access, admin, hooks, fields } = overrides ?? {};

  return {
    ...config,
    access: { ...config.access, ...access },
    hooks: { ...config.hooks, ...hooks },
    admin: { ...config.admin, ...admin },
    fields: fields ? fields(config.fields) : config.fields,
  };
}
