"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { hasKeyphrase } from "../../../engine/helpers/has-keyphrase";
import type { CategoryResult } from "../../../engine/types/analysis";
import { TabHeader } from "../../../ui/TabHeader";
import { SectionCard } from "../../../ui/SectionCard";
import { Pill } from "../../../ui/Pill";
import { FilterPills } from "../../../ui/FilterPills";
import type { Filter } from "../../../ui/FilterPills";
import { CheckRow } from "../../../ui/CheckRow";

export interface KeyphraseTabProps {
  data: CategoryResult;
  keyphrase: string;
  setKeyphrase: (keyphrase: string) => void;
  analyzing: boolean;
  keyphrasePending: boolean;
  analyzeNow: () => void;
}

export function KeyphraseTab({
  data,
  keyphrase,
  setKeyphrase,
  analyzing,
  keyphrasePending,
  analyzeNow,
}: KeyphraseTabProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = data.checks.filter((c) => filter === "all" || c.status === filter);
  const passing = data.checks.filter((c) => c.status === "good").length;
  const keyphrasePresent = hasKeyphrase(keyphrase);
  const checksReady = keyphrasePresent && !keyphrasePending && !analyzing && data.checks.length > 0;

  return (
    <section className="flex flex-col gap-[13px]">
      <div className="flex gap-[8px]">
        <label className="flex-1 flex items-center gap-[8px] px-[12px] py-[9px] border border-neutral-200 rounded-rs bg-neutral-0">
          <input
            type="text"
            className="border-0 outline-none flex-1 text-[13px] text-neutral-800 bg-transparent"
            value={keyphrase}
            onChange={(e) => setKeyphrase(e.target.value)}
            placeholder="Focus keyphrase"
            aria-label="Focus keyphrase"
          />
        </label>
        <span aria-live="polite" className="sr-only" role="status">
          {keyphrasePending ? "Analyzing keyphrase…" : ""}
        </span>
        <button
          type="button"
          className="px-[18px] py-[9px] bg-neutral-1000 text-neutral-0 border-0 rounded-rs font-medium text-[13px] cursor-pointer disabled:opacity-50"
          disabled={!keyphrasePresent}
          onClick={() => analyzeNow()}
        >
          {analyzing ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {!keyphrasePresent && (
        <p className="text-neutral-500 text-[13px]">
          Enter a focus keyphrase to analyze how well your content targets it.
        </p>
      )}

      {keyphrasePresent && !checksReady && (
        <div className="flex items-center gap-[8px] text-neutral-500 text-[13px]">
          <Loader2 aria-hidden="true" className="w-[14px] h-[14px] animate-spin" />
          Analyzing keyphrase…
        </div>
      )}

      {checksReady && (
        <>
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

          <SectionCard title="Checks" widget={<Pill variant="neutral">{data.checks.length}</Pill>}>
            <FilterPills checks={data.checks} value={filter} onChange={setFilter} />
            {visible.map((c) => (
              <CheckRow key={c.id} check={c} />
            ))}
          </SectionCard>
        </>
      )}
    </section>
  );
}
