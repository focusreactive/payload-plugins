import type { CollectionConfig, CollectionHooks, Access } from "payload";
import {
  RELEASE_ITEMS_SLUG,
  RELEASES_SLUG,
  RELEASE_ITEM_ACTIONS,
  RELEASE_ITEM_STATUSES,
} from "../constants";

interface BuildReleaseItemsCollectionOptions {
  access?: {
    create?: Access;
    read?: Access;
    update?: Access;
    delete?: Access;
  };
  hooks?: CollectionHooks;
}

export function buildReleaseItemsCollection(
  enabledCollections: string[],
  options?: BuildReleaseItemsCollectionOptions,
): CollectionConfig {
  return {
    slug: RELEASE_ITEMS_SLUG,
    labels: {
      singular: "Release Item",
      plural: "Release Items",
    },
    admin: {
      defaultColumns: ["targetCollection", "targetDoc", "action", "status"],
    },
    access: options?.access,
    hooks: options?.hooks,
    fields: [
      {
        name: "release",
        type: "relationship",
        relationTo: RELEASES_SLUG,
        required: true,
        index: true,
      },
      {
        name: "targetCollection",
        type: "select",
        required: true,
        options: enabledCollections.map((slug) => ({
          label: slug.charAt(0).toUpperCase() + slug.slice(1),
          value: slug,
        })),
      },
      {
        name: "targetDoc",
        type: "text",
        required: true,
      },
      {
        name: "action",
        type: "select",
        required: true,
        defaultValue: "publish",
        options: RELEASE_ITEM_ACTIONS.map((a) => ({
          label: a.charAt(0).toUpperCase() + a.slice(1),
          value: a,
        })),
      },
      {
        name: "status",
        type: "select",
        required: true,
        defaultValue: "pending",
        options: RELEASE_ITEM_STATUSES.map((s) => ({
          label: s.charAt(0).toUpperCase() + s.slice(1),
          value: s,
        })),
        admin: {
          position: "sidebar",
        },
      },
      {
        name: "snapshot",
        type: "json",
        required: true,
      },
      {
        name: "baseVersion",
        type: "text",
      },
    ],
  };
}
