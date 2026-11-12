import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldMatch, FieldTracker } from "../../src/client/overlay/fieldTracker";

import { LABEL_CLASS } from "../../src/client/overlay/constants";
import { createFieldTracker } from "../../src/client/overlay/fieldTracker";
import {
  DATA_VE_COLLECTION_ATTR,
  DATA_VE_DOC_ID_ATTR,
  DATA_VE_KIND_ATTR,
  DATA_VE_PATH_ATTR,
} from "../../src/shared/protocol";

import { markedText, markedTextNode } from "../support/markedData";
import { flushMutations } from "../support/time";

const stega = (visible: string, path = "title") =>
  markedText(visible, { collectionSlug: "page", docId: "1", kind: "collection", path });

const richTextNode = (visible: string) => markedTextNode(visible, "0.0", "abc123");

const renderRichText = (main: HTMLElement, text: string) => {
  const wrapper = document.createElement("div");
  wrapper.setAttribute(DATA_VE_PATH_ATTR, "content");
  wrapper.setAttribute(DATA_VE_COLLECTION_ATTR, "page");
  wrapper.setAttribute(DATA_VE_KIND_ATTR, "collection");
  wrapper.setAttribute(DATA_VE_DOC_ID_ATTR, "1");
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  wrapper.append(paragraph);
  main.append(wrapper);
  return paragraph.firstChild as Text;
};

const render = (main: HTMLElement, text: string, tag = "h1") => {
  const element = document.createElement(tag);
  element.textContent = text;
  main.append(element);
  return element;
};

const kindOf = ({ richText }: FieldMatch) => (richText ? "rich text" : "field");

const nodesOf = (matches: readonly FieldMatch[]) => matches.map(({ textNode }) => textNode);

