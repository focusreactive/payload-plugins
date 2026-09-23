import { Stats } from "./ui";
import { Media } from "@/components/media";
import { ScreenshotViewer } from "@/components/ScreenshotViewer";
import { SectionContainer } from "@/components/shared";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Media as MediaDocument, StatsBlock } from "@/payload-types";

function renderScreenshot(image: MediaDocument) {
  const media = prepareMediaProps({ image });
  if (!media) return null;
  return (
    <ScreenshotViewer caption={image.alt ?? null}>
      <Media
        {...media.data}
        className="absolute inset-0"
        // The admin captures run from 1.31 to 1.72 wide, so one frame ratio for all of them:
        // cover anchored top left keeps the header and first rows, and trims the far edge.
        imageProps={{ ...media.imageProps, fit: "cover", fill: true, className: "object-left-top" }}
        visualEditing={media.visualEditing}
      />
    </ScreenshotViewer>
  );
}

function asMediaDocument(image: number | MediaDocument | null | undefined) {
  return typeof image === "object" && image !== null ? image : null;
}

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
  const blockImage = asMediaDocument(image);
  const itemImages = (items ?? []).map((item) => asMediaDocument(item.image) ?? blockImage);
  const hasImages = itemImages.some(Boolean);

  return (
    <SectionContainer
      // Untitled UI's metrics sections carry their own padding and container.
      sectionData={{ ...section, id, paddingY: "none", paddingX: "none", maxWidth: "none" }}
    >
      <Stats
        eyebrow={eyebrow}
        heading={heading}
        description={description}
        layout={layout === "splitImage" && hasImages ? "splitImage" : "accentLine"}
        images={itemImages.map((itemImage) => (itemImage ? renderScreenshot(itemImage) : null))}
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
