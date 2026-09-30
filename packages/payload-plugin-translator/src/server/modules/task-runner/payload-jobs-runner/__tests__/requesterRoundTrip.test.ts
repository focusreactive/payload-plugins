import { describe, it, expect } from "vitest";

import { requesterOf } from "../PayloadJobsRunnerProvider.js";

/**
 * The stored job row is the only thing that survives between asking for a deferred translation and
 * running it, so what this reads decides whether the job runs as the person who asked or as nobody —
 * and "nobody" means the write skips the permission check entirely.
 */
describe("requesterOf — reading the requester back off a job row", () => {
  it.each([
    ["a string id", "anna"],
    ["a numeric id", 7],
    ["a zero id", 0],
  ])("reads back %s unchanged", (_label, userId) => {
    expect(requesterOf({ requester_id: userId, requester_collection: "users" })).toEqual({
      userId,
      userCollection: "users",
    });
  });

  // A row written before the scope carried a requester has both columns absent, not null.
  it("reads a row queued before this feature as nobody", () => {
    expect(requesterOf({})).toBeNull();
  });

  it("reads an explicitly unattributed row as nobody", () => {
    expect(requesterOf({ requester_id: null, requester_collection: null })).toBeNull();
  });

  // Half a row cannot name a person, and guessing would run the write as someone else.
  it.each([
    ["an id with no collection", { requester_id: "anna", requester_collection: null }],
    ["a collection with no id", { requester_id: null, requester_collection: "users" }],
  ])("reads %s as nobody", (_label, row) => {
    expect(requesterOf(row)).toBeNull();
  });
});
