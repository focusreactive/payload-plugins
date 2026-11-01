import { resolveBackdropTone } from "@/components/utils";
import { AbstractBackdrop } from "@/components/AbstractBackdrop";
import { GridLines } from "@/components/GridLines";
import type { SectionHeadingContent } from "@/components/SectionHeading";
import { SectionHeading } from "@/components/SectionHeading";

interface CtaBandProps {
  heading?: SectionHeadingContent | null;
  theme?: string | null;
  actions: React.ReactNode;
}

export function CtaBand({ heading, theme, actions }: CtaBandProps) {
  const backdropTone = resolveBackdropTone(theme);

  return (
    <div>
      <AbstractBackdrop variant="blobs" tone={backdropTone} intensity="subtle" />
      <GridLines tone={backdropTone} />
      <div className="relative z-10 flex flex-col items-center gap-[26px] py-[clamp(56px,8vw,104px)] text-center">
        <SectionHeading {...heading} align="center" className="max-w-[760px]" />
        <div className="flex flex-wrap items-center justify-center gap-3.5">{actions}</div>
      </div>
    </div>
  );
}
