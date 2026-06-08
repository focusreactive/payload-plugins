"use client";

import { Drawer } from "@payloadcms/ui";
import { useState } from "react";
import "../../admin.css";
import type { AnalysisResult } from "../../engine/types";
import { cn } from "../../utils/style";
import { statusVar, tabVariants, totalPillVariants } from "./variants";
import { KeyphraseTab } from "./tabs/KeyphraseTab";
import { OnPageTab } from "./tabs/OnPageTab";
import { ReadabilityTab } from "./tabs/ReadabilityTab";
import { InclusiveTab } from "./tabs/InclusiveTab";
import { SerpTab } from "./tabs/SerpTab";
import { VitalsTab } from "./tabs/VitalsTab";

type TabKey = "keyphrase" | "onpage" | "readability" | "inclusive" | "vitals" | "serp";

const TABS: { key: TabKey; label: string }[] = [
  { key: "keyphrase", label: "Keyphrase" },
  { key: "onpage", label: "On-page SEO" },
  { key: "readability", label: "Readability" },
  { key: "inclusive", label: "Inclusive" },
  { key: "vitals", label: "Content vitals" },
  { key: "serp", label: "Search result preview" },
];

export interface SeoDrawerProps {
  drawerSlug: string;
  keyphrase: string;
  setKeyphrase: (keyphrase: string) => void;
  result: AnalysisResult | null;
  analyzing: boolean;
  analyzeNow: () => void;
  site: { name: string; baseUrl: string; faviconUrl: string };
}

export function SeoDrawer({ drawerSlug, keyphrase, setKeyphrase, result, analyzing, analyzeNow, site }: SeoDrawerProps) {
  const [tab, setTab] = useState<TabKey>("keyphrase");

  const total = result?.overall.seoScore ?? 0;
  const totalStatus = result?.overall.status ?? "warn";

  return (
    <Drawer slug={drawerSlug} title="SEO Analytics" className="seo-drawer">
      <div className="seo-root relative text-neutral-800" data-status={totalStatus}>
        <div className="relative flex items-center justify-between px-[4px] py-[16px]">
          <div className="flex items-center gap-[11px]">
            <h2 className="text-[16px] font-semibold m-0">SEO Analytics</h2>
            <span className={totalPillVariants({ status: totalStatus })}>{total}</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-neutral-150">
            <i className={cn("block h-full", statusVar({ status: totalStatus }))} style={{ width: `${total}%`, background: "var(--seo-c)" }} />
          </div>
        </div>

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
          </label>
          <button
            type="button"
            className="px-[18px] py-[9px] bg-neutral-1000 text-neutral-0 border-0 rounded-rs font-medium text-[13px] cursor-pointer disabled:opacity-50"
            disabled={!keyphrase.trim()}
            onClick={() => analyzeNow()}
          >
            {analyzing ? "Analyzing…" : "Analyze"}
          </button>
        </div>

        <nav className="flex gap-[20px] border-b border-neutral-200 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} type="button" className={tabVariants({ active: tab === t.key })} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>

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
