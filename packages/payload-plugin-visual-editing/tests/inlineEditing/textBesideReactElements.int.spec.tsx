import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Overlay } from "../../src/client/createOverlay";

import { createOverlay } from "../../src/client/createOverlay";
import { withoutMarker } from "../../src/shared/stegaText";

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

type SplitHeadingProps = { title: string; isSplit: boolean };

function SplitHeading({ isSplit, title }: SplitHeadingProps) {
  const words = withoutMarker(title).split(" ");
  return (
    <h3>
      {isSplit
        ? words.map((word, index) => (
            <span key={word}>
              {index > 0 && " "}
              {word}
            </span>
          ))
        : title}
    </h3>
  );
}

describe("a heading React splits into words after the overlay found it", () => {
  let main: HTMLElement;
  let root: Root;
  let overlay: Overlay;

  const render = (props: SplitHeadingProps) =>
    act(async () => {
      root.render(<SplitHeading {...props} />);
      await flushMutations();
    });

  const heading = () => main.querySelector("h3") as HTMLElement;

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
    await render({ isSplit: false, title: stega("Read our story") });
    overlay = createOverlay(main, () =>
      overlayCtx({
        inlineEditing: true,
        instantPreview: true,
        mode: "hover",
        payloadApi: "https://cms.example.com/api",
      })
    );
    await render({ isSplit: true, title: stega("Read our story") });
  });

  afterEach(() => {
    overlay.dispose();
    act(() => root.unmount());
    restorePreviewWindow();
    vi.unstubAllGlobals();
    document.getSelection()?.removeAllRanges();
  });

  it("lets React render other words and the whole text again once the edit ended", async () => {
    click(heading().querySelector("span") as Element);
    const edited = heading().firstChild as Text;
    edited.data = "Read the story";
    heading().dispatchEvent(new Event("input", { bubbles: true }));
    heading().dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter" })
    );
    await flushMutations();

    expect(edited.isConnected).toBe(false);

    await render({ isSplit: true, title: stega("Read the story") });

    expect(heading().textContent).toBe("Read the story");
    expect(Array.from(heading().children).map(({ textContent }) => textContent)).toEqual([
      "Read",
      " the",
      " story",
    ]);

    await render({ isSplit: false, title: stega("Read the story") });

    expect(heading().textContent).toBe("Read the story");
  });
});
