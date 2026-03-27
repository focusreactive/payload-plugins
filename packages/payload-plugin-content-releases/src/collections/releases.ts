import type { CollectionConfig, Access } from "payload";
import { RELEASES_SLUG, RELEASE_STATUSES } from "../constants";

interface BuildReleasesCollectionOptions {
  access?: {
    create?: Access;
    read?: Access;
    update?: Access;
    delete?: Access;
  };
  hooks?: CollectionConfig["hooks"];
}

export function buildReleasesCollection(
  options?: BuildReleasesCollectionOptions,
): CollectionConfig {
  return {
    slug: RELEASES_SLUG,
    labels: {
      singular: "Release",
      plural: "Releases",
    },
    admin: {
      useAsTitle: "name",
      defaultColumns: ["name", "status", "scheduledAt", "createdAt"],
    },
    access: options?.access,
    hooks: options?.hooks,
    fields: [
      {
        name: "name",
        type: "text",
        required: true,
      },
      {
        name: "description",
        type: "textarea",
      },
      {
        name: "status",
        type: "select",
        required: true,
        defaultValue: "draft",
        options: RELEASE_STATUSES.map((s) => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s })),
        admin: {
          position: "sidebar",
        },
      },
      {
        name: "scheduledAt",
        type: "date",
        admin: {
          position: "sidebar",
          date: {
            pickerAppearance: "dayAndTime",
          },
        },
      },
      {
        name: "publishedAt",
        type: "date",
        admin: {
          position: "sidebar",
          readOnly: true,
        },
      },
      {
        name: "rollbackSnapshot",
        type: "json",
        admin: {
          hidden: true,
        },
      },
      {
        name: "errorLog",
        type: "json",
        admin: {
          readOnly: true,
        },
      },
    ],
  };
}
