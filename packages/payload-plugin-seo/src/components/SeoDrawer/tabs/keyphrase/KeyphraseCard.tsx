"use client";

import type { Status } from "../../../../engine/types/analysis";
import { ScoreRing } from "../../../../ui/ScoreRing";
import { cn } from "../../../../utils/style";
import type { KeyphraseEntry } from "../../keyphraseState";
import { useSeoTranslation } from "../../../../translations/useSeoTranslation";

export type CardState =
  | { kind: "score"; score: number; status: Status }
  | { kind: "analyzing" }
  | { kind: "idle" };

interface KeyphraseCardProps {
  entry: KeyphraseEntry;
  isFocus: boolean;
  selected: boolean;
  state: CardState;
  onSelect: (id: string) => void;
}

function MiniRing({ state }: { state: CardState }) {
  if (state.kind === "analyzing") {
    return <ScoreRing size="small" status="loading" />;
  }

  if (state.kind === "score") {
    return <ScoreRing score={state.score} size="small" status={state.status} />;
  }

  return <ScoreRing size="small" status="idle" />;
}

export function KeyphraseCard({ entry, isFocus, selected, state, onSelect }: KeyphraseCardProps) {
  const { t } = useSeoTranslation();
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(entry.id)}
      className={cn(
        "flex items-center gap-[10px] p-[8px] rounded-rs w-full text-left bg-neutral-0 border cursor-pointer",
        selected ? "border-neutral-300 shadow-card" : "border-transparent hover:border-neutral-150"
      )}
    >
      <MiniRing state={state} />

      <span className="flex-1 min-w-0 flex flex-col gap-[2px]">
        {isFocus && (
          <span className="self-start text-[11px] leading-[16px] bg-neutral-800 text-neutral-0 px-[6px] rounded-rs font-medium">
            {t("keyphrase.focusBadge")}
          </span>
        )}

        {entry.text ? (
          <span className="text-[12px] font-semibold text-neutral-800 truncate">{entry.text}</span>
        ) : (
          <span className="text-[12px] font-medium italic text-neutral-300 truncate">
            {t("keyphrase.new")}
          </span>
        )}
      </span>
    </button>
  );
}
