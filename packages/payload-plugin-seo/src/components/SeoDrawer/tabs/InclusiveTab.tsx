"use client";

import type { AnalysisResult } from "../../../engine/types/analysis";
import { cn, ROW_SEPARATOR } from "../../../utils/style";
import { TabHeader } from "../../../ui/TabHeader";
import { SectionCard } from "../../../ui/SectionCard";
import { Pill } from "../../../ui/Pill";

export function InclusiveTab({ data }: { data: AnalysisResult["inclusive"] }) {
  const flagged = data.categories.reduce((n, c) => n + c.flags.length, 0);

  return (
    <section className="flex flex-col gap-[13px]">
      <TabHeader
        title="Inclusive language"
        score={data.ringScore}
        status={data.status}
        statusLabel={data.status === "good" ? "Good" : "Needs work"}
        subtitle={
          <>
            {flagged} phrases flagged across {data.categories.length} categories
          </>
        }
      />

      {data.categories.length > 0 && (
        <SectionCard title="Marked by category" widget={<Pill variant="neutral">{flagged}</Pill>}>
          {data.categories.map((cat) => (
            <div className={cn("relative px-[15px] py-[12px]", ROW_SEPARATOR)} key={cat.name}>
              <div className="flex items-center gap-[8px] mb-[9px]">
                <span className="font-bold text-[12.5px]">{cat.name}</span>
                <Pill variant="bad">{cat.flags.length}</Pill>
              </div>
              {cat.flags.map((f, i) => (
                <div className="flex items-center gap-[9px] py-[6px] text-[12px]" key={`${f.term}-${i}`}>
                  <span className="text-seo-bad font-medium whitespace-nowrap">{f.term}</span>
                  <span className="text-neutral-300">›</span>
                  <span className="text-seo-good font-medium flex-1">{f.suggestion}</span>
                  <span className="text-neutral-500 font-mono text-[10.5px] whitespace-nowrap">{f.location}</span>
                </div>
              ))}
            </div>
          ))}
        </SectionCard>
      )}

      {data.cleanCategories.length > 0 && (
        <SectionCard title="No issues found" widget={<Pill variant="neutral">{data.cleanCategories.length}</Pill>}>
          <div className="flex gap-[8px] flex-wrap px-[15px] py-[13px]">
            {data.cleanCategories.map((n) => (
              <span className="inline-flex items-center gap-[6px] text-[11.5px] text-seo-good bg-seo-good-100 border border-seo-good-200 rounded-[20px] px-[11px] py-[4px] font-medium" key={n}>
                ✓ {n}
              </span>
            ))}
          </div>
        </SectionCard>
      )}
    </section>
  );
}
