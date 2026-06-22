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

export function getBlockPreviewImage(label: string): {
  imageURL: string;
  imageAltText: string;
} {
  const imageURL =
    PREVIEW_IMAGES[label] ??
    `https://placehold.co/${SIZE}/${BG}/${FG}?text=${label.replaceAll(/\s+/g, "+")}`;
  return {
    imageAltText: `${label} block preview`,
    imageURL,
  };
}
