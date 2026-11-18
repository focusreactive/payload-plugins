import type { RecordedFingerprints } from "../SourceFingerprint.js";
import { asHash } from "../__tests__/fixtures/claims.js";
import { SOURCE_HASH_PATTERN } from "../../content-projection/computeFieldFingerprints.js";
import { UNANSWERED } from "../SourceFingerprint.js";
import { describe, expect, it } from "vitest";

import { parseSourceFingerprint, serializeSourceFingerprint } from "../SourceFingerprint.js";

const SHA256_HEX_LENGTH = 64;
const LEGACY = "a".repeat(SHA256_HEX_LENGTH);

describe("parseSourceFingerprint", () => {
  it("reads a JSON object of addresses as the map", () => {
    expect(
      parseSourceFingerprint('{"title":"3a7f000000000000","items.a1.label":"91ce000000000000"}')
    ).toEqual({ title: asHash("3a7f"), "items.a1.label": asHash("91ce") });
  });

  it("reads a leaf an older version declined as one to revisit", () => {
    expect(parseSourceFingerprint('{"title":null,"note":"91ce000000000000"}')).toEqual({
      title: UNANSWERED,
      note: asHash("91ce"),
    });
  });

  it("reads an empty map as a map, not as absent", () => {
    expect(parseSourceFingerprint("{}")).toEqual({});
  });

  it.each([
    ["the single sha256 a version before 0.15.0 wrote", LEGACY],
    ["an uppercase one", "A".repeat(SHA256_HEX_LENGTH)],
    ["one made entirely of digits, which is also valid JSON", "1".repeat(SHA256_HEX_LENGTH)],
    ["something shorter than a digest", "abc123"],
    ["whitespace", "   "],
    ["a JSON array", '["title"]'],
    ["JSON null", "null"],
    ["a JSON number", "42"],
    ["a JSON string", '"title"'],
    ["an object whose values are not hashes", '{"title":42}'],
    ["an object nested a level too deep", '{"title":{"a":"b"}}'],
    ["unparseable JSON", '{"title":'],
    ["an empty string", ""],
    ["null", null],
    ["undefined", undefined],
  ])("reads %s as no receipt", (_label, stored) => {
    expect(parseSourceFingerprint(stored)).toBeNull();
  });

  it("never throws, whatever it is handed", () => {
    for (const stored of ["", "{", "}{", "\u0000", "{]", LEGACY.toUpperCase()]) {
      expect(() => parseSourceFingerprint(stored)).not.toThrow();
    }
  });
});

describe("serializeSourceFingerprint", () => {
  it("renders the map as a JSON object", () => {
    expect(serializeSourceFingerprint({ title: asHash("3a7f") })).toBe(
      '{"title":"3a7f000000000000"}'
    );
  });

  it.each([
    ["a map of hashes", { title: asHash("3a7f"), "i.a1.l": asHash("91ce") }],
    ["a map carrying the unanswered marker", { title: UNANSWERED, note: asHash("91ce") }],
    ["an empty map", {}],
  ] as [string, RecordedFingerprints][])(
    "round-trips %s through the column",
    (_label, fingerprint) => {
      expect(parseSourceFingerprint(serializeSourceFingerprint(fingerprint))).toEqual(fingerprint);
    }
  );

  it("round-trips an address holding the characters the path grammar escapes", () => {
    const hashes = { "items.a1\\.weird:block.label": asHash("91ce") };
    expect(parseSourceFingerprint(serializeSourceFingerprint(hashes))).toEqual(hashes);
  });
});

describe("what the schema accepts, since the column cannot", () => {
  it("refuses an unrecognised value, so the map is not read per-leaf at all", () => {
    expect(parseSourceFingerprint('{"title":"not-a-hash"}')).toBeNull();
  });

  it("refuses a value that is not sixteen hex characters", () => {
    expect(parseSourceFingerprint('{"title":"3a7f"}')).toBeNull();
    expect(parseSourceFingerprint('{"title":"3a7f00000000000000"}')).toBeNull();
    expect(parseSourceFingerprint('{"title":"3A7F000000000000"}')).toBeNull();
  });

  it("never mistakes the unanswered marker for a hash", () => {
    expect(SOURCE_HASH_PATTERN.test(UNANSWERED)).toBe(false);
  });

  it("accepts the unanswered marker beside a hash, and turns an older decline into one", () => {
    expect(parseSourceFingerprint('{"a":"3a7f000000000000","b":"!unanswered","c":null}')).toEqual({
      a: asHash("3a7f"),
      b: UNANSWERED,
      c: UNANSWERED,
    });
  });
});
