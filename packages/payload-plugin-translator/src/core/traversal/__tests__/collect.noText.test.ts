import { describe, expect, it, vi } from "vitest";
import { article, articleSchema } from "./fixtures/documents.js";
import { collect } from "./fixtures/harness.js";

describe("a selected leaf that yields no text", () => {
  it("is reported rather than passed through in silence", () => {
    const onSelectedWithoutText = vi.fn();
    const source = { ...article(), title: 42 };

    const targets = collect({
      fields: articleSchema,
      source,
      target: article(),
      onSelectedWithoutText,
    });

    expect(onSelectedWithoutText).toHaveBeenCalledTimes(1);
    expect(onSelectedWithoutText.mock.calls[0]?.[0]).toEqual(["title"]);
    expect(onSelectedWithoutText.mock.calls[0]?.[1]).toBe(42);
    expect(targets.map((target) => target.text)).not.toContain(42);
  });
});
describe("a leaf the language calls empty", () => {
  it("yields no target, and is not reported as unhandled — empty is an answer, not a gap", () => {
    const onSelectedWithoutText = vi.fn();
    const source = { ...article(), title: "   " };

    const targets = collect({
      fields: articleSchema,
      source,
      target: article(),
      onSelectedWithoutText,
    });

    expect(targets.map((target) => target.text)).toEqual([
      "Kicker",
      "Caption",
      "Hi",
      "Quote",
      "Author",
    ]);
    expect(onSelectedWithoutText).not.toHaveBeenCalled();
  });
});
