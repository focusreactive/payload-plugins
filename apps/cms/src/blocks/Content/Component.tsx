import { ButtonSize } from "@/components/button";
import { ContentSection } from "./ui";

import { Media } from "@/components/media";
import { CMSLink, RichText, SectionContainer } from "@/components/shared";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import type { ContentBlock as ContentBlockProps } from "@/payload-types";

export const ContentBlockComponent: React.FC<ContentBlockProps> = ({
  heading,
  layout,
  content,
  image,
  actions,
  section,
  id,
}) => {
  const resolvedImage = typeof image !== "number" ? image : null;
  const media = resolvedImage ? prepareMediaProps({ image: resolvedImage }) : null;

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <ContentSection
        layout={layout}
        heading={heading}
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
                  key={action.id ?? action.link.label}
                  link={action.link}
                  size={ButtonSize.Large}
                />
              ))
            : null
        }
      />
    </SectionContainer>
  );
};
