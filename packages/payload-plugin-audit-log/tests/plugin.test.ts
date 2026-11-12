import type { Config } from "payload";
import { describe, expect, it, vi } from "vitest";
import { CUSTOM_CONFIG_KEY } from "../src/constants";
import { auditLogPlugin } from "../src/plugin";

const base = (): Config =>
  ({
    secret: "s",
    admin: { user: "users" },
    collections: [
      { slug: "users", auth: true, fields: [] },
      { slug: "posts", fields: [] },
      { slug: "secret-stuff", fields: [] },
    ],
    globals: [
      { slug: "settings", fields: [] },
      { slug: "hidden", fields: [] },
    ],
  }) as unknown as Config;

type FolderOverride = NonNullable<
  Exclude<Config["folders"], false | undefined>["collectionOverrides"]
>[number];

const withFolders = (folders: Config["folders"]): Config => ({
  ...base(),
  collections: [...(base().collections ?? []), { slug: "docs", folders: true, fields: [] }],
  folders,
});

const folderCollection = async (out: Config) => {
  const overrides = (out.folders ? out.folders.collectionOverrides : undefined) ?? [];
  let collection: Awaited<ReturnType<FolderOverride>> = { slug: "payload-folders", fields: [] };
  for (const override of overrides) collection = await override({ collection });
  return collection;
};

const relabelled: FolderOverride = ({ collection }) => ({
  ...collection,
  labels: { plural: "Dirs" },
});

type Op = (args: Record<string, unknown>) => Promise<unknown>;

const fakePayload = () => {
  const create = vi.fn(async (args: { data?: unknown }) => ({ id: 1, ...(args.data as object) }));
  const db: Record<string | symbol, unknown> = {
    create,
    updateOne: vi.fn(async () => ({ id: 1 })),
    updateGlobal: vi.fn(async () => ({})),
    deleteOne: vi.fn(async () => null),
    findOne: vi.fn(async () => null),
  };
  const payload = {
    db: undefined as unknown,
    collections: {},
    config: {},
    logger: { error: vi.fn() },
  };
  return { payload, db, create };
};

const createAdapter = (config: Config, payload: ReturnType<typeof fakePayload>["payload"]) => {
  const adapter = config.db.init({ payload: payload as never });
  payload.db = adapter;
  return adapter as unknown as Record<string | symbol, unknown>;
};

const withDatabase = (config: Config, db: Record<string | symbol, unknown>): Config =>
  ({ ...config, db: { defaultIDType: "number", init: () => db } }) as unknown as Config;

