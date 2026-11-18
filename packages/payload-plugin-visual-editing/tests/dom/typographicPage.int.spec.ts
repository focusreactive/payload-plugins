import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { VisualEditing } from "../../src/dom";
import type { TypographicCard } from "../support/typographicText";

import { DATA_VE_TARGET_ATTR } from "../../src/client/overlay/constants";
import { STORAGE_KEY } from "../../src/client/visualEditingMode";
import { mountVisualEditing } from "../../src/dom";
import { ADMIN_ORIGIN, restorePreviewWindow, stubAdminWindow } from "../support/previewWindow";
import { flushMutations } from "../support/time";
import {
  countObserverCallbacks,
  markedAt,
  PAGE_CARD_COUNT,
  recordAttributeWrites,
  SETTLED_OBSERVER_CALLBACKS,
  typographicCards,
} from "../support/typographicText";

const cardElementOf = ({ author, label, photo, photoPath, title, titlePath }: TypographicCard) => {
  const card = document.createElement("article");
  card.setAttribute("aria-label", label);
  const link = document.createElement("a");
  link.href = "/blog";
  link.title = label;
  const heading = document.createElement("h2");
  heading.textContent = markedAt(title, titlePath);
  const image = document.createElement("img");
  image.alt = markedAt(photo, photoPath);
  const byline = document.createElement("p");
  byline.textContent = author;
  link.append(heading);
  card.append(link, image, byline);
  return card;
};

describe("a page of cards with typographic characters under mountVisualEditing", () => {
  const cards = typographicCards();
  let main: HTMLElement;
  let mounted: VisualEditing | null;
  let observerCallbacks: () => number;

  const shown = () =>
    Array.from(main.querySelectorAll("article"), (card) => ({
      author: card.querySelector("p")?.textContent,
      label: card.getAttribute("aria-label"),
      linkTitle: card.querySelector("a")?.title,
      photo: card.querySelector("img")?.alt,
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
    mounted = null;
    main = document.createElement("main");
    main.append(...cards.map(cardElementOf));
    document.body.append(main);
    stubAdminWindow({ postMessage: vi.fn() });
    observerCallbacks = countObserverCallbacks();
  });

  afterEach(() => {
    mounted?.destroy();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    localStorage.clear();
    restorePreviewWindow();
  });

  it("outlines every field, strips only the markers and settles", async () => {
    localStorage.setItem(STORAGE_KEY, "always");
    const writes = recordAttributeWrites();

    mounted = mountVisualEditing({ adminOrigin: ADMIN_ORIGIN, locale: "en", root: main });
    await flushMutations();
    await flushMutations();

    expect(shown()).toEqual(expected);
    expect(main.querySelectorAll(`[${DATA_VE_TARGET_ATTR}]`)).toHaveLength(2 * PAGE_CARD_COUNT);
    expect(writes.filter(({ name }) => name === "aria-label" || name === "title")).toEqual([]);
    expect(observerCallbacks()).toBeLessThan(SETTLED_OBSERVER_CALLBACKS);
  });

  it("settles when the page writes the labels again", async () => {
    localStorage.setItem(STORAGE_KEY, "always");
    mounted = mountVisualEditing({ adminOrigin: ADMIN_ORIGIN, locale: "en", root: main });
    await flushMutations();
    const settled = observerCallbacks();

    for (const [index, card] of Array.from(main.querySelectorAll("article")).entries()) {
      card.setAttribute("aria-label", cards[index]?.label ?? "");
    }
    await flushMutations();
    await flushMutations();

    expect(shown()).toEqual(expected);
    expect(observerCallbacks() - settled).toBeLessThan(SETTLED_OBSERVER_CALLBACKS);
  });

  it("cleans the markers of a draft page whose overlay is off and settles", async () => {
    localStorage.setItem(STORAGE_KEY, "off");

    mounted = mountVisualEditing({ adminOrigin: ADMIN_ORIGIN, locale: "en", root: main });
    await flushMutations();
    await flushMutations();

    expect(shown()).toEqual(expected);
    expect(observerCallbacks()).toBeLessThan(SETTLED_OBSERVER_CALLBACKS);
  });
});
