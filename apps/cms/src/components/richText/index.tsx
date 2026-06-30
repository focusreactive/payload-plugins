import { cn } from "@/components/utils";
import { proseVariants } from "./proseVariants";
import { AlignVariant } from "./types";
import type { IRichTextProps } from "./types";

export function RichText({
  className,
  richText,
  removeInnerMargins,
  alignVariant,
  variant,
}: IRichTextProps) {
  return (
    <div
      className={cn(
        proseVariants({ variant }),
        {
          "no-children-margins": removeInnerMargins,
          "text-center": alignVariant === AlignVariant.Center,
          "text-left": alignVariant === AlignVariant.Left,
          "text-right": alignVariant === AlignVariant.Right,
        },
        className
      )}
    >
      {richText}
    </div>
  );
}
