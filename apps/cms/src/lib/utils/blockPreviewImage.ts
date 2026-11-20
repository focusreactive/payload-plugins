const PREVIEW_IMAGES: Record<string, string> = {
  "Cards Grid": "/block-preview-images/preview-cards-grid.png",
  Carousel: "/block-preview-images/preview-carusel.png",
  Chart: "/block-preview-images/preview-chart.png",
  "CTA Band": "/block-preview-images/preview-cta.png",
  "Content Section": "/block-preview-images/preview-content.png",
  "FAQ Section": "/block-preview-images/preview-faq.png",
  "Global section": "/block-preview-images/preview-global-section.png",
  Hero: "/block-preview-images/preview-hero.png",
  Logos: "/block-preview-images/preview-logos.png",
  "Raw HTML": "/block-preview-images/preview-raw-html.png",
  Testimonials: "/block-preview-images/preview-testimonials.png",
  Newsletter: "/block-preview-images/preview-newsletter.png",
  Stats: "/block-preview-images/preview-stats.png",
};

// A local, neutral tile for a block without its own preview yet. An external placeholder service
// shows a broken image behind a strict network, and a new block should get a real preview anyway.
const FALLBACK_IMAGE = "/empty-placeholder.jpg";

export function getBlockPreviewImage(label: string): {
  imageURL: string;
  imageAltText: string;
} {
  return {
    imageAltText: `${label} block preview`,
    imageURL: PREVIEW_IMAGES[label] ?? FALLBACK_IMAGE,
  };
}
