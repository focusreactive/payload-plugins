"use client";

import { useState } from "react";
import type { CategoryResult } from "../../../engine/types/analysis";
import { TabHeader } from "../../../ui/TabHeader";
import { SectionCard } from "../../../ui/SectionCard";
import { CountPill } from "../../../ui/CountPill";
import { FilterPills } from "../../../ui/FilterPills";
import type { Filter } from "../../../ui/FilterPills";
import { CheckRow } from "../../../ui/CheckRow";

export function KeyphraseTab({ data }: { data: CategoryResult }) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = data.checks.filter((c) => filter === "all" || c.status === filter);
  const passing = data.checks.filter((c) => c.status === "good").length;

  return (
    <section className="flex flex-col gap-[13px]">
      <TabHeader
        title="Keyphrase optimization"
        score={data.ringScore}
        status={data.status}
        subtitle={
          <>
            {passing} / {data.checks.length} checks passing
          </>
        }
      />

      <SectionCard title="Checks" widget={<CountPill count={data.checks.length} />}>
        <FilterPills checks={data.checks} value={filter} onChange={setFilter} />
        {visible.map((c) => (
          <CheckRow key={c.id} check={c} />
        ))}
      </SectionCard>
    </section>
  );
}
