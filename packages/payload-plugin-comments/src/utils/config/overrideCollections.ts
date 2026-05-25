import type { CollectionAfterDeleteHook, CollectionConfig } from "payload";

import { DEFAULT_COLLECTION_SLUG } from "../../constants";
import { injectFieldCommentComponents } from "./injectFieldCommentComponents";

export function overrideCollections(collections?: CollectionConfig[]) {
  return (collections ?? []).map((collection) => {
    if (collection.slug === DEFAULT_COLLECTION_SLUG) {return collection;}

    const patchedCollection = injectFieldCommentComponents(collection);

    return {
      ...patchedCollection,
      hooks: {
        ...patchedCollection.hooks,
        afterDelete: [
          ...(patchedCollection.hooks?.afterDelete ?? []),
          (async ({ doc, req }) => {
            await req.payload.delete({
              collection: DEFAULT_COLLECTION_SLUG,
              overrideAccess: true,
              req,
              where: {
                and: [
                  {
                    collectionSlug: { equals: collection.slug },
                  },
                  {
                    documentId: { equals: Number(doc.id) },
                  },
                ],
              },
            });
          }) satisfies CollectionAfterDeleteHook,
        ],
      },
    };
  });
}
