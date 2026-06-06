"use client";
import { Button, useModal } from "@payloadcms/ui";
import { Gauge } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "../../utils/style";
import { SeoDrawer } from "../SeoDrawer";
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
  const { result, analyzing, analyzeNow } = useAnalysis(input, supportedLocales, activated);

  const status = result?.overall.status ?? null;

  const open = useCallback(() => {
    setActivated(true);
    openModal(DRAWER_SLUG);
  }, [openModal]);

  const handleAnalyze = useCallback(() => {
    analyzeNow(getLiveInput());
  }, [analyzeNow, getLiveInput]);

  return (
    <span className="seo-doc-btn-wrap">
      <Button
        aria-label="SEO Analytics"
        buttonStyle="none"
        className="seo-doc-btn"
        extraButtonProps={{ title: undefined }}
        icon={<Gauge />}
        iconStyle="without-border"
        margin={false}
        onClick={open}
        size="small"
        tooltip="SEO Analytics"
      />
      {status ? <span aria-hidden="true" className={cn("seo-doc-dot", `is-${status}`)} /> : null}
      <SeoDrawer analyzeNow={handleAnalyze} analyzing={analyzing} drawerSlug={DRAWER_SLUG} keyphrase={keyphrase} result={result} setKeyphrase={setKeyphrase} site={site} />
    </span>
  );
}

export default SeoButton;
