import type { SourceFingerprint } from "./SourceFingerprint.js";
import { asHash } from "./__tests__/fixtures/claims.js";
import { SOURCE_HASH_PATTERN } from "../content-projection/computeFieldFingerprints.js";
import { UNANSWERED } from "./SourceFingerprint.js";
import { describe, expect, it } from "vitest";

import { parseSourceFingerprint, serializeSourceFingerprint } from "./SourceFingerprint.js";

const SHA256_HEX_LENGTH = 64;
const LEGACY = "a".repeat(SHA256_HEX_LENGTH);

describe("parseSourceFingerprint", () => {
  it("reads the single sha256 a previous version wrote as the document shape", () => {
    expect(parseSourceFingerprint(LEGACY)).toEqual({ kind: "document", hash: LEGACY });
  });

  it("reads a JSON object of addresses as the per-field shape", () => {
    expect(
      parseSourceFingerprint('{"title":"3a7f000000000000","items.a1.label":"91ce000000000000"}')
    ).toEqual({
      kind: "fields",
      hashes: { title: asHash("3a7f"), "items.a1.label": asHash("91ce") },
    });
  });

  it("reads a leaf recorded as seen-but-not-ours", () => {
    expect(parseSourceFingerprint('{"title":null,"note":"91ce000000000000"}')).toEqual({
      kind: "fields",
      hashes: { title: null, note: asHash("91ce") },
    });
  });

  it("reads an empty per-field map as a per-field map, not as absent", () => {
    expect(parseSourceFingerprint("{}")).toEqual({ kind: "fields", hashes: {} });
  });

  // One rule, not two: anything that is not a per-field map is whatever the old format stored. The
  // reader cannot tell a corrupt value from an old hash, and no consumer needs to — both read as out
  // of date and neither claims anything about a leaf.
  it.each([
    ["a lowercase sha256", "a".repeat(64)],
    ["an uppercase one", "A".repeat(64)],
    ["one made entirely of digits, which is also valid JSON", "1".repeat(64)],
    ["something shorter than a digest", "abc123"],
    ["whitespace", "   "],
    ["a JSON array", '["title"]'],
    ["JSON null", "null"],
    ["a JSON number", "42"],
    ["a JSON string", '"title"'],
    ["an object whose values are not hashes", '{"title":42}'],
    ["an object nested a level too deep", '{"title":{"a":"b"}}'],
    ["unparseable JSON", '{"title":'],
  ])("reads %s as the old document-wide shape", (_label, stored) => {
    expect(parseSourceFingerprint(stored)).toEqual({ kind: "document", hash: stored });
  });

  it.each([
    ["an empty string", ""],
    ["null", null],
    ["undefined", undefined],
  ])("reads %s as nothing stored at all", (_label, stored) => {
    expect(parseSourceFingerprint(stored)).toBeNull();
  });

  it("never throws, whatever it is handed", () => {
    for (const stored of ["", "{", "}{", "\u0000", "{]", LEGACY.toUpperCase()]) {
      expect(() => parseSourceFingerprint(stored)).not.toThrow();
    }
  });
});

describe("serializeSourceFingerprint", () => {
  it("renders the document shape as the bare hash", () => {
    expect(serializeSourceFingerprint({ kind: "document", hash: LEGACY })).toBe(LEGACY);
  });

  it("renders the per-field shape as a JSON object", () => {
    expect(serializeSourceFingerprint({ kind: "fields", hashes: { title: asHash("3a7f") } })).toBe(
      '{"title":"3a7f000000000000"}'
    );
  });

  it.each([
    ["the document shape", { kind: "document", hash: LEGACY } as const],
    [
      "the per-field shape",
      { kind: "fields", hashes: { title: asHash("3a7f"), "i.a1.l": asHash("91ce") } },
    ],
    [
      "a map carrying the seen-but-not-ours marker",
      { kind: "fields", hashes: { title: null, note: asHash("91ce") } },
    ],
    ["an empty per-field map", { kind: "fields", hashes: {} }],
  ] as [string, SourceFingerprint][])(
    "round-trips %s through the column",
    (_label, fingerprint) => {
      expect(parseSourceFingerprint(serializeSourceFingerprint(fingerprint))).toEqual(fingerprint);
    }
  );

  it("round-trips an address holding the characters the path grammar escapes", () => {
    const hashes = { "items.a1\\.weird:block.label": asHash("91ce") };
    expect(parseSourceFingerprint(serializeSourceFingerprint({ kind: "fields", hashes }))).toEqual({
      kind: "fields",
      hashes,
    });
  });
});

describe("what the schema accepts, since the column cannot", () => {
  it("refuses an unrecognised value, so the map is not read per-leaf at all", () => {
    expect(parseSourceFingerprint('{"title":"not-a-hash"}')).toEqual({
      kind: "document",
      hash: '{"title":"not-a-hash"}',
    });
  });

  it("refuses a value that is not sixteen hex characters", () => {
    expect(parseSourceFingerprint('{"title":"3a7f"}')?.kind).toBe("document");
    expect(parseSourceFingerprint('{"title":"3a7f00000000000000"}')?.kind).toBe("document");
    expect(parseSourceFingerprint('{"title":"3A7F000000000000"}')?.kind).toBe("document");
  });

  it("still reads a legacy document-wide digest, which this check never applies to", () => {
    expect(parseSourceFingerprint(LEGACY)).toEqual({ kind: "document", hash: LEGACY });
  });

  it("never mistakes the unanswered marker for a hash", () => {
    expect(SOURCE_HASH_PATTERN.test(UNANSWERED)).toBe(false);
  });

  it("accepts the unanswered marker beside a hash and a decline", () => {
    expect(parseSourceFingerprint('{"a":"3a7f000000000000","b":"!unanswered","c":null}')).toEqual({
      kind: "fields",
      hashes: { a: asHash("3a7f"), b: UNANSWERED, c: null },
    });
  });
});
