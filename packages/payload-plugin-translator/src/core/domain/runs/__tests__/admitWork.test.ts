import { describe, expect, it } from "vitest";

import { admitWork } from "../admitWork.js";

const work = (collectionId: string, targetLng: string, collectionSlug = "posts") => ({
  collectionSlug,
  collectionId,
  targetLng,
});

const run = (collectionId: string, collectionSlug = "posts") => ({
  collectionSlug,
  collectionId,
});

describe("one run per document at a time", () => {
  it("admits work for a document nothing is translating", () => {
    const { admitted, busyDocumentIds: busy } = admitWork({
      work: [work("d1", "de")],
      inFlight: [],
    });

    expect(admitted.map((item) => item.collectionId)).toEqual(["d1"]);
    expect(busy).toEqual([]);
  });

  it("turns away work for a document with a run still under way", () => {
    const { admitted, busyDocumentIds: busy } = admitWork({
      work: [work("d1", "de")],
      inFlight: [run("d1")],
    });

    expect(admitted).toEqual([]);
    expect(busy).toEqual(["d1"]);
  });

  it("turns a document away for a locale the live run does not cover", () => {
    const { admitted, busyDocumentIds: busy } = admitWork({
      work: [work("d1", "fr")],
      inFlight: [run("d1")],
    });

    expect(admitted, "a second run would put the first run's locales back as they were").toEqual(
      []
    );
    expect(busy).toEqual(["d1"]);
  });

  it("names a busy document once, however many locales were asked for it", () => {
    const { busyDocumentIds: busy } = admitWork({
      work: [work("d1", "de"), work("d1", "fr"), work("d1", "es")],
      inFlight: [run("d1")],
    });

    expect(busy).toEqual(["d1"]);
  });

  it("admits a free document alongside a busy one in the same request", () => {
    const { admitted, busyDocumentIds: busy } = admitWork({
      work: [work("busy", "de"), work("free", "de")],
      inFlight: [run("busy")],
    });

    expect(admitted.map((item) => item.collectionId)).toEqual(["free"]);
    expect(busy).toEqual(["busy"]);
  });

  it("frees a document once its runs have settled, whatever they did", () => {
    const { admitted, busyDocumentIds: busy } = admitWork({
      work: [work("d1", "de")],
      inFlight: [],
    });

    expect(admitted, "the caller passes only unsettled runs; history is not liveness").toHaveLength(
      1
    );
    expect(busy).toEqual([]);
  });

  it("keeps two collections apart when they hold the same document id", () => {
    const { admitted, busyDocumentIds: busy } = admitWork({
      work: [work("shared", "de", "posts"), work("shared", "de", "pages")],
      inFlight: [run("shared", "pages")],
    });

    expect(admitted.map((item) => item.collectionSlug)).toEqual(["posts"]);
    expect(busy).toEqual(["shared"]);
  });

  it("admits everything when nothing is under way", () => {
    const { admitted } = admitWork({
      work: [work("d1", "de"), work("d2", "fr")],
      inFlight: [],
    });

    expect(admitted).toHaveLength(2);
  });
});
