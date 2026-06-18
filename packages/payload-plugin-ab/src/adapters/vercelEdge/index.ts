import type { StorageAdapter } from "../../types/config";
import type { Manifest } from "../../types/manifest";
import { readManifest } from "./api/readManifest";
import { updateEdgeConfig } from "./api/updateEdgeConfig";
import type { VercelEdgeAdapterConfig } from "./config";
import { PLUGIN_NAME } from "../../constants";

/**
 * Vercel Edge Config adapter.
 * Requires "pnpm add \@vercel/edge-config" and the following env vars:
 *   EDGE_CONFIG, EDGE_CONFIG_ID, VERCEL_REST_API_ACCESS_TOKEN
 */
export function vercelEdgeAdapter<TVariantData extends object>(config: VercelEdgeAdapterConfig): StorageAdapter<TVariantData> {
  const missing = (["configID", "configURL", "vercelRestAPIAccessToken"] as const).filter((key) => !config[key]);
  if (missing.length > 0) {
    console.warn(`[${PLUGIN_NAME}] vercelEdgeAdapter: missing ${missing.join(", ")} (likely EDGE_CONFIG_ID / EDGE_CONFIG / VERCEL_REST_API_ACCESS_TOKEN not set). Edge Config reads/writes will fail.`);
  }

  const manifestKey = config.manifestKey ?? "ab-testing";
  let localCache: Manifest<TVariantData> | null = null;

  async function getManifest() {
    if (localCache === null) {
      localCache = await readManifest<TVariantData>(manifestKey);
    }

    return localCache;
  }

  return {
    async write(path, variants) {
      const currentManifest = await getManifest();

      localCache = { ...currentManifest, [path]: variants };

      await updateEdgeConfig(config, manifestKey, localCache);
    },

    async read(path) {
      try {
        const manifest = await readManifest<TVariantData>(manifestKey);

        return manifest?.[path] ?? null;
      } catch {
        return null;
      }
    },

    async clear(path) {
      const currentManifest = await getManifest();
      const updated = { ...currentManifest };

      delete updated[path];

      localCache = updated;

      await updateEdgeConfig(config, manifestKey, localCache);
    },
  };
}
