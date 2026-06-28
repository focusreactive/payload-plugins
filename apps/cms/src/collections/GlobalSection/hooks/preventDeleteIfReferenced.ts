import { APIError } from "payload";
import type { CollectionBeforeDeleteHook } from "payload";

export const preventDeleteIfReferenced: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const pages = await req.payload.find({
    collection: "page",
    depth: 0,
    limit: 100,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      "blocks.reference": { equals: id },
    },
  });

  if (pages.totalDocs > 0) {
    const titles = pages.docs
      .map((p) => (typeof p.title === "string" ? p.title : `#${p.id}`))
      .join(", ");

    throw new APIError(
      `Cannot delete this global section: it is still used by ${pages.totalDocs} page(s): ${titles}. Remove those references first.`,
      400,
      undefined,
      true
    );
  }
};
