import type { ReactNode } from "react";
import type { Root } from "react-dom/client";

import { act, startTransition, use, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LiveRichTextRender } from "../../src/client/instantPreview/unsavedRender/useUnsavedRender";
import type { LiveRichTextField, LiveRichTextRequest } from "../../src/shared/protocol";

import { LiveRichText } from "../../src/client/instantPreview/LiveRichText";
import { createSavedRichTextShapes } from "../../src/client/instantPreview/unsavedRender/savedShapes";
import { COMMIT_WAIT_MS } from "../../src/client/instantPreview/unsavedRender/unsavedRender";
import { SavedRichTextShapesContext } from "../../src/client/overlayContext";
import { VisualEditingOverlay } from "../../src/client/VisualEditingOverlay";
import { VisualEditingProvider } from "../../src/client/VisualEditingProvider";
import {
  VE_ANNOUNCE_REQUEST_TYPE,
  VE_RICH_TEXT_RENDERED_TYPE,
  VE_RICH_TEXT_STRUCTURE_TYPE,
} from "../../src/shared/protocol";
import { keyedFieldAddressOf } from "../../src/shared/veDocument";

import type { AdminMessageOptions } from "../support/previewWindow";

import {
  ADMIN_ORIGIN,
  postFromAdmin as dispatchFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
} from "../support/previewWindow";
import { flushMutations } from "../support/time";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const PAGE = { collectionSlug: "page", docId: "1", kind: "collection" } as const;
const BODY: LiveRichTextField = { ...PAGE, key: "body" };
const INTRO: LiveRichTextField = { ...PAGE, key: "intro" };
const SAVED_SHAPE = "saved-shape";
const SAVED_RENDER = "Saved render";

type PendingRender = {
  finishWith: (node: ReactNode) => Promise<void>;
  request: LiveRichTextRequest;
  resolve: (node: ReactNode) => void;
  signal: AbortSignal;
};

type PageProps = {
  available?: boolean;
  instantPreview?: boolean;
  locale?: string;
};

const stateOf = (text: string) => ({ root: { children: [{ text, type: "text" }], type: "root" } });

const structureOf = (shape: string, text: string | null, overrides: object = {}) => ({
  ...PAGE,
  key: BODY.key,
  locale: "en",
  shape,
  state: text === null ? null : stateOf(text),
  type: VE_RICH_TEXT_STRUCTURE_TYPE,
  ...overrides,
});

function Broken(): ReactNode {
  throw new Error("The renderer failed");
}

const NEVER = new Promise<ReactNode>(() => undefined);

function NeverReady(): ReactNode {
  return use(NEVER);
}

