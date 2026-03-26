import type { Config, Plugin } from "payload";
import type { ContentReleasesPluginConfig } from "./types";
import { PLUGIN_NAME } from "./constants";
import { buildReleasesCollection } from "./collections/releases";
import { buildReleaseItemsCollection } from "./collections/releaseItems";

export function contentReleasesPlugin(
  options: ContentReleasesPluginConfig,
): Plugin {
  const { enabledCollections, access } = options;

  return (config: Config): Config => {
    for (const slug of enabledCollections) {
      if (!config.collections?.find((c) => c.slug === slug)) {
        console.warn(
          `[${PLUGIN_NAME}] Unknown collection slug: "${slug}". It will be included in release-items options but may not exist.`,
        );
      }
    }

    const releasesCollection = buildReleasesCollection({
      access: access?.releases,
    });

    const releaseItemsCollection = buildReleaseItemsCollection(
      enabledCollections,
      { access: access?.releaseItems },
    );

    return {
      ...config,
      collections: [
        ...(config.collections ?? []),
        releasesCollection,
        releaseItemsCollection,
      ],
    };
  };
}
