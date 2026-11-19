import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldMatch, FieldTracker } from "../../src/client/overlay/fieldTracker";
import type { MarkerCleaner } from "../../src/client/overlay/markerCleaner";
import type { MutationPipeline } from "../../src/client/overlay/mutationPipeline";

import { createFieldTracker } from "../../src/client/overlay/fieldTracker";
import { cleanPageAround } from "../../src/client/overlay/markerCleaner";
import { createMutationPipeline } from "../../src/client/overlay/mutationPipeline";
import { flushMutations } from "../support/time";
import {
  countObserverCallbacks,
  EVERY_TYPOGRAPHIC_TEXT,
  markedAt,
  recordAttributeWrites,
  SETTLED_OBSERVER_CALLBACKS,
  TYPOGRAPHIC_TEXTS,
} from "../support/typographicText";

const settle = async () => {
  await flushMutations();
  await flushMutations();
};

const pathsOf = (onFields: ReturnType<typeof vi.fn>) =>
  onFields.mock.calls.flatMap(([, matches]) => (matches as FieldMatch[]).map(({ path }) => path));

describe.each(TYPOGRAPHIC_TEXTS)("the field tracker on a page with %s", (_name, text) => {
  let main: HTMLElement;
  let link: HTMLAnchorElement;
  let paragraph: HTMLParagraphElement;
  let tracker: FieldTracker;
  let observerCallbacks: () => number;

  beforeEach(() => {
    main = document.createElement("main");
    link = document.createElement("a");
    paragraph = document.createElement("p");
    main.append(link, paragraph);
    document.body.append(main);
    observerCallbacks = countObserverCallbacks();
  });

  afterEach(() => {
    tracker.dispose();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("leaves an attribute without a marker as it is and never writes it", async () => {
    link.setAttribute("aria-label", text);
    main.setAttribute("title", text);
    const writes = recordAttributeWrites();

    tracker = createFieldTracker(main);
    await settle();

    expect(link.getAttribute("aria-label")).toBe(text);
    expect(main.getAttribute("title")).toBe(text);
    expect(writes).toEqual([]);
    expect(observerCallbacks()).toBe(0);
  });

  it("does nothing when the page writes such an attribute later, also with the same value", async () => {
    tracker = createFieldTracker(main);
    await settle();
    const writes = recordAttributeWrites();

    link.setAttribute("aria-label", text);
    await settle();
    link.setAttribute("aria-label", text);
    await settle();

    expect(writes).toEqual([
      { name: "aria-label", value: text },
      { name: "aria-label", value: text },
    ]);
    expect(link.getAttribute("aria-label")).toBe(text);
    expect(observerCallbacks()).toBeLessThan(SETTLED_OBSERVER_CALLBACKS);
  });

  it("strips the marker of an attribute and gives it back when it stops", async () => {
    const marked = markedAt(text, "link.label");
    link.setAttribute("aria-label", marked);

    tracker = createFieldTracker(main);
    await settle();

    expect(link.getAttribute("aria-label")).toBe(text);
    expect(observerCallbacks()).toBeLessThan(SETTLED_OBSERVER_CALLBACKS);

    tracker.dispose();

    expect(link.getAttribute("aria-label")).toBe(marked);
  });

  it("strips the marker of an attribute the page renders again", async () => {
    link.setAttribute("aria-label", markedAt(text, "link.label"));
    tracker = createFieldTracker(main);
    await settle();

    link.setAttribute("aria-label", markedAt(`${text}!`, "link.label"));
    await settle();

    expect(link.getAttribute("aria-label")).toBe(`${text}!`);
    expect(observerCallbacks()).toBeLessThan(SETTLED_OBSERVER_CALLBACKS);
  });

  it("reports no field for text without a marker and leaves it as it is", async () => {
    paragraph.textContent = text;
    const onFields = vi.fn();

    tracker = createFieldTracker(main);
    tracker.subscribe({ onFields });
    await settle();

    expect(pathsOf(onFields)).toEqual([]);
    expect(paragraph.textContent).toBe(text);
    expect(observerCallbacks()).toBe(0);
  });

  it("scans nothing again when the page writes text without a marker", async () => {
    paragraph.textContent = "Plain";
    const onFields = vi.fn();
    tracker = createFieldTracker(main);
    tracker.subscribe({ onFields });
    onFields.mockClear();

    (paragraph.firstChild as Text).data = text;
    paragraph.append(document.createTextNode(text));
    await settle();

    expect(onFields).not.toHaveBeenCalled();
    expect(paragraph.textContent).toBe(`${text}${text}`);
  });

  it("reports the field of marked text and shows it without the marker", async () => {
    paragraph.textContent = markedAt(text, "intro");
    const onFields = vi.fn();

    tracker = createFieldTracker(main);
    tracker.subscribe({ onFields });
    await settle();

    expect(pathsOf(onFields)).toEqual(["intro"]);
    expect(paragraph.textContent).toBe(text);
    expect(observerCallbacks()).toBeLessThan(SETTLED_OBSERVER_CALLBACKS);
  });

  it("keeps a live value of the field on the page", async () => {
    paragraph.textContent = markedAt("Intro", "intro");
    const onNodesReleased = vi.fn();
    tracker = createFieldTracker(main);
    tracker.subscribe({ onFields: vi.fn(), onNodesReleased });
    const node = paragraph.firstChild as Text;

    tracker.showText(node, text);
    await settle();
    tracker.showText(node, `${text}!`);
    await settle();

    expect(paragraph.textContent).toBe(`${text}!`);
    expect(onNodesReleased).not.toHaveBeenCalled();
    expect(observerCallbacks()).toBeLessThan(SETTLED_OBSERVER_CALLBACKS);
  });
});

const description = () =>
  document.head.querySelector('meta[name="description"]')?.getAttribute("content");

describe.each(TYPOGRAPHIC_TEXTS)("the marker cleaner on a page with %s", (_name, text) => {
  let main: HTMLElement;
  let heading: HTMLHeadingElement;
  let cleaner: MarkerCleaner | null;
  let observerCallbacks: () => number;

  beforeEach(() => {
    cleaner = null;
    main = document.createElement("main");
    heading = document.createElement("h1");
    main.append(heading);
    document.body.append(main);
    document.head.innerHTML = '<meta name="description" content="">';
    observerCallbacks = countObserverCallbacks();
  });

  afterEach(() => {
    cleaner?.dispose();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.title = "";
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("writes nothing into a page without markers, the title and head included", async () => {
    heading.textContent = text;
    heading.setAttribute("aria-label", text);
    document.title = text;
    document.head.querySelector("meta")?.setAttribute("content", text);
    const writes = recordAttributeWrites();

    cleaner = cleanPageAround(main);
    await settle();
    heading.setAttribute("aria-label", text);
    document.title = text;
    await settle();

    expect(writes).toEqual([{ name: "aria-label", value: text }]);
    expect(heading.textContent).toBe(text);
    expect(document.title).toBe(text);
    expect(description()).toBe(text);
    expect(observerCallbacks()).toBeLessThan(SETTLED_OBSERVER_CALLBACKS);
  });

  it("strips the markers and keeps the characters next to them", async () => {
    heading.textContent = markedAt(text, "title");
    heading.setAttribute("aria-label", markedAt(text, "title"));
    document.title = markedAt(text, "meta.title");
    document.head
      .querySelector("meta")
      ?.setAttribute("content", markedAt(text, "meta.description"));

    cleaner = cleanPageAround(main);
    await settle();
    heading.setAttribute("aria-label", markedAt(`${text}!`, "title"));
    document.title = markedAt(`${text}!`, "meta.title");
    await settle();

    expect(heading.textContent).toBe(text);
    expect(heading.getAttribute("aria-label")).toBe(`${text}!`);
    expect(document.title).toBe(`${text}!`);
    expect(description()).toBe(text);
    expect(observerCallbacks()).toBeLessThan(SETTLED_OBSERVER_CALLBACKS);
  });
});

describe("the mutation pipeline of the overlay", () => {
  let main: HTMLElement;
  let pipeline: MutationPipeline;

  const pipelineWith = (onMarkedAttribute: (element: Element, attr: Attr) => void) =>
    createMutationPipeline(main, {
      isOwnAttributeWrite: () => false,
      onMarkedAttribute,
      onNodesRemoved: vi.fn(),
      onPlainTextWritten: vi.fn(),
      onRoots: vi.fn(),
      onTextReset: vi.fn(),
    });

  beforeEach(() => {
    main = document.createElement("main");
    document.body.append(main);
  });

  afterEach(() => {
    pipeline.dispose();
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("reports no attribute for typographic characters alone", async () => {
    const onMarkedAttribute = vi.fn();
    pipeline = pipelineWith(onMarkedAttribute);

    main.setAttribute("aria-label", EVERY_TYPOGRAPHIC_TEXT);
    await settle();

    expect(onMarkedAttribute).not.toHaveBeenCalled();
  });

  it("reports a marked attribute once when its handler writes the same value back", async () => {
    const observerCallbacks = countObserverCallbacks();
    const onMarkedAttribute = vi.fn((element: Element, { name, value }: Attr) => {
      element.setAttribute(name, value);
    });
    pipeline = pipelineWith(onMarkedAttribute);

    main.setAttribute("aria-label", markedAt(EVERY_TYPOGRAPHIC_TEXT, "label"));
    await settle();

    expect(onMarkedAttribute).toHaveBeenCalledTimes(1);
    expect(observerCallbacks()).toBeLessThan(SETTLED_OBSERVER_CALLBACKS);
  });
});
