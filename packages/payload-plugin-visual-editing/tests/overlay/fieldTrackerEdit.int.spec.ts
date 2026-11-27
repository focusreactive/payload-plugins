import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldMatch, FieldTracker } from "../../src/client/overlay/fieldTracker";

import { createFieldTracker } from "../../src/client/overlay/fieldTracker";
import { withoutMarker } from "../../src/shared/stegaText";

import { markedText } from "../support/markedData";
import { flushMutations } from "../support/time";

const stega = (visible: string, path = "title") =>
  markedText(visible, { collectionSlug: "page", docId: "1", kind: "collection", path });

describe("a field the editor types into", () => {
  let main: HTMLElement;
  let heading: HTMLElement;
  let tracker: FieldTracker;
  let listener: { onFields: ReturnType<typeof vi.fn>; onNodesReleased: ReturnType<typeof vi.fn> };
  let match: FieldMatch;
  let shown: string;
  let onShownAgain: ReturnType<typeof vi.fn>;

  const textNode = () => match.textNode;

  const type = async (text: string) => {
    shown = text;
    textNode().data = text;
    await flushMutations();
  };

  const begin = () => tracker.beginEdit(match, { onShownAgain, shownText: () => shown });

  beforeEach(() => {
    document.body.innerHTML = "";
    main = document.createElement("main");
    heading = document.createElement("h1");
    heading.textContent = stega("Hello");
    main.append(heading);
    document.body.append(main);
    tracker = createFieldTracker(main);
    listener = { onFields: vi.fn(), onNodesReleased: vi.fn() };
    tracker.subscribe(listener);
    [[, [match]]] = listener.onFields.mock.calls as [[Element, [FieldMatch]]];
    listener.onFields.mockClear();
    shown = "Hello";
    onShownAgain = vi.fn();
  });

  afterEach(() => {
    tracker.dispose();
  });

  it("stays the same field while the editor types", async () => {
    expect(begin()).toBe(heading);

    await type("Hello world");

    expect(listener.onNodesReleased).not.toHaveBeenCalled();
    expect(heading.textContent).toBe("Hello world");
  });

  it("is released by a write of the page when nobody edits it", async () => {
    textNode().data = "Hello world";
    await flushMutations();

    expect(listener.onNodesReleased).toHaveBeenCalledWith([match]);
  });

  it("keeps the typed text when the page renders the saved text again", async () => {
    begin();
    await type("Hello world");

    textNode().data = stega("Hello wor");
    await flushMutations();

    expect(heading.textContent).toBe("Hello world");
    expect(onShownAgain).toHaveBeenCalledTimes(1);
    expect(listener.onNodesReleased).not.toHaveBeenCalled();
  });

  describe("after the browser split the text into lines", () => {
    let edited: Text;

    beforeEach(async () => {
      edited = textNode();
      begin();
      edited.data = "lo";
      edited.before("Hel", "\n");
      shown = "Hel\nlo";
      await flushMutations();
    });

    it("shows the typed lines once, in the node of the edit, when the page writes the text into it", async () => {
      edited.data = stega("Hel\nlo");
      await flushMutations();

      expect(Array.from(heading.childNodes)).toEqual([edited]);
      expect(edited.data).toBe("Hel\nlo");
      expect(onShownAgain).toHaveBeenCalledTimes(1);
      expect(listener.onNodesReleased).not.toHaveBeenCalled();
    });

    it("keeps the node of the edit when the page replaces the lines with a text of its own", async () => {
      heading.textContent = stega("Hel\nlo");
      await flushMutations();

      expect(Array.from(heading.childNodes)).toEqual([edited]);
      expect(edited.data).toBe("Hel\nlo");
      expect(onShownAgain).toHaveBeenCalledTimes(1);
      expect(listener.onNodesReleased).not.toHaveBeenCalled();
    });

    it("leaves a text of another field the page puts in its place to that field", async () => {
      heading.textContent = stega("Other", "subtitle");
      await flushMutations();

      expect(listener.onNodesReleased).toHaveBeenCalledWith([match]);
      expect(onShownAgain).not.toHaveBeenCalled();
    });
  });

  it("shows the text the edit ended with, in the node the page rendered", async () => {
    const rendered = textNode();
    begin();
    await type("Hello world");

    tracker.endEdit(match, "Hello world");
    await flushMutations();

    expect(textNode()).toBe(rendered);
    expect(heading.textContent).toBe("Hello world");
    expect(listener.onNodesReleased).not.toHaveBeenCalled();
  });

  it("shows the text the edit began with when the edit is cancelled", async () => {
    begin();
    await type("Changed");

    tracker.endEdit(match, "Hello");
    await flushMutations();

    expect(heading.textContent).toBe("Hello");
    expect(listener.onNodesReleased).not.toHaveBeenCalled();
  });

  it("is not written by the tracker while the editor types", async () => {
    begin();
    await type("Hello world");

    tracker.showText(textNode(), "From the form");

    expect(heading.textContent).toBe("Hello world");
  });

  it("is edited in the element that wraps its text, so a link keeps its markup", async () => {
    const link = document.createElement("a");
    const label = document.createElement("span");
    const icon = document.createElement("svg");
    label.textContent = stega("Label", "cta");
    link.append(label, icon);
    main.append(link);
    await flushMutations();
    const [[, [cta]]] = listener.onFields.mock.calls as [[Element, [FieldMatch]]];

    const editedElement = tracker.beginEdit(cta, { onShownAgain, shownText: () => shown });
    (label.firstChild as Text).data = "Changed";
    await flushMutations();
    tracker.endEdit(cta, "Changed");

    expect(cta.holder).toBe(link);
    expect(editedElement).toBe(label);
    expect(Array.from(link.children)).toEqual([label, icon]);
    expect(label.textContent).toBe("Changed");
  });

  it("can be written by the tracker again after the edit", async () => {
    begin();
    await type("Hello world");
    tracker.endEdit(match, "Hello world");
    await flushMutations();

    tracker.showText(textNode(), "From the form");
    await flushMutations();

    expect(heading.textContent).toBe("From the form");
    expect(listener.onNodesReleased).not.toHaveBeenCalled();
  });

  it("is released by a write of the page after the edit", async () => {
    begin();
    tracker.endEdit(match, "Hello");
    await flushMutations();

    textNode().data = "Written by the page";
    await flushMutations();

    expect(listener.onNodesReleased).toHaveBeenCalledWith([match]);
  });

  it("puts the rendered node back when the editor deleted all of the text", async () => {
    const rendered = textNode();
    begin();
    rendered.remove();
    heading.append(document.createElement("br"), "Typed again");
    await flushMutations();
    listener.onFields.mockClear();

    tracker.endEdit(match, "Typed again");
    await flushMutations();

    expect(Array.from(heading.childNodes)).toEqual([rendered]);
    expect(rendered.data).toBe("Typed again");
    expect(listener.onFields).toHaveBeenCalledWith(heading, [match]);
  });

  it("edits a text that sits next to an icon in its own element, without moving the text", async () => {
    const icon = document.createElement("svg");
    heading.append(icon);

    const editedElement = begin();
    await type("Hello world");
    tracker.endEdit(match, "Hello world");
    await flushMutations();

    expect(editedElement).toBe(heading);
    expect(Array.from(heading.childNodes)).toEqual([match.textNode, icon]);
    expect(match.textNode.data).toBe("Hello world");
    expect(listener.onNodesReleased).not.toHaveBeenCalled();
  });

  it("puts the text back in its place when the browser took it out during the edit", () => {
    const icon = document.createElement("svg");
    heading.append(icon);

    begin();
    match.textNode.remove();
    heading.prepend("Hello again");
    tracker.endEdit(match, "Hello again");

    expect(Array.from(heading.childNodes)).toEqual([match.textNode, icon]);
    expect(heading.textContent).toBe("Hello again");
  });

  it("restores the marker of the latest render when the overlay stops", async () => {
    begin();
    textNode().data = stega("Saved");
    await flushMutations();
    tracker.endEdit(match, "Typed");

    tracker.dispose();

    expect(heading.textContent).toBe(stega("Saved"));
  });

  it("does not start an edit of a text that shares its element with other text", () => {
    const paragraph = document.createElement("p");
    paragraph.append("Intro: ", stega("Body", "body"));
    main.append(paragraph);
    tracker.dispose();
    tracker = createFieldTracker(main);
    const onFields = vi.fn();
    tracker.subscribe({ onFields });
    const [[, matches]] = onFields.mock.calls as [[Element, FieldMatch[]]];
    const body = matches.find(({ path }) => path === "body")!;

    expect(tracker.beginEdit(body, { onShownAgain, shownText: () => shown })).toBeNull();
  });

  describe("in a line that holds the text of another field", () => {
    let line: HTMLElement;
    let tag: HTMLElement;
    let matches: FieldMatch[];

    const matchOf = (path: string) => matches.find((found) => found.path === path)!;

    beforeEach(() => {
      tracker.dispose();
      line = document.createElement("div");
      tag = document.createElement("span");
      tag.append(document.createElement("img"), stega("SCALE EASILY", "tag"));
      line.append(stega("OUR FIRST RELEASE", "line"), " ", tag, "\n");
      main.append(line);
      tracker = createFieldTracker(main);
      const onFields = vi.fn();
      tracker.subscribe({ onFields });
      [[, matches]] = onFields.mock.calls as [[Element, FieldMatch[]]];
    });

    it("edits the text of the line apart from the text of the other field", async () => {
      const lineText = matchOf("line");

      const editedElement = tracker.beginEdit(lineText, { onShownAgain, shownText: () => shown });
      lineText.textNode.data = "OUR NEXT RELEASE";
      await flushMutations();

      expect(lineText.holder).toBe(line);
      expect(editedElement).toBe(line);

      tracker.endEdit(lineText, "OUR NEXT RELEASE");

      expect(line.textContent).toBe("OUR NEXT RELEASE SCALE EASILY\n");
      expect(line.firstChild).toBe(lineText.textNode);
    });

    it("edits the text of the other field in its own element", () => {
      const tagText = matchOf("tag");

      const editedElement = tracker.beginEdit(tagText, { onShownAgain, shownText: () => shown });

      expect(tagText.holder).toBe(tag);
      expect(editedElement).toBe(tag);
      expect(tag.lastChild).toBe(tagText.textNode);
    });

    it("keeps the whitespace around the text of the line, and splits no node", async () => {
      tracker.dispose();
      line.replaceChildren(`\n  ${stega("OUR FIRST RELEASE", "line")}\n  `, tag);
      tracker = createFieldTracker(main);
      const onFields = vi.fn();
      tracker.subscribe({ onFields });
      [[, matches]] = onFields.mock.calls as [[Element, FieldMatch[]]];
      const lineText = matchOf("line");

      tracker.beginEdit(lineText, { onShownAgain, shownText: () => shown });
      tracker.endEdit(lineText, "OUR NEXT RELEASE");
      await flushMutations();

      expect(Array.from(line.childNodes)).toEqual([lineText.textNode, tag]);
      expect(line.textContent).toBe("\n  OUR NEXT RELEASE\n  SCALE EASILY");

      tracker.dispose();

      expect(Array.from(line.childNodes)).toEqual([lineText.textNode, tag]);
      expect(withoutMarker(line.textContent ?? "")).toBe("\n  OUR FIRST RELEASE\n  SCALE EASILY");
    });

    it("leaves the other field in place when the page drops the text of the line", () => {
      const lineText = matchOf("line");
      lineText.textNode.remove();

      expect(tracker.showTextInHolder(lineText, "Changed")).toBe(false);
      expect(tag.isConnected).toBe(true);
    });
  });
});
