"use client";

import type { ReactNode } from "react";
import type { Status } from "../engine/types/analysis";
import { SectionWrapper } from "./SectionWrapper";
import { ScoreRing } from "./ScoreRing";
import { Pill } from "./Pill";
import { STATUS_LABEL_KEY } from "../constants";
import { useSeoTranslation } from "../translations/useSeoTranslation";

interface TabHeaderProps {
  title: string;
  score: number;
  status: Status;
  statusLabel?: ReactNode;
  subtitle: ReactNode;
}

export function TabHeader({ title, score, status, statusLabel, subtitle }: TabHeaderProps) {
  const { t } = useSeoTranslation();
  return (
    <SectionWrapper className="p-[14px] flex items-center gap-[15px]">
      <ScoreRing score={score} status={status} />

      <div className="flex-1">
        <div className="flex items-center gap-[8px]">
          <b className="text-[14px]">{title}</b>
          <Pill variant={status}>{statusLabel ?? t(STATUS_LABEL_KEY[status])}</Pill>
        </div>

        <div className="text-neutral-500 text-[11.5px] mt-[4px]">{subtitle}</div>
      </div>
    </SectionWrapper>
  );
}
