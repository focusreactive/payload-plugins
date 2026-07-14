import { describe, it, expect } from "vitest";

import { DocumentTranslationStatus } from "./enums";
import { buildTranslationStatusRows, STATE_DOT } from "./statusRows";
import type { DocumentStaleness, DocumentTranslation } from "./types";

const staleness = (
  locales: Array<{ target: string; stale: boolean; at?: string }>
): DocumentStaleness => ({
  locales: locales.map((l) => ({
    target_lng: l.target,
    source_lng: "en",
    is_stale: l.stale,
    translated_at: l.at ?? "2026-07-01T00:00:00.000Z",
  })),
});

const job = (
  status: DocumentTranslationStatus,
  target: string,
  updated_at = "2026-07-07T00:00:00.000Z"
): DocumentTranslation =>
  ({
    id: `job-${target}`,
    status,
    created_at: "2026-07-06T00:00:00.000Z",
    updated_at,
    input: { source_lng: "en", target_lng: target },
    ...(status === DocumentTranslationStatus.FAILED ? { error: { message: "x" } } : {}),
    ...(status === DocumentTranslationStatus.COMPLETED ? { completed_at: updated_at } : {}),
  }) as DocumentTranslation;

describe("buildTranslationStatusRows", () => {
  it("maps staleness into stale + translated rows, stale before translated", () => {
    const rows = buildTranslationStatusRows({
      staleness: staleness([
        { target: "de", stale: false },
        { target: "fr", stale: true },
      ]),
    });
    expect(rows.map((r) => [r.targetLocale, r.state])).toEqual([
      ["fr", "stale"],
      ["de", "translated"],
    ]);
    expect(rows[0].sourceLocale).toBe("en");
  });

  it("overlays a transient job (running) over the durable state and sets jobId", () => {
    const rows = buildTranslationStatusRows({
      staleness: staleness([{ target: "de", stale: true }]),
      run: job(DocumentTranslationStatus.RUNNING, "de"),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ targetLocale: "de", state: "running", jobId: "job-de" });
  });

  it("adds a row for a job whose target has no provenance record yet, carrying the failure reason", () => {
    const rows = buildTranslationStatusRows({
      staleness: staleness([{ target: "de", stale: false }]),
      run: job(DocumentTranslationStatus.FAILED, "it"),
    });
    expect(rows.map((r) => [r.targetLocale, r.state])).toEqual([
      ["it", "failed"],
      ["de", "translated"],
    ]);
    expect(rows[0].jobId).toBe("job-it");
    expect(rows[0].error).toBe("x");
  });

  it("does not override a durable row with a completed job (no duplicate, keeps provenance state)", () => {
    const rows = buildTranslationStatusRows({
      staleness: staleness([{ target: "de", stale: true }]),
      run: job(DocumentTranslationStatus.COMPLETED, "de"),
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ targetLocale: "de", state: "stale" });
    expect(rows[0].jobId).toBeUndefined();
  });

  it("sorts by priority failed → running → pending → stale → translated", () => {
    const rows = buildTranslationStatusRows({
      staleness: staleness([
        { target: "de", stale: false },
        { target: "fr", stale: true },
      ]),
      run: job(DocumentTranslationStatus.FAILED, "it"),
    });
    expect(rows.map((r) => r.state)).toEqual(["failed", "stale", "translated"]);
  });

  it("returns [] when there is nothing to show", () => {
    expect(buildTranslationStatusRows({})).toEqual([]);
    expect(buildTranslationStatusRows({ staleness: { locales: [] }, run: null })).toEqual([]);
  });
});

describe("STATE_DOT", () => {
  it("maps each row state to its colour, and only the in-progress state pulses", () => {
    expect(STATE_DOT.failed).toEqual({ color: "red" });
    expect(STATE_DOT.running).toEqual({ color: "blue", animated: true });
    expect(STATE_DOT.pending).toEqual({ color: "gray" });
    expect(STATE_DOT.stale).toEqual({ color: "amber" });
    expect(STATE_DOT.translated).toEqual({ color: "green" });

    const animated = Object.entries(STATE_DOT)
      .filter(([, dot]) => dot.animated)
      .map(([state]) => state);
    expect(animated).toEqual(["running"]);
  });
});
