import type { RejectedReply } from "../../../core/translation-pipeline/types/index.js";
import type { RunTarget } from "../../modules/translation-run/index.js";

type Warns = { warn: (entry: Record<string, unknown>) => void };

type ReportedTarget = Pick<RunTarget, "collection" | "documentId" | "targetLocale">;

export function reportRejectedReplies(
  logger: Warns,
  target: ReportedTarget,
  rejected: readonly RejectedReply[]
): void {
  const { collection, documentId, targetLocale } = target;
  for (const { idPath, reason } of rejected) {
    logger.warn({
      collection,
      documentId,
      targetLocale,
      idPath,
      reason,
      msg: "translator: a rich-text reply could not be used, so this text keeps its source language",
    });
  }
}
