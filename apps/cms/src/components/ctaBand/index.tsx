import { GlowBackdrop } from "@/components/GlowBackdrop";
import type { SectionHeadingContent } from "@/components/SectionHeading";
import { SectionHeading } from "@/components/SectionHeading";

interface CtaBandProps {
  heading?: SectionHeadingContent | null;
  actions: React.ReactNode;
  /** Paint the striped glow behind the band (it bleeds under whatever follows). */
  glow?: boolean;
}

export function CtaBand({ heading, actions, glow = true }: CtaBandProps) {
  return (
    <>
      {glow && <GlowBackdrop placement="center" className="top-[calc(50%+80px)]" />}
      <div className="relative flex flex-col items-center gap-12 text-center">
        <SectionHeading {...heading} align="center" />
        {actions && (
          <div className="flex flex-wrap items-center justify-center gap-4 rounded-[2.5rem] border border-border bg-surface p-2 backdrop-blur-[20px] sm:rounded-pill">
            {actions}
          </div>
        )}
      </div>
    </>
  );
}
