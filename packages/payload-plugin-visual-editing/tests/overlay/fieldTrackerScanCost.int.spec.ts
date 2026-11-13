import { vercelStegaDecode } from "@vercel/stega";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldTracker } from "../../src/client/overlay/fieldTracker";

import { createFieldTracker } from "../../src/client/overlay/fieldTracker";
import {
  DATA_VE_COLLECTION_ATTR,
  DATA_VE_DOC_ID_ATTR,
  DATA_VE_KEY_ATTR,
  DATA_VE_KIND_ATTR,
  DATA_VE_PATH_ATTR,
} from "../../src/shared/protocol";

import { markedText, markedTextNode } from "../support/markedData";
import { flushMutations } from "../support/time";

vi.mock("@vercel/stega", async (importOriginal) => {
  const stega = await importOriginal<typeof import("@vercel/stega")>();
  return { ...stega, vercelStegaDecode: vi.fn(stega.vercelStegaDecode) };
});

const CONTENT_ATTRIBUTES = {
  [DATA_VE_COLLECTION_ATTR]: "pages",
  [DATA_VE_DOC_ID_ATTR]: "1",
  [DATA_VE_KIND_ATTR]: "collection",
  [DATA_VE_PATH_ATTR]: "content",
};

const PAGE = { collectionSlug: "pages", docId: "1", kind: "collection" } as const;
const SHAPE = "abc123";

describe("the cost of a field tracker scan", () => {
  let main: HTMLElement;
  let content: HTMLElement;
  let tracker: FieldTracker | undefined;

  const textWalks = () =>
    vi
      .mocked(document.createTreeWalker)
      .mock.calls.filter(([, whatToShow]) => whatToShow === NodeFilter.SHOW_TEXT);

  beforeEach(() => {
    document.body.innerHTML = "";
    main = document.createElement("main");
    const title = document.createElement("h1");
    title.textContent = markedText("Title", { ...PAGE, path: "title" });
    content = document.createElement("div");
    for (const [name, value] of Object.entries(CONTENT_ATTRIBUTES)) {
      content.setAttribute(name, value);
    }
    for (const [visible, node] of [
      ["Hello ", "0.0"],
      ["world", "0.1"],
    ] as const) {
      const span = document.createElement("span");
      span.textContent = markedTextNode(visible, node, SHAPE);
      content.append(span);
    }
    main.append(title, content, "plain text");
    document.body.append(main);
    vi.spyOn(document, "createTreeWalker");
    vi.mocked(vercelStegaDecode).mockClear();
  });

  afterEach(() => {
    tracker?.dispose();
    vi.restoreAllMocks();
  });

  it("walks the text of the page and decodes each marker once, and only walks a root again when it is scanned again", async () => {
    tracker = createFieldTracker(main);

    expect(textWalks()).toHaveLength(1);
    expect(vercelStegaDecode).toHaveBeenCalledTimes(3);

    vi.mocked(document.createTreeWalker).mockClear();
    vi.mocked(vercelStegaDecode).mockClear();
    content.setAttribute(DATA_VE_KEY_ATTR, "content");
    await flushMutations();

    expect(textWalks()).toHaveLength(1);
    expect(vercelStegaDecode).not.toHaveBeenCalled();
  });

  it("walks the text of a commit once when it brings an element and something inside it", async () => {
    tracker = createFieldTracker(main);
    vi.mocked(document.createTreeWalker).mockClear();
    const section = document.createElement("section");
    const heading = document.createElement("h2");
    section.append(heading);
    main.append(section);
    heading.textContent = markedText("Section", { ...PAGE, path: "section" });
    await flushMutations();

    expect(textWalks()).toHaveLength(1);
  });
});
