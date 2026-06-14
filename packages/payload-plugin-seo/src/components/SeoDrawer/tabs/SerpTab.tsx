"use client";

import { Monitor, Smartphone } from "lucide-react";
import { useState } from "react";

import type { SerpResult } from "../../../engine/types/analysis";
import { SectionCard } from "../../../ui/SectionCard";
import { SegmentedControl } from "../../../ui/SegmentedControl";
import { SerpPreview } from "../components/SerpPreview";
import type { SerpMode } from "../components/SerpPreview";

export function SerpTab({ data, keyphrase, faviconUrl }: { data: SerpResult; keyphrase: string; faviconUrl: string }) {
  const [mode, setMode] = useState<SerpMode>("mobile");

  return (
    <section className="flex flex-col gap-[13px]">
      <SectionCard
        title="Search result preview"
        widget={
          <SegmentedControl
            options={[
              {
                value: "mobile",
                label: "Mobile",
                icon: <Smartphone aria-hidden="true" className="w-[13px] h-[13px]" />,
              },
              {
                value: "desktop",
                label: "Desktop",
                icon: <Monitor aria-hidden="true" className="w-[13px] h-[13px]" />,
              },
            ]}
            value={mode}
            onChange={setMode}
            label="Preview device"
          />
        }
      >
        <div className="p-4">
          <SerpPreview data={data} keyphrase={keyphrase} faviconUrl={faviconUrl} mode={mode} />
        </div>
      </SectionCard>
    </section>
  );
}
