import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Overlay, OverlayCtx } from "../../src/client/createOverlay";
import type {
  FieldListener,
  FieldMatch,
  FieldTracker,
} from "../../src/client/overlay/fieldTracker";
import type { VeFieldPatchMessage, VeFieldSnapshotMessage } from "../../src/shared/protocol";

import { DATA_VE_TARGET_ATTR } from "../../src/client/overlay/constants";
import { createOverlay } from "../../src/client/createOverlay";
import { createInstantPreview } from "../../src/client/instantPreview/instantPreview";
import {
  VE_ANNOUNCE_REQUEST_TYPE,
  VE_FIELD_PATCH_TYPE,
  VE_FIELD_SNAPSHOT_TYPE,
  VE_MESSAGE_TYPE,
  VE_FIELDS_RENDERED_TYPE,
} from "../../src/shared/protocol";

import { markedText } from "../support/markedData";
import { click, overlayCtx } from "../support/overlay";
import {
  ADMIN_ORIGIN,
  postFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
  stubOpenerWindow,
} from "../support/previewWindow";
import { flushMutations } from "../support/time";

const ctx = overlayCtx({ instantPreview: true, locale: "en", mode: "hover" });

const page = { collectionSlug: "page", kind: "collection", docId: "1", locale: "en" } as const;

const stega = (visible: string) =>
  markedText(visible, {
    path: "title",
    collectionSlug: "page",
    kind: "collection",
    docId: "1",
  });

const snapshot = (
  saved: string,
  value = saved,
  overrides: Partial<VeFieldSnapshotMessage> = {}
): VeFieldSnapshotMessage => ({
  type: VE_FIELD_SNAPSHOT_TYPE,
  ...page,
  fields: [{ key: "title", saved, value }],
  ...overrides,
});

const patch = (
  value: string,
  overrides: Partial<VeFieldPatchMessage> = {}
): VeFieldPatchMessage => ({
  type: VE_FIELD_PATCH_TYPE,
  ...page,
  patches: [{ key: "title", value }],
  ...overrides,
});

type Row = [rowId: string, text: string];

const headingKey = (rowId: string) => `blocks.${rowId}.heading`;

const markedHeading = ([rowId, text]: Row, index: number) =>
  markedText(text, {
    path: `blocks.${index}.heading`,
    collectionSlug: "page",
    kind: "collection",
    docId: "1",
    key: headingKey(rowId),
  });

const savedRows = (...rows: Row[]): VeFieldSnapshotMessage => ({
  type: VE_FIELD_SNAPSHOT_TYPE,
  ...page,
  fields: rows.map(([rowId, text]) => ({ key: headingKey(rowId), saved: text, value: text })),
});

const patchHeading = (rowId: string, value: string): VeFieldPatchMessage => ({
  type: VE_FIELD_PATCH_TYPE,
  ...page,
  patches: [{ key: headingKey(rowId), value }],
});

const announceRequest = { type: VE_ANNOUNCE_REQUEST_TYPE };

const renderedDocument = { collectionSlug: "page", kind: "collection", docId: "1" } as const;

const announcementOf = (...keys: string[]) => ({
  locale: "en",
  pageId: expect.any(String),
  rendered: keys.length > 0 ? [{ ...renderedDocument, keys }] : [],
  type: VE_FIELDS_RENDERED_TYPE,
});

const showPage = ({ persisted }: { persisted: boolean }) =>
  window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted }));

