"use client";

import { Monitor, Smartphone } from "lucide-react";
import { useState } from "react";

import type { SerpResult } from "../../../engine/types/analysis";
import { SectionCard } from "../../../ui/SectionCard";
import { SegmentedControl } from "../../../ui/SegmentedControl";
import { SerpPreview } from "../components/SerpPreview";
import type { SerpMode } from "../components/SerpPreview";
import { TabWrapper } from "../components/TabWrapper";
import { useSeoTranslation } from "../../../translations/useSeoTranslation";

export function SerpTab({
  data,
  keyphrase,
  synonyms = [],
  faviconUrl,
}: {
  data: SerpResult;
  keyphrase: string;
  synonyms?: string[];
  faviconUrl: string;
}) {
  const { t } = useSeoTranslation();
  const [mode, setMode] = useState<SerpMode>("mobile");

  return (
    <TabWrapper>
      <section className="flex flex-col gap-[13px]">
        <SectionCard
          title={t("serp.title")}
          widget={
            <SegmentedControl
              options={[
                {
                  value: "mobile",
                  label: t("serp.mobile"),
                  icon: <Smartphone aria-hidden="true" className="w-[13px] h-[13px]" />,
                },
                {
                  value: "desktop",
                  label: t("serp.desktop"),
                  icon: <Monitor aria-hidden="true" className="w-[13px] h-[13px]" />,
                },
              ]}
              value={mode}
              onChange={setMode}
              label={t("serp.device")}
            />
          }
        >
          <div className="p-4">
            <SerpPreview
              data={data}
              keyphrase={keyphrase}
              synonyms={synonyms}
              faviconUrl={faviconUrl}
              mode={mode}
            />
          </div>
        </SectionCard>
      </section>
    </TabWrapper>
  );
}
