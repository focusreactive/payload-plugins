import type { Status } from "../engine/types/analysis";
import type { TranslationKey } from "../translations/types";

export const STATUS_LABEL_KEY: Record<Status, TranslationKey> = {
  good: "status.good",
  warn: "status.warn",
  bad: "status.bad",
};
