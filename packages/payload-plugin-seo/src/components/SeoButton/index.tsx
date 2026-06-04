"use client";

export interface SeoButtonProps {
  collectionSlug: string;
  fields: Record<string, string>;
  extractContentPath: string | null;
  site: { name: string; baseUrl: string; faviconUrl: string };
  supportedLocales: string[];
}

export function SeoButton(props: SeoButtonProps) {
  return (
    <button type="button" className="seo-trigger" data-collection={props.collectionSlug}>
      SEO
    </button>
  );
}

export default SeoButton;
