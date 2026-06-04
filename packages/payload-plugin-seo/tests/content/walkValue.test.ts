import { describe, expect, it } from "vitest";
import { walkValue } from "../../src/content/walkValue";

describe("walkValue", () => {
  it("emits a text fragment for a string", () => {
    expect(walkValue("hello")).toEqual([{ kind: "text", value: "hello" }]);
  });

  it("detects a lexical value by its root key", () => {
    const lex = { root: { type: "root", children: [] } };
    expect(walkValue(lex)).toEqual([{ kind: "lexical", value: lex }]);
  });

  it("walks a blocks array in order, descending into block fields", () => {
    const blocks = [
      { blockType: "hero", title: "Big title", description: "Sub" },
      { blockType: "copy", text: "Body copy" },
    ];
    expect(walkValue(blocks)).toEqual([
      { kind: "text", value: "Big title" },
      { kind: "text", value: "Sub" },
      { kind: "text", value: "Body copy" },
    ]);
  });

  it("ignores non-content scalars (numbers, booleans, ids)", () => {
    const blocks = [{ blockType: "copy", id: "abc", order: 3, enabled: true, text: "Keep" }];
    expect(walkValue(blocks)).toEqual([{ kind: "text", value: "Keep" }]);
  });
});
