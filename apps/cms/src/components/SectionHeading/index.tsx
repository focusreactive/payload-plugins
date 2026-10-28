import { cn } from "@/components/utils";
import { DisplayHeading } from "../DisplayHeading";
import type { EyebrowTone } from "../Eyebrow";
import { Eyebrow } from "../Eyebrow";

export interface SectionHeadingContent {
  eyebrow?: string | null;
  title?: string | null;
  description?: string | null;
}

export interface SectionHeadingProps extends SectionHeadingContent {
  as?: "h1" | "h2";
  align?: "left" | "center";
  size?: "display-1" | "display-2" | "h-section";
  eyebrowTone?: EyebrowTone;
  className?: string;
}

export function hasSectionHeading(heading: SectionHeadingContent | null | undefined) {
  return Boolean(heading?.eyebrow || heading?.title || heading?.description);
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  as = "h2",
  align = "left",
  size = "display-2",
  eyebrowTone = "accent",
  className,
}: SectionHeadingProps) {
  if (!hasSectionHeading({ eyebrow, title, description })) {
    return null;
  }

  return (
    <hgroup
      className={cn(
        "flex max-w-[720px] flex-col gap-5",
        align === "center" && "mx-auto items-center text-center",
        className
      )}
    >
      {eyebrow && (
        <p>
          <Eyebrow prefix="dot" tone={eyebrowTone}>
            {eyebrow}
          </Eyebrow>
        </p>
      )}
      {title && <DisplayHeading as={as} size={size} text={title} />}
      {description && (
        <p className="whitespace-pre-line text-lead text-muted-foreground">{description}</p>
      )}
    </hgroup>
  );
}
