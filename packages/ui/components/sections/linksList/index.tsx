import NextLink from "next/link";

import { cn } from "../../../utils";
import type { ILinksListProps } from "./types";

const ArrowIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={cn("size-4", className)}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
  </svg>
);

export function LinksList({ links }: ILinksListProps) {
  if (!links?.length) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {links.length} {links.length === 1 ? "Entry" : "Entries"}
        </span>
      </div>

      <ol className="divide-y divide-border border-y border-border">
        {links.map((link, i) => (
          <li key={i}>
            <NextLink href={link.href ?? "#"} className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 px-2 py-5 transition-colors hover:bg-muted/40 sm:gap-6 sm:px-4 sm:py-6">
              <span className="font-mono text-xs tabular-nums text-muted-foreground sm:w-12">{String(i + 1).padStart(2, "0")}</span>

              <span className="font-display text-lg leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-xl">{link.text}</span>

              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-pill border border-border text-foreground transition-all group-hover:border-foreground group-hover:bg-foreground group-hover:text-background sm:size-10">
                <ArrowIcon className="transition-transform group-hover:rotate-[-12deg]" />
              </span>
            </NextLink>
          </li>
        ))}
      </ol>
    </div>
  );
}
