"use client";

import { Pill } from "@payloadcms/ui";

import type { DefinitionSummary, InstanceSummary } from "../../server/queries.js";
import type { People } from "../shared/format.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";
import { LastChanged, SubjectLink, WaitingOn } from "./RunParts.js";

/** One column per stage of the workflow, each open document as a card in its stage. */
export const RunsBoard = ({
  definition,
  runs,
  people,
}: {
  definition: DefinitionSummary;
  runs: InstanceSummary[];
  people: People;
}) => {
  const { t } = useWorkflowsT();
  const columns = definition.stages.map((stage) => ({
    key: stage.name,
    title: stage.title,
    runs: runs.filter((run) => !run.stuck && run.stage.name === stage.name),
  }));
  const stuck = runs.filter((run) => run.stuck);
  if (stuck.length > 0) {
    columns.push({ key: "__stuck", title: t("boardStuck"), runs: stuck });
  }
  return (
    <div className="workflows-board">
      {columns.map((column) => (
        <section aria-label={column.title} className="workflows-board__column" key={column.key}>
          <header className="workflows-board__header">
            <h3 className="workflows-board__title">{column.title}</h3>
            <Pill
              aria-label={t("documents", { count: column.runs.length })}
              className="workflows-board__count"
              pillStyle="light-gray"
              size="small"
            >
              {column.runs.length}
            </Pill>
          </header>
          {column.runs.length === 0 ? (
            <p className="workflows-board__empty">{t("boardEmptyColumn")}</p>
          ) : (
            <ul className="workflows-board__cards">
              {column.runs.map((run) => (
                <li className="workflows-board__card" key={run.id}>
                  <SubjectLink run={run} />
                  <span className="workflows-board__meta">
                    <WaitingOn people={people} prefixed run={run} />
                    <span aria-hidden="true"> · </span>
                    <LastChanged run={run} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
};
