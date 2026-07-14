import { describe, it, expect } from "vitest";

import type { TranslationProvenanceRecord } from "./ProvenanceStore.interface";
import { isRecordStale } from "./staleness";

const base: TranslationProvenanceRecord = {
  collectionSlug: "posts",
  documentId: "1",
  targetLocale: "de",
  sourceLocale: "en",
  sourceFingerprint: "fp-original",
  translatedAt: "2026-07-07T00:00:00.000Z",
  dismissedFingerprint: null,
};

describe("isRecordStale", () => {
  it("is not stale when the current fingerprint matches the recorded source fingerprint", () => {
    expect(isRecordStale(base, "fp-original")).toBe(false);
  });

  it("is stale when the source drifted and nothing was dismissed", () => {
    expect(isRecordStale(base, "fp-changed")).toBe(true);
  });

  it("is not stale when the current drift equals the dismissed fingerprint", () => {
    const dismissed = { ...base, dismissedFingerprint: "fp-changed" };
    expect(isRecordStale(dismissed, "fp-changed")).toBe(false);
  });

  it("becomes stale again when the source moves past a dismissed fingerprint", () => {
    const dismissed = { ...base, dismissedFingerprint: "fp-changed" };
    expect(isRecordStale(dismissed, "fp-changed-again")).toBe(true);
  });
});
