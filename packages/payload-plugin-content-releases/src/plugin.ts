import type { Config, Plugin } from "payload";
import type { ContentReleasesPluginConfig } from "./types";
import { PLUGIN_NAME } from "./constants";
import { buildReleasesCollection } from "./collections/releases";
import { buildReleaseItemsCollection } from "./collections/releaseItems";
import { releasesBeforeChange } from "./hooks/releasesBeforeChange";
import { buildReleaseItemsBeforeChange } from "./hooks/releaseItemsBeforeChange";

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
      hooks: {
        beforeChange: [releasesBeforeChange],
      },
    });

    const releaseItemsCollection = buildReleaseItemsCollection(
      enabledCollections,
      {
        access: access?.releaseItems,
        hooks: {
          beforeChange: [buildReleaseItemsBeforeChange()],
        },
      },
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
