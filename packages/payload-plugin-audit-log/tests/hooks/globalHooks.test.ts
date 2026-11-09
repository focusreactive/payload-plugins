import type { GlobalConfig } from "payload";
import { describe, expect, it, vi } from "vitest";
import { CTX_MAIN_GLOBAL_READS } from "../../src/constants";
import { captureMainGlobalReads } from "../../src/db/captureMainGlobalReads";
import { withGlobalAudit } from "../../src/hooks/globalHooks";
import { normalizeOptions } from "../../src/options";
import { fakeRequest, recordedEvents, runHooks } from "../helpers/fakeRequest";

type Doc = Record<string, unknown>;

const makeReq = (overrides: Record<string, unknown> = {}) => {
  const request = fakeRequest({ user: null, ...overrides });
  const findGlobalVersions = vi.fn();
  request.db.findGlobalVersions = findGlobalVersions;
  return { ...request, findGlobalVersions };
};

const settings = withGlobalAudit({ slug: "settings", fields: [] }, normalizeOptions());
const autosaveGlobal = withGlobalAudit(
  { slug: "home", fields: [], versions: { drafts: { autosave: true } } },
  normalizeOptions()
);
const draftsGlobal = withGlobalAudit(
  { slug: "nav", fields: [], versions: { drafts: true } },
  normalizeOptions()
);

const sanitizedGlobal = (slug: string, ...storedFieldNames: string[]) => ({
  slug,
  flattenedFields: storedFieldNames.map((name) => ({ name, type: "text" })),
});

