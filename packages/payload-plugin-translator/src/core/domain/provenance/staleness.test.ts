import { describe, expect, it } from "vitest";

import type { ProvenanceReceipt } from "./ProvenanceStore.interface.js";
import type { CurrentFingerprint } from "./staleness.js";
import { changedLeaves, isRecordStale, recordsEachLeaf, leafSourceChanged } from "./staleness.js";

const SHA256_HEX_LENGTH = 64;
const HASH_A = "a".repeat(SHA256_HEX_LENGTH);
const HASH_B = "b".repeat(SHA256_HEX_LENGTH);
const HASH_C = "c".repeat(SHA256_HEX_LENGTH);

const record = (over: Partial<ProvenanceReceipt> = {}): ProvenanceReceipt => ({
  collectionSlug: "posts",
  documentId: "1",
  targetLocale: "de",
  sourceLocale: "en",
  sourceFingerprint: { kind: "document", hash: HASH_A },
  translatedAt: "2026-07-07T00:00:00.000Z",
  dismissedFingerprint: null,
  ...over,
});

const current = (document: string, fields: Record<string, string> = {}): CurrentFingerprint => ({
  document,
  fields,
});

describe("isRecordStale — a receipt written before per-field fingerprints", () => {
  it("is not stale when the current fingerprint matches the recorded source fingerprint", () => {
    expect(isRecordStale(record(), current(HASH_A))).toBe(false);
  });

  it("is stale when the source drifted and nothing was dismissed", () => {
    expect(isRecordStale(record(), current(HASH_B))).toBe(true);
  });

  it("is not stale when the current drift equals the dismissed fingerprint", () => {
    const dismissed = record({ dismissedFingerprint: { kind: "document", hash: HASH_B } });
    expect(isRecordStale(dismissed, current(HASH_B))).toBe(false);
  });

  it("becomes stale again when the source moves past a dismissed fingerprint", () => {
    const dismissed = record({ dismissedFingerprint: { kind: "document", hash: HASH_B } });
    expect(isRecordStale(dismissed, current(HASH_C))).toBe(true);
  });
});

describe("isRecordStale — a receipt holding per-field fingerprints", () => {
  const stored = { kind: "fields", hashes: { title: "1111", body: "2222" } } as const;

  it("is not stale when every leaf still hashes to what was translated", () => {
    expect(
      isRecordStale(
        record({ sourceFingerprint: stored }),
        current(HASH_B, { title: "1111", body: "2222" })
      )
    ).toBe(false);
  });

  it("is stale when one leaf's source moved", () => {
    expect(
      isRecordStale(
        record({ sourceFingerprint: stored }),
        current(HASH_B, { title: "1111", body: "9999" })
      )
    ).toBe(true);
  });

  it("is stale when a leaf was added", () => {
    expect(
      isRecordStale(
        record({ sourceFingerprint: stored }),
        current(HASH_B, { title: "1111", body: "2222", sub: "3333" })
      )
    ).toBe(true);
  });

  it("is stale when a leaf was removed", () => {
    expect(
      isRecordStale(record({ sourceFingerprint: stored }), current(HASH_B, { title: "1111" }))
    ).toBe(true);
  });

  it("hides again once that exact drift is dismissed", () => {
    const drifted = { title: "1111", body: "9999" };
    const dismissed = record({
      sourceFingerprint: stored,
      dismissedFingerprint: { kind: "fields", hashes: drifted },
    });
    expect(isRecordStale(dismissed, current(HASH_B, drifted))).toBe(false);
  });

  // The defect this marker exists to fix: a run that translated some leaves and deliberately skipped
  // others used to write a SHORTER map, which read as "the document changed" forever — and the skipped
  // leaf could never be added, because adding it required translating it.
  it("is not stale when a leaf it deliberately skipped is recorded as not ours", () => {
    const withMarker = { kind: "fields", hashes: { title: null, body: "2222" } } as const;
    expect(
      isRecordStale(
        record({ sourceFingerprint: withMarker }),
        current(HASH_B, { title: "1111", body: "2222" })
      )
    ).toBe(false);
  });

  it("is still stale when a leaf appeared that the receipt never saw at all", () => {
    const withMarker = { kind: "fields", hashes: { title: null, body: "2222" } } as const;
    expect(
      isRecordStale(
        record({ sourceFingerprint: withMarker }),
        current(HASH_B, { title: "1111", body: "2222", sub: "3333" })
      )
    ).toBe(true);
  });

  it("does not care what the document-wide hash says", () => {
    const same = { title: "1111", body: "2222" };
    expect(
      isRecordStale(record({ sourceFingerprint: stored }), current("anything at all", same))
    ).toBe(false);
  });
});

describe("isRecordStale — a receipt that cannot be read", () => {
  it("reads as out of date, because nothing shows it is current", () => {
    expect(isRecordStale(record({ sourceFingerprint: null }), current(HASH_A))).toBe(true);
  });
});

describe("leafSourceChanged", () => {
  const recorded = { title: "1111", body: "2222", seen: null } as const;

  it("says a leaf changed when its stored hash differs from now", () => {
    expect(leafSourceChanged(recorded, { title: "1111", body: "9999" }, "body")).toBe(true);
  });

  it("says a leaf did not change when its stored hash still matches", () => {
    expect(leafSourceChanged(recorded, { title: "1111", body: "2222" }, "body")).toBe(false);
  });

  it("knows nothing about a leaf the receipt never recorded", () => {
    expect(leafSourceChanged(recorded, { title: "1111", sub: "3333" }, "sub")).toBeUndefined();
  });

  it("knows nothing about a leaf recorded as seen-but-not-ours", () => {
    expect(leafSourceChanged(recorded, { title: "1111", seen: "3333" }, "seen")).toBeUndefined();
  });

  it("says a leaf changed when it is recorded but absent from the document now", () => {
    expect(leafSourceChanged(recorded, { title: "1111" }, "body")).toBe(true);
  });
});

describe("recordsEachLeaf", () => {
  it("accepts a receipt that claims leaf by leaf", () => {
    expect(recordsEachLeaf({ kind: "fields", hashes: { title: "1111" } })).toBe(true);
  });

  it.each([
    ["no receipt", null],
    ["one written before per-field fingerprints", { kind: "document", hash: HASH_A } as const],
  ])("refuses %s", (_label, fingerprint) => {
    expect(recordsEachLeaf(fingerprint)).toBe(false);
  });
});

describe("changedLeaves", () => {
  const stored = { kind: "fields", hashes: { title: "1111", body: "2222", seen: null } } as const;

  it("answers only for the leaves it can answer for", () => {
    expect(
      changedLeaves(stored, { title: "1111", body: "9999", seen: "3333", fresh: "4444" })
    ).toEqual({ title: false, body: true });
  });

  it("is empty when there is no receipt", () => {
    expect(changedLeaves(null, { title: "1111" })).toEqual({});
  });

  it("is empty for a receipt written before per-field fingerprints", () => {
    expect(changedLeaves({ kind: "document", hash: HASH_A }, { title: "1111" })).toEqual({});
  });

  it("says a recorded leaf changed when the document no longer has it", () => {
    expect(changedLeaves(stored, { title: "1111" })).toEqual({ title: false, body: true });
  });

  it("agrees with leafSourceChanged leaf for leaf", () => {
    const now = { title: "1111", body: "9999", seen: "3333", fresh: "4444" };
    const map = changedLeaves(stored, now);
    for (const address of ["title", "body", "seen", "fresh"]) {
      expect(map[address], address).toBe(leafSourceChanged(stored.hashes, now, address));
    }
  });
});
