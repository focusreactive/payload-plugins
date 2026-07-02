"use client";

import { Button, useDocumentInfo, useLocale, useModal } from "@payloadcms/ui";
import { Gauge } from "lucide-react";
import { useCallback, useState } from "react";
import { ScoreBadge } from "./ScoreBadge";
import { SeoDrawer } from "../SeoDrawer";
import { useAnalysis } from "../SeoDrawer/useAnalysis";
import { useKeyphrases } from "../SeoDrawer/useKeyphrases";
import { useLiveDocument } from "../SeoDrawer/useLiveDocument";

export interface SeoButtonProps {
  collectionSlug: string;
  fields: Record<string, string>;
  extractContentPath: string;
  site: { name: string; baseUrl: string; faviconUrl: string };
  supportedLocales: string[];
}

const DRAWER_SLUG = "seo-analytics-drawer";

export function SeoButtonInner({
  collectionSlug,
  fields,
  site,
  supportedLocales,
  extractContentPath,
}: SeoButtonProps) {
  const { openModal } = useModal();
  const { id } = useDocumentInfo();
  const locale = useLocale();

  const docId = id == null ? "" : String(id);
  const localeCode = locale?.code ?? "en";

  const {
    addRelated,
    addSynonym,
    isDuplicate,
    keyphrases,
    remove: removeKeyphrase,
    removeSynonym,
    setFocus,
    updateText,
  } = useKeyphrases({ collectionSlug, docId, localeCode });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { signature, getInput } = useLiveDocument({
    collectionSlug,
    fields,
    site: {
      name: site.name,
      baseUrl: site.baseUrl,
    },
    keyphrases,
    extractContentPath,
  });
  const { result, analyzing, analyzeNow } = useAnalysis({ getInput, signature, supportedLocales });

  const overall = result?.overall ?? null;

  const open = useCallback(() => {
    analyzeNow();
    openModal(DRAWER_SLUG);
  }, [analyzeNow, openModal]);

  const handleAddRelated = useCallback(() => {
    const newId = addRelated();
    if (newId) setSelectedId(newId);
  }, [addRelated]);

  const handleRemove = useCallback(
    (id: string) => {
      removeKeyphrase(id);
      setSelectedId((current) => (current === id ? null : current));
    },
    [removeKeyphrase]
  );

  return (
    <span className="relative inline-flex">
      <Button
        aria-label="SEO Analytics"
        buttonStyle="none"
        className="seo-doc-btn m-0 w-[calc(var(--base)*1.6)] h-[calc(var(--base)*1.6)] inline-flex items-center justify-center border border-[var(--theme-elevation-100)] rounded-rs bg-transparent text-neutral-800 transition-[border-color,background-color] duration-100 hover:border-neutral-300 hover:bg-neutral-100"
        extraButtonProps={{ title: undefined }}
        icon={<Gauge />}
        iconStyle="without-border"
        margin={false}
        onClick={open}
        size="small"
        tooltip="SEO Analytics"
      />
      {overall && <ScoreBadge score={overall.seoScore} status={overall.status} />}

      <SeoDrawer
        drawerSlug={DRAWER_SLUG}
        keyphrases={keyphrases}
        selectedId={selectedId}
        onSelect={setSelectedId}
        result={result}
        analyzing={analyzing}
        onAddRelated={handleAddRelated}
        onTextChange={updateText}
        onAddSynonym={addSynonym}
        onRemoveSynonym={removeSynonym}
        onRemove={handleRemove}
        onSetFocus={setFocus}
        isDuplicate={isDuplicate}
        site={site}
      />
    </span>
  );
}
