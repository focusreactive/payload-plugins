import type { IdPath } from "../../../domain/content-projection/idPath.js";
import type { LeafFailureCode, LeafOutcome, PipelineResult } from "../../types/index.js";

export const answered = (address: string): LeafOutcome => ({
  idPath: address as IdPath,
  answered: true,
});

export const unanswered = (address: string, ...codes: LeafFailureCode[]): LeafOutcome => ({
  idPath: address as IdPath,
  answered: false,
  failures: (codes.length > 0 ? codes : (["not-answered"] as const)).map((code) => ({ code })),
});

export const pipelineResult = (
  translatedData: Record<string, unknown>,
  leaves: readonly LeafOutcome[] = Object.keys(translatedData).map(answered)
): PipelineResult => ({ sent: true, translatedData, leaves });

export const nothingSent: PipelineResult = { sent: false };
