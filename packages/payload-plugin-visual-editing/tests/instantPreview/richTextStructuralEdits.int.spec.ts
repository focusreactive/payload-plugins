import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminState } from "../../src/admin/instantPreview/previewSession";
import type { Overlay } from "../../src/client/createOverlay";
import type {
  VE_FIELDS_RENDERED_TYPE,
  VeDocument,
  VeRenderedMessage,
} from "../../src/shared/protocol";

import { createPreviewSession } from "../../src/admin/instantPreview/previewSession";
import { createOverlay } from "../../src/client/createOverlay";
import {
  DATA_VE_COLLECTION_ATTR,
  DATA_VE_DOC_ID_ATTR,
  DATA_VE_KIND_ATTR,
  DATA_VE_PATH_ATTR,
  VE_ANNOUNCE_REQUEST_TYPE,
} from "../../src/shared/protocol";
import { buildEditableSchema } from "../../src/shared/editableSchema/editableSchema";
import { markTextLeaves } from "../../src/server/richText/markTextLeaves";
import { richTextNodeKeyOf } from "../../src/shared/richText/nodeKey";
import { shapeOf } from "../../src/shared/richText/shapeOf";
import { textLeavesOf } from "../../src/shared/richText/textLeaves";
import { fieldAddressOf } from "../../src/shared/veDocument";

import type { EditorState } from "../support/editorState";

import { paragraphsOf } from "../support/editorState";
import { overlayCtx } from "../support/overlay";
import {
  postAllFromAdmin,
  postFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
} from "../support/previewWindow";
import { flushMutations } from "../support/time";
const LOCALE = "en";
const FIELD_KEY = "content";
const PAGE: VeDocument = { collectionSlug: "page", docId: "1", kind: "collection" };

const CONTENT_ATTRIBUTES = {
  [DATA_VE_COLLECTION_ATTR]: PAGE.collectionSlug,
  [DATA_VE_DOC_ID_ATTR]: "1",
  [DATA_VE_KIND_ATTR]: PAGE.kind,
  [DATA_VE_PATH_ATTR]: FIELD_KEY,
};

const paragraphs = (...texts: string[]) => paragraphsOf(...texts.map((text) => [text]));

const draftReadOf = (saved: EditorState): string[] => {
  const marked = structuredClone(saved);
  markTextLeaves(marked, fieldAddressOf(PAGE, FIELD_KEY));
  return textLeavesOf(marked).map(({ text }) => text);
};

const nodeKeysOf = (saved: EditorState): string[] => {
  const shape = shapeOf(saved, fieldAddressOf(PAGE, FIELD_KEY));
  if (shape === null) return [];
  return textLeavesOf(saved)
    .filter(({ text }) => text !== "")
    .map(({ address }) => richTextNodeKeyOf({ address, fieldKey: FIELD_KEY, shape }));
};

const announcedKeysOf = ({
  rendered,
}: VeRenderedMessage<typeof VE_FIELDS_RENDERED_TYPE>): string[] =>
  rendered.flatMap(({ keys }) => keys);

