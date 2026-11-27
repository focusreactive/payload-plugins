import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Overlay } from "../../src/client/createOverlay";

import { createOverlay } from "../../src/client/createOverlay";

import { markedText } from "../support/markedData";
import { click, overlayCtx } from "../support/overlay";
import { restorePreviewWindow } from "../support/previewWindow";
import { flushMutations } from "../support/time";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const stega = (visible: string) =>
  markedText(visible, { collectionSlug: "page", docId: "1", kind: "collection", path: "title" });

type HeadingProps = { title: string; count: number; badge: string; withIcon: boolean };

function Heading({ badge, count, title, withIcon }: HeadingProps) {
  return (
    <h2>
      {withIcon && <i>★</i>}
      {title}
      <small key={badge}>{count}</small>
    </h2>
  );
}

describe("text edited beside elements that React renders", () => {
  let main: HTMLElement;
  let root: Root;
  let overlay: Overlay;

  const render = (props: HeadingProps) =>
    act(async () => {
      root.render(<Heading {...props} />);
      await flushMutations();
    });

  const heading = () => main.querySelector("h2") as HTMLElement;

  const titleText = () =>
    Array.from(heading().childNodes).find((node): node is Text => node instanceof Text) as Text;

  beforeEach(async () => {
    document.body.innerHTML = "";
    main = document.createElement("main");
    document.body.append(main);
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({ json: () => Promise.resolve({ saved: true }), ok: true } as Response)
      )
    );
    root = createRoot(main);
    await render({ badge: "a", count: 1, title: stega("Title"), withIcon: false });
    overlay = createOverlay(main, () =>
      overlayCtx({
        inlineEditing: true,
        instantPreview: true,
        mode: "hover",
        payloadApi: "https://cms.example.com/api",
      })
    );
  });

  afterEach(() => {
    overlay.dispose();
    act(() => root.unmount());
    restorePreviewWindow();
    vi.unstubAllGlobals();
    document.getSelection()?.removeAllRanges();
  });

  it("lets React render the elements beside the text while it is edited, and after", async () => {
    click(heading());
    const edited = titleText();

    await render({ badge: "b", count: 2, title: stega("Title"), withIcon: true });
    edited.data = "Title edited";
    heading().dispatchEvent(new Event("input", { bubbles: true }));
    heading().dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" })
    );
    await flushMutations();

    expect(heading().hasAttribute("contenteditable")).toBe(false);
    expect(titleText()).toBe(edited);
    expect(heading().textContent).toBe("★Title edited2");

    await render({ badge: "c", count: 3, title: stega("Title saved"), withIcon: false });

    expect(heading().textContent).toBe("Title saved3");
    expect(heading().querySelectorAll("small")).toHaveLength(1);
  });

  it("keeps a space the editor typed at the end of the text when React renders the text again", async () => {
    click(heading());
    titleText().data = "Title ";
    heading().dispatchEvent(new Event("input", { bubbles: true }));

    await render({ badge: "b", count: 2, title: stega("Title "), withIcon: false });

    expect(titleText().data).toBe("Title ");
  });
});
