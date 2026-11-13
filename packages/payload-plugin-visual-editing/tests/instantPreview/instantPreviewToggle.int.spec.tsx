import { act, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { VisualEditingMode } from "../../src/client/visualEditingMode";

import { DATA_VE_TARGET_ATTR } from "../../src/client/overlay/constants";
import { VisualEditingOverlay } from "../../src/client/VisualEditingOverlay";
import { useVisualEditing, VisualEditingProvider } from "../../src/client/VisualEditingProvider";
import { STORAGE_KEY } from "../../src/client/visualEditingMode";
import { VE_FIELD_SNAPSHOT_TYPE, VE_FIELDS_RENDERED_TYPE } from "../../src/shared/protocol";

import { markedText } from "../support/markedData";
import { postFromAdmin, restorePreviewWindow, stubAdminWindow } from "../support/previewWindow";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const SAVED_TITLE = markedText("Hell", {
  path: "title",
  collectionSlug: "page",
  kind: "collection",
  docId: "1",
});

const snapshotWithTypedTitle = {
  type: VE_FIELD_SNAPSHOT_TYPE,
  collectionSlug: "page",
  kind: "collection",
  docId: "1",
  fields: [{ key: "title", saved: "Hell", value: "Hello" }],
};

let container: HTMLDivElement;
let root: Root;
let postToAdmin: ReturnType<typeof vi.fn>;
let setMode: (mode: VisualEditingMode) => void;

function ModeSwitch() {
  ({ setMode } = useVisualEditing());
  return null;
}

const renderPreview = (props: { instantPreview?: boolean }, locale?: string) =>
  act(() => {
    root.render(
      <VisualEditingProvider available {...props}>
        <ModeSwitch />
        <VisualEditingOverlay locale={locale}>
          <h1>{SAVED_TITLE}</h1>
        </VisualEditingOverlay>
      </VisualEditingProvider>
    );
  });

const dispatchFromAdmin = (data: unknown) =>
  postFromAdmin(data, { origin: window.location.origin });

const postInPreview = (data: unknown) => act(() => dispatchFromAdmin(data));

function AdminMessageDuringCommit({ message }: { message?: unknown }) {
  useLayoutEffect(() => {
    if (message) dispatchFromAdmin(message);
  }, [message]);
  return null;
}

const renderLocalizedPreview = (locale: string, messageDuringCommit?: unknown) =>
  act(() => {
    root.render(
      <VisualEditingProvider available instantPreview>
        <VisualEditingOverlay locale={locale}>
          <h1>{SAVED_TITLE}</h1>
        </VisualEditingOverlay>
        <AdminMessageDuringCommit message={messageDuringCommit} />
      </VisualEditingProvider>
    );
  });

const heading = () => container.querySelector("h1") as HTMLHeadingElement;

describe("instant preview and the visual editing toggle", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    postToAdmin = vi.fn();
    stubAdminWindow({ postMessage: postToAdmin });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    localStorage.clear();
    restorePreviewWindow();
  });

  it("patches text while the toggle is off", () => {
    renderPreview({ instantPreview: true });

    postInPreview(snapshotWithTypedTitle);

    expect(postToAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ type: VE_FIELDS_RENDERED_TYPE }),
      window.location.origin
    );
    expect(heading().textContent).toBe("Hello");
    expect(heading().hasAttribute(DATA_VE_TARGET_ATTR)).toBe(false);
  });

  it("leaves the page untouched while the toggle is off and instant preview is not enabled", () => {
    renderPreview({});

    postInPreview(snapshotWithTypedTitle);

    expect(postToAdmin).not.toHaveBeenCalled();
    expect(heading().textContent).toBe(SAVED_TITLE);
  });

  it("keeps the typed text when the toggle is switched on and off again", () => {
    renderPreview({ instantPreview: true });
    postInPreview(snapshotWithTypedTitle);

    act(() => setMode("always"));

    expect(heading().textContent).toBe("Hello");
    expect(heading().getAttribute(DATA_VE_TARGET_ATTR)).toBe("title");
    expect(postToAdmin).toHaveBeenCalledTimes(1);

    act(() => setMode("off"));

    expect(heading().textContent).toBe("Hello");
    expect(heading().hasAttribute(DATA_VE_TARGET_ATTR)).toBe(false);
  });

  it("still draws edit targets without instant preview", () => {
    localStorage.setItem(STORAGE_KEY, "always");
    renderPreview({});

    expect(heading().textContent).toBe("Hell");
    expect(heading().getAttribute(DATA_VE_TARGET_ATTR)).toBe("title");
    expect(postToAdmin).not.toHaveBeenCalled();
  });

  it("puts the markers back when the toggle is switched off without instant preview", () => {
    localStorage.setItem(STORAGE_KEY, "always");
    renderPreview({});

    act(() => setMode("off"));

    expect(heading().textContent).toBe(SAVED_TITLE);
  });

  it("follows the locale the overlay is rendered with later", () => {
    renderPreview({ instantPreview: true }, "en");

    renderPreview({ instantPreview: true }, "de");
    postInPreview({ ...snapshotWithTypedTitle, locale: "en" });

    expect(heading().textContent).toBe("Hell");

    postInPreview({ ...snapshotWithTypedTitle, locale: "de" });

    expect(heading().textContent).toBe("Hello");
    expect(postToAdmin).toHaveBeenCalledTimes(1);
  });

  it("reads the locale of the render that was just committed, before effects have run", () => {
    renderLocalizedPreview("en");

    renderLocalizedPreview("es", { ...snapshotWithTypedTitle, locale: "es" });

    expect(heading().textContent).toBe("Hello");
  });
});
