import { describe, it, expect } from "vitest";
import type { FieldLike } from "../../kernel/field-traversal";
import { computeSourceFingerprint } from "./computeSourceFingerprint";
import { projectTranslatableContent } from "./contentProjector";
import { fingerprint } from "./fingerprinter";

describe("computeSourceFingerprint", () => {
  const schema: FieldLike[] = [{ name: "title", type: "text", localized: true }];

  it("composes projectTranslatableContent + fingerprint", () => {
    const doc = { title: "Hello" };
    expect(computeSourceFingerprint(doc, schema)).toBe(
      fingerprint(projectTranslatableContent(doc, schema))
    );
  });

  it("changes when translatable content changes", () => {
    expect(computeSourceFingerprint({ title: "Hello" }, schema)).not.toBe(
      computeSourceFingerprint({ title: "Goodbye" }, schema)
    );
  });
});
