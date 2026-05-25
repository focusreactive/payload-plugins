import type { GlobalSlug, Payload } from "payload";
import type { Manifest } from "../../../types/manifest";

export async function readManifest(payload: Payload, slug: string): Promise<Manifest> {
  try {
    const doc = await payload.findGlobal({ slug: slug as GlobalSlug, overrideAccess: true });

    return (doc?.manifest as Manifest) ?? {};
  } catch {
    return {};
  }
}
