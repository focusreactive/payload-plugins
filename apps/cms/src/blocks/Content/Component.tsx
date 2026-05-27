import { cva } from "class-variance-authority";

import { RichText, SectionContainer, Media } from "@/core/ui";
import { DisplayHeading } from "@repo/ui";
import type { ContentBlock as ContentBlockProps } from "@/payload-types";

const variants = cva("flex flex-col items-start gap-10 lg:flex-row lg:items-start lg:gap-20", {
  defaultVariants: { layout: "image-text" },
  variants: {
    layout: {
      "image-text": "",
      "text-image": "lg:flex-row-reverse",
    },
  },
});

export const ContentBlockComponent: React.FC<ContentBlockProps> = ({ heading, layout, content, image, section, id }) => {
  const hasImage = Boolean(image);

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <div className={variants({ layout })}>
        <div className={hasImage ? "w-full lg:w-1/2" : "w-full max-w-3xl"}>
          {heading && (
            <div className="mb-8">
              <DisplayHeading text={heading} size="md" />
            </div>
          )}
          {content && (
            <div className="prose prose-lg max-w-none text-foreground/85 prose-headings:font-display prose-headings:tracking-tight prose-headings:text-foreground prose-strong:text-foreground prose-a:text-primary prose-a:underline-offset-4 prose-li:my-2 prose-ul:list-none prose-ul:pl-0 [&_ul>li]:relative [&_ul>li]:pl-6 [&_ul>li]:before:absolute [&_ul>li]:before:left-0 [&_ul>li]:before:top-3 [&_ul>li]:before:size-1.5 [&_ul>li]:before:rounded-pill [&_ul>li]:before:bg-primary">
              <RichText content={content} />
            </div>
          )}
        </div>
        {hasImage && (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg lg:w-1/2 lg:aspect-[5/6]">
            <Media resource={image} fill className="absolute inset-0" imgClassName="object-cover" />
          </div>
        )}
      </div>
    </SectionContainer>
  );
};
