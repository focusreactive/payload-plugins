import type { Payload } from "payload";

import { configToSchema } from "@payloadcms/graphql";
import { GraphQL } from "@payloadcms/graphql/types";
import { createPayloadRequest } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Pages } from "../support/richTextPages";
import type { Rest } from "../support/restRequests";

import {
  VE_PREVIEW_GRANT_PATH,
  VE_READ_HEADER,
  VE_UNSAVED_RICH_TEXT_PATH,
} from "../../src/shared/protocol";

import { markersIn } from "../support/markedData";
import { START_TIMEOUT_MS, startRealPayload } from "../support/realPayload";
import { API_URL, postOfJson, restOf } from "../support/restRequests";
import { article, nodeMarkersOf, page, seedPages, topLevelTypesOf } from "../support/richTextPages";
import { EDITOR, signIn } from "../support/unsavedRichTextRequests";

const NAME = "http";
const SITE_ORIGIN = "https://site.example";
const OVER_THE_BODY_LIMIT = 5 * 1024 * 1024;

type Read = { title?: unknown; siteName?: unknown; docs?: Read[] };

const isMarked = (text: unknown): boolean => typeof text === "string" && markersIn(text).length > 0;

describe("the plugin behind the REST and GraphQL layers of Payload", () => {
  let payload: Payload;
  let rest: Rest;
  let pages: Pages;
  let editor: Headers;

  const withHeader = (headers = new Headers()) => {
    const marked = new Headers(headers);
    marked.set(VE_READ_HEADER, "1");
    return marked;
  };

  const read = async (path: string, headers: Headers): Promise<Read> =>
    (await (await rest(path, { headers })).json()) as Read;

  const fromTheSite = (headers = new Headers()) => {
    const sent = new Headers(headers);
    sent.set("Origin", SITE_ORIGIN);
    sent.set("Content-Type", "text/plain");
    return sent;
  };

  const grantFor = async (docId: string): Promise<string> => {
    const granted = await rest(VE_PREVIEW_GRANT_PATH, postOfJson(page(docId), editor));
    return ((await granted.json()) as { grant: string }).grant;
  };

  const unsavedRequest = () => ({
    field: { ...page(pages.landing), key: "body" },
    locale: "en",
    state: article(),
  });

  beforeAll(async () => {
    payload = await startRealPayload({
      name: NAME,
      plugin: {
        instantPreview: true,
        renderHtml: ({ value }) => `<div>${topLevelTypesOf(value).join(",")}</div>`,
      },
    });
    rest = restOf(payload, NAME);
    pages = await seedPages(payload);
    editor = await signIn(payload, EDITOR);
    await payload.updateGlobal({ data: { siteName: "A site" }, slug: "settings" });
  }, START_TIMEOUT_MS);

  afterAll(() => payload.destroy());

  describe("a draft read over REST", () => {
    it("is marked for a signed-in user who sends the header, by id and in a list", async () => {
      const byId = await read(`/pages/${pages.landing}?draft=true&depth=0`, withHeader(editor));
      const list = await read("/pages?draft=true&depth=0&limit=1", withHeader(editor));

      expect(isMarked(byId.title)).toBe(true);
      expect(isMarked(list.docs?.[0]?.title)).toBe(true);
    });

    it("is marked for a global", async () => {
      const settings = await read("/globals/settings?draft=true&depth=0", withHeader(editor));

      expect(isMarked(settings.siteName)).toBe(true);
    });

    it("is not marked without the header, without a user or without draft", async () => {
      const path = `/pages/${pages.landing}?depth=0`;

      const withoutHeader = await read(`${path}&draft=true`, editor);
      const anonymous = await read(`${path}&draft=true`, withHeader());
      const published = await read(path, withHeader(editor));

      expect([withoutHeader, anonymous, published].map(({ title }) => isMarked(title))).toEqual([
        false,
        false,
        false,
      ]);
    });
  });

  describe("a draft read over GraphQL", () => {
    const titleOver = async (headers: Headers): Promise<unknown> => {
      const request = new Request(`${API_URL}/graphql`, { headers, method: "POST" });
      const req = await createPayloadRequest({
        config: payload.config,
        payloadInstanceCacheKey: NAME,
        request,
      });
      const { schema } = configToSchema(payload.config);
      const result = await GraphQL.graphql({
        contextValue: { headers: {}, req },
        schema,
        source: `query { Page(id: ${pages.landing}, draft: true) { title } }`,
      });
      expect(result.errors).toBeUndefined();
      return (result.data as { Page: { title: unknown } }).Page.title;
    };

    it("is marked for a signed-in user who sends the header, and not without it", async () => {
      const marked = await titleOver(withHeader(editor));
      const plain = await titleOver(editor);

      expect(isMarked(marked)).toBe(true);
      expect(plain).toBe("Landing");
    });
  });

  describe("the preview grant endpoint", () => {
    it("answers 401 to a request without a user and 400 to a body that names no document", async () => {
      const anonymous = await rest(VE_PREVIEW_GRANT_PATH, postOfJson(page(pages.landing)));
      const notJson = await rest(VE_PREVIEW_GRANT_PATH, {
        body: "not json",
        headers: editor,
        method: "POST",
      });
      const noDocument = await rest(VE_PREVIEW_GRANT_PATH, postOfJson({ kind: "page" }, editor));

      expect([anonymous.status, notJson.status, noDocument.status]).toEqual([401, 400, 400]);
    });

    it("gives the signed-in user a grant that expires", async () => {
      const granted = await rest(VE_PREVIEW_GRANT_PATH, postOfJson(page(pages.landing), editor));
      const { expiresAt, grant } = (await granted.json()) as { expiresAt: number; grant: string };

      expect(granted.status).toBe(200);
      expect(granted.headers.get("Cache-Control")).toBe("no-store");
      expect(grant).toEqual(expect.any(String));
      expect(expiresAt).toBeGreaterThan(Date.now());
    });
  });

  describe("the unsaved rich text endpoint", () => {
    it("reads the posted state from a streamed body and answers the origin that asked", async () => {
      const grant = await grantFor(pages.landing);

      const answer = await rest(
        VE_UNSAVED_RICH_TEXT_PATH,
        postOfJson({ grant, request: unsavedRequest() }, fromTheSite())
      );
      const { value } = (await answer.json()) as { value: unknown };

      expect(answer.status).toBe(200);
      expect(answer.headers.get("Access-Control-Allow-Origin")).toBe(SITE_ORIGIN);
      expect(answer.headers.get("Vary")).toBe("Origin");
      expect(answer.headers.get("Cache-Control")).toBe("no-store");
      expect(topLevelTypesOf(value)).toEqual(["paragraph", "paragraph", "list"]);
      expect(nodeMarkersOf(value)).not.toEqual([]);
    });

    it("names no origin in the answer to a request without one", async () => {
      const grant = await grantFor(pages.landing);

      const answer = await rest(
        VE_UNSAVED_RICH_TEXT_PATH,
        postOfJson({ grant, request: unsavedRequest() })
      );

      expect(answer.status).toBe(200);
      expect(answer.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("renders HTML with renderHtml when the page asks for it", async () => {
      const grant = await grantFor(pages.landing);

      const answer = await rest(
        VE_UNSAVED_RICH_TEXT_PATH,
        postOfJson({ format: "html", grant, request: unsavedRequest() }, fromTheSite())
      );

      expect(await answer.json()).toEqual({ html: "<div>paragraph,paragraph,list</div>" });
    });

    it("answers 401 without a grant and 400 to a body that is no JSON object", async () => {
      const withoutGrant = await rest(
        VE_UNSAVED_RICH_TEXT_PATH,
        postOfJson({ request: unsavedRequest() }, fromTheSite())
      );
      const notJson = await rest(VE_UNSAVED_RICH_TEXT_PATH, {
        body: "x",
        headers: fromTheSite(),
        method: "POST",
      });

      expect([withoutGrant.status, notJson.status]).toEqual([401, 400]);
      expect(await withoutGrant.json()).toEqual({ value: null });
      expect(notJson.headers.get("Access-Control-Allow-Origin")).toBe(SITE_ORIGIN);
    });

    it("answers 400 to a body over the limit, with a valid grant in it", async () => {
      const grant = await grantFor(pages.landing);

      const answer = await rest(
        VE_UNSAVED_RICH_TEXT_PATH,
        postOfJson(
          { grant, pad: "x".repeat(OVER_THE_BODY_LIMIT), request: unsavedRequest() },
          fromTheSite()
        )
      );

      expect(answer.status).toBe(400);
      expect(await answer.json()).toEqual({ value: null });
    });
  });
});
