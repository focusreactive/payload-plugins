const PREVIEW_IMAGES: Record<string, string> = {
  "Book Offer": "/block-preview-images/preview-book-offer.png",
  "Cards Grid": "/block-preview-images/preview-cards-grid.png",
  Carousel: "/block-preview-images/preview-carusel.png",
  Chart: "/block-preview-images/preview-chart.png",
  "Content Section": "/block-preview-images/preview-content.png",
  "Course Rail": "/block-preview-images/preview-course-rail.png",
  "CTA Band": "/block-preview-images/preview-cta.png",
  "FAQ Section": "/block-preview-images/preview-faq.png",
  Hero: "/block-preview-images/preview-hero.png",
  "Hero Spotlight": "/block-preview-images/preview-hero-spotlight.png",
  Logos: "/block-preview-images/preview-logos.png",
  "Membership Tiers": "/block-preview-images/preview-membership-tiers.png",
  Newsletter: "/block-preview-images/preview-newsletter.png",
  "Portrait Feature": "/block-preview-images/preview-portrait-feature.png",
  Stats: "/block-preview-images/preview-stats.png",
  Testimonials: "/block-preview-images/preview-testimonials.png",
};

/**
 * Drawn locally rather than fetched, because the fallback used to be a placehold.co URL: a block
 * with no picture made the admin panel call a third-party host every time an editor opened the
 * section picker. On a client's own CMS that is an outbound request nobody asked for, and the
 * picker shows a broken tile whenever that host is slow or blocked.
 */
function drawPlaceholder(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320"><rect width="480" height="320" fill="#eef5f0"/><rect x="24" y="24" width="432" height="272" rx="12" fill="none" stroke="#e3e8e4" stroke-width="2"/><text x="240" y="167" font-family="system-ui, sans-serif" font-size="20" fill="#19a846" text-anchor="middle">${label.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getBlockPreviewImage(label: string): {
  imageURL: string;
  imageAltText: string;
} {
  return {
    imageAltText: `${label} block preview`,
    imageURL: PREVIEW_IMAGES[label] ?? drawPlaceholder(label),
  };
}