describe("instant preview in the overlay", () => {
  let main: HTMLElement;
  let heading: HTMLHeadingElement;
  let overlay: Overlay | undefined;
  let postToAdmin: ReturnType<typeof vi.fn>;

  const start = (overrides: Partial<OverlayCtx> = {}) => {
    overlay = createOverlay(main, () => ({ ...ctx, ...overrides }));
  };

  beforeEach(() => {
    overlay = undefined;
    document.body.innerHTML = "";
    main = document.createElement("main");
    heading = document.createElement("h1");
    heading.textContent = stega("Hell");
    main.append(heading);
    document.body.append(main);
    postToAdmin = vi.fn();
    stubAdminWindow({ postMessage: postToAdmin });
  });

  afterEach(() => {
    overlay?.dispose();
    restorePreviewWindow();
  });

  it("announces itself to the admin when it starts", () => {
    start();

    expect(postToAdmin).toHaveBeenCalledTimes(1);
    expect(postToAdmin).toHaveBeenCalledWith(announcementOf("title"), ADMIN_ORIGIN);
  });

  it("announces itself to its own origin when no admin origin is configured", () => {
    start({ adminOrigin: "" });

    expect(postToAdmin).toHaveBeenCalledWith(announcementOf("title"), window.location.origin);
  });

  it("states no locale when the overlay was given none", () => {
    start({ locale: undefined });

    expect(postToAdmin.mock.calls).toEqual([
      [
        {
          pageId: expect.any(String),
          rendered: announcementOf("title").rendered,
          type: VE_FIELDS_RENDERED_TYPE,
        },
        ADMIN_ORIGIN,
      ],
    ]);
  });

  it("announces itself once when the page renders no field", () => {
    heading.remove();

    start();

    expect(postToAdmin.mock.calls).toEqual([[announcementOf(), ADMIN_ORIGIN]]);
  });

  it("tells the admin which fields of which documents it renders", () => {
    const related = document.createElement("h2");
    related.textContent = markedText("Related", {
      path: "title",
      collectionSlug: "post",
      kind: "collection",
      docId: "9",
    });
    const menu = document.createElement("nav");
    menu.textContent = markedText("Menu", {
      path: "label",
      collectionSlug: "nav",
      kind: "global",
    });
    const row = document.createElement("p");
    row.textContent = markedHeading(["row-a", "First"], 0);
    main.append(related, menu, row);

    start();

    expect(postToAdmin.mock.calls).toEqual([
      [
        {
          ...announcementOf(),
          rendered: [
            { ...renderedDocument, keys: ["title", "blocks.row-a.heading"] },
            { collectionSlug: "post", kind: "collection", docId: "9", keys: ["title"] },
            { collectionSlug: "nav", kind: "global", keys: ["label"] },
          ],
        },
        ADMIN_ORIGIN,
      ],
    ]);
  });

  it("does not report a field it will not patch", () => {
    const optedOut = document.createElement("p");
    optedOut.dataset.veLive = "off";
    optedOut.textContent = markedText("Summary", { ...renderedDocument, path: "summary" });
    const keyless = document.createElement("p");
    keyless.textContent = markedText("First", {
      ...renderedDocument,
      path: "blocks.0.heading",
    });
    main.append(optedOut, keyless);

    start();

    expect(postToAdmin.mock.calls).toEqual([[announcementOf("title"), ADMIN_ORIGIN]]);
  });

  it("announces a field when the page renders it for the first time", async () => {
    start();
    postToAdmin.mockClear();

    const summary = document.createElement("p");
    summary.textContent = markedText("Summary", { ...renderedDocument, path: "summary" });
    main.append(summary);
    await flushMutations();

    expect(postToAdmin.mock.calls).toEqual([[announcementOf("summary"), ADMIN_ORIGIN]]);
  });

  it("stays quiet when a field the admin knows is rendered again", async () => {
    start();
    postToAdmin.mockClear();

    (heading.firstChild as Text).data = stega("Hello");
    await flushMutations();
    heading.textContent = stega("Hello again");
    await flushMutations();

    expect(postToAdmin).not.toHaveBeenCalled();
  });

  it("announces the fields of a commit that renders many of them together", async () => {
    const list = document.createElement("ul");
    main.append(list);
    start();
    await flushMutations();
    postToAdmin.mockClear();
    const rowIds = Array.from({ length: 25 }, (_, index) => `row-${index}`);

    for (const [index, rowId] of rowIds.entries()) {
      const item = document.createElement("li");
      item.textContent = markedHeading([rowId, "Heading"], index);
      list.append(item);
    }
    await flushMutations();

    expect(postToAdmin.mock.calls).toEqual([
      [announcementOf(...rowIds.map(headingKey)), ADMIN_ORIGIN],
    ]);
  });

  it("stays quiet when a field it rendered leaves the page and when it returns", async () => {
    const summary = document.createElement("p");
    summary.textContent = markedText("Summary", { ...renderedDocument, path: "summary" });
    main.append(summary);
    start();
    postToAdmin.mockClear();

    summary.remove();
    await flushMutations();
    main.append(summary);
    await flushMutations();

    expect(postToAdmin).not.toHaveBeenCalled();
  });

  it("stays quiet when the page renders a field without a marker", async () => {
    start();
    await flushMutations();
    postToAdmin.mockClear();

    (heading.firstChild as Text).data = "/hello";
    await flushMutations();

    expect(postToAdmin).not.toHaveBeenCalled();
  });

  it("stays quiet when the fields it renders are only moved", async () => {
    const summary = document.createElement("p");
    summary.textContent = markedText("Summary", { ...renderedDocument, path: "summary" });
    main.append(summary);
    start();
    postToAdmin.mockClear();

    main.insertBefore(summary, heading);
    await flushMutations();

    expect(postToAdmin).not.toHaveBeenCalled();
  });

  it("announces nothing after it stopped, also for a field it was about to announce", async () => {
    let fieldListener: FieldListener | undefined;
    const tracker: FieldTracker = {
      dispose: vi.fn(),
      showText: vi.fn(),
      subscribe: (listener) => {
        fieldListener = listener;
        return vi.fn();
      },
    };
    const stop = createInstantPreview(tracker, () => ctx);
    postToAdmin.mockClear();
    const summary = document.createElement("p");
    summary.textContent = "Summary";
    main.append(summary);
    fieldListener?.onFields(main, [
      { ...renderedDocument, path: "summary", textNode: summary.firstChild as Text } as FieldMatch,
    ]);

    stop();
    await flushMutations();

    expect(postToAdmin).not.toHaveBeenCalled();
  });

  it("stays silent and deaf when instant preview is off", () => {
    start({ instantPreview: false });

    postFromAdmin(snapshot("Hell", "Hello"));

    expect(postToAdmin).not.toHaveBeenCalled();
    expect(heading.textContent).toBe("Hell");
  });

  it("shows the form value as soon as the admin answers with a snapshot", () => {
    start();

    postFromAdmin(snapshot("Hell", "Hello"));

    expect(heading.textContent).toBe("Hello");
  });

  it("rewrites the heading as soon as the admin posts a patch", () => {
    start();
    postFromAdmin(snapshot("Hell"));

    postFromAdmin(patch("Hello"));

    expect(heading.textContent).toBe("Hello");
  });

  it("ignores messages from other origins", () => {
    start();

    postFromAdmin(snapshot("Hell", "Hello"), { origin: "https://evil.example.com" });

    expect(heading.textContent).toBe("Hell");
  });

  it("ignores messages from a window that is not the admin", () => {
    start();

    postFromAdmin(snapshot("Hell", "Hello"), { source: { postMessage: vi.fn() } });

    expect(heading.textContent).toBe("Hell");
  });

  it("listens to the admin window that opened it as a popup", () => {
    const opener = { closed: false, postMessage: vi.fn() };
    stubAdminWindow(window);
    stubOpenerWindow(opener);
    start();

    postFromAdmin(snapshot("Hell", "Hello"), { source: opener });
    stubOpenerWindow(null);

    expect(opener.postMessage).toHaveBeenCalledWith(announcementOf("title"), ADMIN_ORIGIN);
    expect(heading.textContent).toBe("Hello");
  });

  it("announces every field it rendered since the page loaded when the admin asks", async () => {
    const summary = document.createElement("p");
    summary.textContent = markedText("Summary", { ...renderedDocument, path: "summary" });
    main.append(summary);
    start();
    summary.remove();
    await flushMutations();
    postToAdmin.mockClear();

    postFromAdmin(announceRequest);

    expect(postToAdmin.mock.calls).toEqual([[announcementOf("title", "summary"), ADMIN_ORIGIN]]);
  });

  it("does not announce itself to another origin or another window", () => {
    start();
    postToAdmin.mockClear();

    postFromAdmin(announceRequest, { origin: "https://evil.example.com" });
    postFromAdmin(announceRequest, { source: { postMessage: vi.fn() } });

    expect(postToAdmin).not.toHaveBeenCalled();
  });

  it("announces every field again when the page is restored from the back/forward cache", async () => {
    start();
    const summary = document.createElement("p");
    summary.textContent = markedText("Short", { ...renderedDocument, path: "summary" });
    main.append(summary);
    await flushMutations();
    postToAdmin.mockClear();

    showPage({ persisted: true });

    expect(postToAdmin.mock.calls).toEqual([[announcementOf("title", "summary"), ADMIN_ORIGIN]]);
  });

  it("does not announce itself again when the page is shown after its first load", () => {
    start();
    postToAdmin.mockClear();

    showPage({ persisted: false });

    expect(postToAdmin).not.toHaveBeenCalled();
  });

  it("does not announce a restored page once the overlay is disposed", () => {
    start();
    overlay?.dispose();
    overlay = undefined;
    postToAdmin.mockClear();

    showPage({ persisted: true });

    expect(postToAdmin).not.toHaveBeenCalled();
  });

  it("accepts messages from the page origin when no admin origin is configured", () => {
    start({ adminOrigin: "" });

    postFromAdmin(snapshot("Hell", "Hello"), { origin: window.location.origin });

    expect(heading.textContent).toBe("Hello");
  });

  it("ignores messages for another locale", () => {
    start();

    postFromAdmin(snapshot("Hell", "Hola", { locale: "es" }));
    postFromAdmin(patch("Hola!", { locale: "es" }));

    expect(heading.textContent).toBe("Hell");
  });

  it("ignores malformed messages", () => {
    start();
    postFromAdmin(snapshot("Hell"));

    expect(() => {
      postFromAdmin({ type: VE_FIELD_SNAPSHOT_TYPE });
      postFromAdmin({ type: VE_FIELD_PATCH_TYPE });
      postFromAdmin({ ...snapshot("Hell"), fields: [{ key: "title", saved: "Hell" }] });
      postFromAdmin({ ...patch("Hello"), patches: [{ key: "title", value: 5 }] });
      postFromAdmin({ ...patch("Hello"), kind: "document" });
      postFromAdmin(null);
    }).not.toThrow();

    expect(heading.textContent).toBe("Hell");
  });

  it("keeps patching after the editor types a narrow no-break space", async () => {
    start();
    postFromAdmin(snapshot("Hell"));

    postFromAdmin(patch("10\u202F%"));
    await flushMutations();
    postFromAdmin(patch("10\u202F% off"));

    expect(heading.textContent).toBe("10\u202F% off");
  });

  it("keeps the typed value when a stale render arrives after the patch", async () => {
    start();
    postFromAdmin(snapshot("Hell"));
    postFromAdmin(patch("Hello"));

    (heading.firstChild as Text).textContent = stega("Hell");
    await flushMutations();

    expect(heading.textContent).toBe("Hello");
  });

  it("tracks a field whose text is rendered into an element that was empty", async () => {
    heading.textContent = "";
    start();
    postFromAdmin(snapshot("", ""));

    heading.textContent = stega("Hell");
    await flushMutations();
    postFromAdmin(snapshot("Hell"));
    postFromAdmin(patch("Hello"));

    expect(heading.getAttribute(DATA_VE_TARGET_ATTR)).toBe("title");
    expect(heading.textContent).toBe("Hello");
  });

  it("patches while the edit targets are switched off", () => {
    start({ mode: "off" });

    postFromAdmin(snapshot("Hell", "Hello"));

    expect(heading.textContent).toBe("Hello");
    expect(main.querySelector(`[${DATA_VE_TARGET_ATTR}]`)).toBeNull();
  });

  it("keeps the typed value when the edit targets are switched on and off", () => {
    let mode: OverlayCtx["mode"] = "off";
    overlay = createOverlay(main, () => ({ ...ctx, mode }));
    postFromAdmin(snapshot("Hell", "Hello"));

    mode = "always";
    overlay?.applyMode();

    expect(heading.textContent).toBe("Hello");
    expect(heading.getAttribute(DATA_VE_TARGET_ATTR)).toBe("title");

    mode = "off";
    overlay?.applyMode();

    expect(heading.textContent).toBe("Hello");
    expect(heading.hasAttribute(DATA_VE_TARGET_ATTR)).toBe(false);
  });

  it("stops listening after dispose", () => {
    start();
    overlay?.dispose();

    postFromAdmin(snapshot("Hell", "Hello"));

    expect(heading.textContent).toBe(stega("Hell"));
  });

  it("leaves a detached node alone", async () => {
    start();
    postFromAdmin(snapshot("Hell"));

    heading.remove();
    await flushMutations();
    postFromAdmin(patch("Hello"));

    expect(heading.textContent).toBe(stega("Hell"));
  });

  it("edits and patches a node again after it left the page and came back", async () => {
    start();
    postFromAdmin(snapshot("Hell"));
    postFromAdmin(patch("Hello"));

    heading.remove();
    await flushMutations();
    main.append(heading);
    await flushMutations();
    postFromAdmin(snapshot("Hell", "Hello"));

    expect(heading.getAttribute(DATA_VE_TARGET_ATTR)).toBe("title");
    expect(heading.textContent).toBe("Hello");

    postFromAdmin(patch("Hello!"));

    expect(heading.textContent).toBe("Hello!");
  });
  describe("when the page renders a value without a marker", () => {
    const renderWithoutMarker = async (text: string) => {
      (heading.firstChild as Text).data = text;
      await flushMutations();
    };

    it("stops patching the node", async () => {
      start();
      postFromAdmin(snapshot("Hell"));

      await renderWithoutMarker("hello-world");
      postFromAdmin(snapshot("hello-world"));
      postFromAdmin(patch("hello-world!"));

      expect(heading.textContent).toBe("hello-world");
    });

    it("stops patching the node when it had already shown that value live", async () => {
      start();
      postFromAdmin(snapshot("Hell"));
      postFromAdmin(patch("hello-world"));
      await flushMutations();

      await renderWithoutMarker("hello-world");
      postFromAdmin(patch("hello-world!"));

      expect(heading.textContent).toBe("hello-world");
    });

    it("stops patching a node that was patched while it was outside the overlay element", async () => {
      start();
      await flushMutations();
      postFromAdmin(snapshot("Hell"));
      document.body.append(heading);
      postFromAdmin(patch("Hello"));
      await flushMutations();
      main.append(heading);
      await flushMutations();

      await renderWithoutMarker("hello-world");
      postFromAdmin(snapshot("hello-world"));
      postFromAdmin(patch("hello-world!"));

      expect(heading.textContent).toBe("hello-world");
    });

    it("does not bring the earlier text back when the overlay stops", async () => {
      start();
      postFromAdmin(snapshot("Hell"));
      await renderWithoutMarker("hello-world");

      overlay?.dispose();

      expect(heading.textContent).toBe("hello-world");
    });

    it("patches the node again once a marker is rendered into it", async () => {
      start();
      postFromAdmin(snapshot("Hell"));
      await renderWithoutMarker("hello-world");

      (heading.firstChild as Text).data = stega("Hello world");
      await flushMutations();
      postFromAdmin(snapshot("Hello world"));
      postFromAdmin(patch("Hello world!"));

      expect(heading.textContent).toBe("Hello world!");
    });
  });

  describe("with a list of rows", () => {
    let list: HTMLUListElement;

    const renderList = (...rows: Row[]) => {
      list = document.createElement("ul");
      for (const [index, row] of rows.entries()) {
        const item = document.createElement("li");
        item.textContent = markedHeading(row, index);
        list.append(item);
      }
      main.append(list);
      return Array.from(list.children) as HTMLLIElement[];
    };

    const renderInto = (item: HTMLLIElement, row: Row, index: number) => {
      (item.firstChild as Text).data = markedHeading(row, index);
    };

    const shownTexts = () => Array.from(list.children).map((item) => item.textContent);

    it("follows a move in a list keyed by row id, where React moves the elements", async () => {
      const [first, second] = renderList(["row-a", "Heading"], ["row-b", "Heading"]);
      start();
      postFromAdmin(savedRows(["row-a", "Heading"], ["row-b", "Heading"]));

      postFromAdmin(savedRows(["row-b", "Heading"], ["row-a", "Heading"]));
      list.insertBefore(second as Node, first as Node);
      renderInto(second as HTMLLIElement, ["row-b", "Heading"], 0);
      renderInto(first as HTMLLIElement, ["row-a", "Heading"], 1);
      await flushMutations();
      postFromAdmin(patchHeading("row-b", "Heading of B"));

      expect(shownTexts()).toEqual(["Heading of B", "Heading"]);
    });

    it("follows a move in a list keyed by index, where React renders other rows into the same elements", async () => {
      const [first, second] = renderList(["row-a", "Heading"], ["row-b", "Heading"]);
      start();
      postFromAdmin(savedRows(["row-a", "Heading"], ["row-b", "Heading"]));

      postFromAdmin(savedRows(["row-b", "Heading"], ["row-a", "Heading"]));
      renderInto(first as HTMLLIElement, ["row-b", "Heading"], 0);
      renderInto(second as HTMLLIElement, ["row-a", "Heading"], 1);
      await flushMutations();
      postFromAdmin(patchHeading("row-b", "Heading of B"));

      expect(shownTexts()).toEqual(["Heading of B", "Heading"]);
    });

    it("keeps rows with the same text apart when a row above them is deleted", async () => {
      const [intro, ...links] = renderList(
        ["row-0", "Intro"],
        ["row-1", "Read more"],
        ["row-2", "Read more"],
        ["row-3", "Read more"]
      );
      start();
      postFromAdmin(
        savedRows(
          ["row-0", "Intro"],
          ["row-1", "Read more"],
          ["row-2", "Read more"],
          ["row-3", "Read more"]
        )
      );

      postFromAdmin(
        savedRows(["row-1", "Read more"], ["row-2", "Read more"], ["row-3", "Read more"])
      );
      intro?.remove();
      for (const [index, link] of links.entries()) {
        renderInto(link, [`row-${index + 1}`, "Read more"], index);
      }
      await flushMutations();
      postFromAdmin(patchHeading("row-2", "Read more about pricing"));

      expect(shownTexts()).toEqual(["Read more", "Read more about pricing", "Read more"]);
    });

    const openHeading = (rowId: string, index: number) => ({
      type: VE_MESSAGE_TYPE,
      ...page,
      key: headingKey(rowId),
      path: `blocks.${index}.heading`,
    });

    it("asks the admin to open a clicked field by the key of its row", () => {
      const [, second] = renderList(["row-a", "First"], ["row-b", "Second"]);
      start();
      postToAdmin.mockClear();

      click(second as HTMLLIElement);

      expect(postToAdmin.mock.calls).toEqual([[openHeading("row-b", 1), ADMIN_ORIGIN]]);
    });

    it("asks for the row an element shows now in a list keyed by index", async () => {
      const [first, second] = renderList(["row-a", "First"], ["row-b", "Second"]);
      start();
      renderInto(first as HTMLLIElement, ["row-b", "Second"], 0);
      renderInto(second as HTMLLIElement, ["row-a", "First"], 1);
      await flushMutations();
      postToAdmin.mockClear();

      click(first as HTMLLIElement);

      expect(postToAdmin.mock.calls).toEqual([[openHeading("row-b", 0), ADMIN_ORIGIN]]);
    });

    it("leaves a row alone when the page was rendered before markers stated a key", () => {
      const [first] = renderList(["row-a", "Heading"]);
      (first as HTMLLIElement).textContent = markedText("Heading", {
        path: "blocks.0.heading",
        collectionSlug: "page",
        kind: "collection",
        docId: "1",
      });
      start();

      postFromAdmin(savedRows(["row-a", "Heading"]));
      postFromAdmin(patchHeading("row-a", "Heading of A"));

      expect(shownTexts()).toEqual(["Heading"]);
    });
  });
});
