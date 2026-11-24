import { describe, expect, it } from "vitest";
import { buildAuditCollection } from "../../src/collection/auditCollection";
import { normalizeOptions } from "../../src/options";

const call = (fn: unknown, user: unknown) =>
  (fn as (a: { req: { user: unknown } }) => unknown)({ req: { user } });

type AnyField = {
  name?: string;
  type?: string;
  index?: boolean;
  hasMany?: boolean;
  fields?: AnyField[];
  admin?: { components?: Record<string, unknown> };
};

const walk = (fields: AnyField[], visit: (f: AnyField) => void) => {
  for (const f of fields) {
    visit(f);
    if (f.fields) walk(f.fields, visit);
  }
};

describe("buildAuditCollection", () => {
  const c = buildAuditCollection(normalizeOptions(), { adminUserSlug: "users" });

  it("refuses create, update and delete even through the Local API (overrideAccess)", async () => {
    const hooks = c.hooks?.beforeOperation ?? [];
    expect(hooks).toHaveLength(1);
    const runOp = (operation: string) =>
      (hooks[0] as (a: unknown) => unknown)({
        operation,
        args: {},
        req: { t: undefined },
        collection: c,
      });
    for (const operation of ["create", "update", "delete"]) {
      expect(() => runOp(operation)).toThrow();
    }
    for (const operation of ["read", "count"]) {
      expect(() => runOp(operation)).not.toThrow();
    }
  });

  it("does not take part in document locking", () => {
    expect(c.lockDocuments).toBe(false);
  });

  it("is read-only for everyone", () => {
    const admin = { id: 1, collection: "users" };
    expect(call(c.access?.create, admin)).toBe(false);
    expect(call(c.access?.update, admin)).toBe(false);
    expect(call(c.access?.delete, admin)).toBe(false);
  });

  it("is readable by admin users only by default", () => {
    expect(call(c.access?.read, { id: 1, collection: "users" })).toBe(true);
    expect(call(c.access?.read, { id: 1, collection: "customers" })).toBe(false);
    expect(call(c.access?.read, null)).toBe(false);
  });

  it("stores the client IP and User-Agent as text fields", () => {
    const byName = new Map(c.fields.map((f) => ["name" in f ? f.name : "", f]));
    expect(byName.get("ip")).toMatchObject({ type: "text" });
    expect(byName.get("userAgent")).toMatchObject({ type: "text" });
  });

  it("has the fields the list view filters on", () => {
    const names = c.fields.map((f) => ("name" in f ? f.name : undefined));
    expect(names).toEqual(
      expect.arrayContaining(["occurredAt", "action", "actor", "via", "target", "changes"])
    );
    expect(c.slug).toBe("audit-events");
    expect(c.disableDuplicate).toBe(true);
  });

  it("uses a custom read access when given", () => {
    const custom = buildAuditCollection(normalizeOptions({ access: { read: () => true } }), {
      adminUserSlug: "users",
    });
    expect(call(custom.access?.read, null)).toBe(true);
  });

  it("stores each event in one row: no array or hasMany fields", () => {
    walk(c.fields as AnyField[], (f) => {
      expect(f.type).not.toBe("array");
      expect(f.hasMany).not.toBe(true);
    });
  });

  it("indexes exactly the fields that are filtered or looked up by exact value", () => {
    const indexed: string[] = [];
    const visit = (fields: AnyField[], prefix: string) => {
      for (const f of fields) {
        const path = prefix ? `${prefix}.${f.name}` : (f.name ?? "");
        if (f.index) indexed.push(path);
        if (f.fields) visit(f.fields, path);
      }
    };
    visit(c.fields as AnyField[], "");
    expect(indexed.sort()).toEqual(
      [
        "occurredAt",
        "action",
        "actor.type",
        "actor.docId",
        "onBehalfOf.docId",
        "target.slug",
        "target.docId",
        "requestId",
      ].sort()
    );
  });

  it("has no field named id at any depth, because SQL adapters silently drop nested id columns", () => {
    const named: string[] = [];
    walk(c.fields as AnyField[], (f) => {
      if (f.name === "id") named.push(f.name);
    });
    expect(named).toEqual([]);
  });

  it("lists the newest events first", () => {
    expect(c.defaultSort).toBe("-occurredAt");
  });

  it("searches by what happened, who acted and what was touched", () => {
    expect(c.admin?.listSearchableFields).toEqual([
      "action",
      "actor.label",
      "target.label",
      "target.docId",
    ]);
  });

  it("shows when, what, who and where in the default columns", () => {
    expect(c.admin?.defaultColumns).toEqual([
      "occurredAt",
      "action",
      "actor.type",
      "actor.label",
      "target.slug",
      "target.label",
      "via",
    ]);
  });

  it("stores the action as text, so an action this version does not list is still written", () => {
    const action = (c.fields as AnyField[]).find((f) => f.name === "action");
    expect(action?.type).toBe("text");
  });

  it("puts the export button above the list, pointed at the configured slug", () => {
    const journal = buildAuditCollection(normalizeOptions({ slug: "journal" }), {
      adminUserSlug: "users",
    });
    expect(journal.admin?.components?.beforeListTable).toEqual([
      {
        path: "@focus-reactive/payload-plugin-audit-log/client#AuditExportButton",
        clientProps: { slug: "journal" },
      },
    ]);
  });

  it("shows the action and the actor type as readable pills in the list and the event view", () => {
    const fields = c.fields as AnyField[];
    const action = fields.find((f) => f.name === "action");
    const actorType = fields
      .find((f) => f.name === "actor")
      ?.fields?.find((f) => f.name === "type");
    const client = "@focus-reactive/payload-plugin-audit-log/client";
    expect(action?.admin?.components).toEqual({
      Cell: `${client}#AuditActionCell`,
      Field: `${client}#AuditActionField`,
    });
    expect(actorType?.admin?.components).toEqual({
      Cell: `${client}#AuditActorTypeCell`,
      Field: `${client}#AuditActorTypeField`,
    });
  });
});
