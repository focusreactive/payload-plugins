"use client";
import { useState } from "react";
import type { CategoryResult } from "../../../engine/types";
import { SummaryHeader } from "../parts/SummaryHeader";
import { FilterPills } from "../parts/FilterPills";
import type { Filter } from "../parts/FilterPills";
import { CheckRow } from "../parts/CheckRow";

export function OnPageTab({ data }: { data: CategoryResult }) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = data.checks.filter((c) => filter === "all" || c.status === filter);

  return (
    <section className="flex flex-col gap-[13px]">
      <SummaryHeader title="On-page structure" data={data} />

      <div className="bg-neutral-0 border border-neutral-200 rounded-rm overflow-hidden">
        <div className="flex items-center justify-between px-[15px] py-[12px] border-b border-neutral-200">
          <span className="font-semibold text-[13px]">Checks</span>
          <span className="font-mono text-[11px] text-neutral-500 bg-neutral-100 rounded-[20px] px-[9px] py-[2px]">{data.checks.length}</span>
        </div>

        <FilterPills checks={data.checks} value={filter} onChange={setFilter} />

        {visible.map((c) => (
          <CheckRow key={c.id} check={c} />
        ))}
      </div>
    </section>
  );
}
