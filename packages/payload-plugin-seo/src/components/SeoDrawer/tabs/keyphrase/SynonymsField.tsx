"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { cn } from "../../../../utils/style";

export interface SynonymsFieldProps {
  synonyms: string[];
  onAdd: (syn: string) => void;
  onRemove: (index: number) => void;
}

export function SynonymsField({ synonyms, onAdd, onRemove }: SynonymsFieldProps) {
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
      <span className="block text-[10px] uppercase tracking-[0.05em] text-neutral-500 mb-[6px]">
        Synonyms
      </span>

      <div
        className={cn(
          "border rounded-rs bg-neutral-0 overflow-hidden",
          focused ? "border-neutral-800" : "border-neutral-200"
        )}
      >
        <div className="flex flex-wrap gap-[7px] p-[9px] items-center">
          {synonyms.map((synonym, index) => (
            <span
              key={`${synonym}-${index}`}
              className="bg-neutral-1000 text-neutral-0 rounded-[15px] pl-[12px] pr-[6px] py-[4px] text-[11.5px] inline-flex items-center gap-[7px]"
            >
              {synonym}

              <button
                type="button"
                aria-label={`Remove synonym ${synonym} (${index + 1})`}
                className="grid place-items-center p-0.5 text-neutral-400 rounded-full bg-transparent hover:text-neutral-0 hover:bg-neutral-800 [&_svg]:size-[1em] cursor-pointer"
                onClick={() => onRemove(index)}
              >
                <X aria-hidden="true" />
              </button>
            </span>
          ))}
          <button
            type="button"
            disabled={!canAdd}
            onClick={commit}
            className={cn(
              "inline-flex items-center gap-[5px] rounded-[15px] px-[11px] py-[5px] text-[11.5px] font-semibold [&_svg]:size-[13px] not-disabled:cursor-pointer transition-colors duration-150",
              "bg-neutral-1000 text-neutral-0 not-disabled:hover:bg-neutral-800",
              "disabled:bg-neutral-100 disabled:text-neutral-300 disabled:cursor-not-allowed"
            )}
          >
            <Plus aria-hidden="true" /> Add synonym
          </button>
        </div>
        <div className="border-t border-neutral-150" />
        <div className="flex items-center gap-[8px] px-[11px] py-[8px]">
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
            placeholder="Add a synonym…"
            aria-label="Add a synonym"
            className="flex-1 border-0 outline-none text-[12.5px] text-neutral-800 bg-transparent"
          />
          <span className="text-[9px] text-neutral-500 border border-neutral-200 rounded-[4px] px-[5px] py-[1px] font-semibold">
            Enter
          </span>
        </div>
      </div>
      <div className="text-[11px] text-neutral-500 mt-[6px] leading-[1.45]">
        Synonyms count as keyphrase matches in this keyphrase’s checks. One chip per synonym.
      </div>
    </div>
  );
}
