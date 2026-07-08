import { ButtonSize } from "@/components/button";
import { ContentSection } from "./ui";

import { Media } from "@/components/media";
import { CMSLink, RichText, SectionContainer } from "@/components/shared";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";
import type { ContentBlock as ContentBlockProps, Page, Post } from "@/payload-types";

export const ContentBlockComponent: React.FC<ContentBlockProps> = ({
  eyebrow,
  heading,
  description,
  layout,
  content,
  image,
  actions,
  section,
  id,
}) => {
  const resolvedImage = typeof image !== "number" ? image : null;
  const header = prepareSectionHeaderProps({ eyebrow, description, heading });
  const media = resolvedImage ? prepareMediaProps({ image: resolvedImage }) : null;

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <ContentSection
        layout={layout}
        header={header}
        image={
          media ? (
            <Media
              {...media.data}
              className="absolute inset-0"
              imageProps={{ ...media.imageProps, className: "object-cover", fill: true }}
              visualEditing={media.visualEditing}
            />
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
