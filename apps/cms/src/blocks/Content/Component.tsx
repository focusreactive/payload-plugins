import { ButtonSize } from "@/components/button";
import { ContentSection } from "./ui";

import { Media } from "@/components/media";
import { ScreenshotViewer } from "@/components/ScreenshotViewer";
import { CMSLink, RichText, SectionContainer } from "@/components/shared";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";
import type { ContentBlock as ContentBlockProps, Page, Post } from "@/payload-types";

export const ContentBlockComponent: React.FC<ContentBlockProps & { isFirstBlock?: boolean }> = ({
  eyebrow,
  heading,
  description,
  layout,
  content,
  image,
  actions,
  section,
  id,
  isFirstBlock,
}) => {
  const resolvedImage = typeof image !== "number" ? image : null;
  const header = prepareSectionHeaderProps({ eyebrow, description, heading, isFirstBlock });
  const media = resolvedImage ? prepareMediaProps({ image: resolvedImage }) : null;

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <ContentSection
        layout={layout}
        header={header}
        image={
          media ? (
            <ScreenshotViewer caption={resolvedImage?.alt ?? null}>
              <Media
                {...media.data}
                className="absolute inset-0"
                // fit, not a class: next/image writes object-fit as an inline style, which beats
                // object-contain in the class list. contain rather than cover because every image
                // here is a product screenshot, the grid row stretches the container past its 4:3,
                // and cover was shaving the left edge off the admin window: "Insights" read as
                // "nsights". Letterboxing is invisible against the page background.
                imageProps={{ ...media.imageProps, fit: "contain", fill: true }}
                visualEditing={media.visualEditing}
              />
            </ScreenshotViewer>
          ) : null
        }
        body={content ? <RichText content={content} variant="content" /> : null}
        actions={
          actions?.length
            ? actions.map((action) => (
                <CMSLink
                  key={action.id ?? action.label}
                  type={action.type}
                  reference={
                    action.reference
                      ? {
                          relationTo: action.reference.relationTo as "page" | "posts",
                          value: action.reference.value as Page | Post | string | number,
                        }
                      : null
                  }
                  url={action.url}
                  newTab={action.newTab}
                  label={action.label}
                  appearance={action.appearance}
                  size={ButtonSize.Large}
                />
              ))
            : null
        }
      />
    </SectionContainer>
  );
};
