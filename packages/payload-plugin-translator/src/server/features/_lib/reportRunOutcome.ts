import type { LeafOutcome } from "../../../core/translation-pipeline/types/index.js";
import type { RunTarget } from "../../modules/translation-run/index.js";

export type SelectionEmptyBecause =
  | "no-translatable-text"
  | "named-leaves-are-not-here"
  | "rules-kept-nothing";

export type NothingSentBecause = SelectionEmptyBecause | "collector-sent-nothing";

type Logs = {
  info: (entry: Record<string, unknown>) => void;
  warn: (entry: Record<string, unknown>) => void;
};

type ReportedTarget = Pick<RunTarget, "collection" | "documentId" | "targetLocale">;

export type RunOutcome =
  | { sent: false; because: NothingSentBecause }
  | { sent: true; leaves: readonly LeafOutcome[] };

const NOTHING_SENT: Record<NothingSentBecause, { level: "info" | "warn"; msg: string }> = {
  "no-translatable-text": {
    level: "info",
    msg: "translator: this document holds no translatable text",
  },
  "named-leaves-are-not-here": {
    level: "warn",
    msg: "translator: no leaf the request named is translatable text in this document",
  },
  "rules-kept-nothing": {
    level: "info",
    msg: "translator: the run found nothing to bring up to date",
  },
  "collector-sent-nothing": {
    level: "warn",
    msg: "translator: nothing the request selected was sent — not translatable here, or its source is empty",
  },
};

const VALUE_KEPT_ITS_SOURCE =
  "translator: a value could not be translated, so it keeps its source language";

export function reportRunOutcome(logs: Logs, target: ReportedTarget, outcome: RunOutcome): void {
  const { collection, documentId, targetLocale } = target;

  if (!outcome.sent) {
    const { level, msg } = NOTHING_SENT[outcome.because];
    logs[level]({ collection, documentId, targetLocale, msg });
    return;
  }

  for (const leaf of outcome.leaves) {
    if (leaf.answered) continue;
    for (const { code, message } of leaf.failures) {
      logs.warn({
        collection,
        documentId,
        targetLocale,
        idPath: leaf.idPath,
        code,
        ...(message ? { detail: message } : {}),
        msg: VALUE_KEPT_ITS_SOURCE,
      });
    }
  }
}
