"use client";
import { MinusIcon, PlusIcon } from "lucide-react";
import React, { useState } from "react";

import { cn } from "@/core/lib/utils";

export interface AccordionItemData {
  id: string;
  trigger: React.ReactNode;
  content: React.ReactNode;
}

interface AccordionProps {
  items: AccordionItemData[];
  className?: string;
}

export function Accordion({ items, className }: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className={cn("divide-y divide-border border-y border-border", className)}>
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id}>
            <button
              type="button"
              id={`accordion-trigger-${item.id}`}
              className="flex w-full items-center justify-between gap-6 py-6 text-left font-display text-xl leading-tight tracking-tight text-foreground transition-colors hover:text-primary"
              onClick={() => setOpenId(isOpen ? null : item.id)}
              aria-expanded={isOpen}
              aria-controls={`accordion-panel-${item.id}`}
            >
              <span>{item.trigger}</span>
              <span className="flex size-6 shrink-0 items-center justify-center text-foreground">
                {isOpen ? <MinusIcon className="size-5" aria-hidden /> : <PlusIcon className="size-5" aria-hidden />}
              </span>
            </button>
            {isOpen && (
              <div id={`accordion-panel-${item.id}`} role="region" aria-labelledby={`accordion-trigger-${item.id}`} className="pb-6 pr-12 text-foreground/85 leading-relaxed">
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
