"use client";

import { Pill, Table } from "@payloadcms/ui";
import type { ClientField, Column } from "payload";
import type { ReactNode } from "react";

import type { InstanceSummary } from "../../server/queries.js";
import type { People } from "../shared/format.js";
import { PILL_STYLE, summaryToneOf } from "../shared/indicator.js";
import { StatusPill } from "../shared/StatusPill.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";
import { LastChanged, SubjectLink, WaitingOn } from "./RunParts.js";

/** Open workflows as rows of Payload's own list table: document, workflow, stage, who, when. */
export const RunsTable = ({ runs, people }: { runs: InstanceSummary[]; people: People }) => {
  const { t } = useWorkflowsT();
  const column = (
    accessor: string,
    heading: string,
    cell: (run: InstanceSummary) => ReactNode
  ): Column => ({
    accessor,
    active: true,
    field: { name: accessor, type: "text" } as ClientField,
    Heading: <span>{heading}</span>,
    renderedCells: runs.map(cell),
  });
  const columns = [
    column("document", t("columnDocument"), (run) => <SubjectLink run={run} />),
    column("workflow", t("columnWorkflow"), (run) => <span>{run.workflowTitle}</span>),
    column("stage", t("columnStage"), (run) =>
      run.stuck ? (
        <StatusPill status="stuck" />
      ) : (
        <Pill className="workflows-pill" pillStyle={PILL_STYLE[summaryToneOf(run)]} size="small">
          {run.stage.title}
        </Pill>
      )
    ),
    column("waitingOn", t("columnWaitingOn"), (run) => <WaitingOn people={people} run={run} />),
    column("updatedAt", t("columnUpdated"), (run) => <LastChanged run={run} />),
  ];
  return (
    <div className="workflows-runs">
      <Table columns={columns} data={runs.map((run) => ({ id: run.id }))} />
    </div>
  );
};
