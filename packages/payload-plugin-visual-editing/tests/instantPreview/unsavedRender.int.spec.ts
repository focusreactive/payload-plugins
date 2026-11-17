import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  RenderOfShape,
  UnsavedRender,
  UnsavedRenderState,
  UnsavedStructure,
} from "../../src/client/instantPreview/unsavedRender/unsavedRender";

import {
  COMMIT_WAIT_MS,
  createUnsavedRender,
  heldSavedOf,
  inPlaceOfSaved,
  MOST_RETRIES_OF_A_STRUCTURE,
  NOTHING_TOLD,
  RENDER_TIMEOUT_MS,
  RETRY_AFTER_MS,
  SERVER_CHECK_PAUSE_MS,
  STRUCTURE_SETTLE_MS,
} from "../../src/client/instantPreview/unsavedRender/unsavedRender";

const SAVED_SHAPE = "saved-shape";
const SAVED_RENDER = "Saved render";

type Call = {
  finishWith: (node: string | null | Error) => Promise<void>;
  signal: AbortSignal;
  structure: UnsavedStructure;
};

const FAILURE = new Error("The action failed");

const stateOf = (text: string) => ({ root: { children: [{ text, type: "text" }], type: "root" } });

const wait = async (ms = 0) => {
  await vi.advanceTimersByTimeAsync(ms);
};

const LONGEST_RETRY_AFTER_MS = RETRY_AFTER_MS * 2 ** (MOST_RETRIES_OF_A_STRUCTURE - 1);

type LocalRender = (structure: UnsavedStructure) => string | null | Promise<string | null>;

const textOfStructure = ({ state }: UnsavedStructure) =>
  (state as ReturnType<typeof stateOf>).root.children[0]?.text;

const renderedHere: LocalRender = (structure) => `Local ${textOfStructure(structure)}`;

function liveRichText({
  commitsRenders = true,
  optimistic,
}: { commitsRenders?: boolean; optimistic?: LocalRender } = {}) {
  const calls: Call[] = [];
  let state: UnsavedRenderState<string> = NOTHING_TOLD;
  let saved: RenderOfShape<string> = { node: SAVED_RENDER, shape: SAVED_SHAPE };
  let held = saved;
  const page: { unsavedRender?: UnsavedRender<string> } = {};
  const commit = () => {
    held = heldSavedOf(held, saved, state.editorShape);
    page.unsavedRender?.committed(state, saved.shape);
  };
  const unsavedRender = createUnsavedRender<string>({
    onChange: (change, isRender) => {
      state = { ...state, ...change };
      if (commitsRenders || !isRender) commit();
    },
    render: (structure, signal) =>
      new Promise((resolve, reject) => {
        calls.push({
          finishWith: (node) => {
            if (node instanceof Error) reject(node);
            else resolve(node);
            return wait();
          },
          signal,
          structure,
        });
      }),
    optimistic,
    savedShape: saved.shape,
    shown: state,
  });
  page.unsavedRender = unsavedRender;

  return {
    calls,
    commit,
    renderedTexts: () => calls.map(({ structure }) => structure.state),
    save: (shape: string, node = `Saved ${shape}`) => {
      saved = { node, shape };
      commit();
    },
    shown: () => inPlaceOfSaved(state, saved, held),
    stop: unsavedRender.stop,
    tell: (shape: string, text: string | null) =>
      unsavedRender.tell({ locale: "en", shape, state: text === null ? null : stateOf(text) }),
  };
}

