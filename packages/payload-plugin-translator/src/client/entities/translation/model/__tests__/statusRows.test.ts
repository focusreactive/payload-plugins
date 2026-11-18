import { describe, it, expect } from "vitest";

import { DocumentTranslationStatus } from "../enums.js";
import { buildTranslationStatusRows, isRunOwned, STATE_DOT } from "../statusRows.js";
import type { DocumentStaleness, DocumentTranslation } from "../types.js";

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

const run = (
  status: DocumentTranslationStatus,
  target: string,
  updated_at = "2026-07-07T00:00:00.000Z"
): DocumentTranslation =>
  ({
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

  it("overlays a transient run (running) over the durable state", () => {
    const rows = buildTranslationStatusRows({
      staleness: staleness([{ target: "de", stale: true }]),
      runs: [run(DocumentTranslationStatus.RUNNING, "de")],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ targetLocale: "de", state: "running" });
  });

  it("adds a row for a run whose target has no provenance record yet, carrying the failure reason", () => {
    const rows = buildTranslationStatusRows({
      staleness: staleness([{ target: "de", stale: false }]),
      runs: [run(DocumentTranslationStatus.FAILED, "it")],
    });
    // Ordered by locale pair (de before it), regardless of state.
    expect(rows.map((r) => [r.targetLocale, r.state])).toEqual([
      ["de", "translated"],
      ["it", "failed"],
    ]);
    const failed = rows.find((r) => r.targetLocale === "it");
    expect(failed?.error).toBe("x");
  });

  it("does not override a durable row with a completed run (no duplicate, keeps provenance state)", () => {
    const rows = buildTranslationStatusRows({
      staleness: staleness([{ target: "de", stale: true }]),
      runs: [run(DocumentTranslationStatus.COMPLETED, "de")],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ targetLocale: "de", state: "stale" });
  });

  it("overlays every concurrent run onto its own locale — no run overwrites another", () => {
    // Three locales stale; two are being re-translated concurrently, one still just stale.
    const rows = buildTranslationStatusRows({
      staleness: staleness([
        { target: "de", stale: true },
        { target: "fr", stale: true },
        { target: "it", stale: true },
      ]),
      runs: [
        run(DocumentTranslationStatus.RUNNING, "de"),
        run(DocumentTranslationStatus.PENDING, "fr"),
      ],
    });
    const byLocale = Object.fromEntries(rows.map((r) => [r.targetLocale, r]));
    expect(byLocale.de).toMatchObject({ state: "running" });
    expect(byLocale.fr).toMatchObject({ state: "pending" });
    expect(byLocale.it).toMatchObject({ state: "stale" });
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
      runs: [run(DocumentTranslationStatus.RUNNING, "it")],
    }).map((r) => r.targetLocale);

    expect(orderBefore).toEqual(["de", "fr", "it"]);
    expect(orderAfter).toEqual(orderBefore);
  });

  it("returns [] when there is nothing to show", () => {
    expect(buildTranslationStatusRows({})).toEqual([]);
    expect(buildTranslationStatusRows({ staleness: { locales: [] }, runs: [] })).toEqual([]);
  });
  it("renders a failed locale whose run carries no error yet", () => {
    const failedWithoutError = {
      status: DocumentTranslationStatus.FAILED,
      created_at: "2026-07-06T00:00:00.000Z",
      updated_at: "2026-07-07T00:00:00.000Z",
      input: { source_lng: "en", target_lng: "de" },
    } as DocumentTranslation;

    const rows = buildTranslationStatusRows({ runs: [failedWithoutError] });

    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe("failed");
    expect(rows[0].error).toBeUndefined();
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

describe("a locale the run never attempted", () => {
  it("is its own row state, not translated", () => {
    const rows = buildTranslationStatusRows({
      runs: [run(DocumentTranslationStatus.ABANDONED, "es")],
    });

    expect(rows[0].state).toBe("abandoned");
  });

  it("is a state the run owns, so the row offers a retry", () => {
    const rows = buildTranslationStatusRows({
      runs: [run(DocumentTranslationStatus.ABANDONED, "es")],
    });

    expect(rows[0].state).toBe("abandoned");
    expect(isRunOwned("abandoned")).toBe(true);
  });

  it("has a dot of its own", () => {
    expect(STATE_DOT.abandoned).toBeDefined();
  });
});
