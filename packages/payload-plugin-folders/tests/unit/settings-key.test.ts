import { describe, expect, it } from "vitest";

import { isTextEntry, opensSettings } from "../../src/admin/Settings/settingsKey.js";

const press = (overrides: Partial<Parameters<typeof opensSettings>[0]> = {}) =>
  opensSettings({
    altKey: false,
    ctrlKey: false,
    key: "F2",
    metaKey: false,
    shiftKey: false,
    targetIsTextInput: false,
    ...overrides,
  });

describe("opensSettings, F2 on a focused row", () => {
  it("opens Settings on a plain F2", () => {
    expect(press()).toBe(true);
  });

  it("leaves every other key alone", () => {
    expect(press({ key: "F3" })).toBe(false);
    expect(press({ key: "Enter" })).toBe(false);
    expect(press({ key: "f2" })).toBe(false);
  });

  it("leaves F2 with a modifier to the browser and the system", () => {
    for (const modifier of ["altKey", "ctrlKey", "metaKey", "shiftKey"] as const) {
      expect(press({ [modifier]: true })).toBe(false);
    }
  });

  it("leaves an F2 pressed inside a text field to the field", () => {
    expect(press({ targetIsTextInput: true })).toBe(false);
  });
});

describe("isTextEntry", () => {
  it("is true for text fields, selects, text areas and editable regions", () => {
    expect(isTextEntry({ inputType: "text", isContentEditable: false, tagName: "INPUT" })).toBe(
      true
    );
    expect(isTextEntry({ inputType: "search", isContentEditable: false, tagName: "INPUT" })).toBe(
      true
    );
    expect(isTextEntry({ inputType: null, isContentEditable: false, tagName: "SELECT" })).toBe(
      true
    );
    expect(isTextEntry({ inputType: null, isContentEditable: false, tagName: "TEXTAREA" })).toBe(
      true
    );
    expect(isTextEntry({ inputType: null, isContentEditable: true, tagName: "DIV" })).toBe(true);
  });

  it("is false for the row's checkbox and buttons, so F2 still works from them", () => {
    expect(isTextEntry({ inputType: "checkbox", isContentEditable: false, tagName: "INPUT" })).toBe(
      false
    );
    expect(isTextEntry({ inputType: "radio", isContentEditable: false, tagName: "INPUT" })).toBe(
      false
    );
    expect(isTextEntry({ inputType: null, isContentEditable: false, tagName: "BUTTON" })).toBe(
      false
    );
    expect(isTextEntry({ inputType: null, isContentEditable: false, tagName: "DIV" })).toBe(false);
  });
});
