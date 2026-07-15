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
  it("orders rows by the source→target locale pair, independent of state", () => {
    const rows = buildTranslationStatusRows({
      staleness: staleness([
        { target: "fr", stale: true },
        { target: "de", stale: false },
      ]),
    });
    // `de` before `fr` alphabetically, even though `fr` is stale and `de` is merely translated.
    expect(rows.map((r) => [r.targetLocale, r.state])).toEqual([
      ["de", "translated"],
      ["fr", "stale"],
    ]);
    expect(rows[0].sourceLocale).toBe("en");
  });

  it("overlays a transient job (running) over the durable state and sets jobId", () => {
    const rows = buildTranslationStatusRows({
      staleness: staleness([{ target: "de", stale: true }]),
      runs: [job(DocumentTranslationStatus.RUNNING, "de")],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ targetLocale: "de", state: "running", jobId: "job-de" });
  });

  it("adds a row for a job whose target has no provenance record yet, carrying the failure reason", () => {
    const rows = buildTranslationStatusRows({
      staleness: staleness([{ target: "de", stale: false }]),
      runs: [job(DocumentTranslationStatus.FAILED, "it")],
    });
    // Ordered by locale pair (de before it), regardless of state.
    expect(rows.map((r) => [r.targetLocale, r.state])).toEqual([
      ["de", "translated"],
      ["it", "failed"],
    ]);
    const failed = rows.find((r) => r.targetLocale === "it");
    expect(failed?.jobId).toBe("job-it");
    expect(failed?.error).toBe("x");
  });

  it("does not override a durable row with a completed job (no duplicate, keeps provenance state)", () => {
    const rows = buildTranslationStatusRows({
      staleness: staleness([{ target: "de", stale: true }]),
      runs: [job(DocumentTranslationStatus.COMPLETED, "de")],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ targetLocale: "de", state: "stale" });
    expect(rows[0].jobId).toBeUndefined();
  });

  it("overlays every concurrent job onto its own locale — no job overwrites another", () => {
    // Three locales stale; two are being re-translated concurrently, one still just stale.
    const rows = buildTranslationStatusRows({
      staleness: staleness([
        { target: "de", stale: true },
        { target: "fr", stale: true },
        { target: "it", stale: true },
      ]),
      runs: [
        job(DocumentTranslationStatus.RUNNING, "de"),
        job(DocumentTranslationStatus.PENDING, "fr"),
      ],
    });
    const byLocale = Object.fromEntries(rows.map((r) => [r.targetLocale, r]));
    expect(byLocale.de).toMatchObject({ state: "running", jobId: "job-de" });
    expect(byLocale.fr).toMatchObject({ state: "pending", jobId: "job-fr" });
    // The untouched locale keeps its durable stale state — it is not clobbered by the other jobs.
    expect(byLocale.it).toMatchObject({ state: "stale" });
    expect(byLocale.it.jobId).toBeUndefined();
  });

  it("keeps a row in the same position when its state changes (re-translate does not reorder)", () => {
    const base = staleness([
      { target: "de", stale: false },
      { target: "fr", stale: true },
      { target: "it", stale: true },
    ]);
    const orderBefore = buildTranslationStatusRows({ staleness: base }).map((r) => r.targetLocale);

    // Re-translate `it` → its state flips stale → running; the order must be unchanged.
    const orderAfter = buildTranslationStatusRows({
      staleness: base,
      runs: [job(DocumentTranslationStatus.RUNNING, "it")],
    }).map((r) => r.targetLocale);

    expect(orderBefore).toEqual(["de", "fr", "it"]);
    expect(orderAfter).toEqual(orderBefore);
  });

  it("returns [] when there is nothing to show", () => {
    expect(buildTranslationStatusRows({})).toEqual([]);
    expect(buildTranslationStatusRows({ staleness: { locales: [] }, runs: [] })).toEqual([]);
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
