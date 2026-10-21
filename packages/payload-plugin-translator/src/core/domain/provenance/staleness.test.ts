import { describe, expect, it } from "vitest";

import type { ProvenanceReceipt } from "./ProvenanceStore.interface.js";
import type { RecordedFingerprints } from "./SourceFingerprint.js";
import type { CurrentFingerprint } from "./staleness.js";
import { asHash } from "./__tests__/fixtures/claims.js";
import { changedLeaves, isRecordStale, recordsEachLeaf, leafSourceChanged } from "./staleness.js";
import { UNANSWERED } from "./SourceFingerprint.js";

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

const storedFields = (
  hashes: Record<string, string | null>
): { kind: "fields"; hashes: RecordedFingerprints } => ({
  kind: "fields",
  hashes: Object.fromEntries(
    Object.entries(hashes).map(([address, seed]) => [address, seed === null ? null : asHash(seed)])
  ),
});

const hashed = (fields: Record<string, string>) =>
  Object.fromEntries(Object.entries(fields).map(([address, seed]) => [address, asHash(seed)]));

const current = (document: string, fields: Record<string, string> = {}): CurrentFingerprint => ({
  document,
  fields: hashed(fields),
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
  const stored = storedFields({ title: "1111", body: "2222" });

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
      dismissedFingerprint: storedFields(drifted),
    });
    expect(isRecordStale(dismissed, current(HASH_B, drifted))).toBe(false);
  });

  // The defect this marker exists to fix: a run that translated some leaves and deliberately skipped
  // others used to write a SHORTER map, which read as "the document changed" forever — and the skipped
  // leaf could never be added, because adding it required translating it.
  it("is not stale when a leaf it deliberately skipped is recorded as not ours", () => {
    const withMarker = storedFields({ title: null, body: "2222" });
    expect(
      isRecordStale(
        record({ sourceFingerprint: withMarker }),
        current(HASH_B, { title: "1111", body: "2222" })
      )
    ).toBe(false);
  });

  it("is still stale when a leaf appeared that the receipt never saw at all", () => {
    const withMarker = storedFields({ title: null, body: "2222" });
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
  const recorded = storedFields({ title: "1111", body: "2222", seen: null }).hashes;

  it("says a leaf changed when its stored hash differs from now", () => {
    expect(leafSourceChanged(recorded, hashed({ title: "1111", body: "9999" }), "body")).toBe(true);
  });

  it("says a leaf did not change when its stored hash still matches", () => {
    expect(leafSourceChanged(recorded, hashed({ title: "1111", body: "2222" }), "body")).toBe(
      false
    );
  });

  it("knows nothing about a leaf the receipt never recorded", () => {
    expect(
      leafSourceChanged(recorded, hashed({ title: "1111", sub: "3333" }), "sub")
    ).toBeUndefined();
  });

  it("knows nothing about a leaf recorded as seen-but-not-ours", () => {
    expect(
      leafSourceChanged(recorded, hashed({ title: "1111", seen: "3333" }), "seen")
    ).toBeUndefined();
  });

  it("says a leaf changed when it is recorded but absent from the document now", () => {
    expect(leafSourceChanged(recorded, hashed({ title: "1111" }), "body")).toBe(true);
  });
});

describe("recordsEachLeaf", () => {
  it("accepts a receipt that claims leaf by leaf", () => {
    expect(recordsEachLeaf(storedFields({ title: "1111" }))).toBe(true);
  });

  it.each([
    ["no receipt", null],
    ["one written before per-field fingerprints", { kind: "document", hash: HASH_A } as const],
  ])("refuses %s", (_label, fingerprint) => {
    expect(recordsEachLeaf(fingerprint)).toBe(false);
  });
});

describe("changedLeaves", () => {
  const stored = storedFields({ title: "1111", body: "2222", seen: null });

  it("answers only for the leaves it can answer for", () => {
    expect(
      changedLeaves(stored, hashed({ title: "1111", body: "9999", seen: "3333", fresh: "4444" }))
    ).toStrictEqual({ title: false, body: true });
  });

  it("is empty when there is no receipt", () => {
    expect(changedLeaves(null, hashed({ title: "1111" }))).toStrictEqual({});
  });

  it("is empty for a receipt written before per-field fingerprints", () => {
    expect(
      changedLeaves({ kind: "document", hash: HASH_A }, hashed({ title: "1111" }))
    ).toStrictEqual({});
  });

  it("says a recorded leaf changed when the document no longer has it", () => {
    expect(changedLeaves(stored, hashed({ title: "1111" }))).toStrictEqual({
      title: false,
      body: true,
    });
  });

  it("agrees with leafSourceChanged leaf for leaf", () => {
    const now = hashed({ title: "1111", body: "9999", seen: "3333", fresh: "4444" });
    const map = changedLeaves(stored, now);
    for (const address of ["title", "body", "seen", "fresh"]) {
      expect(map[address], address).toBe(leafSourceChanged(stored.hashes, now, address));
    }
  });
});

describe("a leaf recorded as unanswered", () => {
  const stored = { kind: "fields", hashes: { title: asHash("1111"), body: UNANSWERED } } as const;

  it("makes the record stale, however the source stands", () => {
    expect(
      isRecordStale(
        record({ sourceFingerprint: stored }),
        current(HASH_A, { title: "1111", body: "2222" })
      )
    ).toBe(true);
  });

  it("is reported as changed, so the next run selects the leaf again", () => {
    expect(leafSourceChanged(stored.hashes, hashed({ title: "1111", body: "2222" }), "body")).toBe(
      true
    );
    expect(changedLeaves(stored, hashed({ title: "1111", body: "2222" })).body).toBe(true);
  });

  it("is not confused with a decline, which still claims nothing", () => {
    const declined = { kind: "fields", hashes: { title: asHash("1111"), body: null } } as const;

    expect(
      leafSourceChanged(declined.hashes, hashed({ title: "1111", body: "2222" }), "body")
    ).toBeUndefined();
  });
});
