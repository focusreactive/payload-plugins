import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { VisualEditing } from "../../src/dom";
import type { LiveRichTextRequest } from "../../src/shared/protocol";

import { DATA_VE_TARGET_ATTR } from "../../src/client/overlay/constants";
import { STORAGE_KEY } from "../../src/client/visualEditingMode";
import { mountVisualEditing, richTextAttributes, stripMarkers } from "../../src/dom";
import {
  VE_DOCUMENT_SAVED_TYPE,
  VE_PREVIEW_GRANT_REQUEST_TYPE,
  VE_PREVIEW_GRANT_TYPE,
  VE_FIELD_PATCH_TYPE,
  VE_FIELD_SNAPSHOT_TYPE,
  VE_FRAME_SETTINGS_TYPE,
  VE_RICH_TEXT_STRUCTURE_TYPE,
} from "../../src/shared/protocol";
import { markedText } from "../support/markedData";
import {
  ADMIN_ORIGIN,
  frameTurnedOff,
  postFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
  stubFrameElement,
} from "../support/previewWindow";
import { flushMutations, settleStructure } from "../support/time";

const PAGE = { collectionSlug: "page", docId: "1", kind: "collection" } as const;
const BODY = { ...PAGE, key: "body" };
const SAVED_SHAPE = "saved-shape";

const stateOf = (text: string) => ({ root: { children: [{ text, type: "text" }], type: "root" } });

const structureOf = (shape: string, text: string | null) => ({
  ...BODY,
  locale: "en",
  shape,
  state: text === null ? null : stateOf(text),
  type: VE_RICH_TEXT_STRUCTURE_TYPE,
});

const MARKED_TITLE = markedText("Hello", { ...PAGE, path: "title" });

const description = () =>
  document.head.querySelector('meta[name="description"]')?.getAttribute("content");

const targets = () => document.querySelectorAll(`[${DATA_VE_TARGET_ATTR}]`);

const toggleButton = (label: string) =>
  [
    ...(document.querySelector("[data-ve-toggle]")?.shadowRoot?.querySelectorAll("button") ?? []),
  ].find((button) => button.textContent === label);

