"use client";
import { useState } from "react";
import type { SerpResult, Status } from "../../../engine/types/analysis";
import { MeterBar } from "../../../ui/MeterBar";
import { SectionCard } from "../../../ui/SectionCard";
import { SegmentedControl } from "../../../ui/SegmentedControl";
import { TITLE_WIDTH_BUDGET_PX, META_DESCRIPTION_MAX_CHARS } from "../../../constants";

type Mode = "mobile" | "desktop";

export function SerpTab({ data }: { data: SerpResult; keyphrase: string; faviconUrl: string }) {
  const [mode, setMode] = useState<Mode>("mobile");
  const titlePct = (data.titleWidthPx / TITLE_WIDTH_BUDGET_PX) * 100;
  const descPct = (data.descriptionChars / META_DESCRIPTION_MAX_CHARS) * 100;
  const titleStatus: Status = data.titleWidthPx <= 580 ? "good" : data.titleWidthPx <= 600 ? "warn" : "bad";
  const descStatus: Status = data.descriptionChars >= 120 && data.descriptionChars <= META_DESCRIPTION_MAX_CHARS ? "good" : "warn";

  return (
    <section className="flex flex-col gap-[13px]">
      <SectionCard
        title="Search result preview"
        widget={
          <SegmentedControl
            options={[
              { value: "mobile", label: "Mobile" },
              { value: "desktop", label: "Desktop" },
            ]}
            value={mode}
            onChange={setMode}
            label="Preview device"
          />
        }
      >
        <div className="p-[15px]"></div>
        <div className="border-t border-neutral-200 px-[15px] py-[12px] flex flex-col gap-[10px]">
          <MeterBar name="Title width" valueLabel={`${data.titleWidthPx} / ${TITLE_WIDTH_BUDGET_PX} px`} pct={titlePct} status={titleStatus} />
          <MeterBar name="Meta description" valueLabel={`${data.descriptionChars} / ${META_DESCRIPTION_MAX_CHARS} chars`} pct={descPct} status={descStatus} />
        </div>
      </SectionCard>
    </section>
  );
}
