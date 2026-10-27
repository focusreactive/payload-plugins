import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Payload } from "payload";

import { wireTranslateRunner } from "../wireTranslateRunner.js";
import { runRow, storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";
import type { RunRecordStoreDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";
import { RunRecordMissing } from "../../../modules/runs/index.js";
import type { TaskRunnerContext, TaskRunnerProvider } from "../../../modules/task-runner/index.js";
import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";
import type { TranslationProvider } from "../../../../core/domain/translation-providers/index.js";

const { translateDocument } = vi.hoisted(() => ({
  translateDocument: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../translateDocument.js", () => ({ translateDocument }));

const pointer = { handle: "job-7", targetLng: "de", previousAttempts: 0 };

const idleRunner = (keep: (context: TaskRunnerContext) => void): TaskRunnerProvider => ({
  capabilities: { stop: false, run: false },
  create: (_payload, context) => {
    keep(context);
    return { enqueue: async () => [] };
  },
  configure: (context) => {
    keep(context);
    return (config) => config;
  },
});

describe("a runner names a run and a locale; the record says what that is", () => {
  let store: RunRecordStoreDouble;
  let context: TaskRunnerContext;
  let payload: Payload;

  const whatWasTranslated = () => translateDocument.mock.calls[0][2];
  const underWhoseRights = () => translateDocument.mock.calls[0][3];

  beforeEach(() => {
    vi.clearAllMocks();
    store = storeDouble({ find: vi.fn().mockResolvedValue(runRow({ handle: "job-7" })) });
    payload = { logger: { error: vi.fn() } } as unknown as Payload;

    let captured: TaskRunnerContext | undefined;
    wireTranslateRunner({
      translation: {
        translationProvider: {} as TranslationProvider,
        schemaMap: new Map() as CollectionSchemaMap,
        modules: [],
      },
      runner: idleRunner((handed) => {
        captured = handed;
      }),
      lifecycle: {},
      storeFactory: () => store,
    });
    if (!captured) throw new Error("the runner was never handed a context");
    context = captured;
  });

  it("asks the record about the locale the runner named", async () => {
    await context.handler(payload, pointer, {});

    expect(store.find).toHaveBeenCalledWith({ handle: "job-7", targetLng: "de" });
  });

  it("translates the document the record names, not one the runner carried", async () => {
    store.find.mockResolvedValue(
      runRow({ handle: "job-7", collectionId: "doc-9", sourceLng: "fr", targetLng: "de" })
    );

    await context.handler(payload, pointer, {});

    expect(whatWasTranslated()).toMatchObject({
      collection: "posts",
      collectionId: "doc-9",
      sourceLng: "fr",
      targetLng: "de",
    });
  });

  it("reads back the filters the run was queued with", async () => {
    store.find.mockResolvedValue(
      runRow({ handle: "job-7", filters: JSON.stringify([{ kind: "rule", name: "stale" }]) })
    );

    await context.handler(payload, pointer, {});

    expect(whatWasTranslated().filters).toEqual([{ kind: "rule", name: "stale" }]);
  });

  it("drops a filter entry the parser rejects rather than translating the whole document", async () => {
    store.find.mockResolvedValue(
      runRow({ handle: "job-7", filters: JSON.stringify([{ nonsense: true }]) })
    );

    await context.handler(payload, pointer, {});

    expect(
      whatWasTranslated().filters,
      "reading an unreadable entry as no filter would overwrite reviewed text"
    ).toEqual([]);
  });

  it("carries the publish flag the run was queued with", async () => {
    store.find.mockResolvedValue(runRow({ handle: "job-7", publishOnTranslation: true }));

    await context.handler(payload, pointer, {});

    expect(whatWasTranslated().publishOnTranslation).toBe(true);
  });

  it("writes under the rights of whoever asked, which the record remembers", async () => {
    store.find.mockResolvedValue(
      runRow({ handle: "job-7", requesterId: "anna", requesterCollection: "users" })
    );

    await context.handler(payload, pointer, {});

    expect(underWhoseRights()).toMatchObject({
      requester: { userId: "anna", userCollection: "users" },
    });
  });

  it("writes under nobody's rights when the run recorded nobody", async () => {
    await context.handler(payload, pointer, {});

    expect(underWhoseRights().requester).toBeNull();
  });

  it("passes the attempt the runner is on", async () => {
    await context.handler(payload, { ...pointer, previousAttempts: 2 }, {});

    expect(whatWasTranslated().previousAttempts).toBe(2);
  });

  it("stamps the start before the translation runs", async () => {
    await context.handler(payload, pointer, {});

    expect(store.recordStarted).toHaveBeenCalledWith(
      { handle: "job-7", targetLng: "de" },
      expect.objectContaining({ attempts: 1 })
    );
    expect(store.recordStarted.mock.invocationCallOrder[0]).toBeLessThan(
      translateDocument.mock.invocationCallOrder[0]
    );
  });

  it("refuses to translate a locale the record does not name, rather than guessing one", async () => {
    store.find.mockResolvedValue(null);

    await expect(context.handler(payload, pointer, {})).rejects.toBeInstanceOf(RunRecordMissing);
    expect(translateDocument).not.toHaveBeenCalled();
  });

  it("says in that refusal why the row should have been there", async () => {
    store.find.mockResolvedValue(null);

    await expect(context.handler(payload, pointer, {})).rejects.toThrow(/the queue still holds/u);
  });
});
