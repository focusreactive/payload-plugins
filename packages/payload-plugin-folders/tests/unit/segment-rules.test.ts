import { describe, expect, it } from "vitest";

import { isValueAccepted, needsSegmentCheck } from "../../src/admin/Settings/segmentRules.js";

describe("isValueAccepted, a settings field in a language the item has no value of its own for", () => {
  it("lets a field that is empty in this language stay empty, because the default language shows through", () => {
    expect(isValueAccepted("", "")).toBe(true);
  });

  it("accepts a value, whether or not it changed", () => {
    expect(isValueAccepted("", "Kontakt")).toBe(true);
    expect(isValueAccepted("Contact", "Contact")).toBe(true);
    expect(isValueAccepted("Contact", "Kontakt")).toBe(true);
  });

  it("refuses a value the editor emptied", () => {
    expect(isValueAccepted("Contact", "")).toBe(false);
  });
});

describe("needsSegmentCheck, the segment against the folder it is going to", () => {
  const stored = { storedParentId: 5, storedSegment: "contact" };

  it("checks nothing while nothing changed", () => {
    expect(needsSegmentCheck({ ...stored, editedParentId: 5, editedSegment: "contact" })).toBe(
      false
    );
  });

  it("checks a new segment", () => {
    expect(needsSegmentCheck({ ...stored, editedParentId: 5, editedSegment: "contact-us" })).toBe(
      true
    );
  });

  it("checks the unchanged segment in a new parent, so a rename never saves ahead of a clash", () => {
    expect(needsSegmentCheck({ ...stored, editedParentId: 9, editedSegment: "contact" })).toBe(
      true
    );
    expect(needsSegmentCheck({ ...stored, editedParentId: null, editedSegment: "contact" })).toBe(
      true
    );
  });

  it("compares parent ids as text, so 5 and '5' are the same folder", () => {
    expect(
      needsSegmentCheck({
        editedParentId: "5",
        editedSegment: "contact",
        storedParentId: 5,
        storedSegment: "contact",
      })
    ).toBe(false);
  });

  it("checks nothing for an empty segment, which falls back to the default language's", () => {
    expect(needsSegmentCheck({ ...stored, editedParentId: 9, editedSegment: "" })).toBe(false);
  });
});
