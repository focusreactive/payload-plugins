import type { CollectionBeforeDeleteHook } from "payload";
import { RELEASE_ITEMS_SLUG } from "../constants";

export const releasesBeforeDelete: CollectionBeforeDeleteHook = async ({
  id,
  req,
}) => {
  const items = await req.payload.find({
    collection: RELEASE_ITEMS_SLUG,
    where: { release: { equals: id } },
    limit: 10000,
    depth: 0,
  });

  for (const item of items.docs) {
    await req.payload.delete({
      collection: RELEASE_ITEMS_SLUG,
      id: item.id,
      req,
    });
  }
};
