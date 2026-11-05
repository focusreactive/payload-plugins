import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  bootAuditPayload,
  createUser,
  events,
  loginHeaders,
  rest,
  timestampAfterEverythingSoFar,
} from "./bootAuditPayload";
import type { AuditEventRow, AuditTestPayload } from "./bootAuditPayload";

type Rows = { id: string; label?: unknown; caption?: unknown }[];

type Target = {
  name: string;
  eventsSince: (ctx: AuditTestPayload, since: string) => Promise<AuditEventRow[]>;
  publishAction: string;
  updateAction: string;
  prepare: (ctx: AuditTestPayload) => Promise<{ path: string; rowId: string }>;
  save: (path: string, locale: string, query: string) => { method: "POST" | "PATCH"; url: string };
  rowsKey: "items" | "sections";
  rowFieldKey: "label" | "caption";
};

const PUBLISHED = { _status: "published" } as const;

const promoGlobal: Target = {
  name: "a localized autosave global",
  publishAction: "global.publish",
  updateAction: "global.update",
  rowsKey: "items",
  rowFieldKey: "label",
  eventsSince: (ctx, since) =>
    events(ctx.payload, {
      and: [
        { "target.kind": { equals: "global" } },
        { "target.slug": { equals: "promo" } },
        { occurredAt: { greater_than_equal: since } },
      ],
    }),
  prepare: async (ctx) => {
    const english = (await ctx.payload.updateGlobal({
      slug: "promo" as never,
      locale: "en",
      data: { title: "Title", note: "Note", items: [{ label: "Label" }], ...PUBLISHED } as never,
    })) as unknown as { items: Rows };
    const rowId = english.items[0]?.id ?? "";
    await ctx.payload.updateGlobal({
      slug: "promo" as never,
      locale: "de",
      data: { title: "Titel", items: [{ id: rowId, label: "Etikett" }], ...PUBLISHED } as never,
    });
    return { path: "promo", rowId };
  },
  save: (path, locale, query) => ({
    method: "POST",
    url: `/globals/${path}?locale=${locale}${query}`,
  }),
};

const articlesCollection: Target = {
  name: "a localized autosave collection",
  publishAction: "doc.publish",
  updateAction: "doc.update",
  rowsKey: "sections",
  rowFieldKey: "caption",
  eventsSince: (ctx, since) =>
    events(ctx.payload, {
      and: [
        { "target.kind": { equals: "collection" } },
        { "target.slug": { equals: "articles" } },
        { occurredAt: { greater_than_equal: since } },
      ],
    }),
  prepare: async (ctx) => {
    const english = (await ctx.payload.create({
      collection: "articles" as never,
      locale: "en",
      data: {
        title: "Title",
        note: "Note",
        sections: [{ heading: "H", caption: "Caption" }],
        ...PUBLISHED,
      } as never,
    })) as unknown as { id: string; sections: Rows };
    const rowId = english.sections[0]?.id ?? "";
    await ctx.payload.update({
      collection: "articles" as never,
      id: english.id,
      locale: "de",
      data: {
        title: "Titel",
        sections: [{ id: rowId, caption: "Untertitel" }],
        ...PUBLISHED,
      } as never,
    });
    return { path: `articles/${english.id}`, rowId };
  },
  save: (path, locale, query) => ({ method: "PATCH", url: `/${path}?locale=${locale}${query}` }),
};

export function describeLocalizedAutosavePublishes(localizationFallback: boolean) {
  let ctx: AuditTestPayload;
  let signedIn: Record<string, string>;
  beforeAll(async () => {
    ctx = await bootAuditPayload({ localizationFallback });
    await createUser(ctx.payload, "locales@x.io", { role: "admin" });
    signedIn = await loginHeaders(ctx.payload, "locales@x.io");
  });
  afterAll(async () => {
    await ctx?.cleanup();
  });

  let testStartedAt = "";
  beforeEach(async () => {
    testStartedAt = await timestampAfterEverythingSoFar();
  });

  const startOfTheSavesUnderTest = async () => {
    testStartedAt = await timestampAfterEverythingSoFar();
  };

  describe.each([promoGlobal, articlesCollection])("$name", (target) => {
    const send = async (path: string, locale: string, query: string, body: object) => {
      const { method, url } = target.save(path, locale, query);
      const res = await rest(ctx.payload, method, url, { body, headers: signedIn });
      expect(res.status).toBe(200);
    };
    const autosaveTick = (path: string, locale: string, body: object) =>
      send(path, locale, "&draft=true&autosave=true", body);
    const draftSave = (path: string, locale: string, body: object) =>
      send(path, locale, "&draft=true", body);
    const publish = (path: string, locale: string) => send(path, locale, "", PUBLISHED);

    const actionsAndChanges = async () =>
      (await target.eventsSince(ctx, testStartedAt)).map((event) => [event.action, event.changes]);

    it("a field changed by an autosave in the locale of the publish is the only change", async () => {
      const { path } = await target.prepare(ctx);
      await startOfTheSavesUnderTest();

      await autosaveTick(path, "en", { note: "Changed note" });
      await publish(path, "en");

      expect(await actionsAndChanges()).toEqual([[target.publishAction, ["note"]]]);
    });

    it("a localized field changed by an autosave in another locale is the change of a publish in English", async () => {
      const { path } = await target.prepare(ctx);
      await startOfTheSavesUnderTest();

      await autosaveTick(path, "de", { title: "Neuer Titel" });
      await publish(path, "en");

      expect(await actionsAndChanges()).toEqual([[target.publishAction, ["title"]]]);
    });

    it("a localized row field changed by an autosave in another locale is the change of a publish in English", async () => {
      const { path, rowId } = await target.prepare(ctx);
      await startOfTheSavesUnderTest();

      await autosaveTick(path, "de", {
        [target.rowsKey]: [{ id: rowId, [target.rowFieldKey]: "Geändert" }],
      });
      await publish(path, "en");

      expect(await actionsAndChanges()).toEqual([
        [target.publishAction, [`${target.rowsKey}.0.${target.rowFieldKey}`]],
      ]);
    });

    it("a draft save and a publish that change nothing list only the status the draft save changed", async () => {
      const { path } = await target.prepare(ctx);
      await startOfTheSavesUnderTest();

      await draftSave(path, "de", {});
      await publish(path, "de");

      expect(await actionsAndChanges()).toEqual([
        [target.updateAction, ["_status"]],
        [target.publishAction, []],
      ]);
    });
  });
}
