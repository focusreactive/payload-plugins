import { cn } from "../../../utils";
import { AlignVariant } from './types';
import type { IRichTextProps } from './types';

export function RichText({
  className,
  richText,
  removeInnerMargins,
  alignVariant,
}: IRichTextProps) {
  return (
    <div
      className={cn(
        "text-textColor prose max-w-full dark:prose-invert lg:prose-xl",
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
