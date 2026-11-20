"use client";

import { Pill } from "@payloadcms/ui";
import type { ComponentProps } from "react";

import type { ActivityStatus, InstanceStatus } from "../../types.js";
import { useWorkflowsT } from "./useWorkflowsT.js";

type Status = ActivityStatus | InstanceStatus | "stuck";

const STYLE: Record<Status, NonNullable<ComponentProps<typeof Pill>["pillStyle"]>> = {
  active: "warning",
  done: "success",
  skipped: "light-gray",
  failed: "error",
  completed: "success",
  aborted: "light-gray",
  stuck: "error",
};

/** One status language: a word on Payload's success / warning / error pill. */
export const StatusPill = ({ status }: { status: Status }) => {
  const { t } = useWorkflowsT();
  const label: Record<Status, string> = {
    active: t("statusActive"),
    done: t("statusDone"),
    skipped: t("statusSkipped"),
    failed: t("statusFailed"),
    completed: t("statusCompleted"),
    aborted: t("statusAborted"),
    stuck: t("statusStuck"),
  };
  return (
    <Pill className="workflows-pill" pillStyle={STYLE[status]} size="small">
      {label[status]}
    </Pill>
  );
};
