"use client";

import { CheckIcon } from "@payloadcms/ui";

import type { InstanceView } from "../../types.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";

type Step = InstanceView["stages"][number];

/**
 * The stages in declaration order, as a row of numbered steps joined by a line, marked by what
 * happened in this run: visited (a check), current, not reached. A workflow that branches or loops
 * leaves the stages it never entered unmarked, wherever they are. A completed workflow shows its
 * final stage done too; before anything starts the caller passes them all as not reached.
 */
export const StageStepper = ({
  stages,
  completed = false,
  stopped = false,
}: {
  stages: Step[];
  completed?: boolean;
  /** The workflow was stopped: where it stopped stays marked, but not as the current step. */
  stopped?: boolean;
}) => {
  const { t } = useWorkflowsT();
  const steps = completed
    ? stages.map((stage) =>
        stage.state === "current" ? { ...stage, state: "visited" as const } : stage
      )
    : stages;
  const index = steps.findIndex((stage) => stage.state === "current");
  const current = steps[index];
  const stateLabel = {
    visited: t("stageVisited"),
    current: t("stageCurrent"),
    unvisited: t("stageUnvisited"),
  };
  return (
    <ol
      aria-label={
        current
          ? t("stageProgress", { current: index + 1, total: steps.length, stage: current.title })
          : t("stagesLabel")
      }
      className="workflows-stepper"
      data-stopped={stopped || undefined}
    >
      {steps.map((stage, position) => (
        <li
          aria-current={stage.state === "current" ? "step" : undefined}
          className="workflows-stepper__step"
          data-state={stage.state}
          key={stage.name}
        >
          <span aria-hidden="true" className="workflows-stepper__marker">
            {stage.state === "visited" ? <CheckIcon /> : position + 1}
          </span>
          <span className="workflows-stepper__label">{stage.title}</span>
          <span className="workflows-sr-only"> ({stateLabel[stage.state]})</span>
        </li>
      ))}
    </ol>
  );
};
