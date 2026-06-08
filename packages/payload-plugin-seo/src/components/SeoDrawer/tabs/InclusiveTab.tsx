"use client";

import { ScoreRing } from "../parts/ScoreRing";
import { StatusPill } from "../parts/StatusPill";
import type { AnalysisResult } from "../../../engine/types";

export function InclusiveTab({ data }: { data: AnalysisResult["inclusive"] }) {
  const flagged = data.categories.reduce((n, c) => n + c.flags.length, 0);

  return (
    <section className="flex flex-col gap-[13px]">
      <div className="bg-neutral-0 border border-neutral-200 rounded-rm p-[14px] flex items-center gap-[15px]">
        <ScoreRing score={data.ringScore} status={data.status} />
        <div className="flex-1">
          <div className="flex items-center gap-[8px]">
            <b className="text-[14px]">Inclusive language</b>
            <StatusPill status={data.status}>{data.status === "good" ? "Good" : "Needs work"}</StatusPill>
          </div>
          <div className="text-neutral-500 text-[11.5px] mt-[4px]">
            {flagged} phrases flagged across {data.categories.length} categories
          </div>
        </div>
      </div>

      {data.categories.length > 0 && (
        <div className="bg-neutral-0 border border-neutral-200 rounded-rm overflow-hidden">
          <div className="flex items-center justify-between px-[15px] py-[12px] border-b border-neutral-200">
            <span className="font-semibold text-[13px]">Marked by category</span>
            <span className="font-mono text-[11px] text-neutral-500 bg-neutral-100 rounded-[20px] px-[9px] py-[2px]">{flagged}</span>
          </div>
          {data.categories.map((cat) => (
            <div
              className="relative px-[15px] py-[12px] not-last:after:content-[''] not-last:after:absolute not-last:after:inset-x-[15px] not-last:after:bottom-0 not-last:after:h-px not-last:after:bg-neutral-200"
              key={cat.name}
            >
              <div className="flex items-center gap-[8px] mb-[9px]">
                <span className="font-bold text-[12.5px]">{cat.name}</span>
                <span className="font-mono text-[10.5px] text-seo-bad bg-seo-bad-100 border border-seo-bad rounded-[20px] px-[8px] py-[1px]">{cat.flags.length}</span>
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
        </div>
      )}

      {data.cleanCategories.length > 0 && (
        <div className="bg-neutral-0 border border-neutral-200 rounded-rm overflow-hidden">
          <div className="flex items-center justify-between px-[15px] py-[12px] border-b border-neutral-200">
            <span className="font-semibold text-[13px]">No issues found</span>
            <span className="font-mono text-[11px] text-neutral-500 bg-neutral-100 rounded-[20px] px-[9px] py-[2px]">{data.cleanCategories.length}</span>
          </div>
          <div className="flex gap-[8px] flex-wrap px-[15px] py-[13px]">
            {data.cleanCategories.map((n) => (
              <span className="inline-flex items-center gap-[6px] text-[11.5px] text-seo-good bg-seo-good-100 border border-seo-good-200 rounded-[20px] px-[11px] py-[4px] font-medium" key={n}>
                ✓ {n}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
