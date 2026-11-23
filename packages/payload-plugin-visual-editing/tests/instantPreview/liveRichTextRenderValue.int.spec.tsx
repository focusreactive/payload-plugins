import type { ReactNode } from "react";
import type { Root } from "react-dom/client";

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LiveRichTextIdentity } from "../../src/client/instantPreview/liveRichTextOf";
import type { EditorNode } from "../../src/shared/richText/editorNodes";

import { LiveRichText } from "../../src/client/react/LiveRichText";
import { liveRichTextOf } from "../../src/client/instantPreview/liveRichTextOf";
import { optimisticValueOf } from "../../src/client/instantPreview/unsavedRender/optimisticValue";
import {
  SERVER_CHECK_PAUSE_MS,
  STRUCTURE_SETTLE_MS,
} from "../../src/client/instantPreview/unsavedRender/unsavedRender";
import { VisualEditingProvider } from "../../src/client/react/VisualEditingProvider";
import {
  VE_DOCUMENT_SAVED_TYPE,
  VE_FIELD_PATCH_TYPE,
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
import { stripMarkers } from "../../src/stripMarkers";
import { keyedFieldAddressOf } from "../../src/shared/veDocument";

import { editorState, paragraph, textNode } from "../support/editorState";
import {
  ADMIN_ORIGIN,
  postFromAdmin as dispatchFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
} from "../support/previewWindow";
import { flushMutations, waitFor } from "../support/time";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const PAYLOAD_API = "https://cms.example/api";
const PAGE = { collectionSlug: "pages", docId: "1", kind: "collection" } as const;
const BODY = { ...PAGE, key: "body" };
const FIELD_ADDRESS = keyedFieldAddressOf(BODY);
const META = { ...PAGE, path: "body", terminal: true };
const FIELD = { fieldAddress: FIELD_ADDRESS, meta: META };
const SAVED_CALLOUT = { blockType: "callout", id: "callout-saved", text: "Saved callout" };

type Asked = { format: string; grant: string; request: { state?: unknown } };

const callout = (fields: object) => ({ fields, format: "", type: "block", version: 2 });

const draftReadOf = (state: object) => {
  const value = structuredClone(state);
  markTextLeaves(value, FIELD_ADDRESS);
  return { ...value, [META_KEY]: META };
};

const textOf = (node: EditorNode): string =>
  isTextLeaf(node) ? stripMarkers(node.text) : childrenOf(node).map(textOf).join("");

const blockTextOf = (node: EditorNode) => (node.fields as { text?: string }).text ?? "";

function SiteBody({ value }: { value: unknown }): ReactNode {
  return childrenOf(rootOf(value) ?? {}).map((node, index) =>
    node.type === "block" ? (
      <aside key={index}>{blockTextOf(node)}</aside>
    ) : (
      <p key={index}>{textOf(node)}</p>
    )
  );
}

function Broken(): ReactNode {
  throw new Error("The renderer failed");
}

const structureOf = (state: object) => ({
  ...BODY,
  locale: "en",
  shape: shapeOf(state, FIELD_ADDRESS),
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

const withNewParagraph = () =>
  editorState(paragraph(textNode("Hello")), paragraph(textNode("New")));

describe("LiveRichText with a renderer of the value on the page", () => {
  let container: HTMLDivElement;
  let root: Root;
  let saved: ReturnType<typeof draftReadOf>;
  let identity: LiveRichTextIdentity;
  let asked: Asked[];
  let answerOf: (asked: Asked) => unknown;
  let action: ReturnType<typeof vi.fn<(request: unknown) => Promise<ReactNode>>>;
  let renderValue: ReturnType<typeof vi.fn<(value: unknown) => ReactNode>>;

  const askedForState = () => asked.filter(({ request }) => request.state !== undefined);
  const askedForBase = () => asked.filter(({ request }) => request.state === undefined);

  const serverAnswerOf = ({ request }: Asked) =>
    request.state === undefined ? saved : optimisticValueOf(request.state, FIELD, saved);

  const showSaved = (state: object) => {
    saved = draftReadOf(state);
    identity = liveRichTextOf(saved)!;
  };

  const renderPage = ({
    payloadApi,
    withRenderValue = true,
  }: { payloadApi?: string; withRenderValue?: boolean } = {}) =>
    act(() => {
      root.render(
        <VisualEditingProvider
          adminOrigin={ADMIN_ORIGIN}
          available
          instantPreview
          payloadApi={payloadApi}
        >
          <LiveRichText
            {...identity}
            action={action}
            renderValue={withRenderValue ? renderValue : undefined}
          >
            <SiteBody value={saved} />
          </LiveRichText>
        </VisualEditingProvider>
      );
    });

  const tellFromAdmin = (data: unknown) => act(() => dispatchFromAdmin(data));

  const waitInAct = (ms: number) =>
    act(async () => {
      await waitFor(ms);
      await flushMutations();
    });

  const shownTexts = () => [...container.children].map((child) => child.textContent);

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    stubAdminWindow({ postMessage: vi.fn() });
    asked = [];
    answerOf = serverAnswerOf;
    action = vi.fn(async () => <p>From the action</p>);
    renderValue = vi.fn((value: unknown) => <SiteBody value={value} />);
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      const sent = JSON.parse(init.body as string) as Asked;
      asked.push(sent);
      return Response.json({ value: answerOf(sent) });
    });
    showSaved(editorState(paragraph(textNode("Hello"))));
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    restorePreviewWindow();
  });

  it("waits for the action without a renderer of the value, as before", async () => {
    await renderPage({ withRenderValue: false });

    await tellFromAdmin(structureOf(withNewParagraph()));

    expect(shownTexts()).toEqual(["Hello"]);
    await waitInAct(STRUCTURE_SETTLE_MS);
    expect(action).toHaveBeenCalledTimes(1);
    expect(shownTexts()).toEqual(["From the action"]);
  });

  describe("after a save, when the page does not render again", () => {
    const withNew = () => editorState(paragraph(textNode("Hi")), paragraph(textNode("New")));

    beforeEach(async () => {
      action.mockResolvedValue(null);
      await renderPage();
      await tellFromAdmin(structureOf(withNew()));
      await tellFromAdmin({ type: VE_DOCUMENT_SAVED_TYPE });
    });

    it("shows what was saved when the editor returns to the saved structure", async () => {
      await tellFromAdmin(
        structureOf(editorState(paragraph(textNode("Hi")), paragraph(textNode("New")), paragraph()))
      );

      await tellFromAdmin({ ...structureOf(withNew()), state: null });

      expect(shownTexts()).toEqual(["Hi", "New"]);
    });

    it("renders the structure the page loaded with from what the editor holds", async () => {
      await tellFromAdmin(structureOf(editorState(paragraph(textNode("Hi")))));

      expect(shownTexts()).toEqual(["Hi"]);
    });
  });

  describe("and an action", () => {
    it("shows the structure as it arrives, before the action is called", async () => {
      await renderPage();

      await tellFromAdmin(structureOf(withNewParagraph()));

      expect(shownTexts()).toEqual(["Hello", "New"]);
      expect(action).not.toHaveBeenCalled();
    });

    it("calls the action once per pause and shows what it returns in place of the render on the page", async () => {
      await renderPage();

      await tellFromAdmin(structureOf(editorState(paragraph(textNode("Hello")), paragraph())));
      await tellFromAdmin(structureOf(withNewParagraph()));
      await waitInAct(SERVER_CHECK_PAUSE_MS - 100);

      expect(action).not.toHaveBeenCalled();
      expect(shownTexts()).toEqual(["Hello", "New"]);

      await waitInAct(100);

      expect(action.mock.calls).toEqual([
        [{ field: BODY, locale: "en", state: withNewParagraph() }],
      ]);
      expect(shownTexts()).toEqual(["From the action"]);
    });

    it("keeps the render on the page when the action returns nothing", async () => {
      action.mockResolvedValue(null);
      await renderPage();

      await tellFromAdmin(structureOf(withNewParagraph()));
      await waitInAct(SERVER_CHECK_PAUSE_MS);

      expect(action).toHaveBeenCalled();
      expect(shownTexts()).toEqual(["Hello", "New"]);
    });

    it("waits for the action when the renderer throws", async () => {
      renderValue.mockImplementation(() => {
        throw new Error("Not in a browser");
      });
      await renderPage();

      await tellFromAdmin(structureOf(withNewParagraph()));

      expect(shownTexts()).toEqual(["Hello"]);
      await waitInAct(STRUCTURE_SETTLE_MS);
      expect(shownTexts()).toEqual(["From the action"]);
    });

    it("shows the saved render when the rendered elements throw, then what the action returns", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      renderValue.mockImplementation(() => <Broken />);
      await renderPage();

      await tellFromAdmin(structureOf(withNewParagraph()));

      expect(shownTexts()).toEqual(["Hello"]);
      await waitInAct(SERVER_CHECK_PAUSE_MS);
      expect(shownTexts()).toEqual(["From the action"]);
    });

    it("waits for the action for a field with references, which has no base without Payload", async () => {
      showSaved(editorState(paragraph(textNode("Hello")), callout(SAVED_CALLOUT)));
      await renderPage();

      await tellFromAdmin(
        structureOf(
          withoutBlockFields(
            editorState(
              paragraph(textNode("Hello")),
              callout(SAVED_CALLOUT),
              paragraph(textNode("New"))
            )
          )
        )
      );

      expect(shownTexts()).toEqual(["Hello", "Saved callout"]);
      await waitInAct(STRUCTURE_SETTLE_MS);
      expect(shownTexts()).toEqual(["From the action"]);
    });
  });

  describe("and the API of Payload", () => {
    const renderWithPayload = async () => {
      await renderPage({ payloadApi: PAYLOAD_API });
      await tellFromAdmin(grantMessage());
    };

    it("asks Payload once per pause, renders its answer on the page and leaves the action alone", async () => {
      await renderWithPayload();

      await tellFromAdmin(structureOf(editorState(paragraph(textNode("Hello")), paragraph())));
      await tellFromAdmin(structureOf(withNewParagraph()));

      expect(shownTexts()).toEqual(["Hello", "New"]);
      await waitInAct(SERVER_CHECK_PAUSE_MS);

      expect(askedForState().map(({ request }) => request.state)).toEqual([withNewParagraph()]);
      expect(action).not.toHaveBeenCalled();
      expect(shownTexts()).toEqual(["Hello", "New"]);
    });

    it("keeps the elements of the render on the page when Payload answers the same value", async () => {
      await renderWithPayload();
      await tellFromAdmin(structureOf(withNewParagraph()));
      const shown = [...container.children];

      await waitInAct(SERVER_CHECK_PAUSE_MS);

      expect(askedForState()).toHaveLength(1);
      expect([...container.children]).toEqual(shown);
      expect(container.children[1]).toBe(shown[1]);
    });

    it("shows the answer of Payload when it differs", async () => {
      answerOf = (sent) => ({
        ...(serverAnswerOf(sent) as object),
        root: { children: [paragraph(textNode("From Payload"))], type: "root" },
      });
      await renderWithPayload();

      await tellFromAdmin(structureOf(withNewParagraph()));
      await waitInAct(SERVER_CHECK_PAUSE_MS);

      expect(shownTexts()).toEqual(["From Payload"]);
    });

    it("calls the action while it holds no grant", async () => {
      await renderPage({ payloadApi: PAYLOAD_API });

      await tellFromAdmin(structureOf(withNewParagraph()));
      await waitInAct(SERVER_CHECK_PAUSE_MS);

      expect(asked).toEqual([]);
      expect(shownTexts()).toEqual(["From the action"]);
    });

    describe("for a field with a block", () => {
      const withBlockAndNewParagraph = () =>
        withoutBlockFields(
          editorState(
            paragraph(textNode("Hello")),
            callout(SAVED_CALLOUT),
            paragraph(textNode("New"))
          )
        );

      beforeEach(() => {
        showSaved(editorState(paragraph(textNode("Hello")), callout(SAVED_CALLOUT)));
      });

      it("renders on the page with the fields of the block from the saved value Payload gives once typing starts", async () => {
        await renderWithPayload();
        await tellFromAdmin(firstPatch());
        await waitInAct(0);

        await tellFromAdmin(structureOf(withBlockAndNewParagraph()));

        expect(askedForBase()).toHaveLength(1);
        expect(shownTexts()).toEqual(["Hello", "Saved callout", "New"]);
      });

      it("renders on the page once the saved value it asked for arrives, before Payload answers", async () => {
        await renderWithPayload();

        await tellFromAdmin(structureOf(withBlockAndNewParagraph()));
        await waitInAct(0);

        expect(askedForBase()).toHaveLength(1);
        expect(askedForState()).toEqual([]);
        expect(shownTexts()).toEqual(["Hello", "Saved callout", "New"]);
      });
    });
  });
});
