import type { Payload, PayloadRequest } from "payload";

import { describe, expect, it, vi } from "vitest";

import type { DraftField } from "../../src/server/fieldEdit/draftField";
import type { VeEditedField } from "../../src/shared/protocol";

import {
  DOCUMENT_NOT_UPDATABLE,
  draftFieldEndpoint,
  FIELD_CHANGED_SINCE_SHOWN,
  FIELD_NOT_EDITABLE,
} from "../../src/server/fieldEdit/draftField";
import { createSchemaCache, withSchemaCache } from "../../src/server/schemaCache";
import { readEditedField } from "../../src/shared/fieldEdit";

const SITE = "https://site.example";
const EDITOR = { collection: "users", id: 1 };
const SHOWN = { title: "Shown" };
const STORED = { title: "Stored" };
const SAVED = { title: "Saved" };

const PAGE: VeEditedField = {
  collectionSlug: "pages",
  docId: "page-1",
  key: "title",
  kind: "collection",
};

type Answered = { asked: VeEditedField; autosave: boolean; shown: unknown };

type Localization = false | { localeCodes: string[] };

const payloadOf = (localization: Localization = false) =>
  ({
    collections: {
      authors: { config: { fields: [], slug: "authors", versions: false } },
      pages: {
        config: {
          fields: [{ name: "title", type: "text" }],
          slug: "pages",
          versions: { drafts: { autosave: true } },
        },
      },
      posts: { config: { fields: [], slug: "posts", versions: { drafts: true } } },
      users: { config: { auth: true, fields: [], slug: "users", versions: { drafts: true } } },
    },
    blocks: {},
    config: {
      cors: [SITE],
      custom: withSchemaCache({}, createSchemaCache()),
      globals: [{ fields: [], slug: "settings", versions: { drafts: true } }],
      localization,
    },
    db: { defaultIDType: "text" },
    findByID: vi.fn(async ({ overrideAccess }: { overrideAccess: boolean }) =>
      overrideAccess ? STORED : SHOWN
    ),
    findGlobal: vi.fn(async () => SHOWN),
    update: vi.fn(async () => SAVED),
    updateGlobal: vi.fn(async () => SAVED),
  }) as unknown as Payload;

const requestOf = (
  payload: Payload,
  body: unknown,
  { contentType = "application/json", user = EDITOR as unknown } = {}
): PayloadRequest =>
  ({
    headers: new Headers({ "Content-Type": contentType, Origin: SITE }),
    payload,
    text: async () => JSON.stringify(body),
    user,
  }) as PayloadRequest;

const endpointAnswering = (
  answer: (field: DraftField, asked: VeEditedField) => Promise<object>,
  inTurnPerDocument = false
) =>
  draftFieldEndpoint({
    answer,
    inTurnPerDocument,
    path: "/draft-field",
    readAsked: readEditedField,
    refusedAnswer: { saved: false },
  });

const answeringWhatItWasGiven = () =>
  endpointAnswering(
    async ({ autosave, shown }, asked): Promise<Answered> => ({
      asked,
      autosave,
      shown,
    })
  );

const handled = async (endpoint: ReturnType<typeof endpointAnswering>, req: PayloadRequest) => {
  const response = await endpoint.handler(req);
  return { body: await response.json(), response, status: response.status };
};

