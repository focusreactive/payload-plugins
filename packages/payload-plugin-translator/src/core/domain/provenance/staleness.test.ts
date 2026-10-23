import { describe, expect, it } from "vitest";

import type { ProvenanceReceipt } from "./ProvenanceStore.interface.js";
import type { RecordedFingerprints } from "./SourceFingerprint.js";
import type { CurrentFingerprint } from "./staleness.js";
import { asHash } from "./__tests__/fixtures/claims.js";
import { changedLeaves, isRecordStale, recordsEachLeaf } from "./staleness.js";
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
  hashes: Record<string, string>
): { kind: "fields"; hashes: RecordedFingerprints } => ({
  kind: "fields",
  hashes: Object.fromEntries(Object.entries(hashes).map(([a, seed]) => [a, asHash(seed)])),
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

  it("is still stale when a leaf appeared that the receipt never saw at all", () => {
    const seen = storedFields({ title: "1111", body: "2222" });
    expect(
      isRecordStale(
        record({ sourceFingerprint: seen }),
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

describe("changedLeaves — the per-leaf answer", () => {
  const stored = storedFields({ title: "1111", body: "2222" });

  it("says a leaf changed when its stored hash differs from now", () => {
    expect(changedLeaves(stored.hashes, hashed({ title: "1111", body: "9999" })).body).toBe(true);
  });

  it("says a leaf did not change when its stored hash still matches", () => {
    expect(changedLeaves(stored.hashes, hashed({ title: "1111", body: "2222" })).body).toBe(false);
  });

  it("says nothing about a leaf the document no longer has", () => {
    expect(changedLeaves(stored.hashes, hashed({ title: "1111" }))).not.toHaveProperty("body");
  });

  it("says a leaf the receipt never recorded changed, so the next run takes it", () => {
    const answers = changedLeaves(
      stored.hashes,
      hashed({ title: "1111", body: "2222", sub: "3333" })
    );

    expect(answers.sub, "nothing was recorded for it, so it is owed a translation").toBe(true);
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
  const stored = storedFields({ title: "1111", body: "2222" });

  it("answers for every leaf the source has now", () => {
    expect(
      changedLeaves(
        stored.hashes,
        hashed({ title: "1111", body: "9999", seen: "3333", fresh: "4444" })
      )
    ).toStrictEqual({ title: false, body: true, seen: true, fresh: true });
  });

  it("drops a recorded leaf the document no longer has", () => {
    expect(changedLeaves(stored.hashes, hashed({ title: "1111" }))).toStrictEqual({ title: false });
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
    expect(changedLeaves(stored.hashes, hashed({ title: "1111", body: "2222" })).body).toBe(true);
  });
});
