"use client";

import type { VitalsResult } from "../../../engine/types/analysis";
import { cn, ROW_SEPARATOR } from "../../../utils/style";
import { KpiCard } from "../../../ui/KpiCard";
import { SectionCard } from "../../../ui/SectionCard";
import { CountPill } from "../../../ui/CountPill";

export function VitalsTab({ data }: { data: VitalsResult }) {
  const max = Math.max(1, ...data.prominentWords.map((w) => w.count));

  return (
    <section className="flex flex-col gap-[13px]">
      <div className="grid grid-cols-3 gap-[9px]">
        <KpiCard label="Words" value={data.words.toLocaleString()} />
        <KpiCard label="Sentences" value={data.sentences} />
        <KpiCard label="Paragraphs" value={data.paragraphs} />
        <KpiCard label="Images" value={data.images} />
        <KpiCard label="Videos" value={data.videos} />
        <KpiCard label="Reading time" value={data.readingTimeMinutes} suffix="min" />
      </div>

      <SectionCard title="Prominent words" widget={<CountPill count={data.prominentWords.length} />}>
        {data.prominentWords.map((w) => (
          <div className={cn("relative flex items-center gap-[12px] px-[15px] py-[9px]", ROW_SEPARATOR)} key={w.word}>
            <div className="w-[120px] flex-none text-[12px] font-medium flex items-center gap-[6px]">
              {w.word} {w.isKeyphrase && <span className="text-[9px] font-bold uppercase tracking-[0.04em] text-neutral-1000 bg-neutral-150 rounded-[3px] px-[5px] py-[1px]">Key</span>}
            </div>
            <div className="flex-1 h-[6px] rounded-[3px] bg-neutral-100 overflow-hidden">
              <i className={cn("block h-full", w.isKeyphrase ? "bg-neutral-1000" : "bg-neutral-400")} style={{ width: `${(w.count / max) * 100}%` }} />
            </div>
            <div className="w-[30px] text-right font-mono text-[11px] font-semibold text-neutral-700">{w.count}</div>
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Suggested anchor phrases" widget={<CountPill count={data.internalLinkingPhrases.length} />}>
        {data.internalLinkingPhrases.map((p) => (
          <div className={cn("relative flex items-center gap-[10px] px-[15px] py-[11px]", ROW_SEPARATOR)} key={p}>
            <span className="text-[12px] font-semibold">{p}</span>
          </div>
        ))}
      </SectionCard>
    </section>
  );
}
