import { cn } from "@/components/utils";
import type { SectionHeadingContent } from "@/components/SectionHeading";
import { SectionHeading } from "@/components/SectionHeading";

export type ContentLayout = "stacked" | "image-text" | "text-image";

interface ContentSectionProps {
  layout?: ContentLayout | null;
  heading?: SectionHeadingContent | null;
  image?: React.ReactNode;
  body?: React.ReactNode;
  actions?: React.ReactNode;
}

const frameClassName = "relative w-full overflow-clip rounded-xl border border-border";

function Actions({ actions }: { actions?: React.ReactNode }) {
  if (!actions) return null;
  return <div className="flex flex-wrap items-center gap-x-8 gap-y-4">{actions}</div>;
}

/** Wide image on top, title on the left and copy / highlights / actions on the right. */
function StackedLayout({ heading, image, body, actions }: ContentSectionProps) {
  const { description, ...titleHeading } = heading ?? {};

  return (
    <div className="flex flex-col gap-sectionGap">
      {image && (
        <div className={cn(frameClassName, "aspect-[4/3] md:aspect-[32/15]")}>
          {image}
          <div aria-hidden className="absolute inset-0 bg-plum-20 mix-blend-soft-light" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-gridGap gap-y-10 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <SectionHeading {...titleHeading} size="h-section" />
        </div>

        <div className="flex flex-col gap-10 lg:col-span-5 lg:col-start-8 lg:py-4">
          {description && (
            <p className="whitespace-pre-line text-body-lg text-foreground lg:px-8">
              {description}
            </p>
          )}
          {body}
          <Actions actions={actions} />
        </div>
      </div>
    </div>
  );
}

function SplitLayout({ layout, heading, image, body, actions }: ContentSectionProps) {
  return (
    <div className="grid grid-cols-1 items-center gap-x-gridGap gap-y-10 lg:grid-cols-12">
      {image && (
        <div
          className={cn(
            frameClassName,
            "aspect-[4/3] lg:col-span-6",
            layout === "text-image" && "lg:order-last lg:col-start-7"
          )}
        >
          {image}
          <div aria-hidden className="absolute inset-0 bg-plum-20 mix-blend-soft-light" />
        </div>
      )}

      <div
        className={cn(
          "flex flex-col gap-10 lg:col-span-5",
          layout === "text-image" ? "lg:col-start-1" : "lg:col-start-8"
        )}
      >
        <SectionHeading {...heading} size="h-section" />
        {body}
        <Actions actions={actions} />
      </div>
    </div>
  );
}

export function ContentSection(props: ContentSectionProps) {
  if (props.layout === "image-text" || props.layout === "text-image") {
    return <SplitLayout {...props} />;
  }

  return <StackedLayout {...props} />;
}