describe("createFieldTracker", () => {
  let main: HTMLElement;
  let heading: HTMLElement;
  let image: HTMLImageElement;
  let tracker: FieldTracker;

  const subscribe = () => {
    const listener = { onContentRemoved: vi.fn(), onFields: vi.fn(), onNodesReleased: vi.fn() };
    tracker.subscribe(listener);
    listener.onFields.mockClear();
    return listener;
  };

  const releasedNodes = (onNodesReleased: ReturnType<typeof subscribe>["onNodesReleased"]) =>
    onNodesReleased.mock.calls.map(([matches]) => nodesOf(matches));

  beforeEach(() => {
    document.body.innerHTML = "";
    main = document.createElement("main");
    document.body.append(main);
    heading = render(main, stega("Hello"));
    image = document.createElement("img");
    image.setAttribute("alt", stega("Logo", "logo"));
    main.append(image);
    tracker = createFieldTracker(main);
  });

  afterEach(() => {
    tracker.dispose();
  });

  it("strips the markers from text and attributes and puts them back when disposed", async () => {
    await flushMutations();

    expect([heading.textContent, image.getAttribute("alt")]).toEqual(["Hello", "Logo"]);

    tracker.dispose();

    expect([heading.textContent, image.getAttribute("alt")]).toEqual([
      stega("Hello"),
      stega("Logo", "logo"),
    ]);
  });

  it("hands the fields already on the page to a new subscriber", () => {
    const onFields = vi.fn();

    tracker.subscribe({ onFields });

    expect(onFields.mock.calls).toEqual([
      [
        main,
        [
          {
            textNode: heading.firstChild,
            path: "title",
            collectionSlug: "page",
            kind: "collection",
            docId: "1",
          },
        ],
      ],
    ]);
  });

  it("reports fields rendered later with the element that brought them", async () => {
    const { onFields } = subscribe();

    const subtitle = render(main, stega("World", "subtitle"));
    await flushMutations();

    expect(onFields.mock.calls).toEqual([
      [subtitle, [expect.objectContaining({ textNode: subtitle.firstChild, path: "subtitle" })]],
    ]);
  });

  it("releases a node and reports it again when it is rendered with new markers", async () => {
    const { onFields, onNodesReleased } = subscribe();
    const text = heading.firstChild as Text;

    text.textContent = stega("Hello again", "headline");
    await flushMutations();

    expect(heading.textContent).toBe("Hello again");
    expect(releasedNodes(onNodesReleased)).toEqual([[text]]);
    expect(onFields).toHaveBeenCalledWith(heading, [
      expect.objectContaining({ textNode: text, path: "headline" }),
    ]);
  });

  it("reports nothing again when it scans fields it already knows", async () => {
    renderRichText(main, richTextNode("Body"));
    await flushMutations();
    const { onFields } = subscribe();

    main.setAttribute(DATA_VE_KIND_ATTR, "collection");
    await flushMutations();

    expect(onFields.mock.calls).toEqual([[main, []]]);
  });

  it("stops reporting to a subscriber that left", async () => {
    const onFields = vi.fn();
    const unsubscribe = tracker.subscribe({ onFields });
    onFields.mockClear();

    unsubscribe();
    render(main, stega("World", "subtitle"));
    await flushMutations();

    expect(onFields).not.toHaveBeenCalled();
  });

  it("reports no field for text without a marker, also with zero-width characters", async () => {
    const { onFields } = subscribe();

    render(main, "Plain");
    const spaced = render(main, "Zero\u200Bwidth");
    await flushMutations();

    expect(onFields.mock.calls.flatMap(([, matches]) => matches)).toEqual([]);
    expect(spaced.textContent).toBe("Zero\u200Bwidth");
  });

  it("leaves markers inside script, style, noscript and template alone", async () => {
    const { onFields } = subscribe();
    const hidden = ["style", "noscript", "template"].map((tag) =>
      render(main, stega("Hidden"), tag)
    );
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = stega("Hidden");
    main.append(script);
    await flushMutations();

    expect(onFields.mock.calls.flatMap(([, matches]) => matches)).toEqual([]);
    expect([...hidden, script].map(({ textContent }) => textContent)).toEqual(
      Array.from({ length: 4 }, () => stega("Hidden"))
    );
  });

  it("strips markers only from the attributes that show text", async () => {
    const form = document.createElement("form");
    const input = document.createElement("input");
    for (const attr of ["placeholder", "aria-label", "data-custom"]) {
      input.setAttribute(attr, stega("Ask", attr));
    }
    input.setAttribute("title", "Plain");
    form.append(input);
    main.append(form);
    await flushMutations();

    expect(
      ["placeholder", "aria-label", "title", "data-custom"].map((attr) => input.getAttribute(attr))
    ).toEqual(["Ask", "Ask", "Plain", stega("Ask", "data-custom")]);
  });

  describe("when a node leaves the page", () => {
    it("releases it, puts its markers back and does not hand it to a later subscriber", async () => {
      const { onNodesReleased, onContentRemoved } = subscribe();
      const text = heading.firstChild;

      heading.remove();
      image.remove();
      await flushMutations();

      expect(releasedNodes(onNodesReleased)).toEqual([[text]]);
      expect(onContentRemoved).toHaveBeenCalledTimes(1);
      expect([heading.textContent, image.getAttribute("alt")]).toEqual([
        stega("Hello"),
        stega("Logo", "logo"),
      ]);
      expect(subscribe().onFields.mock.calls).toEqual([]);
    });

    it("does not hand it to a subscriber before it noticed", () => {
      const onFields = vi.fn();
      heading.remove();

      tracker.subscribe({ onFields });

      expect(onFields.mock.calls).toEqual([[main, []]]);
    });

    it("keeps it when it was only moved", async () => {
      const { onNodesReleased } = subscribe();

      heading.remove();
      main.append(heading);
      await flushMutations();

      expect(onNodesReleased).not.toHaveBeenCalled();
    });

    it("releases it when it is moved out of the element it watches", async () => {
      const { onNodesReleased } = subscribe();
      const text = heading.firstChild;

      document.body.append(heading);
      await flushMutations();

      expect(releasedNodes(onNodesReleased)).toEqual([[text]]);
      expect(heading.textContent).toBe(stega("Hello"));
    });

    it("finds it again when it comes back", async () => {
      heading.remove();
      await flushMutations();
      const { onFields } = subscribe();

      main.append(heading);
      await flushMutations();

      expect(heading.textContent).toBe("Hello");
      expect(onFields.mock.calls).toEqual([
        [heading, [expect.objectContaining({ textNode: heading.firstChild, path: "title" })]],
      ]);
    });

    it("tells subscribers that page content left, but not for its own label", async () => {
      const { onContentRemoved, onFields } = subscribe();
      const label = document.createElement("a");
      label.className = LABEL_CLASS;

      heading.append(label);
      await flushMutations();
      label.remove();
      await flushMutations();

      expect(onContentRemoved).not.toHaveBeenCalled();
      expect(onFields).not.toHaveBeenCalled();

      render(main, "Plain").remove();
      await flushMutations();

      expect(onContentRemoved).toHaveBeenCalledTimes(1);
    });
  });

  describe("when the page writes text without markers into a node", () => {
    let text: Text;

    beforeEach(async () => {
      text = heading.firstChild as Text;
      await flushMutations();
    });

    it("releases the node and leaves the text of the page in place", async () => {
      const { onNodesReleased } = subscribe();

      text.data = "hello-world";
      await flushMutations();

      expect(releasedNodes(onNodesReleased)).toEqual([[text]]);
      expect(subscribe().onFields.mock.calls).toEqual([]);

      heading.remove();
      await flushMutations();
      tracker.dispose();

      expect(heading.textContent).toBe("hello-world");
    });

    it("keeps the markers of a node it wrote a live value into", async () => {
      const { onNodesReleased } = subscribe();

      tracker.showText(text, "Hello!");
      await flushMutations();

      expect(heading.textContent).toBe("Hello!");
      expect(onNodesReleased).not.toHaveBeenCalled();

      tracker.dispose();

      expect(heading.textContent).toBe(stega("Hello"));
    });

    it("tells a write of the page apart from its own write of the same text", async () => {
      const { onNodesReleased } = subscribe();
      tracker.showText(text, "hello-world");
      await flushMutations();

      text.data = "hello-world";
      await flushMutations();

      expect(releasedNodes(onNodesReleased)).toEqual([[text]]);
    });

    describe.each([
      ["a narrow no-break space", "10\u202F%"],
      ["a joined emoji", "\u{1F469}\u200D\u{1F4BB}"],
    ])("with %s in a live value", (_name, value) => {
      it("keeps writing into the node and puts its markers back when disposed", async () => {
        const { onNodesReleased } = subscribe();

        tracker.showText(text, value);
        await flushMutations();
        tracker.showText(text, `${value}!`);
        await flushMutations();

        expect(heading.textContent).toBe(`${value}!`);
        expect(onNodesReleased).not.toHaveBeenCalled();

        tracker.dispose();

        expect(heading.textContent).toBe(stega("Hello"));
      });

      it("puts its markers back when the node leaves the page", async () => {
        tracker.showText(text, value);
        await flushMutations();

        heading.remove();
        await flushMutations();

        expect(heading.textContent).toBe(stega("Hello"));
      });

      it("releases the node when the page writes the same text afterwards", async () => {
        const { onNodesReleased } = subscribe();
        tracker.showText(text, value);
        await flushMutations();

        text.data = value;
        await flushMutations();

        expect(releasedNodes(onNodesReleased)).toEqual([[text]]);
      });
    });

    it("releases the node when the page writes zero-width characters without a marker into it", async () => {
      const { onNodesReleased } = subscribe();
      tracker.showText(text, "Hello!");

      text.data = "Zero\u200Bwidth";
      await flushMutations();

      expect(releasedNodes(onNodesReleased)).toEqual([[text]]);
    });

    it("writes nothing into a node it does not track", () => {
      const plain = render(main, "Plain").firstChild as Text;

      tracker.showText(plain, "Changed");

      expect(plain.data).toBe("Plain");
    });
  });

  describe("a text node of rich text the page renders an ordinary field into", () => {
    let textNode: Text;

    beforeEach(async () => {
      textNode = renderRichText(main, richTextNode("Body"));
      await flushMutations();
    });

    const reportsOf = () => {
      const reports: string[] = [];
      tracker.subscribe({
        onFields: (_root, matches) =>
          reports.push(...matches.map((match) => `${kindOf(match)} ${match.path}`)),
        onNodesReleased: (matches) =>
          reports.push(...matches.map((match) => `released ${kindOf(match)}`)),
      });
      return reports;
    };

    it("is released as a rich text node before it is reported as the field it shows now", async () => {
      const reports = reportsOf();

      expect(reports).toEqual(["field title", "rich text content"]);
      reports.length = 0;

      textNode.data = stega("Summary", "summary");
      await flushMutations();

      expect(reports).toEqual(["released rich text", "field summary"]);
      expect(reportsOf()).toEqual(["field title", "field summary"]);
    });
  });
});