describe("global hooks", () => {
  it("never fails a save whose documents cannot be compared, and logs why", async () => {
    const { req, create, error } = makeReq();
    const doc = { count: 2n };
    const afterChange = settings.hooks?.afterChange?.at(-1) as (args: unknown) => unknown;
    await expect(
      afterChange({ doc, previousDoc: { count: 1n }, req, global: { slug: "settings" } })
    ).resolves.toBe(doc);
    expect(create).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledTimes(1);
  });

  it("writes global.update for a save that runs beforeOperation, beforeChange and afterChange", async () => {
    const { req, create } = makeReq();
    await runHooks(settings.hooks?.beforeOperation, { operation: "update", args: {}, req });
    await runHooks(settings.hooks?.beforeChange, { data: {}, req, originalDoc: {} });
    await runHooks(settings.hooks?.afterChange, {
      doc: { siteName: "B" },
      previousDoc: { siteName: "A" },
      req,
      global: { slug: "settings" },
      overrideAccess: true,
    });
    expect(recordedEvents(create)[0]).toMatchObject({
      action: "global.update",
      target: { kind: "global", slug: "settings" },
      changes: ["siteName"],
      overrideAccess: true,
    });
  });

  it("records overrideAccess false when the operation did not override access", async () => {
    const { req, create } = makeReq();
    await runHooks(settings.hooks?.afterChange, {
      doc: { siteName: "B" },
      previousDoc: { siteName: "A" },
      req,
      global: { slug: "settings" },
    });
    expect(recordedEvents(create)[0]?.overrideAccess).toBe(false);
  });

  it("writes global.publish", async () => {
    const { req, create } = makeReq();
    await runHooks(draftsGlobal.hooks?.afterChange, {
      doc: { _status: "published" },
      previousDoc: { _status: "draft" },
      req,
      global: { slug: "nav" },
    });
    expect(recordedEvents(create)[0]?.action).toBe("global.publish");
  });

  it("tracks update and restoreVersion operations and leaves reads alone", async () => {
    const a = makeReq();
    await runHooks(settings.hooks?.beforeOperation, { operation: "read", args: {}, req: a.req });
    expect(a.req.context).toEqual({});

    const b = makeReq();
    await runHooks(settings.hooks?.beforeOperation, {
      operation: "restoreVersion",
      args: { id: "v1" },
      req: b.req,
    });
    await runHooks(settings.hooks?.afterChange, {
      doc: { siteName: "A" },
      previousDoc: { siteName: "B" },
      req: b.req,
    });
    expect(recordedEvents(b.create).map((event) => event.action)).toEqual(["global.update"]);
  });

  it("keeps the outer flags while a nested update of the global starts and ends", async () => {
    const { req, create } = makeReq();
    await runHooks(autosaveGlobal.hooks?.beforeOperation, {
      operation: "update",
      args: { draft: true, autosave: true },
      req,
    });
    await runHooks(autosaveGlobal.hooks?.beforeOperation, { operation: "update", args: {}, req });
    await runHooks(autosaveGlobal.hooks?.afterChange, {
      doc: { title: "C" },
      previousDoc: { title: "A" },
      req,
    });
    await runHooks(autosaveGlobal.hooks?.afterChange, {
      doc: { title: "B" },
      previousDoc: { title: "A" },
      req,
    });
    expect(recordedEvents(create).map((event) => event.changes)).toEqual([["title"]]);
  });

  it("skips no-op saves, autosave ticks and globalType-only differences", async () => {
    const a = makeReq();
    await runHooks(settings.hooks?.afterChange, {
      doc: { siteName: "A", globalType: "settings", updatedAt: "2" },
      previousDoc: { siteName: "A", updatedAt: "1" },
      req: a.req,
      global: sanitizedGlobal("settings", "siteName"),
    });
    expect(a.create).not.toHaveBeenCalled();

    const b = makeReq();
    await runHooks(autosaveGlobal.hooks?.beforeOperation, {
      operation: "update",
      args: { draft: true, autosave: true },
      req: b.req,
    });
    await runHooks(autosaveGlobal.hooks?.afterChange, {
      doc: { title: "B", _status: "draft" },
      previousDoc: { title: "A", _status: "draft" },
      req: b.req,
    });
    expect(b.create).not.toHaveBeenCalled();
  });

  it("logs a draft save sent with autosave to a global whose drafts have no autosave", async () => {
    const { req, create } = makeReq();
    await runHooks(draftsGlobal.hooks?.beforeOperation, {
      operation: "update",
      args: { draft: true, autosave: true, data: { title: "B" } },
      req,
    });
    await runHooks(draftsGlobal.hooks?.afterChange, {
      data: { title: "B" },
      doc: { title: "B", _status: "draft" },
      previousDoc: { title: "A", _status: "published" },
      req,
      global: sanitizedGlobal("nav", "title", "_status"),
    });
    expect(recordedEvents(create).map((event) => [event.action, event.changes])).toEqual([
      ["global.update", ["title", "_status"]],
    ]);
  });

  it("logs saves whose autosave argument does not make Payload skip the stored global", async () => {
    const saveWith = async (
      global: typeof settings,
      args: Record<string, unknown>,
      change: Record<string, unknown>
    ) => {
      const { req, create } = makeReq();
      await runHooks(global.hooks?.beforeOperation, { operation: "update", args, req });
      await runHooks(global.hooks?.afterChange, { ...change, req });
      return recordedEvents(create).map((event) => event.action);
    };
    expect(
      await saveWith(
        settings,
        { autosave: true, data: { siteName: "B" } },
        { doc: { siteName: "B" }, previousDoc: { siteName: "A" } }
      )
    ).toEqual(["global.update"]);
    expect(
      await saveWith(
        autosaveGlobal,
        { autosave: true, data: { title: "B" } },
        { doc: { title: "B" }, previousDoc: { title: "A" } }
      )
    ).toEqual(["global.update"]);
    expect(
      await saveWith(
        autosaveGlobal,
        { autosave: true, draft: true, data: { title: "B", _status: "published" } },
        {
          doc: { title: "B", _status: "published" },
          previousDoc: { title: "A", _status: "draft" },
        }
      )
    ).toEqual(["global.publish"]);
  });

  describe("a localized global saved with a fallback locale", () => {
    const localizedSettings = withGlobalAudit(
      { slug: "localized", fields: [{ name: "motto", type: "text", localized: true }] },
      normalizeOptions()
    );

    const saveInGerman = async (
      fallbackLocale: unknown,
      change: { stored: Doc; previousDoc: Doc; doc: Doc }
    ) => {
      const { req, db, create } = makeReq({ locale: "de", fallbackLocale });
      const findGlobal = vi.fn().mockResolvedValue(change.stored);
      db.findGlobal = findGlobal;
      captureMainGlobalReads(db);
      await runHooks(localizedSettings.hooks?.beforeOperation, {
        operation: "update",
        args: {},
        req,
      });
      await (db.findGlobal as (args: Doc) => Promise<unknown>)({
        slug: "localized",
        locale: "de",
        req,
      });
      await runHooks(localizedSettings.hooks?.beforeChange, { data: {}, req });
      await runHooks(localizedSettings.hooks?.afterChange, {
        doc: change.doc,
        previousDoc: change.previousDoc,
        req,
        global: sanitizedGlobal("localized", "motto"),
      });
      return { create, findGlobal };
    };

    it("compares localized fields with the value stored in the locale, not the fallback", async () => {
      const { create, findGlobal } = await saveInGerman("en", {
        stored: { motto: { en: "Same" } },
        previousDoc: { motto: "Same" },
        doc: { motto: "Same" },
      });
      expect(findGlobal).toHaveBeenCalledTimes(1);
      expect(recordedEvents(create).map((event) => [event.action, event.changes])).toEqual([
        ["global.update", ["motto"]],
      ]);
    });

    it("reports nothing for a no-op save", async () => {
      const { create } = await saveInGerman("en", {
        stored: { motto: { en: "Same", de: "Gleich" } },
        previousDoc: { motto: "Gleich" },
        doc: { motto: "Gleich" },
      });
      expect(create).not.toHaveBeenCalled();
    });
  });

  it("consumes the flags, so a later update on the same req is logged", async () => {
    const { req, create } = makeReq();
    await runHooks(autosaveGlobal.hooks?.beforeOperation, {
      operation: "update",
      args: { draft: true, autosave: true },
      req,
    });
    const change = { doc: { title: "B" }, previousDoc: { title: "A" }, req };
    await runHooks(autosaveGlobal.hooks?.afterChange, change);
    await runHooks(autosaveGlobal.hooks?.afterChange, change);
    expect(recordedEvents(create).map((e) => e.action)).toEqual(["global.update"]);
  });

  it("logs a manual draft save as global.update", async () => {
    const { req, create } = makeReq();
    await runHooks(draftsGlobal.hooks?.beforeOperation, {
      operation: "update",
      args: { draft: true },
      req,
    });
    await runHooks(draftsGlobal.hooks?.afterChange, {
      doc: { title: "B", _status: "draft" },
      previousDoc: { title: "A", _status: "published" },
      req,
    });
    expect(recordedEvents(create)[0]).toMatchObject({
      action: "global.update",
      changes: ["title", "_status"],
    });
  });

  it("compares a restore of an autosave global with the global before it", async () => {
    const restore = makeReq();
    await runHooks(autosaveGlobal.hooks?.beforeOperation, {
      operation: "restoreVersion",
      args: { id: "v1" },
      req: restore.req,
    });
    await runHooks(autosaveGlobal.hooks?.afterChange, {
      doc: { title: "A", _status: "published" },
      previousDoc: { title: "B", _status: "draft" },
      req: restore.req,
    });
    expect(restore.findGlobalVersions).not.toHaveBeenCalled();
    expect(recordedEvents(restore.create)[0]).toMatchObject({ changes: ["title", "_status"] });
  });

  it("records the locale only for localized globals", async () => {
    const localizedGlobal = withGlobalAudit(
      {
        slug: "footer",
        fields: [
          { name: "group", type: "group", fields: [{ name: "t", type: "text", localized: true }] },
        ],
      },
      normalizeOptions()
    );
    const change = { doc: { t: "B" }, previousDoc: { t: "A" } };

    const a = makeReq({ locale: "de" });
    await runHooks(localizedGlobal.hooks?.afterChange, { ...change, req: a.req });
    expect(recordedEvents(a.create)[0]?.target).toEqual({
      kind: "global",
      slug: "footer",
      locale: "de",
    });

    const b = makeReq({ locale: "de" });
    await runHooks(settings.hooks?.afterChange, { ...change, req: b.req });
    expect(recordedEvents(b.create)[0]?.target).toEqual({ kind: "global", slug: "settings" });
  });

  it("records the locale a global was saved in although its own hooks read it in another locale", async () => {
    const localizedGlobal = withGlobalAudit(
      { slug: "footer", fields: [{ name: "t", type: "text", localized: true }] },
      normalizeOptions()
    );
    const { req, create } = makeReq({ locale: "en", fallbackLocale: false });
    await runHooks(localizedGlobal.hooks?.beforeOperation, {
      operation: "update",
      args: { data: { t: "B" } },
      req,
    });
    Object.assign(req, { locale: "de", fallbackLocale: "en" });
    await runHooks(localizedGlobal.hooks?.afterChange, {
      doc: { t: "B" },
      previousDoc: { t: "A" },
      data: { t: "B" },
      req,
    });
    expect(recordedEvents(create)[0]).toMatchObject({
      action: "global.update",
      target: { kind: "global", slug: "footer", locale: "en" },
      changes: ["t"],
    });
  });

  it("keeps the project's own hooks and appends ours", () => {
    const own = vi.fn();
    const g = withGlobalAudit(
      {
        slug: "settings",
        fields: [],
        hooks: {
          beforeOperation: [own],
          beforeChange: [own],
          afterChange: [own],
          afterRead: [own],
        },
      } as GlobalConfig,
      normalizeOptions()
    );
    expect(g.hooks?.beforeOperation?.[0]).toBe(own);
    expect(g.hooks?.beforeOperation).toHaveLength(2);
    expect(g.hooks?.beforeChange?.[0]).toBe(own);
    expect(g.hooks?.beforeChange).toHaveLength(2);
    expect(g.hooks?.afterChange?.[0]).toBe(own);
    expect(g.hooks?.afterChange).toHaveLength(2);
    expect(g.hooks?.afterRead).toEqual([own]);
  });
});

