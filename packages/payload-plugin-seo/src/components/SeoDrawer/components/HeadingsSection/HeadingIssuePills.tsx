"use client";

import { Pill } from "../../../../ui/Pill";
import { useSeoTranslation } from "../../../../translations/useSeoTranslation";

interface HeadingIssuePillsProps {
  errors: number;
  warnings: number;
  total: number;
}

export function HeadingIssuePills({ errors, warnings, total }: HeadingIssuePillsProps) {
  const { t } = useSeoTranslation();
  return (
    <div className="flex items-center gap-[6px]">
      {errors > 0 ? <Pill variant="bad">{t("headings.errors", { count: errors })}</Pill> : null}
      {warnings > 0 ? (
        <Pill variant="warn">{t("headings.warnings", { count: warnings })}</Pill>
      ) : null}
      <Pill variant="neutral">{total}</Pill>
    </div>
  );
}
