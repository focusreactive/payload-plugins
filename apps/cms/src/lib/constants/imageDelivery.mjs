/** Shared by next.config and the variant image loader. */
export const IMAGE_QUALITY = 85;

export const IMAGE_DEVICE_SIZES = [640, 828, 1080, 1280, 1920, 2560];

export const IMAGE_QUALITIES = [75, IMAGE_QUALITY];

/** 30 days. Safe because media URLs are versioned with ?v=filesize. */
export const IMAGE_MINIMUM_CACHE_TTL = 2_592_000;

/**
 * Payload never enlarges, so widths above the widest variant are the same pixels.
 * Clamp to the smallest configured device width that still covers that variant.
 */
export function resolveTransformWidth(requested, maxVariantWidth) {
  const cap =
    IMAGE_DEVICE_SIZES.find((width) => width >= maxVariantWidth) ?? IMAGE_DEVICE_SIZES.at(-1);
  return Math.min(requested, cap);
}
