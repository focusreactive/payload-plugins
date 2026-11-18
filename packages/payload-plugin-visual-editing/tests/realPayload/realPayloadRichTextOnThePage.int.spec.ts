import type { LexicalEditor } from "lexical";
import type { FieldAccess, Payload, PayloadRequest } from "payload";

import {
  $createNodeSelection,
  $getRoot,
  $isTextNode,
  $setSelection,
  KEY_BACKSPACE_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import { createLocalReq } from "payload";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { VisualEditing } from "../../src/dom";
import type { EditorNode } from "../../src/shared/richText/editorNodes";

import { DATA_VE_OPAQUE_ATTR } from "../../src/client/inlineEditing/richText/opaqueNode";
import { DATA_VE_EDITED_ATTR } from "../../src/client/inlineEditing/richTextTwin";
import { DATA_VE_EDITING_ATTR } from "../../src/client/inlineEditing/textEditing";
import { EDITS_IN_PLACE_STORAGE_KEY, STORAGE_KEY } from "../../src/client/visualEditingMode";
import { mountVisualEditing, richTextAttributes } from "../../src/dom";
import { VE_READ_HEADER } from "../../src/shared/protocol";
import { childrenOf, rootOf } from "../../src/shared/richText/editorNodes";
import { isTextLeaf } from "../../src/shared/richText/textLeaves";

import { valueAt } from "../support/markedData";
import { click } from "../support/overlay";
import { restorePreviewWindow } from "../support/previewWindow";
import { START_TIMEOUT_MS, startRealPayload } from "../support/realPayload";
import { measureSelectionsAsEmpty } from "../support/selectionRects";
import { waitFor } from "../support/time";
import { EDITOR } from "../support/unsavedRichTextRequests";

const PAYLOAD_API = "https://cms.example/api";
const SITE_ORIGIN = "https://site.example";
const BOLD = 1;
const WAIT_STEP_MS = 10;
const WAIT_STEPS = 200;

type Node = EditorNode & { children?: Node[] };

type State = { root: Node & { children: Node[] } };

const editorsOnly: FieldAccess = ({ req }) => req.user?.email === EDITOR.email;

const text = (value: string, format = 0): Node => ({
  detail: 0,
  format,
  mode: "normal",
  style: "",
  text: value,
  type: "text",
  version: 1,
});

const element = (type: string, children: Node[], extra: object = {}): Node => ({
  children,
  direction: null,
  format: "",
  indent: 0,
  type,
  version: 1,
  ...extra,
});

const NOT_EDITABLE_TYPES = ["upload", "block", "horizontalrule", "relationship"];

const htmlOf = (node: EditorNode): Element => {
  const rendered = document.createElement(isTextLeaf(node) ? "span" : "div");
  if (isTextLeaf(node)) rendered.textContent = node.text;
  for (const child of childrenOf(node)) rendered.append(htmlOf(child));
  return rendered;
};

const lexicalOf = (twin: Element): LexicalEditor =>
  (twin as unknown as { __lexicalEditor: LexicalEditor }).__lexicalEditor;

const until = async (isReached: () => boolean) => {
  for (let step = 0; step < WAIT_STEPS && !isReached(); step += 1) await waitFor(WAIT_STEP_MS);
};

describe("rich text edited on a page that saves through Payload", () => {
  let payload: Payload;
  let editor: PayloadRequest["user"];
  let mounted: VisualEditing | null = null;
  let photoId: number;
  let relatedId: number;
  let saves: number;

  const askEndpoint = async (path: string, init: RequestInit) => {
    const endpoint = payload.config.endpoints.find((candidate) => candidate.path === path);
    const headers = new Headers(init.headers);
    headers.set("Origin", SITE_ORIGIN);
    const req = await createLocalReq(
      { req: { headers } as Partial<PayloadRequest>, user: editor ?? undefined },
      payload
    );
    req.text = async () => init.body as string;
    return (await endpoint!.handler(req)) as Response;
  };

  const story = (): State => ({
    root: {
      ...element("root", []),
      children: [
        element("paragraph", [text("Hello "), text("world", BOLD)], { textFormat: 0 }),
        element("heading", [text("A heading")], { tag: "h2" }),
        element("quote", [text("A quote")]),
        element(
          "list",
          [
            element("listitem", [text("One")], { value: 1 }),
            element("listitem", [text("Two")], { checked: true, value: 2 }),
          ],
          { listType: "check", start: 1, tag: "ul" }
        ),
        {
          fields: { credit: relatedId },
          format: "",
          id: "upload-saved",
          relationTo: "media",
          type: "upload",
          value: photoId,
          version: 3,
        },
        element("paragraph", [
          text("Read "),
          element("link", [text("the docs")], {
            fields: {
              credit: relatedId,
              linkType: "custom",
              newTab: true,
              url: "https://example.com/docs",
            },
            id: "link-saved",
            version: 3,
          }),
          { type: "linebreak", version: 1 },
          text("and more"),
        ]),
        {
          fields: { blockType: "callout", id: "callout-saved", note: "Internal", text: "Saved" },
          format: "",
          type: "block",
          version: 2,
        },
        { type: "horizontalrule", version: 1 },
        { format: "", relationTo: "pages", type: "relationship", value: relatedId, version: 2 },
      ],
    },
  });

  const readStory = async (docId: string): Promise<State> => {
    const stored = await payload.findByID({
      collection: "pages",
      context: { visualEditing: false },
      depth: 0,
      draft: true,
      id: docId,
    });
    return stored.story as State;
  };

  const renderPage = async (docId: string) => {
    const draft = await payload.findByID({
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
    const value = valueAt(draft, "story");
    const main = document.createElement("main");
    const wrapper = document.createElement("article");
    wrapper.className = "prose";
    for (const [name, attribute] of Object.entries(richTextAttributes(value))) {
      wrapper.setAttribute(name, attribute);
    }
    for (const node of childrenOf(rootOf(value) ?? {})) wrapper.append(htmlOf(node));
    main.append(wrapper);
    document.body.append(main);
    return { main, wrapper };
  };

  beforeAll(async () => {
    payload = await startRealPayload({
      canReadGuardedBody: editorsOnly,
      name: "rich-text-on-the-page",
      plugin: { inlineEditing: true, instantPreview: true },
    });
    const created = await payload.create({ collection: "users", data: EDITOR });
    editor = { ...created, collection: "users" } as PayloadRequest["user"];
    const photo = await payload.create({
      collection: "media",
      data: { alt: "A harbour" },
      file: { data: Buffer.from("photo"), mimetype: "text/plain", name: "photo.txt", size: 5 },
    });
    const author = await payload.create({ collection: "authors", data: { name: "Ada" } });
    photoId = Number(photo.id);
    relatedId = Number(author.id);
  }, START_TIMEOUT_MS);

  afterAll(() => payload.destroy());

  beforeEach(() => {
    measureSelectionsAsEmpty();
    saves = 0;
    window.localStorage.setItem(STORAGE_KEY, "hover");
    window.localStorage.setItem(EDITS_IN_PLACE_STORAGE_KEY, "true");
    vi.spyOn(window, "open").mockImplementation(() => null);
    vi.stubGlobal("fetch", (url: string, init: RequestInit) =>
      askEndpoint(url.slice(PAYLOAD_API.length), init)
    );
  });

  afterEach(() => {
    mounted?.destroy();
    mounted = null;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    restorePreviewWindow();
    window.localStorage.clear();
    document.body.innerHTML = "";
  });

  const BLOCK_POSITION = 6;

  const notEditableIn = (state: State) =>
    state.root.children.filter(({ type }) => NOT_EDITABLE_TYPES.includes(type as string));

  const beginEditOf = async (docId: string) => {
    const { main, wrapper } = await renderPage(docId);
    mounted = mountVisualEditing({
      available: true,
      inlineEditing: true,
      instantPreview: true,
      locale: "en",
      onEdited: () => {
        saves += 1;
      },
      payloadApi: PAYLOAD_API,
      richTextEditor: () => import("../../src/rich-text"),
      root: main,
      toggle: false,
    });
    await waitFor(0);
    click(wrapper);
    await until(() => wrapper.nextElementSibling?.hasAttribute(DATA_VE_EDITING_ATTR) ?? false);
    return wrapper.nextElementSibling as HTMLElement;
  };

  const removeTheBlock = (twin: HTMLElement) => {
    const lexical = lexicalOf(twin);
    lexical.update(
      () => {
        const selection = $createNodeSelection();
        selection.add($getRoot().getChildAtIndex(BLOCK_POSITION)!.getKey());
        $setSelection(selection);
      },
      { discrete: true }
    );
    lexical.update(
      () =>
        lexical.dispatchCommand(
          KEY_BACKSPACE_COMMAND,
          new KeyboardEvent("keydown", { cancelable: true })
        ),
      { discrete: true }
    );
  };

  const commit = async () => {
    document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    await until(() => saves > 0);
  };

  const createStory = async () => {
    const created = await payload.create({
      collection: "pages",
      data: { story: story() },
      draft: true,
    });
    return String(created.id);
  };

  it("removes a block that was selected and deleted on the page and leaves every other node of the draft as it was", async () => {
    const docId = await createStory();
    const before = await readStory(docId);
    const twin = await beginEditOf(docId);

    removeTheBlock(twin);
    await commit();

    const after = await readStory(docId);
    const kept = before.root.children.filter((_node, position) => position !== BLOCK_POSITION);
    expect(before.root.children[BLOCK_POSITION]!.type).toBe("block");
    expect(after.root.children.map(({ type }) => type)).toEqual(kept.map(({ type }) => type));
    expect(JSON.stringify(notEditableIn(after))).toBe(
      JSON.stringify(notEditableIn({ root: { ...before.root, children: kept } }))
    );
    expect(after.root.children).toMatchObject(kept);
    expect(saves).toBe(1);
  });

  it("saves a block with the fields the draft stores when its removal was undone before the edit ended", async () => {
    const docId = await createStory();
    const before = await readStory(docId);
    const twin = await beginEditOf(docId);

    removeTheBlock(twin);
    lexicalOf(twin).update(() => lexicalOf(twin).dispatchCommand(UNDO_COMMAND, undefined), {
      discrete: true,
    });
    lexicalOf(twin).update(
      () => {
        const first = $getRoot().getFirstDescendant();
        if ($isTextNode(first)) first.setTextContent("Goodbye ");
      },
      { discrete: true }
    );
    await commit();

    const after = await readStory(docId);
    expect(after.root.children[0]!.children![0]).toMatchObject({ text: "Goodbye " });
    expect(JSON.stringify(notEditableIn(after))).toBe(JSON.stringify(notEditableIn(before)));
    expect(after.root.children.slice(1)).toMatchObject(before.root.children.slice(1));
    expect(after.root.children[BLOCK_POSITION]!.fields).toMatchObject({ note: "Internal" });
  });

  it("saves what was typed and formatted and leaves every other node of the draft as it was", async () => {
    const created = await payload.create({
      collection: "pages",
      data: { story: story() },
      draft: true,
    });
    const docId = String(created.id);
    const before = await readStory(docId);
    const { main, wrapper } = await renderPage(docId);
    mounted = mountVisualEditing({
      available: true,
      inlineEditing: true,
      instantPreview: true,
      locale: "en",
      onEdited: () => {
        saves += 1;
      },
      payloadApi: PAYLOAD_API,
      richTextEditor: () => import("../../src/rich-text"),
      root: main,
      toggle: false,
    });
    await waitFor(0);

    click(wrapper);
    await until(() => wrapper.nextElementSibling?.hasAttribute(DATA_VE_EDITING_ATTR) ?? false);
    const twin = wrapper.nextElementSibling as HTMLElement;
    const shownAsPlaceholders = [...twin.querySelectorAll(`[${DATA_VE_OPAQUE_ATTR}]`)].map(
      (placeholder) => placeholder.getAttribute(DATA_VE_OPAQUE_ATTR)
    );

    lexicalOf(twin).update(
      () => {
        const first = $getRoot().getFirstDescendant();
        if ($isTextNode(first)) first.setTextContent("Goodbye ").toggleFormat("italic");
      },
      { discrete: true }
    );
    document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    await until(() => saves > 0);

    const after = await readStory(docId);
    const notEditable = (state: State) =>
      state.root.children.filter(({ type }) => NOT_EDITABLE_TYPES.includes(type as string));
    expect(shownAsPlaceholders).toEqual([
      "upload",
      "block: callout",
      "horizontalrule",
      "relationship",
    ]);
    expect(after.root.children[0]!.children).toMatchObject([
      { format: 2, text: "Goodbye " },
      { format: BOLD, text: "world" },
    ]);
    expect(JSON.stringify(notEditable(after))).toBe(JSON.stringify(notEditable(before)));
    expect(notEditable(after).map(({ type }) => type)).toEqual(NOT_EDITABLE_TYPES);
    expect(after.root.children.slice(1)).toMatchObject(before.root.children.slice(1));
    expect(after.root.children).toHaveLength(before.root.children.length);
    expect(saves).toBe(1);
    expect(wrapper.nextElementSibling?.hasAttribute(DATA_VE_EDITED_ATTR)).toBe(true);
  });
});
