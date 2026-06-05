"use client";
import { useCallback, useState } from "react";
import { Button, useModal } from "@payloadcms/ui";
import { Gauge } from "lucide-react";
import { cn } from "../../utils/style";
import { useLiveDocument } from "../SeoDrawer/useLiveDocument";
import { useAnalysis } from "../SeoDrawer/useAnalysis";
import { SeoDrawer } from "../SeoDrawer";

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

  const input = useLiveDocument({
    fields,
    site: { name: site.name, baseUrl: site.baseUrl },
    keyphrase,
  });
  const { result, analyzing, analyzeNow } = useAnalysis(input, supportedLocales, activated);

  const status = result?.overall.status ?? null;

  const open = useCallback(() => {
    setActivated(true);
    openModal(DRAWER_SLUG);
  }, [openModal]);

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
      <SeoDrawer analyzeNow={analyzeNow} analyzing={analyzing} drawerSlug={DRAWER_SLUG} keyphrase={keyphrase} result={result} setKeyphrase={setKeyphrase} site={site} />
    </span>
  );
}

export default SeoButton;