describe("globals with drafts reuse the main global Payload reads during the update", () => {
  type Save = {
    args?: Doc;
    mainGlobal: Doc | null;
    previousDoc: Doc;
    doc: Doc;
    projectHookReads?: Doc;
    beforeAuditAfterChange?: () => Promise<void>;
  };

  const save = async (
    global: typeof autosaveGlobal,
    request: ReturnType<typeof makeReq>,
    s: Save
  ) => {
    const { req, db } = request;
    const findGlobal = vi.fn().mockResolvedValue(s.mainGlobal);
    db.findGlobal = findGlobal;
    captureMainGlobalReads(db);
    const read = db.findGlobal as (args: Doc) => Promise<unknown>;
    await runHooks(global.hooks?.beforeOperation, { operation: "update", args: s.args ?? {}, req });
    await read({ slug: global.slug, locale: "en", req, where: undefined });
    await runHooks(global.hooks?.beforeChange, { data: {}, req, originalDoc: s.previousDoc });
    if (s.projectHookReads) {
      findGlobal.mockResolvedValueOnce(s.projectHookReads);
      await read({ slug: global.slug, req });
    }
    await s.beforeAuditAfterChange?.();
    await runHooks(global.hooks?.afterChange, {
      doc: s.doc,
      previousDoc: s.previousDoc,
      req,
      global: sanitizedGlobal(global.slug, "title", "tagline", "siteName", "_status"),
    });
  };

  it("diffs an autosave publish against the published main global, without reading versions", async () => {
    const request = makeReq();
    await save(autosaveGlobal, request, {
      mainGlobal: { title: "A", tagline: "Same", _status: "published", globalType: "home" },
      previousDoc: { title: "C", tagline: "Same", _status: "draft" },
      doc: { title: "C", tagline: "Same", _status: "published" },
    });
    expect(request.findGlobalVersions).not.toHaveBeenCalled();
    expect(recordedEvents(request.create)[0]).toMatchObject({
      action: "global.publish",
      changes: ["title"],
    });
  });

  it("reports every field on the first publish, when the main global was never written", async () => {
    for (const mainGlobal of [null, {}]) {
      const request = makeReq();
      await save(autosaveGlobal, request, {
        mainGlobal,
        previousDoc: { title: "C", _status: "draft" },
        doc: { title: "C", _status: "published", globalType: "home" },
      });
      expect(request.findGlobalVersions).not.toHaveBeenCalled();
      expect(recordedEvents(request.create)[0]).toMatchObject({
        action: "global.publish",
        changes: ["title", "_status"],
      });
    }
  });

  it("diffs a publish after an unpublish against the unpublished main global", async () => {
    const request = makeReq();
    await save(autosaveGlobal, request, {
      mainGlobal: { title: "B", _status: "draft" },
      previousDoc: { title: "C", _status: "draft" },
      doc: { title: "C", _status: "published" },
    });
    expect(request.findGlobalVersions).not.toHaveBeenCalled();
    expect(recordedEvents(request.create)[0]?.changes).toEqual(["title", "_status"]);
  });

  it("ignores reads made by project hooks after Payload loaded the global", async () => {
    const request = makeReq();
    await save(autosaveGlobal, request, {
      mainGlobal: { title: "A", _status: "published" },
      projectHookReads: { title: "Polluted", _status: "published" },
      previousDoc: { title: "C", _status: "draft" },
      doc: { title: "C", _status: "published" },
    });
    expect(recordedEvents(request.create)[0]?.changes).toEqual(["title"]);
  });

  it("records global.unpublish against the published main global when a non-draft save turns it into the latest draft", async () => {
    for (const global of [autosaveGlobal, draftsGlobal]) {
      const request = makeReq();
      await save(global, request, {
        mainGlobal: { title: "A", _status: "published" },
        previousDoc: { title: "B", _status: "draft" },
        doc: { title: "B", _status: "draft" },
      });
      expect(request.findGlobalVersions).not.toHaveBeenCalled();
      expect(recordedEvents(request.create)[0]).toMatchObject({
        action: "global.unpublish",
        target: { kind: "global", slug: global.slug },
        changes: ["title", "_status"],
      });
    }
  });

  it("keeps the capture of an update when a restore of the global runs inside its afterChange", async () => {
    const request = makeReq();
    await save(autosaveGlobal, request, {
      mainGlobal: { title: "A", _status: "published" },
      previousDoc: { title: "C", _status: "draft" },
      doc: { title: "C", _status: "published" },
      beforeAuditAfterChange: async () => {
        await runHooks(autosaveGlobal.hooks?.beforeOperation, {
          operation: "restoreVersion",
          args: { id: "v1" },
          req: request.req,
        });
        await runHooks(autosaveGlobal.hooks?.afterChange, {
          doc: { title: "R", _status: "draft" },
          previousDoc: { title: "C", _status: "draft" },
          req: request.req,
        });
      },
    });
    expect(request.findGlobalVersions).not.toHaveBeenCalled();
    expect(recordedEvents(request.create).map((event) => [event.action, event.changes])).toEqual([
      ["global.update", ["title"]],
      ["global.publish", ["title"]],
    ]);
  });

  it("keeps a draft save over the published global a global.update", async () => {
    const request = makeReq();
    await save(autosaveGlobal, request, {
      args: { draft: true },
      mainGlobal: { title: "A", _status: "published" },
      previousDoc: { title: "A", _status: "published" },
      doc: { title: "B", _status: "draft" },
    });
    expect(recordedEvents(request.create)[0]).toMatchObject({
      action: "global.update",
      changes: ["title", "_status"],
    });
  });

  it("takes publication state from the captured main global only for globals with drafts, and not for restores", async () => {
    const plain = makeReq();
    await save(settings, plain, {
      mainGlobal: { siteName: "A", _status: "published" },
      previousDoc: { siteName: "A" },
      doc: { siteName: "B", _status: "draft" },
    });
    expect(recordedEvents(plain.create)[0]?.action).toBe("global.update");

    const restore = makeReq();
    const findGlobal = vi.fn().mockResolvedValue({ title: "A", _status: "published" });
    restore.db.findGlobal = findGlobal;
    captureMainGlobalReads(restore.db);
    await runHooks(autosaveGlobal.hooks?.beforeOperation, {
      operation: "restoreVersion",
      args: { id: "v1" },
      req: restore.req,
    });
    await (restore.db.findGlobal as (args: Doc) => Promise<unknown>)({
      slug: "home",
      req: restore.req,
    });
    await runHooks(autosaveGlobal.hooks?.afterChange, {
      doc: { title: "B", _status: "draft" },
      previousDoc: { title: "A", _status: "draft" },
      req: restore.req,
    });
    expect(recordedEvents(restore.create)[0]?.action).toBe("global.update");
  });

  it("drops the capture of an autosave tick, so the next save on the request starts clean", async () => {
    const request = makeReq();
    await save(autosaveGlobal, request, {
      args: { draft: true, autosave: true },
      mainGlobal: { title: "A", _status: "published" },
      previousDoc: { title: "A", _status: "draft" },
      doc: { title: "B", _status: "draft" },
    });
    expect((request.req.context[CTX_MAIN_GLOBAL_READS] as Map<string, unknown>).has("home")).toBe(
      false
    );
    await save(autosaveGlobal, request, {
      mainGlobal: { title: "B", _status: "draft" },
      previousDoc: { title: "B", _status: "draft" },
      doc: { title: "B", _status: "published" },
    });
    expect(recordedEvents(request.create)).toHaveLength(1);
    expect(recordedEvents(request.create)[0]).toMatchObject({
      action: "global.publish",
      changes: ["_status"],
    });
  });
});

