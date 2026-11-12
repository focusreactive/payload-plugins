import type { CollectionConfig } from "payload";
import { KEYPHRASES_COLLECTION_SLUG } from "../../constants";

const denyAll = () => false;

export function createKeyphraseCollection(): CollectionConfig {
  return {
    slug: KEYPHRASES_COLLECTION_SLUG,
    admin: { hidden: true },
    graphQL: false,
    access: {
      read: denyAll,
      create: denyAll,
      update: denyAll,
      delete: denyAll,
    },
    indexes: [{ fields: ["docCollection", "docId", "locale"], unique: true }],
    fields: [
      { name: "docCollection", type: "text", required: true },
      { name: "docId", type: "text", required: true },
      { name: "locale", type: "text", required: true },
      { name: "keyphrases", type: "json", required: true },
      { name: "intents", type: "text", hasMany: true, index: true },
    ],
  };
}
