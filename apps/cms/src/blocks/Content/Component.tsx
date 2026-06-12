import { cva } from "class-variance-authority";

import { RichText, SectionContainer, Media, CMSLink } from "@/core/ui";
import { ButtonSize, DisplayHeading, Eyebrow } from "@repo/ui";
import type { ContentBlock as ContentBlockProps } from "@/payload-types";

const gridVariants = cva("flex flex-col items-start gap-10 lg:grid lg:grid-cols-2 lg:items-center lg:gap-[clamp(36px,6vw,90px)]", {
  defaultVariants: { layout: "image-text" },
  variants: {
    layout: {
      "image-text": "",
      "text-image": "lg:[direction:rtl] [&>*]:[direction:ltr]",
    },
  },
});

export const ContentBlockComponent: React.FC<ContentBlockProps> = ({ badge, heading, layout, content, image, actions, section, id }) => {
  const resolvedImage = typeof image !== "number" ? image : null;
  const hasImage = Boolean(resolvedImage);
  const hasActions = Array.isArray(actions) && actions.length > 0;

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <div className={gridVariants({ layout })}>
        {hasImage && (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
            <Media resource={resolvedImage} fill className="absolute inset-0" imgClassName="object-cover" />
          </div>
        )}

        <div className="flex max-w-[520px] flex-col gap-[18px]">
          {badge && (
            <Eyebrow prefix="dot" tone="accent">
              {badge}
            </Eyebrow>
          )}

          {heading && <DisplayHeading as="h2" size="display-2" text={heading} />}

          {content && (
            <div className="content-section-prose prose prose-lg max-w-none text-muted-foreground prose-headings:font-display prose-headings:tracking-tight prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary prose-a:underline-offset-4 [&_.content-section-prose_ul>li+li]:mt-3 [&_ul]:m-0 [&_ul]:list-none [&_ul]:p-0 [&_ul>li]:relative [&_ul>li]:pl-[30px] [&_ul>li]:text-muted-foreground [&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:top-[7px] [&_ul>li]:before:size-4 [&_ul>li]:before:rounded-pill [&_ul>li]:before:bg-primary-soft [&_ul>li]:after:absolute [&_ul>li]:after:left-[5px] [&_ul>li]:after:top-[11px] [&_ul>li]:after:h-2 [&_ul>li]:after:w-[5px] [&_ul>li]:after:rotate-45 [&_ul>li]:after:border-b-2 [&_ul>li]:after:border-r-2 [&_ul>li]:after:border-primary">
              <RichText content={content} />
            </div>
          )}

          {hasActions && (
            <div className="mt-2 flex flex-wrap items-center gap-4">
              {actions!.map((action) => (
                <CMSLink
                  key={action.id ?? action.label}
                  type={action.type}
                  reference={
                    action.reference
                      ? {
                          relationTo: action.reference.relationTo as "page" | "posts",
                          value: action.reference.value as import("@/payload-types").Page | import("@/payload-types").Post | string | number,
                        }
                      : null
                  }
                  url={action.url}
                  newTab={action.newTab}
                  label={action.label}
                  appearance={action.appearance}
                  size={ButtonSize.Large}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </SectionContainer>
  );
};
