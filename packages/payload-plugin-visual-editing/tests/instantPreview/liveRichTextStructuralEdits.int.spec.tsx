import type { ReactNode } from "react";
import type { Root } from "react-dom/client";

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminState, PreviewMessage } from "../../src/admin/instantPreview/previewSession";
import type { LiveRichTextRender } from "../../src/client/instantPreview/unsavedRender/useUnsavedRender";
import type { VeDocument } from "../../src/shared/protocol";

import { createPreviewSession } from "../../src/admin/instantPreview/previewSession";
import { LiveRichText } from "../../src/client/instantPreview/LiveRichText";
import { liveRichTextOf } from "../../src/client/instantPreview/liveRichTextOf";
import { VisualEditingOverlay } from "../../src/client/VisualEditingOverlay";
import { VisualEditingProvider } from "../../src/client/VisualEditingProvider";
import { withVisualEditingPath } from "../../src/client/withVisualEditingPath";
import { VE_RICH_TEXT_RENDERED_TYPE, VE_RICH_TEXT_STRUCTURE_TYPE } from "../../src/shared/protocol";
import { buildEditableSchema } from "../../src/shared/editableSchema/editableSchema";
import { markTextLeaves } from "../../src/server/richText/markTextLeaves";
import { fieldAddressOf } from "../../src/shared/veDocument";

import type { EditorState } from "../support/editorState";

import { paragraphsWith as paragraphs } from "../support/editorState";
import {
  ADMIN_ORIGIN,
  postAllFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
} from "../support/previewWindow";
import { flushMutations } from "../support/time";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const LOCALE = "en";
const FIELD_KEY = "content";
const PAGE: VeDocument = { collectionSlug: "page", docId: "1", kind: "collection" };
const ROUNDS_UNTIL_SETTLED = 6;

const draftReadOf = (state: EditorState) => {
  const marked = structuredClone(state);
  markTextLeaves(marked, fieldAddressOf(PAGE, FIELD_KEY));
  return { ...marked, _meta: { ...PAGE, path: FIELD_KEY, terminal: true } };
};

function Body({ content }: { content: ReturnType<typeof draftReadOf> }) {
  return (
    <div {...withVisualEditingPath(content)}>
      {content.root.children.map((paragraph, index) => (
        <p key={index}>{paragraph.children.map(({ text }) => text)}</p>
      ))}
    </div>
  );
}

