import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Overlay } from "../../src/client/createOverlay";

import { DATA_VE_TARGET_ATTR } from "../../src/client/overlay/constants";
import { createOverlay } from "../../src/client/createOverlay";
import { DATA_VE_COLLECTION_ATTR, DATA_VE_PATH_ATTR } from "../../src/shared/protocol";

import { markedText } from "../support/markedData";
import { overlayCtx } from "../support/overlay";
import { flushMutations } from "../support/time";

const ctx = overlayCtx();

const OUTLINE_OF_THE_PAGE = "2px dashed red";

describe("an edit target that is moved out of the overlay element", () => {
  let main: HTMLElement;
  let drawer: HTMLElement;
  let heading: HTMLElement;
  let richText: HTMLElement;
  let overlay: Overlay;

  beforeEach(() => {
    document.body.innerHTML = "";
    main = document.createElement("main");
    drawer = document.createElement("aside");
    heading = document.createElement("h1");
    heading.style.outline = OUTLINE_OF_THE_PAGE;
    heading.textContent = markedText("Home", {
      collectionSlug: "page",
      docId: "1",
      kind: "collection",
      path: "title",
    });
    richText = document.createElement("div");
    richText.setAttribute(DATA_VE_PATH_ATTR, "content");
    richText.setAttribute(DATA_VE_COLLECTION_ATTR, "page");
    main.append(heading, richText);
    document.body.append(main, drawer);
    overlay = createOverlay(main, () => ctx);
  });

  afterEach(() => {
    overlay.dispose();
  });

  it("is an outlined target while it is inside", () => {
    expect(heading.getAttribute(DATA_VE_TARGET_ATTR)).toBe("title");
    expect(heading.style.outline).not.toBe(OUTLINE_OF_THE_PAGE);
    expect(richText.getAttribute(DATA_VE_TARGET_ATTR)).toBe("content");
  });

  it("gives marked text its own outline back and stops being a target", async () => {
    drawer.append(heading);
    await flushMutations();

    expect(heading.hasAttribute(DATA_VE_TARGET_ATTR)).toBe(false);
    expect(heading.style.outline).toBe(OUTLINE_OF_THE_PAGE);
  });

  it("stops a wrapper from being a target", async () => {
    drawer.append(richText);
    await flushMutations();

    expect(richText.hasAttribute(DATA_VE_TARGET_ATTR)).toBe(false);
    expect(richText.style.outline).toBe("");
  });

  it("stays a target when it is moved to another place inside", async () => {
    const section = document.createElement("section");
    main.append(section);
    section.append(heading);
    await flushMutations();

    expect(heading.getAttribute(DATA_VE_TARGET_ATTR)).toBe("title");
  });

  it("is a target again when it comes back", async () => {
    drawer.append(heading);
    await flushMutations();
    main.append(heading);
    await flushMutations();

    expect(heading.getAttribute(DATA_VE_TARGET_ATTR)).toBe("title");
  });
});
