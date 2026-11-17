import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DATA_VE_TARGET_ATTR } from "../../src/client/overlay/constants";
import { VisualEditingOverlay } from "../../src/client/react/VisualEditingOverlay";
import { VisualEditingProvider } from "../../src/client/react/VisualEditingProvider";
import { markedText } from "../support/markedData";
import { flushMutations } from "../support/time";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const PAGE = { collectionSlug: "page", docId: "1", kind: "collection" } as const;
const HELLO = markedText("Hello", { ...PAGE, path: "title" });
const HELLO_AGAIN = markedText("Hello again", { ...PAGE, path: "title" });

let container: HTMLDivElement;
let root: Root;

const renderPage = (title: string, available = true) =>
  act(() => {
    root.render(
      <VisualEditingProvider available={available} framedOnly>
        <VisualEditingOverlay>
          <h1 title={title}>{title}</h1>
        </VisualEditingOverlay>
      </VisualEditingProvider>
    );
  });

const heading = () => container.querySelector("h1") as HTMLHeadingElement;

describe("a draft page in a standalone tab with a framed only overlay", () => {
  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.title = "";
    document.head.innerHTML = "";
  });

  it("shows its text and attributes without markers and no edit targets", () => {
    document.title = HELLO;

    renderPage(HELLO);

    expect(heading().textContent).toBe("Hello");
    expect(heading().title).toBe("Hello");
    expect(document.title).toBe("Hello");
    expect(container.querySelectorAll(`[${DATA_VE_TARGET_ATTR}]`)).toHaveLength(0);
  });

  it("cleans the marked text React renders again", async () => {
    renderPage(HELLO);

    renderPage(HELLO_AGAIN);
    await flushMutations();

    expect(heading().textContent).toBe("Hello again");
    expect(heading().title).toBe("Hello again");
  });

  it("gives the markers back when it unmounts", () => {
    document.title = HELLO;
    renderPage(HELLO);

    act(() => root.unmount());
    root = createRoot(container);

    expect(document.title).toBe(HELLO);
  });

  it("leaves a page read without drafts alone", () => {
    renderPage(HELLO, false);

    expect(heading().textContent).toBe(HELLO);
  });
});
