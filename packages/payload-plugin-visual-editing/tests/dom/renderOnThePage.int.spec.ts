import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { MountVisualEditingOptions, VisualEditing } from "../../src/dom";
import type { EditorNode } from "../../src/shared/richText/editorNodes";

import { optimisticValueOf } from "../../src/client/instantPreview/unsavedRender/optimisticValue";
import { SERVER_CHECK_PAUSE_MS } from "../../src/client/instantPreview/unsavedRender/unsavedRender";
import { mountVisualEditing, richTextAttributes, stripMarkers } from "../../src/dom";
import {
  VE_DOCUMENT_SAVED_TYPE,
  VE_FIELD_PATCH_TYPE,
  VE_FIELD_SNAPSHOT_TYPE,
  VE_PREVIEW_GRANT_TYPE,
  VE_RICH_TEXT_STRUCTURE_TYPE,
} from "../../src/shared/protocol";
import { withoutBlockFields } from "../../src/shared/richText/blockNodes";
import { childrenOf, rootOf } from "../../src/shared/richText/editorNodes";
import { markTextLeaves } from "../../src/shared/richText/markTextLeaves";
import { richTextNodeKeyOf } from "../../src/shared/richText/nodeKey";
import { shapeOf } from "../../src/shared/richText/shapeOf";
import { isTextLeaf } from "../../src/shared/richText/textLeaves";
import { META_KEY } from "../../src/shared/shared";
import { keyedFieldAddressOf } from "../../src/shared/veDocument";

import { editorState, paragraph, textNode } from "../support/editorState";
import {
  ADMIN_ORIGIN,
  postFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
} from "../support/previewWindow";
import { flushMutations, settleStructure, waitFor } from "../support/time";

const PAYLOAD_API = "https://cms.example/api";
const PAGE = { collectionSlug: "pages", docId: "1", kind: "collection" } as const;
const BODY = { ...PAGE, key: "body" };
const FIELD_ADDRESS = keyedFieldAddressOf(BODY);
const META = { ...PAGE, path: "body", terminal: true };
const FIELD = { fieldAddress: FIELD_ADDRESS, meta: META };

type Request = { field: object; locale?: string; state?: unknown };
type Asked = { format: string; grant: string; request: Request };

const callout = (fields: object) => ({ fields, format: "", type: "block", version: 2 });

const draftReadOf = (state: object) => {
  const value = structuredClone(state);
  markTextLeaves(value, FIELD_ADDRESS);
  return { ...value, [META_KEY]: META };
};

const textOf = (node: EditorNode): string =>
  isTextLeaf(node) ? node.text : childrenOf(node).map(textOf).join("");

const htmlOfNode = (node: EditorNode): string => {
  if (node.type === "block")
    return `<aside>${(node.fields as { text?: string }).text ?? ""}</aside>`;
  return `<p>${textOf(node)}</p>`;
};

const siteHtmlOf = (value: unknown): string =>
  childrenOf(rootOf(value) ?? {})
    .map(htmlOfNode)
    .join("");

const visibleText = (element: Element) =>
  [...element.children].map((child) => stripMarkers(child.textContent ?? ""));

const structureOf = (state: object | null, shape = state && shapeOf(state, FIELD_ADDRESS)) => ({
  ...BODY,
  locale: "en",
  shape,
  state,
  type: VE_RICH_TEXT_STRUCTURE_TYPE,
});

const grantMessage = () => ({
  expiresAt: Date.now() + 60_000,
  grant: "signed",
  type: VE_PREVIEW_GRANT_TYPE,
});

const firstPatch = () => ({
  ...PAGE,
  locale: "en",
  patches: [
    { key: richTextNodeKeyOf({ address: "0.0", fieldKey: "body", shape: "s" }), value: "H" },
  ],
  type: VE_FIELD_PATCH_TYPE,
});

