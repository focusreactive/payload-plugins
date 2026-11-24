"use client";

import { registerContentExtractors } from "@focus-reactive/payload-plugin-seo/content";
import type { ReactNode } from "react";

import extractPageContent from "./extractPageContent";

export const PAGE_CONTENT_EXTRACTOR = "@/lib/seo/extractPageContent#default";

registerContentExtractors({
  [PAGE_CONTENT_EXTRACTOR]: extractPageContent,
});

export function SeoExtractorRegistrar({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default SeoExtractorRegistrar;
