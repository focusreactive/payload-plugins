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
  "Hero with video": "/block-preview-images/site-heroVideo.png",
  "Hero with side picture": "/block-preview-images/site-imageHero.png",
  "Hero, centred text": "/block-preview-images/site-simpleHero.png",
  "Blog top section": "/block-preview-images/site-blogHero.png",
  "Logo strip": "/block-preview-images/site-logoStrip.png",
  "Icon list": "/block-preview-images/site-iconList.png",
  "Media and text": "/block-preview-images/site-mediaText.png",
  "Insurance plans": "/block-preview-images/site-insurance.png",
  "Doctors slider": "/block-preview-images/site-docSlider.png",
  "Reviews slider": "/block-preview-images/site-revSlider.png",
  "Conditions grid": "/block-preview-images/site-condGrid.png",
  "Before and after slider": "/block-preview-images/site-beforeAfter.png",
  "Treatment cards": "/block-preview-images/site-treatCards.png",
  "Articles slider": "/block-preview-images/site-postSlider.png",
  "Call to action band": "/block-preview-images/site-siteCta.png",
  "Centred text": "/block-preview-images/site-centerText.png",
  "Article with sticky pictures": "/block-preview-images/site-stickyMedia.png",
  "Patient results slider": "/block-preview-images/site-results.png",
  "Trending articles": "/block-preview-images/site-trending.png",
  "Articles list with tags": "/block-preview-images/site-blogList.png",
  "Clinic details and map": "/block-preview-images/site-clinicInfo.png",
  "Quiz teaser": "/block-preview-images/site-quizDemo.png",
  "State clinics and map": "/block-preview-images/site-stateSites.png",
  "State doctors": "/block-preview-images/site-stateDocs.png",
  "Locations by state": "/block-preview-images/site-locAccord.png",
};

export function getBlockPreviewImage(label: string): {
  imageURL: string;
  imageAltText: string;
} {
  const imageURL =
    PREVIEW_IMAGES[label] ??
    `https://placehold.co/${SIZE}/${BG}/${FG}?text=${label.replaceAll(/\s+/gu, "+")}`;
  return {
    imageAltText: `${label} block preview`,
    imageURL,
  };
}
