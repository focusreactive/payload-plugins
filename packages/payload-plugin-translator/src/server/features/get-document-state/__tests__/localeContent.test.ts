import { describe, expect, it } from "vitest";

import type { FieldFingerprints } from "../../../../core/domain/content-projection/computeFieldFingerprints.js";
import type { ProvenanceReceipt } from "../../../../core/domain/provenance/index.js";
import { UNANSWERED } from "../../../../core/domain/provenance/index.js";
import { asHash } from "../../../../core/domain/provenance/__tests__/fixtures/claims.js";
import { localeContentOf } from "../localeContent.js";

const hashed = (fields: Record<string, string>): FieldFingerprints =>
  Object.fromEntries(Object.entries(fields).map(([address, seed]) => [address, asHash(seed)]));

const AT = "2026-11-01T09:00:00.000Z";
const current = hashed({ title: "1111", body: "2222" });

const receipt = (over: Partial<ProvenanceReceipt> = {}): ProvenanceReceipt => ({
  collectionSlug: "posts",
  documentId: "1",
  targetLocale: "de",
  sourceLocale: "en",
  sourceFingerprint: current,
  translatedAt: AT,
  ...over,
});

const asked = (over: Partial<Parameters<typeof localeContentOf>[0]> = {}) =>
  localeContentOf({
    holdsContent: true,
    keepsRecords: true,
    receipt: undefined,
    currentFields: current,
    ...over,
  });

describe("what one target locale holds", () => {
  it("reads a locale holding nothing as empty", () => {
    expect(asked({ holdsContent: false })).toStrictEqual({ kind: "empty" });
  });

  it("reads a locale holding nothing as empty even where a record says it was translated", () => {
    expect(asked({ holdsContent: false, receipt: receipt() })).toStrictEqual({ kind: "empty" });
  });

  it("reads content as filled where the installation keeps no records", () => {
    expect(asked({ keepsRecords: false })).toStrictEqual({ kind: "filled" });
    expect(asked({ keepsRecords: false, receipt: receipt() })).toStrictEqual({ kind: "filled" });
  });

  it("reads content with no record of a run as untracked, never as empty", () => {
    expect(asked()).toStrictEqual({ kind: "untracked" });
  });

  it("reads a recorded locale as tracked, with a verdict per leaf and the time of the run", () => {
    expect(asked({ receipt: receipt() })).toStrictEqual({
      kind: "tracked",
      verdicts: { title: "current", body: "current" },
      translatedAt: AT,
    });
  });

  it("owes every leaf where the record claims one of them was never answered", () => {
    const stored = { ...current, body: UNANSWERED };

    expect(asked({ receipt: receipt({ sourceFingerprint: stored }) })).toMatchObject({
      verdicts: { title: "current", body: "unanswered" },
    });
  });

  it("owes every leaf where the record's fingerprint cannot be read at all", () => {
    expect(asked({ receipt: receipt({ sourceFingerprint: null }) })).toMatchObject({
      verdicts: { title: "unrecorded", body: "unrecorded" },
    });
  });
});
