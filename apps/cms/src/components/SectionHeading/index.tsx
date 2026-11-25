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
  /**
   * "split"  — title on the left, description bottom-aligned on the right (12-col: 8 + 4)
   * "center" — stacked and centred
   * "left"   — stacked, left aligned
   */
  align?: "left" | "center" | "split";
  size?: "display-1" | "display-2" | "h-section";
  eyebrowTone?: EyebrowTone;
  className?: string;
}

export function hasSectionHeading(heading: SectionHeadingContent | null | undefined) {
  return Boolean(heading?.eyebrow || heading?.title || heading?.description);
}

const descriptionClassName: Record<NonNullable<SectionHeadingProps["size"]>, string> = {
  "display-1": "text-lead",
  "display-2": "text-body-lg",
  "h-section": "text-body-lg",
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  as = "h2",
  align = "left",
  size = "display-2",
  eyebrowTone = "outline",
  className,
}: SectionHeadingProps) {
  if (!hasSectionHeading({ eyebrow, title, description })) {
    return null;
  }

  const eyebrowNode = eyebrow ? (
    <p>
      <Eyebrow tone={eyebrowTone}>{eyebrow}</Eyebrow>
    </p>
  ) : null;
  const titleNode = title ? <DisplayHeading as={as} size={size} text={title} /> : null;
  const descriptionNode = description ? (
    <p className={cn("whitespace-pre-line text-foreground", descriptionClassName[size])}>
      {description}
    </p>
  ) : null;

  if (align === "split") {
    return (
      <hgroup className={cn("grid grid-cols-1 gap-x-gridGap gap-y-6 lg:grid-cols-12", className)}>
        <div className="flex flex-col gap-6 lg:col-span-8">
          {eyebrowNode}
          {titleNode}
        </div>
        {descriptionNode && (
          <div className="flex flex-col justify-end lg:col-span-4 lg:py-2">{descriptionNode}</div>
        )}
      </hgroup>
    );
  }

  return (
    <hgroup
      className={cn(
        "flex flex-col gap-6",
        align === "center" && "mx-auto max-w-[840px] items-center text-center",
        className
      )}
    >
      {eyebrowNode}
      {titleNode}
      {descriptionNode}
    </hgroup>
  );
}
