import type { Payload, PayloadRequest } from "payload";

import { createLocalReq } from "payload";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { VisualEditing } from "../../src/dom";
import type { EditorNode } from "../../src/shared/richText/editorNodes";
import type { Pages } from "../support/richTextPages";

import { stripMarkers } from "../../src/index";
import { mountVisualEditing, richTextAttributes } from "../../src/dom";
import {
  VE_FIELD_PATCH_TYPE,
  VE_FIELD_SNAPSHOT_TYPE,
  VE_PREVIEW_GRANT_PATH,
  VE_PREVIEW_GRANT_TYPE,
  VE_READ_HEADER,
  VE_RICH_TEXT_STRUCTURE_TYPE,
} from "../../src/shared/protocol";
import { childrenOf, rootOf } from "../../src/shared/richText/editorNodes";
import { shapeOf } from "../../src/shared/richText/shapeOf";
import { isTextLeaf } from "../../src/shared/richText/textLeaves";
import { keyedFieldAddressOf } from "../../src/shared/veDocument";

import { valueAt } from "../support/markedData";
import {
  ADMIN_ORIGIN,
  postFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
} from "../support/previewWindow";
import { START_TIMEOUT_MS, startRealPayload } from "../support/realPayload";
import { page, readStored, seedPages } from "../support/richTextPages";
import { EDITOR } from "../support/unsavedRichTextRequests";
import { waitFor } from "../support/time";

const PAYLOAD_API = "https://cms.example/api";
const SITE_ORIGIN = "https://site.example";

type EditorState = { root: { children: EditorNode[] } };

const textOf = (node: EditorNode): string =>
  isTextLeaf(node) ? node.text : childrenOf(node).map(textOf).join("");

const siteHtmlOf = (value: unknown): string => {
  const root = rootOf(value);
  return root
    ? childrenOf(root)
        .map((node) => `<p>${textOf(node)}</p>`)
        .join("")
    : "";
};

const paragraphsOn = (element: Element) =>
  Array.from(element.querySelectorAll("p"), (paragraph) => stripMarkers(paragraph.textContent));

