"use client";

import { Loader2 } from "lucide-react";
import { useId } from "react";
import type { ReactNode } from "react";
import type { CategoryResult } from "../../../../engine/types/analysis";
import { IconButton } from "../../../../ui/IconButton";
import { Notice } from "../../../../ui/Notice";
import { cn } from "../../../../utils/style";
import type { TranslationKey } from "../../../../translations/types";
import type { KeyphraseEntry } from "../../keyphraseState";
import { Target, Trash2 } from "./icons";
import { SynonymsField } from "./SynonymsField";
import { IssueList } from "../../overview/IssueList";
import { splitChecks } from "../../overview/buildIssues";
import { useSeoTranslation } from "../../../../translations/useSeoTranslation";

export type DetailAnalysis =
  | { kind: "metrics"; result: CategoryResult; dim: boolean }
  | { kind: "analyzing" }
  | { kind: "hint"; message?: TranslationKey };

export interface KeyphraseDetailProps {
  entry: KeyphraseEntry;
  isFocus: boolean;
  duplicate: boolean;
  analysis: DetailAnalysis;
  onTextChange: (text: string) => void;
  onAddSynonym: (syn: string) => void;
  onRemoveSynonym: (index: number) => void;
  onSetFocus: () => void;
  onRemove: () => void;
  usageNotice?: ReactNode;
  readOnly?: boolean;
}

interface AnalysisProps {
  analysis: DetailAnalysis;
}

function Analysis({ analysis }: AnalysisProps) {
  const { t } = useSeoTranslation();

  if (analysis.kind === "analyzing") {
    return (
      <div
        aria-live="polite"
        className="flex items-center gap-[9px] text-neutral-500 text-[13px] py-[12px]"
        role="status"
      >
        <Loader2 aria-hidden="true" className="w-[15px] h-[15px] animate-spin" />
        {t("keyphrase.analyzing")}
      </div>
    );
  }

  if (analysis.kind === "hint") {
    return (
      <div className="text-neutral-500 text-[12px] py-[6px]">
        {analysis.message ? t(analysis.message) : null}
      </div>
    );
  }

  const { result, dim } = analysis;
  const { open, passed } = splitChecks("keyphrase", result.checks);
  const scoreColor = {
    bad: cn("text-seo-bad"),
    warn: cn("text-seo-warn"),
    good: cn("text-seo-good"),
  }[result.status];

  return (
    <div
      className={cn(
        "flex flex-col gap-[10px] transition-opacity",
        dim && "opacity-40 pointer-events-none"
      )}
    >
      <div className="flex items-baseline gap-[8px]">
        <h3 className="m-0 text-[15px] font-semibold text-neutral-800">
          {t("keyphrase.optimization")}
        </h3>
        <span className={cn("text-[15px] font-semibold tabular-nums", scoreColor)}>
          {result.ringScore}
        </span>
        <span className="ml-auto text-[12.5px] text-neutral-500">
          {t("checks.passing", { passing: passed.length, total: result.checks.length })}
        </span>
      </div>
      <IssueList open={open} passed={passed} showCategory={false} />
    </div>
  );
}

export function KeyphraseDetail({
  entry,
  isFocus,
  duplicate,
  analysis,
  onTextChange,
  onAddSynonym,
  onRemoveSynonym,
  onSetFocus,
  onRemove,
  usageNotice,
  readOnly = false,
}: KeyphraseDetailProps) {
  const { t } = useSeoTranslation();
  const textInputId = useId();
  const label = t(isFocus ? "keyphrase.focusLabel" : "keyphrase.relatedLabel");

  return (
    <section className="flex-1 min-w-0 px-[15px] py-[18px] flex flex-col gap-[13px] overflow-auto">
      <div className="mb-[9px]">
        <div className="flex items-center justify-between gap-[8px] mb-[6px]">
          <label className="text-[13px] text-neutral-800" htmlFor={textInputId}>
            {label}
          </label>
          {!isFocus && !readOnly && (
            <div className="flex items-center gap-[6px]">
              <IconButton
                aria-label={t("keyphrase.setFocus")}
                onClick={onSetFocus}
                title={t("keyphrase.setFocus")}
                variant="primary"
              >
                <Target aria-hidden="true" />
              </IconButton>
              <IconButton
                aria-label={t("keyphrase.remove")}
                onClick={onRemove}
                title={t("keyphrase.remove")}
                variant="error"
              >
                <Trash2 aria-hidden="true" />
              </IconButton>
            </div>
          )}
        </div>
        <input
          autoComplete="off"
          className="w-full border border-neutral-200 rounded-rs px-[12px] py-[10px] text-[13px] text-neutral-800 bg-neutral-0 outline-none focus:border-neutral-800 disabled:bg-neutral-50 disabled:cursor-not-allowed"
          disabled={readOnly}
          id={textInputId}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={t(isFocus ? "keyphrase.focusPlaceholder" : "keyphrase.relatedPlaceholder")}
          type="text"
          value={entry.text}
        />
        {readOnly && (
          <p className="mt-[6px] mb-0 text-[11px] text-neutral-500">{t("keyphrase.readOnly")}</p>
        )}
      </div>

      {duplicate && (
        <Notice aria-live="polite" className="items-center" role="status" variant="warn">
          {t("keyphrase.duplicate", { text: entry.text.trim() })}
        </Notice>
      )}

      {!duplicate && usageNotice}

      <div className="mb-[9px]">
        <SynonymsField
          onAdd={onAddSynonym}
          onRemove={onRemoveSynonym}
          readOnly={readOnly}
          synonyms={entry.synonyms}
        />
      </div>

      <Analysis analysis={analysis} />
    </section>
  );
}
