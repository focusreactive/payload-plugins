import type { SectionHeaderProps } from "@/components/SectionHeader";
import { SectionHeader } from "@/components/SectionHeader";

interface CtaBandProps {
  header?: SectionHeaderProps | null;
  theme?: string | null;
  actions: React.ReactNode;
}

export function CtaBand({ header, actions }: CtaBandProps) {
  return (
    <div className="flex flex-col justify-center text-center">
      {header && <SectionHeader {...header} align="center" />}
      <div className="mt-8 flex flex-col-reverse gap-3 self-stretch md:mt-8 md:flex-row md:self-center">
        {actions}
      </div>
    </div>
  );
}
