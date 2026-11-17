import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { VisualEditing } from "../../src/dom";
import type { LiveRichTextRequest } from "../../src/shared/protocol";

import { DATA_VE_TARGET_ATTR } from "../../src/client/overlay/constants";
import { STORAGE_KEY } from "../../src/client/visualEditingMode";
import { mountVisualEditing, richTextAttributes, stripMarkers } from "../../src/dom";
import {
  VE_DOCUMENT_SAVED_TYPE,
  VE_FIELD_PATCH_TYPE,
  VE_FIELD_SNAPSHOT_TYPE,
  VE_RICH_TEXT_STRUCTURE_TYPE,
} from "../../src/shared/protocol";
import { markedText } from "../support/markedData";
import {
  ADMIN_ORIGIN,
  postFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
} from "../support/previewWindow";
import { flushMutations } from "../support/time";

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

  it("does nothing in a standalone tab when it is framed only", async () => {
    localStorage.setItem(STORAGE_KEY, "always");

    mount({ framedOnly: true });
    await flushMutations();

    expect(targets()).toHaveLength(0);
    expect(document.querySelector("[data-ve-toggle]")).toBeNull();
  });

  it("shows text typed in the admin with instant preview", async () => {
    mount({ instantPreview: true });

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
    await flushMutations();

    expect(requests).toEqual([{ field: BODY, locale: "en", state: stateOf("Typed") }]);
    expect(body.innerHTML).toBe("<p>Unsaved <strong>body</strong></p>");

    postFromAdmin(structureOf(SAVED_SHAPE, null));
    await flushMutations();

    expect(body.innerHTML).toBe("<p>Saved body</p>");
  });

  it("leaves rich text alone without a renderer", async () => {
    mount({ instantPreview: true });

    postFromAdmin(structureOf("unsaved", "Typed"));
    await flushMutations();

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
