"use client";

import { useDocumentInfo, useLocale, useModal } from "@payloadcms/ui";
import { useCallback, useState } from "react";
import { ScoreBadge } from "./ScoreBadge";
import { SeoTriggerButton } from "./SeoTriggerButton";
import { SeoDrawer } from "../SeoDrawer";
import type { KeyphraseEntry } from "../SeoDrawer/keyphraseState";
import {
  LinkSuggestionsProvider,
  renderLinksPanel,
} from "../SeoDrawer/links/LinkSuggestionsProvider";
import { KeyphraseUsage } from "../SeoDrawer/tabs/keyphrase/KeyphraseUsageNotice";
import { useAnalysis } from "../SeoDrawer/useAnalysis";
import { useKeyphrases } from "../SeoDrawer/useKeyphrases";
import type { RemoteKeyphrases } from "../SeoDrawer/useKeyphrases";
import { useLiveDocument } from "../SeoDrawer/useLiveDocument";

export interface SeoButtonProps {
  collectionSlug: string;
  fields: Record<string, string>;
  extractContentPath: string;
  site: { name: string; baseUrl: string; faviconUrl: string };
  supportedLocales: string[];
  keyphraseIndex: boolean;
}

interface SeoButtonInnerProps extends SeoButtonProps {
  remote?: RemoteKeyphrases;
}

const DRAWER_SLUG = "seo-analytics-drawer";

export function SeoButtonInner({
  collectionSlug,
  fields,
  site,
  supportedLocales,
  extractContentPath,
  remote,
}: SeoButtonInnerProps) {
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
    saveFailed,
    setFocus,
    syncOnOpen,
    updateText,
  } = useKeyphrases({ collectionSlug, docId, localeCode, remote });
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
    syncOnOpen();
    analyzeNow();
    openModal(DRAWER_SLUG);
  }, [analyzeNow, openModal, syncOnOpen]);

  const handleAddRelated = useCallback(() => {
    const newId = addRelated();
    if (newId) setSelectedId(newId);
  }, [addRelated]);

  const handleRemove = useCallback(
    (keyphraseId: string) => {
      removeKeyphrase(keyphraseId);
      setSelectedId((current) => (current === keyphraseId ? null : current));
    },
    [removeKeyphrase]
  );

  const renderKeyphraseUsage = useCallback(
    (entry: KeyphraseEntry) => (
      <KeyphraseUsage
        collectionSlug={collectionSlug}
        docId={docId}
        key={entry.id}
        phrase={entry.text}
      />
    ),
    [collectionSlug, docId]
  );

  const drawer = (
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
      keyphrasesSaveFailed={saveFailed}
      renderKeyphraseUsage={remote ? renderKeyphraseUsage : undefined}
      renderLinks={remote ? renderLinksPanel : undefined}
      site={site}
    />
  );

  return (
    <SeoTriggerButton onClick={open}>
      {overall && <ScoreBadge score={overall.seoScore} status={overall.status} />}

      {remote ? (
        <LinkSuggestionsProvider
          collectionSlug={collectionSlug}
          docId={docId}
          getInput={getInput}
          localeCode={localeCode}
        >
          {drawer}
        </LinkSuggestionsProvider>
      ) : (
        drawer
      )}
    </SeoTriggerButton>
  );
}
