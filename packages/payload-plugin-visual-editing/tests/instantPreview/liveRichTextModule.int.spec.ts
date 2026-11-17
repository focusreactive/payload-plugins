import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  LiveRichText,
  RenderUnsavedRichText,
} from "../../src/client/instantPreview/unsavedRender/liveRichText";
import type { RenderOfShape } from "../../src/client/instantPreview/unsavedRender/unsavedRender";
import type { LiveRichTextField, LiveRichTextRequest } from "../../src/shared/protocol";

import { createLiveRichText } from "../../src/client/instantPreview/unsavedRender/liveRichText";
import { createSavedRichTextShapes } from "../../src/client/instantPreview/unsavedRender/savedShapes";
import { VE_RICH_TEXT_RENDERED_TYPE, VE_RICH_TEXT_STRUCTURE_TYPE } from "../../src/shared/protocol";
import { keyedFieldAddressOf } from "../../src/shared/veDocument";

import {
  ADMIN_ORIGIN,
  postFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
} from "../support/previewWindow";

const PAGE = { collectionSlug: "page", docId: "1", kind: "collection" } as const;
const BODY: LiveRichTextField = { ...PAGE, key: "body" };
const SAVED: RenderOfShape<string> = { node: "Saved render", shape: "saved-shape" };

type PendingRender = {
  request: LiveRichTextRequest;
  finishWith: (node: string | null) => Promise<void>;
};

const stateOf = (text: string) => ({ root: { children: [{ text, type: "text" }], type: "root" } });

const structureOf = (shape: string, text: string | null, key = BODY.key) => ({
  ...PAGE,
  key,
  locale: "en",
  shape,
  state: text === null ? null : stateOf(text),
  type: VE_RICH_TEXT_STRUCTURE_TYPE,
});

const settle = async () => {
  await vi.advanceTimersByTimeAsync(0);
};

function screenOf(liveRichText: () => LiveRichText<string>) {
  let saved = SAVED;
  let shown = SAVED.node;
  const show = () => {
    const live = liveRichText();
    const next = live.shownFor(live.snapshot(), saved);
    shown = next.node;
    next.commit();
  };
  return {
    save: (next: RenderOfShape<string>) => {
      saved = next;
      show();
    },
    show,
    shown: () => shown,
  };
}

describe("live rich text", () => {
  let renders: PendingRender[];
  let postToAdmin: ReturnType<typeof vi.fn>;
  let live: LiveRichText<string>;
  let screen: ReturnType<typeof screenOf>;
  const savedShapes = createSavedRichTextShapes();

  const render: RenderUnsavedRichText<string> = (request) =>
    new Promise((resolve) => {
      renders.push({
        finishWith: (node) => {
          resolve(node);
          return settle();
        },
        request,
      });
    });

  beforeEach(() => {
    vi.useFakeTimers();
    renders = [];
    postToAdmin = vi.fn();
    stubAdminWindow({ postMessage: postToAdmin });
    screen = screenOf(() => live);
    live = createLiveRichText<string>({
      adminPage: () => ({ adminOrigin: ADMIN_ORIGIN, locale: "en" }),
      field: BODY,
      onChange: () => screen.show(),
      render,
      savedShape: SAVED.shape,
      savedShapes,
    });
  });

  afterEach(() => {
    live.stop();
    restorePreviewWindow();
    vi.useRealTimers();
  });

  it("announces the field to the admin as soon as it listens", async () => {
    await settle();

    expect(postToAdmin).toHaveBeenCalledWith(
      expect.objectContaining({
        rendered: [expect.objectContaining({ ...PAGE, keys: [BODY.key] })],
        type: VE_RICH_TEXT_RENDERED_TYPE,
      }),
      ADMIN_ORIGIN
    );
  });

  it("asks for a render of a structure the admin holds and shows it once it is rendered", async () => {
    postFromAdmin(structureOf("unsaved", "Typed"));

    expect(renders.map(({ request }) => request)).toEqual([
      { field: BODY, locale: "en", state: stateOf("Typed") },
    ]);
    expect(screen.shown()).toBe(SAVED.node);

    await renders[0]?.finishWith("Unsaved render");

    expect(screen.shown()).toBe("Unsaved render");
  });

  it("ignores the structure of another field", () => {
    postFromAdmin(structureOf("unsaved", "Typed", "intro"));

    expect(renders).toHaveLength(0);
  });

  it("shows the saved render again when the editor returns to the saved structure", async () => {
    postFromAdmin(structureOf("unsaved", "Typed"));
    await renders[0]?.finishWith("Unsaved render");

    postFromAdmin(structureOf(SAVED.shape, null));

    expect(screen.shown()).toBe(SAVED.node);
  });

  it("keeps the unsaved render until a saved render of that structure arrives", async () => {
    postFromAdmin(structureOf("unsaved", "Typed"));
    await renders[0]?.finishWith("Unsaved render");

    screen.save({ node: "Saved again", shape: SAVED.shape });
    expect(screen.shown()).toBe("Unsaved render");

    screen.save({ node: "Saved unsaved", shape: "unsaved" });
    expect(screen.shown()).toBe("Saved unsaved");
  });

  it("names the saved structure for the overlay and forgets it when it stops", () => {
    const address = keyedFieldAddressOf(BODY);
    expect(savedShapes.keeps(address, SAVED.shape)).toBe(true);

    screen.save({ node: "Saved again", shape: "next-saved" });
    expect(savedShapes.keeps(address, SAVED.shape)).toBe(false);
    expect(savedShapes.keeps(address, "next-saved")).toBe(true);

    live.stop();
    expect(savedShapes.keeps(address, "next-saved")).toBe(false);
  });

  it("stops listening to the admin when it stops", () => {
    live.stop();

    postFromAdmin(structureOf("unsaved", "Typed"));

    expect(renders).toHaveLength(0);
  });
});
