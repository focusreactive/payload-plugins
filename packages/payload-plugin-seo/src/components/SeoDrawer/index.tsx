"use client";
import { useState } from "react";
import { Drawer } from "@payloadcms/ui";
import "./admin.css";
import { cn } from "../../utils/style";
import type { AnalysisResult } from "../../engine/types";
import { KeyphraseTab } from "./tabs/KeyphraseTab";
import { OnPageTab } from "./tabs/OnPageTab";
import { ReadabilityTab } from "./tabs/ReadabilityTab";
import { InclusiveTab } from "./tabs/InclusiveTab";
import { VitalsTab } from "./tabs/VitalsTab";
import { SerpTab } from "./tabs/SerpTab";

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
  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState<TabKey>("keyphrase");

  const total = result?.overall.seoScore ?? 0;
  const totalStatus = result?.overall.status ?? "warn";

  return (
    <Drawer slug={drawerSlug} title="SEO Analytics" className="seo-drawer">
      <div className="seo-root" data-status={totalStatus}>
        <div className="seo-head">
          <div className="seo-head-left">
            <h2 className="seo-title">SEO Analytics</h2>
            <span className={cn("seo-total-pill", `is-${totalStatus}`)}>{total}</span>
          </div>
          <div className="seo-scorebar">
            <i style={{ width: `${total}%` }} />
          </div>
        </div>

        <div className="seo-kp">
          <label className="seo-input">
            <input type="text" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Focus keyphrase" aria-label="Focus keyphrase" />
          </label>
          <button
            type="button"
            className="seo-btn"
            onClick={() => {
              setKeyphrase(draft);
              analyzeNow();
            }}
          >
            {analyzing ? "Analyzing…" : "Analyze"}
          </button>
        </div>

        <nav className="seo-tabs">
          {TABS.map((t) => (
            <button key={t.key} type="button" className={cn("seo-tab", tab === t.key && "on")} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>

        <div className="seo-body">
          {!result ? (
            <p className="seo-muted">Enter a focus keyphrase and click Analyze.</p>
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