describe("a rich text structure rendered on a page without React", () => {
  let main: HTMLElement;
  let body: HTMLDivElement;
  let mounted: VisualEditing | null;
  let saved: ReturnType<typeof draftReadOf>;
  let asked: Asked[];
  let answerOf: (asked: Asked) => unknown;
  let renderRichTextValue: ReturnType<typeof vi.fn<(value: unknown) => string>>;

  const askedForState = () => asked.filter(({ request }) => request.state !== undefined);
  const askedForBase = () => asked.filter(({ request }) => request.state === undefined);

  const serverAnswerOf = ({ request }: Asked) =>
    request.state === undefined ? saved : optimisticValueOf(request.state, FIELD, saved);

  const showPage = (state: object) => {
    saved = draftReadOf(state);
    for (const [name, value] of Object.entries(richTextAttributes(saved))) {
      body.setAttribute(name, value);
    }
    body.innerHTML = siteHtmlOf(saved);
  };

  const mount = (options: MountVisualEditingOptions = {}) => {
    mounted = mountVisualEditing({
      adminOrigin: ADMIN_ORIGIN,
      instantPreview: true,
      locale: "en",
      payloadApi: PAYLOAD_API,
      renderRichTextValue,
      root: main,
      ...options,
    });
    postFromAdmin(grantMessage());
  };

  beforeEach(() => {
    mounted = null;
    asked = [];
    answerOf = serverAnswerOf;
    renderRichTextValue = vi.fn((value: unknown) => siteHtmlOf(value));
    main = document.createElement("main");
    body = document.createElement("div");
    main.append(body);
    document.body.append(main);
    stubAdminWindow({ postMessage: vi.fn() });
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      const sent = JSON.parse(init.body as string) as Asked;
      asked.push(sent);
      return Response.json({ value: answerOf(sent) });
    });
  });

  afterEach(() => {
    mounted?.destroy();
    vi.unstubAllGlobals();
    restorePreviewWindow();
    document.body.innerHTML = "";
  });

  describe("for a field without blocks, uploads or links to documents", () => {
    beforeEach(() => {
      showPage(editorState(paragraph(textNode("Hello"))));
    });

    it("shows a new paragraph as the structure arrives, without asking Payload", () => {
      mount();

      postFromAdmin(
        structureOf(editorState(paragraph(textNode("Hello")), paragraph(textNode("New"))))
      );

      expect(visibleText(body)).toEqual(["Hello", "New"]);
      expect(asked).toEqual([]);
    });

    it("renders Enter and the first letter on the page and asks Payload once, after a pause", async () => {
      mount();

      postFromAdmin(structureOf(editorState(paragraph(textNode("Hello")), paragraph())));
      postFromAdmin(
        structureOf(editorState(paragraph(textNode("Hello")), paragraph(textNode("W"))))
      );

      expect(renderRichTextValue).toHaveBeenCalledTimes(2);
      expect(visibleText(body)).toEqual(["Hello", "W"]);
      await waitFor(SERVER_CHECK_PAUSE_MS - 50);
      expect(asked).toEqual([]);

      await waitFor(50);
      await flushMutations();

      expect(askedForState()).toHaveLength(1);
      expect(askedForState()[0]?.request.state).toEqual(
        editorState(paragraph(textNode("Hello")), paragraph(textNode("W")))
      );
    });

    it("leaves the element alone when Payload answers with the same HTML", async () => {
      mount();
      postFromAdmin(
        structureOf(editorState(paragraph(textNode("Hello")), paragraph(textNode("New"))))
      );
      await flushMutations();
      const writes = new MutationObserver(() => undefined);
      writes.observe(body, { characterData: true, childList: true, subtree: true });

      await waitFor(SERVER_CHECK_PAUSE_MS);
      await flushMutations();

      expect(askedForState()).toHaveLength(1);
      expect(writes.takeRecords()).toEqual([]);
      writes.disconnect();
    });

    it("shows the answer of Payload when it differs", async () => {
      answerOf = (sent) => ({
        ...(serverAnswerOf(sent) as object),
        root: { children: [paragraph(textNode("From Payload"))], type: "root" },
      });
      mount();
      postFromAdmin(
        structureOf(editorState(paragraph(textNode("Hello")), paragraph(textNode("New"))))
      );

      await waitFor(SERVER_CHECK_PAUSE_MS);
      await flushMutations();

      expect(visibleText(body)).toEqual(["From Payload"]);
    });

    it("updates the text typed after the structure through the markers", async () => {
      mount();
      const state = editorState(paragraph(textNode("Hello")), paragraph(textNode("W")));
      postFromAdmin(structureOf(state));
      await flushMutations();
      const key = richTextNodeKeyOf({
        address: "1.0",
        fieldKey: "body",
        shape: shapeOf(state, FIELD_ADDRESS)!,
      });

      postFromAdmin({
        ...PAGE,
        fields: [{ key, saved: "W", value: "W" }],
        locale: "en",
        type: VE_FIELD_SNAPSHOT_TYPE,
      });
      postFromAdmin({
        ...PAGE,
        locale: "en",
        patches: [{ key, value: "Wo" }],
        type: VE_FIELD_PATCH_TYPE,
      });

      expect(visibleText(body)).toEqual(["Hello", "Wo"]);
    });

    it("renders through Payload alone when the renderer of the site throws", async () => {
      renderRichTextValue.mockImplementationOnce(() => {
        throw new Error("Not in a browser");
      });
      mount();

      postFromAdmin(
        structureOf(editorState(paragraph(textNode("Hello")), paragraph(textNode("New"))))
      );

      expect(visibleText(body)).toEqual(["Hello"]);
      await settleStructure();
      await flushMutations();
      expect(visibleText(body)).toEqual(["Hello", "New"]);
    });

    it("renders through Payload alone when told not to render on the page", async () => {
      mount({ optimistic: false });

      postFromAdmin(
        structureOf(editorState(paragraph(textNode("Hello")), paragraph(textNode("New"))))
      );

      expect(visibleText(body)).toEqual(["Hello"]);
      await settleStructure();
      await flushMutations();
      expect(askedForState()).toHaveLength(1);
      expect(visibleText(body)).toEqual(["Hello", "New"]);
    });

    it("renders through Payload alone for an element printed by an older version", async () => {
      body.setAttribute(
        "data-ve-live-rich-text",
        JSON.stringify({ field: BODY, shape: shapeOf(saved, FIELD_ADDRESS) })
      );
      mount();

      postFromAdmin(
        structureOf(editorState(paragraph(textNode("Hello")), paragraph(textNode("New"))))
      );

      expect(visibleText(body)).toEqual(["Hello"]);
    });

    it("goes on rendering on the page after a save, without asking for the saved value", async () => {
      mount();
      postFromAdmin({ type: VE_DOCUMENT_SAVED_TYPE });
      postFromAdmin(firstPatch());

      postFromAdmin(
        structureOf(editorState(paragraph(textNode("Hello")), paragraph(textNode("New"))))
      );
      await flushMutations();

      expect(visibleText(body)).toEqual(["Hello", "New"]);
      expect(asked).toEqual([]);
    });
  });

  describe("after a save the admin names the document of, when the page does not load again", () => {
    const loaded = () => editorState(paragraph(textNode("Hello")));
    const withNew = () => editorState(paragraph(textNode("Hello")), paragraph(textNode("New")));
    const returnToLoaded = () => postFromAdmin(structureOf(null, shapeOf(loaded(), FIELD_ADDRESS)));

    beforeEach(() => {
      showPage(loaded());
      mount();
      postFromAdmin(structureOf(withNew()));
    });

    it("keeps what the page loaded with as the saved structure after a save of another document", () => {
      postFromAdmin({
        collectionSlug: "media",
        docId: "9",
        kind: "collection",
        type: VE_DOCUMENT_SAVED_TYPE,
      });

      returnToLoaded();

      expect(visibleText(body)).toEqual(["Hello"]);
    });

    it("keeps it after a save of the document in another locale", () => {
      postFromAdmin({ ...PAGE, locale: "de", type: VE_DOCUMENT_SAVED_TYPE });

      returnToLoaded();

      expect(visibleText(body)).toEqual(["Hello"]);
    });

    it("takes the structure the editor holds as the saved one after a save of the document of the field", () => {
      postFromAdmin({ ...PAGE, locale: "en", type: VE_DOCUMENT_SAVED_TYPE });
      postFromAdmin(
        structureOf(
          editorState(paragraph(textNode("Hello")), paragraph(textNode("New")), paragraph())
        )
      );

      postFromAdmin(structureOf(null, shapeOf(withNew(), FIELD_ADDRESS)));

      expect(visibleText(body)).toEqual(["Hello", "New"]);
    });
  });

  describe("after a save, when the page does not load again", () => {
    const withNew = () => editorState(paragraph(textNode("Hi")), paragraph(textNode("New")));

    beforeEach(() => {
      showPage(editorState(paragraph(textNode("Hello"))));
      mount();
      postFromAdmin(structureOf(withNew()));
      postFromAdmin({ type: VE_DOCUMENT_SAVED_TYPE });
    });

    it("shows what was saved when the editor returns to the saved structure", () => {
      postFromAdmin(
        structureOf(editorState(paragraph(textNode("Hi")), paragraph(textNode("New")), paragraph()))
      );

      postFromAdmin(structureOf(null, shapeOf(withNew(), FIELD_ADDRESS)));

      expect(visibleText(body)).toEqual(["Hi", "New"]);
    });

    it("renders the structure the page loaded with from what the editor holds", () => {
      postFromAdmin(structureOf(editorState(paragraph(textNode("Hi")))));

      expect(visibleText(body)).toEqual(["Hi"]);
    });
  });

  describe("for a field with a block", () => {
    const SAVED_CALLOUT = { blockType: "callout", id: "callout-saved", text: "Saved callout" };
    const withNewParagraph = () =>
      withoutBlockFields(
        editorState(
          paragraph(textNode("Hello")),
          callout(SAVED_CALLOUT),
          paragraph(textNode("New"))
        )
      );

    beforeEach(() => {
      showPage(editorState(paragraph(textNode("Hello")), callout(SAVED_CALLOUT)));
    });

    it("asks Payload for the saved value once the editor starts typing, and only once", async () => {
      mount();

      postFromAdmin(firstPatch());
      postFromAdmin(firstPatch());
      await flushMutations();

      expect(asked).toEqual([
        { format: "json", grant: "signed", request: { field: BODY, locale: "en" } },
      ]);
    });

    it("renders a structure on the page with the fields of the block from the saved value", async () => {
      mount();
      postFromAdmin(firstPatch());
      await flushMutations();

      postFromAdmin(structureOf(withNewParagraph()));

      expect(visibleText(body)).toEqual(["Hello", "Saved callout", "New"]);
      expect(askedForState()).toEqual([]);
    });

    it("renders through Payload until it has the saved value", async () => {
      mount();

      postFromAdmin(structureOf(withNewParagraph()));

      expect(visibleText(body)).toEqual(["Hello", "Saved callout"]);
      await settleStructure();
      await flushMutations();
      expect(visibleText(body)).toEqual(["Hello", "Saved callout", "New"]);
      expect(askedForState()).toHaveLength(1);
    });

    it("renders on the page with what Payload answered for an earlier structure", async () => {
      mount();
      postFromAdmin(structureOf(withNewParagraph()));
      await settleStructure();
      await flushMutations();

      postFromAdmin(
        structureOf(
          withoutBlockFields(editorState(callout(SAVED_CALLOUT), paragraph(textNode("Hello"))))
        )
      );

      expect(visibleText(body)).toEqual(["Saved callout", "Hello"]);
    });

    it("renders on the page once the saved value it asked for arrives, before Payload answers", async () => {
      mount();

      postFromAdmin(structureOf(withNewParagraph()));
      expect(visibleText(body)).toEqual(["Hello", "Saved callout"]);
      await flushMutations();

      expect(visibleText(body)).toEqual(["Hello", "Saved callout", "New"]);
      expect(askedForBase()).toHaveLength(1);
      expect(askedForState()).toEqual([]);
    });

    it("asks for the saved value again after the document is saved", async () => {
      mount();
      postFromAdmin(firstPatch());
      await flushMutations();
      postFromAdmin({ type: VE_DOCUMENT_SAVED_TYPE });

      postFromAdmin(structureOf(withNewParagraph()));
      expect(visibleText(body)).toEqual(["Hello", "Saved callout"]);
      await flushMutations();

      expect(askedForBase()).toHaveLength(2);
      expect(visibleText(body)).toEqual(["Hello", "Saved callout", "New"]);
    });

    it("asks again for a saved value that did not arrive", async () => {
      answerOf = (sent) => (sent.request.state === undefined ? null : serverAnswerOf(sent));
      mount();
      postFromAdmin(firstPatch());
      await flushMutations();
      answerOf = serverAnswerOf;

      postFromAdmin(firstPatch());
      await flushMutations();
      postFromAdmin(structureOf(withNewParagraph()));

      expect(askedForBase()).toHaveLength(2);
      expect(visibleText(body)).toEqual(["Hello", "Saved callout", "New"]);
    });
  });
});
