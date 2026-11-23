import { describe, expect, it } from "vitest";

import type { ReadTurns } from "../../src/server/unsavedRichText/latestReads";

import { createLatestReads } from "../../src/server/unsavedRichText/latestReads";

import { waitFor } from "../support/time";

const KEY = "field";
const READ_MS = 200;
const STALE_AFTER_MS = 100;
const SHORT_WAIT_MS = 20;

const readAfter =
  <Value>(ms: number, value: Value) =>
  async () => {
    await waitFor(ms);
    return value;
  };
const never = () => new Promise<string>(() => undefined);
const options = (signal = new AbortController().signal) => ({ signal, staleAfterMs: 1000 });

describe("the latest read of a key", () => {
  it("forgets the key when nothing runs and nobody waits", async () => {
    const turns: ReadTurns = new Map();
    const reads = createLatestReads(turns);

    await reads.read(KEY, readAfter(0, "A"), options());

    expect(turns.size).toBe(0);
  });

  it("forgets the key when its latest request left without reading", async () => {
    const turns: ReadTurns = new Map();
    const reads = createLatestReads(turns);
    const running = reads.read(KEY, readAfter(READ_MS, "A"), options());

    const left = await reads.read(
      KEY,
      readAfter(0, "B"),
      options(AbortSignal.timeout(SHORT_WAIT_MS))
    );
    await running;

    expect(left).toBeNull();
    expect(turns.size).toBe(0);
  });

  it("keeps the key while a request waits", async () => {
    const turns: ReadTurns = new Map();
    const reads = createLatestReads(turns);
    const running = reads.read(KEY, readAfter(READ_MS, "A"), options());
    const waiting = reads.read(KEY, readAfter(0, "B"), options());

    expect(turns.size).toBe(1);
    expect(await running).toBe("A");
    expect(await waiting).toBe("B");
    expect(turns.size).toBe(0);
  });

  describe("with reads that never finish", () => {
    const hangingReads = () => {
      const counted = { started: 0 };
      const hang = () => {
        counted.started += 1;
        return never();
      };
      return { counted, hang };
    };

    const request = (reads: ReturnType<typeof createLatestReads>, read: () => Promise<string>) =>
      reads.read(KEY, read, {
        signal: AbortSignal.timeout(SHORT_WAIT_MS),
        staleAfterMs: STALE_AFTER_MS,
      });

    it("starts one more read once the first is stale", async () => {
      const reads = createLatestReads(new Map());
      const { counted, hang } = hangingReads();
      void request(reads, hang);
      await waitFor(STALE_AFTER_MS + SHORT_WAIT_MS);

      void request(reads, hang);

      expect(counted.started).toBe(2);
    });

    it("starts no third read while a stale one is alive", async () => {
      const reads = createLatestReads(new Map());
      const { counted, hang } = hangingReads();
      for (let attempt = 0; attempt < 5; attempt += 1) {
        void request(reads, hang);
        await waitFor(STALE_AFTER_MS + SHORT_WAIT_MS);
      }

      expect(counted.started).toBe(2);
    });

    it("answers nothing at once while a stale and a running read are alive", async () => {
      const reads = createLatestReads(new Map());
      const { hang } = hangingReads();
      void request(reads, hang);
      await waitFor(STALE_AFTER_MS + SHORT_WAIT_MS);
      void request(reads, hang);
      await waitFor(STALE_AFTER_MS + SHORT_WAIT_MS);

      expect(await reads.read(KEY, readAfter(0, "C"), options())).toBeNull();
    });
  });
});