describe("unsaved rich text structure from the admin to the page of a live rich text", () => {
  let container: HTMLDivElement;
  let root: Root;
  let postToAdmin: ReturnType<typeof vi.fn>;
  let editor: EditorState;
  let savedDocument: { [FIELD_KEY]: EditorState };
  let heldRenders: (() => void)[] | null;
  let failsToRender: boolean;
  let renderedStates: unknown[];

  const editableSchema = buildEditableSchema([{ name: FIELD_KEY, type: "richText" }]);
  const session = { current: createPreviewSession() };
  let liveRichTextAnnouncement: unknown;

  const adminState = (): AdminState => ({
    document: { ...PAGE, locale: LOCALE },
    editableSchema,
    formState: { [FIELD_KEY]: { value: editor } },
    savedDocument,
  });

  const postFromAdmin = (messages: readonly PreviewMessage[]) =>
    act(() => postAllFromAdmin(messages));

  const answerOf = (announcement: { type?: string }): PreviewMessage[] => {
    if (announcement.type === VE_RICH_TEXT_RENDERED_TYPE) liveRichTextAnnouncement = announcement;
    return session.current.pageAnnounced(announcement);
  };

  const settle = async () => {
    for (let round = 0; round < ROUNDS_UNTIL_SETTLED; round += 1) {
      await act(flushMutations);
      const announcements = postToAdmin.mock.calls.map(([announcement]) => announcement);
      postToAdmin.mockClear();
      for (const announcement of announcements) await postFromAdmin(answerOf(announcement));
    }
  };

  const renderUnsaved: LiveRichTextRender = ({ state }) =>
    new Promise<ReactNode>((resolve, reject) => {
      renderedStates.push(state);
      const finish = () => {
        if (failsToRender) reject(new Error("The action failed"));
        else resolve(<Body content={draftReadOf(state as EditorState)} />);
      };
      if (heldRenders) heldRenders.push(finish);
      else finish();
    });

  const refreshPage = async () => {
    const content = draftReadOf(savedDocument[FIELD_KEY]);
    const live = liveRichTextOf(content);
    if (!live) throw new Error("The saved document is not a live rich text");
    await act(() => {
      root.render(
        <VisualEditingProvider adminOrigin={ADMIN_ORIGIN} available instantPreview>
          <VisualEditingOverlay locale={LOCALE}>
            <LiveRichText {...live} render={renderUnsaved}>
              <Body content={content} />
            </LiveRichText>
          </VisualEditingOverlay>
        </VisualEditingProvider>
      );
    });
    await settle();
  };

  const openPreview = async (saved: EditorState, inEditor = saved) => {
    savedDocument = { [FIELD_KEY]: saved };
    editor = inEditor;
    await postFromAdmin(session.current.formChanged(adminState()));
    await refreshPage();
  };

  const tellPage = async () => {
    await postFromAdmin(session.current.formChanged(adminState()));
    await settle();
  };

  const edit = (next: EditorState) => {
    editor = next;
    return tellPage();
  };

  const landSaveOf = (saved: EditorState) => {
    savedDocument = { [FIELD_KEY]: saved };
    return tellPage();
  };

  const finishNextRender = async () => {
    await act(() => heldRenders?.shift()?.());
    await settle();
  };

  const shownTexts = () =>
    Array.from(container.querySelectorAll("p"), (paragraph) => paragraph.textContent);

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    session.current = createPreviewSession();
    liveRichTextAnnouncement = undefined;
    heldRenders = null;
    failsToRender = false;
    renderedStates = [];
    postToAdmin = vi.fn();
    stubAdminWindow({ postMessage: postToAdmin });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    restorePreviewWindow();
  });

  it("shows a new paragraph and the text typed into it before any save", async () => {
    await openPreview(paragraphs("Intro", "foo"));

    await edit(paragraphs("Intro", "foo", ""));

    expect(shownTexts()).toEqual(["Intro", "foo", ""]);

    await edit(paragraphs("Intro", "foo", "n"));
    await edit(paragraphs("Intro", "foo", "new"));

    expect(shownTexts()).toEqual(["Intro", "foo", "new"]);
  });

  it("sends the editor state when the structure changes and never for typing", async () => {
    await openPreview(paragraphs("Intro", "foo"));

    await edit(paragraphs("Intro", "foo bar"));
    await edit(paragraphs("Intro", "foo bar", "n"));
    await edit(paragraphs("Intro", "foo bar", "new"));
    await edit(paragraphs("Intro", "foo bar!", "newer"));

    expect(renderedStates).toEqual([paragraphs("Intro", "foo bar", "n")]);
  });

  it("keeps the text typed in the unsaved structure when its save is rendered", async () => {
    await openPreview(paragraphs("Intro", "foo"));
    await edit(paragraphs("Intro", "foo", "n"));

    await landSaveOf(paragraphs("Intro", "foo", "n"));
    await edit(paragraphs("Intro", "foo", "new"));

    expect(shownTexts()).toEqual(["Intro", "foo", "new"]);

    await refreshPage();
    await edit(paragraphs("Intro", "foo", "newer"));

    expect(shownTexts()).toEqual(["Intro", "foo", "newer"]);
    expect(renderedStates).toHaveLength(1);
  });

  it("keeps the unsaved structure when the refresh of an older save arrives", async () => {
    await openPreview(paragraphs("Intro", "fo"));
    await edit(paragraphs("Intro", "foo"));
    await edit(paragraphs("Intro", "foo", "new"));

    await landSaveOf(paragraphs("Intro", "foo"));
    await refreshPage();

    expect(shownTexts()).toEqual(["Intro", "foo", "new"]);
  });

  describe("when the save of a structural edit lands after the edit was undone", () => {
    beforeEach(async () => {
      await openPreview(paragraphs("Intro", "foo"));
      await edit(paragraphs("Intro", "foo", "new"));
      await edit(paragraphs("Intro", "foo"));
      await edit(paragraphs("Intro", "foo bar"));
      await landSaveOf(paragraphs("Intro", "foo", "new"));
    });

    it("keeps following the text typed into the structure the editor holds", async () => {
      await refreshPage();

      await edit(paragraphs("Intro", "foo bar baz"));

      expect(shownTexts()).toEqual(["Intro", "foo bar baz"]);
    });

    it("shows the saved render again once the next save is rendered", async () => {
      await refreshPage();
      await edit(paragraphs("Intro", "foo bar baz"));

      await landSaveOf(paragraphs("Intro", "foo bar baz"));
      await refreshPage();
      await edit(paragraphs("Intro", "foo bar baz!"));

      expect(shownTexts()).toEqual(["Intro", "foo bar baz!"]);
    });
  });

  describe("when the undone edit is saved and rendered before the editor's structure is", () => {
    beforeEach(async () => {
      await openPreview(paragraphs("Intro", "foo"));
      await edit(paragraphs("Intro", "foo", "new"));
      await edit(paragraphs("Intro", "foo"));
      await edit(paragraphs("Intro", "foo bar"));
      heldRenders = [];
    });

    it("keeps the saved render it had for the editor's structure until the new one arrives", async () => {
      await landSaveOf(paragraphs("Intro", "foo", "new"));
      await refreshPage();

      expect(shownTexts()).toEqual(["Intro", "foo bar"]);

      await finishNextRender();
      await edit(paragraphs("Intro", "foo bar baz"));

      expect(shownTexts()).toEqual(["Intro", "foo bar baz"]);
    });

    it("shows the saved render when the render of the editor's structure fails", async () => {
      failsToRender = true;
      await landSaveOf(paragraphs("Intro", "foo", "new"));
      await refreshPage();

      await finishNextRender();

      expect(shownTexts()).toEqual(["Intro", "foo", "new"]);
    });
  });

  describe("while the render of an unsaved structure takes longer than the typing", () => {
    beforeEach(async () => {
      await openPreview(paragraphs("Intro", "foo"));
      heldRenders = [];
      await edit(paragraphs("Intro", "foo", ""));
      await edit(paragraphs("Intro", "foo", "n"));
      await edit(paragraphs("Intro", "foo", "ne"));
      await edit(paragraphs("Intro", "foo", "ne", ""));
    });

    it("paints the text typed since into a render that returns late", async () => {
      await finishNextRender();
      await edit(paragraphs("Intro", "foo!", "new", ""));

      await finishNextRender();

      expect(shownTexts()).toEqual(["Intro", "foo!", "new", ""]);
    });
  });

  it("paints the latest text into the render of a structure the editor returned to", async () => {
    await openPreview(paragraphs("Intro", "foo"));
    await edit(paragraphs("Intro", "foo", "one"));
    heldRenders = [];
    await edit(paragraphs("Intro", "foo", "one", "two"));
    await edit(paragraphs("Intro", "foo", "three"));
    await edit(paragraphs("Intro", "foo", "four"));

    expect(shownTexts()).toEqual(["Intro", "foo", "four"]);

    await finishNextRender();
    await finishNextRender();

    expect(shownTexts()).toEqual(["Intro", "foo", "four"]);
  });

  it("paints the latest text at once when the structural edit is undone, without asking the admin", async () => {
    await openPreview(paragraphs("Intro", "foo"));
    await edit(paragraphs("Intro", "foo b"));
    await edit(paragraphs("Intro", "foo b", "new"));
    postToAdmin.mockClear();
    editor = paragraphs("Intro", "foo bar");

    await postFromAdmin(session.current.formChanged(adminState()));
    await act(flushMutations);

    expect(shownTexts()).toEqual(["Intro", "foo bar"]);
    expect(postToAdmin).not.toHaveBeenCalled();
  });

  describe("when the render fails", () => {
    beforeEach(async () => {
      await openPreview(paragraphs("Intro", "foo"));
      failsToRender = true;
      await edit(paragraphs("Intro", "foo", "new"));
    });

    it("shows the structure once it is saved and rendered, and follows typing again", async () => {
      await landSaveOf(paragraphs("Intro", "foo", "new"));
      await refreshPage();
      await edit(paragraphs("Intro", "foo", "newer"));

      expect(shownTexts()).toEqual(["Intro", "foo", "newer"]);
    });
  });

  it("shows the editor's structure to a page that loads during an unsaved structural edit", async () => {
    await openPreview(paragraphs("Intro", "foo"), paragraphs("Intro", "foo", "new"));

    expect(shownTexts()).toEqual(["Intro", "foo", "new"]);

    await edit(paragraphs("Intro", "foo", "newer"));

    expect(shownTexts()).toEqual(["Intro", "foo", "newer"]);
  });

  it("tells a page that announces its live rich text again the structure it was told before", async () => {
    await openPreview(paragraphs("Intro", "foo"));
    await edit(paragraphs("Intro", "foo", "new"));

    const messages = session.current.pageAnnounced(liveRichTextAnnouncement);

    expect(messages).toContainEqual(
      expect.objectContaining({
        state: paragraphs("Intro", "foo", "new"),
        type: VE_RICH_TEXT_STRUCTURE_TYPE,
      })
    );
  });
});
