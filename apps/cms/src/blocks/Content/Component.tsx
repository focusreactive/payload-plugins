import { ContentSection } from "./ui";

import { Media } from "@/components/media";
import { ScreenshotViewer } from "@/components/ScreenshotViewer";
import { RichText, SectionContainer } from "@/components/shared";
import { Button } from "@/shared/ui/shadcn/base/buttons/button";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { ContentBlock as ContentBlockProps } from "@/payload-types";

export const ContentBlockComponent = async ({
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
}: ContentBlockProps & { isFirstBlock?: boolean }) => {
  const locale = await resolveLocale();
  const resolvedImage = typeof image !== "number" ? image : null;
  const header = prepareSectionHeaderProps({ eyebrow, description, heading, isFirstBlock });
  const media = resolvedImage ? prepareMediaProps({ image: resolvedImage }) : null;

  return (
    <SectionContainer
      // Untitled UI's section brings its own padding, container and max width. Ours would nest
      // inside theirs and halve the content width.
      sectionData={{ ...section, id, paddingY: "none", paddingX: "none", maxWidth: "none" }}
    >
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
            ? actions.map((action, index) => {
                const link = prepareLinkProps(action, locale);
                return (
                  <Button
                    key={action.id ?? action.label}
                    href={link.href}
                    size="lg"
                    color={index === 0 ? "primary" : "secondary"}
                  >
                    {link.text}
                  </Button>
                );
              })
            : null
        }
      />
    </SectionContainer>
  );
};
