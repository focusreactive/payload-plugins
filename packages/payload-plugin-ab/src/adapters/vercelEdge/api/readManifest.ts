import type { Manifest } from "../../../types/manifest";

export async function readManifest<TVariantData extends object = object>(
  manifestKey: string,
): Promise<Manifest<TVariantData>> {
  try {
    const { get } = await import("@vercel/edge-config");

    const manifest = await get<Manifest<TVariantData>>(manifestKey);

    return manifest ?? {};
  } catch {
    return {};
  }
}
