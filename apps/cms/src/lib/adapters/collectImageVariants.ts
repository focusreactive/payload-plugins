import type { ImageVariant } from "@/components/media/types";
import { toDeliveryUrl } from "@/lib/utils/getMediaUrl";
import type { Media } from "@/payload-types";

const RESPONSIVE_SIZE_NAMES = ["thumbnail", "small", "medium", "large", "xlarge"] as const;

/** Cropped sizes stay out of the responsive ladder. */
const CROPPED_SIZE_NAMES = ["square", "og"] as const;

export function isSvgAsset(mimeType?: string | null, url?: string | null): boolean {
  if (mimeType === "image/svg+xml") {
    return true;
  }

  if (!url) {
    return false;
  }

  const path = url.split(/[?#]/u)[0] ?? "";
  return path.toLowerCase().endsWith(".svg");
}

export function collectImageVariants(
  media: Pick<Media, "filesize" | "mimeType" | "sizes" | "url" | "width">,
  preferredSize?: keyof NonNullable<Media["sizes"]> | null
): ImageVariant[] | undefined {
  if (isSvgAsset(media.mimeType, media.url)) {
    return undefined;
  }

  if (preferredSize && (CROPPED_SIZE_NAMES as readonly string[]).includes(preferredSize)) {
    return undefined;
  }

  const variants: ImageVariant[] = [];

  for (const name of RESPONSIVE_SIZE_NAMES) {
    const size = media.sizes?.[name];
    if (!size?.url || !size.width) {
      continue;
    }

    variants.push({ url: size.url, width: size.width });
  }

  variants.sort((left, right) => left.width - right.width);

  const widest = variants.at(-1);
  if (media.url && media.width && (!widest || media.width > widest.width)) {
    variants.push({ url: media.url, width: media.width });
  }

  if (variants.length === 0) {
    return undefined;
  }

  return variants.map((variant) => ({
    url: toDeliveryUrl(variant.url, media.filesize),
    width: variant.width,
  }));
}