describe("a page without React that reads Payload over HTTP", () => {
  let payload: Payload;
  let pages: Pages;
  let editor: PayloadRequest["user"];
  let mounted: VisualEditing | null = null;

  const askEndpoint = async (path: string, init: RequestInit, user?: PayloadRequest["user"]) => {
    const endpoint = payload.config.endpoints.find((candidate) => candidate.path === path);
    const headers = new Headers(init.headers);
    headers.set("Origin", SITE_ORIGIN);
    const req = await createLocalReq(
      { req: { headers } as Partial<PayloadRequest>, user: user ?? undefined },
      payload
    );
    req.text = async () => init.body as string;
    return (await endpoint!.handler(req)) as Response;
  };

  const readOverHttp = async (docId: string) =>
    payload.findByID({
      collection: "pages",
      depth: 0,
      draft: true,
      id: docId,
      req: {
        headers: new Headers({ [VE_READ_HEADER]: "1" }),
        payloadAPI: "REST",
        user: editor,
      } as Partial<PayloadRequest>,
    });

  beforeAll(async () => {
    payload = await startRealPayload({
      name: "dom-page",
      plugin: { instantPreview: true, renderHtml: ({ value }) => siteHtmlOf(value) },
    });
    pages = await seedPages(payload);
    const created = await payload.create({ collection: "users", data: EDITOR });
    editor = { ...created, collection: "users" } as PayloadRequest["user"];
  }, START_TIMEOUT_MS);

  afterAll(() => payload.destroy());

  beforeEach(() => {
    stubAdminWindow({ postMessage: vi.fn() });
    vi.stubGlobal("fetch", (url: string, init: RequestInit) =>
      askEndpoint(url.slice(PAYLOAD_API.length), init)
    );
  });

  afterEach(() => {
    mounted?.destroy();
    mounted = null;
    vi.unstubAllGlobals();
    restorePreviewWindow();
    document.body.innerHTML = "";
  });

  const renderPage = async (docId: string) => {
    const draft = await readOverHttp(docId);
    const main = document.createElement("main");
    const title = document.createElement("h1");
    title.textContent = valueAt(draft, "title") as string;
    const body = document.createElement("div");
    for (const [name, value] of Object.entries(richTextAttributes(valueAt(draft, "body")))) {
      body.setAttribute(name, value);
    }
    body.innerHTML = siteHtmlOf(valueAt(draft, "body"));
    main.append(title, body);
    document.body.append(main);
    return { body, main, title };
  };

  const grantFromAdmin = async (docId: string) => {
    const response = await askEndpoint(
      VE_PREVIEW_GRANT_PATH,
      { body: JSON.stringify(page(docId)), headers: { "Content-Type": "application/json" } },
      editor
    );
    const { expiresAt, grant } = (await response.json()) as { expiresAt: number; grant: string };
    postFromAdmin({ expiresAt, grant, type: VE_PREVIEW_GRANT_TYPE });
  };

  it("shows a title typed in the admin on the same keystroke", async () => {
    const { main, title } = await renderPage(pages.article);
    const savedTitle = (await readStored(payload, pages.article)).title as string;
    mounted = mountVisualEditing({
      adminOrigin: ADMIN_ORIGIN,
      instantPreview: true,
      locale: "en",
      root: main,
    });

    postFromAdmin({
      ...page(pages.article),
      fields: [{ key: "title", saved: savedTitle, value: savedTitle }],
      locale: "en",
      type: VE_FIELD_SNAPSHOT_TYPE,
    });
    postFromAdmin({
      ...page(pages.article),
      locale: "en",
      patches: [{ key: "title", value: `${savedTitle}!` }],
      type: VE_FIELD_PATCH_TYPE,
    });

    expect(title.textContent).toBe(`${savedTitle}!`);
  });

  it("shows a paragraph added in the admin before the save, rendered by Payload", async () => {
    const { body, main } = await renderPage(pages.article);
    const saved = (await readStored(payload, pages.article)).body as EditorState;
    mounted = mountVisualEditing({
      adminOrigin: ADMIN_ORIGIN,
      instantPreview: true,
      locale: "en",
      payloadApi: PAYLOAD_API,
      root: main,
    });
    const savedParagraphs = paragraphsOn(body);

    const edited = structuredClone(saved);
    edited.root.children.push(structuredClone(edited.root.children[0] as EditorNode));
    const field = { ...page(pages.article), key: "body" };
    await grantFromAdmin(pages.article);
    postFromAdmin({
      ...field,
      locale: "en",
      shape: shapeOf(edited, keyedFieldAddressOf(field)),
      state: edited,
      type: VE_RICH_TEXT_STRUCTURE_TYPE,
    });
    await vi.waitFor(() => expect(paragraphsOn(body)).toHaveLength(savedParagraphs.length + 1), {
      timeout: 5000,
    });

    expect(paragraphsOn(body)).toEqual([...savedParagraphs, savedParagraphs[0]]);
    await waitFor(0);
  });

  it("shows a paragraph added in the admin as it arrives, rendered by the site, and asks Payload once after a pause", async () => {
    const { body, main } = await renderPage(pages.article);
    const saved = (await readStored(payload, pages.article)).body as EditorState;
    const asked = vi.fn((url: string, init: RequestInit) =>
      askEndpoint(url.slice(PAYLOAD_API.length), init)
    );
    vi.stubGlobal("fetch", asked);
    mounted = mountVisualEditing({
      adminOrigin: ADMIN_ORIGIN,
      instantPreview: true,
      locale: "en",
      payloadApi: PAYLOAD_API,
      renderRichTextValue: siteHtmlOf,
      root: main,
    });
    const savedParagraphs = paragraphsOn(body);
    const edited = structuredClone(saved);
    edited.root.children.push(structuredClone(edited.root.children[0] as EditorNode));
    const field = { ...page(pages.article), key: "body" };
    await grantFromAdmin(pages.article);

    postFromAdmin({
      ...field,
      locale: "en",
      shape: shapeOf(edited, keyedFieldAddressOf(field)),
      state: edited,
      type: VE_RICH_TEXT_STRUCTURE_TYPE,
    });

    expect(paragraphsOn(body)).toEqual([...savedParagraphs, savedParagraphs[0]]);
    expect(asked).not.toHaveBeenCalled();
    await waitFor(0);
    const writes = new MutationObserver(() => undefined);
    writes.observe(body, { characterData: true, childList: true, subtree: true });

    await vi.waitFor(() => expect(asked).toHaveBeenCalledTimes(1), { timeout: 5000 });
    await waitFor(100);

    expect(writes.takeRecords()).toEqual([]);
    writes.disconnect();
  });
});
