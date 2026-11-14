import { describe, it, expect } from "vitest";

import type { FieldFingerprints } from "../../content-projection/computeFieldFingerprints.js";
import type { SourceFingerprinter } from "../../content-projection/sourceFingerprinter.js";

import { asHash } from "../../provenance/__tests__/fixtures/claims.js";
import { hasSourceContentChanged } from "../hasSourceContentChanged.js";

const COLLECTION = "posts";

const measuring = (answers: Record<string, FieldFingerprints | null>): SourceFingerprinter => {
  return (_collection, doc) => answers[String(doc.id)] ?? null;
};

const fingerprints = (fields: Record<string, string>): FieldFingerprints =>
  Object.fromEntries(Object.entries(fields).map(([address, seed]) => [address, asHash(seed)]));

const before = { id: "before" };
const after = { id: "after" };

describe("hasSourceContentChanged", () => {
  it("true when a field's hash moved", () => {
    const measure = measuring({
      before: fingerprints({ title: "aaaa" }),
      after: fingerprints({ title: "bbbb" }),
    });

    expect(hasSourceContentChanged(before, after, COLLECTION, measure)).toBe(true);
  });

  it("false when every field hashes the same", () => {
    const measure = measuring({
      before: fingerprints({ title: "aaaa", body: "bbbb" }),
      after: fingerprints({ title: "aaaa", body: "bbbb" }),
    });

    expect(hasSourceContentChanged(before, after, COLLECTION, measure)).toBe(false);
  });

  it("false when the same fields arrive in a different order", () => {
    const measure = measuring({
      before: fingerprints({ title: "aaaa", body: "bbbb" }),
      after: fingerprints({ body: "bbbb", title: "aaaa" }),
    });

    expect(
      hasSourceContentChanged(before, after, COLLECTION, measure),
      "reordering rows moves the traversal, not the content"
    ).toBe(false);
  });

  it("true when a field appeared", () => {
    const measure = measuring({
      before: fingerprints({ title: "aaaa" }),
      after: fingerprints({ title: "aaaa", body: "bbbb" }),
    });

    expect(hasSourceContentChanged(before, after, COLLECTION, measure)).toBe(true);
  });

  it("true when a field went away", () => {
    const measure = measuring({
      before: fingerprints({ title: "aaaa", body: "bbbb" }),
      after: fingerprints({ title: "aaaa" }),
    });

    expect(hasSourceContentChanged(before, after, COLLECTION, measure)).toBe(true);
  });

  it("true on create, there being nothing to compare against", () => {
    const measure = measuring({ after: fingerprints({ title: "aaaa" }) });

    expect(hasSourceContentChanged(undefined, after, COLLECTION, measure)).toBe(true);
    expect(hasSourceContentChanged(null, after, COLLECTION, measure)).toBe(true);
  });

  it("true when this collection cannot be measured, leaving the decision to the caller", () => {
    const measure = measuring({ before: null, after: null });

    expect(hasSourceContentChanged(before, after, COLLECTION, measure)).toBe(true);
  });
});