describe("rich text in the preview while the editor changes its structure", () => {
  let content: HTMLElement;
  let overlay: Overlay | undefined;
  let postToAdmin: ReturnType<typeof vi.fn>;
  let editor: EditorState;
  let savedDocument: { [FIELD_KEY]: EditorState };
  let renderedByReact: WeakMap<Element, string>;

  const editableSchema = buildEditableSchema([{ name: FIELD_KEY, type: "richText" }]);
  const session = { current: createPreviewSession() };

  const adminState = (): AdminState => ({
    document: { ...PAGE, locale: LOCALE },
    editableSchema,
    formState: { [FIELD_KEY]: { value: editor } },
    savedDocument,
  });

  const answerAnnouncements = (): string[] => {
    const announcements = postToAdmin.mock.calls.map(([announcement]) => announcement);
    postToAdmin.mockClear();
    for (const announcement of announcements) {
      postAllFromAdmin(session.current.pageAnnounced(announcement));
    }
    return announcements.flatMap(announcedKeysOf);
  };

  const paragraphAt = (index: number): Element => {
    const rendered = content.children[index];
    if (rendered) return rendered;
    const paragraph = document.createElement("p");
    content.append(paragraph);
    return paragraph;
  };

  const render = async (saved: EditorState) => {
    const texts = draftReadOf(saved);
    for (const [index, text] of texts.entries()) {
      const paragraph = paragraphAt(index);
      if (renderedByReact.get(paragraph) === text) continue;
      renderedByReact.set(paragraph, text);
      if (paragraph.firstChild) (paragraph.firstChild as Text).data = text;
      else paragraph.append(text);
    }
    while (content.children.length > texts.length) content.lastElementChild?.remove();
    await flushMutations();
    return answerAnnouncements();
  };

  const renderSavedDocument = () => render(savedDocument[FIELD_KEY]);

  const everythingThePageAnnounced = () => {
    postFromAdmin({ type: VE_ANNOUNCE_REQUEST_TYPE });
    return answerAnnouncements();
  };

  const openPreview = async (saved: EditorState, inEditor = saved) => {
    savedDocument = { [FIELD_KEY]: saved };
    editor = inEditor;
    postAllFromAdmin(session.current.formChanged(adminState()));
    await renderSavedDocument();
    overlay = createOverlay(document.querySelector("main") as HTMLElement, () =>
      overlayCtx({ instantPreview: true, locale: LOCALE, mode: "hover" })
    );
    await flushMutations();
    answerAnnouncements();
  };

  const edit = (next: EditorState) => {
    editor = next;
    postAllFromAdmin(session.current.formChanged(adminState()));
  };

  const landSaveOf = (saved: EditorState) => {
    savedDocument = { [FIELD_KEY]: saved };
    postAllFromAdmin(session.current.formChanged(adminState()));
  };

  const shownTexts = () => Array.from(content.children, (paragraph) => paragraph.textContent);

  beforeEach(() => {
    overlay = undefined;
    document.body.innerHTML = "";
    const main = document.createElement("main");
    content = document.createElement("div");
    for (const [name, value] of Object.entries(CONTENT_ATTRIBUTES)) {
      content.setAttribute(name, value);
    }
    main.append(content);
    document.body.append(main);
    renderedByReact = new WeakMap();
    session.current = createPreviewSession();
    postToAdmin = vi.fn();
    stubAdminWindow({ postMessage: postToAdmin });
  });

  afterEach(() => {
    overlay?.dispose();
    restorePreviewWindow();
  });

  it("shows the saved text when the saved document returns to a shape that was edited before", async () => {
    await openPreview(paragraphs("Intro", "foo"));
    edit(paragraphs("Intro", "foo bar"));
    edit(paragraphs("Intro", "foo bar", ""));
    landSaveOf(paragraphs("Intro", "foo bar", ""));
    await renderSavedDocument();
    edit(paragraphs("Intro", "foo", ""));
    edit(paragraphs("Intro", "foo"));
    edit(paragraphs("Intro", "foo", ""));

    landSaveOf(paragraphs("Intro", "foo"));
    await renderSavedDocument();

    expect(shownTexts()).toEqual(["Intro", "foo"]);
  });

  it("shows the text edited in another shape once the editor returns to the saved one", async () => {
    await openPreview(paragraphs("Hell"));
    edit(paragraphs("Hello"));
    edit(paragraphs("Hello", ""));
    landSaveOf(paragraphs("Hello"));
    await renderSavedDocument();
    edit(paragraphs("Hello!", ""));

    edit(paragraphs("Hello!"));

    expect(shownTexts()).toEqual(["Hello!"]);
  });

  it("never shows the saved text in place of typed text after a new paragraph", async () => {
    const shown: (string | null)[][] = [];
    await openPreview(paragraphs("Intro", "foo"));
    edit(paragraphs("Intro", "foo b"));
    edit(paragraphs("Intro", "foo bar"));

    edit(paragraphs("Intro", "foo bar", ""));
    shown.push(shownTexts());
    landSaveOf(paragraphs("Intro", "foo b"));
    shown.push(shownTexts());
    await renderSavedDocument();
    shown.push(shownTexts());
    landSaveOf(paragraphs("Intro", "foo bar", ""));
    shown.push(shownTexts());

    expect(shown).toEqual(Array.from({ length: 4 }, () => ["Intro", "foo bar"]));

    await renderSavedDocument();

    expect(shownTexts()).toEqual(["Intro", "foo bar", ""]);
  });

  it("keeps the text typed last when a render of the shape it shows arrives after a save of another shape", async () => {
    await openPreview(paragraphs("Intro", "foo"));
    edit(paragraphs("Intro", "foo b"));
    edit(paragraphs("Intro", "foo bar"));
    edit(paragraphs("Intro", "foo bar", ""));
    landSaveOf(paragraphs("Intro", "foo b"));
    landSaveOf(paragraphs("Intro", "foo bar", ""));
    edit(paragraphs("Intro", "foo bar baz", "more"));

    await render(paragraphs("Intro", "foo b"));

    expect(shownTexts()).toEqual(["Intro", "foo bar"]);

    await renderSavedDocument();

    expect(shownTexts()).toEqual(["Intro", "foo bar baz", ""]);
  });

  describe("a render of a shape the page has left", () => {
    const LEFT = paragraphs("Intro", "foo");
    const RENDERED_LAST = paragraphs("Intro", "rewritten", "x");

    beforeEach(async () => {
      await openPreview(LEFT);
      edit(paragraphs("Intro", "foo typed"));
      edit(paragraphs("Intro", "foo typed", ""));
      landSaveOf(paragraphs("Intro", "foo typed", ""));
      await renderSavedDocument();
      edit(RENDERED_LAST);
      landSaveOf(RENDERED_LAST);
      await renderSavedDocument();
    });

    it("shows its own text, not the text typed when the page showed that shape", async () => {
      await render(LEFT);

      expect(shownTexts()).toEqual(["Intro", "foo"]);
    });

    it("announces its text nodes again", async () => {
      const announced = await render(LEFT);

      expect(announced).toEqual(nodeKeysOf(LEFT));
    });

    it("gives way to the render of the saved document", async () => {
      await render(LEFT);

      await renderSavedDocument();
      edit(paragraphs("Intro", "rewritten!", "x"));

      expect(shownTexts()).toEqual(["Intro", "rewritten!", "x"]);
    });
  });

  it("keeps only the text nodes of the shape it shows after many structural edits", async () => {
    const STRUCTURAL_EDITS = 12;
    const paragraphCounts = Array.from({ length: STRUCTURAL_EDITS }, (_, index) => index + 2);
    await openPreview(paragraphs("Paragraph 0"));

    for (const count of paragraphCounts) {
      const next = paragraphs(...Array.from({ length: count }, (_, index) => `Paragraph ${index}`));
      edit(next);
      landSaveOf(next);
      await renderSavedDocument();
    }

    expect(everythingThePageAnnounced()).toEqual(nodeKeysOf(savedDocument[FIELD_KEY]));
  });

  describe("when the save of a structural edit lands after the edit was undone", () => {
    beforeEach(async () => {
      await openPreview(paragraphs("Intro", "foo"));
      edit(paragraphs("Intro", "foo", ""));
      edit(paragraphs("Intro", "foo"));
      edit(paragraphs("Intro", "foo bar"));
    });

    it("shows the text typed after the undo until the save is rendered", () => {
      landSaveOf(paragraphs("Intro", "foo", ""));

      expect(shownTexts()).toEqual(["Intro", "foo bar"]);
    });

    it("shows the text of that save while the editor holds the structure before it", async () => {
      landSaveOf(paragraphs("Intro", "foo", ""));
      await renderSavedDocument();
      edit(paragraphs("Intro", "foo bar baz"));

      expect(shownTexts()).toEqual(["Intro", "foo", ""]);
    });

    it("shows the typed text again once the next save is rendered", async () => {
      landSaveOf(paragraphs("Intro", "foo", ""));
      await renderSavedDocument();
      edit(paragraphs("Intro", "foo bar baz"));

      landSaveOf(paragraphs("Intro", "foo bar baz"));
      await renderSavedDocument();
      edit(paragraphs("Intro", "foo bar baz!"));

      expect(shownTexts()).toEqual(["Intro", "foo bar baz!"]);
    });
  });

  it("shows the saved render to a page that loads during an unsaved structural edit", async () => {
    await openPreview(paragraphs("Intro", "foo"), paragraphs("Intro", "foo", "new"));

    expect(shownTexts()).toEqual(["Intro", "foo"]);

    edit(paragraphs("Intro", "foo!", "new"));

    expect(shownTexts()).toEqual(["Intro", "foo"]);
  });

  it("catches up with a page that loaded during a structural edit when the shape returns", async () => {
    await openPreview(paragraphs("Intro", "foo"), paragraphs("Intro", "foo", "new"));

    edit(paragraphs("Intro", "foo!"));

    expect(shownTexts()).toEqual(["Intro", "foo!"]);
  });

  it("catches up with a page that loaded during a structural edit when the save lands", async () => {
    await openPreview(paragraphs("Intro", "foo"), paragraphs("Intro", "foo", "new"));

    landSaveOf(paragraphs("Intro", "foo", "new"));
    await renderSavedDocument();
    edit(paragraphs("Intro", "foo", "newer"));

    expect(shownTexts()).toEqual(["Intro", "foo", "newer"]);
  });
});
