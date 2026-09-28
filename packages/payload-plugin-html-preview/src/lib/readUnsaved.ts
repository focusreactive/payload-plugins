import { afterReadTraverseFields } from "payload";
import type { CollectionSlug, JsonObject, PayloadRequest } from "payload";

// What `findByID` does to a stored document — relationships populated, `afterRead` hooks run — done
// to the unsaved form data instead, so the site renders it like a saved one. Payload's own
// `afterRead` is not exported.
export const readUnsaved = async (
  req: PayloadRequest,
  slug: CollectionSlug,
  doc: JsonObject,
  depth: number
) => {
  const collection = req.payload.collections[slug].config;
  const fieldPromises: Promise<void>[] = [];
  const populationPromises: Promise<void>[] = [];

  afterReadTraverseFields({
    collection,
    context: {},
    currentDepth: 1,
    depth,
    doc,
    draft: false,
    fallbackLocale: null,
    fieldPromises,
    fields: collection.fields,
    findMany: false,
    flattenLocales: true,
    global: null,
    locale: null,
    overrideAccess: false,
    parentIndexPath: "",
    parentPath: "",
    parentSchemaPath: "",
    populationPromises,
    req,
    showHiddenFields: false,
    siblingDoc: doc,
  });

  while (fieldPromises.length || populationPromises.length) {
    await Promise.all(fieldPromises.splice(0));
    await Promise.all(populationPromises.splice(0));
  }
  return doc;
};