describe("LiveRichText", () => {
  let container: HTMLDivElement;
  let root: Root;
  let postToAdmin: ReturnType<typeof vi.fn>;
  let renders: PendingRender[];
  let render: LiveRichTextRender;

  const renderLive = (
    children: ReactNode,
    { available = true, instantPreview = true }: PageProps = {}
  ) =>
    act(() => {
      root.render(
        <VisualEditingProvider
          adminOrigin={ADMIN_ORIGIN}
          available={available}
          instantPreview={instantPreview}
        >
          {children}
        </VisualEditingProvider>
      );
    });

  const liveBody = (savedText = SAVED_RENDER, field = BODY) => (
    <LiveRichText field={field} render={render} shape={SAVED_SHAPE}>
      <p>{savedText}</p>
    </LiveRichText>
  );

  const renderPage = ({ locale = "en", ...props }: PageProps = {}) =>
    renderLive(<VisualEditingOverlay locale={locale}>{liveBody()}</VisualEditingOverlay>, props);

  const postFromAdmin = (data: unknown, options?: AdminMessageOptions) =>
    act(() => dispatchFromAdmin(data, options));

  const liveRichTextAnnouncements = () =>
    postToAdmin.mock.calls
      .map(([message]) => message)
      .filter(({ type }) => type === VE_RICH_TEXT_RENDERED_TYPE);

  const shownText = () => container.textContent;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    postToAdmin = vi.fn();
    stubAdminWindow({ postMessage: postToAdmin });
    renders = [];
    render = (request, signal) =>
      new Promise((resolve) => {
        renders.push({
          finishWith: async (node) => {
            await act(() => resolve(node));
          },
          request,
          resolve,
          signal,
        });
      });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
    restorePreviewWindow();
  });

  it("names the shape of its saved render to the overlay while it shows it", async () => {
    const savedShapes = createSavedRichTextShapes();
    const renderInOverlay = (shape: string) =>
      renderLive(
        <SavedRichTextShapesContext.Provider value={savedShapes}>
          <VisualEditingOverlay locale="en">
            <LiveRichText field={BODY} render={render} shape={shape}>
              <p>{SAVED_RENDER}</p>
            </LiveRichText>
          </VisualEditingOverlay>
        </SavedRichTextShapesContext.Provider>
      );
    const namesShape = (shape: string) => savedShapes.keeps(keyedFieldAddressOf(BODY), shape);

    await renderInOverlay(SAVED_SHAPE);
    expect(namesShape(SAVED_SHAPE)).toBe(true);

    await renderInOverlay("saved-later");
    expect([namesShape(SAVED_SHAPE), namesShape("saved-later")]).toEqual([false, true]);

    await act(() => root.render(null));
    expect(namesShape("saved-later")).toBe(false);
  });

  it("announces its field to the admin, and again when the admin asks", async () => {
    await renderPage();
    const announcement = {
      locale: "en",
      pageId: expect.any(String),
      rendered: [{ ...PAGE, keys: [BODY.key] }],
      type: VE_RICH_TEXT_RENDERED_TYPE,
    };

    expect(liveRichTextAnnouncements()).toEqual([announcement]);
    expect(postToAdmin).toHaveBeenCalledWith(expect.anything(), ADMIN_ORIGIN);

    await postFromAdmin({ type: VE_ANNOUNCE_REQUEST_TYPE });

    expect(liveRichTextAnnouncements()).toEqual([announcement, announcement]);
  });

  it("announces the fields of one commit in one message", async () => {
    await renderLive([liveBody("Body"), liveBody("Intro", INTRO)]);

    expect(liveRichTextAnnouncements()).toEqual([
      expect.objectContaining({ rendered: [{ ...PAGE, keys: [BODY.key, INTRO.key] }] }),
    ]);
  });

  it("calls an action with the request and nothing else", async () => {
    const action = vi.fn(async () => <p>Rendered by the action</p>);
    await renderLive(
      <LiveRichText action={action} field={BODY} shape={SAVED_SHAPE}>
        <p>{SAVED_RENDER}</p>
      </LiveRichText>
    );

    await postFromAdmin(structureOf("unsaved", "Typed"));

    expect(action.mock.calls).toEqual([[{ field: BODY, locale: "en", state: stateOf("Typed") }]]);
    expect(shownText()).toBe("Rendered by the action");
  });

  it("renders the unsaved state of its field in the locale of the admin, in the elements on screen", async () => {
    await renderPage();
    const paragraph = container.querySelector("p");
    await postFromAdmin(structureOf("unsaved", "Typed"));
    await renders[0]?.finishWith(<p>Unsaved render</p>);

    expect(renders.map(({ request }) => request)).toEqual([
      { field: BODY, locale: "en", state: stateOf("Typed") },
    ]);
    expect(shownText()).toBe("Unsaved render");

    await postFromAdmin(structureOf(SAVED_SHAPE, null));

    expect(shownText()).toBe(SAVED_RENDER);
    expect(container.querySelector("p")).toBe(paragraph);
  });

  describe("when the page changes its locale in place", () => {
    beforeEach(async () => {
      await renderPage();
      await postFromAdmin(structureOf("unsaved", "Typed"));
    });

    it("shows the saved render in place of an unsaved one", async () => {
      await renders[0]?.finishWith(<p>Unsaved render</p>);
      await renderPage({ locale: "de" });

      expect(shownText()).toBe(SAVED_RENDER);
    });

    it("cancels a render on its way and does not show it", async () => {
      await renderPage({ locale: "de" });
      await renders[0]?.finishWith(<p>Unsaved render</p>);

      expect(renders[0]?.signal.aborted).toBe(true);
      expect(shownText()).toBe(SAVED_RENDER);
    });
  });

  describe("while a transition of the page stays pending until the render returns", () => {
    let holdTransitions: (call: Promise<unknown>) => void;

    function ActionRouter({ children }: { children: ReactNode }) {
      const [callInFlight, setCallInFlight] = useState<Promise<unknown> | null>(null);
      holdTransitions = (call) => startTransition(() => setCallInFlight(call));
      if (callInFlight) use(callInFlight);
      return children;
    }

    const renderThroughRouter: LiveRichTextRender = (request, signal) => {
      const call = render(request, signal);
      holdTransitions(call.catch(() => null));
      return call;
    };

    beforeEach(async () => {
      await renderLive(
        <ActionRouter>
          <LiveRichText field={BODY} render={renderThroughRouter} shape={SAVED_SHAPE}>
            <p>{SAVED_RENDER}</p>
          </LiveRichText>
        </ActionRouter>
      );
      await postFromAdmin(structureOf("first", "One"));
      await postFromAdmin(structureOf("second", "Two"));
    });

    it("paints a render before the next call starts, also when a state arrives with it", async () => {
      await act(async () => {
        renders[0]?.resolve(<p>First render</p>);
        await flushMutations();
        dispatchFromAdmin(structureOf("third", "Three"));
      });

      expect(shownText()).toBe("First render");
      expect(renders.map(({ request }) => request.state)).toEqual([
        stateOf("One"),
        stateOf("Three"),
      ]);
    });

    it("shows each render when it returns, before the next call starts", async () => {
      await renders[0]?.finishWith(<p>First render</p>);

      expect(shownText()).toBe("First render");
      expect(renders).toHaveLength(2);

      await renders[1]?.finishWith(<p>Second render</p>);

      expect(shownText()).toBe("Second render");
    });
  });

  describe("when the unsaved render cannot be shown", () => {
    beforeEach(async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      await renderPage();
      await postFromAdmin(structureOf("first", "One"));
    });

    it("shows the saved render when the unsaved one throws, and the next unsaved one", async () => {
      await renders[0]?.finishWith(<Broken />);

      expect(shownText()).toBe(SAVED_RENDER);

      await postFromAdmin(structureOf("second", "Two"));
      await renders[1]?.finishWith(<p>Second render</p>);

      expect(shownText()).toBe("Second render");
    });

    it("shows the saved render while the unsaved one is not ready, and the next unsaved one", async () => {
      vi.useFakeTimers();
      await renders[0]?.finishWith(<NeverReady />);

      expect(shownText()).toBe(SAVED_RENDER);

      await postFromAdmin(structureOf("second", "Two"));
      await act(() => vi.advanceTimersByTimeAsync(COMMIT_WAIT_MS));
      await renders[1]?.finishWith(<p>Second render</p>);

      expect(shownText()).toBe("Second render");
    });

    it("shows a render of a structure the editor left while its own one never got ready", async () => {
      vi.useFakeTimers();
      await renders[0]?.finishWith(<NeverReady />);
      await postFromAdmin(structureOf("second", "Two"));
      await act(() => vi.advanceTimersByTimeAsync(COMMIT_WAIT_MS));
      await postFromAdmin(structureOf("first", "One again"));
      await renders[1]?.finishWith(<p>Second render</p>);

      expect(shownText()).toBe("Second render");

      await renders[2]?.finishWith(<p>First render again</p>);

      expect(shownText()).toBe("First render again");
    });
  });

  it("keeps the editor's render over one of a structure it left after the preview was off", async () => {
    await renderPage();
    await postFromAdmin(structureOf("unsaved", "Typed"));
    await renders[0]?.finishWith(<p>Unsaved render</p>);
    await renderPage({ instantPreview: false });
    await renderPage();
    await postFromAdmin(structureOf("left", "Left"));
    await postFromAdmin(structureOf("unsaved", "Typed again"));
    await renders[1]?.finishWith(<p>Left render</p>);

    expect(shownText()).toBe("Unsaved render");
  });

  it("cancels its call when the component is gone and ignores what it returns", async () => {
    const reportError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await renderPage();
    await postFromAdmin(structureOf("unsaved", "Typed"));

    act(() => root.unmount());
    await renders[0]?.finishWith(<p>Unsaved render</p>);

    expect(renders[0]?.signal.aborted).toBe(true);
    expect(reportError).not.toHaveBeenCalled();
    root = createRoot(container);
  });

  it("updates every place a field is rendered in", async () => {
    await renderLive([liveBody("Saved once"), liveBody("Saved twice")]);

    await postFromAdmin(structureOf("unsaved", "Typed"));
    await renders[0]?.finishWith(<p>Unsaved once</p>);
    await renders[1]?.finishWith(<p>Unsaved twice</p>);

    expect(shownText()).toBe("Unsaved onceUnsaved twice");
  });

  it("renders each field from its own state", async () => {
    await renderLive([liveBody("Saved body"), liveBody("Saved intro", INTRO)]);

    await postFromAdmin(structureOf("unsaved", "Body typed"));
    await postFromAdmin(structureOf("unsaved", "Intro typed", { key: INTRO.key }));
    await renders[1]?.finishWith(<p>Unsaved intro</p>);

    expect(renders.map(({ request }) => request.field.key)).toEqual([BODY.key, INTRO.key]);
    expect(shownText()).toBe("Saved bodyUnsaved intro");
  });

  describe("ignores a structure", () => {
    it.each([
      ["from another origin", structureOf("unsaved", "Typed"), { origin: "https://evil.example" }],
      ["from another window", structureOf("unsaved", "Typed"), { source: {} }],
      ["of another field", structureOf("unsaved", "Typed", { key: INTRO.key }), {}],
      ["of another document", structureOf("unsaved", "Typed", { docId: "2" }), {}],
      ["of another locale", structureOf("unsaved", "Typed", { locale: "de" }), {}],
      ["without a shape", structureOf("unsaved", "Typed", { shape: undefined }), {}],
      ["whose state is no object", structureOf("unsaved", "Typed", { state: "Typed" }), {}],
    ])("%s", async (_name, message, sender) => {
      await renderPage();

      await postFromAdmin(message, sender);

      expect(renders).toHaveLength(0);
      expect(shownText()).toBe(SAVED_RENDER);
    });
  });

  describe("stays out of the way", () => {
    it.each([
      ["while instant preview is off", { instantPreview: false }],
      ["while visual editing is not available", { available: false }],
    ])("%s", async (_name, props) => {
      await renderPage(props);
      await postFromAdmin(structureOf("unsaved", "Typed"));

      expect(liveRichTextAnnouncements()).toHaveLength(0);
      expect(renders).toHaveLength(0);
      expect(shownText()).toBe(SAVED_RENDER);
    });
  });
});
