import type { ReactNode } from "react";

import { cn } from "@/components/utils";
import type { BackdropTone } from "@/components/utils";
import { Eyebrow } from "@/components/ui/Eyebrow";

export type SectionMarkerGlyph = "sparkle" | "dot";

export interface SectionMarkerProps {
  children: ReactNode;
  /**
   * "sparkle" (14x14, the four section-header instances) is followed by plain sentence-case body
   * text. "dot" (a 7px circle, the hero only) is followed by tracked uppercase text, so that case
   * composes Eyebrow at size 14 rather than duplicating its type treatment here.
   */
  glyph?: SectionMarkerGlyph;
  tone?: BackdropTone;
  className?: string;
}

export function SectionMarker({
  children,
  glyph = "sparkle",
  tone = "light",
  className,
}: SectionMarkerProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {glyph === "sparkle" ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          aria-hidden="true"
          className={cn("shrink-0", tone === "dark" ? "fill-white" : "fill-primary")}
        >
          <path d="M7 0l1.3 4.4L13 5.7 8.4 7 7 14 5.6 7 1 5.7 5.7 4.4z" />
        </svg>
      ) : (
        // Always green: the concept's one "dot" instance (the hero) keeps the brand dot green even
        // though its text turns white on the dark hero image - unlike "sparkle", tone here flips the
        // text only, never the glyph.
        <span aria-hidden="true" className="block size-[7px] shrink-0 rounded-pill bg-primary" />
      )}
      {glyph === "dot" ? (
        <Eyebrow size={14} tone={tone}>
          {children}
        </Eyebrow>
      ) : (
        <span className={cn("text-small", tone === "dark" ? "text-white" : "text-foreground")}>
          {children}
        </span>
      )}
    </div>
  );
}
