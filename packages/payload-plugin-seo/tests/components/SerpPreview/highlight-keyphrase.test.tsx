import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import { highlightKeyphrase } from "../../../src/components/SeoDrawer/components/SerpPreview/highlight-keyphrase";

// Helpers ----------------------------------------------------------------

function isStrongElement(node: unknown): node is React.ReactElement {
  return isValidElement(node) && node.type === "strong";
}

function strongChildren(node: unknown): unknown {
  if (isStrongElement(node)) {
    return (node.props as { children: unknown }).children;
  }
  return undefined;
}

// Tests ------------------------------------------------------------------

describe("highlightKeyphrase", () => {
  it("returns [text] when keyphrase is empty", () => {
    const result = highlightKeyphrase("Hello world", "");
    expect(result).toEqual(["Hello world"]);
  });

  it("returns [text] when keyphrase is whitespace-only", () => {
    const result = highlightKeyphrase("Hello world", "   ");
    expect(result).toEqual(["Hello world"]);
  });

  it("returns [text] for tab-only keyphrase", () => {
    const result = highlightKeyphrase("Hello world", "\t");
    expect(result).toEqual(["Hello world"]);
  });

  it("wraps a single occurrence in a strong element", () => {
    const result = highlightKeyphrase("Buy running shoes today", "running shoes");
    // expect [before, strong, after]
    const strongEl = result.find(isStrongElement);
    expect(strongEl).toBeDefined();
    expect(strongChildren(strongEl)).toBe("running shoes");
  });

  it("preserves surrounding text as plain strings", () => {
    const result = highlightKeyphrase("Buy running shoes today", "running shoes");
    expect(result[0]).toBe("Buy ");
    expect(result[2]).toBe(" today");
  });

  it("is case-insensitive: matches regardless of input casing", () => {
    const result = highlightKeyphrase("Running Shoes are great", "running shoes");
    const strongEl = result.find(isStrongElement);
    expect(strongEl).toBeDefined();
  });

  it("preserves original casing inside the strong element", () => {
    const result = highlightKeyphrase("Running Shoes are great", "running shoes");
    const strongEl = result.find(isStrongElement);
    // original text was "Running Shoes" — keep that exact casing
    expect(strongChildren(strongEl)).toBe("Running Shoes");
  });

  it("wraps all multiple occurrences in their own strong elements", () => {
    const result = highlightKeyphrase("shoes are shoes, not shoes", "shoes");
    const strongEls = result.filter(isStrongElement);
    expect(strongEls).toHaveLength(3);
    for (const el of strongEls) {
      expect(strongChildren(el)).toBe("shoes");
    }
  });

  it("each strong element has a defined key prop", () => {
    const result = highlightKeyphrase("Get running shoes and running shoes", "running shoes");
    const strongEls = result.filter(isStrongElement);
    expect(strongEls.length).toBeGreaterThan(0);
    for (const el of strongEls) {
      expect(el.key).toBeDefined();
      expect(el.key).not.toBeNull();
    }
  });

  it("keys are distinct across multiple occurrences", () => {
    const result = highlightKeyphrase("a b a b a", "a");
    const strongEls = result.filter(isStrongElement);
    const keys = strongEls.map((el) => el.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(strongEls.length);
  });

  it("treats regex metacharacters in keyphrase literally — does not throw", () => {
    expect(() => highlightKeyphrase("hello (world.*) test", "(world.*)")).not.toThrow();
  });

  it("matches a keyphrase with regex metacharacters when literally present", () => {
    const result = highlightKeyphrase("hello (world.*) test", "(world.*)");
    const strongEl = result.find(isStrongElement);
    expect(strongEl).toBeDefined();
    expect(strongChildren(strongEl)).toBe("(world.*)");
  });

  it("does not match when metacharacter keyphrase is not literally present", () => {
    // "(world.*)" as a regex would match "world" + anything, but as literal it should not match "worldABC"
    const result = highlightKeyphrase("worldABC", "(world.*)");
    const strongEls = result.filter(isStrongElement);
    expect(strongEls).toHaveLength(0);
  });

  it("treats <b> keyphrase literally — does not throw", () => {
    expect(() => highlightKeyphrase("plain text <b>bold</b> here", "<b>")).not.toThrow();
  });

  it("matches <b> as a literal string when present", () => {
    const result = highlightKeyphrase("plain text <b>bold</b> here", "<b>");
    const strongEl = result.find(isStrongElement);
    expect(strongEl).toBeDefined();
    expect(strongChildren(strongEl)).toBe("<b>");
  });

  it("returns plain string array with no strong elements when keyphrase is not found in text", () => {
    const result = highlightKeyphrase("Nothing here matches", "xyz123");
    expect(result.filter(isStrongElement)).toHaveLength(0);
    // The entire text comes back as a single segment
    expect(result).toContain("Nothing here matches");
  });
});