describe("the unsaved render of a live rich text", () => {
  let field: ReturnType<typeof liveRichText>;

  beforeEach(() => {
    vi.useFakeTimers();
    field = liveRichText();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the saved render until the editor holds another structure", () => {
    expect(field.shown()).toBe(SAVED_RENDER);
    expect(field.calls).toHaveLength(0);
  });

  it("keeps the saved render while the unsaved one is on its way, then shows it", async () => {
    field.tell("unsaved", "Typed");
    await wait(STRUCTURE_SETTLE_MS);

    expect(field.calls.map(({ structure }) => structure)).toEqual([
      { locale: "en", shape: "unsaved", state: stateOf("Typed") },
    ]);
    expect(field.shown()).toBe(SAVED_RENDER);

    await field.calls[0]?.finishWith("Unsaved render");

    expect(field.shown()).toBe("Unsaved render");
  });

  describe("waits a moment for the next structure before it starts a call", () => {
    it("and starts one call for the structures told within it", async () => {
      field.tell("paragraph", "");
      await wait(STRUCTURE_SETTLE_MS - 1);
      field.tell("paragraph-with-text", "T");

      expect(field.calls).toHaveLength(0);

      await wait(1);

      expect(field.renderedTexts()).toEqual([stateOf("T")]);
    });

    it("and starts a second call for a structure told after it", async () => {
      field.tell("paragraph", "");
      await wait(STRUCTURE_SETTLE_MS);
      field.tell("paragraph-with-text", "T");
      await field.calls[0]?.finishWith("Paragraph render");

      expect(field.renderedTexts()).toEqual([stateOf(""), stateOf("T")]);
    });

    it("and starts no call once the editor is back on the saved structure within it", async () => {
      field.tell("paragraph", "");
      field.tell(SAVED_SHAPE, null);
      await wait(STRUCTURE_SETTLE_MS);

      expect(field.calls).toHaveLength(0);
      expect(field.shown()).toBe(SAVED_RENDER);
    });

    it("and starts no call once it stopped within it", async () => {
      field.tell("paragraph", "");
      field.stop();
      await wait(STRUCTURE_SETTLE_MS);

      expect(field.calls).toHaveLength(0);
    });
  });

  it("has one call out at a time and renders only the latest state told meanwhile", async () => {
    field.tell("first", "One");
    await wait(STRUCTURE_SETTLE_MS);
    field.tell("second", "Two");
    field.tell("third", "Three");

    expect(field.calls[0]?.signal.aborted).toBe(false);

    await field.calls[0]?.finishWith("First render");

    expect(field.shown()).toBe("First render");
    expect(field.renderedTexts()).toEqual([stateOf("One"), stateOf("Three")]);

    await field.calls[1]?.finishWith("Third render");

    expect(field.shown()).toBe("Third render");
    expect(field.calls).toHaveLength(2);
  });

  it("cancels the call and renders no waiting state once the editor is back on the saved structure", async () => {
    field.tell("first", "One");
    await wait(STRUCTURE_SETTLE_MS);
    field.tell("second", "Two");
    field.tell(SAVED_SHAPE, null);

    expect(field.calls[0]?.signal.aborted).toBe(true);

    await field.calls[0]?.finishWith("First render");

    expect(field.calls).toHaveLength(1);
    expect(field.shown()).toBe(SAVED_RENDER);
  });

  describe("chooses between the saved and the unsaved render", () => {
    beforeEach(async () => {
      field.tell("unsaved", "Typed");
      await wait(STRUCTURE_SETTLE_MS);
      await field.calls[0]?.finishWith("Unsaved render");
    });

    it("shows the saved render once it has the editor's structure", () => {
      field.save("unsaved");

      expect(field.shown()).toBe("Saved unsaved");
    });

    it("keeps the unsaved render when a saved render of another structure arrives", () => {
      field.save("saved-earlier");

      expect(field.shown()).toBe("Unsaved render");
    });

    it("shows the saved render of the structure on screen while a newer one is on its way", () => {
      field.tell("second", "Two");
      field.save("unsaved");

      expect(field.shown()).toBe("Saved unsaved");
    });

    it("shows the editor's structure over the save of an edit that was undone", async () => {
      field.tell(SAVED_SHAPE, null);
      field.tell(SAVED_SHAPE, "Typed after the undo");
      field.save("unsaved");

      expect(field.shown()).toBe(SAVED_RENDER);

      await wait(STRUCTURE_SETTLE_MS);
      await field.calls[1]?.finishWith("Editor render");

      expect(field.shown()).toBe("Editor render");
    });
  });

  describe.each([
    ["fails", FAILURE],
    ["has nothing to render", null],
  ])("when a call %s", (_name, answer) => {
    beforeEach(async () => {
      field.tell("first", "One");
      await wait(STRUCTURE_SETTLE_MS);
      await field.calls[0]?.finishWith("First render");
      field.tell("second", "Two");
      await wait(STRUCTURE_SETTLE_MS);
    });

    it("shows the saved render", async () => {
      await field.calls[1]?.finishWith(answer);

      expect(field.shown()).toBe(SAVED_RENDER);
    });

    it("renders the state that waited behind it", async () => {
      field.tell("third", "Three");
      await field.calls[1]?.finishWith(answer);
      await field.calls[2]?.finishWith("Third render");

      expect(field.renderedTexts()).toEqual([stateOf("One"), stateOf("Two"), stateOf("Three")]);
      expect(field.shown()).toBe("Third render");
    });

    it("renders the next structure told after it", async () => {
      await field.calls[1]?.finishWith(answer);
      field.tell("third", "Three");
      await wait(STRUCTURE_SETTLE_MS);
      await field.calls[2]?.finishWith("Third render");

      expect(field.shown()).toBe("Third render");
    });
  });

  describe("a render of a structure the editor left", () => {
    it("is not shown while the page shows the editor's structure", async () => {
      field.tell("second", "Two");
      await wait(STRUCTURE_SETTLE_MS);
      await field.calls[0]?.finishWith("Second render");
      field.tell("third", "Three");
      await wait(STRUCTURE_SETTLE_MS);
      field.tell("second", "Two again");

      await field.calls[1]?.finishWith("Third render");

      expect(field.shown()).toBe("Second render");

      await field.calls[2]?.finishWith("Second render again");

      expect(field.shown()).toBe("Second render again");
    });

    it("leaves the saved render of the editor's structure on screen", async () => {
      field.tell("unsaved", "Typed");
      await wait(STRUCTURE_SETTLE_MS);
      field.save("unsaved", SAVED_RENDER);
      field.tell("left", "Left");
      field.tell("unsaved", "Typed again");

      await field.calls[0]?.finishWith("Unsaved render");
      await field.calls[1]?.finishWith("Left render");

      expect(field.shown()).toBe(SAVED_RENDER);
    });
  });

  describe("waits for the commit of a render before the next call", () => {
    beforeEach(async () => {
      field = liveRichText({ commitsRenders: false });
      field.tell("first", "One");
      await wait(STRUCTURE_SETTLE_MS);
      field.tell("second", "Two");
    });

    it("until the page committed it", async () => {
      await field.calls[0]?.finishWith("First render");

      expect(field.calls).toHaveLength(1);

      field.commit();
      await wait();

      expect(field.renderedTexts()).toEqual([stateOf("One"), stateOf("Two")]);
    });

    it("no longer than the commit wait", async () => {
      await field.calls[0]?.finishWith("First render");
      await wait(COMMIT_WAIT_MS - 1);

      expect(field.calls).toHaveLength(1);

      await wait(1);

      expect(field.calls).toHaveLength(2);
    });
  });

  describe("asks again for the editor's structure when a call had nothing to render", () => {
    beforeEach(async () => {
      field.tell("unsaved", "Typed");
      await wait(STRUCTURE_SETTLE_MS);
      await field.calls[0]?.finishWith(null);
    });

    const giveUpEachRetry = async (retries: number) => {
      for (let attempt = 0; attempt < retries; attempt += 1) {
        await wait(LONGEST_RETRY_AFTER_MS);
        await field.calls.at(-1)?.finishWith(null);
      }
    };

    it("after a while, and shows the render", async () => {
      await wait(RETRY_AFTER_MS);
      await field.calls[1]?.finishWith("Unsaved render");

      expect(field.renderedTexts()).toEqual([stateOf("Typed"), stateOf("Typed")]);
      expect(field.shown()).toBe("Unsaved render");
    });

    it("waiting twice as long before each next try", async () => {
      await wait(RETRY_AFTER_MS);
      await field.calls[1]?.finishWith(null);
      await wait(RETRY_AFTER_MS);

      expect(field.calls).toHaveLength(2);

      await wait(RETRY_AFTER_MS);

      expect(field.calls).toHaveLength(3);
    });

    it("giving up on a structure after its last retry", async () => {
      await giveUpEachRetry(MOST_RETRIES_OF_A_STRUCTURE + 2);

      expect(field.calls).toHaveLength(MOST_RETRIES_OF_A_STRUCTURE + 1);
    });

    it("and again for the next structure after giving up on one", async () => {
      await giveUpEachRetry(MOST_RETRIES_OF_A_STRUCTURE);
      field.tell("edited", "Edited");
      await wait(STRUCTURE_SETTLE_MS);
      await field.calls.at(-1)?.finishWith(null);
      await wait(RETRY_AFTER_MS);

      expect(field.renderedTexts().slice(-2)).toEqual([stateOf("Edited"), stateOf("Edited")]);
    });

    it.each([
      ["once the editor is back on the saved structure", () => field.tell(SAVED_SHAPE, null)],
      ["once the saved render has the editor's structure", () => field.save("unsaved")],
    ])("not %s", async (_name, leave) => {
      leave();
      await wait(LONGEST_RETRY_AFTER_MS);

      expect(field.calls).toHaveLength(1);
    });
  });

  describe("when a render does not return in time", () => {
    beforeEach(async () => {
      field.tell("first", "One");
      await wait(STRUCTURE_SETTLE_MS);
      await field.calls[0]?.finishWith("First render");
      field.tell("second", "Two");
      await wait(STRUCTURE_SETTLE_MS);
      field.tell("third", "Three");
      await wait(RENDER_TIMEOUT_MS);
    });

    it("cancels the call and shows the saved render", () => {
      expect(field.calls[1]?.signal.aborted).toBe(true);
      expect(field.shown()).toBe(SAVED_RENDER);
    });

    it("starts no other call while that one has not returned", () => {
      field.tell("fourth", "Four");

      expect(field.renderedTexts()).toEqual([stateOf("One"), stateOf("Two")]);
    });

    it("ignores what that call returns in the end and renders the latest state", async () => {
      field.tell("fourth", "Four");

      await field.calls[1]?.finishWith("Second render");

      expect(field.shown()).toBe(SAVED_RENDER);
      expect(field.renderedTexts()).toEqual([stateOf("One"), stateOf("Two"), stateOf("Four")]);

      await field.calls[2]?.finishWith("Fourth render");

      expect(field.shown()).toBe("Fourth render");
    });
  });

  it("cancels its call when it stops and ignores what it returns", async () => {
    field.tell("unsaved", "Typed");
    await wait(STRUCTURE_SETTLE_MS);

    field.stop();
    await field.calls[0]?.finishWith("Unsaved render");

    expect(field.calls[0]?.signal.aborted).toBe(true);
    expect(field.shown()).toBe(SAVED_RENDER);
  });

  describe("with a render on the page", () => {
    beforeEach(() => {
      field = liveRichText({ optimistic: renderedHere });
    });

    it("shows the structure rendered on the page as it is told, before any call", () => {
      field.tell("unsaved", "Typed");

      expect(field.shown()).toBe("Local Typed");
      expect(field.calls).toHaveLength(0);
    });

    it("starts one call a pause after the last structure", async () => {
      field.tell("paragraph", "");
      await wait(SERVER_CHECK_PAUSE_MS - 1);
      field.tell("paragraph-with-text", "T");
      await wait(SERVER_CHECK_PAUSE_MS - 1);

      expect(field.calls).toHaveLength(0);
      expect(field.shown()).toBe("Local T");

      await wait(1);

      expect(field.renderedTexts()).toEqual([stateOf("T")]);
    });

    it("shows the answer of the call in place of the render on the page", async () => {
      field.tell("unsaved", "Typed");
      await wait(SERVER_CHECK_PAUSE_MS);

      await field.calls[0]?.finishWith("Server Typed");

      expect(field.shown()).toBe("Server Typed");
    });

    it("keeps the render on the page when the call answers nothing", async () => {
      field.tell("unsaved", "Typed");
      await wait(SERVER_CHECK_PAUSE_MS);

      await field.calls[0]?.finishWith(null);

      expect(field.shown()).toBe("Local Typed");
    });

    it("keeps the render on the page when the call does not return in time", async () => {
      field.tell("unsaved", "Typed");
      await wait(SERVER_CHECK_PAUSE_MS + RENDER_TIMEOUT_MS);

      expect(field.calls[0]?.signal.aborted).toBe(true);
      expect(field.shown()).toBe("Local Typed");
    });

    it("drops the answer for a structure the editor left", async () => {
      field.tell("first", "One");
      await wait(SERVER_CHECK_PAUSE_MS);
      field.tell("second", "Two");

      await field.calls[0]?.finishWith("Server One");

      expect(field.shown()).toBe("Local Two");
    });

    describe("never has two calls out", () => {
      it("and starts the next one once the first returned and the pause passed", async () => {
        field.tell("first", "One");
        await wait(SERVER_CHECK_PAUSE_MS);
        field.tell("second", "Two");
        await wait(SERVER_CHECK_PAUSE_MS);

        expect(field.calls).toHaveLength(1);

        await field.calls[0]?.finishWith("Server One");

        expect(field.renderedTexts()).toEqual([stateOf("One"), stateOf("Two")]);
      });

      it("and waits for the pause after a call that returned within it", async () => {
        field.tell("first", "One");
        await wait(SERVER_CHECK_PAUSE_MS);
        field.tell("second", "Two");
        await field.calls[0]?.finishWith("Server One");

        expect(field.calls).toHaveLength(1);

        await wait(SERVER_CHECK_PAUSE_MS);

        expect(field.renderedTexts()).toEqual([stateOf("One"), stateOf("Two")]);
      });
    });

    it("starts no call once the editor is back on the saved structure within the pause", async () => {
      field.tell("unsaved", "Typed");
      field.tell(SAVED_SHAPE, null);
      await wait(SERVER_CHECK_PAUSE_MS);

      expect(field.calls).toHaveLength(0);
      expect(field.shown()).toBe(SAVED_RENDER);
    });

    it("renders through the call alone when the page cannot render the structure", async () => {
      field = liveRichText({ optimistic: () => null });
      field.tell("unsaved", "Typed");

      expect(field.shown()).toBe(SAVED_RENDER);

      await wait(STRUCTURE_SETTLE_MS);

      expect(field.calls).toHaveLength(1);
    });

    it("renders through the call alone when the render on the page throws", async () => {
      field = liveRichText({
        optimistic: () => {
          throw FAILURE;
        },
      });
      field.tell("unsaved", "Typed");

      expect(field.shown()).toBe(SAVED_RENDER);

      await wait(STRUCTURE_SETTLE_MS);
      await field.calls[0]?.finishWith("Server Typed");

      expect(field.shown()).toBe("Server Typed");
    });

    describe("that returns a promise", () => {
      beforeEach(() => {
        field = liveRichText({ optimistic: async (structure) => renderedHere(structure) });
      });

      it("shows it once it is ready", async () => {
        field.tell("unsaved", "Typed");

        expect(field.shown()).toBe(SAVED_RENDER);

        await wait();

        expect(field.shown()).toBe("Local Typed");
      });

      it("drops it once the editor left its structure", async () => {
        field.tell("first", "One");
        field.tell(SAVED_SHAPE, null);
        await wait();

        expect(field.shown()).toBe(SAVED_RENDER);
      });
    });
  });
});
