import { resolveBackdropTone } from "../../../utils";
import { AbstractBackdrop } from "../../ui/AbstractBackdrop";
import { GridLines } from "../../ui/GridLines";
import type { SectionHeaderProps } from "../../ui/SectionHeader";
import { SectionHeader } from "../../ui/SectionHeader";

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
