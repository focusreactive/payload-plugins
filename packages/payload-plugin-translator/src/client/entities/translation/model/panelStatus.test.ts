import { describe, it, expect } from "vitest";

import { DocumentTranslationStatus } from "./enums";
import {
  deriveCollectionPanelStatus,
  deriveDocumentRunStatus,
  derivePanelStatus,
  describePanelStatus,
  MARKER_DOT,
} from "./panelStatus";
import { STATE_DOT } from "./statusRows";
import type { DocumentTranslation, GroupedCollectionTranslationStatus } from "./types";

describe("derivePanelStatus", () => {
  it("failed outranks everything, including stale locales", () => {
    expect(
      derivePanelStatus({ runStatus: DocumentTranslationStatus.FAILED, staleLocales: ["de"] })
    ).toEqual({ kind: "failed" });
  });

  it("running/pending outranks stale", () => {
    expect(
      derivePanelStatus({ runStatus: DocumentTranslationStatus.RUNNING, staleLocales: ["de"] })
    ).toEqual({ kind: "running" });
    expect(
      derivePanelStatus({ runStatus: DocumentTranslationStatus.PENDING, staleLocales: [] })
    ).toEqual({ kind: "running" });
  });

  it("stale when the source drifted and no job is failed/in-flight", () => {
    expect(
      derivePanelStatus({
        runStatus: DocumentTranslationStatus.COMPLETED,
        staleLocales: ["de", "fr"],
      })
    ).toEqual({ kind: "stale", staleLocales: ["de", "fr"] });
    // no run data at all, but staleness present
    expect(derivePanelStatus({ runStatus: null, staleLocales: ["de"] })).toEqual({
      kind: "stale",
      staleLocales: ["de"],
    });
  });

  it("fresh when a translation completed and nothing is stale", () => {
    expect(
      derivePanelStatus({ runStatus: DocumentTranslationStatus.COMPLETED, staleLocales: [] })
    ).toEqual({ kind: "fresh" });
  });

  it("none when nothing has been translated and nothing is stale", () => {
    expect(derivePanelStatus({ runStatus: null, staleLocales: [] })).toEqual({ kind: "none" });
    expect(derivePanelStatus({ staleLocales: [] })).toEqual({ kind: "none" });
  });
});

describe("deriveDocumentRunStatus", () => {
  const jobWith = (status: DocumentTranslationStatus, target: string): DocumentTranslation =>
    ({
      id: `job-${target}`,
      status,
      created_at: "2026-07-14T00:00:00.000Z",
      updated_at: "2026-07-14T00:00:00.000Z",
      input: { source_lng: "en", target_lng: target },
      ...(status === DocumentTranslationStatus.FAILED ? { error: { message: "x" } } : {}),
      ...(status === DocumentTranslationStatus.COMPLETED
        ? { completed_at: "2026-07-14T00:00:00.000Z" }
        : {}),
    }) as DocumentTranslation;

  it("returns undefined when there are no jobs", () => {
    expect(deriveDocumentRunStatus(undefined)).toBeUndefined();
    expect(deriveDocumentRunStatus([])).toBeUndefined();
  });

  it("picks the most urgent status across locales: failed > running > pending > completed", () => {
    expect(
      deriveDocumentRunStatus([
        jobWith(DocumentTranslationStatus.COMPLETED, "de"),
        jobWith(DocumentTranslationStatus.RUNNING, "fr"),
        jobWith(DocumentTranslationStatus.FAILED, "it"),
      ])
    ).toBe(DocumentTranslationStatus.FAILED);

    expect(
      deriveDocumentRunStatus([
        jobWith(DocumentTranslationStatus.COMPLETED, "de"),
        jobWith(DocumentTranslationStatus.PENDING, "fr"),
        jobWith(DocumentTranslationStatus.RUNNING, "it"),
      ])
    ).toBe(DocumentTranslationStatus.RUNNING);

    expect(deriveDocumentRunStatus([jobWith(DocumentTranslationStatus.COMPLETED, "de")])).toBe(
      DocumentTranslationStatus.COMPLETED
    );
  });
});

