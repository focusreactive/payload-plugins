const SIZE = "480x320";
const BG = "e5e7eb";
const FG = "6b7280";

const PREVIEW_IMAGES: Record<string, string> = {
  "Cards Grid": "/block-preview-images/preview-cards-grid.png",
  Carousel: "/block-preview-images/preview-carusel.png",
  Chart: "/block-preview-images/preview-chart.png",
  "CTA Band": "/block-preview-images/preview-cta.png",
  "Content Section": "/block-preview-images/preview-content.png",
  "FAQ Section": "/block-preview-images/preview-faq.png",
  Hero: "/block-preview-images/preview-hero.png",
  Logos: "/block-preview-images/preview-logos.png",
  Testimonials: "/block-preview-images/preview-testimonials.png",
  Newsletter: "/block-preview-images/preview-newsletter.png",
  Stats: "/block-preview-images/preview-stats.png",
};

export const SITE_BLOCK_PREVIEW_ROUTE = "/api/site/block-preview";

/** The Media filename that holds a site section's preview screenshot. */
export const siteBlockPreviewFilename = (slug: string): string => `block-preview-${slug}.png`;

export function placeholderPreviewURL(label: string): string {
  return `https://placehold.co/${SIZE}/${BG}/${FG}?text=${encodeURIComponent(label).replaceAll("%20", "+")}`;
}

export function getBlockPreviewImage(label: string): {
  imageURL: string;
  imageAltText: string;
} {
  return {
    imageAltText: `${label} block preview`,
    imageURL: PREVIEW_IMAGES[label] ?? placeholderPreviewURL(label),
  };
}

/**
 * A site section's preview is a screenshot of the live site, which stays out of the repo: it is an
 * upload in Media, resolved per request by the block preview route, with the placeholder as fallback.
 */
export function getSiteBlockPreviewImage(
  slug: string,
  label: string
): { imageURL: string; imageAltText: string } {
  return {
    imageAltText: `${label} block preview`,
    imageURL: `${SITE_BLOCK_PREVIEW_ROUTE}/${slug}?label=${encodeURIComponent(label)}`,
  };
}
