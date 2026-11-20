import { scopedCache } from "@/lib/utils/scopedCache";
import { getPayloadClient } from "@/dal/payload-client";

export const DEFAULT_MEDIA_CACHE_TAG = "default-media";
const REVALIDATE_SEC = 60;

async function fetchDefaultMediaId(): Promise<string | number | null> {
  const payload = await getPayloadClient();

  const { docs } = await payload.find({
    collection: "media",
    depth: 0,
    limit: 1,
    // Several images may be ticked; the most recently changed one wins, deterministically.
    sort: "-updatedAt",
    where: {
      isDefaultImage: { equals: true },
    },
  });
  return docs[0]?.id ?? null;
}

/** The media item editors ticked as "Use as the default image", used as a field default. */
export async function getDefaultMediaId(): Promise<string | number | null> {
  return scopedCache(fetchDefaultMediaId, ["default-media"], {
    revalidate: REVALIDATE_SEC,
    tags: [DEFAULT_MEDIA_CACHE_TAG],
  })();
}
