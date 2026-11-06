import { describe, expect, it } from "vitest";

import { readLegacyRun } from "../legacyInput.js";

/*
 * Each fixture is a shape this plugin shipped, so a live `payload-jobs` row may still carry it.
 */

const flat = {
  collection_slug: "posts",
  collection_id: "doc-1",
  source_lng: "en",
  targets: [{ lng: "de", filters: [] }],
  publish_on_translation: false,
};

describe("a job row written before 1.0", () => {
  it("reads the flat document reference", () => {
    expect(readLegacyRun(flat)).toMatchObject({ collectionSlug: "posts", collectionId: "doc-1" });
  });

  it("reads the relationship the plugin wrote before references became ID-agnostic", () => {
    const run = readLegacyRun({
      collection: { relationTo: "posts", value: "doc-1" },
      source_lng: "en",
      targets: [{ lng: "de", filters: [] }],
    });

    expect(run).toMatchObject({ collectionSlug: "posts", collectionId: "doc-1" });
  });

  it("reads a numeric id from that relationship as the string every id is to us", () => {
    const run = readLegacyRun({
      collection: { relationTo: "posts", value: 7 },
      source_lng: "en",
      targets: [{ lng: "de", filters: [] }],
    });

    expect(run?.collectionId).toBe("7");
  });

  it("reads the locale list a run carries", () => {
    expect(readLegacyRun(flat)?.locales).toEqual([{ lng: "de", filters: [] }]);
  });

  it("turns the strategy a run once shared into the drift rule, which is the nearest meaning", () => {
    const run = readLegacyRun({
      ...flat,
      targets: undefined,
      target_lngs: ["de", "fr"],
      strategy: "skip_existing",
    });

    expect(run?.locales).toEqual([
      { lng: "de", filters: [{ kind: "rule", name: "stale" }] },
      { lng: "fr", filters: [{ kind: "rule", name: "stale" }] },
    ]);
  });

  it("gives a run with any other strategy no filter at all", () => {
    const run = readLegacyRun({
      ...flat,
      targets: undefined,
      target_lngs: ["de"],
      strategy: "overwrite",
    });

    expect(run?.locales).toEqual([{ lng: "de", filters: [] }]);
  });

  it("reads a job queued as a bare task, which named one locale and its filters", () => {
    const run = readLegacyRun({
      collection_slug: "posts",
      collection_id: "doc-1",
      source_lng: "en",
      target_lng: "de",
      filters: [{ kind: "rule", name: "stale" }],
    });

    expect(run?.locales).toEqual([{ lng: "de", filters: [{ kind: "rule", name: "stale" }] }]);
  });

  it("drops a locale entry the parser rejects rather than reading it as naming no filter", () => {
    const run = readLegacyRun({
      ...flat,
      targets: [{ lng: "de", filters: [] }, { nonsense: true }],
    });

    expect(
      run?.locales,
      "an unreadable entry says nothing about what its locale was meant to translate"
    ).toEqual([{ lng: "de", filters: [] }]);
  });

  it("reads the requester a row recorded", () => {
    const run = readLegacyRun({ ...flat, requester_id: 7, requester_collection: "users" });

    expect(run).toMatchObject({ requesterId: "7", requesterCollection: "users" });
  });

  it("reads a row that recorded nobody as nobody", () => {
    expect(readLegacyRun(flat)).toMatchObject({
      requesterId: null,
      requesterCollection: null,
    });
  });

  it("places nothing when the row names no document", () => {
    expect(readLegacyRun({ source_lng: "en", targets: [{ lng: "de" }] })).toBeNull();
  });

  it("places nothing when the row names no locale", () => {
    expect(readLegacyRun({ ...flat, targets: [] })).toBeNull();
  });
});
