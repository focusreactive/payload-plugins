import type { CollectionConfig, FormState, Payload } from "payload";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminState } from "../../src/admin/instantPreview/previewSession";
import type { Overlay } from "../../src/client/createOverlay";
import type {
  VE_FIELDS_RENDERED_TYPE,
  VeLiveDocument,
  VeRenderedMessage,
} from "../../src/shared/protocol";
import type { EditorNode } from "../../src/shared/richText/editorNodes";
import type { Pages } from "../support/richTextPages";

import { createPreviewSession } from "../../src/admin/instantPreview/previewSession";
import { STEGA_PREFILTER } from "../../src/client/overlay/constants";
import { createOverlay } from "../../src/client/createOverlay";
import { withVisualEditingPath } from "../../src/client/withVisualEditingPath";
import { VE_FIELD_PATCH_TYPE, VE_FIELD_SNAPSHOT_TYPE } from "../../src/shared/protocol";
import { buildEditableSchema } from "../../src/shared/editableSchema/editableSchema";
import { isTextLeaf } from "../../src/shared/richText/textLeaves";
import { childrenOf, rootOf } from "../../src/shared/richText/editorNodes";

import { valueAt } from "../support/markedData";
import { overlayCtx } from "../support/overlay";
import { postFromAdmin, restorePreviewWindow, stubAdminWindow } from "../support/previewWindow";
import { START_TIMEOUT_MS, startRealPayload } from "../support/realPayload";
import { ARTICLE_TEXT_NODES, readMarked, readStored, seedPages } from "../support/richTextPages";

const pageFieldsOf = ({ fields, slug }: CollectionConfig) => (slug === "pages" ? fields : []);
const LOCALE = "en";

type EditorState = { root: { children: EditorNode[] } };

const renderNode = (node: EditorNode): HTMLElement => {
  if (isTextLeaf(node)) {
    const span = document.createElement("span");
    span.textContent = node.text;
    return span;
  }
  const element = document.createElement("div");
  element.append(...childrenOf(node).map(renderNode));
  return element;
};

const renderRichText = (value: unknown): HTMLElement => {
  const wrapper = document.createElement("div");
  for (const [name, attribute] of Object.entries(withVisualEditingPath(value))) {
    wrapper.setAttribute(name, attribute);
  }
  const root = rootOf(value);
  if (root) wrapper.append(...childrenOf(root).map(renderNode));
  return wrapper;
};

const textsOf = (rendered: HTMLElement) =>
  Array.from(rendered.querySelectorAll("span"), (span) => span.textContent);

const replaced = (texts: readonly string[], position: number, text: string) =>
  texts.map((known, index) => (index === position ? text : known));

const withText = (value: unknown, dataPath: string, text: string): EditorState => {
  const edited = structuredClone(value) as EditorState;
  (valueAt(edited, dataPath) as EditorNode).text = text;
  return edited;
};

const withParagraphAppended = (value: unknown): EditorState => {
  const edited = structuredClone(value) as EditorState;
  edited.root.children.push(structuredClone(edited.root.children[0] as EditorNode));
  return edited;
};

