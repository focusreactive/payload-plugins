import { Stats } from "./ui";
import { Media } from "@/components/media";
import { ScreenshotViewer } from "@/components/ScreenshotViewer";
import { SectionContainer } from "@/components/shared";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { StatsBlock } from "@/payload-types";

export const StatsBlockComponent = async ({
  eyebrow,
  heading,
  description,
  layout,
  image,
  items,
  section,
  id,
}: StatsBlock) => {
  const locale = await resolveLocale();
  const resolvedImage = typeof image === "object" && image !== null ? image : null;
  const media = resolvedImage ? prepareMediaProps({ image: resolvedImage }) : null;

  return (
    <SectionContainer
      // Untitled UI's metrics sections carry their own padding and container.
      sectionData={{ ...section, id, paddingY: "none", paddingX: "none", maxWidth: "none" }}
    >
      <Stats
        eyebrow={eyebrow}
        heading={heading}
        description={description}
        layout={layout === "splitImage" && media ? "splitImage" : "accentLine"}
        image={
          media ? (
            <ScreenshotViewer caption={resolvedImage?.alt ?? null}>
              <Media
                {...media.data}
                className="absolute inset-0"
                imageProps={{ ...media.imageProps, fit: "contain", fill: true }}
                visualEditing={media.visualEditing}
              />
            </ScreenshotViewer>
          ) : null
        }
        items={(items ?? []).map((item) => {
          const link = item.link ? prepareLinkProps(item.link, locale) : null;
          return {
            value: item.value,
            label: item.label,
            description: item.description ?? null,
            link: link?.href && link.text ? { href: link.href, text: link.text } : null,
          };
        })}
      />
    </SectionContainer>
  );
};
