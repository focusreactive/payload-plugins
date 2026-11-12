"use client";

import { Drawer } from "@payloadcms/ui";
import { Loader2 } from "lucide-react";
import { memo, useState } from "react";
import type { ReactNode } from "react";
import type { AnalysisResult, TotalStatus } from "../../engine/types/analysis";
import type { KeyphraseEntry } from "./keyphraseState";
import { Header } from "./components/Header";
import { TABS, TABS_WITH_LINKS, TabsNav } from "./TabsNav";
import type { TabKey } from "./TabsNav";
import { KeyphraseTab } from "./tabs/KeyphraseTab";
import { OnPageTab } from "./tabs/OnPageTab";
import { ReadabilityTab } from "./tabs/ReadabilityTab";
import { InclusiveTab } from "./tabs/InclusiveTab";
import { SerpTab } from "./tabs/SerpTab";
import { VitalsTab } from "./tabs/VitalsTab";

import "../../admin.css";
import { useSeoTranslation } from "../../translations/useSeoTranslation";

export interface SeoDrawerProps {
  drawerSlug: string;
  keyphrases: KeyphraseEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  result: AnalysisResult | null;
  analyzing: boolean;
  onAddRelated: () => void;
  onTextChange: (id: string, text: string) => void;
  onAddSynonym: (id: string, syn: string) => void;
  onRemoveSynonym: (id: string, index: number) => void;
  onRemove: (id: string) => void;
  onSetFocus: (id: string) => void;
  isDuplicate: (id: string, text: string) => boolean;
  site: { name: string; baseUrl: string; faviconUrl: string };
  renderKeyphraseUsage?: (entry: KeyphraseEntry) => ReactNode;
  renderLinks?: () => ReactNode;
}

const TABS_WITHOUT_ANALYSIS = new Set<TabKey>(["keyphrase", "links"]);

export const SeoDrawer = memo(function SeoDrawer({
  drawerSlug,
  result,
  site,
  analyzing,
  isDuplicate,
  keyphrases,
  onAddRelated,
  onAddSynonym,
  onRemove,
  onRemoveSynonym,
  onSelect,
  onSetFocus,
  onTextChange,
  renderKeyphraseUsage,
  renderLinks,
  selectedId,
}: SeoDrawerProps) {
  const { t } = useSeoTranslation();
  const [tab, setTab] = useState<TabKey>("keyphrase");

  const total = result?.overall.seoScore ?? 0;
  const totalStatus: TotalStatus = result ? result.overall.status : "idle";

  const focusKeyphrase = keyphrases[0]?.text ?? "";
  const focusSynonyms = keyphrases[0]?.synonyms ?? [];

  return (
    <Drawer
      slug={drawerSlug}
      className="frseo-drawer"
      Header={<Header drawerSlug={drawerSlug} total={total} totalStatus={totalStatus} />}
    >
      <div className="frseo-root relative text-neutral-800" data-status={totalStatus}>
        <TabsNav active={tab} onChange={setTab} tabs={renderLinks ? TABS_WITH_LINKS : TABS} />

        <div className="frseo-tabpanel">
          {result === null && !TABS_WITHOUT_ANALYSIS.has(tab) ? (
            <div
              className="flex items-center gap-[8px] text-neutral-500 text-[13px]"
              role="status"
              aria-live="polite"
            >
              <Loader2 aria-hidden="true" className="w-[14px] h-[14px] animate-spin" />
              {t("analyzing")}
            </div>
          ) : (
            <>
              {tab === "keyphrase" && (
                <KeyphraseTab
                  keyphrases={keyphrases}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  result={result}
                  analyzing={analyzing}
                  onAddRelated={onAddRelated}
                  onTextChange={onTextChange}
                  onAddSynonym={onAddSynonym}
                  onRemoveSynonym={onRemoveSynonym}
                  onRemove={onRemove}
                  onSetFocus={onSetFocus}
                  isDuplicate={isDuplicate}
                  renderUsage={renderKeyphraseUsage}
                />
              )}
              {tab === "onpage" && result && <OnPageTab data={result.onPage} />}
              {tab === "readability" && result && <ReadabilityTab data={result.readability} />}
              {tab === "inclusive" && result && <InclusiveTab data={result.inclusive} />}
              {tab === "vitals" && result && (
                <VitalsTab data={result.vitals} onRequestKeyphrase={() => setTab("keyphrase")} />
              )}
              {tab === "serp" && result && (
                <SerpTab
                  data={result.serp}
                  keyphrase={focusKeyphrase}
                  synonyms={focusSynonyms}
                  faviconUrl={site.faviconUrl}
                />
              )}
              {tab === "links" && renderLinks?.()}
            </>
          )}
        </div>
      </div>
    </Drawer>
  );
});
