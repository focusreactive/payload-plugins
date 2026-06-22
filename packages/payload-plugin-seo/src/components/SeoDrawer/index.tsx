"use client";

import { Drawer } from "@payloadcms/ui";
import { Loader2 } from "lucide-react";
import { memo, useState } from "react";
import type { AnalysisResult, TotalStatus } from "../../engine/types/analysis";
import { Header } from "./components/Header";
import { TabsNav } from "./TabsNav";
import type { TabKey } from "./TabsNav";
import { KeyphraseTab } from "./tabs/KeyphraseTab";
import { OnPageTab } from "./tabs/OnPageTab";
import { ReadabilityTab } from "./tabs/ReadabilityTab";
import { InclusiveTab } from "./tabs/InclusiveTab";
import { SerpTab } from "./tabs/SerpTab";
import { VitalsTab } from "./tabs/VitalsTab";

import "../../admin.css";

export interface SeoDrawerProps {
  drawerSlug: string;
  keyphrase: string;
  setKeyphrase: (keyphrase: string) => void;
  result: AnalysisResult | null;
  analyzing: boolean;
  keyphrasePending: boolean;
  analyzeNow: () => void;
  site: { name: string; baseUrl: string; faviconUrl: string };
}

export const SeoDrawer = memo(function SeoDrawer({
  drawerSlug,
  keyphrase,
  setKeyphrase,
  result,
  analyzing,
  keyphrasePending,
  analyzeNow,
  site,
}: SeoDrawerProps) {
  const [tab, setTab] = useState<TabKey>("keyphrase");

  const total = result?.overall.seoScore ?? 0;
  const totalStatus: TotalStatus = result ? result.overall.status : "idle";

  return (
    <Drawer
      slug={drawerSlug}
      className="seo-drawer"
      Header={<Header drawerSlug={drawerSlug} total={total} totalStatus={totalStatus} />}
    >
      <div className="seo-root relative text-neutral-800" data-status={totalStatus}>
        <TabsNav active={tab} onChange={setTab} />

        <div className="py-[18px]">
          {result === null ? (
            <div
              className="flex items-center gap-[8px] text-neutral-500 text-[13px]"
              role="status"
              aria-live="polite"
            >
              <Loader2 aria-hidden="true" className="w-[14px] h-[14px] animate-spin" />
              Analyzing…
            </div>
          ) : (
            <>
              {tab === "keyphrase" && (
                <KeyphraseTab
                  data={result.keyphrase}
                  keyphrase={keyphrase}
                  setKeyphrase={setKeyphrase}
                  analyzing={analyzing}
                  keyphrasePending={keyphrasePending}
                  analyzeNow={analyzeNow}
                />
              )}
              {tab === "onpage" && <OnPageTab data={result.onPage} />}
              {tab === "readability" && <ReadabilityTab data={result.readability} />}
              {tab === "inclusive" && <InclusiveTab data={result.inclusive} />}
              {tab === "vitals" && (
                <VitalsTab data={result.vitals} onRequestKeyphrase={() => setTab("keyphrase")} />
              )}
              {tab === "serp" && (
                <SerpTab data={result.serp} keyphrase={keyphrase} faviconUrl={site.faviconUrl} />
              )}
            </>
          )}
        </div>
      </div>
    </Drawer>
  );
});
