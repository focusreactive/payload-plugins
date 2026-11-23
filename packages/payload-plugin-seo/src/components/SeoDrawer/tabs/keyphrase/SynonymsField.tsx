"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { cn } from "../../../../utils/style";
import { useSeoTranslation } from "../../../../translations/useSeoTranslation";

export interface SynonymsFieldProps {
  synonyms: string[];
  onAdd: (syn: string) => void;
  onRemove: (index: number) => void;
  readOnly?: boolean;
}

export function SynonymsField({ synonyms, onAdd, onRemove, readOnly = false }: SynonymsFieldProps) {
  const { t } = useSeoTranslation();
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const canAdd = draft.trim().length > 0;

  const commit = () => {
    if (!canAdd) return;
    onAdd(draft.trim());
    setDraft("");
  };

  return (
    <div>
      <span className="block text-[13px] text-neutral-800 mb-[6px]">{t("synonyms.title")}</span>

      <div
        className={cn(
          "flex flex-wrap items-center gap-[6px] min-h-[40px] px-[8px] py-[6px] border rounded-rs bg-neutral-0 transition-colors duration-150",
          focused ? "border-neutral-800" : "border-neutral-200 hover:border-neutral-300"
        )}
      >
        {synonyms.map((synonym, index) => (
          <span
            key={`${synonym}-${index}`}
            className="inline-flex items-center gap-[4px] h-[26px] pl-[9px] pr-[3px] rounded-rs bg-neutral-100 text-neutral-800 text-[12px]"
          >
            {synonym}

            {!readOnly && (
              <button
                type="button"
                aria-label={t("synonyms.remove", { synonym, position: index + 1 })}
                className="grid place-items-center w-[20px] h-[20px] p-0 border-0 rounded-rs bg-transparent text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200 [&_svg]:size-[12px] cursor-pointer"
                onClick={() => onRemove(index)}
              >
                <X aria-hidden="true" />
              </button>
            )}
          </span>
        ))}

        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={synonyms.length === 0 ? t("synonyms.placeholder") : undefined}
          aria-label={t("synonyms.inputLabel")}
          disabled={readOnly}
          className="flex-1 min-w-[140px] h-[26px] px-[4px] border-0 outline-none text-[13px] text-neutral-800 bg-transparent"
        />

        {canAdd && !readOnly && (
          <button
            type="button"
            onClick={commit}
            className="inline-flex items-center gap-[4px] h-[26px] px-[8px] border-0 rounded-rs bg-neutral-800 text-neutral-0 text-[12px] font-medium cursor-pointer hover:bg-neutral-1000 [&_svg]:size-[12px]"
          >
            <Plus aria-hidden="true" /> {t("synonyms.add")}
          </button>
        )}
      </div>
      <div className="text-[12px] text-neutral-500 mt-[6px] leading-[1.45]">
        {t("synonyms.help")}
      </div>
    </div>
  );
}
