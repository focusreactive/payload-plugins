import { resolveBackdropTone } from "@/components/ui/utils";
import { AbstractBackdrop } from "@/components/ui/primitives/AbstractBackdrop";
import { GridLines } from "@/components/ui/primitives/GridLines";
import type { SectionHeaderProps } from "@/components/ui/primitives/SectionHeader";
import { SectionHeader } from "@/components/ui/primitives/SectionHeader";

interface CtaBandProps {
  header?: SectionHeaderProps | null;
  theme?: string | null;
  actions: React.ReactNode;
}

export function CtaBand({ header, theme, actions }: CtaBandProps) {
  const backdropTone = resolveBackdropTone(theme);

  return (
    <div>
      <AbstractBackdrop variant="blobs" tone={backdropTone} intensity="subtle" />
      <GridLines tone={backdropTone} />
      <div className="relative z-10 flex flex-col items-center gap-[26px] py-[clamp(56px,8vw,104px)] text-center">
        {header && <SectionHeader {...header} align="center" className="max-w-[760px]" />}
        <div className="flex flex-wrap items-center justify-center gap-3.5">{actions}</div>
      </div>
    </div>
  );
}
