import { Forbidden, QueryError, ValidationError } from "payload";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_WHERE_PATHS } from "../../src/constants";
import { buildExportEndpoint } from "../../src/export/exportEndpoint";
import { CSV_COLUMNS } from "../../src/export/serialize";
import { normalizeOptions } from "../../src/options";

const exportLimit = vi.hoisted(() => ({ maxRows: undefined as number | undefined }));

vi.mock("../../src/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/constants")>();
  return {
    ...actual,
    get MAX_EXPORT_ROWS() {
      return exportLimit.maxRows ?? actual.MAX_EXPORT_ROWS;
    },
  };
});

const doc = (i: number) => ({
  id: i,
  occurredAt: "2026-11-04T10:00:00.000Z",
  action: "doc.update",
  status: "success",
  actor: { type: "user", docId: "1", label: "Ann" },
  via: "admin",
  target: { kind: "collection", slug: "posts", docId: String(i), label: "=cmd" },
});

type Row = { id: number; occurredAt: string; action?: string } & Record<string, unknown>;
type W = Record<string, unknown>;

function matchesKeysetWhere(row: Row, where: W | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, cond]) => {
    if (key === "and") return (cond as W[]).every((w) => matchesKeysetWhere(row, w));
    if (key === "or") return (cond as W[]).some((w) => matchesKeysetWhere(row, w));
    const value = row[key] as string | number;
    const c = cond as { equals?: unknown; less_than?: string | number };
    if ("equals" in c) return value === c.equals;
    if ("less_than" in c) return value < (c.less_than as typeof value);
    throw new Error(`unsupported condition on ${key}`);
  });
}

function findNewestFirstInMemory(rows: Row[]) {
  return vi.fn(async ({ where, limit }: { where?: W; limit: number }) => {
    const docs = rows
      .filter((r) => matchesKeysetWhere(r, where))
      .sort((a, b) =>
        a.occurredAt === b.occurredAt ? b.id - a.id : b.occurredAt.localeCompare(a.occurredAt)
      )
      .slice(0, limit);
    return { docs };
  });
}

const findNothing = () => vi.fn(async (_args: unknown) => ({ docs: [] }));

const SEARCHABLE_AUDIT_ADMIN = {
  useAsTitle: "action",
  listSearchableFields: ["action", "actor.label"],
};

function setup(opts: {
  user?: unknown;
  find?: ReturnType<typeof vi.fn>;
  url?: string;
  query?: unknown;
}) {
  const create = vi.fn(async (_args?: unknown) => ({}));
  const error = vi.fn();
  const find = opts.find ?? findNewestFirstInMemory([doc(3), doc(2), doc(1)]);
  const req = {
    user: "user" in opts ? opts.user : { id: 1, collection: "users" },
    searchParams: new URL(opts.url ?? "http://x/export").searchParams,
    query: opts.query ?? {},
    payload: {
      find,
      db: { create },
      logger: { error },
      config: {},
      collections: { "audit-events": { config: { admin: SEARCHABLE_AUDIT_ADMIN } } },
    },
    context: {},
    payloadAPI: "REST",
  };
  const handler = buildExportEndpoint(normalizeOptions()).handler as (
    r: never
  ) => Promise<Response>;
  return { req, find, create, error, run: () => handler(req as never) };
}

