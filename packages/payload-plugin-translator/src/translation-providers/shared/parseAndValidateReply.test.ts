import { describe, expect, it } from "vitest";

import { KeySetMismatchError, UnparseableReplyError } from "./errors";
import { parseAndValidateReply } from "./parseAndValidateReply";

describe("parseAndValidateReply", () => {
  it("returns every translation when the reply is complete", () => {
    const result = parseAndValidateReply(
      { 0: "Home", 1: "About us" },
      '{"0":"Startseite","1":"Über uns"}'
    );

    expect(result.translations).toEqual({ 0: "Startseite", 1: "Über uns" });
    expect(result.missingInputKeys).toEqual([]);
    expect(result.unrequestedReplyKeys).toEqual([]);
  });

  it("applies the matching subset and names what the reply dropped", () => {
    const result = parseAndValidateReply(
      { 0: "Home", 1: "About us", 2: "Contact" },
      '{"0":"Startseite","2":"Kontakt"}'
    );

    expect(result.translations).toEqual({ 0: "Startseite", 2: "Kontakt" });
    expect(result.missingInputKeys).toEqual([1]);
    expect(result.unrequestedReplyKeys).toEqual([]);
  });

  it("reports keys the reply invented, and ignores their values", () => {
    const result = parseAndValidateReply({ 0: "Home" }, '{"0":"Startseite","7":"Erfunden"}');

    expect(result.translations).toEqual({ 0: "Startseite" });
    expect(result.unrequestedReplyKeys).toEqual(["7"]);
  });

  it("treats a non-string value as a missing key rather than coercing it", () => {
    const result = parseAndValidateReply({ 0: "Home", 1: "About" }, '{"0":"Startseite","1":42}');

    expect(result.translations).toEqual({ 0: "Startseite" });
    expect(result.missingInputKeys).toEqual([1]);
  });

  it("throws UnparseableReplyError when the reply is not JSON", () => {
    expect(() => parseAndValidateReply({ 0: "Home" }, "I cannot do that.")).toThrow(
      UnparseableReplyError
    );
  });

  it("throws UnparseableReplyError when the reply is JSON but not an object", () => {
    expect(() => parseAndValidateReply({ 0: "Home" }, '["Startseite"]')).toThrow(
      UnparseableReplyError
    );
  });

  it("throws KeySetMismatchError when the reply answers nothing", () => {
    expect(() => parseAndValidateReply({ 0: "Home", 1: "About" }, '{"9":"x"}')).toThrow(
      KeySetMismatchError
    );
  });

  it("carries the missing and unexpected keys on the mismatch error", () => {
    try {
      parseAndValidateReply({ 0: "Home", 1: "About" }, '{"9":"x"}');
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(KeySetMismatchError);
      expect((error as KeySetMismatchError).missingInputKeys).toEqual([0, 1]);
      expect((error as KeySetMismatchError).unrequestedReplyKeys).toEqual(["9"]);
    }
  });

  it("keeps the JSON parse failure as the cause", () => {
    try {
      parseAndValidateReply({ 0: "Home" }, "not json");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as UnparseableReplyError).cause).toBeInstanceOf(SyntaxError);
    }
  });

  it("reports invented keys that shadow Object.prototype members", () => {
    const result = parseAndValidateReply(
      { 0: "Home" },
      '{"0":"Startseite","toString":"y","constructor":"c"}'
    );

    expect(result.translations).toEqual({ 0: "Startseite" });
    expect(result.unrequestedReplyKeys).toEqual(
      expect.arrayContaining(["toString", "constructor"])
    );
  });

  it("returns an empty result for empty input rather than treating it as a mismatch", () => {
    const result = parseAndValidateReply({}, "{}");

    expect(result.translations).toEqual({});
    expect(result.missingInputKeys).toEqual([]);
  });
});
