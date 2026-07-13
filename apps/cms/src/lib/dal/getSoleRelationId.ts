import { getPayloadClient } from "@/dal/payload-client";
import { pickSoleId } from "@/lib/utils/pickSoleId";

export async function getSoleRelationId(
  collection: "header" | "footer"
): Promise<string | number | null> {
  const payload = await getPayloadClient();

  const { docs } = await payload.find({
    collection,
    depth: 0,
    limit: 2,
  });

  return pickSoleId(docs);
}
