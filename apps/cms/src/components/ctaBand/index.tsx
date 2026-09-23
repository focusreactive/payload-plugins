import type { SectionHeaderProps } from "@/components/SectionHeader";
import { SectionHeader } from "@/components/SectionHeader";

interface CtaBandProps {
  header?: SectionHeaderProps | null;
  theme?: string | null;
  actions: React.ReactNode;
}

/**
 * Left aligned and ruled rather than centred over a backdrop: DESIGN.md bans both centred body copy
 * and decorative background art, and the rule is what separates a section on this site.
 *
 * The action is bottom-aligned, not centred: a single button centred against a three-line heading
 * plus a paragraph floats in the middle of an empty column and reads as a layout fault.
 */
export function CtaBand({ header, actions }: CtaBandProps) {
  return (
    <div className="rule-top grid grid-cols-1 gap-8 py-[clamp(56px,8vw,104px)] lg:grid-cols-12">
      {header && <SectionHeader {...header} align="left" className="lg:col-span-7" />}
      <div className="flex flex-wrap items-end gap-4 lg:col-span-4 lg:col-start-9 lg:justify-end">
        {actions}
      </div>
    </div>
  );
}
