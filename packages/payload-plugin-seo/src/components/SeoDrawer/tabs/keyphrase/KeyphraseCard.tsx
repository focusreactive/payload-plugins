"use client";

import type { Status } from "../../../../engine/types/analysis";
import { ScoreRing } from "../../../../ui/ScoreRing";
import { cn } from "../../../../utils/style";
import type { KeyphraseEntry } from "../../keyphraseState";

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
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(entry.id)}
      className={cn(
        "flex items-center gap-[10px] p-[8px] rounded-rs w-full text-left bg-neutral-0 border",
        selected
          ? "border-neutral-300 shadow-[0_1px_5px_rgba(30,25,20,0.09)]"
          : "border-transparent hover:border-neutral-150"
      )}
    >
      <MiniRing state={state} />

      <span className="flex-1 min-w-0 flex flex-col gap-[2px]">
        {isFocus && (
          <span className="self-start text-[7px] leading-none uppercase bg-neutral-1000 text-neutral-0 px-[6px] py-[2px] rounded-[7px] tracking-[0.06em] font-bold">
            Focus
          </span>
        )}

        {entry.text ? (
          <span className="text-[12px] font-semibold text-neutral-800 truncate">{entry.text}</span>
        ) : (
          <span className="text-[12px] font-medium italic text-neutral-300 truncate">
            New keyphrase
          </span>
        )}
      </span>
    </button>
  );
}
