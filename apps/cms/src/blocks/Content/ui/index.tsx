import { cn } from "@/components/utils";
import type { SectionHeaderProps } from "@/components/SectionHeader";

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
  // Mirrors SectionHeaderProps.isFirstBlock -> DisplayHeading's `as` prop: exactly one heading
  // per page can become the h1, set upstream by RenderBlocks' block index.
  const HeadingTag = header?.isFirstBlock ? "h1" : "h2";

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
            {header?.eyebrow?.text && (
              <span className="text-sm font-semibold text-brand-secondary md:text-md">
                {header.eyebrow.text}
              </span>
            )}

            {header?.title && (
              <HeadingTag className="mt-3 text-display-sm font-semibold text-primary md:text-display-md">
                {header.title}
              </HeadingTag>
            )}

            {/* header.subtitle (the CMS "description" field) has no slot in Untitled UI's
                alternating-layout markup - its "body" class already belongs to the richText
                `body` prop below. Kept in our own prior SectionHeader styling rather than
                dropped, since it is CMS-editable data. */}
            {header?.subtitle && (
              <div className="text-lead text-muted-foreground">{header.subtitle}</div>
            )}

            {body && <div className="mt-4 text-md text-tertiary md:mt-5 md:text-lg">{body}</div>}

            {actions && <div className="mt-2 flex flex-wrap items-center gap-4">{actions}</div>}
          </div>

          {hasImage && (
            <div className="relative min-h-60 w-full flex-1 overflow-hidden rounded-xl bg-white shadow-xl ring-4 ring-screen-mockup-border md:min-h-140 md:ring-6">
              {image}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
