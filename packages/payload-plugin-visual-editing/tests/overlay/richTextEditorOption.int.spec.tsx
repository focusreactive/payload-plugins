import type { Root } from "react-dom/client";

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VisualEditingOverlay } from "../../src/client/react/VisualEditingOverlay";
import { VisualEditingProvider } from "../../src/client/react/VisualEditingProvider";
import { STORAGE_KEY } from "../../src/client/visualEditingMode";
import { identityAttrsOf } from "../../src/client/withVisualEditingPath";
import { mountVisualEditing } from "../../src/dom";

import { markedTextNode } from "../support/markedData";
import { click } from "../support/overlay";

const PAYLOAD_API = "https://cms.example.com/api";

const PAGE = { collectionSlug: "page", docId: "1", kind: "collection" } as const;

const BODY = markedTextNode("Hello", "0.0", "shape");

const STATE = {
  root: { children: [], direction: null, format: "", indent: 0, type: "root", version: 1 },
};

const FORMATS = { hasLinks: false, hasQuotes: false, headings: [], lists: [], textFormats: 0 };

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("the rich text editor a site hands the page", () => {
  let container: HTMLDivElement;
  let startEditSession: ReturnType<typeof vi.fn>;
  let richTextEditor: ReturnType<typeof vi.fn>;

  const clickRichText = async () => {
    await act(() => vi.advanceTimersByTimeAsync(0));
    click(document.querySelector("article") as HTMLElement);
    await act(() => vi.advanceTimersByTimeAsync(0));
  };

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.setItem(STORAGE_KEY, "hover");
    startEditSession = vi.fn(() => ({ end: () => undefined }));
    richTextEditor = vi.fn(() => Promise.resolve({ richTextEditor: { startEditSession } }));
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({ formats: FORMATS, value: STATE }),
          ok: true,
        } as Response)
      )
    );
    vi.spyOn(window, "open").mockImplementation(() => null);
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("through the React provider", () => {
    let root: Root;

    const render = (loader?: () => Promise<unknown>) =>
      act(() =>
        root.render(
          <VisualEditingProvider
            available
            inlineEditing
            payloadApi={PAYLOAD_API}
            richTextEditor={loader as never}
          >
            <VisualEditingOverlay locale="en">
              <article {...identityAttrsOf({ ...PAGE, path: "body" })}>
                <p>{BODY}</p>
              </article>
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

    it("is loaded on the first click into rich text and starts the edit", async () => {
      render(richTextEditor);
      expect(richTextEditor).not.toHaveBeenCalled();

      await clickRichText();

      expect(richTextEditor).toHaveBeenCalledTimes(1);
      expect(startEditSession).toHaveBeenCalledWith(
        expect.objectContaining({ formats: FORMATS, state: STATE })
      );
      expect(window.open).not.toHaveBeenCalled();
    });

    it("is not asked for in Off mode, where a click does what it does on the site", async () => {
      localStorage.setItem(STORAGE_KEY, "off");
      render(richTextEditor);

      await clickRichText();

      expect(richTextEditor).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
      expect(window.open).not.toHaveBeenCalled();
    });

    it("is not asked for without the option: the click opens the field in the admin", async () => {
      render();

      await clickRichText();

      expect(fetch).not.toHaveBeenCalled();
      expect(window.open).toHaveBeenCalledTimes(1);
    });
  });

  describe("through a page without React", () => {
    it("is loaded on the first click into rich text and starts the edit", async () => {
      const article = document.createElement("article");
      for (const [name, value] of Object.entries(identityAttrsOf({ ...PAGE, path: "body" }))) {
        article.setAttribute(name, value);
      }
      article.append(Object.assign(document.createElement("p"), { textContent: BODY }));
      container.append(article);
      const mounted = mountVisualEditing({
        available: true,
        inlineEditing: true,
        locale: "en",
        payloadApi: PAYLOAD_API,
        richTextEditor,
        root: container,
        toggle: false,
      });

      await clickRichText();
      mounted.destroy();

      expect(startEditSession).toHaveBeenCalledTimes(1);
    });
  });
});
