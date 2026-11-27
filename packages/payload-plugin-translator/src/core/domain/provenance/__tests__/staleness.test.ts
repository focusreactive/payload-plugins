import { describe, expect, it } from "vitest";

import type { ProvenanceReceipt } from "../ProvenanceStore.interface.js";
import type { FieldFingerprints } from "../../content-projection/computeFieldFingerprints.js";
import type { RecordedFingerprints } from "../SourceFingerprint.js";
import { asHash } from "../__tests__/fixtures/claims.js";
import { changedLeaves, isRecordStale } from "../staleness.js";
import { parseSourceFingerprint, UNANSWERED } from "../SourceFingerprint.js";

const hashed = (fields: Record<string, string>): FieldFingerprints =>
  Object.fromEntries(Object.entries(fields).map(([address, seed]) => [address, asHash(seed)]));

const record = (over: Partial<ProvenanceReceipt> = {}): ProvenanceReceipt => ({
  collectionSlug: "posts",
  documentId: "1",
  targetLocale: "de",
  sourceLocale: "en",
  sourceFingerprint: hashed({ title: "1111" }),
  translatedAt: "2026-07-07T00:00:00.000Z",
  ...over,
});

describe("isRecordStale", () => {
  const stored = hashed({ title: "1111", body: "2222" });

  it("is not stale when every leaf still hashes to what was translated", () => {
    expect(
      isRecordStale(record({ sourceFingerprint: stored }), hashed({ title: "1111", body: "2222" }))
    ).toBe(false);
  });

  it("is stale when one leaf's source moved", () => {
    expect(
      isRecordStale(record({ sourceFingerprint: stored }), hashed({ title: "1111", body: "9999" }))
    ).toBe(true);
  });

  it("is stale when a leaf was added", () => {
    expect(
      isRecordStale(
        record({ sourceFingerprint: stored }),
        hashed({ title: "1111", body: "2222", sub: "3333" })
      )
    ).toBe(true);
  });

  it("is stale when a leaf was removed", () => {
    expect(isRecordStale(record({ sourceFingerprint: stored }), hashed({ title: "1111" }))).toBe(
      true
    );
  });

  it("hides again once the receipt names that exact drift", () => {
    const drifted = { title: "1111", body: "9999" };
    const accepted = record({ sourceFingerprint: hashed(drifted) });
    expect(isRecordStale(accepted, hashed(drifted))).toBe(false);
  });

  it("is still stale when a leaf appeared that the receipt never saw at all", () => {
    expect(
      isRecordStale(
        record({ sourceFingerprint: hashed({ title: "1111", body: "2222" }) }),
        hashed({ title: "1111", body: "2222", sub: "3333" })
      )
    ).toBe(true);
  });
});

describe("isRecordStale — a receipt that cannot be read", () => {
  it("reads as out of date, because nothing shows it is current", () => {
    expect(isRecordStale(record({ sourceFingerprint: null }), hashed({ title: "1111" }))).toBe(
      true
    );
  });

  it.each([
    ["the single sha256 a version before 0.15.0 wrote", "a".repeat(64)],
    ["a column someone corrupted", "not a fingerprint"],
  ])("reads a column holding %s as out of date, from the stored text in", (_label, stored) => {
    const read = record({ sourceFingerprint: parseSourceFingerprint(stored) });

    expect(isRecordStale(read, hashed({ title: "1111" }))).toBe(true);
  });
});

describe("changedLeaves — the per-leaf answer", () => {
  const stored = hashed({ title: "1111", body: "2222" });

  it("says a leaf changed when its stored hash differs from now", () => {
    expect(changedLeaves(stored, hashed({ title: "1111", body: "9999" })).body).toBe(true);
  });

  it("says a leaf did not change when its stored hash still matches", () => {
    expect(changedLeaves(stored, hashed({ title: "1111", body: "2222" })).body).toBe(false);
  });

  it("says nothing about a leaf the document no longer has", () => {
    expect(changedLeaves(stored, hashed({ title: "1111" }))).not.toHaveProperty("body");
  });

  it("says a leaf the receipt never recorded changed, so the next run takes it", () => {
    const answers = changedLeaves(stored, hashed({ title: "1111", body: "2222", sub: "3333" }));

    expect(answers.sub, "nothing was recorded for it, so it is owed a translation").toBe(true);
  });

  it("answers for every leaf the source has now", () => {
    expect(
      changedLeaves(stored, hashed({ title: "1111", body: "9999", seen: "3333", fresh: "4444" }))
    ).toStrictEqual({ title: false, body: true, seen: true, fresh: true });
  });

  it("drops a recorded leaf the document no longer has", () => {
    expect(changedLeaves(stored, hashed({ title: "1111" }))).toStrictEqual({ title: false });
  });
});

describe("a leaf recorded as unanswered", () => {
  const stored: RecordedFingerprints = { title: asHash("1111"), body: UNANSWERED };

  it("makes the record stale, however the source stands", () => {
    expect(
      isRecordStale(record({ sourceFingerprint: stored }), hashed({ title: "1111", body: "2222" }))
    ).toBe(true);
  });

  it("is reported as changed, so the next run selects the leaf again", () => {
    expect(changedLeaves(stored, hashed({ title: "1111", body: "2222" })).body).toBe(true);
  });
});
