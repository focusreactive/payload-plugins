import { describe, expect, it } from "vitest";

import { descriptionFieldOf } from "../../src/shared/mediaOption";

describe("the field that describes the media of a collection", () => {
  it.each([
    ["a text field", [{ name: "alt", type: "text" }]],
    ["a textarea field", [{ name: "alt", type: "textarea" }]],
    ["a field in a row", [{ fields: [{ name: "alt", type: "textarea" }], type: "row" }]],
    [
      "a field in a tab without a name",
      [{ tabs: [{ fields: [{ name: "alt", type: "text" }], label: "Meta" }], type: "tabs" }],
    ],
  ])("is named by %s", (_, fields) => {
    expect(descriptionFieldOf(fields, "alt")).toBe("alt");
  });

  it.each([
    ["a field that holds no text", [{ name: "alt", type: "select" }]],
    [
      "a field of a group",
      [{ fields: [{ name: "alt", type: "text" }], name: "meta", type: "group" }],
    ],
    ["no field", [{ name: "caption", type: "text" }]],
  ])("is none for %s", (_, fields) => {
    expect(descriptionFieldOf(fields, "alt")).toBeNull();
  });
});
