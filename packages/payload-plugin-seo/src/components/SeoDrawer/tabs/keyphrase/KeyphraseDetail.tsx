"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useId, useState } from "react";
import type { CategoryResult } from "../../../../engine/types/analysis";
import { CheckRow } from "../../../../ui/CheckRow";
import type { Filter } from "../../../../ui/FilterPills";
import { FilterPills } from "../../../../ui/FilterPills";
import { Pill } from "../../../../ui/Pill";
import { SectionCard } from "../../../../ui/SectionCard";
import { IconButton } from "../../../../ui/IconButton";
import { TabHeader } from "../../../../ui/TabHeader";
import { cn } from "../../../../utils/style";
import type { KeyphraseEntry } from "../../keyphraseState";
import { Target, Trash2 } from "./icons";
import { SynonymsField } from "./SynonymsField";

export type DetailAnalysis =
  | { kind: "metrics"; result: CategoryResult; dim: boolean }
  | { kind: "analyzing" }
  | { kind: "hint"; message: string };

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
}

interface AnalysisProps {
  analysis: DetailAnalysis;
}

function Analysis({ analysis }: AnalysisProps) {
  const [filter, setFilter] = useState<Filter>("all");

  if (analysis.kind === "analyzing") {
    return (
      <div
        aria-live="polite"
        className="flex items-center gap-[9px] text-neutral-500 text-[13px] py-[12px]"
        role="status"
      >
        <Loader2 aria-hidden="true" className="w-[15px] h-[15px] animate-spin" />
        Analyzing keyphrase…
      </div>
    );
  }

  if (analysis.kind === "hint") {
    return <div className="text-neutral-500 text-[12px] py-[6px]">{analysis.message}</div>;
  }

  const { result, dim } = analysis;
  const passing = result.checks.filter((check) => check.status === "good").length;
  const visible = result.checks.filter((check) => filter === "all" || check.status === filter);

  return (
    <div
      className={cn(
        "flex flex-col gap-[13px] transition-opacity",
        dim && "opacity-40 pointer-events-none"
      )}
    >
      <TabHeader
        score={result.ringScore}
        status={result.status}
        subtitle={
          <>
            {passing} / {result.checks.length} checks passing
          </>
        }
        title="Keyphrase optimization"
      />

      <SectionCard title="Checks" widget={<Pill variant="neutral">{result.checks.length}</Pill>}>
        <FilterPills checks={result.checks} onChange={setFilter} value={filter} />
        {visible.map((check) => (
          <CheckRow check={check} key={check.id} />
        ))}
      </SectionCard>
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
}: KeyphraseDetailProps) {
  const textInputId = useId();
  const label = isFocus ? "Focus keyphrase" : "Related keyphrase";

  return (
    <section className="flex-1 min-w-0 px-[15px] py-[18px] flex flex-col gap-[13px] overflow-auto">
      <div className="mb-[9px]">
        <div className="flex items-center justify-between gap-[8px] mb-[6px]">
          <label
            className="text-[10px] uppercase tracking-[0.05em] text-neutral-500"
            htmlFor={textInputId}
          >
            {label}
          </label>
          {!isFocus && (
            <div className="flex items-center gap-[6px]">
              <IconButton
                aria-label="Set as focus"
                onClick={onSetFocus}
                title="Set as focus"
                variant="primary"
              >
                <Target aria-hidden="true" />
              </IconButton>
              <IconButton
                aria-label="Remove keyphrase"
                onClick={onRemove}
                title="Remove keyphrase"
                variant="error"
              >
                <Trash2 aria-hidden="true" />
              </IconButton>
            </div>
          )}
        </div>
        <input
          autoComplete="off"
          className="w-full border border-neutral-200 rounded-rs px-[12px] py-[10px] text-[13px] text-neutral-800 bg-neutral-0 outline-none focus:border-neutral-800"
          id={textInputId}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={isFocus ? "Type your primary keyphrase" : "Type a related keyphrase"}
          type="text"
          value={entry.text}
        />
      </div>

      {duplicate && (
        <div
          aria-live="polite"
          className="text-[11.5px] text-seo-warn bg-seo-warn-100 rounded-rs px-[10px] py-[8px] flex items-center gap-[7px]"
          role="status"
        >
          <AlertTriangle aria-hidden="true" className="w-[15px] h-[15px] flex-none" />
          &#8220;{entry.text.trim()}&#8221; is already in your keyphrase list.
        </div>
      )}

      <div className="mb-[9px]">
        <SynonymsField onAdd={onAddSynonym} onRemove={onRemoveSynonym} synonyms={entry.synonyms} />
      </div>

      <Analysis analysis={analysis} />
    </section>
  );
}
