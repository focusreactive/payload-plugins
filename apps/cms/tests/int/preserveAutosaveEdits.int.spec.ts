import type { FormState } from "payload";
import { describe, expect, it } from "vitest";

import {
  editedPathsIn,
  fieldsMissingEditMark,
  hasUnsavedEdits,
} from "@/components/admin/PreserveAutosaveEdits/editedFields";

const field = (value: unknown, extra: Record<string, unknown> = {}) =>
  ({ initialValue: value, valid: true, value, ...extra }) as FormState[string];

describe("editedPathsIn", () => {
  it("returns paths the user is editing", () => {
    const fields: FormState = {
      subtitle: field("b"),
      title: field("a", { isModified: true }),
    };

    expect(editedPathsIn(fields)).toEqual(["title"]);
  });
});

describe("fieldsMissingEditMark", () => {
  it("re-marks fields edited earlier that lost the mark", () => {
    const fields: FormState = {
      subtitle: field("s", { isModified: true }),
      title: field("one two"),
    };

    expect(fieldsMissingEditMark(fields, new Set(["title", "subtitle"]))).toEqual({
      title: { ...fields.title, isModified: true },
    });
    expect(fields.title?.isModified).toBeUndefined();
  });

  it("ignores fields that were never edited", () => {
    expect(fieldsMissingEditMark({ title: field("a") }, new Set())).toEqual({});
  });

  it("ignores edited paths that no longer exist", () => {
    expect(fieldsMissingEditMark({}, new Set(["blocks.0.title"]))).toEqual({});
  });
});

describe("hasUnsavedEdits", () => {
  it("is true when an edited value differs from the saved document", () => {
    const fields: FormState = { title: field("one two four", { isModified: true }) };

    expect(hasUnsavedEdits(fields, new Set(["title"]), { title: "one two" })).toBe(true);
  });

  it("is false when every edited value is saved", () => {
    const fields: FormState = { title: field("one two four") };

    expect(hasUnsavedEdits(fields, new Set(["title"]), { title: "one two four" })).toBe(false);
  });

  it("treats a cleared field as saved when the document has no value", () => {
    const fields: FormState = { subtitle: field("") };

    expect(hasUnsavedEdits(fields, new Set(["subtitle"]), { subtitle: null })).toBe(false);
    expect(hasUnsavedEdits(fields, new Set(["subtitle"]), {})).toBe(false);
  });

  it("reads nested paths of blocks and arrays", () => {
    const fields: FormState = { "blocks.0.title": field("new") };

    expect(
      hasUnsavedEdits(fields, new Set(["blocks.0.title"]), { blocks: [{ title: "old" }] })
    ).toBe(true);
  });

  it("compares rich text by value, not by key order", () => {
    const local = { root: { children: [], type: "root", version: 1 } };
    const saved = { root: { type: "root", version: 1, children: [] } };

    expect(hasUnsavedEdits({ body: field(local) }, new Set(["body"]), { body: saved })).toBe(false);
  });

  it("skips array and blocks fields whose form value is a row count", () => {
    const fields: FormState = { blocks: field(2, { rows: [{ id: "a" }, { id: "b" }] }) };

    expect(
      hasUnsavedEdits(fields, new Set(["blocks"]), { blocks: [{ id: "a" }, { id: "b" }] })
    ).toBe(false);
  });
});
