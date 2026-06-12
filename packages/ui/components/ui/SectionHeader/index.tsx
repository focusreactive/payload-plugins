import { cn } from "../../../utils";
import { DisplayHeading } from "../DisplayHeading";
import { Eyebrow } from "../Eyebrow";

interface SectionHeaderProps {
  badge?: string | null;
  heading: string;
  headingAs?: "h1" | "h2" | "h3";
  headingSize?: "display-1" | "display-2" | "h-section";
  lead?: string | null;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeader({ badge, heading, headingAs = "h2", headingSize = "display-2", lead, align = "left", className }: SectionHeaderProps) {
  return (
    <div className={cn("flex max-w-[720px] flex-col gap-5", align === "center" && "items-center text-center", className)}>
      {badge && (
        <Eyebrow prefix="dot" tone="accent">
          {badge}
        </Eyebrow>
      )}
      <DisplayHeading as={headingAs} size={headingSize} text={heading} />
      {lead && <p className="text-lead text-muted-foreground">{lead}</p>}
    </div>
  );
}
