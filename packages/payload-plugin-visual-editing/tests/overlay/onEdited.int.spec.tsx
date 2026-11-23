import type { Root } from "react-dom/client";

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EDIT_SAVE_PAUSE_MS } from "../../src/client/inlineEditing/editTransport";
import { VisualEditingOverlay } from "../../src/client/react/VisualEditingOverlay";
import { VisualEditingProvider } from "../../src/client/react/VisualEditingProvider";
import { STORAGE_KEY } from "../../src/client/visualEditingMode";
import { mountVisualEditing } from "../../src/dom";

import { markedText } from "../support/markedData";
import { click } from "../support/overlay";

const PAYLOAD_API = "https://cms.example.com/api";

const TITLE = markedText("Hello", {
  collectionSlug: "page",
  docId: "1",
  kind: "collection",
  path: "title",
});

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const typeInto = (element: HTMLElement, typed: string) => {
  (element.firstChild as Text).data = typed;
  element.dispatchEvent(new Event("input", { bubbles: true }));
};

const editTitle = async () => {
  const heading = document.querySelector("h1") as HTMLElement;
  await act(() => vi.advanceTimersByTimeAsync(0));
  click(heading);
  typeInto(heading, "Hello world");
  await act(() => vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS));
};

describe("onEdited", () => {
  let container: HTMLDivElement;
  let isSaved: boolean;

  beforeEach(() => {
    vi.useFakeTimers();
    isSaved = true;
    localStorage.setItem(STORAGE_KEY, "hover");
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({ json: () => Promise.resolve({ saved: isSaved }), ok: true } as Response)
      )
    );
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe("of the React provider", () => {
    let root: Root;

    const render = (onEdited: () => void) =>
      act(() =>
        root.render(
          <VisualEditingProvider
            available
            inlineEditing
            onEdited={onEdited}
            payloadApi={PAYLOAD_API}
          >
            <VisualEditingOverlay locale="en">
              <h1>{TITLE}</h1>
            </VisualEditingOverlay>
          </VisualEditingProvider>
        )
      );

    beforeEach(() => {
      root = createRoot(container);
    });

    afterEach(() => {
      act(() => root.unmount());
    });

    it("is the callback of the latest render, called once an edit of the page is saved", async () => {
      const first = vi.fn();
      const latest = vi.fn();
      render(first);
      render(latest);

      await editTitle();

      expect(first).not.toHaveBeenCalled();
      expect(latest).toHaveBeenCalledTimes(1);
    });

    it("is not called for an edit the endpoint refused", async () => {
      const onEdited = vi.fn();
      isSaved = false;
      render(onEdited);

      await editTitle();

      expect(onEdited).not.toHaveBeenCalled();
    });
  });

  describe("of a page without React", () => {
    it("is called once an edit of the page is saved", async () => {
      const onEdited = vi.fn();
      const heading = document.createElement("h1");
      heading.textContent = TITLE;
      container.append(heading);
      const mounted = mountVisualEditing({
        available: true,
        inlineEditing: true,
        locale: "en",
        onEdited,
        payloadApi: PAYLOAD_API,
        root: container,
        toggle: false,
      });

      await editTitle();
      mounted.destroy();

      expect(onEdited).toHaveBeenCalledTimes(1);
    });
  });
});
