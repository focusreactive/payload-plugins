"use client";

import { AlertTriangle, Plus } from "lucide-react";
import { MAX_KEYPHRASES } from "../../../../constants";
import type { KeyphraseEntry } from "../../keyphraseState";
import { KeyphraseCard } from "./KeyphraseCard";
import type { CardState } from "./KeyphraseCard";
import { useSeoTranslation } from "../../../../translations/useSeoTranslation";

interface KeyphraseRailProps {
  entries: KeyphraseEntry[];
  selectedId: string | null;
  stateFor: (entry: KeyphraseEntry) => CardState;
  onSelect: (id: string) => void;
  onAdd: () => void;
  saveFailed?: boolean;
}

export function KeyphraseRail({
  entries,
  selectedId,
  stateFor,
  onSelect,
  onAdd,
  saveFailed = false,
}: KeyphraseRailProps) {
  const { t } = useSeoTranslation();
  const atMax = entries.length >= MAX_KEYPHRASES;

  return (
    <aside className="w-[264px] flex-none border-r border-neutral-200 bg-neutral-50">
      <div className="sticky top-0 px-[9px] py-[18px] flex flex-col gap-[5px]">
        <div className="flex items-center justify-between px-[7px] pt-[5px] pb-[3px]">
          <span className="text-[10px] uppercase tracking-[0.05em] text-neutral-500 font-bold">
            {t("keyphrase.rail", { count: entries.length, max: MAX_KEYPHRASES })}
          </span>

          <button
            type="button"
            aria-label={t("keyphrase.add")}
            title={atMax ? t("keyphrase.max", { max: MAX_KEYPHRASES }) : t("keyphrase.add")}
            disabled={atMax}
            onClick={onAdd}
            className="w-[26px] h-[26px] rounded-rs border border-neutral-200 grid place-items-center text-neutral-600 bg-neutral-0 hover:border-neutral-800 hover:text-neutral-800 disabled:opacity-35 not-disabled:cursor-pointer disabled:cursor-not-allowed [&_svg]:size-[15px]"
          >
            <Plus aria-hidden="true" />
          </button>
        </div>

        {entries.map((entry, i) => (
          <KeyphraseCard
            key={entry.id}
            entry={entry}
            isFocus={i === 0}
            selected={entry.id === selectedId}
            state={stateFor(entry)}
            onSelect={onSelect}
          />
        ))}

        {saveFailed && (
          <div
            className="mt-[6px] text-[11.5px] text-seo-bad bg-seo-bad-100 rounded-rs px-[10px] py-[8px] flex items-start gap-[7px]"
            role="alert"
          >
            <AlertTriangle aria-hidden="true" className="w-[15px] h-[15px] flex-none" />
            {t("keyphrase.saveFailed")}
          </div>
        )}
      </div>
    </aside>
  );
}