describe("an endpoint of a draft field", () => {
  describe("refuses with a status and a reason of the one vocabulary", () => {
    it("a request without a user, before it reads the body", async () => {
      const payload = payloadOf();
      const req = requestOf(payload, PAGE, { user: null });
      const text = vi.spyOn(req, "text");

      expect(await handled(answeringWhatItWasGiven(), req)).toMatchObject({
        body: { reason: "signed-out", saved: false },
        status: 401,
      });
      expect(text).not.toHaveBeenCalled();
      expect(payload.findByID).not.toHaveBeenCalled();
    });

    it.each([
      ["a body sent as another type than JSON", PAGE, "text/plain"],
      ["a body that names no field", { ...PAGE, key: undefined }, "application/json"],
      ["a body that names no document", { key: "title" }, "application/json"],
    ])("%s", async (_name, body, contentType) => {
      expect(
        await handled(answeringWhatItWasGiven(), requestOf(payloadOf(), body, { contentType }))
      ).toMatchObject({ body: { reason: "unreadable", saved: false }, status: 400 });
    });

    it.each([
      ["a locale the project does not have", { localeCodes: ["en"] }, "de"],
      ["no locale in a project with locales", { localeCodes: ["en"] }, undefined],
    ])("%s", async (_name, localization, locale) => {
      const body = { ...PAGE, locale };

      expect(
        await handled(answeringWhatItWasGiven(), requestOf(payloadOf(localization), body))
      ).toMatchObject({ body: { reason: "failed", saved: false }, status: 400 });
    });

    it.each([
      [
        "a collection the config does not have",
        { ...PAGE, collectionSlug: "missing" },
        404,
        "not-editable",
      ],
      [
        "a global the config does not have",
        { collectionSlug: "missing", key: "title", kind: "global" },
        404,
        "not-editable",
      ],
      ["a collection without drafts", { ...PAGE, collectionSlug: "authors" }, 409, "no-drafts"],
      ["a collection of users", { ...PAGE, collectionSlug: "users" }, 409, "no-drafts"],
    ])("%s", async (_name, body, status, reason) => {
      expect(await handled(answeringWhatItWasGiven(), requestOf(payloadOf(), body))).toMatchObject({
        body: { reason, saved: false },
        status,
      });
    });

    it.each([
      ["the field is not editable", FIELD_NOT_EDITABLE, 422, "not-editable"],
      ["the field changed since it was shown", FIELD_CHANGED_SINCE_SHOWN, 412, "changed"],
      ["the user may not update the document", DOCUMENT_NOT_UPDATABLE, 403, "not-editable"],
    ])("when the answer says %s", async (_name, refusal, status, reason) => {
      const endpoint = endpointAnswering(async () => refusal);

      expect(await handled(endpoint, requestOf(payloadOf(), PAGE))).toMatchObject({
        body: { reason, saved: false },
        status,
      });
    });

    it.each([
      ["a lock", Object.assign(new Error("Locked"), { status: 423 }), 423, "locked"],
      [
        "a missing permission",
        Object.assign(new Error("Forbidden"), { status: 403 }),
        403,
        "not-editable",
      ],
      ["a failed validation", Object.assign(new Error("Invalid"), { status: 400 }), 400, "failed"],
      ["an error without a status", new Error("Broken"), 500, "failed"],
      ["a thrown value that is no error", "broken", 500, "failed"],
    ])("when the answer throws %s", async (_name, thrown, status, reason) => {
      const endpoint = endpointAnswering(async () => {
        throw thrown;
      });

      expect(await handled(endpoint, requestOf(payloadOf(), PAGE))).toMatchObject({
        body: { reason, saved: false },
        status,
      });
    });

    it("when reading the shown draft throws", async () => {
      const payload = payloadOf();
      vi.mocked(payload.findByID).mockRejectedValueOnce(new Error("Broken"));

      expect(await handled(answeringWhatItWasGiven(), requestOf(payload, PAGE))).toMatchObject({
        body: { reason: "failed", saved: false },
        status: 500,
      });
    });
  });

  it("answers what the endpoint answers, with no-store and the CORS headers of the project", async () => {
    const { body, response, status } = await handled(
      answeringWhatItWasGiven(),
      requestOf(payloadOf(), PAGE)
    );

    expect(status).toBe(200);
    expect(body).toEqual({ asked: PAGE, autosave: true, shown: SHOWN });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(SITE);
  });

  it("refuses with no-store and the CORS headers of the project too", async () => {
    const { response } = await handled(
      answeringWhatItWasGiven(),
      requestOf(payloadOf(), PAGE, { user: null })
    );

    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(SITE);
  });

  it("reads the shown draft of the top-level field as the editor sees it", async () => {
    const payload = payloadOf({ localeCodes: ["en"] });
    const edited = { ...PAGE, key: "title.0.text", locale: "en" };

    await handled(answeringWhatItWasGiven(), requestOf(payload, edited));

    expect(payload.findByID).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "pages",
        depth: 0,
        draft: true,
        id: "page-1",
        locale: "en",
        overrideAccess: false,
        select: { title: true },
        showHiddenFields: false,
        user: EDITOR,
      })
    );
  });

  it("passes no locale on in a project without locales", async () => {
    const { body } = await handled(
      answeringWhatItWasGiven(),
      requestOf(payloadOf(), { ...PAGE, locale: "en" })
    );

    expect((body as Answered).asked).toEqual(PAGE);
  });

  it("tells whether the drafts of the document autosave", async () => {
    const { body } = await handled(
      answeringWhatItWasGiven(),
      requestOf(payloadOf(), { ...PAGE, collectionSlug: "posts" })
    );

    expect(body).toMatchObject({ autosave: false });
  });

  it("reads the field of a global", async () => {
    const payload = payloadOf();
    const global = { collectionSlug: "settings", key: "title", kind: "global" };

    expect(await handled(answeringWhatItWasGiven(), requestOf(payload, global))).toMatchObject({
      body: { shown: SHOWN },
      status: 200,
    });
    expect(payload.findGlobal).toHaveBeenCalledWith(
      expect.objectContaining({ draft: true, overrideAccess: false, slug: "settings" })
    );
  });

  it("reads the field as it is stored and saves a draft with the access of the editor", async () => {
    const payload = payloadOf({ localeCodes: ["en"] });
    const endpoint = endpointAnswering(async (field) => ({
      saved: await field.save({ title: "New" }),
      stored: await field.readStored(),
    }));

    const { body } = await handled(endpoint, requestOf(payload, { ...PAGE, locale: "en" }));

    expect(body).toEqual({ saved: SAVED, stored: STORED });
    expect(payload.findByID).toHaveBeenLastCalledWith(
      expect.objectContaining({
        fallbackLocale: false,
        locale: "en",
        overrideAccess: true,
        select: { title: true },
        showHiddenFields: true,
        user: EDITOR,
      })
    );
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        autosave: true,
        collection: "pages",
        data: { title: "New" },
        draft: true,
        fallbackLocale: false,
        id: "page-1",
        locale: "en",
        overrideAccess: false,
        overrideLock: false,
        user: EDITOR,
      })
    );
  });

  describe("that answers in turn per document", () => {
    const heldAnswers = () => {
      const order: string[] = [];
      const releases: (() => void)[] = [];
      const endpoint = endpointAnswering(async (_field, asked) => {
        order.push(`began ${asked.docId}`);
        await new Promise<void>((resolve) => releases.push(resolve));
        order.push(`ended ${asked.docId}`);
        return {};
      }, true);
      return { endpoint, order, releases };
    };

    it("begins the answer about a document once the earlier one ended", async () => {
      const payload = payloadOf();
      const { endpoint, order, releases } = heldAnswers();

      const first = endpoint.handler(requestOf(payload, PAGE));
      const second = endpoint.handler(requestOf(payload, PAGE));
      await vi.waitFor(() => expect(releases).toHaveLength(1));
      releases[0]!();
      await first;
      await vi.waitFor(() => expect(releases).toHaveLength(2));
      releases[1]!();
      await second;

      expect(order).toEqual(["began page-1", "ended page-1", "began page-1", "ended page-1"]);
    });

    it("answers about another document meanwhile", async () => {
      const payload = payloadOf();
      const { endpoint, order, releases } = heldAnswers();

      const first = endpoint.handler(requestOf(payload, PAGE));
      const other = endpoint.handler(requestOf(payload, { ...PAGE, docId: "page-2" }));
      await vi.waitFor(() => expect(releases).toHaveLength(2));
      for (const release of releases) release();
      await Promise.all([first, other]);

      expect(order.slice(0, 2)).toEqual(["began page-1", "began page-2"]);
    });

    it("answers a later request once an earlier one failed", async () => {
      const payload = payloadOf();
      vi.mocked(payload.findByID).mockRejectedValueOnce(new Error("Broken"));
      const endpoint = endpointAnswering(async () => ({ answered: true }), true);

      const failed = endpoint.handler(requestOf(payload, PAGE));
      const later = endpoint.handler(requestOf(payload, PAGE));

      expect((await failed).status).toBe(500);
      expect(await (await later).json()).toEqual({ answered: true });
    });
  });
});
