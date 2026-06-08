"use client";
import { useState } from "react";
import type { CategoryResult } from "../../../engine/types";
import { SummaryHeader } from "../parts/SummaryHeader";
import { FilterPills } from "../parts/FilterPills";
import type { Filter } from "../parts/FilterPills";
import { CheckRow } from "../parts/CheckRow";

export function KeyphraseTab({ data }: { data: CategoryResult }) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = data.checks.filter((c) => filter === "all" || c.status === filter);

  return (
    <section className="panel on">
      <SummaryHeader title="Keyphrase optimization" data={data} />

      <div className="section">
        <div className="sec-head">
          <span className="ttl">Checks</span>
          <span className="cnt">{data.checks.length}</span>
        </div>

        <FilterPills checks={data.checks} value={filter} onChange={setFilter} />

        {visible.map((c) => (
          <CheckRow key={c.id} check={c} />
        ))}
      </div>
    </section>
  );
}
