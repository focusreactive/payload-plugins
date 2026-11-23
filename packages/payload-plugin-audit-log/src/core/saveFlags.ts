import type { LocaleOfRequest } from "../utils/fallbackLocale";
import { isAutosaveDraftTick } from "../utils/versions";
import { stampOperationStart } from "./operationClock";

export type OpFlags = {
  source?: "operation" | "bulk";
  draft?: boolean;
  restore?: boolean;
  autosave?: boolean;
  secretFields?: string[];
  selected?: boolean;
  savedIn?: LocaleOfRequest;
  startedAt?: string;
};

export type SaveArgs = { data?: unknown; draft?: boolean; autosave?: boolean; select?: unknown };

export const flagsOfSave = (
  operation: string,
  { data, draft, autosave, select }: SaveArgs,
  autosaveEnabled: boolean,
  savedIn: LocaleOfRequest
): OpFlags => ({
  source: "operation",
  draft: Boolean(draft),
  restore: operation === "restoreVersion",
  autosave:
    operation !== "create" && isAutosaveDraftTick(autosaveEnabled, { autosave, draft, data }),
  ...(select === undefined ? {} : { selected: true }),
  savedIn,
  startedAt: stampOperationStart(),
});
