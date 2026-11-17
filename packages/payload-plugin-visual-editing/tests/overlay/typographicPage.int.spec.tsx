import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TypographicCard } from "../support/typographicText";

import { DATA_VE_TARGET_ATTR } from "../../src/client/overlay/constants";
import { VisualEditingOverlay } from "../../src/client/VisualEditingOverlay";
import { VisualEditingProvider } from "../../src/client/VisualEditingProvider";
import { STORAGE_KEY } from "../../src/client/visualEditingMode";
import { ADMIN_ORIGIN, restorePreviewWindow, stubAdminWindow } from "../support/previewWindow";
import { flushMutations } from "../support/time";
import {
  countObserverCallbacks,
  markedAt,
  PAGE_CARD_COUNT,
  SETTLED_OBSERVER_CALLBACKS,
  typographicCards,
} from "../support/typographicText";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function Card({ author, label, photo, photoPath, title, titlePath }: TypographicCard) {
  return (
    <article aria-label={label}>
      <a href="#blog" title={label}>
        <h2>{markedAt(title, titlePath)}</h2>
      </a>
      <span title={markedAt(photo, photoPath)} />
      <p>{author}</p>
    </article>
  );
}

describe("a page of cards with typographic characters under the React overlay", () => {
  const cards = typographicCards();
  let container: HTMLDivElement;
  let root: Root;
  let observerCallbacks: () => number;

  const renderPage = (revision: number) =>
    act(async () => {
      root.render(
        <VisualEditingProvider adminOrigin={ADMIN_ORIGIN} available>
          <VisualEditingOverlay>
            <main data-revision={revision}>
              {cards.map((card) => (
                <Card key={card.titlePath} {...card} />
              ))}
            </main>
          </VisualEditingOverlay>
        </VisualEditingProvider>
      );
      await flushMutations();
      await flushMutations();
    });

  const shown = () =>
    Array.from(container.querySelectorAll("article"), (card) => ({
      author: card.querySelector("p")?.textContent,
      label: card.getAttribute("aria-label"),
      linkTitle: card.querySelector("a")?.title,
      photo: card.querySelector("span")?.title,
      title: card.querySelector("h2")?.textContent,
    }));

  const expected = cards.map(({ author, label, photo, title }) => ({
    author,
    label,
    linkTitle: label,
    photo,
    title,
  }));

  beforeEach(() => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    stubAdminWindow({ postMessage: vi.fn() });
    observerCallbacks = countObserverCallbacks();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    localStorage.clear();
    restorePreviewWindow();
  });

  it("outlines every field, strips only the markers and settles", async () => {
    localStorage.setItem(STORAGE_KEY, "always");

    await renderPage(1);

    expect(shown()).toEqual(expected);
    expect(container.querySelectorAll(`[${DATA_VE_TARGET_ATTR}]`)).toHaveLength(PAGE_CARD_COUNT);
    expect(observerCallbacks()).toBeLessThan(SETTLED_OBSERVER_CALLBACKS);
  });

  it("settles when React renders the page again", async () => {
    localStorage.setItem(STORAGE_KEY, "always");
    await renderPage(1);
    const settled = observerCallbacks();

    await renderPage(2);

    expect(shown()).toEqual(expected);
    expect(observerCallbacks() - settled).toBeLessThan(SETTLED_OBSERVER_CALLBACKS);
  });

  it("cleans the markers of a draft page whose overlay is off and settles", async () => {
    localStorage.setItem(STORAGE_KEY, "off");

    await renderPage(1);

    expect(shown()).toEqual(expected);
    expect(observerCallbacks()).toBeLessThan(SETTLED_OBSERVER_CALLBACKS);
  });
});
