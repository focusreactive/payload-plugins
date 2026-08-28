import { describe, expect, it } from "vitest";

import { buildResponseSchema } from "./buildResponseSchema";

describe("buildResponseSchema", () => {
  it("requires exactly the input's keys and forbids extras", () => {
    expect(buildResponseSchema({ 0: "Home", 2: "Contact" })).toEqual({
      type: "object",
      properties: {
        "0": { type: "string" },
        "2": { type: "string" },
      },
      required: ["0", "2"],
      additionalProperties: false,
    });
  });

  it("keeps non-contiguous indices as they are, rather than renumbering", () => {
    const schema = buildResponseSchema({ 5: "a", 9: "b" });

    expect(schema.required).toEqual(["5", "9"]);
  });

  it("produces an empty but still closed schema for empty input", () => {
    expect(buildResponseSchema({})).toEqual({
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    });
  });
});
