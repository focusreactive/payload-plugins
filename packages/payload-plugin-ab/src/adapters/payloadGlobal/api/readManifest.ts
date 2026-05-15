import type { GlobalSlug, Payload } from "payload";

import type { Manifest } from "../../../types/manifest";

export async function readManifest(
  payload: Payload,
  slug: string
): Promise<Manifest> {
  try {
    const doc = await payload.findGlobal({
      overrideAccess: true,
      slug: slug as GlobalSlug,
    });

    return (doc?.manifest as Manifest) ?? {};
  } catch {
    return {};
  }
}
