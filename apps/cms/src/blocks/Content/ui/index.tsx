import { cn } from "@/components/utils";
import type { SectionHeaderProps } from "@/components/SectionHeader";
import { SectionHeader } from "@/components/SectionHeader";

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
    // Untitled UI's own section padding and container, verbatim from
    // features-alternating-layout-04. The block tells SectionContainer to contribute none of its
    // own: nesting our container inside theirs cost ~270px of content width and squeezed every
    // screenshot to half size. lg:px-0 is theirs too - it is what lets the image reach the edge.
    <div className="py-16 md:py-24">
      <div className="mx-auto w-full max-w-container px-4 md:px-8 lg:px-0">
        <div
          className={cn("grid grid-cols-1 gap-10 md:gap-20", hasImage && "lg:grid-cols-2 lg:gap-0")}
        >
          <div
            className={cn(
              "flex flex-1 flex-col gap-4 self-center",
              hasImage &&
                (resolvedLayout === "image-text"
                  ? "lg:order-last lg:py-24 lg:pr-8 lg:pl-24"
                  : "lg:py-24 lg:pr-24 lg:pl-12")
            )}
          >
            {header && <SectionHeader {...header} className="gap-[18px]" />}

            {body}

            {actions && <div className="mt-2 flex flex-wrap items-center gap-4">{actions}</div>}
          </div>

          {hasImage && <div className="relative min-h-60 w-full flex-1 md:min-h-140">{image}</div>}
        </div>
      </div>
    </div>
  );
}
