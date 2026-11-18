import { describe, expect, it } from "vitest";

import { buildResponseSchema } from "../buildResponseSchema.js";

const closedSection = (keys: string[]) => ({
  type: "object",
  properties: Object.fromEntries(keys.map((key) => [key, { type: "string" }])),
  required: keys,
  additionalProperties: false,
});

describe("buildResponseSchema", () => {
  it("requires both sections, each with exactly the keys sent in it, and forbids extras", () => {
    expect(
      buildResponseSchema({
        marked: { 1: "<1>a </1><2>red</2>" },
        plain: { 0: "Home", 2: "Contact", "3.1": "Use <1> " },
      })
    ).toEqual({
      type: "object",
      properties: {
        marked: {
          type: "object",
          properties: { "1": { type: "string" } },
          required: ["1"],
          additionalProperties: false,
        },
        plain: {
          type: "object",
          properties: {
            "0": { type: "string" },
            "2": { type: "string" },
            "3.1": { type: "string" },
          },
          required: ["0", "2", "3.1"],
          additionalProperties: false,
        },
      },
      required: ["marked", "plain"],
      additionalProperties: false,
    });
  });

  it("keeps non-contiguous indices as they are, rather than renumbering", () => {
    const schema = buildResponseSchema({ marked: {}, plain: { 5: "a", 9: "b" } });

    expect(schema).toMatchObject({ properties: { plain: { required: ["5", "9"] } } });
  });

  it("produces closed, empty sections for empty input", () => {
    expect(buildResponseSchema({ marked: {}, plain: {} })).toEqual({
      type: "object",
      properties: { marked: closedSection([]), plain: closedSection([]) },
      required: ["marked", "plain"],
      additionalProperties: false,
    });
  });
});
