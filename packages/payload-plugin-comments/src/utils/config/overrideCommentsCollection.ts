import type { CollectionConfig } from "payload";

import type { CommentsPluginConfig } from "../../types";

export function overrideCommentsCollection(
  config: CollectionConfig,
  overrides: CommentsPluginConfig["overrides"]
): CollectionConfig {
  const { access, admin, hooks, fields } = overrides ?? {};

  return {
    ...config,
    access: { ...config.access, ...access },
    admin: { ...config.admin, ...admin },
    fields: fields ? fields(config.fields) : config.fields,
    hooks: { ...config.hooks, ...hooks },
  };
}
