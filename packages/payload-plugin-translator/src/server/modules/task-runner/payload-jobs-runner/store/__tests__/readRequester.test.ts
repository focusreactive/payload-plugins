import { describe, expect, it } from "vitest";

import { readRequester } from "../readRequester.js";
import type { StoredInput } from "../types.js";

const stored = (fields: Partial<StoredInput>): StoredInput => fields as StoredInput;

describe("readRequester — who a stored job says asked for it", () => {
  it("names the requester a row recorded", () => {
    expect(readRequester(stored({ requester_id: "anna", requester_collection: "users" }))).toEqual({
      id: "anna",
      collection: "users",
    });
  });

  it("carries a numeric id across as a string, as the rest of the plugin holds ids", () => {
    expect(readRequester(stored({ requester_id: 7, requester_collection: "users" }))).toEqual({
      id: "7",
      collection: "users",
    });
  });

  it("keeps a zero id, which is falsy but real", () => {
    expect(readRequester(stored({ requester_id: 0, requester_collection: "users" }))).toEqual({
      id: "0",
      collection: "users",
    });
  });

  it("answers nothing for a row that recorded no requester", () => {
    expect(readRequester(stored({ requester_id: null, requester_collection: null }))).toBeNull();
  });

  it("answers nothing when only half of the pair is there", () => {
    expect(readRequester(stored({ requester_id: "anna", requester_collection: null }))).toBeNull();
    expect(readRequester(stored({ requester_id: null, requester_collection: "users" }))).toBeNull();
  });

  it("answers nothing for a row with no input at all", () => {
    expect(readRequester(undefined)).toBeNull();
  });
});
