import type { CollectionConfig, Access } from "payload";
import {
  RELEASE_ITEMS_SLUG,
  RELEASES_SLUG,
  RELEASE_ITEM_ACTIONS,
  RELEASE_ITEM_STATUSES,
  PACKAGE_NAME,
} from "../constants";

interface BuildReleaseItemsCollectionOptions {
  access?: {
    create?: Access;
    read?: Access;
    update?: Access;
    delete?: Access;
  };
  hooks?: CollectionConfig["hooks"];
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
      defaultColumns: ["targetCollection", "targetDoc", "action"],
      hidden: true,
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
        admin: {
          components: {
            Cell: `${PACKAGE_NAME}/client#TargetDocCell`,
          },
        },
      },
      {
        name: "action",
        type: "select",
        label: "Release action",
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
          components: {
            Field: `${PACKAGE_NAME}/client#ReleaseItemStatusField`,
          },
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