describe("auditLogPlugin", () => {
  it("adds the journal collection and hooks every other collection and global", () => {
    const out = auditLogPlugin({
      excludeCollections: ["secret-stuff"],
      excludeGlobals: ["hidden"],
    })(base()) as Config;
    const slugs = out.collections?.map((c) => c.slug);
    expect(slugs).toContain("audit-events");
    const by = (s: string) => out.collections?.find((c) => c.slug === s);
    expect(by("posts")?.hooks?.afterChange).toHaveLength(1);
    expect(by("users")?.hooks?.afterLogin).toHaveLength(1);
    expect(by("secret-stuff")?.hooks?.afterChange).toBeUndefined();
    expect(by("audit-events")?.hooks?.afterChange).toBeUndefined();
    expect(out.globals?.find((g) => g.slug === "settings")?.hooks?.afterChange).toHaveLength(1);
    expect(out.globals?.find((g) => g.slug === "hidden")?.hooks?.afterChange).toBeUndefined();
    expect(out.hooks?.afterError).toHaveLength(1);
  });

  it("keeps existing root afterError hooks", () => {
    const own = vi.fn();
    const cfg = { ...base(), hooks: { afterError: [own] } } as Config;
    const out = auditLogPlugin()(cfg) as Config;
    expect(out.hooks?.afterError).toHaveLength(2);
    expect(out.hooks?.afterError?.[0]).toBe(own);
  });

  it("registers the export endpoint once, on the journal collection", () => {
    const out = auditLogPlugin()(base()) as Config;
    const journal = out.collections?.find((c) => c.slug === "audit-events");
    const endpoints = journal?.endpoints;
    expect(Array.isArray(endpoints) && endpoints.map((e) => e.path)).toEqual(["/export"]);
    expect(out.endpoints).toBeUndefined();
  });

  it("uses the configured admin user collection for default read access", () => {
    const cfg = { ...base(), admin: { user: "admins" } } as Config;
    const out = auditLogPlugin()(cfg) as Config;
    const read = out.collections?.find((c) => c.slug === "audit-events")?.access?.read as (a: {
      req: { user: unknown };
    }) => unknown;
    expect(read({ req: { user: { id: 1, collection: "admins" } } })).toBe(true);
    expect(read({ req: { user: { id: 1, collection: "users" } } })).toBe(false);
  });

  it("stores its runtime settings in config.custom and keeps existing custom keys", () => {
    const cfg = { ...base(), custom: { other: 1 } } as Config;
    const out = auditLogPlugin({ slug: "journal" })(cfg) as Config;
    expect(out.custom).toEqual({
      other: 1,
      [CUSTOM_CONFIG_KEY]: { slug: "journal", recordIpAndUserAgent: true },
    });
    expect(out.collections?.map((c) => c.slug)).toContain("journal");
    const quiet = auditLogPlugin({ recordIpAndUserAgent: false })(base()) as Config;
    expect(quiet.custom?.[CUSTOM_CONFIG_KEY]).toEqual({
      slug: "audit-events",
      recordIpAndUserAgent: false,
    });
  });

  it("registers the purge task only with retention", () => {
    expect((auditLogPlugin()(base()) as Config).jobs?.tasks).toBeUndefined();
    const out = auditLogPlugin({ retention: { days: 180 } })(base()) as Config;
    expect(out.jobs?.tasks?.map((t) => t.slug)).toEqual(["auditLogPurge"]);
  });

  it("keeps the existing jobs config when adding the purge task", () => {
    const existing = { slug: "other", handler: vi.fn() };
    const cfg = { ...base(), jobs: { tasks: [existing], autoRun: [] } } as unknown as Config;
    const out = auditLogPlugin({ retention: { days: 30 } })(cfg) as Config;
    expect(out.jobs?.tasks?.map((t) => t.slug)).toEqual(["other", "auditLogPurge"]);
    expect(out.jobs?.autoRun).toEqual([]);
  });

  it("records nothing for database writes that bypass Payload's operations, including migrations", async () => {
    const { payload, db, create } = fakePayload();
    const out = auditLogPlugin()(withDatabase(base(), db)) as Config;
    const adapter = createAdapter(out, payload);
    expect(adapter).toBe(db);
    const req = { context: {}, payloadAPI: "local" };

    await (adapter.create as Op)({ collection: "posts", data: { title: "x" }, req });
    await (adapter.updateOne as Op)({ collection: "posts", id: 5, data: { title: "y" }, req });
    await (adapter.deleteOne as Op)({ collection: "posts", where: { id: { equals: 5 } }, req });
    await (adapter.updateGlobal as Op)({ slug: "settings", data: { a: 1 }, req });
    await (adapter.create as Op)({
      collection: "payload-migrations",
      data: { name: "m", batch: 1 },
    });

    const audited = create.mock.calls.filter(
      ([args]) => (args as { collection: string }).collection === "audit-events"
    );
    expect(audited).toEqual([]);
  });

  it("keeps the database adapter's own settings and leaves onInit to the project", () => {
    const own = vi.fn();
    const { db } = fakePayload();
    const cfg = { ...withDatabase(base(), db), onInit: own } as Config;
    const out = auditLogPlugin()(cfg) as Config;
    expect(out.db.defaultIDType).toBe("number");
    expect(out.onInit).toBe(own);
  });

  it("defers audit writes in SQL transactions to the commit", () => {
    const { payload, db } = fakePayload();
    const commit = vi.fn();
    Object.assign(db, {
      execute: vi.fn(),
      commitTransaction: commit,
      rollbackTransaction: vi.fn(),
    });
    const out = auditLogPlugin()(withDatabase(base(), db)) as Config;
    createAdapter(out, payload);
    expect(db[Symbol.for("payload-plugin-audit-log.deferToCommit")]).toBeDefined();
    expect(db.commitTransaction).not.toBe(commit);
  });

  it("captures the main global reads of updates", () => {
    const { payload, db } = fakePayload();
    const findGlobal = vi.fn(async () => ({}));
    db.findGlobal = findGlobal;
    const out = auditLogPlugin()(withDatabase(base(), db)) as Config;
    createAdapter(out, payload);
    expect(db[Symbol.for("payload-plugin-audit-log.mainGlobalReadsCaptured")]).toBe(true);
    expect(db.findGlobal).not.toBe(findGlobal);
  });

  describe("the folder collection Payload adds after plugins run", () => {
    it("is audited like any collection, after the project's own overrides", async () => {
      const out = auditLogPlugin()(withFolders({ collectionOverrides: [relabelled] })) as Config;
      expect(out.folders && out.folders.collectionOverrides?.[0]).toBe(relabelled);
      const folders = await folderCollection(out);
      expect(folders.labels).toEqual({ plural: "Dirs" });
      expect(folders.hooks?.afterChange).toHaveLength(1);
      expect(folders.hooks?.afterDelete).toHaveLength(1);
    });

    it("is left alone when excluded or when folders are disabled", async () => {
      const excluded = auditLogPlugin({ excludeCollections: ["payload-folders"] })(
        withFolders(undefined)
      ) as Config;
      expect(excluded.folders).toBeUndefined();
      const disabled = auditLogPlugin()(withFolders(false)) as Config;
      expect(disabled.folders).toBe(false);
    });
  });

  it("does nothing when disabled", () => {
    const cfg = base();
    expect(auditLogPlugin({ enabled: false })(cfg)).toBe(cfg);
  });
});
