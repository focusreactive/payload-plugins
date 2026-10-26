import { describe, it, expect } from "vitest";
import { alreadyCovered } from "../model/alreadyCovered.js";
import type { StoredRunTarget } from "../store/index.js";
import type { JobLogEntry, PayloadJob } from "../store/types.js";

const translated = (targetLng: string, completedAt = "2024-01-01T00:01:00Z"): JobLogEntry => ({
  state: "succeeded",
  completedAt,
  input: { target_lng: targetLng },
});

const attemptFailed = (targetLng: string, completedAt = "2024-01-01T00:01:00Z"): JobLogEntry => ({
  state: "failed",
  completedAt,
  input: { target_lng: targetLng },
});

const runCarrying = (targetLngs: string[], log?: JobLogEntry[]): PayloadJob => ({
  id: "job-live",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  processing: true,
  log,
  input: {
    collection_slug: "posts",
    collection_id: "doc-1",
    source_lng: "en",
    target_lngs: targetLngs,
  },
});

describe("alreadyCovered", () => {
  describe("a locale the run lists and has not translated", () => {
    it("covers it when it has not been attempted, while another locale of the same run is translated", () => {
      const run = runCarrying(["de", "fr"], [translated("de")]);
      expect(alreadyCovered(run, [{ lng: "fr", filters: [] }])).toEqual(["fr"]);
    });

    it("covers it when its attempt failed, because the run will come back to it", () => {
      const run = runCarrying(["de", "fr"], [translated("de"), attemptFailed("fr")]);
      expect(alreadyCovered(run, [{ lng: "fr", filters: [] }])).toEqual(["fr"]);
    });
  });

  describe("a locale the run lists and has translated", () => {
    it("does not cover it, while the run still has an unreached locale", () => {
      const run = runCarrying(["de", "fr"], [translated("de")]);
      expect(alreadyCovered(run, [{ lng: "de", filters: [] }])).toEqual([]);
    });
  });

  describe("several records for one locale", () => {
    it("does not cover a locale that failed and was then translated", () => {
      const run = runCarrying(
        ["de", "fr"],
        [attemptFailed("de", "2024-01-01T00:01:00Z"), translated("de", "2024-01-01T00:03:00Z")]
      );
      expect(alreadyCovered(run, [{ lng: "de", filters: [] }])).toEqual([]);
    });

    it("does not cover a locale that was translated and has a later failure", () => {
      const run = runCarrying(
        ["de", "fr"],
        [translated("de", "2024-01-01T00:01:00Z"), attemptFailed("de", "2024-01-01T00:03:00Z")]
      );
      expect(alreadyCovered(run, [{ lng: "de", filters: [] }])).toEqual([]);
    });
  });

  describe("a record that names no locale", () => {
    it("ignores it, so the locale it cannot identify stays covered", () => {
      const run = runCarrying(
        ["de", "fr"],
        [
          { state: "succeeded", completedAt: "2024-01-01T00:01:00Z" },
          { state: "succeeded", completedAt: "2024-01-01T00:02:00Z", input: {} },
        ]
      );
      expect(alreadyCovered(run, [{ lng: "de", filters: [] }])).toEqual(["de"]);
    });
  });

  describe("a locale the run does not list", () => {
    it("does not cover it, though the run has locales it has not reached", () => {
      const run = runCarrying(["de", "fr"]);
      expect(alreadyCovered(run, [{ lng: "it", filters: [] }])).toEqual([]);
    });
  });

  describe("a locale asked for twice", () => {
    it("answers it once", () => {
      const run = runCarrying(["de", "fr"]);
      expect(
        alreadyCovered(run, [
          { lng: "de", filters: [] },
          { lng: "de", filters: [] },
        ])
      ).toEqual(["de"]);
    });
  });

  describe("locales the request did not ask for", () => {
    it("leaves out a locale the run carries and has not reached but nobody requested", () => {
      const run = runCarrying(["de", "fr"]);
      expect(alreadyCovered(run, [{ lng: "de", filters: [] }])).toEqual(["de"]);
    });
  });

  describe("order", () => {
    it("follows the request, not the order the run lists its locales in", () => {
      const run = runCarrying(["de", "fr", "es"]);
      expect(
        alreadyCovered(run, [
          { lng: "es", filters: [] },
          { lng: "de", filters: [] },
          { lng: "fr", filters: [] },
        ])
      ).toEqual(["es", "de", "fr"]);
    });
  });

  describe("empty request", () => {
    it("yields nothing, though the run carries locales it has not reached", () => {
      const run = runCarrying(["de", "fr"]);
      expect(alreadyCovered(run, [])).toEqual([]);
    });
  });

  describe("a run carrying no locales", () => {
    it("yields nothing", () => {
      const run = runCarrying([]);
      expect(
        alreadyCovered(run, [
          { lng: "de", filters: [] },
          { lng: "fr", filters: [] },
        ])
      ).toEqual([]);
    });
  });

  describe("a locale the run lists while meaning to translate less", () => {
    const listing = (target: StoredRunTarget) =>
      ({
        ...runCarrying([target.lng]),
        input: {
          collection_slug: "posts",
          collection_id: "doc-1",
          source_lng: "en",
          targets: [target],
        },
      }) as PayloadJob;

    it("is not covered when the run named leaves and the request named none", () => {
      expect(
        alreadyCovered(
          listing({ lng: "de", filters: [{ kind: "leaves", addresses: ["title"] }] }),
          [{ lng: "de", filters: [] }]
        )
      ).toEqual([]);
    });

    it("is not covered when the request named a leaf the run did not", () => {
      const run = listing({ lng: "de", filters: [{ kind: "leaves", addresses: ["title"] }] });

      expect(
        alreadyCovered(run, [{ lng: "de", filters: [{ kind: "leaves", addresses: ["body"] }] }])
      ).toEqual([]);
    });

    it("is covered when the run named every leaf the request did", () => {
      const run = listing({
        lng: "de",
        filters: [{ kind: "leaves", addresses: ["title", "body"] }],
      });

      expect(
        alreadyCovered(run, [{ lng: "de", filters: [{ kind: "leaves", addresses: ["body"] }] }])
      ).toEqual(["de"]);
    });

    it("is not covered when the run narrows by a rule the request did not name", () => {
      const run = listing({ lng: "de", filters: [{ kind: "rule", name: "stale" }] });

      expect(alreadyCovered(run, [{ lng: "de", filters: [] }])).toEqual([]);
    });

    it("is covered when the request names the same rule", () => {
      const run = listing({ lng: "de", filters: [{ kind: "rule", name: "stale" }] });

      expect(
        alreadyCovered(run, [{ lng: "de", filters: [{ kind: "rule", name: "stale" }] }])
      ).toEqual(["de"]);
    });

    it("is covered when the run narrows by nothing and the request does", () => {
      expect(
        alreadyCovered(listing({ lng: "de", filters: [] }), [
          { lng: "de", filters: [{ kind: "rule", name: "stale" }] },
        ])
      ).toEqual(["de"]);
    });
  });
});