describe("global fields the caller cannot read", () => {
  it("does not report hidden or read-restricted fields missing from the caller's doc", async () => {
    const g = withGlobalAudit(
      {
        slug: "site",
        fields: [
          { name: "title", type: "text" },
          { name: "token", type: "text", hidden: true },
          { type: "row", fields: [{ name: "key", type: "text", access: { read: () => false } }] },
        ],
      },
      normalizeOptions()
    );
    const { req, create } = makeReq();
    await runHooks(g.hooks?.beforeOperation, { operation: "update", args: {}, req });
    await runHooks(g.hooks?.afterChange, {
      previousDoc: { title: "a", token: "t", key: "k" },
      doc: { title: "b" },
      req,
    });
    expect(recordedEvents(create)[0]?.changes).toEqual(["title"]);
  });

  it("does not report hidden or read-restricted nested fields missing from the caller's doc", async () => {
    const g = withGlobalAudit(
      {
        slug: "site",
        fields: [
          { name: "title", type: "text" },
          {
            name: "seo",
            type: "group",
            fields: [
              { name: "description", type: "text" },
              { name: "token", type: "text", hidden: true },
            ],
          },
          {
            name: "links",
            type: "array",
            fields: [{ name: "secret", type: "text", access: { read: () => false } }],
          },
        ],
      },
      normalizeOptions()
    );
    const { req, create } = makeReq();
    await runHooks(g.hooks?.beforeOperation, { operation: "update", args: {}, req });
    await runHooks(g.hooks?.afterChange, {
      previousDoc: { title: "a", seo: { description: "d", token: "t" }, links: [{ secret: "s" }] },
      doc: { title: "b", seo: { description: "d" }, links: [{}] },
      req,
    });
    expect(recordedEvents(create)[0]?.changes).toEqual(["title"]);
  });
});

