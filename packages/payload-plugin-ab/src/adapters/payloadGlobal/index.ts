import type { GlobalSlug } from "payload";

import type { StorageAdapter } from "../../types/config";
import { fetchManifest } from "./api/fetchManifest";
import { readManifest } from "./api/readManifest";
import type { PayloadGlobalAdapterConfig } from "./config";
import { createGlobal } from "./utils/createGlobal";

export function payloadGlobalAdapter<TVariantData extends object>(
  config?: PayloadGlobalAdapterConfig
): StorageAdapter<TVariantData> {
  const slug = config?.globalSlug ?? "_abManifest";

  return {
    async clear(path, payload) {
      const currentManifest = await readManifest(payload, slug);

      delete currentManifest[path];

      await payload.updateGlobal({
        slug: slug as GlobalSlug,
        data: { manifest: currentManifest },
        overrideAccess: true,
      });
    },

    createGlobal(debug = false) {
      return createGlobal(slug, debug);
    },

    async read(path) {
      const serverURL = config?.serverURL ?? "";
      const apiRoute = config?.apiRoute ?? "/api";

      return fetchManifest<TVariantData>(serverURL, apiRoute, slug, path);
    },

    async write(path, variants, payload) {
      const currentManifest = await readManifest(payload, slug);

      await payload.updateGlobal({
        slug: slug as GlobalSlug,
        data: { manifest: { ...currentManifest, [path]: variants } },
        overrideAccess: true,
      });
    },
  };
}
