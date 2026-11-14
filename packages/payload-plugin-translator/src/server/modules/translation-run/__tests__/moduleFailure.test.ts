import { APIError } from "payload";
import { describe, expect, it } from "vitest";

import type { ChainMember } from "../index.js";
import { runAfterSave, runBeforeTranslation } from "../index.js";

import { PluginFailure } from "./fixtures/failures.js";
import { afterSave, beforeTranslation, collectingLogger } from "./fixtures/run.js";

const IN_A_TRANSACTION = { transactionID: "tx-1" };
const NOT_IN_A_TRANSACTION = {};

const throwing = (name: string, error: unknown): ChainMember => ({
  name,
  beforeTranslation: async () => {
    throw error;
  },
  afterSave: async () => {
    throw error;
  },
});

describe("a module that fails before the translation", () => {
  it("leaves the chain carrying the state it was given, never undefined", async () => {
    const state = beforeTranslation({ sourceData: { title: "Untouched" } });

    const out = await runBeforeTranslation(
      [throwing("bad", new Error("boom"))],
      state,
      collectingLogger()
    );

    expect(out).toEqual(state);
  });

  it("does not stop the module listed after it", async () => {
    let reached = false;
    const later: ChainMember = {
      name: "later",
      beforeTranslation: async () => {
        reached = true;
        return {};
      },
    };

    await runBeforeTranslation(
      [throwing("bad", new Error("boom")), later],
      beforeTranslation(),
      collectingLogger()
    );

    expect(reached).toBe(true);
  });

  it("keeps an earlier module's note when the next one fails", async () => {
    const writer: ChainMember = {
      name: "writer",
      beforeTranslation: async () => ({ moduleState: { writer: "left behind" } }),
    };
    let seen: unknown;
    const reader: ChainMember = {
      name: "reader",
      beforeTranslation: async (state) => {
        seen = state.moduleState.writer;
        return {};
      },
    };

    await runBeforeTranslation(
      [writer, throwing("bad", new Error("boom")), reader],
      beforeTranslation(),
      collectingLogger()
    );

    expect(seen).toBe("left behind");
  });

  it("reports the failure under the name of the module that raised it", async () => {
    const log = collectingLogger();

    await runBeforeTranslation([throwing("bad", new Error("boom"))], beforeTranslation(), log);

    expect(log.entries).toHaveLength(1);
    expect(log.entries[0]).toMatchObject({ module: "bad" });
  });

  it("lets an unrecognised failure out of an open transaction, rather than reporting success", async () => {
    const state = beforeTranslation({ scope: IN_A_TRANSACTION });

    await expect(
      runBeforeTranslation([throwing("bad", new Error("boom"))], state, collectingLogger())
    ).rejects.toThrow("boom");
  });

  it("lets a failed Payload operation out, because it already took that transaction", async () => {
    const state = beforeTranslation({ scope: IN_A_TRANSACTION });

    await expect(
      runBeforeTranslation([throwing("bad", new APIError("gone"))], state, collectingLogger())
    ).rejects.toBeInstanceOf(APIError);
  });

  it("does not demote a failure a module raised deliberately", async () => {
    const escalating: ChainMember = {
      name: "escalating",
      beforeTranslation: async () => {
        throw new PluginFailure("the write is already gone", true);
      },
    };
    const state = beforeTranslation({ scope: IN_A_TRANSACTION });

    await expect(
      runBeforeTranslation([escalating], state, collectingLogger())
    ).rejects.toBeInstanceOf(PluginFailure);
  });

  it("swallows even a failed Payload operation when there is no transaction to lose", async () => {
    const state = beforeTranslation({ scope: NOT_IN_A_TRANSACTION });

    await expect(
      runBeforeTranslation([throwing("bad", new APIError("gone"))], state, collectingLogger())
    ).resolves.toEqual(state);
  });

  it("lets out a plugin failure that declares it must propagate", async () => {
    const state = beforeTranslation({ scope: IN_A_TRANSACTION });
    const lostTheWrite = new PluginFailure("gone", true);

    await expect(
      runBeforeTranslation([throwing("bad", lostTheWrite)], state, collectingLogger())
    ).rejects.toBe(lostTheWrite);
  });

  it("swallows a plugin failure that declares itself harmless", async () => {
    const state = beforeTranslation({ scope: IN_A_TRANSACTION });

    await expect(
      runBeforeTranslation(
        [throwing("bad", new PluginFailure("fine", false))],
        state,
        collectingLogger()
      )
    ).resolves.toEqual(state);
  });
});

describe("a module that fails after the save", () => {
  it("does not stop the module listed after it", async () => {
    let reached = false;
    const later: ChainMember = {
      name: "later",
      afterSave: async () => {
        reached = true;
      },
    };

    await runAfterSave(
      [throwing("bad", new Error("boom")), later],
      afterSave(),
      collectingLogger()
    );

    expect(reached).toBe(true);
  });

  it("lets an unrecognised failure out of an open transaction, rather than reporting success", async () => {
    await expect(
      runAfterSave(
        [throwing("bad", new Error("boom"))],
        afterSave({ scope: IN_A_TRANSACTION }),
        collectingLogger()
      )
    ).rejects.toThrow("boom");
  });

  it("lets a failed Payload operation out, because it already took that transaction", async () => {
    await expect(
      runAfterSave(
        [throwing("bad", new APIError("gone"))],
        afterSave({ scope: IN_A_TRANSACTION }),
        collectingLogger()
      )
    ).rejects.toBeInstanceOf(APIError);
  });
});
