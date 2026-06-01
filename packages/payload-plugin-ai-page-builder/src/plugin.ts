import type { Config, Plugin } from "payload";

import { AiPageBuilderButtonExport } from "./admin/components/AiPageBuilderButton.export";
import { createGeneratePageHandler } from "./endpoints/generatePage";
import type { AiPageBuilderPluginConfig } from "./types";

export function aiPageBuilderPlugin(pluginConfig: AiPageBuilderPluginConfig): Plugin {
  return (incomingConfig: Config): Config => {
    const { enabled = true, collections, basePath: rawBasePath = "/ai-page-builder" } = pluginConfig;

    if (!enabled) return incomingConfig;

    // Normalize basePath: ensure leading slash, no trailing slash
    const basePath = `/${rawBasePath.replace(/^\/+|\/+$/gu, "")}`;

    const configuredSlugs = new Set(collections.map((c) => c.slug));

    const patchedCollections = (incomingConfig.collections ?? []).map((collection) => {
      if (!configuredSlugs.has(collection.slug)) return collection;

      if (!collection.admin) collection.admin = {};
      if (!collection.admin.components) collection.admin.components = {};
      if (!collection.admin.components.beforeListTable) {
        collection.admin.components.beforeListTable = [];
      }

      collection.admin.components.beforeListTable.push(new AiPageBuilderButtonExport(basePath));

      return collection;
    });

    return {
      ...incomingConfig,
      collections: patchedCollections,
      endpoints: [
        ...(incomingConfig.endpoints ?? []),
        {
          path: `${basePath}/generate`,
          method: "post",
          handler: createGeneratePageHandler(pluginConfig),
        },
      ],
    };
  };
}
