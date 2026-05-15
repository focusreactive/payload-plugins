const SIZE = "480x320";
const BG = "e5e7eb";
const FG = "6b7280";

const PREVIEW_IMAGES: Record<string, string> = {
  "Cards Grid": "/block-preview-images/cards-grid.png",
  Carousel: "/block-preview-images/carousel.png",
  "Content Section": "/block-preview-images/content-section.png",
  "FAQ Section": "/block-preview-images/faq.png",
  Hero: "/block-preview-images/hero.png",
  "Links List": "/block-preview-images/links-list.png",
  Logos: "/block-preview-images/logos.png",
  Testimonials: "/block-preview-images/testimonials.png",
  "Text Section": "/block-preview-images/text-section.png",
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