describe("deriveCollectionPanelStatus", () => {
  const group = (
    over: Partial<GroupedCollectionTranslationStatus> = {}
  ): GroupedCollectionTranslationStatus =>
    ({
      [DocumentTranslationStatus.COMPLETED]: [],
      [DocumentTranslationStatus.FAILED]: [],
      [DocumentTranslationStatus.RUNNING]: [],
      [DocumentTranslationStatus.PENDING]: [],
      ...over,
    }) as GroupedCollectionTranslationStatus;

  it("in-progress (running or pending) outranks failures", () => {
    expect(
      deriveCollectionPanelStatus(
        group({
          [DocumentTranslationStatus.RUNNING]: [
            { id: "a", status: DocumentTranslationStatus.RUNNING },
          ],
          [DocumentTranslationStatus.FAILED]: [
            { id: "b", status: DocumentTranslationStatus.FAILED },
          ],
        })
      )
    ).toEqual({ kind: "running" });
    expect(
      deriveCollectionPanelStatus(
        group({
          [DocumentTranslationStatus.PENDING]: [
            { id: "a", status: DocumentTranslationStatus.PENDING },
          ],
          [DocumentTranslationStatus.FAILED]: [
            { id: "b", status: DocumentTranslationStatus.FAILED },
          ],
        })
      )
    ).toEqual({ kind: "running" });
  });

  it("failed when something failed and nothing is in progress", () => {
    expect(
      deriveCollectionPanelStatus(
        group({
          [DocumentTranslationStatus.FAILED]: [
            { id: "b", status: DocumentTranslationStatus.FAILED },
          ],
          [DocumentTranslationStatus.COMPLETED]: [
            { id: "c", status: DocumentTranslationStatus.COMPLETED },
          ],
        })
      )
    ).toEqual({ kind: "failed" });
  });

  it("fresh when only completed", () => {
    expect(
      deriveCollectionPanelStatus(
        group({
          [DocumentTranslationStatus.COMPLETED]: [
            { id: "c", status: DocumentTranslationStatus.COMPLETED },
          ],
        })
      )
    ).toEqual({ kind: "fresh" });
  });

  it("none when empty or undefined", () => {
    expect(deriveCollectionPanelStatus(group())).toEqual({ kind: "none" });
    expect(deriveCollectionPanelStatus(undefined)).toEqual({ kind: "none" });
  });
});

describe("describePanelStatus", () => {
  it("maps each kind to a tone + title, and uses the fallback title for none/undefined", () => {
    expect(describePanelStatus({ kind: "failed" }, "fb").tone).toBe("failed");
    expect(describePanelStatus({ kind: "running" }, "fb").tone).toBe("running");
    expect(describePanelStatus({ kind: "fresh" }, "fb").tone).toBe("fresh");
    expect(describePanelStatus({ kind: "stale", staleLocales: ["DE", "fr"] }, "fb")).toEqual({
      tone: "stale",
      title: "Out of date: de, fr",
    });
    expect(describePanelStatus({ kind: "none" }, "fb")).toEqual({ title: "fb" });
    expect(describePanelStatus(undefined, "fb")).toEqual({ title: "fb" });
  });
});

describe("MARKER_DOT", () => {
  it("colours each tone and pulses only in-progress", () => {
    expect(MARKER_DOT.failed).toEqual({ color: "red" });
    expect(MARKER_DOT.running).toEqual({ color: "blue", animated: true });
    expect(MARKER_DOT.stale).toEqual({ color: "amber" });
    expect(MARKER_DOT.fresh).toEqual({ color: "green" });
  });

  it("shares the status list's colour vocabulary (trigger badge == list dots)", () => {
    // failed/running/stale must match STATE_DOT; fresh is the marker's name for a completed row.
    expect(MARKER_DOT.failed).toEqual(STATE_DOT.failed);
    expect(MARKER_DOT.running).toEqual(STATE_DOT.running);
    expect(MARKER_DOT.stale).toEqual(STATE_DOT.stale);
    expect(MARKER_DOT.fresh).toEqual(STATE_DOT.translated);
  });
});
