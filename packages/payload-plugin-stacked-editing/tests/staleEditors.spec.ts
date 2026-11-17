import type { FormState } from "payload";
import { describe, expect, it, vi } from "vitest";

import {
  isEditorState,
  refreshDetachedEditors,
  staleEditorPaths,
} from "../src/lib/staleEditors.js";

const editor = (text: string) => ({ root: { children: [{ text }], type: "root" } });

describe("staleEditorPaths", () => {
  it("finds rich text under the row whose value moved away from its initial value", () => {
    const saved = editor("saved");
    const fields = {
      "layout.0.rich": { value: editor("edited"), initialValue: saved },
      "layout.0.untouched": { value: saved, initialValue: saved },
      "layout.0.text": { value: "edited", initialValue: "saved" },
      "layout.1.rich": { value: editor("edited"), initialValue: saved },
      "layout.0": { value: 1, initialValue: 1 },
    } as unknown as FormState;
    expect(staleEditorPaths(fields, "layout.0")).toEqual(["layout.0.rich"]);
  });

  it("recognizes Lexical editor state only", () => {
    expect(isEditorState(editor("x"))).toBe(true);
    expect(isEditorState({ root: "x" })).toBe(false);
    expect(isEditorState(null)).toBe(false);
  });
});

describe("refreshDetachedEditors", () => {
  it("re-points initialValue at the current value, now and after Lexical's idle write", () => {
    vi.useFakeTimers();
    const edited = editor("edited");
    let fields = {
      "layout.0.rich": { value: edited, initialValue: editor("saved") },
    } as unknown as FormState;
    const dispatchFields = vi.fn((action: { path: string; initialValue: unknown }) => {
      fields = {
        ...fields,
        [action.path]: { ...fields[action.path], initialValue: action.initialValue },
      } as FormState;
    });
    refreshDetachedEditors({ dispatchFields, getFields: () => fields, rowPath: "layout.0" });
    expect(dispatchFields).toHaveBeenCalledWith({
      type: "UPDATE",
      path: "layout.0.rich",
      initialValue: edited,
    });

    const late = editor("late");
    fields = { "layout.0.rich": { value: late, initialValue: edited } } as unknown as FormState;
    vi.runAllTimers();
    expect(dispatchFields).toHaveBeenLastCalledWith({
      type: "UPDATE",
      path: "layout.0.rich",
      initialValue: late,
    });
    vi.useRealTimers();
  });
});
