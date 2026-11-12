"use client";

import { CHECK_ICONS } from "../../components/icons";
import { CheckVisualization } from "./CheckVisualization";
import { ALL_CHECK_IDS } from "../../constants/checkIds";
import type { CheckId } from "../../constants/checkIds";
import { Pill } from "../Pill";
import { STATUS_LABEL_KEY } from "../../constants";
import { Tooltip } from "../Tooltip";
import type { CheckResult } from "../../engine/types/analysis";
import { cn, ROW_SEPARATOR } from "../../utils/style";
import { useSeoTranslation } from "../../translations/useSeoTranslation";

interface CheckRowProps {
  check: CheckResult;
}

export function CheckRow({ check }: CheckRowProps) {
  const { t } = useSeoTranslation();
  const id = ALL_CHECK_IDS.has(check.id as CheckId) ? (check.id as CheckId) : undefined;
  const meta = id
    ? { name: t(`check.${id}.name`), tip: t(`check.${id}.tip`) }
    : { name: check.id, tip: "" };
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

        <Pill variant={check.status}>{t(STATUS_LABEL_KEY[check.status])}</Pill>
      </div>

      <CheckVisualization check={check} />

      {check.recommendation && (
        <div className="text-neutral-600 text-[11.5px]">
          {t(check.recommendation.key, check.recommendation.vars)}
        </div>
      )}
    </div>
  );
}
