"use client";
import { Button, useModal } from "@payloadcms/ui";
import { cva } from "class-variance-authority";
import { Gauge } from "lucide-react";
import { useCallback, useState } from "react";
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

const dotVariants = cva("absolute -top-[2px] -right-[2px] w-[8px] h-[8px] rounded-full border-[1.5px] border-[var(--theme-bg)] pointer-events-none", {
  variants: {
    status: {
      good: "bg-seo-good",
      warn: "bg-seo-warn",
      bad: "bg-seo-bad",
    },
  },
});

export function SeoButton({ fields, site, supportedLocales }: SeoButtonProps) {
  const { openModal } = useModal();
  const [keyphrase, setKeyphrase] = useState("");
  const [activated, setActivated] = useState(false);

  const { input, getLiveInput } = useLiveDocument({
    fields,
    site: { name: site.name, baseUrl: site.baseUrl },
    keyphrase,
    enabled: activated,
  });
  const { result, analyzing, analyzedKeyphrase, analyzeNow } = useAnalysis(input, supportedLocales, activated);

  const keyphrasePending = isKeyphrasePending(keyphrase, analyzedKeyphrase);

  const status = result?.overall.status ?? null;

  const open = useCallback(() => {
    setActivated(true);
    openModal(DRAWER_SLUG);
  }, [openModal]);

  const handleAnalyze = useCallback(() => {
    analyzeNow(getLiveInput());
  }, [analyzeNow, getLiveInput]);

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
      {status ? <span aria-hidden="true" className={dotVariants({ status })} /> : null}
      <SeoDrawer
        analyzeNow={handleAnalyze}
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

export default SeoButton;
