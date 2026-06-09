"use client";

import { Drawer } from "@payloadcms/ui";
import { Loader2 } from "lucide-react";
import { useState } from "react";
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

export function SeoDrawer({ drawerSlug, keyphrase, setKeyphrase, result, analyzing, keyphrasePending, analyzeNow, site }: SeoDrawerProps) {
  const [tab, setTab] = useState<TabKey>("keyphrase");

  const total = result?.overall.seoScore ?? 0;
  const totalStatus: TotalStatus = result ? result.overall.status : "idle";

  return (
    <Drawer slug={drawerSlug} className="seo-drawer" Header={<Header drawerSlug={drawerSlug} total={total} totalStatus={totalStatus} />}>
      <div className="seo-root relative text-neutral-800" data-status={totalStatus}>
        <div className="flex gap-[8px] py-[13px]">
          <label className="flex-1 flex items-center gap-[8px] px-[12px] py-[9px] border border-neutral-200 rounded-rs bg-neutral-0">
            <input
              type="text"
              className="border-0 outline-none flex-1 text-[13px] text-neutral-800 bg-transparent"
              value={keyphrase}
              onChange={(e) => setKeyphrase(e.target.value)}
              placeholder="Focus keyphrase"
              aria-label="Focus keyphrase"
            />
            {keyphrasePending ? <Loader2 aria-hidden="true" className="w-[14px] h-[14px] shrink-0 animate-spin text-neutral-400" /> : null}
          </label>
          <span aria-live="polite" className="sr-only" role="status">
            {keyphrasePending ? "Analyzing keyphrase…" : ""}
          </span>
          <button
            type="button"
            className="px-[18px] py-[9px] bg-neutral-1000 text-neutral-0 border-0 rounded-rs font-medium text-[13px] cursor-pointer disabled:opacity-50"
            disabled={!keyphrase.trim()}
            onClick={() => analyzeNow()}
          >
            {analyzing ? "Analyzing…" : "Analyze"}
          </button>
        </div>

        <TabsNav active={tab} onChange={setTab} />

        <div className="py-[18px]">
          {!result ? (
            <p className="text-neutral-500">Enter a focus keyphrase and click Analyze.</p>
          ) : (
            <>
              {tab === "keyphrase" && <KeyphraseTab data={result.keyphrase} />}
              {tab === "onpage" && <OnPageTab data={result.onPage} />}
              {tab === "readability" && <ReadabilityTab data={result.readability} />}
              {tab === "inclusive" && <InclusiveTab data={result.inclusive} />}
              {tab === "vitals" && <VitalsTab data={result.vitals} />}
              {tab === "serp" && <SerpTab data={result.serp} keyphrase={keyphrase} faviconUrl={site.faviconUrl} />}
            </>
          )}
        </div>
      </div>
    </Drawer>
  );
}
