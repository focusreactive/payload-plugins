import type { Access, Payload, PayloadRequest } from "payload";

import { createLocalReq } from "payload";
import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Pages } from "../support/richTextPages";

import { DEFAULT_UNSAVED_READ_TIME_LIMIT_MS } from "../../src/index";
import { signPreviewGrant } from "../../src/server/previewGrant";
import { VE_PREVIEW_GRANT_PATH, VE_UNSAVED_RICH_TEXT_PATH } from "../../src/shared/protocol";
import { documentAddressOf } from "../../src/shared/veDocument";

import { START_TIMEOUT_MS, startRealPayload } from "../support/realPayload";
import { article, nodeMarkersOf, page, seedPages, topLevelTypesOf } from "../support/richTextPages";
import { EDITOR, OUTSIDER, signIn } from "../support/unsavedRichTextRequests";

const SITE_ORIGIN = "https://site.example";

type Answer = { status: number; body: Record<string, unknown>; allowedOrigin: string | null };

let readDelayMs = 0;
let bodyReads = 0;
let renderedFor: unknown = null;

const everyoneButTheOutsider: Access = async ({ req }) => {
  const delayMs = readDelayMs;
  readDelayMs = 0;
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return req.user?.email !== OUTSIDER.email;
};

describe("the unsaved rich text endpoint of a preview page on another origin", () => {
  let payload: Payload;
  let pages: Pages;
  let editor: Headers;
  let outsider: Headers;

  const call = async (path: string, body: unknown, headers = new Headers()): Promise<Answer> => {
    const endpoint = payload.config.endpoints.find((candidate) => candidate.path === path);
    const requestHeaders = new Headers(headers);
    requestHeaders.set("Origin", SITE_ORIGIN);
    requestHeaders.set("Content-Type", "application/json");
    const { user } = await payload.auth({ headers: requestHeaders });
    const req = await createLocalReq(
      { req: { headers: requestHeaders } as Partial<PayloadRequest>, user: user ?? undefined },
      payload
    );
    req.text = async () => {
      bodyReads += 1;
      return JSON.stringify(body);
    };
    const response = (await endpoint!.handler(req)) as Response;
    return {
      allowedOrigin: response.headers.get("Access-Control-Allow-Origin"),
      body: (await response.json()) as Record<string, unknown>,
      status: response.status,
    };
  };

  const grantFor = async (docId: string, headers = editor) =>
    (await call(VE_PREVIEW_GRANT_PATH, page(docId), headers)).body.grant as string;

  const unsavedRequest = (docId: string) => ({
    field: { ...page(docId), key: "body" },
    locale: "en",
    state: article(),
  });

  beforeAll(async () => {
    payload = await startRealPayload({
      canRead: everyoneButTheOutsider,
      name: "preview-grant",
      plugin: {
        instantPreview: true,
        renderHtml: ({ req, value }) => {
          renderedFor = req.user?.email;
          return `<div>${topLevelTypesOf(value).join(",")}</div>`;
        },
      },
    });
    pages = await seedPages(payload);
    editor = await signIn(payload, EDITOR);
    outsider = await signIn(payload, OUTSIDER);
  }, START_TIMEOUT_MS);

  afterAll(() => payload.destroy());

  it("grants nobody who is not signed in", async () => {
    const answer = await call(VE_PREVIEW_GRANT_PATH, page(pages.landing));

    expect(answer.status).toBe(401);
  });

  it("reads no body of a request for a grant that nobody signed in", async () => {
    bodyReads = 0;

    await call(VE_PREVIEW_GRANT_PATH, page(pages.landing));

    expect(bodyReads).toBe(0);
  });

  it("leaves the cross-origin headers of the grant to the CORS config of Payload", async () => {
    const answer = await call(VE_PREVIEW_GRANT_PATH, page(pages.landing), editor);

    expect(answer.status).toBe(200);
    expect(answer.allowedOrigin).toBeNull();
  });

  it("reads the unsaved state for the signed-in editor the grant was given to", async () => {
    const grant = await grantFor(pages.landing);

    const answer = await call(VE_UNSAVED_RICH_TEXT_PATH, {
      grant,
      request: unsavedRequest(pages.landing),
    });

    expect(answer.status).toBe(200);
    expect(answer.allowedOrigin).toBe(SITE_ORIGIN);
    expect(topLevelTypesOf(answer.body.value)).toEqual(["paragraph", "paragraph", "list"]);
    expect(nodeMarkersOf(answer.body.value)).not.toEqual([]);
  });

  it("renders the value to HTML with renderHtml when the page asks for HTML", async () => {
    const grant = await grantFor(pages.landing);

    const answer = await call(VE_UNSAVED_RICH_TEXT_PATH, {
      format: "html",
      grant,
      request: unsavedRequest(pages.landing),
    });

    expect(answer.body).toEqual({ html: "<div>paragraph,paragraph,list</div>" });
  });

  it("gives renderHtml the request of the user the grant names, so a read it makes has that user", async () => {
    const grant = await grantFor(pages.landing);
    renderedFor = null;

    await call(VE_UNSAVED_RICH_TEXT_PATH, {
      format: "html",
      grant,
      request: unsavedRequest(pages.landing),
    });

    expect(renderedFor).toBe(EDITOR.email);
  });

  it("waits longer than readUnsavedRichText does by default, since no router waits behind it", async () => {
    const grant = await grantFor(pages.landing);
    readDelayMs = DEFAULT_UNSAVED_READ_TIME_LIMIT_MS + 500;
    try {
      const answer = await call(VE_UNSAVED_RICH_TEXT_PATH, {
        grant,
        request: unsavedRequest(pages.landing),
      });
      expect(topLevelTypesOf(answer.body.value)).toEqual(["paragraph", "paragraph", "list"]);
    } finally {
      readDelayMs = 0;
    }
  }, 15_000);

  it("reads nothing of another document than the one the grant names", async () => {
    const grant = await grantFor(pages.landing);

    const answer = await call(VE_UNSAVED_RICH_TEXT_PATH, {
      grant,
      request: unsavedRequest(pages.article),
    });

    expect(answer.body).toEqual({ value: null });
  });

  it("reads with the access of the user, so a user who may not read the page gets nothing", async () => {
    const grant = await grantFor(pages.landing, outsider);

    const answer = await call(VE_UNSAVED_RICH_TEXT_PATH, {
      grant,
      request: unsavedRequest(pages.landing),
    });

    expect(answer.body).toEqual({ value: null });
  });

  it("refuses a grant that was changed, signed with another secret or expired", async () => {
    const grant = await grantFor(pages.landing);
    const [signed, signature] = grant.split(".");
    const changed = `${Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(signed!, "base64url").toString()), userId: 999 })
    ).toString("base64url")}.${signature}`;
    const editorUser = (await payload.auth({ headers: editor })).user!;
    const grantOf = (expiresAt: number, secret: string) =>
      signPreviewGrant(
        {
          document: documentAddressOf(page(pages.landing)),
          expiresAt,
          userCollection: editorUser.collection,
          userId: editorUser.id,
        },
        secret
      );

    const signedWithTheSecretItself = `${signed}.${createHmac("sha256", payload.secret)
      .update(signed!)
      .digest("base64url")}`;

    for (const refused of [
      changed,
      signedWithTheSecretItself,
      grantOf(Date.now() + 60_000, "another-secret"),
      grantOf(Date.now() - 1, payload.secret),
      "not-a-grant",
    ]) {
      const answer = await call(VE_UNSAVED_RICH_TEXT_PATH, {
        grant: refused,
        request: unsavedRequest(pages.landing),
      });
      expect(answer.status).toBe(401);
    }
  });
});
