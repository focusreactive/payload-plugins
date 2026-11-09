import { Forbidden } from "payload";
import type {
  Access,
  CollectionBeforeOperationHook,
  CollectionConfig,
  Field,
  HookOperationType,
} from "payload";
import {
  ACTOR_SOURCES,
  ACTOR_TYPES,
  EVENT_STATUSES,
  TARGET_KINDS,
  VIA_CHANNELS,
} from "../constants";
import { buildExportEndpoint } from "../export/exportEndpoint";
import type { ResolvedOptions } from "../options";

const clientComponent = (name: string) => `@focus-reactive/payload-plugin-audit-log/client#${name}`;

const text = (name: string, extra: Record<string, unknown> = {}): Field =>
  ({ name, type: "text", ...extra }) as Field;

const refGroup = (name: string): Field => ({
  name,
  type: "group",
  fields: [text("collection"), text("docId", { index: true }), text("label")],
});

const JOURNAL_WRITING_OPERATIONS: ReadonlySet<string> = new Set([
  "create",
  "update",
  "delete",
] satisfies HookOperationType[]);

const refuseJournalWritesEvenWithOverrideAccess: CollectionBeforeOperationHook = ({
  operation,
  req,
}) => {
  if (JOURNAL_WRITING_OPERATIONS.has(operation)) throw new Forbidden(req?.t);
};

const isAdminUser =
  (adminUserSlug: string): Access =>
  ({ req }) =>
    req.user?.collection === adminUserSlug;

export function buildAuditCollection(
  opts: ResolvedOptions,
  ctx: { adminUserSlug: string }
): CollectionConfig {
  return {
    slug: opts.slug,
    labels: { singular: "Audit event", plural: "Audit log" },
    timestamps: false,
    disableDuplicate: true,
    lockDocuments: false,
    hooks: { beforeOperation: [refuseJournalWritesEvenWithOverrideAccess] },
    defaultSort: "-occurredAt",
    admin: {
      useAsTitle: "action",
      defaultColumns: [
        "occurredAt",
        "action",
        "actor.type",
        "actor.label",
        "target.slug",
        "target.label",
        "via",
      ],
      listSearchableFields: ["action", "actor.label", "target.label", "target.docId"],
      group: "Settings",
      description: "Read-only journal of who changed what and when.",
      components: {
        beforeListTable: [
          {
            path: clientComponent("AuditExportButton"),
            clientProps: { slug: opts.slug },
          },
        ],
      },
    },
    access: {
      create: () => false,
      update: () => false,
      delete: () => false,
      read: opts.readAccess ?? isAdminUser(ctx.adminUserSlug),
    },
    endpoints: [buildExportEndpoint(opts)],
    fields: [
      {
        name: "occurredAt",
        type: "date",
        required: true,
        index: true,
        admin: { date: { pickerAppearance: "dayAndTime" } },
      },
      text("action", {
        required: true,
        index: true,
        admin: {
          components: {
            Cell: clientComponent("AuditActionCell"),
            Field: clientComponent("AuditActionField"),
          },
        },
      }),
      { name: "status", type: "select", options: [...EVENT_STATUSES], defaultValue: "success" },
      {
        name: "actor",
        type: "group",
        fields: [
          {
            name: "type",
            type: "select",
            options: [...ACTOR_TYPES],
            required: true,
            index: true,
            admin: {
              components: {
                Cell: clientComponent("AuditActorTypeCell"),
                Field: clientComponent("AuditActorTypeField"),
              },
            },
          },
          text("docId", { index: true }),
          text("collection"),
          text("label"),
          { name: "source", type: "select", options: [...ACTOR_SOURCES] },
        ],
      },
      refGroup("onBehalfOf"),
      {
        name: "agent",
        type: "group",
        fields: [text("keyId"), text("name"), text("model"), text("tool")],
      },
      { name: "via", type: "select", options: [...VIA_CHANNELS] },
      {
        name: "target",
        type: "group",
        fields: [
          { name: "kind", type: "select", options: [...TARGET_KINDS] },
          text("slug", { index: true }),
          text("docId", { index: true }),
          text("label"),
          text("locale"),
        ],
      },
      { name: "changes", type: "json" },
      { name: "overrideAccess", type: "checkbox" },
      text("requestId", { index: true }),
      text("ip"),
      text("userAgent"),
      { name: "metadata", type: "json" },
    ],
  };
}
