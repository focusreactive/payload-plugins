"use client";

import type { VitalsResult } from "../../../engine/types/analysis";
import { cn, ROW_SEPARATOR } from "../../../utils/style";
import { KpiCard } from "../../../ui/KpiCard";
import { SectionCard } from "../../../ui/SectionCard";
import { Pill } from "../../../ui/Pill";
import { HeadingsSection } from "../components/HeadingsSection";
import { TabWrapper } from "../components/TabWrapper";
import { useSeoTranslation } from "../../../translations/useSeoTranslation";

export interface VitalsTabProps {
  data: VitalsResult;
  onRequestKeyphrase: () => void;
}

export function VitalsTab({ data, onRequestKeyphrase }: VitalsTabProps) {
  const { t } = useSeoTranslation();
  const max = Math.max(1, ...data.prominentWords.map((w) => w.count));
  const noKeyphraseMatch = data.prominentWords.every((w) => !w.isKeyphrase);

  return (
    <TabWrapper>
      <section className="flex flex-col gap-[13px]">
        <div className="grid grid-cols-3 gap-[9px]">
          <KpiCard label={t("vitals.words")} value={data.words.toLocaleString()} />
          <KpiCard label={t("vitals.sentences")} value={data.sentences} />
          <KpiCard label={t("vitals.paragraphs")} value={data.paragraphs} />
          <KpiCard label={t("vitals.images")} value={data.images} />
          <KpiCard label={t("vitals.videos")} value={data.videos} />
          <KpiCard
            label={t("vitals.readingTime")}
            value={data.readingTimeMinutes}
            suffix={t("vitals.minutes")}
          />
        </div>

        <HeadingsSection data={data.headings} />

        <SectionCard
          title={t("vitals.prominentWords")}
          widget={<Pill variant="neutral">{data.prominentWords.length}</Pill>}
        >
          {data.prominentWords.map((w) => (
            <div
              className={cn(
                "relative flex items-center gap-[12px] px-[15px] py-[9px]",
                ROW_SEPARATOR
              )}
              key={w.word}
            >
              <div className="w-[120px] flex-none text-[12px] font-medium flex items-center gap-[6px]">
                {w.word}{" "}
                {w.isKeyphrase && (
                  <span className="text-[9px] font-bold uppercase tracking-[0.04em] text-neutral-1000 bg-neutral-150 rounded-[3px] px-[5px] py-[1px]">
                    {t("vitals.keyBadge")}
                  </span>
                )}
              </div>
              <div className="flex-1 h-[6px] rounded-[3px] bg-neutral-100 overflow-hidden">
                <i
                  className={cn(
                    "block h-full",
                    w.isKeyphrase ? "bg-neutral-1000" : "bg-neutral-400"
                  )}
                  style={{ width: `${(w.count / max) * 100}%` }}
                />
              </div>
              <div className="w-[30px] text-right font-mono text-[11px] font-semibold text-neutral-700">
                {w.count}
              </div>
            </div>
          ))}
        </SectionCard>

        {noKeyphraseMatch && (
          <button
            type="button"
            onClick={onRequestKeyphrase}
            className="self-start text-[12px] text-neutral-600 underline underline-offset-2 hover:text-neutral-800 cursor-pointer bg-transparent border-0 p-0"
          >
            {t("vitals.setKeyphrase")}
          </button>
        )}
      </section>
    </TabWrapper>
  );
}
