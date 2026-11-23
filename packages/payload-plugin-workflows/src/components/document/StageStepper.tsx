"use client";

import type { InstanceView } from "../../types.js";
import { useWorkflowsT } from "../shared/useWorkflowsT.js";

/** The stages in declaration order: done, current, next. */
export const StageStepper = ({ stages }: { stages: InstanceView["stages"] }) => {
  const { t } = useWorkflowsT();
  const index = stages.findIndex((stage) => stage.state === "current");
  const current = stages[index];
  const stateLabel = {
    past: t("stagePast"),
    current: t("stageCurrent"),
    upcoming: t("stageUpcoming"),
  };
  return (
    <ol
      aria-label={
        current
          ? t("stageProgress", { current: index + 1, total: stages.length, stage: current.title })
          : undefined
      }
      className="workflows-stepper"
    >
      {stages.map((stage) => (
        <li
          aria-current={stage.state === "current" ? "step" : undefined}
          className="workflows-stepper__step"
          data-state={stage.state}
          key={stage.name}
          title={stage.title}
        >
          <span aria-hidden="true" className="workflows-stepper__bar" />
          <span className="workflows-stepper__label">{stage.title}</span>
          <span className="workflows-sr-only"> ({stateLabel[stage.state]})</span>
        </li>
      ))}
    </ol>
  );
};
