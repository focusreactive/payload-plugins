"use client";

import { CHECK_ICONS } from "../../components/icons";
import { CheckVisualization } from "./CheckVisualization";
import { LABELS } from "./constants/labels";
import { StatusPill, STATUS_PILL_LABEL } from "../StatusPill";
import type { CheckResult } from "../../engine/types/analysis";
import { cn, ROW_SEPARATOR } from "../../utils/style";

interface CheckRowProps {
  check: CheckResult;
}

export function CheckRow({ check }: CheckRowProps) {
  const meta = LABELS[check.id as keyof typeof LABELS] ?? {
    name: check.id,
    tip: "",
  };
  const Icon = CHECK_ICONS[check.id] ?? CHECK_ICONS._default;

  return (
    <div className={cn("relative px-[15px] py-[13px] overflow-visible", ROW_SEPARATOR)} data-status={check.status}>
      <div className="flex items-center gap-[9px]">
        <span className="w-[26px] h-[26px] rounded-rs bg-neutral-100 text-neutral-600 grid place-items-center flex-none [&_svg]:size-[15px]">
          <Icon size={15} />
        </span>

        <span className="flex-1 font-semibold text-[12.5px]">
          <span className="border-0 border-b border-dotted border-neutral-400 cursor-help" title={meta.tip}>
            {meta.name}
          </span>
        </span>

        <StatusPill status={check.status}>{STATUS_PILL_LABEL[check.status]}</StatusPill>
      </div>

      <CheckVisualization check={check} />

      {check.recommendation && <div className="text-neutral-600 text-[11.5px] mt-[7px]">{check.recommendation}</div>}
    </div>
  );
}