describe("global saves that select fields and docs with keys that are not stored fields", () => {
  it("reports only the selected fields that changed, not the fields left out of the selection", async () => {
    const { req, create } = makeReq();
    await runHooks(settings.hooks?.beforeOperation, {
      operation: "update",
      args: { select: { siteName: true } },
      req,
    });
    await runHooks(settings.hooks?.afterChange, {
      doc: { siteName: "B" },
      previousDoc: { siteName: "A", footerNote: "f" },
      req,
      global: { slug: "settings" },
    });
    expect(recordedEvents(create)[0]?.changes).toEqual(["siteName"]);
  });

  it("skips a save whose selected fields did not change", async () => {
    const { req, create } = makeReq();
    await runHooks(settings.hooks?.beforeOperation, {
      operation: "update",
      args: { select: { siteName: true } },
      req,
    });
    await runHooks(settings.hooks?.afterChange, {
      doc: { siteName: "A" },
      previousDoc: { siteName: "A", footerNote: "f" },
      req,
      global: { slug: "settings" },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("reports a submitted change to a field the selection leaves out", async () => {
    const { req, create } = makeReq();
    await runHooks(settings.hooks?.beforeOperation, {
      operation: "update",
      args: { select: { siteName: true } },
      req,
    });
    await runHooks(settings.hooks?.afterChange, {
      data: { footerNote: "g" },
      doc: { siteName: "A" },
      previousDoc: { siteName: "A", footerNote: "f" },
      req,
      global: { slug: "settings" },
    });
    expect(recordedEvents(create)[0]?.changes).toEqual(["footerNote"]);
  });

  it("classifies a submitted publish that the selection leaves out", async () => {
    const { req, create } = makeReq();
    await runHooks(draftsGlobal.hooks?.beforeOperation, {
      operation: "update",
      args: { select: { title: true } },
      req,
    });
    await runHooks(draftsGlobal.hooks?.afterChange, {
      data: { _status: "published" },
      doc: { title: "t" },
      previousDoc: { title: "t", _status: "draft" },
      req,
      global: { slug: "nav" },
    });
    expect(recordedEvents(create)[0]).toMatchObject({
      action: "global.publish",
      changes: ["_status"],
    });
  });

  it("does not report a key that a global afterRead hook adds", async () => {
    const { req, create } = makeReq();
    const sanitizedSettings = {
      slug: "settings",
      flattenedFields: [{ name: "siteName", type: "text" }],
    };
    await runHooks(settings.hooks?.afterChange, {
      doc: { siteName: "B", banner: "computed" },
      previousDoc: { siteName: "A" },
      req,
      global: sanitizedSettings,
    });
    await runHooks(settings.hooks?.afterChange, {
      doc: { siteName: "B", banner: "other" },
      previousDoc: { siteName: "B", banner: "computed" },
      req,
      global: sanitizedSettings,
    });
    expect(recordedEvents(create).map((event) => event.changes)).toEqual([["siteName"]]);
  });
});

describe("globals compared with the stored global Payload reads before the save", () => {
  const secrets = withGlobalAudit(
    {
      slug: "secrets",
      fields: [
        { name: "title", type: "text" },
        { name: "token", type: "text", hidden: true },
        {
          name: "links",
          type: "array",
          fields: [
            { name: "label", type: "text" },
            { name: "secret", type: "text", hidden: true },
          ],
        },
      ],
    },
    normalizeOptions()
  );
  const banner = withGlobalAudit(
    {
      slug: "banner",
      versions: { drafts: true },
      fields: [
        { name: "motto", type: "text", localized: true },
        { name: "token", type: "text", hidden: true },
        { name: "greeting", type: "text", localized: true, hidden: true },
        {
          name: "items",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
        },
      ],
    },
    normalizeOptions()
  );
  const localizedRows = withGlobalAudit(
    {
      slug: "locarr",
      fields: [
        {
          name: "items",
          type: "array",
          fields: [{ name: "label", type: "text", localized: true }],
        },
      ],
    },
    normalizeOptions()
  );

  type StoredSave = {
    locale?: { locale: string; fallbackLocale?: unknown };
    args?: Doc;
    mainGlobal: Doc;
    latestVersion?: Doc;
    data: Doc;
    previousDoc: Doc;
    doc?: Doc;
  };

  const saveOver = async (global: typeof settings, s: StoredSave) => {
    const request = makeReq(s.locale ?? {});
    const { req, db } = request;
    const findGlobal = vi.fn().mockResolvedValue(s.mainGlobal);
    db.findGlobal = findGlobal;
    request.findGlobalVersions.mockResolvedValue({
      docs: s.latestVersion ? [{ version: s.latestVersion }] : [],
    });
    captureMainGlobalReads(db);
    await runHooks(global.hooks?.beforeOperation, {
      operation: "update",
      args: { data: s.data, ...s.args },
      req,
    });
    if (global.versions) {
      await (db.findGlobalVersions as (args: Doc) => Promise<unknown>)({
        global: global.slug,
        limit: 1,
        req,
        where: { and: [{}, { latest: { equals: true } }] },
      });
    }
    await (db.findGlobal as (args: Doc) => Promise<unknown>)({ slug: global.slug, req });
    await runHooks(global.hooks?.beforeChange, { data: s.data, req });
    await runHooks(global.hooks?.afterChange, {
      data: s.data,
      doc: s.doc ?? s.previousDoc,
      previousDoc: s.previousDoc,
      req,
      global: sanitizedGlobal(
        global.slug,
        "title",
        "token",
        "links",
        "motto",
        "greeting",
        "items",
        "_status"
      ),
    });
    expect(findGlobal).toHaveBeenCalledTimes(1);
    expect(request.findGlobalVersions).toHaveBeenCalledTimes(global.versions ? 1 : 0);
    return recordedEvents(request.create).map((event) => [event.action, event.changes]);
  };

  const storedSecrets = {
    title: "a",
    token: "t1",
    links: [
      { id: "r1", label: "one", secret: "s1" },
      { id: "r2", label: "two", secret: "s2" },
    ],
  };
  const secretsAsRead = {
    title: "a",
    links: [
      { id: "r1", label: "one" },
      { id: "r2", label: "two" },
    ],
  };

  it("reports a change to a hidden field of a global without drafts by its path, at any depth", async () => {
    expect(
      await saveOver(secrets, {
        mainGlobal: storedSecrets,
        data: {
          token: "t2",
          links: [
            { id: "r1", label: "one", secret: "s1" },
            { id: "r2", label: "two", secret: "changed" },
          ],
        },
        previousDoc: secretsAsRead,
      })
    ).toEqual([["global.update", ["links.1.secret", "token"]]]);
  });

  it("reports nothing when a hidden field is saved with its stored value", async () => {
    expect(
      await saveOver(secrets, {
        mainGlobal: storedSecrets,
        data: {
          token: "t1",
          links: [
            { id: "r1", label: "one", secret: "s1" },
            { id: "r2", label: "two" },
          ],
        },
        previousDoc: secretsAsRead,
      })
    ).toEqual([]);
  });

  const storedDraft = {
    motto: { en: "Same" },
    token: "draft-token",
    greeting: { en: "hi", de: "hallo" },
    items: [{ id: "r", label: { en: "Label" } }],
    _status: "draft",
  };
  const draftAsReadInGerman = {
    motto: "Same",
    items: [{ id: "r", label: "Label" }],
    _status: "draft",
  };
  const mainGlobalOfBanner = {
    motto: { en: "Old", de: "Same" },
    token: "published-token",
    greeting: { en: "hi", de: "servus" },
    items: [{ id: "r", label: { en: "Old", de: "Label" } }],
    _status: "published",
  };
  const inGermanFallingBackToEnglish = { locale: "de", fallbackLocale: "en" };

  it("compares a global with drafts with the stored latest version in the locale of the save, not the fallback", async () => {
    expect(
      await saveOver(banner, {
        locale: inGermanFallingBackToEnglish,
        args: { draft: true },
        mainGlobal: mainGlobalOfBanner,
        latestVersion: storedDraft,
        data: { motto: "Same", items: [{ id: "r", label: "Label" }] },
        previousDoc: draftAsReadInGerman,
      })
    ).toEqual([["global.update", ["motto", "items.0.label"]]]);
  });

  it("compares the hidden fields of a global with drafts with the stored latest version, in the locale of the save", async () => {
    const saveHidden = (data: Doc) =>
      saveOver(banner, {
        locale: inGermanFallingBackToEnglish,
        args: { draft: true },
        mainGlobal: mainGlobalOfBanner,
        latestVersion: storedDraft,
        data,
        previousDoc: { _status: "draft" },
      });
    expect(await saveHidden({ token: "draft-token", greeting: "hallo" })).toEqual([]);
    expect(await saveHidden({ token: "published-token", greeting: "servus" })).toEqual([
      ["global.update", ["token", "greeting"]],
    ]);
  });

  it("compares a global with drafts that has no version yet with the stored main global", async () => {
    expect(
      await saveOver(banner, {
        locale: inGermanFallingBackToEnglish,
        args: { draft: true },
        mainGlobal: { ...storedDraft, motto: { en: "Same", de: "Same" } },
        data: { motto: "Same", token: "draft-token" },
        previousDoc: { motto: "Same", _status: "draft" },
      })
    ).toEqual([]);
  });

  it("compares localized fields inside rows of a global without drafts with the value stored in the locale", async () => {
    const stored = { items: [{ id: "r", label: { en: "Label" } }] };
    expect(
      await saveOver(localizedRows, {
        locale: inGermanFallingBackToEnglish,
        mainGlobal: stored,
        data: { items: [{ id: "r", label: "Label" }] },
        previousDoc: { items: [{ id: "r", label: "Label" }] },
      })
    ).toEqual([["global.update", ["items.0.label"]]]);
    expect(
      await saveOver(localizedRows, {
        locale: inGermanFallingBackToEnglish,
        mainGlobal: { items: [{ id: "r", label: { en: "Label", de: "Etikett" } }] },
        data: { items: [{ id: "r", label: "Etikett" }] },
        previousDoc: { items: [{ id: "r", label: "Etikett" }] },
      })
    ).toEqual([]);
  });
});

describe("an autosave publish of a localized global compares what it writes in every locale", () => {
  const localizedAutosave = withGlobalAudit(
    {
      slug: "promo",
      fields: [
        { name: "title", type: "text", localized: true },
        { name: "note", type: "text" },
      ],
      versions: { drafts: { autosave: true } },
    },
    normalizeOptions()
  );
  const mainGlobal = { title: { en: "Title", de: "Titel" }, note: "Note", _status: "published" };

  const publishInEnglish = async (written: Doc) => {
    const request = makeReq({
      locale: "en",
      payload: {
        db: {},
        logger: { error: vi.fn() },
        config: { localization: { localeCodes: ["en", "de"] } },
      },
    });
    const { req } = request;
    const db = req.payload.db as Record<string, unknown>;
    db.create = request.create;
    db.findGlobal = vi.fn().mockResolvedValue(mainGlobal);
    db.updateGlobal = vi.fn().mockResolvedValue(written);
    captureMainGlobalReads(db);
    await runHooks(localizedAutosave.hooks?.beforeOperation, {
      operation: "update",
      args: {},
      req,
    });
    await (db.findGlobal as (args: Doc) => Promise<unknown>)({ slug: "promo", req });
    await runHooks(localizedAutosave.hooks?.beforeChange, { data: {}, req });
    await (db.updateGlobal as (args: Doc) => Promise<unknown>)({
      slug: "promo",
      req,
      data: written,
    });
    await runHooks(localizedAutosave.hooks?.afterChange, {
      data: { _status: "published" },
      doc: { title: "Title", note: written.note, _status: "published" },
      previousDoc: { title: "Title", note: written.note, _status: "draft" },
      req,
      global: sanitizedGlobal("promo", "title", "note", "_status"),
    });
    return recordedEvents(request.create);
  };

  it("lists a field an autosave changed in the locale of the publish, and nothing else", async () => {
    const events = await publishInEnglish({ ...mainGlobal, note: "Changed" });
    expect(events.map((event) => [event.action, event.changes])).toEqual([
      ["global.publish", ["note"]],
    ]);
  });

  it("lists a localized field an autosave changed in another locale", async () => {
    const events = await publishInEnglish({ ...mainGlobal, title: { en: "Title", de: "Neu" } });
    expect(events.map((event) => [event.action, event.changes])).toEqual([
      ["global.publish", ["title"]],
    ]);
  });
});

const hero = {
  slug: "hero",
  fields: [{ name: "heading", type: "text" as const, localized: true }],
};

describe.each([
  {
    described: "inline blocks",
    global: {
      slug: "home",
      fields: [{ name: "layout", type: "blocks", blocks: [hero] }],
    } satisfies GlobalConfig,
  },
  {
    described: "blocks referenced from the config",
    global: {
      slug: "home",
      fields: [{ name: "layout", type: "blocks", blocks: [], blockReferences: ["hero"] }],
    } satisfies GlobalConfig,
  },
])("a global whose only localized fields live in $described", ({ global }) => {
  it("records the locale it was saved in", async () => {
    const layoutGlobal = withGlobalAudit(global, normalizeOptions(), [hero]);
    const { req, create } = makeReq({ locale: "de" });
    await runHooks(layoutGlobal.hooks?.afterChange, {
      doc: { layout: [{ id: "b1", blockType: "hero", heading: "B" }] },
      previousDoc: { layout: [{ id: "b1", blockType: "hero", heading: "A" }] },
      req,
    });
    expect(recordedEvents(create)[0]?.target).toEqual({
      kind: "global",
      slug: "home",
      locale: "de",
    });
  });
});