describe("a rich text edit from a draft read through Payload to the preview", () => {
  let payload: Payload;
  let pages: Pages;
  let main: HTMLElement;
  let overlay: Overlay;
  let postToAdmin: ReturnType<typeof vi.fn>;

  const startOverlay = () => {
    overlay = createOverlay(main, () => overlayCtx({ instantPreview: true, locale: LOCALE }));
  };

  const announcement = (): VeRenderedMessage<typeof VE_FIELDS_RENDERED_TYPE> =>
    postToAdmin.mock.calls[0]?.[0];

  const openAdmin = async (docId: string) => {
    const savedDocument = await readStored(payload, docId);
    const document: VeLiveDocument = {
      collectionSlug: "pages",
      docId,
      kind: "collection",
      locale: LOCALE,
    };
    const editableSchema = buildEditableSchema(payload.config.collections.flatMap(pageFieldsOf), {
      referencedBlocks: payload.blocks,
    });
    const session = createPreviewSession();
    const withForm = (formState: object): AdminState => ({
      document,
      editableSchema,
      formState: formState as FormState,
      savedDocument,
    });
    return {
      answer: (formState: object) => {
        session.formChanged(withForm(formState));
        const [snapshot] = session.pageAnnounced(announcement());
        return snapshot?.type === VE_FIELD_SNAPSHOT_TYPE ? snapshot : null;
      },
      savedDocument,
      type: (formState: object) => session.formChanged(withForm(formState))[0] ?? null,
    };
  };

  beforeAll(async () => {
    payload = await startRealPayload({ name: "rich-text-flow", plugin: { instantPreview: true } });
    pages = await seedPages(payload);
  }, START_TIMEOUT_MS);

  afterAll(() => payload.destroy());

  beforeEach(() => {
    main = document.createElement("main");
    document.body.append(main);
    postToAdmin = vi.fn();
    stubAdminWindow({ postMessage: postToAdmin });
  });

  afterEach(() => {
    overlay.dispose();
    main.remove();
    restorePreviewWindow();
  });

  it("patches the one text node that was typed into and holds its text when the tree changes", async () => {
    const draft = await readMarked(payload, pages.article);
    const body = renderRichText(valueAt(draft, "body"));
    main.append(body);
    startOverlay();
    const admin = await openAdmin(pages.article);
    const savedBody = valueAt(admin.savedDocument, "body");
    const savedTexts = ARTICLE_TEXT_NODES.map(({ text }) => text);

    expect(textsOf(body)).toEqual(savedTexts);
    expect(STEGA_PREFILTER.test(body.textContent ?? "")).toBe(false);
    expect(announcement().rendered).toEqual([
      {
        collectionSlug: "pages",
        docId: pages.article,
        keys: ARTICLE_TEXT_NODES.map(({ address }) =>
          expect.stringMatching(`^body#.+#${address}$`)
        ),
        kind: "collection",
      },
    ]);

    const snapshot = admin.answer({ body: { value: savedBody } });

    expect(snapshot?.fields).toEqual(
      announcement().rendered[0]?.keys.map((key, position) => ({
        key,
        saved: savedTexts[position],
        value: savedTexts[position],
      }))
    );
    postFromAdmin(snapshot);

    const linkTextTyped = withText(savedBody, "root.children.1.children.1.children.0", "our docs");
    const patch = admin.type({ body: { value: linkTextTyped } });

    expect(patch).toEqual({
      collectionSlug: "pages",
      docId: pages.article,
      kind: "collection",
      locale: LOCALE,
      patches: [{ key: announcement().rendered[0]?.keys[3], value: "our docs" }],
      type: VE_FIELD_PATCH_TYPE,
    });
    postFromAdmin(patch);

    expect(textsOf(body)).toEqual(replaced(savedTexts, 3, "our docs"));

    const paragraphAdded = withParagraphAppended(
      withText(linkTextTyped, "root.children.0.children.0", "Goodbye ")
    );

    expect(admin.type({ body: { value: paragraphAdded } })).toBeNull();
    expect(
      admin.answer({ body: { value: paragraphAdded } })?.fields.map(({ value }) => value)
    ).toEqual(replaced(savedTexts, 3, "our docs"));
    expect(textsOf(body)).toEqual(replaced(savedTexts, 3, "our docs"));
  });

  it("follows the rich text of a block row and of an array row by the id of the row", async () => {
    const draft = await readMarked(payload, pages.landing);
    const blockBody = renderRichText(valueAt(draft, "layout.0.body"));
    const rowNote = renderRichText(valueAt(draft, "list.0.note"));
    main.append(blockBody, rowNote);
    startOverlay();
    const admin = await openAdmin(pages.landing);
    const saved = (dataPath: string) => valueAt(admin.savedDocument, dataPath);
    const blockRowId = String(saved("layout.0.id"));
    const listRowId = String(saved("list.0.id"));
    const form = {
      layout: { rows: [{ blockType: "hero", id: blockRowId }], value: 1 },
      "layout.0.body": { value: saved("layout.0.body") },
      list: { rows: [{ id: listRowId }], value: 1 },
      "list.0.note": { value: saved("list.0.note") },
    };

    expect(announcement().rendered[0]?.keys).toEqual([
      expect.stringMatching(`^layout\\.${blockRowId}\\.body#.+#0\\.0$`),
      expect.stringMatching(`^list\\.${listRowId}\\.note#.+#0\\.0$`),
    ]);

    const snapshot = admin.answer(form);

    expect(snapshot).toMatchObject({
      fields: [
        { saved: "Block body", value: "Block body" },
        { saved: "Row note", value: "Row note" },
      ],
      type: VE_FIELD_SNAPSHOT_TYPE,
    });
    postFromAdmin(snapshot);
    postFromAdmin(
      admin.type({
        ...form,
        "list.0.note": {
          value: withText(saved("list.0.note"), "root.children.0.children.0", "Row note, typed"),
        },
      })
    );

    expect(textsOf(blockBody)).toEqual(["Block body"]);
    expect(textsOf(rowNote)).toEqual(["Row note, typed"]);
  });

  it("never paints the rich text of a populated document rendered inside another wrapper", async () => {
    const draft = await readMarked(payload, pages.landing, 1);
    const body = renderRichText(valueAt(draft, "body"));
    const linkedBody = renderRichText({ root: valueAt(draft, "related.body.root") });
    body.append(linkedBody);
    main.append(body);
    startOverlay();
    const admin = await openAdmin(pages.landing);
    const savedBody = valueAt(admin.savedDocument, "body");

    const snapshot = admin.answer({ body: { value: savedBody } });

    expect(announcement().rendered[0]?.keys).toHaveLength(2);
    expect(snapshot?.fields).toEqual([
      { key: announcement().rendered[0]?.keys[0], saved: "Body", value: "Body" },
    ]);
    postFromAdmin(snapshot);
    postFromAdmin(
      admin.type({
        body: { value: withText(savedBody, "root.children.0.children.0", "Linked body") },
      })
    );
    postFromAdmin(
      admin.type({
        body: { value: withText(savedBody, "root.children.0.children.0", "Body, typed") },
      })
    );

    expect(textsOf(body)).toEqual(["Body, typed", "Linked body"]);
  });
});
