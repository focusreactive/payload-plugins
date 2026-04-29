import type { CollectionConfig, Access } from "payload";
import {
  RELEASES_SLUG,
  RELEASE_ITEMS_SLUG,
  RELEASE_STATUSES,
  PACKAGE_NAME,
} from "../constants";

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
      components: {
        edit: {
          beforeDocumentControls: [
            "@focus-reactive/payload-plugin-content-releases/client#ReleaseActionsField",
          ],
        },
      },
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
        options: RELEASE_STATUSES.map((s) => ({
          label: s.charAt(0).toUpperCase() + s.slice(1),
          value: s,
        })),
        admin: {
          position: "sidebar",
          components: {
            Field: `${PACKAGE_NAME}/client#ReleaseStatusField`,
          },
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
        name: "items",
        type: "join",
        collection: RELEASE_ITEMS_SLUG,
        on: "release",
        admin: {
          defaultColumns: ["targetCollection", "targetDoc", "action"],
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
        name: "rollbackSkipped",
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
