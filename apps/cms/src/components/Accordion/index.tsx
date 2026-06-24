"use client";
import React, { useState } from "react";

import { cn } from "@/components/utils";

export interface AccordionItemData {
  id: string;
  trigger: React.ReactNode;
  content: React.ReactNode;
}

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface AccordionProps {
  items: AccordionItemData[];
  className?: string;
  defaultOpenId?: string | null;
  triggerHeadingLevel?: HeadingLevel;
}

export function Accordion({
  items,
  className,
  defaultOpenId = null,
  triggerHeadingLevel,
}: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId);

  return (
    <div className={cn("border-t border-border", className)}>
      {items.map((item) => {
        const isOpen = openId === item.id;
        const trigger = (
          <button
            type="button"
            id={`accordion-trigger-${item.id}`}
            className="flex w-full items-center justify-between gap-6 py-6 text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            onClick={() => setOpenId(isOpen ? null : item.id)}
            aria-expanded={isOpen}
            aria-controls={`accordion-panel-${item.id}`}
          >
            <span className="font-display text-[1.3rem] font-semibold leading-tight tracking-tight text-foreground transition-colors [button:hover_>_&]:text-primary">
              {item.trigger}
            </span>
            <span
              aria-hidden="true"
              className="relative flex size-6 shrink-0 items-center justify-center"
            >
              <span className="absolute h-0.5 w-[18px] rounded-sm bg-primary transition-transform duration-[280ms] ease-out" />
              <span
                className={cn(
                  "absolute h-[18px] w-0.5 rounded-sm bg-primary transition-transform duration-[280ms] ease-out",
                  isOpen && "scale-y-0"
                )}
              />
            </span>
          </button>
        );

        const Heading = triggerHeadingLevel ? (`h${triggerHeadingLevel}` as const) : null;

        return (
          <div key={item.id} className="border-b border-border">
            {Heading ? <Heading className="m-0">{trigger}</Heading> : trigger}
            <div
              id={`accordion-panel-${item.id}`}
              role="region"
              aria-labelledby={`accordion-trigger-${item.id}`}
              inert={isOpen ? undefined : true}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-[320ms] ease-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="pb-6 pr-12 text-[0.98rem] leading-relaxed text-muted-foreground">
                  {item.content}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
