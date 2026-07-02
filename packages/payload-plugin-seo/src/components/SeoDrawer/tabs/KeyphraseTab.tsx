"use client";

import { useRef } from "react";
import type { AnalysisResult, CategoryResult } from "../../../engine/types/analysis";
import type { KeyphraseEntry } from "../keyphraseState";
import type { CardState } from "./keyphrase/KeyphraseCard";
import { KeyphraseDetail } from "./keyphrase/KeyphraseDetail";
import type { DetailAnalysis } from "./keyphrase/KeyphraseDetail";
import { KeyphraseRail } from "./keyphrase/KeyphraseRail";

export interface KeyphraseTabProps {
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
}

function resultForEntry(
  entry: KeyphraseEntry,
  isFocus: boolean,
  result: AnalysisResult | null
): CategoryResult | undefined {
  if (!result) return undefined;
  if (isFocus) return result.keyphraseText === entry.text ? result.keyphrase : undefined;
  return result.relatedKeyphrases.find((r) => r.text === entry.text)?.result;
}

export function KeyphraseTab({
  keyphrases,
  selectedId: selectedIdProp,
  onSelect,
  result,
  analyzing,
  onAddRelated,
  onTextChange,
  onAddSynonym,
  onRemoveSynonym,
  onRemove,
  onSetFocus,
  isDuplicate,
}: KeyphraseTabProps) {
  const selectedId = selectedIdProp ?? keyphrases[0]?.id ?? null;
  const selected = keyphrases.find((k) => k.id === selectedId) ?? keyphrases[0] ?? null;
  const selectedIsFocus = selected ? keyphrases.indexOf(selected) === 0 : true;

  const lastMetrics = useRef<Map<string, CategoryResult>>(new Map());
  const liveIds = new Set(keyphrases.map((k) => k.id));

  for (const id of [...lastMetrics.current.keys()]) {
    if (!liveIds.has(id)) lastMetrics.current.delete(id);
  }

  keyphrases.forEach((entry, index) => {
    if (entry.text.trim() === "") {
      lastMetrics.current.delete(entry.id);
      return;
    }
    const fresh = resultForEntry(entry, index === 0, result);
    if (fresh) lastMetrics.current.set(entry.id, fresh);
  });

  const stateFor = (entry: KeyphraseEntry): CardState => {
    if (!entry.text.trim()) return { kind: "idle" };

    const isFocus = keyphrases.indexOf(entry) === 0;
    if (!isFocus && isDuplicate(entry.id, entry.text)) return { kind: "idle" };

    const category = resultForEntry(entry, isFocus, result);
    if (category) return { kind: "score", score: category.ringScore, status: category.status };

    return { kind: "analyzing" };
  };

  const detailAnalysis = (): DetailAnalysis => {
    if (!selected) return { kind: "hint", message: "" };

    if (isDuplicate(selected.id, selected.text)) {
      return {
        kind: "hint",
        message: "Resolve the duplicate to analyse this keyphrase.",
      };
    }

    if (!selected.text.trim()) {
      return {
        kind: "hint",
        message: "Start typing a keyphrase to see its analysis.",
      };
    }

    const category = resultForEntry(selected, selectedIsFocus, result);
    if (category) {
      return {
        kind: "metrics",
        result: category,
        dim: analyzing,
      };
    }

    const previous = lastMetrics.current.get(selected.id);
    if (previous) {
      return {
        kind: "metrics",
        result: previous,
        dim: true,
      };
    }

    return { kind: "analyzing" };
  };

  const analysis = detailAnalysis();

  return (
    <div className="flex h-auto min-h-full">
      <KeyphraseRail
        entries={keyphrases}
        onAdd={onAddRelated}
        onSelect={onSelect}
        selectedId={selectedId}
        stateFor={stateFor}
      />

      {selected && (
        <KeyphraseDetail
          analysis={analysis}
          duplicate={isDuplicate(selected.id, selected.text)}
          entry={selected}
          isFocus={selectedIsFocus}
          onAddSynonym={(syn) => onAddSynonym(selected.id, syn)}
          onRemove={() => onRemove(selected.id)}
          onRemoveSynonym={(index) => onRemoveSynonym(selected.id, index)}
          onSetFocus={() => onSetFocus(selected.id)}
          onTextChange={(text) => onTextChange(selected.id, text)}
        />
      )}
    </div>
  );
}
