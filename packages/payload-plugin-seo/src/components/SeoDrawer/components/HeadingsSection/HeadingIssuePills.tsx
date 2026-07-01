"use client";

import { Pill } from "../../../../ui/Pill";

interface HeadingIssuePillsProps {
  errors: number;
  warnings: number;
  total: number;
}

function countLabel(count: number, noun: string): string {
  return count === 1 ? `1 ${noun}` : `${count} ${noun}s`;
}

export function HeadingIssuePills({ errors, warnings, total }: HeadingIssuePillsProps) {
  return (
    <div className="flex items-center gap-[6px]">
      {errors > 0 ? <Pill variant="bad">{countLabel(errors, "error")}</Pill> : null}
      {warnings > 0 ? <Pill variant="warn">{countLabel(warnings, "warning")}</Pill> : null}
      <Pill variant="neutral">{total}</Pill>
    </div>
  );
}
