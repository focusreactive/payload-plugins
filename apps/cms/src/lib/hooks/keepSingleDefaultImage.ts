import type { CollectionAfterChangeHook } from "payload";

import type { Media } from "@/payload-types";

const CONTEXT_FLAG = "keepSingleDefaultImage";

/**
 * Only one image can be the "Use as default" image: ticking it on one image unticks it on every
 * other image, in the same transaction.
 */
export const keepSingleDefaultImage: CollectionAfterChangeHook<Media> = async ({
  context,
  doc,
  previousDoc,
  req,
}) => {
  if (context[CONTEXT_FLAG] || !doc.isDefaultImage || previousDoc?.isDefaultImage) {
    return doc;
  }

  await req.payload.update({
    collection: "media",
    context: { [CONTEXT_FLAG]: true },
    data: { isDefaultImage: false },
    depth: 0,
    req,
    where: {
      and: [{ isDefaultImage: { equals: true } }, { id: { not_equals: doc.id } }],
    },
  });

  return doc;
};
