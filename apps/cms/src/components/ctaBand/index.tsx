import { resolveBackdropTone } from "@/components/utils";
import { GridLines } from "@/components/GridLines";
import type { SectionHeaderProps } from "@/components/SectionHeader";
import { SectionHeader } from "@/components/SectionHeader";

interface CtaBandProps {
  header?: SectionHeaderProps | null;
  theme?: string | null;
  actions: React.ReactNode;
}

export function CtaBand({ header, theme, actions }: CtaBandProps) {
  const backdropTone = resolveBackdropTone(theme);

  // §6.7 contact band: sand, centred, racing-green heading (electric green on dark themes).
  return (
    <div>
      <GridLines tone={backdropTone} />
      <div className="relative z-10 flex flex-col items-center gap-[26px] py-[clamp(40px,6vw,80px)] text-center [&_h2]:text-primary">
        {header && <SectionHeader {...header} align="center" className="max-w-[760px]" />}
        <div className="flex flex-wrap items-center justify-center gap-3.5">{actions}</div>
      </div>
    </div>
  );
}
