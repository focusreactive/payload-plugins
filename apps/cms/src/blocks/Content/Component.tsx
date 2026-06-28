import { ButtonSize } from "@/components/button";
import { ContentSection } from "./ui";

import { CMSLink, Media, RichText, SectionContainer } from "@/components/shared";
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

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <ContentSection
        layout={layout}
        header={header}
        image={
          resolvedImage ? (
            <Media
              resource={resolvedImage}
              fill
              className="absolute inset-0"
              imgClassName="object-cover"
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
