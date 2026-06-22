"use client";

import { CHECK_ICONS } from "../../components/icons";
import { CheckVisualization } from "./CheckVisualization";
import { LABELS } from "./constants/labels";
import { Pill } from "../Pill";
import { STATUS_PILL_LABEL } from "../../constants";
import { Tooltip } from "../Tooltip";
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
    <div
      className={cn("relative px-[15px] py-[13px] overflow-visible", ROW_SEPARATOR)}
      data-status={check.status}
    >
      <div className="flex items-center gap-[9px] mb-[7px]">
        <span className="w-[26px] h-[26px] rounded-rs bg-neutral-100 text-neutral-600 grid place-items-center flex-none [&_svg]:size-[15px]">
          <Icon size={15} />
        </span>

        <span className="flex-1 font-semibold text-[12.5px]">
          <Tooltip
            content={meta.tip}
            className="border-0 border-b border-dotted border-neutral-400"
          >
            {meta.name}
          </Tooltip>
        </span>

        <Pill variant={check.status}>{STATUS_PILL_LABEL[check.status]}</Pill>
      </div>

      <CheckVisualization check={check} />

      {check.recommendation && (
        <div className="text-neutral-600 text-[11.5px]">{check.recommendation}</div>
      )}
    </div>
  );
}
