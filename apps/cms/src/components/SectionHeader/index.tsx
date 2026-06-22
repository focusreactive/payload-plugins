import { cn } from "@/components/utils";
import { DisplayHeading } from "../DisplayHeading";
import type { EyebrowTone } from "../Eyebrow";
import { Eyebrow } from "../Eyebrow";

export interface SectionHeaderEyebrow {
  text: string;
  variant?: EyebrowTone;
}

export interface SectionHeaderProps {
  eyebrow?: SectionHeaderEyebrow | null;
  title?: string | null;
  subtitle?: React.ReactNode;
  align?: "left" | "center" | null;
  size?: "display-1" | "display-2" | "h-section" | null;
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
  size = "display-2",
  className,
}: SectionHeaderProps) {
  if (!(eyebrow?.text || title || subtitle)) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex max-w-[720px] flex-col gap-5",
        align === "center" && "mx-auto items-center text-center",
        className
      )}
    >
      {eyebrow?.text && (
        <Eyebrow prefix="dot" tone={eyebrow.variant ?? "accent"}>
          {eyebrow.text}
        </Eyebrow>
      )}
      {title && <DisplayHeading as="h2" size={size ?? "display-2"} text={title} />}
      {subtitle && <div className="text-lead text-muted-foreground">{subtitle}</div>}
    </div>
  );
}
