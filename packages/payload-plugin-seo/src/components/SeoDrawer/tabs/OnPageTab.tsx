"use client";

import { useState } from "react";
import type { CategoryResult } from "../../../engine/types/analysis";
import { TabHeader } from "../../../ui/TabHeader";
import { SectionCard } from "../../../ui/SectionCard";
import { Pill } from "../../../ui/Pill";
import { FilterPills } from "../../../ui/FilterPills";
import type { Filter } from "../../../ui/FilterPills";
import { CheckRow } from "../../../ui/CheckRow";
import { TabWrapper } from "../components/TabWrapper";
import { useSeoTranslation } from "../../../translations/useSeoTranslation";

export function OnPageTab({ data }: { data: CategoryResult }) {
  const { t } = useSeoTranslation();
  const [filter, setFilter] = useState<Filter>("all");
  const visible = data.checks.filter((c) => filter === "all" || c.status === filter);
  const passing = data.checks.filter((c) => c.status === "good").length;

  return (
    <TabWrapper>
      <section className="flex flex-col gap-[13px]">
        <TabHeader
          title={t("onpage.title")}
          score={data.ringScore}
          status={data.status}
          subtitle={t("checks.passing", { passing, total: data.checks.length })}
        />

        <SectionCard
          title={t("checks.title")}
          widget={<Pill variant="neutral">{data.checks.length}</Pill>}
        >
          <FilterPills checks={data.checks} value={filter} onChange={setFilter} />
          {visible.map((c) => (
            <CheckRow key={c.id} check={c} />
          ))}
        </SectionCard>
      </section>
    </TabWrapper>
  );
}
