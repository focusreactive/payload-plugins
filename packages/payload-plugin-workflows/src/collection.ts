import type { CollectionConfig, Field } from "payload";

import type { WorkflowsPluginOptions } from "./options.js";

const json = (name: string): Field => ({ name, type: "json" });

const defaultFields = (): Field[] => [
  { name: "workflow", type: "text", required: true, index: true },
  { name: "subjectCollection", type: "text", required: true, index: true },
  // Always a string, whatever the subject collection's id type.
  { name: "subjectId", type: "text", required: true, index: true },
  { name: "stage", type: "text", required: true, index: true },
  {
    name: "status",
    type: "select",
    required: true,
    index: true,
    options: ["active", "completed", "aborted"],
  },
  json("fields"),
  json("activities"),
  json("fired"),
  json("history"),
  // Denormalised from the run's `waitingOn` on every write, so the inbox is one query.
  { name: "assignedUsers", type: "text", hasMany: true, index: true },
  { name: "assignedRoles", type: "text", hasMany: true, index: true },
  { name: "revision", type: "number", required: true, defaultValue: 1 },
  // `<workflow>:<collection>:<id>` while active, `done:<random>` after: one active run per document.
  { name: "activeKey", type: "text", required: true, unique: true },
  { name: "completedAt", type: "date" },
];

/**
 * Where runs live: state and audit trail, never in the document. Nobody writes it over the API —
 * state changes only through the plugin's own operations, so the history cannot be edited.
 */
export const instancesCollection = (
  slug: string,
  overrides: WorkflowsPluginOptions["overrides"] = {}
): CollectionConfig => {
  const fields = defaultFields();
  return {
    slug,
    labels: { singular: "Workflow run", plural: "Workflow runs" },
    timestamps: true,
    admin: {
      hidden: true,
      useAsTitle: "workflow",
      defaultColumns: [
        "workflow",
        "subjectCollection",
        "subjectId",
        "stage",
        "status",
        "updatedAt",
      ],
      ...overrides.admin,
    },
    access: {
      // Users of the admin user collection; the plugin's functions further drop runs whose
      // document the caller cannot read.
      read: ({ req }) =>
        Boolean(req.user && req.user.collection === req.payload.config.admin?.user),
      create: () => false,
      update: () => false,
      delete: () => false,
      ...overrides.access,
    },
    ...(overrides.hooks ? { hooks: overrides.hooks } : {}),
    fields: overrides.fields ? overrides.fields(fields) : fields,
  };
};
