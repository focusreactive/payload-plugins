"use client";

import type { ReactNode } from "react";
import type { Status } from "../engine/types";
import { SectionWrapper } from "./SectionWrapper";
import { ScoreRing } from "./ScoreRing";
import { StatusPill } from "./StatusPill";

const DEFAULT_STATUS_LABEL: Record<Status, string> = {
  good: "Good",
  warn: "Needs work",
  bad: "Problem",
};

interface TabHeaderProps {
  title: string;
  score: number;
  status: Status;
  statusLabel?: ReactNode;
  subtitle: ReactNode;
}

export function TabHeader({ title, score, status, statusLabel, subtitle }: TabHeaderProps) {
  return (
    <SectionWrapper className="p-[14px] flex items-center gap-[15px]">
      <ScoreRing score={score} status={status} />

      <div className="flex-1">
        <div className="flex items-center gap-[8px]">
          <b className="text-[14px]">{title}</b>
          <StatusPill status={status}>{statusLabel ?? DEFAULT_STATUS_LABEL[status]}</StatusPill>
        </div>

        <div className="text-neutral-500 text-[11.5px] mt-[4px]">{subtitle}</div>
      </div>
    </SectionWrapper>
  );
}
