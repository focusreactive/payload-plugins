import { describe, expect, it } from "vitest";

import { resolveMarks, serializeMarks } from "./fixtures/marks.js";

const pieces = () => [{ text: "I bought a " }, { text: "red" }, { text: " car" }];

describe("a container unit resolves without performing", () => {
  it("names one write per piece and touches nothing", () => {
    const children = pieces();
    const sent = serializeMarks(children);

    const writes = resolveMarks(children, sent.replace("I bought a ", "Ich kaufte ein "));

    expect(children.map((piece) => piece.text)).toEqual(["I bought a ", "red", " car"]);
    expect(writes).toHaveLength(3);
    expect(writes[0]).toEqual({
      slot: { holder: children[0], key: "text" },
      value: "Ich kaufte ein ",
    });
  });

  it("names no write at all when the answer is not entirely marks", () => {
    const children = pieces();

    expect(resolveMarks(children, "stray text")).toEqual([]);
    expect(children.map((piece) => piece.text)).toEqual(["I bought a ", "red", " car"]);
  });
});
