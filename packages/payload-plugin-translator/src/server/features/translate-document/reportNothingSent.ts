import type { EmptyBecause } from "./selectLeaves.js";
import type { Run } from "./run.js";

type SentNothingBecause = EmptyBecause | "collector-sent-nothing";

const REPORTED: Record<SentNothingBecause, { level: "info" | "warn"; msg: string }> = {
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

export function reportNothingSent(run: Run, reason: EmptyBecause | null): void {
  const { collection, documentId, targetLocale } = run.target;
  const { level, msg } = REPORTED[reason ?? "collector-sent-nothing"];
  run.payload.logger[level]({ collection, documentId, targetLocale, msg });
}
