"use client";

import { Pill } from "@payloadcms/ui";

import type { InstanceSummary } from "../../server/queries.js";
import { StatusPill } from "../shared/StatusPill.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";
import { LastChanged, SubjectLink, WaitingOn } from "./RunParts.js";

/** Runs as rows: document, workflow, stage, who it waits on, last change. */
export const RunsTable = ({ runs }: { runs: InstanceSummary[] }) => {
  const { t } = useWorkflowsT();
  return (
    <div className="workflows-runs">
      <table className="workflows-runs__table">
        <thead>
          <tr>
            <th scope="col">{t("columnDocument")}</th>
            <th scope="col">{t("columnWorkflow")}</th>
            <th scope="col">{t("columnStage")}</th>
            <th scope="col">{t("columnWaitingOn")}</th>
            <th scope="col">{t("columnUpdated")}</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <td data-label={t("columnDocument")}>
                <SubjectLink run={run} />
              </td>
              <td data-label={t("columnWorkflow")}>{run.workflowTitle}</td>
              <td data-label={t("columnStage")}>
                {run.stuck ? (
                  <StatusPill status="stuck" />
                ) : (
                  <Pill className="workflows-pill" pillStyle="light" size="small">
                    {run.stage.title}
                  </Pill>
                )}
              </td>
              <td data-label={t("columnWaitingOn")}>
                <WaitingOn run={run} />
              </td>
              <td data-label={t("columnUpdated")}>
                <LastChanged run={run} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