describe("export endpoint", () => {
  afterEach(() => {
    exportLimit.maxRows = undefined;
  });

  it("rejects unauthenticated requests without querying", async () => {
    const t = setup({ user: null });
    const res = await t.run();
    expect(res.status).toBe(401);
    expect(t.find).not.toHaveBeenCalled();
    expect(t.create).not.toHaveBeenCalled();
  });

  const failingFind = (error: Error) =>
    vi.fn(async () => {
      throw error;
    });

  it("returns 403 and writes nothing when read access is denied", async () => {
    const t = setup({ find: failingFind(new Forbidden()) });
    const res = await t.run();
    expect(res.status).toBe(403);
    expect(t.create).not.toHaveBeenCalled();
  });

  it("returns 400 and writes nothing for a where the collection cannot be queried by", async () => {
    const invalidWheres = [
      new QueryError([{ path: "nope" }]),
      new ValidationError({ errors: [{ message: "invalid", path: "occurredAt" }] }),
    ];
    for (const invalidWhere of invalidWheres) {
      const t = setup({ find: failingFind(invalidWhere) });
      const res = await t.run();
      expect(res.status).toBe(400);
      expect(t.create).not.toHaveBeenCalled();
    }
  });

  it("returns 500, logs the error and writes nothing when the query fails unexpectedly", async () => {
    const t = setup({ find: failingFind(new Error("connection lost")) });
    const res = await t.run();
    expect(res.status).toBe(500);
    expect(t.create).not.toHaveBeenCalled();
    expect(t.error).toHaveBeenCalledTimes(1);
    const [logArg] = t.error.mock.calls[0] as [{ err: Error; msg: string }];
    expect(logArg.err.message).toBe("connection lost");
  });

  it("enforces access, pages through results and streams csv with escaped formulas", async () => {
    const t = setup({});
    const res = await t.run();
    const text = await res.text();
    expect(res.headers.get("content-type")).toContain("text/csv");
    const [header, ...rows] = text.trimEnd().split("\n");
    expect(header).toBe(CSV_COLUMNS.join(","));
    expect(rows).toHaveLength(3);
    expect(text).toContain("'=cmd");
    for (const [args] of t.find.mock.calls) {
      expect(args).toMatchObject({
        overrideAccess: false,
        depth: 0,
        pagination: false,
        sort: ["-occurredAt", "-id"],
        user: t.req.user,
      });
      expect(args).not.toHaveProperty("page");
    }
  });

  it("pages by keyset without duplicates or gaps, even when page boundaries share a timestamp and new rows arrive meanwhile", async () => {
    const eventsPerMillisecond = 7;
    const rows: Row[] = Array.from({ length: 2500 }, (_, i) => ({
      ...doc(i + 1),
      id: i + 1,
      occurredAt: new Date(
        Date.UTC(2026, 0, 1) + Math.floor(i / eventsPerMillisecond)
      ).toISOString(),
      action: i % 2 === 0 ? "doc.update" : "doc.delete",
    }));
    const find = findNewestFirstInMemory(rows);
    const t = setup({ find, url: "http://x/export?format=ndjson" });
    t.create.mockImplementation(async (args: unknown) => {
      const data = (args as { data: Row }).data;
      rows.push({ ...data, id: rows.length + 1, occurredAt: "2027-01-01T00:00:00.000Z" });
      return {};
    });
    const ids = (await (await t.run()).text())
      .trimEnd()
      .split("\n")
      .map((l) => (JSON.parse(l) as { id: number }).id);
    expect(ids).toHaveLength(2500);
    expect(new Set(ids).size).toBe(2500);
    expect(Math.min(...ids)).toBe(1);
    expect(Math.max(...ids)).toBe(2500);
    const pagesOfThousandRows = 3;
    expect(find).toHaveBeenCalledTimes(pagesOfThousandRows);
  });

  it("keeps the user's filter on every page", async () => {
    const rows: Row[] = Array.from({ length: 2100 }, (_, i) => ({
      ...doc(i + 1),
      id: i + 1,
      occurredAt: new Date(Date.UTC(2026, 0, 1) + i).toISOString(),
      action: i % 3 === 0 ? "doc.delete" : "doc.update",
    }));
    const t = setup({
      find: findNewestFirstInMemory(rows),
      url: "http://x/export?format=ndjson",
      query: { where: { action: { equals: "doc.delete" } } },
    });
    const lines = (await (await t.run()).text()).trimEnd().split("\n");
    expect(lines).toHaveLength(700);
    expect(lines.every((l) => (JSON.parse(l) as Row).action === "doc.delete")).toBe(true);
  });

  it("applies the list search term to the listSearchableFields alongside the filter, as the admin list does", async () => {
    const t = setup({
      find: findNothing(),
      query: { where: { "target.slug": { equals: "posts" } }, search: "ann" },
    });
    await (await t.run()).text();
    const searched = {
      and: [
        { "target.slug": { equals: "posts" } },
        { or: [{ action: { like: "ann" } }, { "actor.label": { like: "ann" } }] },
      ],
    };
    expect(t.find.mock.calls[0]?.[0]).toMatchObject({ where: searched });
    const data = (t.create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
    expect(data.metadata).toMatchObject({ whereFields: ["target.slug", "action", "actor.label"] });
    expect(JSON.stringify(data.metadata)).not.toContain("ann");
  });

  it("searches on its own when the list has no filter, and ignores a search that is not a string", async () => {
    const searchOnly = setup({ find: findNothing(), query: { search: "ann" } });
    await (await searchOnly.run()).text();
    expect(searchOnly.find.mock.calls[0]?.[0]).toMatchObject({
      where: { or: [{ action: { like: "ann" } }, { "actor.label": { like: "ann" } }] },
    });

    const malformed = setup({ find: findNothing(), query: { search: { like: "x" } } });
    await (await malformed.run()).text();
    expect(malformed.find.mock.calls[0]?.[0]).toMatchObject({ where: {} });
  });

  it("falls back to the plain filter when the audit collection is not registered on the payload instance", async () => {
    const where = { action: { equals: "doc.delete" } };
    const t = setup({ find: findNothing(), query: { where, search: "ann" } });
    (t.req.payload as { collections?: unknown }).collections = {};
    await (await t.run()).text();
    expect(t.find.mock.calls[0]?.[0]).toMatchObject({ where });
  });

  it("stops streaming at the row limit and records that limit", async () => {
    exportLimit.maxRows = 1500;
    const rows: Row[] = Array.from({ length: 2500 }, (_, i) => ({
      ...doc(i + 1),
      id: i + 1,
      occurredAt: new Date(Date.UTC(2026, 0, 1) + i).toISOString(),
    }));
    const t = setup({ find: findNewestFirstInMemory(rows), url: "http://x/export?format=ndjson" });
    const ids = (await (await t.run()).text())
      .trimEnd()
      .split("\n")
      .map((l) => (JSON.parse(l) as { id: number }).id);
    expect(ids).toHaveLength(1500);
    expect(ids[0]).toBe(2500);
    expect(ids.at(-1)).toBe(1001);
    const data = (t.create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
    expect(data.metadata).toMatchObject({ maxRows: 1500 });
  });

  it("supports ndjson", async () => {
    const t = setup({ url: "http://x/export?format=ndjson" });
    const lines = (await (await t.run()).text()).trimEnd().split("\n");
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[0] ?? "").id).toBe(3);
  });

  it("records audit.export with the requester and only where field paths", async () => {
    const t = setup({
      query: {
        where: { "actor.docId": { equals: "secret-value" }, or: [{ action: { equals: "x" } }] },
      },
    });
    await (await t.run()).text();
    expect(t.create).toHaveBeenCalledTimes(1);
    const data = (t.create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
    expect(data.action).toBe("audit.export");
    expect((data.actor as { docId: string }).docId).toBe("1");
    expect(data.metadata).toMatchObject({ format: "csv", whereFields: ["actor.docId", "action"] });
    expect(JSON.stringify(data.metadata)).not.toContain("secret-value");
  });

  it("records at most MAX_WHERE_PATHS where field paths", async () => {
    const fieldNames = Array.from({ length: MAX_WHERE_PATHS + 5 }, (_, i) => `field${i}`);
    const where = Object.fromEntries(fieldNames.map((name) => [name, { exists: true }]));
    const t = setup({ find: findNothing(), query: { where } });
    await (await t.run()).text();
    const data = (t.create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
    expect((data.metadata as { whereFields: string[] }).whereFields).toEqual(
      fieldNames.slice(0, MAX_WHERE_PATHS)
    );
  });
});
