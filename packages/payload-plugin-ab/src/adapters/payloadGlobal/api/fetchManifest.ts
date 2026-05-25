export async function fetchManifest<TVariantData extends object>(
  serverURL: string,
  apiRoute: string,
  slug: string,
  path: string,
): Promise<TVariantData[] | null> {
  try {
    const res = await fetch(`${serverURL}${apiRoute}/globals/${slug}`, {
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();

    return (data?.manifest?.[path] as TVariantData[]) ?? null;
  } catch {
    return null;
  }
}
