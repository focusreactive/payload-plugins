import { AbstractBackdrop } from "../../ui/AbstractBackdrop";
import { GridLines } from "../../ui/GridLines";
import { SectionHeader } from "../../ui/SectionHeader";

interface CtaBandProps {
  badge?: string | null;
  heading: string;
  lead?: string | null;
  theme?: string | null;
  actions: React.ReactNode;
}

function isDarkTheme(theme: string | null | undefined): boolean {
  return theme === "dark" || theme === "dark-gray";
}

export function CtaBand({ badge, heading, lead, theme, actions }: CtaBandProps) {
  const dark = isDarkTheme(theme);

  return (
    <div className="relative overflow-hidden">
      {dark && (
        <>
          <AbstractBackdrop variant="orbs" tone="dark" />
          <GridLines tone="dark" />
        </>
      )}
      <div className="relative z-10 flex flex-col items-center gap-[26px] py-[clamp(56px,8vw,104px)] text-center">
        <SectionHeader badge={badge} heading={heading} lead={lead} align="center" className="max-w-[760px]" />
        <div className="flex flex-wrap items-center justify-center gap-3.5">{actions}</div>
      </div>
    </div>
  );
}
