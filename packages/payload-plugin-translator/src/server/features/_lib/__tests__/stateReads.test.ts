import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CollectionSlug, Payload } from "payload";

import { runRow, storeDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";
import type { RunRecordStoreDouble } from "../../../modules/runs/__tests__/fixtures/runRecordStore.js";
import { readState } from "../stateReads.js";

const NOW = new Date("2026-11-25T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

const asked = (store: RunRecordStoreDouble) =>
  readState({
    payload: {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      collections: {},
    } as unknown as Payload,
    collection: "posts" as CollectionSlug,
    ids: ["d1", "d2"],
    targets: ["de"],
    holdsText: () => true,
    provenance: undefined,
    runRecordStoreFactory: () => store,
    failedWindowMs: DAY_MS,
  });

describe("what a state read shows", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("asks for the asked documents' live runs and failures inside the window", async () => {
    const store = storeDouble();

    await asked(store);

    expect(store.findLiveOrUndeliveredSince).toHaveBeenCalledWith(
      "posts",
      ["d1", "d2"],
      new Date("2026-11-24T12:00:00.000Z")
    );
  });

  it("asks for later deliveries only of the documents that have a failure, so a busy page cannot crowd one out", async () => {
    const store = storeDouble({
      findLiveOrUndeliveredSince: vi.fn().mockResolvedValue([
        runRow({
          handle: "broke",
          collectionId: "d2",
          outcome: "failed",
          settledAt: NOW.toISOString(),
        }),
        runRow({ handle: "busy", collectionId: "d1", outcome: null, settledAt: null }),
      ]),
    });

    await asked(store);

    expect(store.findDeliveredSince).toHaveBeenCalledWith(
      "posts",
      ["d2"],
      new Date("2026-11-24T12:00:00.000Z")
    );
  });

  it("asks for no deliveries where nothing failed", async () => {
    const store = storeDouble({
      findLiveOrUndeliveredSince: vi
        .fn()
        .mockResolvedValue([runRow({ collectionId: "d1", outcome: null, settledAt: null })]),
    });

    await asked(store);

    expect(store.findDeliveredSince).not.toHaveBeenCalled();
  });

  it("carries a delivery that came after a failure, so the failure stops showing", async () => {
    const failed = runRow({
      handle: "first",
      collectionId: "d1",
      outcome: "failed",
      queuedAt: "2026-11-25T09:00:00.000Z",
      settledAt: "2026-11-25T09:01:00.000Z",
    });
    const delivered = runRow({
      handle: "again",
      collectionId: "d1",
      outcome: "delivered",
      queuedAt: "2026-11-25T10:00:00.000Z",
      settledAt: "2026-11-25T10:01:00.000Z",
    });
    const store = storeDouble({
      findLiveOrUndeliveredSince: vi.fn().mockResolvedValue([failed]),
      findDeliveredSince: vi.fn().mockResolvedValue([delivered]),
    });

    const { runs } = await asked(store);

    expect(runs.map(({ row }) => row.handle).sort()).toStrictEqual(["again", "first"]);
  });

  it("leaves out a cancelled run, which the panels have no word for", async () => {
    const store = storeDouble({
      findLiveOrUndeliveredSince: vi
        .fn()
        .mockResolvedValue([
          runRow({ handle: "kept", outcome: "failed", settledAt: NOW.toISOString() }),
        ]),
      findDeliveredSince: vi
        .fn()
        .mockResolvedValue([
          runRow({ handle: "dropped", outcome: "cancelled", settledAt: NOW.toISOString() }),
        ]),
    });

    const { runs } = await asked(store);

    expect(runs.map(({ row }) => row.handle)).toStrictEqual(["kept"]);
  });

  it("holds no receipts where the installation keeps no records", async () => {
    const { receipts } = await asked(storeDouble());

    expect(receipts).toStrictEqual(new Map());
  });
});
