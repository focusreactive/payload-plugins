import type { Payload } from "payload";

import type { AfterSave, BeforeTranslation, RunLogger } from "../../TranslationRun.interface.js";

const NOT_READ_BY_THE_CHAIN = {} as Payload;

const TARGET = {
  collection: "pages",
  documentId: "doc-1",
  sourceLocale: "en",
  targetLocale: "de",
} as const;

export const beforeTranslation = (over: Partial<BeforeTranslation> = {}): BeforeTranslation => ({
  payload: NOT_READ_BY_THE_CHAIN,
  target: TARGET,
  scope: {},
  sourceData: { title: "Source" },
  previousAttempts: 0,
  moduleState: {},
  ...over,
});

export const afterSave = (over: Partial<AfterSave> = {}): AfterSave => ({
  payload: NOT_READ_BY_THE_CHAIN,
  target: TARGET,
  scope: {},
  moduleState: {},
  leaves: [],
  ...over,
});

export const collectingLogger = (): RunLogger & { entries: Record<string, unknown>[] } => {
  const entries: Record<string, unknown>[] = [];
  return { entries, error: (details) => entries.push(details) };
};
