import { describe, expect, it } from "vitest";

import type { ChainMember } from "../index.js";
import { runAfterSave, runBeforeTranslation } from "../index.js";

import { afterSave, beforeTranslation, collectingLogger } from "./fixtures/run.js";

const silent = collectingLogger();

describe("the chain before the translation", () => {
  it("returns the state untouched when no module is listed", async () => {
    const state = beforeTranslation();

    expect(await runBeforeTranslation([], state, silent)).toEqual(state);
  });

  it("keeps the leaf-change map when a later module contributes only its own note", async () => {
    const changed = { title: true };
    const mapper: ChainMember = {
      name: "mapper",
      beforeTranslation: async () => ({ sourceChangedByLeaf: changed }),
    };
    const noteOnly: ChainMember = {
      name: "note-only",
      beforeTranslation: async () => ({ moduleState: { noteOnly: 1 } }),
    };

    const joined = await runBeforeTranslation([mapper, noteOnly], beforeTranslation(), silent);

    expect(joined.sourceChangedByLeaf).toEqual(changed);
  });

  it("keeps a sibling's note when a module contributes only its own", async () => {
    const first: ChainMember = {
      name: "first",
      beforeTranslation: async () => ({ moduleState: { first: 1 } }),
    };
    const second: ChainMember = {
      name: "second",
      beforeTranslation: async () => ({ moduleState: { second: 2 } }),
    };

    const joined = await runBeforeTranslation([first, second], beforeTranslation(), silent);

    expect(joined.moduleState).toEqual({ first: 1, second: 2 });
  });

  it("runs the modules in the order they are listed", async () => {
    const order: string[] = [];
    const record = (name: string): ChainMember => ({
      name,
      beforeTranslation: async () => {
        order.push(name);
        return {};
      },
    });

    await runBeforeTranslation(
      [record("a"), record("b"), record("c")],
      beforeTranslation(),
      silent
    );

    expect(order).toEqual(["a", "b", "c"]);
  });

  it("carries one module's note through to the next", async () => {
    const writer: ChainMember = {
      name: "writer",
      beforeTranslation: async () => ({ moduleState: { writer: "left behind" } }),
    };
    let read: unknown;
    const reader: ChainMember = {
      name: "reader",
      beforeTranslation: async (state) => {
        read = state.moduleState.writer;
        return {};
      },
    };

    await runBeforeTranslation([writer, reader], beforeTranslation(), silent);

    expect(read).toBe("left behind");
  });

  it("passes over a module that does not take this position", async () => {
    const afterOnly: ChainMember = { name: "after-only", afterSave: async () => undefined };
    const state = beforeTranslation();

    expect(await runBeforeTranslation([afterOnly], state, silent)).toEqual(state);
  });
});

describe("the chain after the save", () => {
  it("runs every module that takes the position", async () => {
    const ran: string[] = [];
    const record = (name: string): ChainMember => ({
      name,
      afterSave: async () => {
        ran.push(name);
      },
    });

    await runAfterSave([record("a"), record("b")], afterSave(), silent);

    expect(ran).toEqual(["a", "b"]);
  });

  it("passes over a module that does not take this position", async () => {
    const beforeOnly: ChainMember = {
      name: "before-only",
      beforeTranslation: async () => ({}),
    };

    await expect(runAfterSave([beforeOnly], afterSave(), silent)).resolves.toBeUndefined();
  });
});
