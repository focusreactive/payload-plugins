import { cn, cva } from "@/components/utils";
import type { SectionHeaderProps } from "@/components/SectionHeader";
import { SectionHeader } from "@/components/SectionHeader";

/**
 * 5 + 7 on a 12-column grid, never the 6 + 6 this replaced: DESIGN.md calls an even split "a
 * brochure", and a vertical hairline (not a gap) is the site's device for separating the two
 * halves - the same rule Divider and CtaBand already use instead of a card or a shadow.
 */
const imageVariants = cva(
  "relative aspect-[4/3] w-full overflow-hidden rounded-[4px] lg:col-span-5",
  {
    defaultVariants: { layout: "image-text" },
    variants: {
      layout: {
        "image-text": "lg:order-1",
        "text-image": "lg:order-2",
      },
    },
  }
);

const textVariants = cva(
  "flex max-w-[68ch] flex-col gap-[18px] lg:col-span-7 lg:border-border lg:pt-1",
  {
    defaultVariants: { layout: "image-text" },
    variants: {
      layout: {
        "image-text": "lg:order-2 lg:border-l lg:pl-12",
        "text-image": "lg:order-1 lg:border-r lg:pr-12",
      },
    },
  }
);

interface ContentSectionProps {
  layout?: "image-text" | "text-image" | null;
  header?: SectionHeaderProps | null;
  image?: React.ReactNode;
  body?: React.ReactNode;
  actions?: React.ReactNode;
}

export function ContentSection({ layout, header, image, body, actions }: ContentSectionProps) {
  const resolvedLayout = layout ?? "image-text";
  const hasImage = Boolean(image);

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-10 lg:grid lg:grid-cols-12 lg:items-stretch lg:gap-x-16"
      )}
    >
      {hasImage && <div className={imageVariants({ layout: resolvedLayout })}>{image}</div>}

      <div
        className={cn(
          hasImage
            ? textVariants({ layout: resolvedLayout })
            : "flex max-w-[68ch] flex-col gap-[18px]"
        )}
      >
        {header && <SectionHeader {...header} className="gap-[18px]" />}

        {body}

        {actions && <div className="mt-2 flex flex-wrap items-center gap-4">{actions}</div>}
      </div>
    </div>
  );
}
