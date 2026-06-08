"use client";

import type { VitalsResult } from "../../../engine/types";
import { cn } from "../../../utils/style";
import { KpiCard } from "../parts/KpiCard";

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

      <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-neutral-500 mt-[6px] mb-[-3px]">Prominent words</div>
      <div className="bg-neutral-0 border border-neutral-200 rounded-rm overflow-hidden">
        <div className="flex items-center justify-between px-[15px] py-[12px] border-b border-neutral-200">
          <span className="font-semibold text-[13px]">Prominent words</span>
          <span className="font-mono text-[11px] text-neutral-500 bg-neutral-100 rounded-[20px] px-[9px] py-[2px]">{data.prominentWords.length}</span>
        </div>

        {data.prominentWords.map((w) => (
          <div
            className="relative flex items-center gap-[12px] px-[15px] py-[9px] not-last:after:content-[''] not-last:after:absolute not-last:after:inset-x-[15px] not-last:after:bottom-0 not-last:after:h-px not-last:after:bg-neutral-200"
            key={w.word}
          >
            <div className="w-[120px] flex-none text-[12px] font-medium flex items-center gap-[6px]">
              {w.word} {w.isKeyphrase && <span className="text-[9px] font-bold uppercase tracking-[0.04em] text-neutral-1000 bg-neutral-150 rounded-[3px] px-[5px] py-[1px]">Key</span>}
            </div>
            <div className="flex-1 h-[6px] rounded-[3px] bg-neutral-100 overflow-hidden">
              <i className={cn("block h-full", w.isKeyphrase ? "bg-neutral-1000" : "bg-neutral-400")} style={{ width: `${(w.count / max) * 100}%` }} />
            </div>
            <div className="w-[30px] text-right font-mono text-[11px] font-semibold text-neutral-700">{w.count}</div>
          </div>
        ))}
      </div>

      <div className="text-[11px] font-bold uppercase tracking-[0.05em] text-neutral-500 mt-[6px] mb-[-3px]">Internal-linking suggestions</div>
      <div className="bg-neutral-0 border border-neutral-200 rounded-rm overflow-hidden">
        <div className="flex items-center justify-between px-[15px] py-[12px] border-b border-neutral-200">
          <span className="font-semibold text-[13px]">Suggested anchor phrases</span>
          <span className="font-mono text-[11px] text-neutral-500 bg-neutral-100 rounded-[20px] px-[9px] py-[2px]">{data.internalLinkingPhrases.length}</span>
        </div>
        {data.internalLinkingPhrases.map((p) => (
          <div
            className="relative flex items-center gap-[10px] px-[15px] py-[11px] not-last:after:content-[''] not-last:after:absolute not-last:after:inset-x-[15px] not-last:after:bottom-0 not-last:after:h-px not-last:after:bg-neutral-200"
            key={p}
          >
            <span className="text-[12px] font-semibold">{p}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
