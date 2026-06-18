"use client";

import { Button, useModal } from "@payloadcms/ui";
import { Gauge } from "lucide-react";
import { useCallback, useState } from "react";
import { ScoreBadge } from "./ScoreBadge";
import { SeoDrawer } from "../SeoDrawer";
import { isKeyphrasePending } from "../SeoDrawer/keyphrasePending";
import { useAnalysis } from "../SeoDrawer/useAnalysis";
import { useLiveDocument } from "../SeoDrawer/useLiveDocument";

export interface SeoButtonProps {
  collectionSlug: string;
  fields: Record<string, string>;
  extractContentPath: string | null;
  site: { name: string; baseUrl: string; faviconUrl: string };
  supportedLocales: string[];
}

const DRAWER_SLUG = "seo-analytics-drawer";

export function SeoButtonInner({ collectionSlug, fields, site, supportedLocales }: SeoButtonProps) {
  const { openModal } = useModal();
  const [keyphrase, setKeyphrase] = useState("");

  const { signature, getInput, invalidateMedia } = useLiveDocument({
    collectionSlug,
    fields,
    site: { name: site.name, baseUrl: site.baseUrl },
    keyphrase,
  });
  const { result, analyzing, analyzedKeyphrase, analyzeNow } = useAnalysis({
    getInput,
    signature,
    supportedLocales,
  });

  const keyphrasePending = isKeyphrasePending(keyphrase, analyzedKeyphrase);
  const overall = result?.overall ?? null;

  const open = useCallback(() => {
    invalidateMedia();
    analyzeNow();
    openModal(DRAWER_SLUG);
  }, [analyzeNow, invalidateMedia, openModal]);

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
        analyzeNow={analyzeNow}
        analyzing={analyzing}
        drawerSlug={DRAWER_SLUG}
        keyphrase={keyphrase}
        keyphrasePending={keyphrasePending}
        result={result}
        setKeyphrase={setKeyphrase}
        site={site}
      />
    </span>
  );
}
