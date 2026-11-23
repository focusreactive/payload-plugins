import { beforeEach, describe, expect, it } from "vitest";

import type { LiveFields } from "../../src/client/instantPreview/liveFields";
import type { FieldMatch } from "../../src/client/overlay/fieldTracker";
import type { VeIdentity } from "../../src/shared/shared";
import type {
  VeFieldPatchMessage,
  VeFieldSnapshotEntry,
  VeFieldSnapshotMessage,
} from "../../src/shared/protocol";

import {
  createLiveFields,
  REMEMBERED_SAVED_VALUES,
} from "../../src/client/instantPreview/liveFields";
import {
  DATA_VE_LIVE_ATTR,
  VE_FIELD_PATCH_TYPE,
  VE_FIELD_SNAPSHOT_TYPE,
  VE_LIVE_OFF,
} from "../../src/shared/protocol";
import { fieldAddressOf } from "../../src/shared/veDocument";

const page = { collectionSlug: "page", kind: "collection", docId: "1" } as const;
const title: VeIdentity = { ...page, path: "title" };

const headingKey = (rowId: string) => `blocks.${rowId}.heading`;

const headingMarker = (rowId: string, index: number): VeIdentity => ({
  ...page,
  key: headingKey(rowId),
  path: `blocks.${index}.heading`,
});

const field = (saved: string, value = saved): VeFieldSnapshotEntry => ({
  key: "title",
  saved,
  value,
});

const heading = (rowId: string, saved: string, value = saved): VeFieldSnapshotEntry => ({
  key: headingKey(rowId),
  saved,
  value,
});

const snapshot = (...fields: VeFieldSnapshotEntry[]): VeFieldSnapshotMessage => ({
  type: VE_FIELD_SNAPSHOT_TYPE,
  ...page,
  fields,
});

const patch = (value: string, key = "title"): VeFieldPatchMessage => ({
  type: VE_FIELD_PATCH_TYPE,
  ...page,
  patches: [{ key, value }],
});

const patchHeading = (rowId: string, value: string) => patch(value, headingKey(rowId));

const writeText = (node: Text, text: string) => {
  node.textContent = text;
};

const textsOf = (nodes: Text[]) => nodes.map((node) => node.textContent);

const FIELD_KEY = "content";

const nodeKey = (shape: string, address = "0.0", fieldKey = FIELD_KEY) =>
  `${fieldKey}#${shape}#${address}`;

