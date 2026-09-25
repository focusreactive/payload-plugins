import { describe, it, expect } from "vitest";
import type { FieldLike } from "../../kernel/field-traversal/index.js";
import { computeSourceFingerprint } from "./computeSourceFingerprint.js";
import { projectTranslatableContent } from "./contentProjector.js";
import { fingerprint } from "./fingerprinter.js";

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
