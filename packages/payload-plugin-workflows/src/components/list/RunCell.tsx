import { Pill } from "@payloadcms/ui";
import type { DefaultServerCellComponentProps } from "payload";

import { settingsOf } from "../../server/operations.js";
import { NAMESPACE } from "../../translations.js";
import { labelText } from "../../vocabulary.js";
import { PILL_STYLE } from "../shared/indicator.js";
import type { RunTone } from "../shared/indicator.js";

const TONE: Record<string, RunTone> = { active: "neutral", completed: "success", aborted: "muted" };
const STATUS_KEY: Record<string, string> = {
  active: "statusRunning",
  completed: "statusCompleted",
  aborted: "statusAborted",
};

/**
 * The workflows list's `workflow`, `stage` and `status` cells: the definition's titles for the
 * names stored in the run, and the status on the shared status pill.
 */
export const RunCell = ({
  cellData,
  field,
  i18n,
  payload,
  rowData,
}: DefaultServerCellComponentProps) => {
  const value = typeof cellData === "string" ? cellData : "";
  const def = settingsOf(payload).workflows.find((entry) => entry.name === rowData.workflow);
  const name = "name" in field ? field.name : "";
  if (name === "status") {
    return (
      <Pill pillStyle={PILL_STYLE[TONE[value] ?? "neutral"]} size="small">
        {i18n.t(`${NAMESPACE}:${STATUS_KEY[value] ?? "statusRunning"}` as never)}
      </Pill>
    );
  }
  if (name === "stage") {
    const stage = def?.stages.find((entry) => entry.name === value);
    // A stage removed from the definition: the run is stuck.
    return stage ? (
      <span>{labelText(stage.title, i18n.language) ?? stage.name}</span>
    ) : (
      <Pill pillStyle={PILL_STYLE.error} size="small">
        {value}
      </Pill>
    );
  }
  return <span>{labelText(def?.title, i18n.language) ?? value}</span>;
};