describe("the live fields of a preview page", () => {
  let liveFields: LiveFields;
  const matchOfNode = new Map<Text, FieldMatch>();

  const release = (...nodes: Text[]) => {
    const matches = nodes.flatMap((node) => matchOfNode.get(node) ?? []);
    for (const node of nodes) matchOfNode.delete(node);
    liveFields.release(matches);
  };

  const track = (...matches: FieldMatch[]) => {
    release(...matches.map(({ textNode }) => textNode).filter((node) => matchOfNode.has(node)));
    for (const match of matches) matchOfNode.set(match.textNode, match);
    liveFields.track(matches);
  };

  const renderAgain = (node: Text, text: string, marker: VeIdentity) => {
    node.textContent = text;
    track({ ...marker, textNode: node });
  };

  const render = (text: string, marker: VeIdentity = title) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    document.body.append(paragraph);
    const node = paragraph.firstChild as Text;
    track({ ...marker, textNode: node });
    return node;
  };

  beforeEach(() => {
    document.body.innerHTML = "";
    matchOfNode.clear();
    liveFields = createLiveFields(writeText);
  });

  it("rewrites every node rendering the field", () => {
    const headline = render("Hell");
    const breadcrumb = render("Hell");
    liveFields.apply(snapshot(field("Hell")));

    liveFields.apply(patch("Hello"));

    expect(textsOf([headline, breadcrumb])).toEqual(["Hello", "Hello"]);
  });

  it("follows a field that is cleared and typed into again", () => {
    const node = render("9");
    liveFields.apply(snapshot(field("9")));

    liveFields.apply(patch(""));
    expect(node.textContent).toBe("");

    liveFields.apply(patch("12"));
    expect(node.textContent).toBe("12");
  });

  it("shows the form value when the page was rendered from an older save", () => {
    const node = render("Hell");

    liveFields.apply(snapshot(field("Hell", "Hello")));

    expect(node.textContent).toBe("Hello");
  });

  it("does nothing before the admin has sent a snapshot", () => {
    const node = render("Hell");

    liveFields.apply(patch("Hello"));

    expect(node.textContent).toBe("Hell");
  });

  it("leaves a node alone when its render transforms the value", () => {
    const node = render("HELL");
    liveFields.apply(snapshot(field("Hell")));

    liveFields.apply(patch("Hello"));

    expect(node.textContent).toBe("HELL");
  });

  it("stops patching a node once its render turns out to transform the value", () => {
    const node = render("999");
    liveFields.apply(snapshot(field("999")));
    liveFields.apply(patch("1000"));
    liveFields.apply(snapshot(field("1000")));

    renderAgain(node, "1,000", title);
    liveFields.apply(patch("10000"));

    expect(node.textContent).toBe("1,000");
  });

  it("keeps the form value when the node is rendered again from an older save", () => {
    const node = render("Hell");
    liveFields.apply(snapshot(field("Hell")));
    liveFields.apply(patch("Hello"));
    liveFields.apply(snapshot(field("Hello", "Hello!")));

    renderAgain(node, "Hell", title);

    expect(node.textContent).toBe("Hello!");
  });

  it("forgets saved values older than it promises to remember", () => {
    const node = render("save 0");
    for (let save = 0; save <= REMEMBERED_SAVED_VALUES; save += 1) {
      liveFields.apply(snapshot(field(`save ${save}`)));
    }

    renderAgain(node, "save 0", title);
    expect(node.textContent).toBe("save 0");

    renderAgain(node, "save 1", title);
    expect(node.textContent).toBe(`save ${REMEMBERED_SAVED_VALUES}`);
  });

  it("ignores snapshots and patches for other documents", () => {
    const node = render("Hell", { ...title, docId: "2" });

    liveFields.apply(snapshot(field("Hell", "Hello")));
    liveFields.apply(patch("Hello!"));

    expect(node.textContent).toBe("Hell");
  });

  it("keeps the values of a field a later snapshot does not mention", () => {
    const node = render("Hell");
    render("First", headingMarker("row-a", 0));
    liveFields.apply(snapshot(field("Hell")));

    liveFields.apply(snapshot(heading("row-a", "First")));
    liveFields.apply({ ...snapshot(), collectionSlug: "author", docId: "9" });
    liveFields.apply(patch("Hello"));

    expect(node.textContent).toBe("Hello");
  });

  it("keeps no value of a field it has not rendered", () => {
    liveFields.apply(snapshot(field("Hell", "Hello")));

    expect(render("Hell").textContent).toBe("Hell");
  });

  it("stops patching a node that is rendered again without a key", () => {
    const node = render("First", headingMarker("row-a", 0));
    liveFields.apply(snapshot(heading("row-a", "First")));

    renderAgain(node, "First", { ...page, path: "blocks.0.heading" });
    liveFields.apply(patchHeading("row-a", "First!"));

    expect(node.textContent).toBe("First");
  });

  it("patches a global, which has no document id", () => {
    const nav = { collectionSlug: "nav", kind: "global" } as const;
    const node = render("Menu", { ...nav, key: "links.row-a.label", path: "links.0.label" });
    liveFields.apply({
      type: VE_FIELD_SNAPSHOT_TYPE,
      ...nav,
      fields: [{ key: "links.row-a.label", saved: "Menu", value: "Menu" }],
    });

    liveFields.apply({
      type: VE_FIELD_PATCH_TYPE,
      ...nav,
      patches: [{ key: "links.row-a.label", value: "Main menu" }],
    });

    expect(node.textContent).toBe("Main menu");
  });

  it("shows the form value at once when a document returns to the page", () => {
    const node = render("Hell");
    liveFields.apply(snapshot(field("Hell", "Hello")));
    release(node);

    expect(render("Hell").textContent).toBe("Hello");
  });

  it("shows text typed while its field was off the page when the field returns", () => {
    const node = render("Hell");
    liveFields.apply(snapshot(field("Hell", "Hello")));
    release(node);
    liveFields.apply(patch("Hello again"));

    expect(render("Hell").textContent).toBe("Hello again");
  });

  it("leaves a released node alone", () => {
    const node = render("Hell");
    liveFields.apply(snapshot(field("Hell")));

    release(node);
    liveFields.apply(patch("Hello"));

    expect(node.textContent).toBe("Hell");
  });

  it("leaves a node alone that left the page before it was released", () => {
    const node = render("Hell");
    liveFields.apply(snapshot(field("Hell")));

    node.parentElement?.remove();
    liveFields.apply(patch("Hello"));

    expect(node.textContent).toBe("Hell");
  });

  it("writes through the writer it was given", () => {
    const written: [Text, string][] = [];
    liveFields = createLiveFields((node, text) => written.push([node, text]));
    const node = render("Hell");
    liveFields.apply(snapshot(field("Hell")));

    liveFields.apply(patch("Hello"));

    expect(written).toEqual([[node, "Hello"]]);
    expect(node.textContent).toBe("Hell");
  });

  describe("announces", () => {
    it("each field once, by document, the first time a node renders it", () => {
      render("Hell");
      render("First", headingMarker("row-a", 0));
      render("Related", { ...title, collectionSlug: "post", docId: "9" });
      render("Hell");

      expect(liveFields.takeNewlyRendered()).toEqual([
        { ...page, keys: ["title", headingKey("row-a")] },
        { collectionSlug: "post", kind: "collection", docId: "9", keys: ["title"] },
      ]);
      expect(liveFields.takeNewlyRendered()).toEqual([]);
    });

    it("every field rendered since the page loaded when asked for all of them", () => {
      const node = render("Hell");
      liveFields.takeNewlyRendered();
      release(node);
      render("First", headingMarker("row-a", 0));

      expect(liveFields.takeAllRendered()).toEqual([
        { ...page, keys: ["title", headingKey("row-a")] },
      ]);
      expect(liveFields.takeNewlyRendered()).toEqual([]);
    });

    it("no field it will not patch, and leaves its node alone", () => {
      document.body.setAttribute(DATA_VE_LIVE_ATTR, VE_LIVE_OFF);
      const optedOut = render("Hell");
      document.body.removeAttribute(DATA_VE_LIVE_ATTR);
      const keyless = render("First", { ...page, path: "blocks.0.heading" });
      render("Hallo", { ...title, locale: "de" });
      liveFields.apply(snapshot(field("Hell"), heading("row-a", "First")));

      liveFields.apply(patch("Hello"));
      liveFields.apply(patchHeading("row-a", "First!"));

      expect(liveFields.takeNewlyRendered()).toEqual([]);
      expect(textsOf([optedOut, keyless])).toEqual(["Hell", "First"]);
    });
  });

  describe("in a list of rows", () => {
    type Row = [rowId: string, text: string];

    const savedRows = (...rows: Row[]) =>
      snapshot(...rows.map(([rowId, text]) => heading(rowId, text)));

    const renderRows = (...rows: Row[]) =>
      rows.map(([rowId, text], index) => render(text, headingMarker(rowId, index)));

    const renderRowAgain = (node: Text | undefined, [rowId, text]: Row, index: number) =>
      renderAgain(node as Text, text, headingMarker(rowId, index));

    it("keeps every node with its row when a saved move has not been rendered yet", () => {
      const nodes = renderRows(["row-a", "First"], ["row-b", "Second"]);
      liveFields.apply(savedRows(["row-a", "First"], ["row-b", "Second"]));

      liveFields.apply(savedRows(["row-b", "Second"], ["row-a", "First"]));
      liveFields.apply(patchHeading("row-b", "Second!"));

      expect(textsOf(nodes)).toEqual(["First", "Second!"]);
    });

    it("shows text typed during a move in the node the row is rendered into afterwards", () => {
      const nodes = renderRows(["row-a", "First"], ["row-b", "Second"]);
      liveFields.apply(savedRows(["row-a", "First"], ["row-b", "Second"]));
      liveFields.apply(patchHeading("row-a", "First!"));
      liveFields.apply(snapshot(heading("row-b", "Second"), heading("row-a", "First", "First!")));

      renderRowAgain(nodes[0], ["row-b", "Second"], 0);
      renderRowAgain(nodes[1], ["row-a", "First"], 1);

      expect(textsOf(nodes)).toEqual(["Second", "First!"]);
    });

    it("tells rows with the same text apart after a row above them is deleted from a list keyed by index", () => {
      const nodes = renderRows(
        ["row-0", "Read more"],
        ["row-1", "Read more"],
        ["row-2", "Read more"]
      );
      liveFields.apply(
        savedRows(["row-0", "Read more"], ["row-1", "Read more"], ["row-2", "Read more"])
      );

      liveFields.apply(savedRows(["row-1", "Read more"], ["row-2", "Read more"]));
      renderRowAgain(nodes[0], ["row-1", "Read more"], 0);
      renderRowAgain(nodes[1], ["row-2", "Read more"], 1);
      release(nodes[2] as Text);
      liveFields.apply(patchHeading("row-2", "Read more about pricing"));

      expect(textsOf(nodes.slice(0, 2))).toEqual(["Read more", "Read more about pricing"]);
    });

    it("never shows a moved heading under its neighbour when both once had the same text", () => {
      const nodes = renderRows(["row-a", "Heading"], ["row-b", "Heading"]);
      liveFields.apply(savedRows(["row-a", "Heading"], ["row-b", "Heading"]));
      liveFields.apply(patchHeading("row-a", "Our story"));
      liveFields.apply(savedRows(["row-a", "Our story"], ["row-b", "Heading"]));
      renderRowAgain(nodes[0], ["row-a", "Our story"], 0);

      liveFields.apply(savedRows(["row-b", "Heading"], ["row-a", "Our story"]));

      expect(textsOf(nodes)).toEqual(["Our story", "Heading"]);

      renderRowAgain(nodes[0], ["row-b", "Heading"], 0);
      renderRowAgain(nodes[1], ["row-a", "Our story"], 1);

      expect(textsOf(nodes)).toEqual(["Heading", "Our story"]);
    });

    it("patches a duplicated row once its render and its snapshot are in", () => {
      renderRows(["row-a", "First"]);
      liveFields.apply(savedRows(["row-a", "First"]));

      const copy = render("First", headingMarker("row-copy", 1));
      liveFields.apply(snapshot(heading("row-a", "First"), heading("row-copy", "First", "Copy")));

      expect(copy.textContent).toBe("Copy");
    });

    it("corrects a render from an older save of a row that has moved since", () => {
      const nodes = renderRows(["row-a", "First"], ["row-b", "Second"]);
      liveFields.apply(savedRows(["row-a", "First"], ["row-b", "Second"]));
      liveFields.apply(patchHeading("row-a", "First!"));
      liveFields.apply(savedRows(["row-b", "Second"], ["row-a", "First!"]));

      renderRowAgain(nodes[0], ["row-a", "First"], 0);

      expect(textsOf(nodes)).toEqual(["First!", "Second"]);
    });
  });

  describe("with the shapes of a rich text", () => {
    const renderLeaf = (text: string, shape: string, address = "0.0", fieldKey = FIELD_KEY) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      document.body.append(paragraph);
      const node = paragraph.firstChild as Text;
      const key = nodeKey(shape, address, fieldKey);
      track({ ...page, key, path: fieldKey, richText: { fieldKey, shape }, textNode: node });
      return node;
    };

    const typeInto = (key: string, saved: string, value: string) => {
      liveFields.apply({ ...snapshot(), fields: [{ key, saved, value }] });
    };

    const renderedKeys = () => liveFields.takeAllRendered().flatMap(({ keys }) => keys);

    it("keeps the values of every node of the shape it shows", () => {
      const first = renderLeaf("One", "a", "0.0");
      renderLeaf("Two", "a", "1.0");
      typeInto(nodeKey("a", "0.0"), "One", "One!");
      release(first);

      expect(renderLeaf("One", "a", "0.0").textContent).toBe("One!");
    });

    it("forgets the nodes of the shape it showed before once nothing renders them", () => {
      const earlier = renderLeaf("One", "a");
      typeInto(nodeKey("a"), "One", "One!");
      liveFields.takeNewlyRendered();
      release(earlier);

      renderLeaf("One", "b");

      expect(renderedKeys()).toEqual([nodeKey("b")]);
      expect(renderLeaf("One", "a").textContent).toBe("One");
    });

    it("keeps a node of an earlier shape while it is rendered and forgets it once it is not", () => {
      const stillRendered = renderLeaf("One", "a", "1.0");
      const released = renderLeaf("Zero", "a", "0.0");
      release(released);

      renderLeaf("Two", "b");
      expect(renderedKeys()).toEqual([nodeKey("a", "1.0"), nodeKey("b")]);

      release(stillRendered);
      liveFields.track([]);
      expect(renderedKeys()).toEqual([nodeKey("b")]);
    });

    it("keeps the shape rendered last, though nothing renders it", () => {
      const earlier = renderLeaf("One", "a");
      const later = renderLeaf("One", "b");
      release(earlier, later);

      liveFields.track([]);

      expect(renderedKeys()).toEqual([nodeKey("b")]);
    });

    it("keeps the shapes of different fields apart", () => {
      const content = renderLeaf("One", "a");
      release(content);

      renderLeaf("Intro", "b", "0.0", "intro");

      expect(renderedKeys()).toEqual([nodeKey("a"), nodeKey("b", "0.0", "intro")]);
    });

    it("keeps the values of a shape the page names as saved, though nothing renders it", () => {
      const content = fieldAddressOf(page, FIELD_KEY);
      liveFields = createLiveFields(
        writeText,
        (richTextField, shape) => richTextField === content && shape === "saved"
      );
      const saved = renderLeaf("One", "saved");
      typeInto(nodeKey("saved"), "One", "One!");
      const earlier = renderLeaf("One", "earlier");
      release(saved, earlier);

      renderLeaf("One", "unsaved");

      expect(renderedKeys()).toEqual([nodeKey("saved"), nodeKey("unsaved")]);
      expect(renderLeaf("One", "saved").textContent).toBe("One!");
    });
  });
});
