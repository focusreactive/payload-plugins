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
  /** Show the "01, 02, …" counter in front of each trigger. */
  numbered?: boolean;
}

export function Accordion({
  items,
  className,
  defaultOpenId = null,
  triggerHeadingLevel,
  numbered = true,
}: AccordionProps) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId);

  return (
    <div className={cn("flex flex-col", className)}>
      {items.map((item, index) => {
        const isOpen = openId === item.id;
        const trigger = (
          <button
            type="button"
            id={`accordion-trigger-${item.id}`}
            className="group flex w-full items-start gap-4 py-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:gap-6 md:py-8"
            onClick={() => setOpenId(isOpen ? null : item.id)}
            aria-expanded={isOpen}
            aria-controls={`accordion-panel-${item.id}`}
          >
            {numbered && (
              <span
                aria-hidden="true"
                className="w-8 shrink-0 text-h-item font-normal italic text-faint-foreground md:w-10"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
            )}
            <span className="flex-1 text-h-item text-foreground transition-opacity duration-150 group-hover:opacity-70">
              {item.trigger}
            </span>
            <span
              aria-hidden="true"
              className="relative mt-0.5 flex size-6 shrink-0 items-center justify-center text-foreground"
            >
              <span className="absolute h-px w-4 bg-current" />
              <span
                className={cn(
                  "absolute h-4 w-px bg-current transition-transform duration-[280ms] ease-out motion-reduce:transition-none",
                  isOpen && "scale-y-0"
                )}
              />
            </span>
          </button>
        );
        const Heading = triggerHeadingLevel ? (`h${triggerHeadingLevel}` as const) : null;
        return (
          <div
            key={item.id}
            className={cn(
              "transition-[padding] duration-[320ms] ease-out motion-reduce:transition-none",
              isOpen && "pb-6"
            )}
          >
            <div
              className={cn(
                "border-t transition-[background-color,border-color] duration-[320ms] ease-out motion-reduce:transition-none",
                isOpen
                  ? "rounded-xl border-border-strong bg-panel-gradient px-4 md:px-8"
                  : "mx-4 border-border md:mx-8"
              )}
            >
              {Heading ? <Heading className="m-0">{trigger}</Heading> : trigger}
              <div
                id={`accordion-panel-${item.id}`}
                role="region"
                aria-labelledby={`accordion-trigger-${item.id}`}
                inert={isOpen ? undefined : true}
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-[320ms] ease-out motion-reduce:transition-none",
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div
                    className={cn(
                      "pb-8 pr-10 text-body-lg text-muted-foreground md:pb-10 [&_p]:text-[length:inherit] [&_p]:leading-[inherit] [&_p]:text-inherit",
                      numbered && "pl-12 md:pl-16"
                    )}
                  >
                    {item.content}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
