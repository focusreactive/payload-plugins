import { describe, expect, it } from "vitest";

import { KeySetMismatchError, UnparseableReplyError } from "../errors/index.js";
import { parseAndValidateReply } from "../parseAndValidateReply.js";
import type { Sections } from "../wire/index.js";

const plain = (values: Record<string, string>): Sections => ({ marked: {}, plain: values });

const reply = (sections: Partial<Record<keyof Sections, Record<string, unknown>>>): string =>
  JSON.stringify({ marked: {}, plain: {}, ...sections });

describe("parseAndValidateReply", () => {
  it("returns every translation when the reply is complete", () => {
    const result = parseAndValidateReply(
      { marked: { 2: "<1>a </1><2>red</2>" }, plain: { 0: "Home", 1: "About us" } },
      reply({ marked: { 2: "<1>ein </1><2>rotes</2>" }, plain: { 0: "Startseite", 1: "Über uns" } })
    );

    expect(result).toEqual({
      marked: { 2: "<1>ein </1><2>rotes</2>" },
      plain: { 0: "Startseite", 1: "Über uns" },
    });
  });

  it("keeps the matching subset of a partial reply", () => {
    const result = parseAndValidateReply(
      plain({ 0: "Home", 1: "About us", 2: "Contact" }),
      reply({ plain: { 0: "Startseite", 2: "Kontakt" } })
    );

    expect(result).toEqual({ marked: {}, plain: { 0: "Startseite", 2: "Kontakt" } });
  });

  it("keeps the answered piece and leaves a dropped marked value and piece out", () => {
    const result = parseAndValidateReply(
      { marked: { 1: "<1>a</1>" }, plain: { 0: "Home", "2.1": "Use <1> ", "2.2": "here" } },
      reply({ plain: { 0: "Startseite", "2.1": "Nutze <1> " } })
    );

    expect(result).toEqual({ marked: {}, plain: { 0: "Startseite", "2.1": "Nutze <1> " } });
  });

  it("ignores keys the reply invented", () => {
    const result = parseAndValidateReply(
      plain({ 0: "Home" }),
      reply({ plain: { 0: "Startseite", 7: "Erfunden" } })
    );

    expect(result).toEqual({ marked: {}, plain: { 0: "Startseite" } });
  });

  it("ignores a section the reply invented", () => {
    const result = parseAndValidateReply(
      plain({ 0: "Home" }),
      JSON.stringify({ marked: {}, plain: { 0: "Startseite" }, extra: { 0: "x" } })
    );

    expect(result).toEqual({ marked: {}, plain: { 0: "Startseite" } });
  });

  it("does not take a value from the wrong section", () => {
    const result = parseAndValidateReply(
      { marked: { 1: "<1>a</1>" }, plain: { 0: "Home", 2: "About" } },
      reply({ marked: { 0: "Startseite" }, plain: { 1: "<1>ein</1>", 2: "Über" } })
    );

    expect(result).toEqual({ marked: {}, plain: { 2: "Über" } });
  });

  it("treats a non-string value as a missing key rather than coercing it", () => {
    const result = parseAndValidateReply(
      plain({ 0: "Home", 1: "About" }),
      reply({ plain: { 0: "Startseite", 1: 42 } })
    );

    expect(result).toEqual({ marked: {}, plain: { 0: "Startseite" } });
  });

  it("throws UnparseableReplyError when the reply is not JSON", () => {
    expect(() => parseAndValidateReply(plain({ 0: "Home" }), "I cannot do that.")).toThrow(
      UnparseableReplyError
    );
  });

  it("throws UnparseableReplyError when the reply is JSON but not an object", () => {
    expect(() => parseAndValidateReply(plain({ 0: "Home" }), '["Startseite"]')).toThrow(
      UnparseableReplyError
    );
  });

  it("throws KeySetMismatchError when the reply answers nothing", () => {
    expect(() =>
      parseAndValidateReply(plain({ 0: "Home", 1: "About" }), reply({ plain: { 9: "x" } }))
    ).toThrow(KeySetMismatchError);
  });

  it("throws KeySetMismatchError when the reply is flat rather than in sections", () => {
    expect(() =>
      parseAndValidateReply(plain({ 0: "Home", 1: "About" }), '{"0":"Startseite","1":"Über uns"}')
    ).toThrow(KeySetMismatchError);
  });

  it("names wrong value types rather than a key mismatch when the keys did match", () => {
    try {
      parseAndValidateReply(plain({ 0: "Home", 1: "About" }), reply({ plain: { 0: 42, 1: true } }));
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(KeySetMismatchError);
      expect((error as Error).message).toContain("none of the 2 values was a string");
      expect((error as Error).message).not.toContain("answered none of");
    }
  });

  it("still names a key mismatch when no requested key came back at all", () => {
    try {
      parseAndValidateReply(plain({ 0: "Home" }), reply({ plain: { 9: "x" } }));
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as Error).message).toContain("answered none of the 1 requested keys");
    }
  });

  it("keeps model-invented keys out of a serialized error", () => {
    try {
      parseAndValidateReply(plain({ 0: "Home" }), reply({ plain: { "leaked-by-the-model": "x" } }));
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as KeySetMismatchError).unrequestedReplyKeys).toEqual(["leaked-by-the-model"]);
      expect(JSON.stringify(error)).not.toContain("leaked-by-the-model");
      expect(Object.keys(error as object)).not.toContain("unrequestedReplyKeys");
    }
  });

  it("carries the missing and unexpected keys on the mismatch error", () => {
    try {
      parseAndValidateReply(plain({ 0: "Home", 1: "About" }), reply({ plain: { 9: "x" } }));
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(KeySetMismatchError);
      expect((error as KeySetMismatchError).missingInputKeys).toEqual([0, 1]);
      expect((error as KeySetMismatchError).unrequestedReplyKeys).toEqual(["9"]);
    }
  });

  it("keeps the JSON parse failure as the cause", () => {
    try {
      parseAndValidateReply(plain({ 0: "Home" }), "not json");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as UnparseableReplyError).cause).toBeInstanceOf(SyntaxError);
    }
  });

  it("ignores invented keys that shadow Object.prototype members", () => {
    const result = parseAndValidateReply(
      plain({ 0: "Home" }),
      JSON.stringify({
        marked: {},
        plain: { 0: "Startseite", toString: "y", constructor: "c" },
        hasOwnProperty: "h",
      })
    );

    expect(result).toEqual({ marked: {}, plain: { 0: "Startseite" } });
  });

  it("returns an empty result for empty input rather than treating it as a mismatch", () => {
    const result = parseAndValidateReply(plain({}), "{}");

    expect(result).toEqual({ marked: {}, plain: {} });
  });
});
