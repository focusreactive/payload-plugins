import { describe, expect, it } from "vitest";

import { assignmentsFromRows } from "../runAssignments.js";

import { runRow } from "./fixtures/runRecordStore.js";

describe("what each run among a set of rows is about", () => {
  it("answers once per run, however many locales it covers", () => {
    const placed = assignmentsFromRows([
      runRow({ handle: "run-1", targetLng: "de" }),
      runRow({ handle: "run-1", targetLng: "fr" }),
      runRow({ handle: "run-2", targetLng: "de" }),
    ]);

    expect(placed.map((entry) => entry.handle)).toEqual(["run-1", "run-2"]);
  });

  it("names the document the run belongs to", () => {
    const [placed] = assignmentsFromRows([runRow({ handle: "run-1", collectionId: "doc-9" })]);

    expect(placed).toMatchObject({ collectionSlug: "posts", collectionId: "doc-9" });
  });

  it("names whoever asked for the run", () => {
    const [placed] = assignmentsFromRows([
      runRow({ requesterId: "anna", requesterCollection: "users" }),
    ]);

    expect(placed.startedBy).toEqual({ id: "anna", collection: "users" });
  });

  it("names nobody when half the requester is missing, rather than half a user", () => {
    const [onlyAnId] = assignmentsFromRows([runRow({ requesterId: "anna" })]);
    const [onlyACollection] = assignmentsFromRows([runRow({ requesterCollection: "users" })]);

    expect(onlyAnId.startedBy).toBeNull();
    expect(onlyACollection.startedBy).toBeNull();
  });

  it("invents nothing from an empty set", () => {
    expect(assignmentsFromRows([])).toEqual([]);
  });
});