describe("mountVisualEditing", () => {
  let main: HTMLElement;
  let heading: HTMLHeadingElement;
  let body: HTMLDivElement;
  let mounted: VisualEditing | null;

  const mount = (options: Parameters<typeof mountVisualEditing>[0] = {}) => {
    mounted = mountVisualEditing({
      adminOrigin: ADMIN_ORIGIN,
      locale: "en",
      root: main,
      ...options,
    });
    return mounted;
  };

  beforeEach(() => {
    mounted = null;
    main = document.createElement("main");
    heading = document.createElement("h1");
    heading.textContent = markedText("Hello", { ...PAGE, path: "title" });
    body = document.createElement("div");
    body.setAttribute(
      "data-ve-live-rich-text",
      JSON.stringify({ field: BODY, shape: SAVED_SHAPE })
    );
    body.innerHTML = "<p>Saved body</p>";
    main.append(heading, body);
    document.body.append(main);
    stubAdminWindow({ postMessage: vi.fn() });
  });

  afterEach(() => {
    mounted?.destroy();
    document.body.innerHTML = "";
    document.head.innerHTML = "";
    localStorage.clear();
    restorePreviewWindow();
  });

  it("outlines editable text in the mode the editor chose last time", async () => {
    localStorage.setItem(STORAGE_KEY, "always");

    mount();
    await flushMutations();

    expect(targets()).toHaveLength(1);
  });

  it("switches the outlines with its toggle", async () => {
    localStorage.setItem(STORAGE_KEY, "always");
    mount();
    await flushMutations();

    toggleButton("Off")?.click();
    await flushMutations();

    expect(targets()).toHaveLength(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("off");
  });

  it("shows no toggle when asked not to", () => {
    mount({ toggle: false });

    expect(document.querySelector("[data-ve-toggle]")).toBeNull();
  });

  it("shows no outlines and no toggle in a standalone tab when it is framed only", async () => {
    restorePreviewWindow();
    localStorage.setItem(STORAGE_KEY, "always");

    mount({ framedOnly: true });
    await flushMutations();

    expect(targets()).toHaveLength(0);
    expect(document.querySelector("[data-ve-toggle]")).toBeNull();
  });

  describe("in a frame that turns visual editing off", () => {
    beforeEach(() => {
      localStorage.setItem(STORAGE_KEY, "always");
    });

    it("mounts nothing in a frame of its own origin with the attribute", async () => {
      stubFrameElement(frameTurnedOff());

      mount();
      await flushMutations();

      expect(targets()).toHaveLength(0);
      expect(document.querySelector("[data-ve-toggle]")).toBeNull();
      expect(heading.textContent).toBe("Hello");
    });

    it("takes the toggle and the outlines away when the admin answers off", async () => {
      mount();
      await flushMutations();
      expect(document.querySelector("[data-ve-toggle]")).not.toBeNull();

      postFromAdmin({ type: VE_FRAME_SETTINGS_TYPE, visualEditing: "off" });
      await flushMutations();

      expect(targets()).toHaveLength(0);
      expect(document.querySelector("[data-ve-toggle]")).toBeNull();
    });

    it("stops hearing saves once the admin answers off", () => {
      const onSave = vi.fn();
      mount({ onSave });

      postFromAdmin({ type: VE_FRAME_SETTINGS_TYPE, visualEditing: "off" });
      postFromAdmin({ type: VE_DOCUMENT_SAVED_TYPE });

      expect(onSave).not.toHaveBeenCalled();
    });

    it("stops showing text typed in the admin once the admin answers off", () => {
      mount();

      postFromAdmin({ type: VE_FRAME_SETTINGS_TYPE, visualEditing: "off" });
      postFromAdmin({
        ...PAGE,
        fields: [{ key: "title", saved: "Hello", value: "Hello there" }],
        locale: "en",
        type: VE_FIELD_SNAPSHOT_TYPE,
      });

      expect(heading.textContent).toBe("Hello");
    });

    it("asks the admin for the grant again when the admin answers on after off", () => {
      const postToAdmin = vi.fn();
      stubAdminWindow({ postMessage: postToAdmin });
      const grantRequests = () =>
        postToAdmin.mock.calls.filter(
          ([message]) => message.type === VE_PREVIEW_GRANT_REQUEST_TYPE
        );
      mount({ payloadApi: "https://cms.example/api" });

      postFromAdmin({ type: VE_FRAME_SETTINGS_TYPE, visualEditing: "off" });
      expect(grantRequests()).toHaveLength(1);

      postFromAdmin({ type: VE_FRAME_SETTINGS_TYPE, visualEditing: "on" });
      expect(grantRequests()).toHaveLength(2);
    });

    it("keeps the toggle and the outlines when the admin does not answer or answers on", async () => {
      mount();
      postFromAdmin({ type: VE_FRAME_SETTINGS_TYPE, visualEditing: "on" });
      await flushMutations();

      expect(targets()).toHaveLength(1);
      expect(document.querySelector("[data-ve-toggle]")).not.toBeNull();
    });
  });

  describe("without an overlay", () => {
    beforeEach(() => {
      document.title = MARKED_TITLE;
      document.head.insertAdjacentHTML(
        "beforeend",
        `<meta name="description" content="${MARKED_TITLE}">`
      );
      heading.setAttribute("data-text", MARKED_TITLE);
    });

    it.each([
      ["in a standalone tab when it is framed only", { framedOnly: true }],
      ["while the toggle is off and instant preview is not on", {}],
    ])("cleans the markers of the page %s", async (_name, options) => {
      restorePreviewWindow();

      mount(options);
      const added = document.createElement("h2");
      added.textContent = MARKED_TITLE;
      main.append(added);
      await flushMutations();

      expect(heading.textContent).toBe("Hello");
      expect(heading.getAttribute("data-text")).toBe("Hello");
      expect(added.textContent).toBe("Hello");
      expect(document.title).toBe("Hello");
      expect(description()).toBe("Hello");
      expect(targets()).toHaveLength(0);
    });

    it("gives the markers back when it is destroyed", () => {
      restorePreviewWindow();
      mount({ framedOnly: true }).destroy();
      mounted = null;

      expect(heading.textContent).toBe(MARKED_TITLE);
      expect(document.title).toBe(MARKED_TITLE);
      expect(description()).toBe(MARKED_TITLE);
    });

    it("hands the page to the overlay when the toggle turns it on", async () => {
      mount();
      toggleButton("Always")?.click();
      await flushMutations();

      expect(targets()).toHaveLength(1);
      expect(heading.textContent).toBe("Hello");
    });

    it("asks nothing of the admin on a page read without drafts", () => {
      const postToAdmin = vi.fn();
      stubAdminWindow({ postMessage: postToAdmin });

      mount({ available: false });

      expect(postToAdmin).not.toHaveBeenCalled();
    });

    it("leaves a page read without drafts alone", () => {
      restorePreviewWindow();

      mount({ available: false });

      expect(heading.textContent).toBe(MARKED_TITLE);
    });
  });

  it("shows text typed in the admin unless instant preview is turned off", async () => {
    mount({ instantPreview: false });

    postFromAdmin({
      ...PAGE,
      fields: [{ key: "title", saved: "Hello", value: "Hello there" }],
      locale: "en",
      type: VE_FIELD_SNAPSHOT_TYPE,
    });

    expect(heading.textContent).toBe("Hello");
  });

  it("shows text typed in the admin with instant preview", async () => {
    mount();

    postFromAdmin({
      ...PAGE,
      fields: [{ key: "title", saved: "Hello", value: "Hello" }],
      locale: "en",
      type: VE_FIELD_SNAPSHOT_TYPE,
    });
    postFromAdmin({
      ...PAGE,
      locale: "en",
      patches: [{ key: "title", value: "Hello there" }],
      type: VE_FIELD_PATCH_TYPE,
    });

    expect(heading.textContent).toBe("Hello there");
  });

  it("shows the HTML of an unsaved rich text structure and the saved one again after it", async () => {
    const requests: LiveRichTextRequest[] = [];
    mount({
      instantPreview: true,
      renderRichText: async (request) => {
        requests.push(request);
        return "<p>Unsaved <strong>body</strong></p>";
      },
    });

    postFromAdmin(structureOf("unsaved", "Typed"));
    await settleStructure();

    expect(requests).toEqual([{ field: BODY, locale: "en", state: stateOf("Typed") }]);
    expect(body.innerHTML).toBe("<p>Unsaved <strong>body</strong></p>");

    postFromAdmin(structureOf(SAVED_SHAPE, null));
    await flushMutations();

    expect(body.innerHTML).toBe("<p>Saved body</p>");
  });

  describe("with the unsaved rich text from Payload", () => {
    const PAYLOAD_API = "https://cms.example/api";
    const askPayload = vi.fn();
    const grantMessage = (expiresAt = Date.now() + 60_000) => ({
      expiresAt,
      grant: "signed",
      type: VE_PREVIEW_GRANT_TYPE,
    });

    beforeEach(() => {
      askPayload.mockReset();
      vi.stubGlobal("fetch", askPayload);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    const sentBody = () => JSON.parse(askPayload.mock.calls[0]![1].body as string);

    it("shows the HTML Payload renders, asked for with the grant from the admin", async () => {
      askPayload.mockResolvedValue(Response.json({ html: "<p>From Payload</p>" }));
      mount({ instantPreview: true, payloadApi: PAYLOAD_API });

      postFromAdmin(grantMessage());
      postFromAdmin(structureOf("unsaved", "Typed"));
      await settleStructure();

      expect(askPayload.mock.calls[0]![0]).toBe(
        "https://cms.example/api/visual-editing/unsaved-rich-text"
      );
      expect(askPayload.mock.calls[0]![1].headers).toEqual({ "Content-Type": "text/plain" });
      expect(sentBody()).toEqual({
        format: "html",
        grant: "signed",
        request: { field: BODY, locale: "en", state: stateOf("Typed") },
      });
      expect(body.innerHTML).toBe("<p>From Payload</p>");
    });

    it("renders the value Payload reads with the renderer of the site", async () => {
      askPayload.mockResolvedValue(Response.json({ value: { root: "unsaved value" } }));
      const renderRichTextValue = vi.fn(() => "<p>Rendered by the site</p>");
      mount({ instantPreview: true, payloadApi: PAYLOAD_API, renderRichTextValue });

      postFromAdmin(grantMessage());
      postFromAdmin(structureOf("unsaved", "Typed"));
      await settleStructure();

      expect(sentBody().format).toBe("json");
      expect(renderRichTextValue).toHaveBeenCalledWith(
        { root: "unsaved value" },
        expect.anything()
      );
      expect(body.innerHTML).toBe("<p>Rendered by the site</p>");
    });

    it("asks the admin for the grant when it starts, with the id of this page load", () => {
      const postToAdmin = vi.fn();
      stubAdminWindow({ postMessage: postToAdmin });

      mount({ instantPreview: true, payloadApi: PAYLOAD_API });

      expect(postToAdmin).toHaveBeenCalledWith(
        { pageId: expect.any(String), type: VE_PREVIEW_GRANT_REQUEST_TYPE },
        ADMIN_ORIGIN
      );
    });

    it("asks the API below the admin origin when the site names no other", async () => {
      askPayload.mockResolvedValue(Response.json({ html: "<p>From Payload</p>" }));
      mount();

      postFromAdmin(grantMessage());
      postFromAdmin(structureOf("unsaved", "Typed"));
      await settleStructure();

      expect(askPayload.mock.calls[0]![0]).toBe(
        `${ADMIN_ORIGIN}/api/visual-editing/unsaved-rich-text`
      );
      expect(body.innerHTML).toBe("<p>From Payload</p>");
    });

    it("asks nothing without a fresh grant from the admin", async () => {
      mount({ instantPreview: true, payloadApi: PAYLOAD_API });

      postFromAdmin(grantMessage(Date.now() - 1));
      postFromAdmin(grantMessage(), { origin: "https://elsewhere.example" });
      postFromAdmin(structureOf("unsaved", "Typed"));
      await settleStructure();

      expect(askPayload).not.toHaveBeenCalled();
      expect(body.innerHTML).toBe("<p>Saved body</p>");
    });
  });

  it("leaves rich text alone without a renderer", async () => {
    mount({ instantPreview: true });

    postFromAdmin(structureOf("unsaved", "Typed"));
    await settleStructure();

    expect(body.innerHTML).toBe("<p>Saved body</p>");
  });

  it("calls onSave when the admin saves, and only then", () => {
    const onSave = vi.fn();
    mount({ onSave });

    postFromAdmin({ type: VE_DOCUMENT_SAVED_TYPE }, { origin: "https://elsewhere.example" });
    postFromAdmin({ type: "payload-document-event" });
    expect(onSave).not.toHaveBeenCalled();

    postFromAdmin({ type: VE_DOCUMENT_SAVED_TYPE });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("calls onSave without arguments for a save of any document the admin names", () => {
    const onSave = vi.fn();
    mount({ onSave });

    postFromAdmin({
      collectionSlug: "media",
      docId: "9",
      kind: "collection",
      type: VE_DOCUMENT_SAVED_TYPE,
    });

    expect(onSave.mock.calls).toEqual([[]]);
  });

  it("removes its toggle and stops listening when it is destroyed", () => {
    const onSave = vi.fn();
    mount({ onSave }).destroy();
    mounted = null;

    postFromAdmin({ type: VE_DOCUMENT_SAVED_TYPE });

    expect(onSave).not.toHaveBeenCalled();
    expect(document.querySelector("[data-ve-toggle]")).toBeNull();
  });
});

describe("stripMarkers from ./dom", () => {
  it("cleans a marked value for an id, an anchor or a comparison in a template", () => {
    expect(stripMarkers(markedText("Starter plan", { ...PAGE, path: "plan" }))).toBe(
      "Starter plan"
    );
  });
});

describe("richTextAttributes", () => {
  it("gives no attributes to a value read without visual editing", () => {
    expect(richTextAttributes({ root: { children: [] } })).toEqual({});
  });
});
